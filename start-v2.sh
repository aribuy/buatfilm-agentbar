#!/bin/bash
# =====================================================
# START V2 SERVER - Run this on the server
# =====================================================

cd /var/www/api

echo "=== STARTING V2 ON PORT 3010 ==="

# Stop any existing V2
pm2 delete payment-api-v2 2>/dev/null || true

# Start V2 on port 3010
PORT=3010 pm2 start payment-server-v2.js --name payment-api-v2

# Save PM2 config
pm2 save

# Wait for startup
sleep 3

echo ""
echo "=== TESTING V2 ==="
curl -s http://localhost:3010/health
echo ""

echo "=== TESTING TENANT RESOLUTION ==="
curl -s -H "X-Tenant-Slug: buatfilm" http://localhost:3010/health
echo ""

echo "=== PM2 STATUS ==="
pm2 list | grep payment

echo ""
echo "✅ V2 Started!"
echo "Port: 3010"
echo "Logs: pm2 logs payment-api-v2"
