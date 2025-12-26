# PRODUCTION-UPGRADE-PLAN-GPT.md
# BuatFilm AgentBar — Production Upgrade Implementation Plan

Version: v1.0
Status: EXECUTION PLAN
Current Live: https://buatfilm.agentbar.ai
Server: srv941062.hstgr.cloud
Target: Zero-Downtime Production Upgrade

---

## 📊 CURRENT STATE ANALYSIS

### Existing Infrastructure
```
✅ Frontend: Live at https://buatfilm.agentbar.ai
   - Static files served from /var/www/buatfilm.agentbar.ai
   - SSL certificate configured
   - Build: Vite + React

✅ Backend: Node.js Express
   - Location: /var/www/api (推测)
   - Process manager: PM2
   - Database: SQLite (orders.db)
   - Payment: Midtrans (SANDBOX mode)

❌ GAPS (Critical for Production-Ready):
   - SQLite in production (no concurrent writes)
   - No webhook signature verification
   - No idempotency (duplicate webhooks = double charge)
   - No circuit breaker (Midtrans down = system down)
   - No monitoring/alerting
   - No health checks
   - No graceful degradation
   - Admin can manually set PAID (fraud risk)
```

### Current Code Analysis

**payment-server.js (Line 96-100):**
```javascript
app.post('/webhooks/midtrans', asyncHandler(async (req, res) => {
  console.log('Midtrans webhook:', req.body);

  const { order_id, transaction_status } = req.body;
  // ❌ NO SIGNATURE VERIFICATION - ANYONE CAN SEND FAKE WEBHOOKS
```

**database.js (SQLite):**
```javascript
// ❌ NO TRANSACTIONS, NO LOCKS
// Concurrent webhook requests can cause race conditions
```

**Notification (Line 86-87):**
```javascript
await sendWhatsAppMessage(orderData);
await sendOrderConfirmationEmail(orderData);
// ❌ DIRECT SEND - NO QUEUE, NO RETRY, NO DLQ
```

---

## 🎯 UPGRADE STRATEGY

### Phase Approach

```
CURRENT (Live)
    ↓
PHASE 0: BACKUP & AUDIT (1 hari)
    ↓
PHASE 1: CRITICAL SECURITY (2 hari)
    ↓
PHASE 2: DATABASE MIGRATION (3 hari)
    ↓
PHASE 3: OBSERVABILITY (2 hari)
    ↓
PHASE 4: RESILIENCE (3 hari)
    ↓
PRODUCTION-READY ✅
```

---

## PHASE 0: BACKUP & AUDIT ⏱️ 1 HARI

### 0.1 Backup Current System

```bash
#!/bin/bash
# backup-current.sh

echo "📦 Backing up current production system..."

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups/buatfilm-$DATE"

# Create backup directory
ssh root@srv941062.hstgr.cloud "mkdir -p $BACKUP_DIR"

# Backup database
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  cp orders.db $BACKUP_DIR/
  cp .env $BACKUP_DIR/
"

# Backup backend code
ssh root@srv941062.hstgr.cloud "
  cd /var/www
  tar -czf $BACKUP_DIR/api-backup.tar.gz api/
"

# Backup frontend
ssh root@srv941062.hstgr.cloud "
  cd /var/www
  tar -czf $BACKUP_DIR/frontend-backup.tar.gz buatfilm.agentbar.ai/
"

# Download backups locally
mkdir -p ./backups/$DATE
scp root@srv941062.hstgr.cloud:$BACKUP_DIR/* ./backups/$DATE/

echo "✅ Backup complete: ./backups/$DATE"
```

**Run this:**
```bash
chmod +x backup-current.sh
./backup-current.sh
```

### 0.2 Audit Current Orders

```bash
#!/bin/bash
# audit-orders.sh

ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  sqlite3 orders.db \".mode column\" \".headers on\" \"SELECT * FROM orders;\"
" > ./current-orders-audit.txt

echo "📊 Orders audit saved to: current-orders-audit.txt"
```

### 0.3 Check Current PM2 Status

```bash
ssh root@srv941062.hstgr.cloud "pm2 status"
pm2 list
pm2 logs payment-api --lines 50
```

---

## PHASE 1: CRITICAL SECURITY 🔒 ⏱️ 2 HARI

### Goal: TUTUP critical security holes TANPA downtime

### 1.1 Webhook Signature Verification

**Create: backend/middleware/webhookSignature.js**

