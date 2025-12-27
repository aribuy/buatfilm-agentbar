# Multi-Domain SaaS Architecture Implementation

## Domain Structure

```
agentbar.ai (root domain)
│
├── funnel.agentbar.ai          → SaaS Platform (Production)
│   ├── Landing page (marketing platform)
│   ├── Pricing page
│   ├── Sign up / Login
│   ├── Admin console (super admin)
│   └── API: api.funnel.agentbar.ai
│
├── funnelstaging.agentbar.ai   → SaaS Platform (Staging)
│   ├── Testing new features
│   ├── QA environment
│   └── API: api.funnelstaging.agentbar.ai
│
└── [tenant].agentbar.ai        → Customer funnels
    ├── buatfilm.agentbar.ai   (Pilot tenant)
    ├── customer1.agentbar.ai  (Future tenant)
    └── customer2.agentbar.ai  (Future tenant)
```

---

## Nginx Configuration (Wildcard Subdomains)

### **Production: funnel.agentbar.ai**

```nginx
# /etc/nginx/sites-available/funnel.agentbar.ai

# SaaS Platform Main Site
server {
    server_name funnel.agentbar.ai;
    root /var/www/funnel-platform/frontend/dist;
    index index.html;

    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Routes
    location /api/ {
        proxy_pass http://localhost:3002; # Platform API
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Admin Console
    location /admin/ {
        proxy_pass http://localhost:3004; # Admin API
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # SSL
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/funnel.agentbar.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/funnel.agentbar.ai/privkey.pem;
}

# HTTP to HTTPS redirect
server {
    server_name funnel.agentbar.ai;
    return 301 https://$server_name$request_uri;
}
```

### **Staging: funnelstaging.agentbar.ai**

```nginx
# /etc/nginx/sites-available/funnelstaging.agentbar.ai

server {
    server_name funnelstaging.agentbar.ai;
    root /var/www/funnel-platform/frontend-staging/dist;

    # Same as production, but different ports
    location /api/ {
        proxy_pass http://localhost:3003; # Staging API
    }

    location /admin/ {
        proxy_pass http://localhost:3005; # Staging Admin
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/funnelstaging.agentbar.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/funnelstaging.agentbar.ai/privkey.pem;
}
```

### **Wildcard Subdomain for Tenants**

```nginx
# /etc/nginx/sites-available/tenants.agentbar.ai

# Catch-all for tenant subdomains
server {
    server_name ~^(?<tenant>[^.]+)\.agentbar\.ai$;

    # Extract tenant from subdomain
    set $tenant_subdomain $tenant;

    # Proxy to tenant handler
    location / {
        proxy_pass http://localhost:3002/tenant/$tenant_subdomain;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Tenant-Slug $tenant_subdomain;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API routes (tenant-scoped)
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Tenant-Slug $tenant_subdomain;
    }

    # SSL (Let's Encrypt wildcard)
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/agentbar.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agentbar.ai/privkey.pem;

    # HSTS (optional)
    add_header Strict-Transport-Security "max-age=31536000" always;
}

# Special handling for buatfilm tenant (already exists)
server {
    server_name buatfilm.agentbar.ai;
    root /var/www/buatfilm/frontend/dist;

    # Current implementation
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Tenant-Slug buatfilm;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/buatfilm.agentbar.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/buatfilm.agentbar.ai/privkey.pem;
}
```

---

## SSL Certificates (Wildcard)

### **Obtain Wildcard Certificate**

```bash
# Obtain wildcard SSL for *.agentbar.ai
sudo certbot certonly --manual -d "*.agentbar.ai" -d "agentbar.ai"

# Or use DNS challenge (recommended for wildcards)
sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/.secrets/certbot-cloudflare.ini -d "*.agentbar.ai" -d "agentbar.ai"

# Renewal
sudo certbot renew --dns-cloudflare
```

---

## Database Schema Updates

