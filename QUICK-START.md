# 🚀 Quick Start - Deploy PostgreSQL + V2 Backend

## Anda punya 2 subdomain:
- ✅ `buatfilm.agentbar.ai` (app server - existing)
- ✅ `db.agentbar.ai` (database server - new)

## 2 Langkah Mudah:

### **LANGKAH 1: Setup Database Server**

```bash
# Dari komputer Anda, upload script ke db.agentbar.ai
scp database/setup-postgres.sh root@db.agentbar.ai:/root/
scp database/schema.sql root@db.agentbar.ai:/tmp/

# SSH ke database server
ssh root@db.agentbar.ai

# Run setup script
chmod +x /root/setup-postgres.sh
cd /root
./setup-postgres.sh
```

**Script akan:**
- Install PostgreSQL
- Create database: `ai_movie_course`
- Create user: `api_user`
- Configure security (localhost only)
- Setup automatic backups
- Generate secure password

**Catat password yang ditampilkan!**

---

### **LANGKAH 2: Deploy Backend V2**

```bash
# Dari komputer Anda, upload files ke buatfilm.agentbar.ai
scp backend/payment-server-v2.js root@buatfilm.agentbar.ai:/var/www/api/
scp backend/db-postgres.js root@buatfilm.agentbar.ai:/var/www/api/
scp backend/repositories/ordersRepository.js root@buatfilm.agentbar.ai:/var/www/api/repositories/
scp backend/services/tenantService.js root@buatfilm.agentbar.ai:/var/www/api/services/
scp backend/middleware/tenantResolver.js root@buatfilm.agentbar.ai:/var/www/api/middleware/
scp backend/deploy-backend-v2.sh root@buatfilm.agentbar.ai:/root/

# SSH ke app server
ssh root@buatfilm.agentbar.ai

# Run deployment script
chmod +x /root/deploy-backend-v2.sh
cd /root
./deploy-backend-v2.sh
```

**Script akan:**
- Install `pg` package
- Configure `.env` dengan database credentials
- Start V2 server (port 3010)
- V1 tetap jalan (port 3002)
- Test health & tenant resolution

---

### **LANGKAH 3: Verifikasi**

```bash
# SSH ke app server
ssh root@buatfilm.agentbar.ai

# Cek status PM2
pm2 list

# Test V2 health
curl http://localhost:3010/health

# Test tenant resolution
curl -H "X-Tenant-Slug: buatfilm" http://localhost:3010/health

# Run monitoring script
/usr/local/bin/check-backend-v2.sh
```

**Expected output:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "ai_movie_course",
  "tenant": "buatfilm"
}
```

---

## ✅ Success!

Setelah ini:

- ✅ **Database server siap** di db.agentbar.ai
- ✅ **Backend V2 running** di buatfilm.agentbar.ai (port 3010)
- ✅ **V1 tetap jalan** (port 3002) - Production aman!
- ✅ **Tenant resolution working**
- ✅ **Ready untuk testing!**

---

## 📚 Documentation Lengkap:

- [DEPLOYMENT-GUIDE.md](database/DEPLOYMENT-GUIDE.md) - Complete guide
- [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md) - Architecture overview
- [database/setup-postgres.sh](database/setup-postgres.sh) - Database setup script
- [backend/deploy-backend-v2.sh](backend/deploy-backend-v2.sh) - Backend deploy script

---

## ⚠️ JANGAN LUPA:

1. **Backup dulu V1** (script otomatis backup, tapi cek juga)
2. **Test V2 dengan sandbox transaction** dulu
3. **Monitor logs** selama 24-48 jam
4. **Baru setelah itu update nginx** untuk switch ke V2

---

## 🆘 Butuh Bantuan?

### Troubleshooting Cepat:

**Database connection failed?**
```bash
# Test dari app server
ping db.agentbar.ai
psql -h db.agentbar.ai -U api_user -d ai_movie_course
```

**V2 won't start?**
```bash
pm2 logs payment-api-v2 --lines 100
```

**Tenant resolution not working?**
```bash
# Cek database
ssh root@db.agentbar.ai
sudo -u postgres psql -d ai_movie_course -c "SELECT * FROM tenants WHERE slug='buatfilm';"
```

**Full troubleshooting:** Lihat [DEPLOYMENT-GUIDE.md](database/DEPLOYMENT-GUIDE.md)

---

**Ready to deploy!** 🚀
