# 🚀 MANUAL DEPLOYMENT GUIDE
## Fast Track Production Upgrade - Step by Step

Karena SSH key belum ter-setup, silakan jalankan command-command ini **secara manual** dari terminal Anda.

---

## PRE-REQUISITES

1. Pastikan Anda bisa SSH ke server:
   ```bash
   ssh root@srv941062.hstgr.cloud
   ```

2. Jika SSH berhasil, lanjutkan ke langkah berikut.

---

## 📦 PHASE 0: BACKUP (30 menit)

Jalankan dari local machine:

```bash
cd /Users/endik/PyCharmMiscProject/ai-movie-course-integrated

# 1. Create backup directory
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"
mkdir -p "$BACKUP_DIR"

# 2. SSH ke server dan backup
ssh root@srv941062.hstgr.cloud << 'ENDSSH'
BACKUP_DIR="/root/backups/buatfilm-$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

cd /var/www/api
cp orders.db $BACKUP_DIR/
cp .env $BACKUP_DIR/
cd /var/www
tar -czf $BACKUP_DIR/api-backup.tar.gz api/
tar -czf $BACKUP_DIR/frontend-backup.tar.gz buatfilm.agentbar.ai/

echo "✅ Backup complete: $BACKUP_DIR"
ls -lh $BACKUP_DIR/
ENDSSH

# 3. Download backups
scp -r root@srv941062.hstgr.cloud:/root/backups/buatfilm-* "$BACKUP_DIR/"

# 4. Audit current orders
ssh root@srv941062.hstgr.cloud "sqlite3 /var/www/api/orders.db 'SELECT * FROM ORDER BY created_at DESC LIMIT 10;'" > "$BACKUP_DIR/orders-audit.txt"

echo "✅ Phase 0 complete! Backup di: $BACKUP_DIR"
```

---

## 🔒 PHASE 1: SECURITY (2 jam, NO downtime)

### Step 1: Create middleware files

```bash
# SSH ke server
ssh root@srv941062.hstgr.cloud

# Di server, jalankan:
cd /var/www/api

# Buat middleware directory
mkdir -p middleware migrations lib routes workers

# Buat webhook signature verification
cat > middleware/webhookSignature.js << 'EOF'
const crypto = require('crypto');

function verifyMidtransSignature(req, res, next) {
  const signature = req.headers['x-signature-key'];
  const orderId = req.body.order_id;
  const statusCode = req.body.status_code;
  const grossAmount = req.body.gross_amount;
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!signature) {
    console.error('[WEBHOOK] Missing signature');
    return res.status(401).json({ error: 'Missing signature' });
  }

  const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expectedSignature = crypto.createHash('sha512').update(input).digest('hex');

  if (signature !== expectedSignature) {
    console.error('[WEBHOOK] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('[WEBHOOK] ✅ Signature verified');
  req.signatureValid = true;
  next();
}

module.exports = { verifyMidtransSignature };
EOF

# Buat migration script
cat > migrations/001_add_payment_events.js << 'EOF'
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
  console.log('✅ payment_events table created');
}

up().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
EOF

# Jalankan migration
node migrations/001_add_payment_events.js

# Verify
sqlite3 orders.db ".tables"
```

### Step 2: Update payment-server.js

```bash
# Edit payment-server.js
nano /var/www/api/payment-server.js

# Tambahkan di bagian atas (require section):
const { verifyMidtransSignature } = require('./middleware/webhookSignature');

# Update webhook endpoint:
# Cari baris: app.post('/webhooks/midtrans',
# Tambahkan: verifyMidtransSignature, setelah app.post line

# Contoh:
app.post('/webhooks/midtrans',
  verifyMidtransSignature,  // ← TAMBAHKAN INI
  asyncHandler(async (req, res) => {
    // ... existing code ...
    const { transaction_id } = req.body;

    // Tambahkan idempotency check:
    const existing = await database.get(
      'SELECT processed FROM payment_events WHERE transaction_id = ?',
      [transaction_id]
    );

    if (existing && existing.processed) {
      return res.status(200).json({ message: 'Already processed' });
    }

    // Record event
    await database.run(`
      INSERT INTO payment_events (order_id, transaction_id, signature_valid, raw_payload)
      VALUES (?, ?, ?, ?)
    `, [order_id, transaction_id, req.signatureValid, JSON.stringify(req.body)]);

    // ... rest of code ...

    // Mark as processed
    await database.run(
      'UPDATE payment_events SET processed = TRUE, processed_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
      [transaction_id]
    );
  })
);

# HAPUS atau COMMENT endpoint ini (SECURITY RISK):
# app.put('/admin/orders/:orderId', ...)

# Save: Ctrl+O, Enter, Ctrl+X
```

### Step 3: Restart dan Test

```bash
# Restart PM2
pm2 reload payment-api

# Test webhook security (dari local machine)
curl -X POST https://buatfilm.agentbar.ai/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TEST-SECURE-001","status_code":"200","gross_amount":"99000"}'

# Harus return: 401 Unauthorized ✅

# Check logs
pm2 logs payment-api --lines 20
```

---

## 🗄️ PHASE 2: POSTGRESQL (3 jam, ~5 min downtime)

⚠️ **Schedule di jam sepi!**

### Step 1: Install PostgreSQL

```bash
ssh root@srv941062.hstgr.cloud

# Install
apt update
apt install -y postgresql postgresql-contrib

# Start service
systemctl start postgresql
systemctl enable postgresql

# Verify
psql --version
```

### Step 2: Create Database dan User

