#!/bin/bash
# =====================================================
# DEPLOY BACKEND V2 TO buatfilm.agentbar.ai
# Assumes PostgreSQL already setup on db.agentbar.ai
# =====================================================

set -e  # Exit on error

echo "═══════════════════════════════════════════════════"
echo "🚀 DEPLOYING BACKEND V2 (Multi-Tenant)"
echo "═══════════════════════════════════════════════════"
echo ""

# =====================================================
# CONFIGURATION
# =====================================================

API_DIR="/var/www/api"
BACKUP_DIR="/var/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# =====================================================
# 1. BACKUP CURRENT VERSION
# =====================================================

echo "📦 Step 1: Backing up current version..."
mkdir -p "$BACKUP_DIR"

# Backup V1 server
if [ -f "$API_DIR/payment-server.js" ]; then
    cp "$API_DIR/payment-server.js" "$BACKUP_DIR/payment-server.js.backup_$TIMESTAMP"
    echo "✅ Backed up payment-server.js"
fi

# Backup SQLite database
if [ -f "$API_DIR/orders.db" ]; then
    cp "$API_DIR/orders.db" "$BACKUP_DIR/orders.db.backup_$TIMESTAMP"
    echo "✅ Backed up orders.db"
fi

# Backup .env
if [ -f "$API_DIR/.env" ]; then
    cp "$API_DIR/.env" "$BACKUP_DIR/.env.backup_$TIMESTAMP"
    echo "✅ Backed up .env"
fi

echo ""

# =====================================================
# 2. INSTALL DEPENDENCIES
# =====================================================

echo "📦 Step 2: Installing dependencies..."
cd "$API_DIR"

# Check if pg is installed
if ! npm list pg 2>/dev/null | grep -q "pg@"; then
    echo "Installing PostgreSQL client (pg)..."
    npm install pg --save
    echo "✅ pg installed"
else
    echo "✅ pg already installed"
fi

echo ""

# =====================================================
# 3. GET DATABASE CREDENTIALS
# =====================================================

echo "🔐 Step 3: Configuring database connection..."

# Check if credentials file exists
if [ -f "/root/.pg_credentials_ai_movie_course" ]; then
    echo "Found credentials file, loading..."
    source /root/.pg_credentials_ai_movie_course
else
    echo "⚠️  Credentials file not found"
    echo "Please run setup-postgres.sh on db.agentbar.ai first"
    echo ""
    echo "Enter database credentials manually:"
    read -p "DB Host [db.agentbar.ai]: " DB_HOST
    DB_HOST=${DB_HOST:-db.agentbar.ai}

    read -p "DB Port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}

    read -p "DB Name [ai_movie_course]: " DB_NAME
    DB_NAME=${DB_NAME:-ai_movie_course}

    read -p "DB User [api_user]: " DB_USER
    DB_USER=${DB_USER:-api_user}

    read -s -p "DB Password: " DB_PASSWORD
    echo ""
fi

echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# =====================================================
# 4. UPDATE .ENV FILE
# =====================================================

echo "📝 Step 4: Updating .env file..."

# Backup existing .env
cp "$API_DIR/.env" "$API_DIR/.env.pre-v2"

# Add database configuration to .env
if ! grep -q "DB_TYPE=" "$API_DIR/.env"; then
    cat >> "$API_DIR/.env" << EOF

# =====================================================
# POSTGRESQL DATABASE CONFIGURATION (Added: $(date))
# =====================================================
DB_TYPE=postgresql
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
EOF
    echo "✅ Database configuration added to .env"
else
    echo "⚠️  Database configuration already exists in .env"
    echo "Skipping .env update"
fi

echo ""

# =====================================================
# 5. DEPLOY V2 FILES
# =====================================================

echo "📦 Step 5: Deploying V2 files..."

# Create necessary directories
mkdir -p "$API_DIR/repositories"
mkdir -p "$API_DIR/middleware"
mkdir -p "$API_DIR/services"

# Check if files exist in current directory
if [ -f "payment-server-v2.js" ]; then
    echo "Deploying from local directory..."
    # Files are already there (script running from server)