```javascript
// backend/middleware/webhookSignature.js
const crypto = require('crypto');

function verifyMidtransSignature(req, res, next) {
  const signature = req.headers['x-signature-key'];
  const orderId = req.body.order_id;
  const statusCode = req.body.status_code;
  const grossAmount = req.body.gross_amount;
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!signature) {
    console.error('[WEBHOOK] Missing signature header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  // Create signature from request body
  const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expectedSignature = crypto
    .createHash('sha512')
    .update(input)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('[WEBHOOK] Invalid signature:', {
      received: signature,
      expected: expectedSignature,
      orderId
    });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('[WEBHOOK] Signature verified:', orderId);
  req.signatureValid = true;
  next();
}

module.exports = { verifyMidtransSignature };
```

**Update payment-server.js:**

```javascript
// Add at top
const { verifyMidtransSignature } = require('./middleware/webhookSignature');

// Update webhook endpoint
app.post('/webhooks/midtrans',
  verifyMidtransSignature,  // ← ADD THIS
  asyncHandler(async (req, res) => {
    // ... rest of code
  })
);
```

### 1.2 Idempotency for Webhooks

**Create table:**
```javascript
// backend/migrations/001_add_payment_events.js

const database = require('../database');

async function up() {
  await database.run(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      signature_valid BOOLEAN DEFAULT FALSE,
      processed BOOLEAN DEFAULT FALSE,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      raw_payload TEXT
    )
  `);

  console.log('✅ Created payment_events table');
}

async function down() {
  await database.run(`DROP TABLE IF EXISTS payment_events`);
  console.log('⏪ Rolled back payment_events table');
}

module.exports = { up, down };
```

**Update webhook handler:**
```javascript
app.post('/webhooks/midtrans',
  verifyMidtransSignature,
  asyncHandler(async (req, res) => {
    const { order_id, transaction_status, transaction_id } = req.body;

    // Check idempotency
    const existingEvent = await database.get(
      'SELECT processed FROM payment_events WHERE transaction_id = ?',
      [transaction_id]
    );

    if (existingEvent) {
      if (existingEvent.processed) {
        console.log('[WEBHOOK] Already processed:', transaction_id);
        return res.status(200).json({ message: 'Already processed' });
      }
    }

    // Record event
    await database.run(`
      INSERT INTO payment_events (order_id, transaction_id, signature_valid, raw_payload)
      VALUES (?, ?, ?, ?)
    `, [order_id, transaction_id, req.signatureValid, JSON.stringify(req.body)]);

    // Process payment update
    // ... existing logic ...

    // Mark as processed
    await database.run(
      'UPDATE payment_events SET processed = TRUE, processed_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
      [transaction_id]
    );

    res.status(200).json({ success: true });
  })
);
```

### 1.3 Remove Manual Admin PAID Update

**Update payment-server.js (DELETE or COMMENT OUT):**

```javascript
// ❌ REMOVE THIS ENDPOINT - SECURITY RISK
// app.put('/admin/orders/:orderId', auth.verifyToken, auth.adminAuth, asyncHandler(async (req, res) => {
//   const { orderId } = req.params;
//   const { status } = req.body;
//   await database.updateOrderStatus(orderId, status);
//   res.json({ success: true, message: 'Order status updated' });
// }));
```

### 1.4 Deploy Phase 1 Changes

```bash
#!/bin/bash
# deploy-phase1.sh

echo "🔒 Deploying Phase 1: Critical Security..."

# Build backend
cd backend
npm install
npm run test  # Run tests if exists
cd ..

