#!/bin/bash
# =====================================================
# SAFE MIGRATION TO V2 (Tenant-Supported) SERVER
# This script ensures zero-downtime deployment
# =====================================================

set -e  # Exit on error

echo "═══════════════════════════════════════════════════"
echo "🚀 SAFE MIGRATION TO PAYMENT SERVER V2"
echo "═══════════════════════════════════════════════════"
echo ""

# =====================================================
# CONFIGURATION
# =====================================================

BACKUP_DIR="/var/www/backups"
API_DIR="/var/www/api"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# =====================================================
# 1. PRE-DEPLOYMENT CHECKS
# =====================================================

echo "📋 Step 1: Pre-deployment checks..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (sudo)"
  exit 1
fi

# Check current PM2 status
echo "Checking PM2 processes..."
if ! pm2 list | grep -q "payment-api"; then
  echo "⚠️  WARNING: No existing payment-api process found"
  echo "Is this a fresh installation?"
  read -p "Continue anyway? (y/n): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
  fi
else
  echo "✅ PM2 payment-api process found"
fi

echo ""

# =====================================================
# 2. BACKUP CURRENT VERSION
# =====================================================

echo "📦 Step 2: Backing up current version..."
echo ""

mkdir -p "$BACKUP_DIR"

# Backup current payment server
if [ -f "$API_DIR/payment-server.js" ]; then
  cp "$API_DIR/payment-server.js" "$BACKUP_DIR/payment-server.js.backup_$TIMESTAMP"
  echo "✅ Backed up payment-server.js"
fi

# Backup database
if [ -f "$API_DIR/orders.db" ]; then
  cp "$API_DIR/orders.db" "$BACKUP_DIR/orders.db.backup_$TIMESTAMP"
  echo "✅ Backed up orders.db (SQLite)"
fi

# Backup .env
if [ -f "$API_DIR/.env" ]; then
  cp "$API_DIR/.env" "$BACKUP_DIR/.env.backup_$TIMESTAMP"
  echo "✅ Backed up .env"
fi

echo ""

# =====================================================
# 3. INSTALL DEPENDENCIES
# =====================================================

echo "📦 Step 3: Installing dependencies..."
echo ""

cd "$API_DIR"

# Check if pg is installed
if ! npm list pg > /dev/null 2>&1; then
  echo "Installing PostgreSQL client (pg)..."
  npm install pg
  echo "✅ pg installed"
else
  echo "✅ pg already installed"
fi

echo ""

# =====================================================
# 4. VERIFY DATABASE CONFIGURATION
# =====================================================

echo "🔍 Step 4: Verifying database configuration..."
echo ""

if [ ! -f "$API_DIR/.env" ]; then
  echo "❌ .env file not found!"
  echo "Please create .env with database configuration"
  exit 1
fi

