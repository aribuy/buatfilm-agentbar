# Database Migration & Staging Setup Guide

## 📊 Migration Strategy: In-Memory → PostgreSQL

### Current State
- **Storage:** In-Memory (Map)
- **Orders:** Lost on server restart
- **Customers:** Not tracked
- **Analytics:** Impossible

### Target State
- **Storage:** PostgreSQL 14+
- **Persistence:** 100% reliable
- **Multi-tenancy:** SaaS-ready
- **Analytics:** Built-in

---

## 🚀 Phase 1: Database Setup (Today)

### Option A: Supabase (RECOMMENDED - Fastest)
**Why?**
- ✅ Free tier (500MB)
- ✅ Built-in Auth
- ✅ Real-time subscriptions
- ✅ Row Level Security
- ✅ Dashboard UI
- ✅ REST API auto-generated

**Steps:**
```bash
1. Go to https://supabase.com
2. Create project: "ai-movie-course-prod"
3. Get credentials:
   - Database URL
   - Anon Key
   - Service Role Key (secret!)
```

**Import Schema:**
```bash
# In Supabase Dashboard:
# SQL Editor → paste schema.sql → Run
```

### Option B: Self-Hosted PostgreSQL
**For:** Full control, data sovereignty

**Install:**
```bash
# On buatfilm-server
ssh buatfilm-server

# Install PostgreSQL 14
sudo apt update
sudo apt install postgresql-14 postgresql-contrib-14

# Create database & user
sudo -u postgres psql

CREATE DATABASE ai_movie_course_prod;
CREATE USER app_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ai_movie_course_prod TO app_user;
\q

# Import schema
psql -U app_user -d ai_movie_course_prod -f schema.sql
```

---

## 🔧 Phase 2: Update Backend Code

### Install Dependencies
```bash
cd /var/www/api
npm install pg # PostgreSQL client
npm install knex # Query builder (optional)
npm install sequelize # ORM (optional, for complex queries)
```

### Database Connection Pool
```javascript
// db.js (NEW FILE)
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_movie_course_prod',
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err);
});

module.exports = pool;
```

### Update .env
```bash
# Add to /var/www/api/.env
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=ai_movie_course_prod
DB_USER=app_user
DB_PASSWORD=your_secure_password

# Supabase (if using)
DATABASE_URL=postgresql://app_user:password@host:5432/ai_movie_course_prod
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

### Replace In-Memory Storage

**OLD (payment-server.js):**
```javascript
const orders = new Map(); // ❌ In-memory
```

**NEW (with PostgreSQL):**
```javascript
const pool = require('./db');

// Store order
async function storeOrder(orderData) {
  const query = `
    INSERT INTO orders (
      tenant_id, order_id, customer_id, gross_amount, payment_method,
      customer_name, email, phone, payment_url
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    ) RETURNING id
  `;

  const values = [
    orderData.tenantId || getTenantIdFromDomain(),
    orderData.id,
    orderData.customerId,
    orderData.totalAmount,
    orderData.paymentMethod,
    orderData.customerName,
    orderData.email,
    orderData.phone,
    orderData.paymentUrl
  ];

  const result = await pool.query(query, values);
  console.log('[DB] Order stored:', orderData.id, 'DB ID:', result.rows[0].id);
  return result.rows[0];
}

// Get order
async function getOrder(orderId) {
  const query = 'SELECT * FROM orders WHERE order_id = $1';
  const result = await pool.query(query, [orderId]);
  return result.rows[0] || null;
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
  const query = `
    UPDATE orders
    SET payment_status = $1,
        paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END,
        updated_at = NOW()
    WHERE order_id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [newStatus, orderId]);
  console.log('[DB] Order updated:', orderId, 'Status:', newStatus);
  return result.rows[0];
}
```

---

## 🌍 Phase 3: Staging Environment Setup

### Infrastructure Strategy

```
Production (buatfilm.agentbar.ai)
├── Database: Supabase West (Singapore)
├── Backend: VPS - DigitalOcean/Upcloud
└── Frontend: VPS - Same as backend (nginx)

Staging (staging.buatfilm.agentbar.ai) ⭐ NEW
├── Database: Supabase East (Same project, different schema)
├── Backend: Same VPS, different port (3003)
├── Frontend: Same VPS, different nginx root
└── Subdomain: staging.buatfilm.agentbar.ai

Development (local)
├── Database: Docker PostgreSQL
├── Backend: Node locally (npm run dev)
└── Frontend: Vite dev server (npm run dev)
```

### Staging Server Setup

#### 1. DNS Configuration
```bash
# Add DNS A record:
staging.buatfilm.agentbar.ai → [Same IP as production]
```

#### 2. Nginx Configuration
```bash
# /etc/nginx/sites-available/staging.buatfilm.agentbar.ai
server {
    server_name staging.buatfilm.agentbar.ai;

    # Frontend
    root /var/www/buatfilm/frontend-staging/dist;
    index index.html;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3003; # Different port!
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Midtrans Webhooks (Staging)
    location /webhooks/ {
        proxy_pass http://localhost:3003;
    }

    # SSL (Let's Encrypt)
    listen 443 ssl;
    ssl_certificate /etc/ssl/certs/staging-buatfilm.crt;
    ssl_certificate_key /etc/ssl/private/staging-buatfilm.key;
}

# HTTP to HTTPS redirect
server {
    server_name staging.buatfilm.agentbar.ai;
    return 301 https://$server_name$request_uri;
}
```

#### 3. PM2 Configuration (Ecosystem)
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'payment-api-prod',
      script: './payment-server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        DB_NAME: 'ai_movie_course_prod',
        MIDTRANS_ENV: 'production'
      }
    },
    {
      name: 'payment-api-staging',
      script: './payment-server.js',
      env: {
        NODE_ENV: 'staging',
        PORT: 3003,
        DB_NAME: 'ai_movie_course_staging', # Different DB!
        MIDTRANS_ENV: 'sandbox'
      }
    }
  ]
};
```

```bash
# Deploy
pm2 start ecosystem.config.js
pm2 save
```

#### 4. Database: Staging Schema
```sql
-- In Supabase, create separate staging schema
CREATE SCHEMA staging;

