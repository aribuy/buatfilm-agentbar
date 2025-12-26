# PRODUCTION-READY-ADDENDUM-GPT.md
# BuatFilm AgentBar — Production-Ready Architecture Addendum

Version: v1.0
Status: SUPPLEMENTARY
Base Document: ARCHITECTURE-GPT.md
Purpose: Meng-cover production gaps untuk high-availability & high-scale system

---

## 1. EXECUTIVE SUMMARY

Dokumen ini adalah **addendum** dari ARCHITECTURE-GPT.md yang mencakup:
- Production-grade database technology & migrations
- Advanced error handling (circuit breaker, DLQ, idempotency)
- Comprehensive monitoring & observability
- Security hardening (rate limiting, WAF rules)
- Scaling strategy & infrastructure
- Frontend-backend contract specifications
- Disaster recovery & backup procedures

**Target:**
- Uptime: 99.9% (max 43 minutes downtime/month)
- Throughput: 500+ orders/day
- Response time: P95 < 500ms for checkout, < 2s for payment
- Data loss: ZERO tolerance

---

## 2. DATABASE TECHNOLOGY & MIGRATION STRATEGY

### 2.1 Technology Stack

**Development:**
- Database: SQLite (in-memory for tests, file for local dev)
- Reason: Fast setup, no external dependency

**Staging:**
- Database: PostgreSQL 14+ (Managed: Railway/Render/Supabase)
- Reason: Production parity, full feature testing

**Production:**
- Database: PostgreSQL 14+ (Managed: AWS RDS/Google Cloud SQL)
- Reason: ACID compliance, concurrent writes, replication, backup automation
- Instance: db.t3.medium (2 vCPU, 4GB RAM) minimum
- Storage: 100GB SSD with auto-scaling
- Multi-AZ: Yes (for HA)

### 2.2 Enhanced Schema

