#!/bin/bash
# =====================================================
# COMPLETE REMOTE DEPLOYMENT SCRIPT
# Run this from your LOCAL machine
# =====================================================

set -e

SERVER="root@31.97.220.37"
PASSWORD="Qazwsx123.Qazwsx123."
PROJECT_DIR="/Users/endik/PyCharmMiscProject/ai-movie-course-integrated"

echo "═══════════════════════════════════════════════════"
echo "🚀 COMPLETE DEPLOYMENT TO buatfilm.agentbar.ai"
echo "═══════════════════════════════════════════════════"
echo ""

# =====================================================
# STEP 1: CHECK SERVER
# =====================================================

echo "📋 Step 1: Checking server..."
echo ""

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
echo "Hostname: $(hostname)"
echo "Uptime: $(uptime)"
echo ""

echo "PM2 Processes:"
pm2 list
echo ""

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""

echo "Disk space:"
df -h / | head -2
echo ""

echo "Memory:"
free -h | head -2
echo ""

echo "API Directory:"
ls -la /var/www/api/ 2>/dev/null | head -10 || echo "Directory not found"
EOF

echo ""
echo "✅ Server check complete"
echo ""

# =====================================================
# STEP 2: CHECK IF POSTGRESQL INSTALLED
# =====================================================

echo "📋 Step 2: Checking PostgreSQL..."
echo ""

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "which psql && psql --version" 2>/dev/null && echo "✅ PostgreSQL installed" || echo "❌ PostgreSQL NOT installed"

echo ""

# =====================================================
# STEP 3: UPLOAD FILES
# =====================================================

echo "📦 Step 3: Uploading V2 files..."
echo ""

FILES_TO_UPLOAD=(
    "backend/payment-server-v2.js:/var/www/api/"
    "backend/db-postgres.js:/var/www/api/"
    "backend/repositories/ordersRepository.js:/var/www/api/repositories/"
    "backend/services/tenantService.js:/var/www/api/services/"
    "backend/middleware/tenantResolver.js:/var/www/api/middleware/"
    "backend/deploy-backend-v2.sh:/root/"
    "database/schema.sql:/tmp/"
)

for file in "${FILES_TO_UPLOAD[@]}"; do
    LOCAL="${file%%:*}"
    REMOTE="${file##*:}"

    echo "Uploading: $LOCAL → $REMOTE"
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no "$PROJECT_DIR/$LOCAL" "$SERVER:$REMOTE"
done

echo ""
echo "✅ All files uploaded"
echo ""

# =====================================================
# STEP 4: INSTALL PG PACKAGE
# =====================================================

echo "📦 Step 4: Installing PostgreSQL client..."
echo ""

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
cd /var/www/api

# Check if pg already installed
if npm list pg 2>/dev/null | grep -q "pg@"; then
    echo "✅ pg already installed"
else
    echo "Installing pg package..."
    npm install pg
    echo "✅ pg installed"
fi
EOF

echo ""

# =====================================================
# STEP 5: CREATE DEPLOYMENT SCRIPT ON SERVER
# =====================================================

echo "📝 Step 5: Creating deployment script on server..."
echo ""

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
cat > /tmp/deploy-v2-local.sh << 'DEPLOYSCRIPT'
#!/bin/bash
set -e

echo "=== DEPLOYING V2 BACKEND ==="

API_DIR="/var/www/api"
cd "$API_DIR"

# Backup
echo "Backing up files..."
cp .env .env.backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Add database config to .env
if ! grep -q "DB_TYPE=" .env 2>/dev/null; then
    echo ""
    echo "# ====================================================="
    echo "# POSTGRESQL DATABASE CONFIGURATION"
    echo "# ====================================================="
    echo "DB_TYPE=postgresql"
    echo "DB_HOST=localhost"
    echo "DB_PORT=5432"
    echo "DB_NAME=ai_movie_course"
    echo "DB_USER=api_user"
    echo "DB_PASSWORD=change_this_password"
    echo "" >> .env
fi

echo "✅ Deployment script ready"
echo ""
echo "Next steps:"
echo "1. Setup PostgreSQL first (if not installed)"
echo "2. Run: cd /var/www/api && node payment-server-v2.js"
echo "3. Or use PM2: pm2 start payment-server-v2.js --name payment-api-v2"
DEPLOYSCRIPT

chmod +x /tmp/deploy-v2-local.sh
echo "✅ Deployment script created"
EOF

echo ""

# =====================================================
# STEP 6: SUMMARY
# =====================================================

echo "═══════════════════════════════════════════════════"
echo "✅ FILES UPLOADED SUCCESSFULLY!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📋 Uploaded Files:"
echo "  ✅ payment-server-v2.js"
echo "  ✅ db-postgres.js"
echo "  ✅ repositories/ordersRepository.js"
echo "  ✅ services/tenantService.js"
echo "  ✅ middleware/tenantResolver.js"
echo "  ✅ deploy-backend-v2.sh"
echo "  ✅ schema.sql"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. SSH to server:"
echo "   ssh root@31.97.220.37"
echo ""
echo "2. Check uploaded files:"
echo "   ls -la /var/www/api/payment-server-v2.js"
echo "   ls -la /tmp/schema.sql"
echo ""
echo "3. Setup PostgreSQL (if not installed):"
echo "   apt update && apt install postgresql postgresql-contrib -y"
echo ""
echo "4. Configure database:"
echo "   - Create database"
echo "   - Create user"
echo "   - Import schema"
echo ""
echo "5. Start V2 server:"
echo "   cd /var/www/api"
echo "   node payment-server-v2.js"
echo ""
echo "6. Or use PM2:"
echo "   pm2 start payment-server-v2.js --name payment-api-v2"
echo ""
echo "═══════════════════════════════════════════════════"