```bash
# Generate password
PG_PASSWORD=$(openssl rand -base64 32)
echo "PostgreSQL Password: $PG_PASSWORD"
# SIMPAN PASSWORD INI!

# Create database
sudo -u postgres psql << EOF
CREATE DATABASE buatfilm_production;
CREATE USER buatfilm_user WITH PASSWORD '$PG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE buatfilm_production TO buatfilm_user;
\c buatfilm_production
GRANT ALL ON SCHEMA public TO buatfilm_user;
EOF
```

### Step 3: Create Schema

```bash
# Download schema
cat > /tmp/schema.sql << 'SQLEOF'
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  package_id TEXT NOT NULL DEFAULT 'ai-movie-course',
  package_name TEXT NOT NULL DEFAULT 'Buat Film Pakai AI',
  final_amount INTEGER NOT NULL CHECK(final_amount > 0),
  status TEXT NOT NULL DEFAULT 'CREATED'
    CHECK(status IN ('CREATED', 'PENDING_PAYMENT', 'PAID', 'FAILED', 'EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_events (
  event_id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  raw_payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  channel TEXT NOT NULL CHECK(channel IN ('EMAIL', 'WHATSAPP')),
  template_name TEXT NOT NULL,
  recipient TEXT NOT NULL,
  body_data JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(status IN ('PENDING', 'SENT', 'RETRYING', 'FAILED', 'DLQ')),
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, channel, template_name)
);
SQLEOF

# Create schema
psql -U buatfilm_user -d buatfilm_production -f /tmp/schema.sql
```

### Step 4: Migrate Data

```bash
# Install pg client
npm install pg

# Create migration script
cat > /var/www/api/migrate.js << 'JSEOF'
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const sqliteDb = new sqlite3.Database('./orders.db');
const pgPool = new Pool({
  host: 'localhost',
  database: 'buatfilm_production',
  user: 'buatfilm_user',
  password: process.env.PG_PASSWORD
});

async function migrate() {
  const orders = await new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM orders', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log(`Migrating ${orders.length} orders...`);

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    for (const order of orders) {
      await client.query(`
        INSERT INTO orders (order_id, customer_name, customer_email, customer_phone, final_amount, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (order_id) DO NOTHING
      `, [order.id, order.customerName, order.email, order.phone, order.amount, order.status || 'PENDING_PAYMENT', order.created_at || new Date()]);
    }

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pgPool.end();
    sqliteDb.close();
  }
}

migrate().catch(console.error);
JSEOF

# Run migration
cd /var/www/api
PG_PASSWORD='your-password' node migrate.js
```

### Step 5: Update Application

```bash
# Update .env
cat >> /var/www/api/.env << EOF
DB_TYPE=postgresql
PG_HOST=localhost
PG_DATABASE=buatfilm_production
PG_USER=buatfilm_user
PG_PASSWORD=your-password
EOF

# Restart PM2
pm2 stop payment-api
pm2 start payment-server.js --name payment-api
pm2 save
```

---

## 📊 PHASE 3: OBSERVABILITY (2 jam, NO downtime)

```bash
ssh root@srv941062.hstgr.cloud

# Install dependencies
cd /var/www/api
npm install pino

# Create logger
cat > lib/logger.js << 'EOF'
const pino = require('pino');
module.exports = pino({
  level: 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});
EOF

# Create health routes
cat > routes/health.js << 'EOF'
const express = require('express');
const router = express.Router();
const database = require('../database');

router.get('/health', async (req, res) => {
  const checks = { uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() };
  try {
    await database.raw('SELECT 1');
    checks.database = { status: 'healthy' };
    checks.status = 'healthy';
  } catch (error) {
    checks.database = { status: 'unhealthy', error: error.message };
    checks.status = 'degraded';
  }
  res.status(checks.status === 'healthy' ? 200 : 503).json(checks);
});

router.get('/health/ready', async (req, res) => {
  try {
    await database.raw('SELECT 1');
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

module.exports = router;
EOF

# Update payment-server.js (tambahkan):
# const healthRoutes = require('./routes/health');
# app.use('/', healthRoutes);

# Restart
pm2 reload payment-api

# Test
curl https://buatfilm.agentbar.ai/health
```

---

## 🛡️ PHASE 4: RESILIENCE (3 jam, NO downtime)

```bash
ssh root@srv941062.hstgr.cloud

cd /var/www/api
npm install opossum

# Create circuit breaker
cat > lib/circuitBreaker.js << 'EOF'
const CircuitBreaker = require('opossum');
module.exports = (operation) => {
  const breaker = new CircuitBreaker(operation, {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000
  });
  breaker.on('open', () => console.error('[CB] OPEN'));
  breaker.on('close', () => console.log('[CB] CLOSE'));
  return breaker;
};
EOF

# Note: Notification worker implementation optional
# Can be added later
```

---

## ✅ VERIFICATION

```bash
# Test health
curl https://buatfilm.agentbar.ai/health | jq '.'

# Check PM2
ssh root@srv941062.hstgr.cloud "pm2 status"

# Check database
ssh root@srv941062.hstgr.cloud \
  "psql -U buatfilm_user -d buatfilm_production -c 'SELECT COUNT(*) FROM orders;'"
```

---

## 🆘 ROLLBACK (if needed)

```bash
ssh root@srv941062.hstgr.cloud
pm2 stop all
cd /var/www/api
cp orders.db orders.db.failed
cp /root/backups/buatfilm-ORIGINAL_TIMESTAMP/orders.db .
pm2 start all
```

---

## ✅ CHECKLIST

Setelah selesai:
- [ ] Webhook signature verified (test dari Midtrans dashboard)
- [ ] Orders migrated ke PostgreSQL
- [ ] Health endpoint working
- [ ] Payment flow test end-to-end
- [ ] Notifications sending
- [ ] Logs showing structured output

---

**Need Help?**
Check FAST-TRACK-README.md for detailed info.
