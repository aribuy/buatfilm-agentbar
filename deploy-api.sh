#!/bin/bash

echo "🚀 Deploying Payment API to server..."

# Upload backend files
scp -i ~/.ssh/agentbar_key -r backend/* root@srv941062.hstgr.cloud:/var/www/api/

# Install dependencies and start
ssh -i ~/.ssh/agentbar_key root@srv941062.hstgr.cloud "
  cd /var/www/api
  npm install
  pm2 stop payment-api || true
  pm2 start payment-server.js --name payment-api
  pm2 save
"

echo "✅ Payment API deployed!"