# Migrate BuatFilm to Tenant System

This guide explains how to migrate the existing BuatFilm payment system to become the first tenant in the AgentBar Funnel Platform.

---

## 🎯 Migration Goal

**From:**
```
buatfilm.agentbar.ai (monolithic application)
├── Hardcoded Midtrans credentials
├── In-memory order storage
└── Single-product focus
```

**To:**
```
buatfilm.agentbar.ai (tenant)
├── Config stored in database (tenant_settings)
├── PostgreSQL order storage
├── tenant_id in all data
└── One of many tenants in platform
```

---

## 📋 Migration Steps

### **Phase 1: Database Setup (Day 1)**

#### 1.1 Create Supabase Projects

```bash
# Create 2 separate projects (for isolation)

Project 1: AgentBar Funnel Staging
- Database: agentbar_funnel_staging
- Region: Singapore
- URL: https://xxxxxxxxxxxxx.supabase.co

Project 2: AgentBar Funnel Production
- Database: agentbar_funnel_prod
- Region: Singapore
- URL: https://yyyyyyyyyyyyyy.supabase.co
```

#### 1.2 Import Schema

```bash
# In Supabase SQL Editor:
# 1. Select project: AgentBar Funnel Staging
# 2. Open SQL Editor
# 3. Paste entire schema.sql
# 4. Click "Run"

# Repeat for production project
```

#### 1.3 Verify Tables

```sql
-- Check if tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected output:
-- admin_users
-- audit_logs
-- customers
-- notification_templates
-- notification_rules
-- notifications
-- orders
-- settlements
-- tenants
-- tenant_domains
-- tenant_settings
-- webhook_events
```

---

### **Phase 2: Insert BuatFilm as Tenant (Day 1)**

#### 2.1 Create BuatFilm Tenant Record

```sql
-- Insert BuatFilm as the pilot tenant
INSERT INTO tenants (
    name,
    slug,
    subdomain,
    primary_domain,
    status,
    plan,
    midtrans_merchant_id,
    midtrans_environment,
    email_from,
    email_reply_to,
    whatsapp_enabled,
    max_orders_per_month,
    max_admin_users,
    logo_url,
    primary_color
) VALUES (
    'BuatFilm AI Course',
    'buatfilm',
    'buatfilm',
    'buatfilm.agentbar.ai',
    'active',
    'pilot',
    'buatfilm-merchant',
    'sandbox', -- Change to 'production' when ready
    'buatfilm@agentbar.ai',
    'buatfilm-support@agentbar.ai',
    false, -- WhatsApp not yet enabled
    1000, -- Pilot tier: 1000 orders/month
    3,    -- Pilot tier: 3 admin users
    NULL,  -- Will be uploaded later
    '#4F46E5' -- Purple color
);

-- Verify tenant creation
SELECT * FROM tenants WHERE slug = 'buatfilm';
```

#### 2.2 Insert BuatFilm Tenant Settings

```sql
-- Get tenant_id first
SELECT id INTO @buatfilm_tenant_id FROM tenants WHERE slug = 'buatfilm';

-- Insert Midtrans configuration
INSERT INTO tenant_settings (tenant_id, key, value, value_type, category, is_encrypted)
VALUES
    (@buatfilm_tenant_id, 'midtrans.server_key', 'SB-Mid-server-XXXXX', 'string', 'payment', true),
    (@buatfilm_tenant_id, 'midtrans.client_key', 'SB-Mid-client-XXXXX', 'string', 'payment', false),
    (@buatfilm_tenant_id, 'midtrans.environment', 'sandbox', 'string', 'payment', false);

-- Insert Email configuration
INSERT INTO tenant_settings (tenant_id, key, value, value_type, category, is_encrypted)
VALUES
    (@buatfilm_tenant_id, 'email.host', 'smtp.gmail.com', 'string', 'email', false),
    (@buatfilm_tenant_id, 'email.port', '587', 'number', 'email', false),
    (@buatfilm_tenant_id, 'email.from', 'buatfilm@agentbar.ai', 'string', 'email', false),
    (@buatfilm_tenant_id, 'email.reply_to', 'buatfilm-support@agentbar.ai', 'string', 'email', false);

-- Insert WhatsApp configuration (future)
INSERT INTO tenant_settings (tenant_id, key, value, value_type, category, is_encrypted)
VALUES
    (@buatfilm_tenant_id, 'whatsapp.enabled', 'false', 'boolean', 'whatsapp', false),
    (@buatfilm_tenant_id, 'whatsapp.sender', '+6281234567890', 'string', 'whatsapp', false);

-- Verify settings
SELECT * FROM tenant_settings WHERE tenant_id = @buatfilm_tenant_id;
```

