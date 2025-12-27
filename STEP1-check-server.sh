#!/bin/bash
# =====================================================
# STEP 1: CHECK SERVER & PREPARE FOR DEPLOYMENT
# Run this on your LOCAL machine
# =====================================================

echo "═══════════════════════════════════════════════════"
echo "🔍 STEP 1: CHECKING buatfilm.agentbar.ai"
echo "═══════════════════════════════════════════════════"
echo ""

# Server info
SERVER="root@31.97.220.37"

echo "📡 Connecting to server..."
echo ""

# Check server info
ssh -o StrictHostKeyChecking=no $SERVER << 'EOF'
echo "=== SERVER INFORMATION ==="
hostname
uname -a
echo ""

echo "=== UPTIME ==="
uptime
echo ""

echo "=== DISK SPACE ==="
df -h /
echo ""

echo "=== MEMORY ==="
free -h
echo ""

echo "=== PM2 PROCESSES ==="
pm2 list
echo ""

echo "=== CURRENT API DIRECTORY ==="
ls -la /var/www/api/ | head -20
echo ""

echo "=== CHECK IF PostgreSQL EXISTS ==="
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL is installed"
    psql --version
else
    echo "❌ PostgreSQL NOT installed"
fi
echo ""

echo "=== CHECK NODE VERSION ==="
node --version
npm --version
echo ""

echo "=== CHECK NGINX ==="
nginx -v 2>&1
echo ""
EOF

echo "═══════════════════════════════════════════════════"
echo "✅ STEP 1 COMPLETE!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📋 Copy the output above and paste it back to Claude"
