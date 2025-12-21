#!/bin/bash

echo "🚀 Deploying buatfilm.agentbar.ai..."

# Build production
echo "📦 Building production..."
cd frontend
npm run build

# Deploy to server (manual step)
echo "📤 Ready for deployment!"
echo ""
echo "Manual deployment steps:"
echo "1. Upload frontend/dist/ folder to server"
echo "2. Point buatfilm.agentbar.ai to dist/ folder"
echo "3. Configure SSL certificate"
echo ""
echo "Files ready in: frontend/dist/"
echo "- index.html"
echo "- assets/index-*.css"
echo "- assets/index-*.js"
echo ""
echo "✅ Production build complete!"

# Show deployment info
echo ""
echo "🌐 Deployment Info:"
echo "Domain: buatfilm.agentbar.ai"
echo "Backend: api.agentbar.ai"
echo "Repository: https://github.com/aribuy/buatfilm-agentbar"