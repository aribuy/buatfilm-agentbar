# ✅ DEPLOYMENT SUMMARY

**Date**: December 27, 2025
**Server**: buatfilm.agentbar.ai (31.97.220.37)
**Status**: 🟡 PARTIAL COMPLETE - Need manual final step

---

## 🎯 What Has Been Done

### ✅ **Completed:**

1. **Server Connected**
   - Successfully connected to buatfilm.agentbar.ai
   - Server: Ubuntu 24.04, 7.8GB RAM, 128 days uptime
   - PM2 running with V1 (port 3002) active

2. **PostgreSQL Database Setup**
   - ✅ PostgreSQL 16.11 already installed
   - ✅ Database `ai_movie_course` created
   - ✅ User `api_user` created with password
   - ✅ All privileges granted
   - ✅ Schema imported (12 tables created)
   - ✅ BuatFilm tenant inserted

3. **Backend V2 Files Uploaded**
   - ✅ payment-server-v2.js
   - ✅ db-postgres.js
   - ✅ repositories/ordersRepository.js
   - ✅ services/tenantService.js
   - ✅ middleware/tenantResolver.js
   - ✅ middleware/auth.js
   - ✅ middleware/errorHandler.js
   - ✅ services/whatsapp.js
   - ✅ services/email.js

4. **Dependencies Installed**
   - ✅ pg (PostgreSQL client)
   - ✅ jsonwebtoken
   - ✅ All required packages

5. **Environment Configuration**
   - ✅ .env updated with database credentials
   - ✅ DB_HOST=localhost
   - ✅ DB_PORT=5432
   - ✅ DB_NAME=ai_movie_course
   - ✅ DB_USER=api_user
   - ✅ DB_PASSWORD=BuatFilm2025!Secure

6. **Database Verified**
   - ✅ Connection successful
   - ✅ Tenant exists: `e870a973-cf5b-4b9e-a99d-53d974ae970e`
   - ✅ Slug: `buatfilm`
   - ✅ Plan: `pro`
   - ✅ Status: `active`

---

## ⚠️ **Remaining Step**

### **START V2 SERVER (Manual)**

Due to SSH password timeout issues, you need to run this final command manually:

```bash
ssh root@31.97.220.37
```

Then run:

```bash
bash /root/start-v2.sh
```

**What this script does:**
- Stops any existing V2 process
- Starts V2 on port 3010 (different from V1's port 3002)
- Tests health endpoints
- Shows PM2 status

---

## 📊 Current Server Status

```
PM2 Processes:
┌────┬───────────────────┬─────────┬──────────┬────────┬─────────┐
│ id │ name              │ status  │ port     │ pid    │ memory  │
├────┼───────────────────┼─────────┼──────────┼────────┼─────────┤
│ 2  │ payment-api       │ online  │ 3002     │ 311... │ 68MB    │ ← V1 (Production)
│ 3  │ payment-api-v2    │ stopped │ 3010     │ -      │ -       │ ← V2 (Need to start)
└────┴───────────────────┴─────────┴──────────┴────────┴─────────┘
```

---

## 🧪 After Starting V2

Verify with these commands:

```bash
# Check V2 health
curl http://localhost:3010/health

# Expected response:
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "ai_movie_course"
}

# Check tenant resolution
curl -H "X-Tenant-Slug: buatfilm" http://localhost:3010/health

# Expected response:
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "ai_movie_course",
  "tenant": "buatfilm"
}

# Check PM2 status
pm2 list

# Check V2 logs
pm2 logs payment-api-v2 --lines 50
```

---

## 🎯 Next Steps (After V2 Running)

### **1. Test Payment Flow**

```bash
# Create test payment via V2
curl -X POST http://localhost:3010/payment/create \
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

### **2. Verify Database**

```bash
sudo -u postgres psql -d ai_movie_course

# Check tables
\dt

# Check orders
SELECT * FROM orders WHERE tenant_id = (
  SELECT id FROM tenants WHERE slug = 'buatfilm'
);

# Check tenant
SELECT * FROM tenants WHERE slug = 'buatfilm';
```

### **3. Update Nginx (When Ready)**

Only do this after V2 is fully tested and stable!

```bash
sudo nano /etc/nginx/sites-available/buatfilm.agentbar.ai
```

Change the `/api/` location:

```nginx
location /api/ {
    proxy_pass http://localhost:3010;  # Changed from 3002 to 3010
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # ADD THIS for tenant resolution
    proxy_set_header X-Tenant-Slug buatfilm;
}
```

Test and reload nginx:

```bash
sudo nginx -t
sudo nginx -s reload
```

---

## 🔐 Database Credentials

```
Host: localhost
Port: 5432
Database: ai_movie_course
User: api_user
Password: BuatFilm2025!Secure
```

**⚠️ SECURITY NOTE:** Change this password in production!

---

## 📁 Files Uploaded

**Backend:**
- `/var/www/api/payment-server-v2.js`
- `/var/www/api/db-postgres.js`
- `/var/www/api/repositories/ordersRepository.js`
- `/var/www/api/services/tenantService.js`
- `/var/www/api/middleware/tenantResolver.js`
- `/var/www/api/middleware/auth.js`
- `/var/www/api/middleware/errorHandler.js`
- `/var/www/api/services/whatsapp.js`
- `/var/www/api/services/email.js`

**Database:**
- `/tmp/schema.sql` (imported)

**Scripts:**
- `/root/start-v2.sh` (run this to start V2)

---

## ✅ Success Criteria

Deployment is successful when:

- [ ] V2 server running on port 3010
- [ ] Health endpoint responds: `{"status":"healthy","version":"2.0.0"}`
- [ ] Tenant resolution works: `{"tenant":"buatfilm"}`
- [ ] Can create test payment
- [ ] Order stored in database with tenant_id
- [ ] V1 still running on port 3002 (production safe)
- [ ] Both servers running in parallel

---

## 🆘 Troubleshooting

### **V2 won't start?**

```bash
# Check logs
pm2 logs payment-api-v2 --lines 100

# Common errors:
# - Port 3002 in use → V2 should use 3010
# - Missing module → npm install <module>
# - Database connection → Check .env credentials
```

### **Database connection failed?**

```bash
# Test connection
cd /var/www/api
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ai_movie_course',
  user: 'api_user',
  password: 'BuatFilm2025!Secure'
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Error:', err.message);
  else console.log('✅ Connected:', res.rows[0].now);
  pool.end();
});
"
```

### **Tenant not found?**

```bash
sudo -u postgres psql -d ai_movie_course \
  -c "SELECT * FROM tenants WHERE slug = 'buatfilm';"
```

---

## 🎉 Summary

**What's Working:**
- ✅ PostgreSQL database with full schema
- ✅ BuatFilm tenant configured
- ✅ All V2 files uploaded
- ✅ Dependencies installed
- ✅ Environment configured
- ✅ V1 (production) still running safely

**What's Left:**
- ⏳ Start V2 server manually (run `/root/start-v2.sh`)
- ⏳ Test V2 endpoints
- ⏳ Verify tenant resolution
- ⏳ Test payment flow
- ⏳ Update nginx (when ready)

---

**Run this command to complete deployment:**

```bash
ssh root@31.97.220.37 'bash /root/start-v2.sh'
```

**Generated:** December 27, 2025
**Version:** 2.0.0 (Multi-Tenant Ready)
