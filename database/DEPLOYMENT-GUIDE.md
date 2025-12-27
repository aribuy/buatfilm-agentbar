# 🚀 Complete Deployment Guide
## PostgreSQL + Multi-Tenant Backend V2

**Target**: Setup PostgreSQL on `db.agentbar.ai` and deploy V2 backend to `buatfilm.agentbar.ai`

---

## 📋 Prerequisites Checklist

- [ ] Two subdomains ready:
  - [ ] `buatfilm.agentbar.ai` (app server - existing)
  - [ ] `db.agentbar.ai` (database server - new)
- [ ] Two VPS servers:
  - [ ] App Server: 2-4GB RAM (buatfilm.agentbar.ai)
  - [ ] Database Server: 1-2GB RAM (db.agentbar.ai)
- [ ] SSH access to both servers
- [ ] Domain DNS configured

---

## 🎯 Deployment Strategy

### Architecture:
```
Server 1: buatfilm.agentbar.ai (App Server)
├── Nginx (port 80/443)
├── Frontend (React build)
├── Backend V1 (port 3002) - SQLite (Current)
└── Backend V2 (port 3010) - PostgreSQL (NEW!)

Server 2: db.agentbar.ai (Database Server)
└── PostgreSQL (port 5432 - localhost only)
    └── ai_movie_course database
```

---

## 📝 Step-by-Step Deployment

### **Phase 1: Database Server Setup (db.agentbar.ai)**

#### Step 1.1: Upload Setup Script

From your local machine:

```bash
# Upload PostgreSQL setup script to database server
scp database/setup-postgres.sh root@db.agentbar.ai:/root/

# Upload database schema
scp database/schema.sql root@db.agentbar.ai:/tmp/
```

#### Step 1.2: Run Setup Script

SSH to database server and run:

```bash
# SSH to database server
ssh root@db.agentbar.ai

# Make script executable
chmod +x /root/setup-postgres.sh

# Run setup script
cd /root
./setup-postgres.sh
```

**What this script does:**
- ✅ Updates system
- ✅ Installs PostgreSQL
- ✅ Configures localhost-only binding
- ✅ Creates database: `ai_movie_course`
- ✅ Creates user: `api_user` with secure password
- ✅ Configures firewall (blocks port 5432)
- ✅ Sets up automatic backups
- ✅ Creates health check script

#### Step 1.3: Import Schema

```bash
# Still on db.agentbar.ai

# Import schema (if not done by setup script)
sudo -u postgres psql -d ai_movie_course -f /tmp/schema.sql

# Verify tables
sudo -u postgres psql -d ai_movie_course -c "\dt"

# Should show 12 tables
```

#### Step 1.4: Verify Installation

```bash
# Run health check
/usr/local/bin/check-postgres.sh

# Manual test
sudo -u postgres psql -d ai_movie_course

# In psql prompt:
\l                    # List databases
\du                   # List users
\dt                   # List tables
SELECT NOW();          # Test query
\q                    # Quit
```

#### Step 1.5: Get Credentials

```bash
# View saved credentials
cat /root/.pg_credentials_ai_movie_course

# Copy these credentials for next phase
```

---

### **Phase 2: Application Server Setup (buatfilm.agentbar.ai)**

#### Step 2.1: Upload Backend Files

From your local machine:

```bash
# Upload V2 backend files to app server
scp backend/payment-server-v2.js root@buatfilm.agentbar.ai:/var/www/api/
scp backend/db-postgres.js root@buatfilm.agentbar.ai:/var/www/api/
scp backend/repositories/ordersRepository.js root@buatfilm.agentbar.ai:/var/www/api/repositories/
scp backend/services/tenantService.js root@buatfilm.agentbar.ai:/var/www/api/services/
scp backend/middleware/tenantResolver.js root@buatfilm.agentbar.ai:/var/www/api/middleware/

# Upload deployment script
scp backend/deploy-backend-v2.sh root@buatfilm.agentbar.ai:/root/
```

#### Step 2.2: Test Database Connection

```bash
# SSH to app server
ssh root@buatfilm.agentbar.ai

# Test connection to database server
psql -h db.agentbar.ai -U api_user -d ai_movie_course

# If connection fails, check:
# 1. Database server is reachable
ping db.agentbar.ai

# 2. Firewall allows connection (on db.server)
# (Should allow from app server IP)

# 3. PostgreSQL is running
ssh root@db.agentbar.ai "systemctl status postgresql"
```

#### Step 2.3: Run Deployment Script