# Check if DB_TYPE is set
if ! grep -q "DB_TYPE=postgresql" "$API_DIR/.env"; then
  echo "⚠️  WARNING: DB_TYPE not set to postgresql in .env"
  echo "Current database type: SQLite"
  echo ""
  echo "To enable PostgreSQL:"
  echo "1. Add DB_TYPE=postgresql to .env"
  echo "2. Add DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
  echo ""
  read -p "Continue with SQLite? (v2 will use fallback) (y/n): " sqlite_confirm
  if [[ ! "$sqlite_confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Aborted. Please configure PostgreSQL first"
    exit 1
  fi
else
  echo "✅ PostgreSQL configuration found in .env"
fi

echo ""

# =====================================================
# 5. DEPLOY NEW FILES
# =====================================================

echo "📦 Step 5: Deploying new files..."
echo ""

# Copy new files from local (assuming running from project root)
PROJECT_DIR="/Users/endik/PyCharmMiscProject/ai-movie-course-integrated"

if [ -d "$PROJECT_DIR/backend" ]; then
  echo "Copying files from project directory..."

  # Copy new payment server (as payment-server-v2.js)
  cp "$PROJECT_DIR/backend/payment-server-v2.js" "$API_DIR/payment-server-v2.js"
  echo "✅ payment-server-v2.js deployed"

  # Copy db-postgres.js
  cp "$PROJECT_DIR/backend/db-postgres.js" "$API_DIR/db-postgres.js"
  echo "✅ db-postgres.js deployed"

  # Copy repositories
  mkdir -p "$API_DIR/repositories"
  cp "$PROJECT_DIR/backend/repositories/ordersRepository.js" "$API_DIR/repositories/ordersRepository.js"
  echo "✅ ordersRepository.js deployed"

  # Copy services
  cp "$PROJECT_DIR/backend/services/tenantService.js" "$API_DIR/services/tenantService.js"
  echo "✅ tenantService.js deployed"

  # Copy middleware
  cp "$PROJECT_DIR/backend/middleware/tenantResolver.js" "$API_DIR/middleware/tenantResolver.js"
  echo "✅ tenantResolver.js deployed"

else
  echo "⚠️  Project directory not found: $PROJECT_DIR"
  echo "Skipping file copy (assuming files already in place)"
fi

echo ""

# =====================================================
# 6. PM2 ECOSYSTEM CONFIGURATION
# =====================================================

echo "⚙️  Step 6: Configuring PM2 ecosystem..."
echo ""

cat > "$API_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    // Original payment server (v1 - SQLite)
    {
      name: 'payment-api-v1',
      script: './payment-server.js',
      cwd: '/var/www/api',
      env_file: '/var/www/api/.env',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: '/root/.pm2/logs/payment-api-v1-error.log',
      out_file: '/root/.pm2/logs/payment-api-v1-out.log',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    // New payment server (v2 - PostgreSQL + Tenant)
    {
      name: 'payment-api-v2',
      script: './payment-server-v2.js',
      cwd: '/var/www/api',
      env_file: '/var/www/api/.env',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010  // Different port to avoid conflict
      },
      error_file: '/root/.pm2/logs/payment-api-v2-error.log',
      out_file: '/root/.pm2/logs/payment-api-v2-out.log',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
EOF

echo "✅ PM2 ecosystem config created"
echo ""

# =====================================================
# 7. START NEW SERVER (PARALLEL)
# =====================================================

echo "🚀 Step 7: Starting new server (parallel mode)..."
echo ""

# Start v2 alongside v1
pm2 start ecosystem.config.js --only payment-api-v2

if [ $? -eq 0 ]; then
  echo "✅ Payment API v2 started on port 3010"
  echo ""
  echo "Current status:"
  pm2 list
else
  echo "❌ Failed to start v2 server"
  echo "Checking logs..."
  pm2 logs payment-api-v2 --lines 20 --nostream
  exit 1
fi

echo ""

# =====================================================
# 8. HEALTH CHECK
# =====================================================

echo "🏥 Step 8: Health check..."
echo ""

sleep 3

# Test v2 health endpoint
if curl -sf http://localhost:3010/health > /dev/null; then
  echo "✅ V2 server health check OK"
else
  echo "❌ V2 server health check failed"
  pm2 logs payment-api-v2 --lines 20 --nostream
  exit 1
fi

# Test tenant resolution
if curl -sf -H "X-Tenant-Slug: buatfilm" http://localhost:3010/health > /dev/null; then
  echo "✅ Tenant resolution OK"
else
  echo "⚠️  Tenant resolution failed (may need database config)"
fi

echo ""

# =====================================================
# 9. VERIFY DATA MIGRATION
# =====================================================

echo "📊 Step 9: Data migration check..."
echo ""

if [ -f "$API_DIR/orders.db" ]; then
  ORDER_COUNT=$(sqlite3 "$API_DIR/orders.db" "SELECT COUNT(*) FROM orders;" 2>/dev/null || echo "0")
  echo "📦 SQLite orders: $ORDER_COUNT"
  echo ""
  echo "⚠️  IMPORTANT: You still have $ORDER_COUNT orders in SQLite"
  echo "To migrate to PostgreSQL:"
  echo "1. Follow database/SUPABASE-SETUP-GUIDE.md"
  echo "2. Run migration script (if needed)"
  echo "3. Update nginx to point to v2 server"
  echo "4. Monitor v2 server"
  echo "5. If stable, stop v1 server"
fi

echo ""

# =====================================================
# 10. NGINX CONFIGURATION (FUTURE STEP)
# =====================================================

echo "🌐 Step 10: Nginx configuration (future step)..."
echo ""

echo "Current state:"
echo "- V1 server: Running on port 3002 (SQLite)"
echo "- V2 server: Running on port 3010 (PostgreSQL + Tenant)"
echo ""
echo "To switch traffic to V2:"
echo "1. Update nginx config: proxy_pass http://localhost:3010;"
echo "2. Add tenant header: proxy_set_header X-Tenant-Slug buatfilm;"
echo "3. Reload nginx: sudo nginx -s reload"
echo "4. Monitor v2 logs: pm2 logs payment-api-v2"
echo "5. If stable: pm2 stop payment-api-v1"
echo ""

# =====================================================
# COMPLETION
# =====================================================

echo "═══════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📦 BACKUPS LOCATION: $BACKUP_DIR"
echo "📋 LOGS: pm2 logs"
echo ""
echo "🔄 CURRENT STATUS:"
pm2 list
echo ""
echo "🧪 TEST COMMANDS:"
echo "  # Test V1 (original)"
echo "  curl http://localhost:3002/health"
echo ""
echo "  # Test V2 (new)"
echo "  curl http://localhost:3010/health"
echo "  curl -H \"X-Tenant-Slug: buatfilm\" http://localhost:3010/health"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Setup Supabase database (see database/SUPABASE-SETUP-GUIDE.md)"
echo "2. Configure .env with PostgreSQL credentials"
echo "3. Restart v2: pm2 restart payment-api-v2"
echo "4. Test tenant resolution"
echo "5. Update nginx to point to v2"
echo "6. Monitor and verify"
echo "7. If stable, stop v1: pm2 stop payment-api-v1"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