### **Tenants Table (Revised)**

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255), -- Custom domain (optional)

    -- Subdomain configuration
    subdomain VARCHAR(100) UNIQUE, -- buatfilm, customer1, etc
    is_subdomain_active BOOLEAN DEFAULT true,

    -- Plan & Status
    plan VARCHAR(50) DEFAULT 'starter',
    status VARCHAR(20) DEFAULT 'active',

    -- Branding (White-label)
    logo_url TEXT,
    primary_color VARCHAR(7),
    custom_domain VARCHAR(255), -- yourdomain.com

    -- Config
    midtrans_merchant_id VARCHAR(100),
    midtrans_server_key TEXT,
    midtrans_client_key TEXT,

    email_from VARCHAR(255),
    whatsapp_enabled BOOLEAN DEFAULT false,

    -- Limits
    max_orders_per_month INTEGER DEFAULT 100,
    max_admin_users INTEGER DEFAULT 1,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_plan CHECK (plan IN ('starter', 'pro', 'enterprise'))
);

-- Index for fast tenant lookup by subdomain
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain) WHERE is_subdomain_active = true;
```

---

## Tenant Resolution Middleware

### **Express Middleware (Backend)**

```javascript
// middleware/tenantResolver.js

const { Pool } = require('pg');
const pool = require('../db');