-- Clone tables to staging schema
-- (Or use same schema with tenant_id = 'staging-tenant')
```

---

## 🧪 Phase 4: Testing & Migration

### Migration Script (Zero-Downtime)
```bash
#!/bin/bash
# migrate-to-db.sh

echo "🔄 Starting migration to PostgreSQL..."

# 1. Backup current in-memory orders
echo "📦 Exporting in-memory orders..."
curl -s http://localhost:3002/orders/export > orders-backup-$(date +%Y%m%d).json

# 2. Deploy new DB-based code
echo "🚀 Deploying new code..."
pm2 restart payment-api

# 3. Import backup to DB
echo "📥 Importing to PostgreSQL..."
node scripts/import-orders-to-db.js orders-backup-*.json

# 4. Verify
echo "✅ Verifying migration..."
node scripts/verify-migration.js

echo "🎉 Migration complete!"
```

### Testing Checklist

**Production:**
- [ ] Create test order
- [ ] Verify stored in DB
- [ ] Complete payment via simulator
- [ ] Check webhook logged to DB
- [ ] Verify email sent (check notification_logs table)
- [ ] Check Thank You page loads

**Staging:**
- [ ] Access staging.buatfilm.agentbar.ai
- [ ] Test full payment flow
- [ ] Verify staging DB isolated from prod
- [ ] Test deployment process

---

## 📋 Phase 5: Monitoring & Operations

### Health Check Endpoint
```javascript
// Add to payment-server.js
app.get('/health', async (req, res) => {
  const dbCheck = await pool.query('SELECT NOW()');

  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV,
    database: dbCheck ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```

### Database Backup Strategy

**Supabase Auto-Backup:**
- ✅ Enabled by default
- ✅ Daily backups retained 7 days
- ✅ Point-in-time recovery (30 days)

**Manual Backup:**
```bash
# Export schema + data
pg_dump -U app_user ai_movie_course_prod > backup-$(date +%Y%m%d).sql

# Upload to S3/Glacier (long-term)
aws s3 cp backup-*.sql s3://buatfilm-backups/db/
```

---

## 🎯 Next Steps After Database Migration

### Week 1: Admin Dashboard MVP
1. Build login page (admin.buatfilm.agentbar.ai)
2. Orders list page
3. Order detail page
4. Settings page (Midtrans keys, email config)

### Week 2: Analytics
1. Revenue dashboard (charts)
2. Payment method breakdown
3. Conversion funnel
4. Real-time order feed

### Week 3: SaaS Multi-Tenancy
1. Tenant provisioning (onboarding flow)
2. Per-tenant branding (logo, colors)
3. Tenant isolation (RLS enforcement)
4. Usage-based billing (plan limits)

### Week 4: Advanced Features
1. Automated reconciliation
2. Settlement tracking
3. Fraud detection
4. Customer portal

---

## 💰 Cost Estimates (Monthly)

### Production
- Supabase Pro: $25/month (10GB DB, 50GB bandwidth)
- VPS (Current): Already paid
- Domain: Already paid
- **Total: $25/month** ← Cheaper than you think!

### Staging (Shared Infrastructure)
- Supabase: Same project, no extra cost
- VPS: Same server, different port
- Domain: Free subdomain
- **Total: $0/month** ← Practically free!

### Development
- Supabase: Same project
- Local: Free
- **Total: $0/month**

---

## ⚠️ Critical Decisions Needed

1. **Database Provider?**
   - Supabase (recommended - fastest)
   - Self-hosted PostgreSQL
   - AWS RDS (overkill for now)

2. **Admin Framework?**
   - Build from scratch (React + Chakra UI)
   - Use admin panel framework:
     - [Refine](https://refine.dev/) - React-based, very fast
     - [AdminJS](https://adminjs.co/) - Node-based, auto-generates UI
     - [ToolJet](https://tooljet.com/) - Open source Retool alternative

3. **Authentication?**
   - Supabase Auth (easiest)
   - Clerk (great UX)
   - Auth0 (expensive)
   - Build own (complex)

4. **Timeline?**
   - Phase 1 (DB Setup): Can do TODAY
   - Phase 2 (Backend Migration): 1-2 days
   - Phase 3 (Staging): 1 day
   - Phase 4 (Admin MVP): 3-5 days
   - Phase 5 (SaaS features): 2-3 weeks

---

## 🚦 Go/No-Go Decision

**Should we proceed with database migration NOW?**

**YES, if:**
- ✅ You want SaaS-ready foundation
- ✅ You need reliable order tracking
- ✅ You want analytics & reporting
- ✅ You plan to scale to 100+ orders/day

**WAIT, if:**
- ❌ You're still validating product-market fit
- ❌ You have < 10 orders/day currently
- ❌ Budget is <$25/month

**My Recommendation:**
**Start migration NOW.** Here's why:
1. In-memory is a ticking time bomb
2. Supabase free tier = $0 cost
3. Foundation for SaaS = high ROI
4. Takes only 1-2 days to complete

**Shall I proceed with:**
1. ✅ Setting up Supabase database
2. ✅ Migrating backend code
3. ✅ Creating staging environment
4. ✅ Building admin dashboard MVP

Let me know and I'll start immediately! 🚀