---

### **Phase 3: Backend Migration (Day 2-3)**

#### 3.1 Create Database Connection Module

```javascript
// backend/db.js (NEW FILE)
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log(`✅ Database connected: ${process.env.DB_NAME}`);
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err);
});

module.exports = pool;
```

#### 3.2 Create Tenant Settings Service

```javascript
// backend/services/tenantSettings.js (NEW FILE)
const pool = require('../db');

/**
 * Get tenant setting value
 * @param {string} tenantSlug - Tenant slug (e.g., 'buatfilm')
 * @param {string} key - Setting key (e.g., 'midtrans.server_key')
 * @returns {Promise<string>} Setting value
 */
async function getTenantSetting(tenantSlug, key) {
  const query = `
    SELECT ts.value
    FROM tenant_settings ts
    JOIN tenants t ON t.id = ts.tenant_id
    WHERE t.slug = $1 AND ts.key = $2
  `;

  const result = await pool.query(query, [tenantSlug, key]);

  if (result.rows.length === 0) {
    throw new Error(`Setting not found: ${tenantSlug}.${key}`);
  }

  return result.rows[0].value;
}

/**
 * Get all tenant settings (cached)
 * @param {string} tenantSlug - Tenant slug
 * @returns {Promise<Object>} All settings as key-value pairs
 */
async function getTenantSettings(tenantSlug) {
  const query = `
    SELECT ts.key, ts.value, ts.value_type
    FROM tenant_settings ts
    JOIN tenants t ON t.id = ts.tenant_id
    WHERE t.slug = $1
  `;

  const result = await pool.query(query, [tenantSlug]);

  // Convert to object
  const settings = {};
  result.rows.forEach(row => {
    settings[row.key] = row.value;
  });

  return settings;
}

module.exports = {
  getTenantSetting,
  getTenantSettings
};
```

#### 3.3 Update Payment Server to Use Tenant Settings