else
    echo "⚠️  V2 files not found in $API_DIR"
    echo "Please upload files first:"
    echo "  scp backend/payment-server-v2.js root@buatfilm.agentbar.ai:$API_DIR/"
    echo "  scp backend/db-postgres.js root@buatfilm.agentbar.ai:$API_DIR/"
    echo "  scp backend/repositories/ordersRepository.js root@buatfilm.agentbar.ai:$API_DIR/repositories/"
    echo "  scp backend/services/tenantService.js root@buatfilm.agentbar.ai:$API_DIR/services/"
    echo "  scp backend/middleware/tenantResolver.js root@buatfilm.agentbar.ai:$API_DIR/middleware/"
    echo ""
    read -p "Press Enter to continue after uploading files..."
fi

echo "✅ V2 files ready"
echo ""

# =====================================================
# 6. TEST DATABASE CONNECTION
# =====================================================

echo "🧪 Step 6: Testing database connection..."

cd "$API_DIR"

node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: '$DB_HOST',
  port: $DB_PORT,
  database: '$DB_NAME',
  user: '$DB_USER',
  password: '$DB_PASSWORD',
  max: 20,
  connectionTimeoutMillis: 5000
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Database connected successfully!');
    console.log('   Server time:', res.rows[0].now);
    pool.end();
  }
});
" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection test passed"
else
    echo "❌ Database connection test failed"
    echo "Please check:"
    echo "  1. PostgreSQL is running on db.agentbar.ai"
    echo "  2. Firewall allows connection"
    echo "  3. Credentials are correct"
    echo "  4. Database exists"
    exit 1
fi

echo ""

# =====================================================
# 7. CREATE PM2 ECOSYSTEM CONFIG
# =====================================================

echo "⚙️  Step 7: Configuring PM2 ecosystem..."

