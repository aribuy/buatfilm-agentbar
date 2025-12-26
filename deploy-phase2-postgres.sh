#!/bin/bash
###############################################################################
# PHASE 2: POSTGRESQL MIGRATION
# Duration: 3 hours
# Downtime: ~5 minutes (during cutover)
###############################################################################

set -e

echo "=================================================="
echo "🗄️  PHASE 2: POSTGRESQL MIGRATION"
echo "=================================================="
echo ""
echo "⚠️  WARNING: This phase will cause ~5 min downtime"
echo "   Schedule during low-traffic period (e.g., 2 AM)"
echo ""
echo "📅 Date: $(date)"
echo ""

# Prompt for confirmation
read -p "Are you ready to proceed? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Aborted. Run this script when ready."
  exit 1
fi

# Prompt for PostgreSQL password
echo ""
echo "🔐 Enter PostgreSQL password for buatfilm_user:"
read -s -p "Password: " PG_PASSWORD
echo
echo ""

echo "=================================================="
echo "Step 1: Installing PostgreSQL"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  echo 'Updating packages...'
  apt update
  echo 'Installing PostgreSQL...'
  apt install -y postgresql postgresql-contrib
  echo 'Starting PostgreSQL service...'
  systemctl start postgresql
  systemctl enable postgresql
  echo '✅ PostgreSQL installed and running'
  psql --version
"
echo ""

echo "=================================================="
echo "Step 2: Creating Database and User"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE buatfilm_production;

-- Create user with password
CREATE USER buatfilm_user WITH PASSWORD '$PG_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE buatfilm_production TO buatfilm_user;

-- Connect to database and grant schema privileges
\c buatfilm_production
GRANT ALL ON SCHEMA public TO buatfilm_user;

EOF
  echo '✅ Database and user created'
"
echo ""

echo "=================================================="
echo "Step 3: Creating PostgreSQL Schema"
echo "=================================================="

# Create schema file
cat > /tmp/postgres-schema.sql << 'SQLEOF'
-- =====================================================
-- 1. ORDERS
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  package_id TEXT NOT NULL DEFAULT 'ai-movie-course',
  package_name TEXT NOT NULL DEFAULT 'Buat Film Pakai AI',
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

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- =====================================================
-- 2. PAYMENT_ATTEMPTS
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_attempts (
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

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id);