```javascript
// backend/payment-server.js (MODIFY EXISTING)

const pool = require('./db');
const { getTenantSetting } = require('./services/tenantSettings');

// Remove hardcoded Midtrans config
// OLD:
// const snap = new midtransClient.Snap({
//   isProduction: false,
//   serverKey: process.env.MIDTRANS_SERVER_KEY,
//   clientKey: process.env.MIDTRANS_CLIENT_KEY
// });

// Create tenant-specific Snap instance
async function createMidtransSnap(tenantSlug) {
  const serverKey = await getTenantSetting(tenantSlug, 'midtrans.server_key');
  const clientKey = await getTenantSetting(tenantSlug, 'midtrans.client_key');
  const environment = await getTenantSetting(tenantSlug, 'midtrans.environment');

  return new midtransClient.Snap({
    isProduction: environment === 'production',
    serverKey: serverKey,
    clientKey: clientKey
  });
}

// Update payment creation endpoint
app.post('/payment/create', async (req, res) => {
  try {
    // Extract tenant from request (from middleware)
    const tenantSlug = req.tenant.slug; // 'buatfilm'

    const { orderId, amount, email, phone, name, paymentMethod } = req.body;

    // Get tenant-specific Midtrans config
    const snap = await createMidtransSnap(tenantSlug);

    // Create transaction with tenant config
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: name,
        email: email,
        phone: phone
      },
      enabled_payments: enabledPayments,
      finish_redirect_url: `https://${tenantSlug}.agentbar.ai/thank-you?order_id=${orderId}`
    });

    // Store order with tenant_id
    const order = await pool.query(
      `INSERT INTO orders (
        tenant_id, order_id, customer_name, email, phone,
        gross_amount, payment_method, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [req.tenantId, orderId, name, email, phone, amount, paymentMethod]
    );

    console.log(`[${tenantSlug}] Order created: ${orderId}`);

    res.json({
      success: true,
      redirectUrl: transaction.redirect_url,
      token: transaction.token
    });
  } catch (error) {
    console.error(`[${tenantSlug}] Payment error:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

---

### **Phase 4: Tenant Resolution Middleware (Day 3)**

#### 4.1 Create Tenant Middleware

```javascript
// backend/middleware/tenantResolver.js (NEW FILE)
const pool = require('../db');

/**
 * Resolve tenant from request
 * Priority:
 * 1. X-Tenant-Slug header (from nginx)
 * 2. Subdomain extraction from Host header
 * 3. Query parameter (testing fallback)
 */
async function resolveTenant(req, res, next) {
  try {
    let tenantSlug = null;

    // Method 1: From nginx header (most reliable)
    if (req.headers['x-tenant-slug']) {
      tenantSlug = req.headers['x-tenant-slug'];
      console.log(`[TENANT] Resolved from header: ${tenantSlug}`);
    }
    // Method 2: Extract from subdomain
    else if (req.headers.host) {
      const host = req.headers.host; // buatfilm.agentbar.ai
      const subdomain = host.split('.')[0]; // buatfilm

      // Skip platform domains
      if (!['funnel', 'funnelstaging', 'www', 'admin'].includes(subdomain)) {
        tenantSlug = subdomain;
        console.log(`[TENANT] Resolved from subdomain: ${tenantSlug}`);
      }
    }
    // Method 3: Query parameter (testing only)
    else if (req.query.tenant) {
      tenantSlug = req.query.tenant;
      console.log(`[TENANT] Resolved from query: ${tenantSlug}`);
    }

    // If no tenant found, return 404
    if (!tenantSlug) {
      return res.status(404).json({
        error: 'Tenant not found',
        message: 'Please provide a valid tenant subdomain'
      });
    }

    // Query database for tenant
    const result = await pool.query(
      'SELECT * FROM tenants WHERE slug = $1 AND status = $2',
      [tenantSlug, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tenant not found',
        message: `Tenant "${tenantSlug}" does not exist or is inactive`
      });
    }

    const tenant = result.rows[0];

    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;

    // Log tenant context
    console.log(`[TENANT] Loaded: ${tenant.name} (${tenant.slug})`);
    console.log(`[TENANT] Plan: ${tenant.plan}`);

    next();
  } catch (error) {
    console.error('[TENANT] Resolution error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resolve tenant'
    });
  }
}

module.exports = resolveTenant;
```

#### 4.2 Apply Middleware to Routes

```javascript
// backend/payment-server.js (MODIFY)

const resolveTenant = require('./middleware/tenantResolver');

// Apply to all payment routes
app.use('/payment', resolveTenant);

// Apply to webhook routes
app.use('/webhooks', resolveTenant);
```

---

### **Phase 5: Migrate Existing Orders (Day 4)**

#### 5.1 Export Existing Orders

```bash
# If you have in-memory orders, export them first
# Or create from backend logs

# Example: Export from payment logs
grep "Order created:" /root/.pm2/logs/payment-api-out.log > orders.txt
```

#### 5.2 Import Orders to Database

```sql
-- Get BuatFilm tenant_id
SELECT id INTO @buatfilm_tenant_id FROM tenants WHERE slug = 'buatfilm';

-- Import orders (example)
-- Adjust based on your actual data
INSERT INTO orders (
    tenant_id,
    order_id,
    customer_name,
    email,
    phone,
    gross_amount,
    payment_method,
    payment_status,
    created_at
)
VALUES
    (@buatfilm_tenant_id, 'ORDER-001', 'Test Customer', 'test@email.com', '081234567890', 99000, 'bca', 'paid', NOW());

-- Repeat for all existing orders
```

---

### **Phase 6: Frontend Updates (Day 4-5)**

#### 6.1 Update Frontend Environment

```typescript
// frontend/.env.staging
VITE_API_URL=https://funnelstaging.agentbar.ai/api
VITE_ENV=staging
VITE_TENANT_SLUG=buatfilm

// frontend/.env.production
VITE_API_URL=https://buatfilm.agentbar.ai/api
VITE_ENV=production
VITE_TENANT_SLUG=buatfilm
```

#### 6.2 Build & Deploy

```bash
# Build staging
cd frontend
npm run build
scp -r dist/* buatfilm-server:/var/www/buatfilm/frontend/dist/

# Build production
npm run build
scp -r dist/* buatfilm-server:/var/www/buatfilm/frontend/dist/
```

---

### **Phase 7: Testing (Day 5)**

#### 7.1 Test Tenant Resolution

```bash
# Test API
curl -H "X-Tenant-Slug: buatfilm" https://buatfilm.agentbar.ai/health

# Expected response:
{
  "status": "healthy",
  "tenant": "buatfilm",
  "environment": "production"
}
```

#### 7.2 Test Payment Flow

1. Visit https://buatfilm.agentbar.ai
2. Fill form and click "Bayar Sekarang"
3. Complete payment via Midtrans Sandbox
4. Verify order stored in database
5. Verify webhook received

#### 7.3 Verify Database

```sql
-- Check orders
SELECT * FROM orders WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'buatfilm');

-- Check webhook events
SELECT * FROM webhook_events WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'buatfilm');

-- Check notifications
SELECT * FROM notifications WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'buatfilm');
```

---

### **Phase 8: Go-Live (Day 6+)**

#### 8.1 Switch to Production Midtrans

```sql
-- Update tenant settings to use production
UPDATE tenant_settings
SET value = 'production'
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'buatfilm')
  AND key = 'midtrans.environment';

-- Update Midtrans keys (FROM SANDBOX TO PRODUCTION!)
UPDATE tenant_settings
SET value = 'Mid-production-server-key'
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'buatfilm')
  AND key = 'midtrans.server_key';
```

#### 8.2 Monitor First Real Orders

```bash
# Watch logs
ssh buatfilm-server "pm2 logs payment-api --lines 100 -f"

# Monitor database
# In Supabase dashboard: Table Editor → orders
```

#### 8.8 Verify End-to-End Flow

- [ ] Order created → stored in database
- [ ] Payment completed → Midtrans sends webhook
- [ ] Webhook received → order status updated to PAID
- [ ] Email sent → customer receives access email
- [ ] WhatsApp sent (if enabled)
- [ ] Redirect to Thank You page → links visible

---

## ✅ Migration Checklist

### **Database**
- [ ] Supabase projects created (staging + production)
- [ ] Schema imported
- [ ] Tables verified
- [ ] BuatFilm tenant inserted
- [ ] Tenant settings configured

### **Backend**
- [ ] db.js created
- [ ] tenantSettings.js created
- [ ] tenantResolver.js created
- [ ] payment-server.js updated
- [ ] In-memory storage replaced with DB queries
- [ ] Config loaded from database

### **Frontend**
- [ ] Environment variables updated
- [ ] API calls tenant-aware
- [ ] Built for staging
- [ ] Built for production
- [ ] Deployed to correct domains

### **Infrastructure**
- [ ] Nginx configured (multi-domain)
- [ ] SSL certificates active
- [ ] PM2 ecosystem running
- [ ] Environment files secured

### **Testing**
- [ ] Tenant resolution working
- [ ] Payment flow tested (staging)
- [ ] Payment flow tested (production)
- [ ] Webhook received and processed
- [ ] Email notifications working
- [ ] Thank You page functional

---

## 🎯 Success Criteria

Migration is successful when:

1. **Technical:**
   - ✅ buatfilm.agentbar.ai detected as tenant
   - ✅ All orders stored in database
   - ✅ Config loaded from database (not hardcoded)
   - ✅ Payment flow works end-to-end

2. **Business:**
   - ✅ No disruption to customers
   - ✅ All existing features working
   - ✅ Ready to onboard new tenants

3. **Platform:**
   - ✅ Easy to add new tenant (1 SQL insert)
   - ✅ Tenant isolation working (RLS)
   - ✅ Configurable per tenant
   - ✅ Scalable architecture

---

## 🚀 Post-Migration: First New Tenant

Once BuatFilm is successfully migrated, adding new tenants is simple:

```sql
-- Add new tenant: customerA
INSERT INTO tenants (name, slug, subdomain, primary_domain, plan)
VALUES ('Customer A Course', 'customera', 'customera', 'customera.agentbar.ai', 'starter');

-- Configure their Midtrans
INSERT INTO tenant_settings (tenant_id, key, value, category)
VALUES
  ((SELECT id FROM tenants WHERE slug = 'customera'),
   'midtrans.server_key',
   'SB-Mid-server-customera',
   'payment');

-- Done! customerA.agentbar.ai is now live!
```

---

**Migration complete! Welcome to the SaaS platform!** 🎉