cat > "$API_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    // Original payment server (V1 - SQLite)
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
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    // New payment server (V2 - PostgreSQL + Tenant)
    {
      name: 'payment-api-v2',
      script: './payment-server-v2.js',
      cwd: '/var/www/api',
      env_file: '/var/www/api/.env',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      error_file: '/root/.pm2/logs/payment-api-v2-error.log',
      out_file: '/root/.pm2/logs/payment-api-v2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
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
# 8. START V2 SERVER
# =====================================================

echo "🚀 Step 8: Starting V2 server..."

# Check if V2 already running
if pm2 list | grep -q "payment-api-v2.*online"; then
    echo "V2 already running, reloading..."
    pm2 reload payment-api-v2
else
    echo "Starting V2 for the first time..."
    pm2 start ecosystem.config.js --only payment-api-v2
fi

if [ $? -eq 0 ]; then
    echo "✅ V2 server started successfully"
else
    echo "❌ Failed to start V2 server"
    echo "Checking logs..."
    pm2 logs payment-api-v2 --lines 30 --nostream
    exit 1
fi

pm2 save

echo ""

# =====================================================
# 9. HEALTH CHECK
# =====================================================

echo "🏥 Step 9: Performing health checks..."

sleep 3

# Test V1 health (original)
if curl -sf http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ V1 (port 3002) - Healthy"
else
    echo "⚠️  V1 (port 3002) - Not responding (may not have /health endpoint)"
fi

# Test V2 health (new)
V2_HEALTH=$(curl -s http://localhost:3010/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ V2 (port 3010) - Healthy"
    echo "   Response: $V2_HEALTH"
else
    echo "❌ V2 (port 3010) - Health check failed"
    echo "Checking logs..."
    pm2 logs payment-api-v2 --lines 20 --nostream
    exit 1
fi

echo ""

# =====================================================
# 10. TEST TENANT RESOLUTION
# =====================================================

echo "🔍 Step 10: Testing tenant resolution..."

TENANT_TEST=$(curl -s -H "X-Tenant-Slug: buatfilm" http://localhost:3010/health 2>/dev/null)
if echo "$TENANT_TEST" | grep -q '"tenant":"buatfilm"'; then
    echo "✅ Tenant resolution working"
    echo "   Response: $TENANT_TEST"
else
    echo "⚠️  Tenant resolution may not be working properly"
    echo "   Response: $TENANT_TEST"
    echo ""
    echo "This is expected if:"
    echo "  1. Database not set up yet"
    echo "  2. BuatFilm tenant not inserted"
    echo "  3. Connection issues"
fi

echo ""

# =====================================================
# 11. VERIFY PM2 STATUS
# =====================================================

echo "📊 Step 11: Verifying PM2 status..."
pm2 list
echo ""

# =====================================================
# 12. CREATE MONITORING SCRIPT
# =====================================================

echo "📊 Step 12: Creating monitoring script..."

cat > /usr/local/bin/check-backend-v2.sh << 'EOFMONITOR'
#!/bin/bash
# Backend V2 Health Monitor

echo "=== Backend V2 Health Check ==="
echo ""

# Check PM2 status
echo "PM2 Status:"
pm2 list | grep -E "payment-api|App name"
echo ""

# Check V2 health endpoint
echo "V1 Health (port 3002):"
if curl -sf http://localhost:3002/health > /dev/null 2>&1; then
    echo "  ✅ Online"
else
    echo "  ⚠️  No response (may not have /health endpoint)"
fi

echo ""
echo "V2 Health (port 3010):"
V2_HEALTH=$(curl -s http://localhost:3010/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "  ✅ Online"
    echo "  $V2_HEALTH"
else
    echo "  ❌ Offline"
fi

echo ""
echo "Tenant Resolution (V2):"
TENANT_TEST=$(curl -s -H "X-Tenant-Slug: buatfilm" http://localhost:3010/health 2>/dev/null)
if echo "$TENANT_TEST" | grep -q "buatfilm"; then
    echo "  ✅ Working"
else
    echo "  ⚠️  Not working (may need database setup)"
fi

echo ""
echo "Recent V2 Logs:"
pm2 logs payment-api-v2 --lines 10 --nostream
EOFMONITOR

chmod +x /usr/local/bin/check-backend-v2.sh

echo "✅ Monitoring script created: /usr/local/bin/check-backend-v2.sh"
echo ""

# =====================================================
# COMPLETION
# =====================================================

echo "═══════════════════════════════════════════════════"
echo "✅ BACKEND V2 DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📋 DEPLOYMENT SUMMARY:"
echo ""
echo "Servers Running:"
echo "  ├─ V1 (SQLite):    http://localhost:3002  (Production traffic)"
echo "  └─ V2 (PostgreSQL): http://localhost:3010  (Testing)"
echo ""
echo "📁 Backups Location: $BACKUP_DIR"
echo "  - payment-server.js.backup_$TIMESTAMP"
echo "  - orders.db.backup_$TIMESTAMP"
echo "  - .env.backup_$TIMESTAMP"
echo ""
echo "🧪 Test Commands:"
echo "  # Test V1 (original)"
echo "  curl http://localhost:3002/payment/create -X POST \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"orderId\":\"TEST-001\",\"amount\":99000,...}'"
echo ""
echo "  # Test V2 (new)"
echo "  curl http://localhost:3010/health"
echo "  curl -H 'X-Tenant-Slug: buatfilm' http://localhost:3010/health"
echo ""
echo "  # Monitor both servers"
echo "  /usr/local/bin/check-backend-v2.sh"
echo ""
echo "📊 PM2 Commands:"
echo "  pm2 list                    # Show all processes"
echo "  pm2 logs payment-api-v2      # View V2 logs"
echo "  pm2 restart payment-api-v2   # Restart V2"
echo "  pm2 stop payment-api-v1      # Stop V1 (when ready)"
echo ""
echo "⚠️  NEXT STEPS:"
echo ""
echo "1. Verify V2 is working:"
echo "   /usr/local/bin/check-backend-v2.sh"
echo ""
echo "2. If V2 health check passes:"
echo "   ✅ Database connection: OK"
echo "   ✅ Tenant resolution: OK"
echo "   ✅ Ready for production!"
echo ""
echo "3. Update nginx to point to V2 (when ready):"
echo "   sudo nano /etc/nginx/sites-available/buatfilm.agentbar.ai"
echo "   Change: proxy_pass http://localhost:3010;"
echo "   Add:   proxy_set_header X-Tenant-Slug buatfilm;"
echo "   sudo nginx -s reload"
echo ""
echo "4. Monitor for 24-48 hours, then:"
echo "   pm2 stop payment-api-v1"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
