-- =====================================================
-- AI MOVIE COURSE - DATABASE SCHEMA
-- Version: 1.0 (SaaS-Ready)
-- Last Updated: 2025-12-27
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For encryption

-- =====================================================
-- TENANT MANAGEMENT (SaaS Multi-Tenancy)
-- =====================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- For subdomain: tenant.saas.com
    plan VARCHAR(50) DEFAULT 'starter', -- starter, pro, enterprise
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled

    -- Payment Gateway Config (Per Tenant)
    midtrans_environment VARCHAR(10) DEFAULT 'sandbox', -- sandbox, production
    midtrans_server_key TEXT, -- Encrypted
    midtrans_client_key TEXT, -- Encrypted
    midtrans_merchant_id VARCHAR(100),

    -- Notification Config
    email_from VARCHAR(255),
    email_reply_to VARCHAR(255),
    whatsapp_enabled BOOLEAN DEFAULT false,
    whatsapp_api_url TEXT,
    whatsapp_api_token TEXT, -- Encrypted

    -- Branding (White-label)
    logo_url TEXT,
    primary_color VARCHAR(7),
    domain_custom VARCHAR(255), -- Custom domain (optional)

    -- Limits (Plan-based)
    max_orders_per_month INTEGER DEFAULT 100,
    max_admin_users INTEGER DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP, -- Soft delete

    CONSTRAINT valid_plan CHECK (plan IN ('starter', 'pro', 'enterprise')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'cancelled'))
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- =====================================================
-- ADMIN USERS (Tenant Staff)
-- =====================================================

CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Auth
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt
    role VARCHAR(20) DEFAULT 'ops', -- owner, finance, ops, dev

    -- Profile
    name VARCHAR(255),
    avatar_url TEXT,

    -- Security
    two_fa_enabled BOOLEAN DEFAULT false,
    two_fa_secret TEXT,
    last_login_at TIMESTAMP,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_role CHECK (role IN ('owner', 'finance', 'ops', 'dev'))
);

CREATE INDEX idx_admin_users_tenant ON admin_users(tenant_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- =====================================================
-- CUSTOMERS (End Users)
-- =====================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Contact Info
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    name VARCHAR(255),

    -- Authentication (Optional - for customer portal)
    password_hash TEXT,

    -- Metadata
    first_seen_at TIMESTAMP DEFAULT NOW(),
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,

    -- Fraud Detection
    ip_address INET,
    risk_score INTEGER DEFAULT 0, -- 0-100
    is_blocked BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);
CREATE INDEX idx_customers_phone ON customers(phone);

-- =====================================================
-- ORDERS (Core Transaction)
-- =====================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Order Info
    order_id VARCHAR(100) UNIQUE NOT NULL, -- External-facing: ORD-XXXXX
    gross_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',

    -- Product Info (Flexible for SaaS)
    product_id VARCHAR(100),
    product_name VARCHAR(255),
    product_metadata JSONB, -- {variant, sku, etc}

    -- Payment Gateway
    payment_method VARCHAR(50), -- bca_va, gopay, qris, etc
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, expired, refunded
    midtrans_transaction_id VARCHAR(100),
    midtrans_payment_type VARCHAR(50),
    midtrans_status_code VARCHAR(10),
    midtrans_gross_amount DECIMAL(15,2),

    -- Fees
    midtrans_fee_amount DECIMAL(15,2) DEFAULT 0,
    payment_gateway_fee DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2), -- Revenue after fees

    -- Settlement
    settlement_batch_id VARCHAR(100),
    settlement_date DATE,

    -- Tracking
    customer_ip INET,
    customer_user_agent TEXT,
    referrer_url TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    -- Status
    fraud_score INTEGER DEFAULT 0,
    is_test_order BOOLEAN DEFAULT false,
    paid_at TIMESTAMP,
    expired_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_payment_status CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'expired', 'refunded'
    ))
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_midtrans_id ON orders(midtrans_transaction_id);

-- =====================================================
-- WEBHOOK EVENTS (Audit Log)
-- =====================================================

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- Event Info
    event_type VARCHAR(50), -- payment.pending, settlement, etc
    midtrans_status VARCHAR(50),

    -- Payload
    raw_payload JSONB,
    signature_provided BOOLEAN,
    signature_valid BOOLEAN,

    -- Processing
    processed BOOLEAN DEFAULT false,
    processing_error TEXT,

    -- Timestamp
    received_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhooks_tenant ON webhook_events(tenant_id);
CREATE INDEX idx_webhooks_order ON webhook_events(order_id);
CREATE INDEX idx_webhooks_received ON webhook_events(received_at DESC);

-- =====================================================
-- NOTIFICATIONS (Email & WhatsApp)
-- =====================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Channel
    channel VARCHAR(20) NOT NULL, -- email, whatsapp
    event_type VARCHAR(50), -- order_created, payment_success, reminder_1, etc

    -- Content
    template_id VARCHAR(100),
    template_version INTEGER DEFAULT 1,
    subject VARCHAR(500),
    content TEXT,
    recipient VARCHAR(255) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'queued', -- queued, sent, failed, bounced
    provider_message_id VARCHAR(255), -- For tracking

    -- Delivery
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP, -- Email open tracking
    clicked_at TIMESTAMP, -- Link click tracking

    -- Error
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_channel CHECK (channel IN ('email', 'whatsapp')),
    CONSTRAINT valid_status CHECK (status IN (
        'queued', 'sent', 'failed', 'bounced', 'delivered'
    ))
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_order ON notifications(order_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- =====================================================
-- NOTIFICATION TEMPLATES (Customizable per Tenant)
-- =====================================================

CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = global default

    -- Template Info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    channel VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,

    -- Content
    subject_template TEXT,
    body_template TEXT NOT NULL,
    variables JSONB, -- ["customer_name", "order_id", "amount"]

    -- Metadata
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, name, version)
);

