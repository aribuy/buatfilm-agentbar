# Supabase Setup Guide for Multi-Tenant Platform

This guide walks you through setting up Supabase PostgreSQL database for the AgentBar Funnel Platform.

---

## 📋 Prerequisites

- Supabase account (free tier is sufficient for testing)
- Basic understanding of SQL database concepts

---

## 🚀 Step 1: Create Supabase Projects

### Create Production Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `agentbar-funnel-prod`
   - **Database Password**: [Generate strong password - SAVE THIS!]
   - **Region**: Singapore (closest to Indonesia)
4. Click **"Create new project**
5. Wait for provisioning (~2 minutes)

### Create Staging Project

Repeat steps above with:
   - **Name**: `agentbar-funnel-staging`
   - **Database Password**: [Different strong password]
   - **Region**: Singapore

---

## 📊 Step 2: Import Database Schema

### For Production Project:

1. Open **SQL Editor** in Supabase dashboard
2. Click **"New Query"**
3. Copy entire contents of `database/schema.sql`
4. Paste into SQL Editor
5. Click **"Run"** (or press `Cmd+Enter`)
6. Verify all tables created successfully

### For Staging Project:

Repeat the same process.

---

## ✅ Step 3: Verify Tables

Run this query to verify all tables created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output:
```
table_name
------------------
admin_users
audit_logs
customers
notifications
notification_rules
notification_templates
orders
settlements
settings
tenants
webhook_events
```

---

## 🔐 Step 4: Get Database Connection Info

### From Supabase Dashboard:

1. Go to **Settings** → **Database**
2. Copy the following information:

**For Production:**
- **Host**: `db.xxx.supabase.co`
- **Database name**: `postgres`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: [The password you set in Step 1]

**For Staging:**
- Same as above, but for staging project

---

## 📝 Step 5: Insert BuatFilm Tenant

### For Production Project:

Run this SQL in **SQL Editor**:

```sql
-- Insert BuatFilm as pilot tenant
INSERT INTO tenants (
    name,
    slug,
    plan,
    status,
    midtrans_environment,
    midtrans_server_key,
    midtrans_client_key,
    midtrans_merchant_id,
    email_from,
    email_reply_to,
    whatsapp_enabled,
    max_orders_per_month,
    max_admin_users,
    primary_color
) VALUES (
    'BuatFilm AI Course',
    'buatfilm',
    'pro',
    'active',
    'sandbox', -- Change to 'production' when ready
    'SB-Mid-server-XXXXX', -- Replace with actual Midtrans Sandbox key
    'SB-Mid-client-XXXXX', -- Replace with actual Midtrans Sandbox key
    'buatfilm-merchant',
    'buatfilm@agentbar.ai',
    'buatfilm-support@agentbar.ai',
    false, -- WhatsApp not yet enabled
    1000, -- Pro tier: 1000 orders/month
    5,    -- Pro tier: 5 admin users
    '#4F46E5' -- Purple color
);

-- Verify tenant creation
SELECT * FROM tenants WHERE slug = 'buatfilm';
```

### For Staging Project:

Run the same SQL (use sandbox Midtrans keys).

---

## 🔧 Step 6: Update Backend Environment Variables

### Create `.env.production` file:

```bash
# Database Type
DB_TYPE=postgresql

# PostgreSQL Connection (Production)
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-production-db-password

# Application
NODE_ENV=production
PORT=3002

# Default tenant
DEFAULT_TENANT_SLUG=buatfilm

# Security
ADMIN_PASSWORD=your-secure-admin-password
```

### Create `.env.staging` file:

```bash
# Database Type
DB_TYPE=postgresql

# PostgreSQL Connection (Staging)
DB_HOST=db.yyy.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-staging-db-password

# Application
NODE_ENV=staging
PORT=3003

# Default tenant
DEFAULT_TENANT_SLUG=buatfilm

# Security
ADMIN_PASSWORD=staging-admin-password
```

---

## 🧪 Step 7: Test Database Connection

