# Troubleshooting Log
# Payment API Deployment & Issues

## Date: 2026-01-07
## Project: AI Movie Course Payment System
## Server: srv941062.hstgr.cloud

---

## Issue #1: Database Configuration Error

**Time**: Phase 3 - Observability Deployment
**Error**: `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`

### Symptoms
- Health check returned: `status: "degraded"`
- Database status: `"unhealthy"` with password error
- PM2 instances restarting repeatedly

### Root Cause
The `.env` file contained `DB_*` variables but the PostgreSQL module (`database-postgres.js`) expected `PG_*` variables:
- **Expected**: `PG_HOST`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`
- **Actual**: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

### Solution
```bash
# Added to /var/www/api/.env:
PG_HOST=localhost
PG_DATABASE=ai_movie_course
PG_USER=api_user
PG_PASSWORD=BuatFilm2025!Secure
```

### Verification
```bash
curl https://buatfilm.agentbar.ai/health
# Response: {"status":"healthy","database":{"status":"healthy"}}
```

**Status**: ✅ RESOLVED

---

## Issue #2: Notification Worker Database Connection

**Time**: Phase 4 - Resilience Deployment
**Error**: `password authentication failed for user "api_user"`

### Symptoms
- Notification-worker continuously failing to connect
- PM2 logs showing authentication errors
- Worker process restarting every 10 seconds

### Root Cause
1. Worker file missing `require('dotenv').config()` at the top
2. PM2 ecosystem config didn't include environment variables
3. Worker couldn't load database credentials from `.env`

### Solution

**Step 1**: Added dotenv to worker
```javascript
// backend/workers/notification-worker.js
require('dotenv').config(); // Added this line
const database = require('../database');
```

**Step 2**: Created dedicated ecosystem config
```javascript
// backend/ecosystem.worker.config.js
module.exports = {
  apps: [{
    name: 'notification-worker',
    script: './workers/notification-worker.js',
    env: {
      NODE_ENV: 'production',
      PG_HOST: 'localhost',
      PG_DATABASE: 'ai_movie_course',
      PG_USER: 'api_user',
      PG_PASSWORD: 'BuatFilm2025!Secure'
    }
  }]
};
```

**Step 3**: Restarted with new config
```bash
pm2 delete notification-worker
pm2 start ecosystem.worker.config.js
```

### Verification
```bash
pm2 logs notification-worker --lines 20
# No errors, worker polling successfully
```

**Status**: ✅ RESOLVED

---

## Issue #3: Order Creation Failure

**Time**: Production Testing
**Error**: `column "customer_name" of relation "orders" does not exist`

### Symptoms
- Frontend error: "Terjadi kesalahan saat membuat pesanan. Silakan coba lagi."
- Payment API returning 500 errors
- Orders not being created

### Root Cause
**Table Structure Mismatch**

The existing `orders` table in PostgreSQL had a completely different schema:
```sql
-- Existing structure (multi-tenant system)
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  customer_id UUID,
  order_id VARCHAR(100),
  gross_amount NUMERIC(15,2),
  -- ... many other columns
);
```

But the payment API code expected:
```sql
-- Expected structure (simple payment table)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
);
```

### Solution

**Step 1**: Created separate table for payment API
```sql
CREATE TABLE payment_orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_url TEXT,
  token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_orders_email ON payment_orders(email);