CREATE INDEX idx_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX idx_templates_active ON notification_templates(is_active);

-- =====================================================
-- NOTIFICATION RULES (Automation)
-- =====================================================

CREATE TABLE notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Rule Info
    name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,

    -- Trigger Conditions
    delay_minutes INTEGER DEFAULT 0, -- Send after X minutes
    quiet_hours_start TIME, -- Don't send before this time
    quiet_hours_end TIME, -- Don't send after this time

    -- Channel Selection
    send_email BOOLEAN DEFAULT true,
    send_whatsapp BOOLEAN DEFAULT false,

    -- Conditions
    conditions JSONB, -- {"payment_method": ["bca_va"], "amount": {"min": 100000}}

    -- Priority
    priority INTEGER DEFAULT 0, -- Higher = executed first

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_rules_tenant ON notification_rules(tenant_id);
CREATE INDEX idx_rules_enabled ON notification_rules(is_enabled);

-- =====================================================
-- SETTLEMENTS (Reconciliation)
-- =====================================================

CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Batch Info
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    settlement_date DATE NOT NULL,

    -- Totals
    total_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    total_fee DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) DEFAULT 0,

    -- Bank Info
    bank_account VARCHAR(100),
    bank_name VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed

    -- Midtrans Reference
    midtrans_report_data JSONB,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_settlement_status CHECK (status IN (
        'pending', 'completed', 'failed'
    ))
);

CREATE INDEX idx_settlements_tenant ON settlements(tenant_id);
CREATE INDEX idx_settlements_batch ON settlements(batch_id);
CREATE INDEX idx_settlements_date ON settlements(settlement_date DESC);

-- =====================================================
-- AUDIT LOGS (Compliance & Security)
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

    -- Actor
    actor_id UUID REFERENCES admin_users(id),
    actor_email VARCHAR(255),
    actor_role VARCHAR(50),

    -- Action
    action VARCHAR(100) NOT NULL, -- order.updated, settings.changed, user.login
    entity_type VARCHAR(50), -- order, customer, settings, template
    entity_id UUID,

    -- Changes
    old_values JSONB,
    new_values JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp (IMMUTABLE)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- =====================================================
-- SYSTEM SETTINGS (Global & Per-Tenant)
-- =====================================================

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = global

    -- Setting Info
    key VARCHAR(100) NOT NULL,
    value TEXT,
    value_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    is_encrypted BOOLEAN DEFAULT false,
    description TEXT,

    -- Validation
    category VARCHAR(50), -- payment, email, whatsapp, general

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, key)
);

CREATE INDEX idx_settings_tenant ON settings(tenant_id);
CREATE INDEX idx_settings_category ON settings(category);

-- Insert default global settings
INSERT INTO settings (tenant_id, key, value, value_type, category, description) VALUES
(NULL, 'system.version', '1.0.0', 'string', 'general', 'System version'),
(NULL, 'system.maintenance_mode', 'false', 'boolean', 'general', 'Maintenance mode toggle'),
(NULL, 'payment.default_expiry_hours', '24', 'number', 'payment', 'Default payment expiry in hours');

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS (Common Queries)
-- =====================================================

-- Order Summary Dashboard
CREATE VIEW v_order_summary AS
SELECT
    tenant_id,
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders,
    COUNT(*) FILTER (WHERE payment_status = 'failed') as failed_orders,
    COUNT(*) FILTER (WHERE payment_status = 'expired') as expired_orders,
    SUM(gross_amount) FILTER (WHERE payment_status = 'paid') as revenue,
    COUNT(*) as total_orders
FROM orders
WHERE deleted_at IS NULL
GROUP BY tenant_id, DATE(created_at);

-- Payment Method Breakdown
CREATE VIEW v_payment_methods AS
SELECT
    tenant_id,
    payment_method,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders,
    SUM(gross_amount) FILTER (WHERE payment_status = 'paid') as revenue,
    AVG(gross_amount) as avg_order_value
FROM orders
WHERE payment_method IS NOT NULL AND deleted_at IS NULL
GROUP BY tenant_id, payment_method;

-- =====================================================
-- INITIAL DATA (Default Tenant)
-- =====================================================

-- Insert default tenant (buatfilm)
INSERT INTO tenants (name, slug, plan, email_from, email_reply_to) VALUES
('BuatFilm AI', 'buatfilm', 'pro', 'buatfilm@agentbar.ai', 'buatfilm-support@agentbar.ai');

-- Insert default admin user (password: admin123 - CHANGE IMMEDIATELY!)
INSERT INTO admin_users (tenant_id, email, password_hash, name, role) VALUES
(
    (SELECT id FROM tenants WHERE slug = 'buatfilm'),
    'admin@buatfilm.agentbar.ai',
    '$2b$10$abcdefghijklmnopqrstuvwxyz123456', -- bcrypt hash - REPLACE THIS!
    'Super Admin',
    'owner'
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Multi-Tenancy Security
-- =====================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can only access their tenant's data
CREATE POLICY admin_users_tenant_policy ON admin_users
    USING (
        tenant_id IN (
            SELECT tenant_id FROM admin_users WHERE id = current_setting('app.current_user_id')::UUID
        )
    );

-- Similar policies for other tables...
-- (Full RLS implementation requires session management)

-- =====================================================
-- GRANTS
-- =====================================================

-- Create application user
-- CREATE USER app_user WITH PASSWORD 'secure_password_here';

-- Grant necessary permissions
-- GRANT CONNECT ON DATABASE ai_movie_course TO app_user;
-- GRANT USAGE ON SCHEMA public TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