```bash
# Still on buatfilm.agentbar.ai

# Make script executable
chmod +x /root/deploy-backend-v2.sh

# Run deployment script
cd /root
./deploy-backend-v2.sh
```

**What this script does:**
- ✅ Backs up V1 files
- ✅ Installs `pg` package
- ✅ Configures `.env` with database credentials
- ✅ Tests database connection
- ✅ Starts V2 server on port 3010
- ✅ Runs health checks
- ✅ Creates monitoring script

**During the script, you'll need:**
- Database credentials (from Phase 1, Step 1.5)
- Or script will auto-load from `/root/.pg_credentials_ai_movie_course`

---

### **Phase 3: Verification & Testing**

#### Step 3.1: Check Server Status

```bash
# On buatfilm.agentbar.ai

# PM2 status
pm2 list

# Should show:
# ├── payment-api-v1  (port 3002) - online
# └── payment-api-v2  (port 3010) - online
```

#### Step 3.2: Test Health Endpoints

```bash
# Test V1 (original)
curl http://localhost:3002/health

# Test V2 (new)
curl http://localhost:3002/health
curl http://localhost:3010/health

# Expected V2 response:
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "ai_movie_course"
}
```

#### Step 3.3: Test Tenant Resolution

```bash
# Test tenant detection
curl -H "X-Tenant-Slug: buatfilm" http://localhost:3010/health

# Expected response:
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "ai_movie_course",
  "tenant": "buatfilm"
}
```

#### Step 3.4: Run Monitoring Script

```bash
# Comprehensive health check
/usr/local/bin/check-backend-v2.sh

# Shows:
# - PM2 status
# - Health endpoints
# - Tenant resolution
# - Recent logs
```

---

### **Phase 4: Nginx Configuration (Optional - Production Cutover)**

⚠️ **ONLY DO THIS WHEN V2 IS FULLY TESTED AND STABLE!**

#### Step 4.1: Update Nginx Config

```bash
# On buatfilm.agentbar.ai

sudo nano /etc/nginx/sites-available/buatfilm.agentbar.ai
```

Find the `/api/` location block and change:

```nginx
# OLD (V1)
location /api/ {
    proxy_pass http://localhost:3002;
    ...
}

# NEW (V2)
location /api/ {
    proxy_pass http://localhost:3010;  # Changed to V2
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # ADD THIS: Tenant resolution
    proxy_set_header X-Tenant-Slug buatfilm;
}
```

#### Step 4.2: Test & Reload Nginx

```bash
# Test configuration
sudo nginx -t

# If OK, reload nginx
sudo nginx -s reload

# Test from external
curl https://buatfilm.agentbar.ai/api/health
```

#### Step 4.3: Monitor Logs

```bash
# Watch V2 logs
pm2 logs payment-api-v2 --lines 100 -f

# In another terminal, test production
curl -X POST https://buatfilm.agentbar.ai/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"orderId":"TEST-001","amount":99000,...}'
```

---

## 🛡️ Security Checklist

### Database Server (db.agentbar.ai)

```bash
# ✓ PostgreSQL listening on localhost ONLY
sudo ss -tlnp | grep 5432
# Should show: 127.0.0.1:5432 (NOT 0.0.0.0:5432)

# ✓ Firewall configured
sudo ufw status
# Should block port 5432

# ✓ Only app server can connect
# (Configured in pg_hba.conf)

# ✓ Automatic backups enabled
crontab -l | grep backup
# Should show: 0 3 * * * /var/backups/backup-postgres.sh

# ✓ SSH hardened
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no
# PasswordAuthentication no
```

### Application Server (buatfilm.agentbar.ai)

```bash
# ✓ .env file not publicly accessible
ls -la /var/www/api/.env
# Should be: -rw-r--r-- (644)

# ✓ PM2 processes running under non-root
pm2 list

# ✓ Firewall configured
sudo ufw status

# ✓ SSL certificates active
sudo certbot certificates
```

---

## 📊 Monitoring & Maintenance

### Daily Checks

```bash
# Check both servers
/usr/local/bin/check-backend-v2.sh      # On app server
/usr/local/bin/check-postgres.sh        # On db server

# Check PM2 status
pm2 list
pm2 logs payment-api-v2 --lines 50

# Check database size
ssh root@db.agentbar.ai "sudo -u postgres psql -d ai_movie_course -c 'SELECT pg_size_pretty(pg_database_size('"'"'ai_movie_course'"'"'));'"
```

### Weekly Maintenance