CREATE INDEX idx_payment_orders_status ON payment_orders(status);
CREATE INDEX idx_payment_orders_created_at ON payment_orders(created_at DESC);
```

**Step 2**: Updated database queries
```javascript
// backend/database-postgres.js
createOrder: async (orderData) => {
  const { id, customerName, email, phone, amount, paymentMethod, paymentUrl, token } = orderData;
  await pool.query(
    `INSERT INTO payment_orders (id, customer_name, email, phone, amount, payment_method, payment_url, token)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, customerName, email, phone, amount, paymentMethod, paymentUrl || null, token || null]
  );
  return { id, ...orderData };
}

getOrder: async (orderId) => {
  const res = await pool.query('SELECT * FROM payment_orders WHERE id = $1', [orderId]);
  return res.rows[0];
}

updateOrderStatus: async (orderId, status) => {
  await pool.query(
    'UPDATE payment_orders SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, orderId]
  );
}

getAllOrders: async () => {
  const res = await pool.query('SELECT * FROM payment_orders ORDER BY created_at DESC');
  return res.rows;
}
```

**Step 3**: Deployed and restarted
```bash
scp database.js root@srv941062.hstgr.cloud:/var/www/api/
pm2 restart payment-api
```

### Verification
```bash
curl -X POST https://buatfilm.agentbar.ai/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-123",
    "amount": 99000,
    "email": "test@example.com",
    "phone": "6281234567890",
    "name": "Test User"
  }'

# Response:
{
  "success": true,
  "paymentUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/...",
  "token": "..."
}
```

**Status**: ✅ RESOLVED

---

## Summary of Changes

### Files Modified
1. `/var/www/api/.env` - Added PG_* environment variables
2. `/var/www/api/database.js` - Updated to use `payment_orders` table
3. `/var/www/api/workers/notification-worker.js` - Added dotenv.config()
4. `/var/www/api/ecosystem.worker.config.js` - Created with env vars

### Database Tables Created
1. `payment_orders` - Main payment orders table
2. `notification_outbox` - Async notification processing
3. Indexes for performance optimization

### PM2 Processes Running
- **payment-api** (2 instances, cluster mode) - Port 3002
- **notification-worker** (1 instance) - Background processing

---

## Current System Status

### Health Check
```json
{
  "status": "healthy",
  "database": {
    "status": "healthy",
    "message": "Connection OK"
  },
  "uptime": 329
}
```

### Services
- ✅ Payment API: Online
- ✅ Database: Connected (PostgreSQL)
- ✅ Notification Worker: Running
- ✅ Circuit Breaker: Active
- ✅ Health Monitors: Operational

### API Endpoints
- **Health**: https://buatfilm.agentbar.ai/health
- **Create Payment**: POST https://buatfilm.agentbar.ai/payment/create
- **Admin Login**: POST https://buatfilm.agentbar.ai/admin/login
- **Get Orders**: GET https://buatfilm.agentbar.ai/admin/orders (requires JWT)

---

## Lessons Learned

1. **Environment Variable Naming**: Always match the expected variable names between configuration and code
2. **Table Structure**: Don't assume table structure - verify before deployment
3. **Isolation**: Use separate tables for different systems to avoid conflicts
4. **dotenv in Workers**: Always include `require('dotenv').config()` in worker files
5. **PM2 Ecosystem**: Use ecosystem.config.js to explicitly set environment variables
6. **Testing**: Test API endpoints immediately after deployment to catch issues early

---

## Quick Reference Commands

### Check Logs
```bash
ssh root@srv941062.hstgr.cloud
pm2 logs payment-api --lines 50
pm2 logs notification-worker --lines 50
```

### Restart Services
```bash
pm2 restart payment-api
pm2 restart notification-worker
pm2 restart all
```

### Database Queries
```bash
export PGPASSWORD='BuatFilm2025!Secure'
psql -h localhost -U api_user -d ai_movie_course

# View recent orders
SELECT * FROM payment_orders ORDER BY created_at DESC LIMIT 10;

# Check notifications
SELECT * FROM notification_outbox ORDER BY created_at DESC LIMIT 10;
```

### Health Check
```bash
curl https://buatfilm.agentbar.ai/health
curl https://buatfilm.agentbar.ai/health/ready
curl https://buatfilm.agentbar.ai/health/live
```

---

**Last Updated**: 2026-01-07 00:56 UTC
**System Status**: All operational ✅
