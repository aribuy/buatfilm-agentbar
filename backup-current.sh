#!/bin/bash
###############################################################################
# PHASE 0: BACKUP & AUDIT
# Duration: 30 minutes
# Downtime: ZERO
###############################################################################

set -e  # Exit on error

echo "=================================================="
echo "📦 PHASE 0: BACKUP & AUDIT"
echo "=================================================="
echo ""

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups/buatfilm-$DATE"
LOCAL_BACKUP_DIR="./backups/$DATE"

echo "📅 Date: $(date)"
echo "💾 Backup Directory: $BACKUP_DIR"
echo "📁 Local Backup: $LOCAL_BACKUP_DIR"
echo ""

# Create local backup directory
mkdir -p "$LOCAL_BACKUP_DIR"

echo "=================================================="
echo "Step 1: Creating Remote Backup Directory"
echo "=================================================="
ssh buatfilm-server "mkdir -p $BACKUP_DIR"
echo "✅ Remote backup directory created"
echo ""

echo "=================================================="
echo "Step 2: Backing Up SQLite Database"
echo "=================================================="
ssh buatfilm-server "
  cd /var/www/api
  if [ -f orders.db ]; then
    cp orders.db $BACKUP_DIR/orders.db
    echo \"✅ Database backed up\"
    sqlite3 orders.db \".tables\"
  else
    echo \"⚠️  orders.db not found at /var/www/api/\"
    ls -la /var/www/api/
  fi
"
echo ""

echo "=================================================="
echo "Step 3: Backing Up Environment Variables"
echo "=================================================="
ssh buatfilm-server "
  cd /var/www/api
  if [ -f .env ]; then
    cp .env $BACKUP_DIR/.env
    echo \"✅ .env backed up\"
    # Show sensitive info (masked)
    grep -E \"MIDTRANS|ADMIN\" .env | sed 's/=.*/=***MASKED***/'
  else
    echo \"⚠️  .env not found\"
  fi
"
echo ""

echo "=================================================="
echo "Step 4: Backing Up Backend Code"
echo "=================================================="
ssh buatfilm-server "
  cd /var/www
  if [ -d api ]; then
    tar -czf $BACKUP_DIR/api-backup.tar.gz api/
    echo \"✅ API code backed up\"
    echo \"Size: $(du -h $BACKUP_DIR/api-backup.tar.gz | cut -f1)\"
  else
    echo \"⚠️  /var/www/api not found\"
  fi
"
echo ""

echo "=================================================="
echo "Step 5: Backing Up Frontend"
echo "=================================================="
ssh buatfilm-server "
  cd /var/www
  if [ -d buatfilm.agentbar.ai ]; then
    tar -czf $BACKUP_DIR/frontend-backup.tar.gz buatfilm.agentbar.ai/
    echo \"✅ Frontend backed up\"
    echo \"Size: $(du -h $BACKUP_DIR/frontend-backup.tar.gz | cut -f1)\"
  else
    echo \"⚠️  /var/www/buatfilm.agentbar.ai not found\"
  fi
"
echo ""

echo "=================================================="
echo "Step 6: Backing Up PM2 Configuration"
echo "=================================================="
ssh buatfilm-server "
  pm2 save --force
  cp ~/.pm2/dump.pm2 $BACKUP_DIR/dump.pm2 2>/dev/null || true
  echo \"✅ PM2 configuration backed up\"
"
echo ""

echo "=================================================="
echo "Step 7: Auditing Current Orders"
echo "=================================================="
ssh buatfilm-server "
  cd /var/www/api
  if [ -f orders.db ]; then
    echo \"=== Orders Summary ===\"
    sqlite3 orders.db \"
      SELECT
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM orders
      GROUP BY status;
    \"
    echo \"\"
    echo \"=== Recent Orders (Last 10) ===\"
    sqlite3 orders.db \"
      SELECT
        id,
        customerName,
        email,
        amount,
        status,
        datetime(created_at) as created
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10;
    \"
  fi
" > "$LOCAL_BACKUP_DIR/orders-audit.txt"
echo "✅ Orders audit saved to: $LOCAL_BACKUP_DIR/orders-audit.txt"
echo ""

echo "=================================================="
echo "Step 8: Checking PM2 Status"
echo "=================================================="
ssh buatfilm-server "
  pm2 status
" > "$LOCAL_BACKUP_DIR/pm2-status.txt"
echo "✅ PM2 status saved to: $LOCAL_BACKUP_DIR/pm2-status.txt"
cat "$LOCAL_BACKUP_DIR/pm2-status.txt"
echo ""

echo "=================================================="
echo "Step 9: Checking PM2 Logs (Last 50 lines)"
echo "=================================================="
ssh root@srv941062.htgr.cloud "
  pm2 logs --lines 50 --nostream
" > "$LOCAL_BACKUP_DIR/pm2-logs.txt"
echo "✅ PM2 logs saved to: $LOCAL_BACKUP_DIR/pm2-logs.txt"
echo ""

echo "=================================================="
echo "Step 10: Downloading Backups Locally"
echo "=================================================="
scp root@srv941062.hstgr.cloud:$BACKUP_DIR/* "$LOCAL_BACKUP_DIR/"
echo "✅ All backups downloaded to: $LOCAL_BACKUP_DIR"
echo ""

echo "=================================================="
echo "Step 11: Backup Summary"
echo "=================================================="
echo "📦 Backup Location:"
echo "   Remote: $BACKUP_DIR"
echo "   Local:  $LOCAL_BACKUP_DIR"
echo ""
echo "📊 Backup Contents:"
ls -lh "$LOCAL_BACKUP_DIR"
echo ""

echo "=================================================="
echo "Step 12: System Information"
echo "=================================================="
ssh buatfilm-server "
  echo '=== System Info ==='
  uname -a
  echo ''
  echo '=== Disk Space ==='
  df -h
  echo ''
  echo '=== Memory ==='
  free -h
  echo ''
  echo '=== Node Version ==='
  node --version
  echo ''
  echo '=== NPM Version ==='
  npm --version
"
echo ""

echo "=================================================="
echo "✅ PHASE 0 COMPLETE!"
echo "=================================================="
echo ""
echo "📋 Backup Summary:"
echo "   ✅ Database: orders.db"
echo "   ✅ Environment: .env"
echo "   ✅ Backend Code: api-backup.tar.gz"
echo "   ✅ Frontend: frontend-backup.tar.gz"
echo "   ✅ PM2 Config: dump.pm2"
echo "   ✅ Orders Audit: orders-audit.txt"
echo "   ✅ PM2 Status: pm2-status.txt"
echo "   ✅ PM2 Logs: pm2-logs.txt"
echo ""
echo "📁 Local Backup: $LOCAL_BACKUP_DIR"
echo ""
echo "🚀 Ready for Phase 1!"
echo ""
echo "Next Step:"
echo "   ./deploy-phase1-security.sh"
echo ""