# Deploy to server
echo "📤 Uploading files..."
scp -r backend/* root@srv941062.hstgr.cloud:/var/www/api/

# Run migrations
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  node migrations/001_add_payment_events.js
"

# Restart PM2 (graceful reload)
ssh root@srv941062.hstgr.cloud "
  pm2 reload payment-api
"

# Verify
ssh root@srv941062.hstgr.cloud "
  pm2 status
  pm2 logs payment-api --lines 20 --nostream
"

echo "✅ Phase 1 deployed!"
echo ""
echo "⚠️  IMPORTANT: Test webhook immediately!"
echo "1. Go to Midtrans Dashboard"
echo "2. Send test webhook"
echo "3. Check logs: ssh root@srv941062.hstgr.cloud 'pm2 logs payment-api'"
```

**Test:**
```bash
# Test webhook signature verification
curl -X POST https://buatfilm.agentbar.ai/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TEST-123","status_code":"200","gross_amount":"99000"}'

# Should return 401 (missing signature)
```

---

## PHASE 2: DATABASE MIGRATION 🗄️ ⏱️ 3 HARI

### Goal: Migrate from SQLite to PostgreSQL

### 2.1 Setup PostgreSQL

**Option A: Managed (Recommended for production)**

```bash
# Install PostgreSQL on server
ssh root@srv941062.hstgr.cloud "
  apt update
  apt install -y postgresql postgresql-contrib
  systemctl start postgresql
  systemctl enable postgresql
"

# Create database and user
ssh root@srv941062.hstgr.cloud "
  sudo -u postgres psql <<EOF
CREATE DATABASE buatfilm_production;
CREATE USER buatfilm_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE buatfilm_production TO buatfilm_user;
ALTER USER buatfilm_user WITH SUPERUSER;  -- For migrations
EOF
"
```

**Option B: Cloud Managed (Better for scale)**

Recommended providers:
- **AWS RDS**: Free tier 12 months, then ~$15/month
- **Google Cloud SQL**: Free tier available, ~$10/month
- **Railway**: $5/month
- **Render**: $7/month

### 2.2 Create Migration Scripts

**File: backend/migrations/002_postgresql_schema.sql**

```sql
-- This is the PostgreSQL schema from PRODUCTION-READY-ADDENDUM-GPT.md
-- Run: psql -U buatfilm_user -d buatfilm_production -f 002_postgresql_schema.sql

-- 1. ORDERS
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  final_amount INTEGER NOT NULL CHECK(final_amount > 0),
  discount_code TEXT,
  discount_amount INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CREATED'
    CHECK(status IN ('CREATED', 'PENDING_PAYMENT', 'PAID', 'FAILED', 'EXPIRED')),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- 2. PAYMENT_ATTEMPTS
CREATE TABLE payment_attempts (
  attempt_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider = 'MIDTRANS'),
  snap_token TEXT NOT NULL,
  redirect_url TEXT,
  midtrans_transaction_id TEXT,
  midtrans_payment_type TEXT,
  midtrans_va_number TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  raw_response JSONB
);

CREATE INDEX idx_payment_attempts_order ON payment_attempts(order_id);

-- 3. PAYMENT_EVENTS (Idempotent)
CREATE TABLE payment_events (
  event_id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  raw_payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  signature_input TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_payment_events_idempotency ON payment_events(idempotency_key);
CREATE INDEX idx_payment_events_order ON payment_events(order_id);

-- 4. ENTITLEMENTS
CREATE TABLE entitlements (
  entitlement_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  user_email TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'ai-movie-course',
  course_name TEXT NOT NULL DEFAULT 'Buat Film Pakai AI',
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK(status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  access_url TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_entitlements_email ON entitlements(user_email);

-- 5. NOTIFICATION_OUTBOX
CREATE TABLE notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  channel TEXT NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP')),
  template_name TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body_template TEXT,
  body_data JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(status IN ('PENDING', 'SENDING', 'SENT', 'RETRYING', 'FAILED', 'DLQ')),
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  error_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  UNIQUE(order_id, channel, template_name)
);

CREATE INDEX idx_outbox_status ON notification_outbox(status)
  WHERE status IN ('PENDING', 'RETRYING');

-- 6. SYSTEM_AUDIT_LOG
CREATE TABLE system_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  correlation_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON system_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON system_audit_log(created_at DESC);
```

### 2.3 Migration Tool (SQLite → PostgreSQL)

**File: backend/scripts/migrate-to-postgres.js**

```javascript
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

// SQLite connection
const sqliteDb = new sqlite3.Database('./orders.db');

// PostgreSQL connection
const pgPool = new Pool({
  host: 'localhost',
  database: 'buatfilm_production',
  user: 'buatfilm_user',
  password: process.env.PG_PASSWORD,
  max: 10
});

async function migrateOrders() {
  console.log('🔄 Starting migration...');

  // Get all orders from SQLite
  const orders = await new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM orders', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log(`📦 Found ${orders.length} orders to migrate`);

  let migrated = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      await pgPool.query(`
        INSERT INTO orders (
          order_id, customer_name, customer_email, customer_phone,
          package_id, package_name, final_amount,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (order_id) DO NOTHING
      `, [
        order.id,
        order.customerName,
        order.email,
        order.phone,
        'ai-movie-course',  // Default package
        'Buat Film Pakai AI',
        order.amount,
        order.status || 'PENDING_PAYMENT',
        order.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);

      migrated++;
      console.log(`✅ Migrated: ${order.id}`);

    } catch (error) {
      failed++;
      console.error(`❌ Failed to migrate ${order.id}:`, error.message);
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Success: ${migrated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Total: ${orders.length}`);

  await pgPool.end();
  sqliteDb.close();

  if (failed > 0) {
    process.exit(1);
  }
}

migrateOrders();
```

### 2.4 Deploy Phase 2

```bash
#!/bin/bash
# deploy-phase2.sh

echo "🗄️  Deploying Phase 2: PostgreSQL Migration..."

# 1. Setup PostgreSQL
echo "📦 Installing PostgreSQL..."
ssh root@srv941062.hstgr.cloud "
  apt update
  apt install -y postgresql postgresql-contrib
"

# 2. Create database
echo "🔧 Creating database..."
ssh root@srv941062.hstgr.cloud "
  sudo -u postgres psql <<EOF
CREATE DATABASE buatfilm_production;
CREATE USER buatfilm_user WITH PASSWORD '${PG_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE buatfilm_production TO buatfilm_user;
EOF
"

# 3. Upload schema
echo "📤 Uploading schema..."
scp backend/migrations/002_postgresql_schema.sql \
  root@srv941062.hstgr.cloud:/tmp/schema.sql

# 4. Create schema
echo "🔨 Creating tables..."
ssh root@srv941062.hstgr.cloud "
  psql -U buatfilm_user -d buatfilm_production -f /tmp/schema.sql
"

# 5. Upload migration script
echo "📤 Uploading migration script..."
scp backend/scripts/migrate-to-postgres.js \
  root@srv941062.hstgr.cloud:/var/www/api/

# 6. Run migration
echo "🔄 Migrating data..."
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  PG_PASSWORD='${PG_PASSWORD}' node migrate-to-postgres.js
"

# 7. Update .env
echo "🔧 Updating configuration..."
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  echo 'DB_TYPE=postgresql' >> .env
  echo 'PG_HOST=localhost' >> .env
  echo 'PG_DATABASE=buatfilm_production' >> .env
  echo 'PG_USER=buatfilm_user' >> .env
  echo \"PG_PASSWORD=${PG_PASSWORD}\" >> .env
"

# 8. Update database.js to use PostgreSQL
echo "📤 Uploading updated database layer..."
scp backend/database-postgres.js \
  root@srv941062.hstgr.cloud:/var/www/api/database.js

# 9. Restart with minimal downtime
echo "🔄 Restarting API..."
ssh root@srv941062.hstgr.cloud "
  pm2 reload payment-api
"

echo "✅ Phase 2 deployed!"
echo ""
echo "⚠️  VERIFY MIGRATION:"
echo "ssh root@srv941062.hstgr.cloud 'psql -U buatfilm_user -d buatfilm_production -c \"SELECT COUNT(*) FROM orders;\"'"
```

**Verification:**
```bash
# Check PostgreSQL
ssh root@srv941062.hstgr.cloud "
  psql -U buatfilm_user -d buatfilm_production -c 'SELECT COUNT(*) FROM orders;'
"

# Test API
curl https://buatfilm.agentbar.ai/health
```

---

## PHASE 3: OBSERVABILITY 📊 ⏱️ 2 HARI

### Goal: Add logging, metrics, and health checks

### 3.1 Structured Logging

**Install dependencies:**
```bash
cd backend
npm install pino pino-pretty
```

**Create: backend/lib/logger.js**

```javascript
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname'
    }
  },
  base: {
    service: 'buatfilm-payment-api',
    environment: process.env.NODE_ENV || 'production'
  }
});

module.exports = logger;
```

### 3.2 Health Check Endpoint

**Create: backend/routes/health.js**

```javascript
const express = require('express');
const router = express.Router();
const database = require('../database');
const logger = require('../lib/logger');

router.get('/health', async (req, res) => {
  const checks = {
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    status: 'healthy'
  };

  try {
    // Check database
    await database.raw('SELECT 1');
    checks.database = { status: 'healthy' };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});

router.get('/health/ready', async (req, res) => {
  // Kubernetes readiness probe
  const ready = checks.database?.status === 'healthy';

  res.status(ready ? 200 : 503).json({
    ready,
    message: ready ? 'System ready' : 'System not ready'
  });
});

module.exports = router;
```

**Add to payment-server.js:**
```javascript
const healthRoutes = require('./routes/health');
app.use('/', healthRoutes);
```

### 3.3 PM2 Monitoring

**Configure: backend/ecosystem.config.js**

```javascript
module.exports = {
  apps: [{
    name: 'payment-api',
    script: './payment-server.js',
    instances: 2,  // Run 2 instances for redundancy
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }];
};
```

**Deploy:**
```bash
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  pm2 delete payment-api
  pm2 start ecosystem.config.js
  pm2 save
"
```

---

## PHASE 4: RESILIENCE 🛡️ ⏱️ 3 HARI

### Goal: Add circuit breaker, retry, DLQ

### 4.1 Install Dependencies

```bash
cd backend
npm install opossum async-retry
```

### 4.2 Circuit Breaker Implementation

**Create: backend/lib/circuitBreaker.js**

```javascript
const CircuitBreaker = require('opossum');

const midtransBreakerOptions = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 60000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10
};

// Export configured breaker
module.exports = (operation, options = {}) => {
  const opts = { ...midtransBreakerOptions, ...options };
  const breaker = new CircuitBreaker(operation, opts);

  breaker.on('open', () => {
    console.error('[CB] Circuit breaker opened');
  });

  breaker.on('halfOpen', () => {
    console.log('[CB] Circuit breaker half-open');
  });

  breaker.on('close', () => {
    console.log('[CB] Circuit breaker closed');
  });

  return breaker;
};
```

### 4.3 Update Notification to Use Outbox

**Notification Worker: backend/workers/notification-worker.js**

```javascript
const database = require('../database');
const { sendWhatsAppMessage, sendSuccessWhatsApp } = require('../services/whatsapp');
const { sendOrderConfirmationEmail, sendPaymentSuccessEmail } = require('../services/email');
const logger = require('../lib/logger');

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS = [60000, 300000, 900000, 1800000]; // 1m, 5m, 15m, 30m

async function processNotification(notification) {
  logger.info({
    notification_id: notification.id,
    template: notification.template_name,
    channel: notification.channel
  }, 'Processing notification');

  try {
    if (notification.channel === 'EMAIL') {
      await sendOrderConfirmationEmail(notification.body_data);
    } else if (notification.channel === 'WHATSAPP') {
      await sendWhatsAppMessage(notification.body_data);
    }

    // Mark as sent
    await database.run(`
      UPDATE notification_outbox
      SET status = 'SENT', sent_at = NOW()
      WHERE id = $1
    `, [notification.id]);

    logger.info({ notification_id: notification.id }, 'Notification sent');

  } catch (error) {
    const attemptCount = notification.attempt_count + 1;

    if (attemptCount >= MAX_ATTEMPTS) {
      // Move to DLQ
      await database.run(`
        UPDATE notification_outbox
        SET status = 'DLQ', last_error = $2
        WHERE id = $1
      `, [notification.id, error.message]);

      logger.error({ notification_id: notification.id }, 'Moved to DLQ');

    } else {
      // Schedule retry
      const nextRetry = new Date(Date.now() + RETRY_DELAYS[attemptCount - 1]);

      await database.run(`
        UPDATE notification_outbox
        SET status = 'RETRYING',
            attempt_count = $2,
            next_retry_at = $3,
            last_error = $4
        WHERE id = $1
      `, [notification.id, attemptCount, nextRetry, error.message]);

      logger.warn({
        notification_id: notification.id,
        attempt: attemptCount,
        next_retry: nextRetry
      }, 'Scheduled retry');
    }
  }
}

async function workerLoop() {
  logger.info('Starting notification worker...');

  while (true) {
    try {
      const notifications = await database.all(`
        SELECT * FROM notification_outbox
        WHERE status IN ('PENDING', 'RETRYING')
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY created_at ASC
        LIMIT 10
      `);

      if (notifications.length > 0) {
        logger.info({ count: notifications.length }, 'Found notifications to process');

        for (const notification of notifications) {
          await processNotification(notification);
        }
      }

      // Sleep before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      logger.error({ error: error.message }, 'Worker error');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Start worker if this is the main module
if (require.main === module) {
  workerLoop();
}

module.exports = { workerLoop, processNotification };
```

### 4.4 Update Webhook to Use Outbox

**In payment-server.js webhook handler:**

```javascript
// Instead of direct send:
// await sendWhatsAppMessage(orderData);
// await sendOrderConfirmationEmail(orderData);

// Use outbox:
await database.run(`
  INSERT INTO notification_outbox (order_id, channel, template_name, recipient, body_data)
  VALUES ($1, 'EMAIL', 'EMAIL_PAYMENT_INSTRUCTION_INITIAL', $2, $3)
`, [order_id, email, JSON.stringify(orderData)]);

await database.run(`
  INSERT INTO notification_outbox (order_id, channel, template_name, recipient, body_data)
  VALUES ($1, 'WHATSAPP', 'payment_instruction_initial', $2, $3)
`, [order_id, phone, JSON.stringify(orderData)]);
```

### 4.5 Deploy Phase 4

```bash
#!/bin/bash
# deploy-phase4.sh

echo "🛡️  Deploying Phase 4: Resilience..."

# Upload worker
scp backend/workers/notification-worker.js \
  root@srv941062.hstgr.cloud:/var/www/api/workers/

# Start notification worker
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  pm2 start workers/notification-worker.js --name notification-worker
  pm2 save
"

# Update main API
scp -r backend/* root@srv941062.hstgr.cloud:/var/www/api/

# Reload
ssh root@srv941062.hstgr.cloud "
  pm2 reload payment-api
"

echo "✅ Phase 4 deployed!"
echo ""
echo "✅ Workers running:"
ssh root@srv941062.hstgr.cloud "pm2 status"
```

---

## 📋 FINAL VERIFICATION CHECKLIST

After all phases, run this checklist:

```bash
#!/bin/bash
# verify-production-ready.sh

echo "✅ Production-Ready Verification Checklist"
echo "=========================================="
echo ""

# 1. Health Check
echo "1. Health Check:"
curl -s https://buatfilm.agentbar.ai/health | jq '.'
echo ""

# 2. Database Connectivity
echo "2. PostgreSQL Orders Count:"
ssh root@srv941062.hstgr.cloud "
  psql -U buatfilm_user -d buatfilm_production -t -c 'SELECT COUNT(*) FROM orders;'
"
echo ""

# 3. PM2 Status
echo "3. PM2 Processes:"
ssh root@srv941062.hstgr.cloud "pm2 status"
echo ""

# 4. Webhook Security Test
echo "4. Webhook Signature Test:"
curl -X POST https://buatfilm.agentbar.ai/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TEST-SECURE-001","status_code":"200","gross_amount":"99000"}' \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# 5. Notification Worker Test
echo "5. Notification Worker:"
ssh root@srv941062.hstgr.cloud "
  psql -U buatfilm_user -d buatfilm_production -c \
    'SELECT COUNT(*) FROM notification_outbox WHERE status = '\''SENT'\'';'
"
echo ""

# 6. Logs Check
echo "6. Recent Logs (last 10 lines):"
ssh root@srv941062.hstgr.cloud "pm2 logs payment-api --lines 10 --nostream"
echo ""

echo "=========================================="
echo "✅ Verification complete!"
```

---

## 🚨 ROLLBACK PLAN

If something goes wrong:

```bash
#!/bin/bash
# rollback.sh

echo "⏪ Rolling back to backup..."

BACKUP_DIR="/root/backups/buatfilm-YYYYMMDD_HHMMSS"  # Update with actual backup

# Stop PM2
ssh root@srv941062.hstgr.cloud "pm2 stop all"

# Restore database
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  cp orders.db orders.db.failed
  cp $BACKUP_DIR/orders.db .
"

# Restore code
ssh root@srv941062.hstgr.cloud "
  cd /var/www
  rm -rf api
  tar -xzf $BACKUP_DIR/api-backup.tar.gz
"

# Restart
ssh root@srv941062.hstgr.cloud "pm2 start all"

echo "✅ Rollback complete!"
```

---

## 📅 TIMELINE SUMMARY

| Phase | Duration | Downtime | Risk |
|-------|----------|----------|------|
| Phase 0: Backup | 1 day | None | Low |
| Phase 1: Security | 2 days | None | Medium |
| Phase 2: PostgreSQL | 3 days | ~5 min | High |
| Phase 3: Observability | 2 days | None | Low |
| Phase 4: Resilience | 3 days | None | Medium |
| **TOTAL** | **11 days** | **5 min** | **Medium** |

---

## 🎯 SUCCESS METRICS

After upgrade, you should have:

✅ **Security:**
- Webhook signature verification active
- Idempotency preventing duplicates
- No manual admin PAID updates

✅ **Reliability:**
- PostgreSQL handling concurrent writes
- Circuit breaker preventing cascade failures
- Notification queue with retry & DLQ

✅ **Observability:**
- Health check endpoint
- Structured JSON logs
- PM2 monitoring

✅ **Performance:**
- Response time < 500ms (P95)
- Support for 100+ concurrent orders
- Zero data loss

---

END OF IMPLEMENTATION PLAN