/**
 * Resolve tenant from request
 * Priority:
 * 1. X-Tenant-Slug header (from nginx)
 * 2. Subdomain extraction from Host header
 * 3. Query parameter (fallback for testing)
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
            if (!['funnel', 'funnelstaging', 'www'].includes(subdomain)) {
                tenantSlug = subdomain;
                console.log(`[TENANT] Resolved from subdomain: ${tenantSlug}`);
            }
        }
        // Method 3: Query parameter (testing only)
        else if (req.query.tenant) {
            tenantSlug = req.query.tenant;
            console.log(`[TENANT] Resolved from query: ${tenantSlug}`);
        }

        // If no tenant found, return 404 (or redirect to platform)
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

        // Add tenant context to logs
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

### **Apply Middleware to API**

```javascript
// payment-server.js

const resolveTenant = require('./middleware/tenantResolver');

// Apply to all payment routes
app.use('/payment', resolveTenant);

// Payment create endpoint (tenant-scoped)
app.post('/payment/create', resolveTenant, async (req, res) => {
    try {
        const { orderId, amount, email, phone, name, paymentMethod } = req.body;

        // Use tenant-specific Midtrans credentials
        const snap = new midtransClient.Snap({
            isProduction: req.tenant.midtrans_environment === 'production',
            serverKey: req.tenant.midtrans_server_key,
            clientKey: req.tenant.midtrans_client_key
        });

        // Store order with tenant_id
        const order = await pool.query(
            `INSERT INTO orders (
                tenant_id, order_id, customer_name, email, phone,
                gross_amount, payment_method
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [req.tenantId, orderId, name, email, phone, amount, paymentMethod]
        );

        console.log(`[${req.tenant.slug}] Order created: ${orderId}`);

        // Midtrans transaction with tenant redirect URL
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
            enabled_payments: enabledPaymentMethod,
            finish_redirect_url: `https://${req.tenant.subdomain}.agentbar.ai/thank-you?order_id=${orderId}`
        });

        res.json({
            success: true,
            redirectUrl: transaction.redirect_url,
            token: transaction.token
        });
    } catch (error) {
        console.error(`[${req.tenant.slug}] Payment error:`, error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
```

---

## Frontend: Multi-Tenant Detection

### **Tenant Config Provider**

```typescript
// src/contexts/TenantContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: string;
    branding: {
        logoUrl?: string;
        primaryColor?: string;
    };
}

interface TenantContextValue {
    tenant: Tenant | null;
    loading: boolean;
    error: string | null;
}

const TenantContext = createContext<TenantContextValue>({
    tenant: null,
    loading: true,
    error: null
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTenant = async () => {
            try {
                // Extract tenant from subdomain
                const hostname = window.location.hostname; // buatfilm.agentbar.ai
                const subdomain = hostname.split('.')[0]; // buatfilm

                // Skip platform domains
                if (['funnel', 'funnelstaging', 'www'].includes(subdomain)) {
                    setLoading(false);
                    return;
                }

                // Fetch tenant config from API
                const response = await fetch(`/api/tenant/${subdomain}`);

                if (!response.ok) {
                    throw new Error('Tenant not found');
                }

                const data = await response.json();
                setTenant(data.tenant);

                // Apply branding
                if (data.tenant.branding.primaryColor) {
                    document.documentElement.style.setProperty(
                        '--brand-color',
                        data.tenant.branding.primaryColor
                    );
                }

            } catch (err) {
                console.error('Failed to load tenant:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadTenant();
    }, []);

    return (
        <TenantContext.Provider value={{ tenant, loading, error }}>
            {children}
        </TenantContext.Provider>
    );
};
```

---

## Deployment Strategy

### **Directory Structure**

```
/var/www/
│
├── funnel-platform/              # SaaS Platform (NEW)
│   ├── frontend/                 # Marketing + Admin console
│   │   ├── dist/                 # Platform frontend
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── Landing.tsx   # Platform landing
│   │       │   ├── Pricing.tsx   # Pricing page
│   │       │   ├── Signup.tsx    # Tenant onboarding
│   │       │   └── Admin.tsx     # Super admin console
│   │       └── components/
│   ├── backend/
│   │   ├── platform-server.js    # Platform API (tenants, billing)
│   │   ├── payment-server.js     # Payment API (multi-tenant)
│   │   └── admin-server.js       # Admin API
│   └── frontend-staging/
│
└── buatfilm/                     # Existing (Tenant)
    ├── frontend/
    │   └── dist/                 # Will be migrated to tenant system
    └── backend/                  # Will be merged into platform
```

---

## Migration Path

### **Phase 1: Platform Setup (Week 1-2)**
```
Current:
buatfilm.agentbar.ai (monolithic)

Target:
buatfilm.agentbar.ai (tenant)
funnel.agentbar.ai (platform NEW)
funnelstaging.agentbar.ai (staging NEW)
```

**Tasks:**
1. Set up funnel.agentbar.ai (platform landing)
2. Set up funnelstaging.agentbar.ai (staging)
3. Create tenant resolution middleware
4. Migrate buatfilm to tenant system

### **Phase 2: BuatFilm as Tenant (Week 3)**
```
buatfilm.agentbar.ai
├── Detected as tenant: "buatfilm"
├── Loads tenant config from DB
└── Uses tenant-specific Midtrans keys
```

**Tasks:**
1. Insert buatfilm as tenant in database
2. Update buatfilm frontend to use tenant context
3. Migrate orders to tenant_id
4. Test full payment flow

### **Phase 3: Platform Features (Week 4-6)**
```
funnel.agentbar.ai
├── Landing page
├── Pricing page
├── Sign up flow
├── Admin console
└── Tenant management
```

**Tasks:**
1. Build platform frontend
2. Build tenant onboarding flow
3. Build admin console
4. Implement billing

### **Phase 4: First Real Customer (Week 7+)**
```
customer1.agentbar.ai (NEW)
├── Sign up via funnel.agentbar.ai
├── Configure Midtrans keys
├── Customize branding
└── Launch their funnel!
```

---

## Cost Analysis

### **Current State (Single Product)**
```
buatfilm.agentbar.ai
├── VPS (4GB): Rp 150K/month
├── Domain: Rp 12.5K/month
└── Total: Rp 162.5K/month
```

### **Platform + BuatFilm Tenant**
```
funnel.agentbar.ai (platform)
├── VPS (4GB): Rp 150K/month
├── Supabase Pro: Rp 350K/month
├── Wildcard SSL: Rp 0 (Let's Encrypt)
│
buatfilm.agentbar.ai (tenant)
└── (Same infrastructure, no extra cost)
│
funnelstaging.agentbar.ai (staging)
└── (Same infrastructure, no extra cost)
│
Total: Rp 512.5K/month
Revenue (100 customers × Rp 999K): Rp 99,900K/month
Profit: Rp 99,387.5K/month (99.5% margin!)
```

---

## Benefits of This Architecture

✅ **Clear Separation:** Platform vs Product
✅ **Scalable:** Add infinite tenants
✅ **Professional:** White-label ready
✅ **Cost-Efficient:** Shared infrastructure
✅ **Future-Proof:** Easy to add features
✅ **Sellable:** Clear product (the platform)

---

**Ini adalah arsitektur yang SANGAT SOLID untuk SaaS business!** 🚀

Next steps?
1. Setup funnel.agentbar.ai domain
2. Build platform landing page
3. Implement tenant resolution
4. Migrate buatfilm to tenant system

Mau saya lanjut implementasi?