```sql
-- =====================================================
-- 1. ORDERS (Enhanced)
-- =====================================================
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,

  -- Package info
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  final_amount INTEGER NOT NULL CHECK(final_amount > 0),

  -- Discount
  discount_code TEXT,
  discount_amount INTEGER DEFAULT 0,

  -- State machine (MONOTONIC)
  status TEXT NOT NULL DEFAULT 'CREATED'
    CHECK(status IN (
      'CREATED',
      'PENDING_PAYMENT',
      'PAID',           -- FINAL STATE
      'FAILED',
      'EXPIRED'
    )),

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT email_format CHECK(customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_expires_at ON orders(expires_at) WHERE status = 'PENDING_PAYMENT';

-- Audit trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 2. PAYMENT_ATTEMPTS
-- =====================================================
CREATE TABLE payment_attempts (
  attempt_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,

  -- Provider info
  provider TEXT NOT NULL CHECK(provider = 'MIDTRANS'),
  snap_token TEXT NOT NULL,
  redirect_url TEXT,

  -- Midtrans specific
  midtrans_transaction_id TEXT,
  midtrans_payment_type TEXT,
  midtrans_va_number TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(status IN ('PENDING', 'COMPLETED', 'FAILED')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Metadata
  error_message TEXT,
  raw_response JSONB
);

CREATE INDEX idx_payment_attempts_order ON payment_attempts(order_id);
CREATE INDEX idx_payment_attempts_status ON payment_attempts(status);

-- =====================================================
-- 3. PAYMENT_EVENTS (Idempotent Webhook Handling)
-- =====================================================
CREATE TABLE payment_events (
  event_id TEXT PRIMARY KEY,

  -- Idempotency key (CRITICAL for duplicate handling)
  idempotency_key TEXT UNIQUE NOT NULL,

  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,

  -- Webhook payload
  raw_payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  signature_input TEXT,

  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,

  -- Timestamp
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_payment_events_idempotency ON payment_events(idempotency_key);
CREATE INDEX idx_payment_events_order ON payment_events(order_id);
CREATE INDEX idx_payment_events_processed ON payment_events(processed) WHERE processed = FALSE;

-- =====================================================
-- 4. ENTITLEMENTS (Course Access)
-- =====================================================
CREATE TABLE entitlements (
  entitlement_id TEXT PRIMARY KEY,

  order_id TEXT NOT NULL REFERENCES orders(order_id),
  user_email TEXT NOT NULL,

  -- Course info
  course_id TEXT NOT NULL DEFAULT 'ai-movie-course',
  course_name TEXT NOT NULL DEFAULT 'Buat Film Pakai AI',

  -- Access
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK(status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  access_url TEXT,

  -- Timestamps
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Lifetime access if NULL

  -- Metadata
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_entitlements_email ON entitlements(user_email);
CREATE INDEX idx_entitlements_course ON entitlements(course_id);
CREATE INDEX idx_entitlements_status ON entitlements(status);

-- =====================================================
-- 5. NOTIFICATION_OUTBOX (Guaranteed Delivery)
-- =====================================================
CREATE TABLE notification_outbox (
  id BIGSERIAL PRIMARY KEY,

  order_id TEXT NOT NULL REFERENCES orders(order_id),

  -- Message info
  channel TEXT NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP')),
  template_name TEXT NOT NULL,

  -- Recipient
  recipient TEXT NOT NULL,  -- Email or Phone

  -- Payload
  subject TEXT,
  body_template TEXT,
  body_data JSONB,

  -- Status & Retry
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(status IN (
      'PENDING',
      'SENDING',
      'SENT',
      'RETRYING',
      'FAILED',
      'DLQ'  -- Dead Letter Queue
    )),

  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,

  -- Error tracking
  last_error TEXT,
  error_history JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,

  -- Prevent duplicate (CRITICAL)
  UNIQUE(order_id, channel, template_name)
);

-- Indexes for worker
CREATE INDEX idx_outbox_status ON notification_outbox(status)
  WHERE status IN ('PENDING', 'RETRYING');

CREATE INDEX idx_outbox_next_retry ON notification_outbox(next_retry_at)
  WHERE status IN ('RETRYING');

-- =====================================================
-- 6. SYSTEM_AUDIT_LOG (Complete Audit Trail)
-- =====================================================
CREATE TABLE system_audit_log (
  id BIGSERIAL PRIMARY KEY,

  -- Who & What
  actor TEXT NOT NULL,  -- system, admin, user:email
  action TEXT NOT NULL, -- order_status_changed, entitlement_granted, etc.
  entity_type TEXT NOT NULL, -- order, payment_attempt, entitlement
  entity_id TEXT NOT NULL,

  -- Changes
  old_value JSONB,
  new_value JSONB,

  -- Context
  correlation_id TEXT,  -- order_id, request_id, etc.
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioning by month (for performance & retention)
CREATE TABLE system_audit_log_y2025m01 PARTITION OF system_audit_log
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE INDEX idx_audit_entity ON system_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON system_audit_log(actor);
CREATE INDEX idx_audit_created ON system_audit_log(created_at DESC);

-- =====================================================
-- 7. RATE_LIMIT_COUNTER (Sliding Window)
-- =====================================================
CREATE TABLE rate_limit_counter (
  id BIGSERIAL PRIMARY KEY,

  identifier TEXT NOT NULL,  -- IP address, user_id, etc.
  endpoint TEXT NOT NULL,    -- api/orders, api/orders/{id}/pay, etc.

  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,

  UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX idx_rate_limit_lookup ON rate_limit_counter(identifier, endpoint, window_start);

-- =====================================================
-- 8. WORKER_LOCKS (Distributed Locking)
-- =====================================================
CREATE TABLE worker_locks (
  lock_key TEXT PRIMARY KEY,

  locked_by TEXT NOT NULL,  -- worker_id, hostname, pod_name
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  heartbeat_at TIMESTAMPTZ
);

CREATE INDEX idx_worker_locks_expires ON worker_locks(expires_at)
  WHERE expires_at > NOW();

-- =====================================================
-- VIEWS (For Dashboard & Analytics)
-- =====================================================

-- Funnel view
CREATE OR REPLACE VIEW payment_funnel AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE status = 'CREATED') as created,
  COUNT(*) FILTER (WHERE status = 'PENDING_PAYMENT') as pending,
  COUNT(*) FILTER (WHERE status = 'PAID') as paid,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
  COUNT(*) FILTER (WHERE status = 'EXPIRED') as expired,
  SUM(final_amount) FILTER (WHERE status = 'PAID') as revenue
FROM orders
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Outbox backlog view
CREATE OR REPLACE VIEW notification_backlog AS
SELECT
  channel,
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_at,
  AVG(attempt_count) as avg_attempts
FROM notification_outbox
WHERE status IN ('PENDING', 'RETRYING', 'FAILED', 'DLQ')
GROUP BY channel, status;

-- =====================================================
-- FUNCTIONS (Business Logic)
-- =====================================================

-- Safe status transition
CREATE OR REPLACE FUNCTION transition_order_status(
  p_order_id TEXT,
  p_new_status TEXT,
  p_actor TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Lock row
  SELECT status INTO v_current_status
  FROM orders
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate transition
  CASE
    WHEN v_current_status = 'CREATED' AND p_new_status = 'PENDING_PAYMENT' THEN
      -- Valid
    WHEN v_current_status = 'PENDING_PAYMENT' AND p_new_status IN ('PAID', 'FAILED', 'EXPIRED') THEN
      -- Valid
    WHEN v_current_status = 'PAID' THEN
      RAISE EXCEPTION 'Cannot downgrade PAID status';
    WHEN v_current_status IN ('FAILED', 'EXPIRED') THEN
      RAISE EXCEPTION 'Cannot change from FINAL state %', v_current_status;
    ELSE
      RAISE EXCEPTION 'Invalid transition from % to %', v_current_status, p_new_status;
  END CASE;

  -- Update
  UPDATE orders SET
    status = p_new_status,
    updated_at = NOW(),
    paid_at = CASE WHEN p_new_status = 'PAID' THEN NOW() ELSE paid_at END
  WHERE order_id = p_order_id;

  -- Audit
  INSERT INTO system_audit_log (actor, action, entity_type, entity_id, old_value, new_value, correlation_id)
  VALUES (
    p_actor,
    'order_status_changed',
    'order',
    p_order_id,
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', p_new_status),
    p_order_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORED PROCEDURES (Scheduled Jobs)
-- =====================================================

-- Expire old pending orders
CREATE OR REPLACE FUNCTION expire_pending_orders()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE orders
    SET status = 'EXPIRED',
      updated_at = NOW()
    WHERE status = 'PENDING_PAYMENT'
      AND expires_at < NOW()
    RETURNING order_id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  -- Log
  INSERT INTO system_audit_log (actor, action, entity_type, entity_id, new_value)
  SELECT
    'system:scheduler',
    'order_expired',
    'order',
    order_id,
    jsonb_build_object('status', 'EXPIRED')
  FROM expired;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Clean old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limit()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM rate_limit_counter
  WHERE window_start < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS (Automatic Actions)
-- =====================================================

-- Auto-create entitlement on PAID
CREATE OR REPLACE FUNCTION auto_grant_entitlement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
    INSERT INTO entitlements (order_id, user_email, course_id, course_name, access_url)
    VALUES (
      NEW.order_id,
      NEW.customer_email,
      'ai-movie-course',
      NEW.package_name,
      'https://course.buatfilm.agentbar.ai/login?email=' || NEW.customer_email
    );

    -- Audit
    INSERT INTO system_audit_log (actor, action, entity_type, entity_id, new_value, correlation_id)
    VALUES (
      'system:webhook',
      'entitlement_granted',
      'entitlement',
      NEW.order_id,
      jsonb_build_object('email', NEW.customer_email, 'course', NEW.package_name),
      NEW.order_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_grant_entitlement
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION auto_grant_entitlement();

-- Auto-create outbox entries on PAID
CREATE OR REPLACE FUNCTION auto_create_success_notifications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
    -- Email
    INSERT INTO notification_outbox (order_id, channel, template_name, recipient, subject, body_data)
    VALUES (
      NEW.order_id,
      'EMAIL',
      'EMAIL_PAYMENT_SUCCESS_ACCESS',
      NEW.customer_email,
      '✅ Pembayaran Berhasil! Akses Kursus Kamu Sudah Aktif 🎉',
      jsonb_build_object(
        'customer_name', NEW.customer_name,
        'order_id', NEW.order_id,
        'package_name', NEW.package_name,
        'course_login_link', 'https://course.buatfilm.agentbar.ai/login?email=' || NEW.customer_email,
        'support_whatsapp_link', 'https://wa.me/6281234567890'
      )
    );

    -- WhatsApp
    INSERT INTO notification_outbox (order_id, channel, template_name, recipient, body_data)
    VALUES (
      NEW.order_id,
      'WHATSAPP',
      'payment_success_access',
      NEW.customer_phone,
      jsonb_build_object(
        'customer_name', NEW.customer_name,
        'order_id', NEW.order_id,
        'course_login_link', 'https://course.buatfilm.agentbar.ai/login?email=' || NEW.customer_email,
        'support_whatsapp_link', 'https://wa.me/6281234567890'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_success_notifications
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION auto_create_success_notifications();

-- =====================================================
-- MATIALIZED VIEWS (Analytics Performance)
-- =====================================================

-- Daily summary (refresh every hour)
CREATE MATERIALIZED VIEW daily_summary AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'PAID') as paid_orders,
  COUNT(*) FILTER (WHERE status = 'PENDING_PAYMENT') as pending_orders,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed_orders,
  COUNT(*) FILTER (WHERE status = 'EXPIRED') as expired_orders,
  SUM(final_amount) FILTER (WHERE status = 'PAID') as revenue,
  AVG(final_amount) as avg_order_value,
  COUNT(DISTINCT customer_email) as unique_customers
FROM orders
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX idx_daily_summary_date ON daily_summary(date);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_daily_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_summary;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Migration Strategy

**Version Control:** Use migration versioning (e.g., `001_initial_schema.sql`, `002_add_indexes.sql`)

**Rollback Plan:** Each migration MUST have rollback script

**Zero-Downtime Migration:** For production schema changes
1. Create new table alongside old
2. Backfill data
3. Switch application to new table
4. Drop old table after verification

---

END OF SECTION 2