```bash
# Review logs
pm2 logs payment-api-v2 --lines 1000

# Check backup files
ls -lh /var/backups/postgres/

# Update system (both servers)
sudo apt update && sudo apt upgrade -y

# Restart services if needed
pm2 restart payment-api-v2
sudo systemctl restart postgresql  # On db server
```

---

## 🔄 Rollback Procedure

If V2 has issues:

```bash
# 1. Switch nginx back to V1
sudo nano /etc/nginx/sites-available/buatfilm.agentbar.ai
# Change: proxy_pass http://localhost:3002;
sudo nginx -s reload

# 2. Stop V2
pm2 stop payment-api-v2

# 3. Verify V1 is serving
curl http://localhost:3002/health
curl https://buatfilm.agentbar.ai/api/health

# 4. Check logs
pm2 logs payment-api-v1 --lines 50
```

---

## 📈 Performance Tuning

### Database Server (1GB RAM)

```bash
# On db.agentbar.ai
sudo nano /etc/postgresql/14/main/postgresql.conf

# Add/update:
shared_buffers = 256MB
effective_cache_size = 512MB
maintenance_work_mem = 64MB
work_mem = 16MB

sudo systemctl restart postgresql
```

### Application Server Connection Pooling

```javascript
// In db-postgres.js (already configured)
const pool = new Pool({
  host: 'db.agentbar.ai',
  max: 20,        // Maximum connections
  min: 2,         // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## ✅ Success Criteria

Deployment is successful when:

- [ ] PostgreSQL running on db.agentbar.ai (localhost only)
- [ ] Database `ai_movie_course` created with all tables
- [ ] BuatFilm tenant inserted
- [ ] V2 backend running on buatfilm.agentbar.ai (port 3010)
- [ ] Health check responds: `{"status":"healthy","version":"2.0.0"}`
- [ ] Tenant resolution works: `{"tenant":"buatfilm"}`
- [ ] Can create test payment via V2
- [ ] Order stored in PostgreSQL with tenant_id
- [ ] V1 still running (port 3002) for safety
- [ ] Automatic backups configured
- [ ] Monitoring scripts working

---

## 🆘 Troubleshooting

### Issue: Database Connection Failed

```bash
# 1. Check if PostgreSQL is running
ssh root@db.agentbar.ai "systemctl status postgresql"

# 2. Check if reachable from app server
ping db.agentbar.ai
telnet db.agentbar.ai 5432

# 3. Check firewall on db server
ssh root@db.agentbar.ai "sudo ufw status"

# 4. Check pg_hba.conf allows app server IP
ssh root@db.agentbar.ai "sudo cat /etc/postgresql/14/main/pg_hba.conf"

# 5. Test connection manually
psql -h db.agentbar.ai -U api_user -d ai_movie_course
```

### Issue: V2 Won't Start

```bash
# Check error logs
pm2 logs payment-api-v2 --lines 100

# Common issues:
# - Missing .env configuration
cat /var/www/api/.env | grep DB_

# - Missing pg package
cd /var/www/api && npm list pg

# - Database not reachable
node -e "console.log(require('pg'))"
```

### Issue: Tenant Resolution Not Working

```bash
# Check if tenant exists in database
ssh root@db.agentbar.ai "sudo -u postgres psql -d ai_movie_course -c 'SELECT * FROM tenants WHERE slug='"'"'buatfilm'"'"';'"

# Check tenant status
ssh root@db.agentbar.ai "sudo -u postgres psql -d ai_movie_course -c 'SELECT id, name, slug, status FROM tenants;'"

# Test tenant endpoint
curl -v -H "X-Tenant-Slug: buatfilm" http://localhost:3010/health
```

---

## 📚 Related Documentation

- [IMPLEMENTATION-SUMMARY.md](../IMPLEMENTATION-SUMMARY.md) - Architecture overview
- [MULTI-DOMAIN-ARCHITECTURE.md](../docs/MULTI-DOMAIN-ARCHITECTURE.md) - Platform design
- [MIGRATE-TO-TENANT.md](MIGRATE-TO-TENANT.md) - Migration guide

---

## 🎉 Deployment Complete!

Your multi-tenant SaaS platform is now:

- ✅ Database: PostgreSQL on dedicated server
- ✅ Backend: Multi-tenant aware with tenant resolution
- ✅ Architecture: Production-ready with zero-downtime strategy
- ✅ Scalability: Ready for unlimited tenants

**Next Steps:**
1. Test V2 with sandbox Midtrans transactions
2. Monitor logs and performance for 24-48 hours
3. Update nginx to point to V2 when confident
4. Onboard first new tenant!

**Generated:** December 27, 2025
**Version:** 2.0.0 (Multi-Tenant Ready)