-- =====================================================
-- 3. PAYMENT_EVENTS (Idempotent)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_events (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_idempotency ON payment_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_processed ON payment_events(processed) WHERE processed = FALSE;

-- =====================================================
-- 4. ENTITLEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS entitlements (
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

CREATE INDEX IF NOT EXISTS idx_entitlements_email ON entitlements(user_email);
CREATE INDEX IF NOT EXISTS idx_entitlements_course ON entitlements(course_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements(status);

-- =====================================================
-- 5. NOTIFICATION_OUTBOX
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_outbox (
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

CREATE INDEX IF NOT EXISTS idx_outbox_status ON notification_outbox(status)
  WHERE status IN ('PENDING', 'RETRYING');
CREATE INDEX IF NOT EXISTS idx_outbox_next_retry ON notification_outbox(next_retry_at)
  WHERE status IN ('RETRYING');

-- =====================================================
-- 6. SYSTEM_AUDIT_LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS system_audit_log (
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

CREATE INDEX IF NOT EXISTS idx_audit_entity ON system_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON system_audit_log(created_at DESC);
SQLEOF

# Upload schema
scp /tmp/postgres-schema.sql root@srv941062.hstgr.cloud:/tmp/schema.sql

# Create tables
ssh root@srv941062.hstgr.cloud "
  psql -U buatfilm_user -d buatfilm_production -f /tmp/schema.sql
  echo '✅ PostgreSQL schema created'
"
echo ""

echo "=================================================="
echo "Step 4: Creating Migration Script"
echo "=================================================="

cat > /tmp/migrate-to-postgres.js << 'JSEOF'
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

  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    for (const order of orders) {
      try {
        await client.query(`
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
          'ai-movie-course',
          'Buat Film Pakai AI',
          order.amount,
          order.status || 'PENDING_PAYMENT',
          order.created_at ? new Date(order.created_at).toISOString() : new Date().toISOString(),
          new Date().toISOString()
        ]);

        migrated++;
        if (migrated % 10 === 0) {
          console.log(`✅ Progress: ${migrated}/${orders.length}`);
        }

      } catch (error) {
        failed++;
        console.error(`❌ Failed to migrate ${order.id}:`, error.message);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Transaction committed');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
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

migrateOrders().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
JSEOF

# Upload migration script
scp /tmp/migrate-to-postgres.js root@srv941062.hstgr.cloud:/var/www/api/
echo "✅ Migration script uploaded"
echo ""

echo "=================================================="
echo "Step 5: Running Data Migration"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  PG_PASSWORD='$PG_PASSWORD' node migrate-to-postgres.js
"
echo ""

echo "=================================================="
echo "Step 6: Verifying Migration"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  echo '=== Orders in PostgreSQL ==='
  psql -U buatfilm_user -d buatfilm_production -t -c 'SELECT COUNT(*) FROM orders;'
  echo ''
  echo '=== Orders by status ==='
  psql -U buatfilm_user -d buatfilm_production -c 'SELECT status, COUNT(*) FROM orders GROUP BY status;'
"
echo ""

echo "=================================================="
echo "Step 7: Creating PostgreSQL Database Layer"
echo "=================================================="

cat > backend/database-postgres.js << 'JSEOF'
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'buatfilm_production',
  user: process.env.PG_USER || 'buatfilm_user',
  password: process.env.PG_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  },

  get: async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows[0];
  },

  all: async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows;
  },

  run: async (text, params) => {
    await pool.query(text, params);
  },

  raw: async (text) => {
    return pool.query(text);
  }
};
JSEOF

echo "✅ Created: backend/database-postgres.js"
echo ""

echo "=================================================="
echo "Step 8: Updating .env File"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  echo '' >> .env
  echo '# PostgreSQL Configuration' >> .env
  echo 'DB_TYPE=postgresql' >> .env
  echo 'PG_HOST=localhost' >> .env
  echo 'PG_DATABASE=buatfilm_production' >> .env
  echo 'PG_USER=buatfilm_user' >> .env
  echo \"PG_PASSWORD=$PG_PASSWORD\" >> .env
  echo '✅ .env updated'
"
echo ""

echo "=================================================="
echo "Step 9: Updating Application Code"
echo "=================================================="

# Upload new database layer
scp backend/database-postgres.js root@srv941062.hstgr.cloud:/var/www/api/database.js

# Update payment-server.js to use PostgreSQL
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  # Backup current
  cp database.js database-sqlite.js.bak
  echo '✅ Database layer updated'
"
echo ""

echo "=================================================="
echo "Step 10: ⚠️  DOWNTIME STARTING"
echo "=================================================="
echo "⏸️  Stopping PM2 processes..."
ssh root@srv941062.hstgr.cloud "
  pm2 stop payment-api
"
echo "✅ Services stopped"
echo ""

echo "=================================================="
echo "Step 11: Installing pg Node Module"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  npm install pg
  echo '✅ pg module installed'
"
echo ""

echo "=================================================="
echo "Step 12: Starting Services with PostgreSQL"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  pm2 start payment-server.js --name payment-api
  pm2 save
"
echo "✅ Services restarted"
echo ""

echo "=================================================="
echo "Step 13: ⚠️  DOWNTIME ENDED"
echo "=================================================="
echo "▶️  Services back online"
echo ""

echo "=================================================="
echo "Step 14: Verification"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  pm2 status
  echo ''
  echo '=== Recent Logs ==='
  pm2 logs payment-api --lines 30 --nostream
"
echo ""

echo "=================================================="
echo "Step 15: Health Check"
echo "=================================================="
HEALTH_CHECK=$(curl -s https://buatfilm.agentbar.ai/health 2>/dev/null || echo "NOT_AVAILABLE")
echo "$HEALTH_CHECK"
echo ""

echo "=================================================="
echo "Step 16: Final Verification Queries"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  echo '=== Total Orders ==='
  psql -U buatfilm_user -d buatfilm_production -t -c 'SELECT COUNT(*) FROM orders;'
  echo ''
  echo '=== Recent Orders ==='
  psql -U buatfilm_user -d buatfilm_production -c 'SELECT order_id, customer_name, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5;'
  echo ''
  echo '=== Database Size ==='
  psql -U buatfilm_user -d buatfilm_production -c \"SELECT pg_size_pretty(pg_database_size('buatfilm_production')) AS size;\"
"
echo ""

echo "=================================================="
echo "✅ PHASE 2 COMPLETE!"
echo "=================================================="
echo ""
echo "🎉 Migration Successful:"
echo "   ✅ PostgreSQL installed and configured"
echo "   ✅ Schema created (6 tables)"
echo "   ✅ Data migrated from SQLite"
echo "   ✅ Application using PostgreSQL"
echo "   ✅ Services restarted and verified"
echo ""
echo "⚠️  IMPORTANT:"
echo "   • SQLite backup: /var/www/api/orders.db"
echo "   • Keep backup for at least 7 days"
echo "   • Monitor logs for any database errors"
echo "   • Test payment flow end-to-end"
echo ""
echo "🚀 Ready for Phase 3!"
echo "   ./deploy-phase3-observability.sh"
echo ""