### From Backend Directory:

```bash
# Install dependencies (if not already installed)
npm install pg

# Test connection with production
export $(cat .env.production | xargs)
node -e "
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
  pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error('Connection failed:', err.message);
    else console.log('✅ Database connected:', res.rows[0].now);
    pool.end();
  });
"
```

---

## 🎯 Step 8: Test Tenant Resolution

```bash
# Start the new payment server v2
export $(cat .env.production | xargs)
node backend/payment-server-v2.js
```

In another terminal:

```bash
# Test health check
curl http://localhost:3002/health

# Test with tenant header (simulating nginx)
curl -H "X-Tenant-Slug: buatfilm" http://localhost:3002/health

# Expected response:
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "postgres",
  "tenant": "buatfilm"
}
```

---

## 📱 Step 9: Test Payment Flow (End-to-End)

### 1. Start the v2 server:

```bash
export $(cat .env.production | xargs)
node backend/payment-server-v2.js
```

### 2. Create test payment:

```bash
curl -X POST http://localhost:3002/payment/create \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: buatfilm" \
  -d '{
    "orderId": "TEST-' + $(date +%s) + '",
    "amount": 99000,
    "email": "test@example.com",
    "phone": "081234567890",
    "name": "Test Customer",
    "paymentMethod": "midtrans"
  }'
```

### 3. Verify in Supabase:

Go to Supabase Dashboard → Table Editor → `orders` → Check new order exists.

---

## ✅ Step 10: Verification Checklist

- [ ] Supabase projects created (production + staging)
- [ ] Schema imported successfully
- [ ] All tables visible (12 tables)
- [ ] BuatFilm tenant inserted
- [ ] Backend `.env` files configured
- [ ] Database connection test successful
- [ ] Health check endpoint works
- [ ] Tenant resolution works (with header)
- [ ] Payment creation works
- [ ] Order stored in database with `tenant_id`
- [ ] Webhook receives Midtrans notification
- [ ] Order status updates to `paid`

---

## 🚨 Common Issues

### Issue 1: Connection Refused

**Error**: `Connection refused` or `ECONNREFUSED`

**Solution**:
1. Check Supabase project is active
2. Verify `DB_HOST` is correct (from dashboard)
3. Check password matches
4. Ensure database is not paused (free tier pauses after 1 week inactivity)

### Issue 2: Tenant Not Found

**Error**: `Tenant not found: buatfilm`

**Solution**:
1. Verify tenant was inserted: `SELECT * FROM tenants WHERE slug = 'buatfilm';`
2. Check tenant status is `'active'`
3. Check `X-Tenant-Slug` header is correct

### Issue 3: Permission Denied

**Error**: `permission denied for table orders`

**Solution**:
1. Check RLS policies are not blocking
2. Ensure you're using correct database user
3. Try: `ALTER TABLE orders DISABLE ROW LEVEL SECURITY;` (for testing only)

---

## 🎉 Success!

If all tests pass, you're ready to deploy!

**Next Steps:**
1. Deploy to staging server first
2. Run full payment flow test
3. Monitor logs and database
4. Deploy to production
5. Monitor first real orders

---

## 📚 Useful SQL Queries

### Check all orders for tenant:
```sql
SELECT * FROM orders WHERE tenant_id = (
  SELECT id FROM tenants WHERE slug = 'buatfilm'
);
```

### Check tenant statistics:
```sql
SELECT
  payment_status,
  COUNT(*) as count,
  SUM(gross_amount) as total
FROM orders
WHERE tenant_id = (
  SELECT id FROM tenants WHERE slug = 'buatfilm'
)
GROUP BY payment_status;
```

### Recent webhook events:
```sql
SELECT * FROM webhook_events
WHERE tenant_id = (
  SELECT id FROM tenants WHERE slug = 'buatfilm'
)
ORDER BY received_at DESC
LIMIT 10;
```

---

**Setup complete! Your multi-tenant SaaS platform is now database-ready!** 🚀
