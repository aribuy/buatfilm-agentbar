#!/bin/bash

# 🚀 VS Code Deployment Script for buatfilm.agentbar.ai
# Server: srv941062.hstgr.cloud
# Domain: buatfilm.agentbar.ai

echo "🎬 Deploying AI Movie Course to buatfilm.agentbar.ai..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Deploy to server
echo "🚀 Uploading to server..."
scp -i ~/.ssh/agentbar_key -r frontend/dist/* root@srv941062.hstgr.cloud:/var/www/buatfilm.agentbar.ai/

# Set permissions
echo "🔧 Setting permissions..."
ssh -i ~/.ssh/agentbar_key root@srv941062.hstgr.cloud "chown -R www-data:www-data /var/www/buatfilm.agentbar.ai/"
ssh -i ~/.ssh/agentbar_key root@srv941062.hstgr.cloud "chmod -R 755 /var/www/buatfilm.agentbar.ai/"

echo "✅ Deployment complete!"
echo "🌐 Visit: https://buatfilm.agentbar.ai"