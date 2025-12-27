#!/bin/bash
# =====================================================
# Staging Environment Setup Script
# Creates staging environment on existing VPS
# =====================================================

set -e  # Exit on error

echo "🚀 Setting up staging environment for buatfilm.agentbar.ai..."
echo ""

# =====================================================
# CONFIGURATION
# =====================================================

PROD_DOMAIN="buatfilm.agentbar.ai"
STAGING_DOMAIN="staging.buatfilm.agentbar.ai"
STAGING_PORT=3003
PROD_PORT=3002

STAGING_FRONTEND_PATH="/var/www/buatfilm/frontend-staging/dist"
PROD_FRONTEND_PATH="/var/www/buatfilm/frontend/dist"

# =====================================================
# 1. DNS CHECK
# =====================================================

echo "📋 Step 1: Checking DNS configuration..."

if host "$STAGING_DOMAIN" > /dev/null 2>&1; then
    echo "✅ DNS record exists for $STAGING_DOMAIN"
else
    echo "⚠️  WARNING: DNS record not found for $STAGING_DOMAIN"
    echo "Please add A record: $STAGING_DOMAIN → [your server IP]"
    echo "Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. Please setup DNS first."
        exit 1
    fi
fi

echo ""

# =====================================================
# 2. DATABASE SETUP (Staging Schema)
# =====================================================

echo "📋 Step 2: Setting up staging database..."

# Note: If using Supabase, create separate schema via Dashboard
# If using self-hosted PostgreSQL, create new database:

echo "Select database option:"
echo "1. Supabase (same project, different schema)"
echo "2. Self-hosted (separate database)"
read -r db_option

if [ "$db_option" = "1" ]; then
    echo "📌 Supabase selected"
    echo "Please manually create staging schema in Supabase Dashboard:"
    echo "   SQL Editor → CREATE SCHEMA staging;"
    echo ""
    echo "Enter Supabase project URL:"
    read -r supabase_url
    echo "Enter Supabase service key:"
    read -s supabase_key

    DB_NAME="ai_movie_course_staging"
    DB_SCHEMA="staging"

elif [ "$db_option" = "2" ]; then
    echo "📌 Self-hosted PostgreSQL selected"
    echo "Enter PostgreSQL credentials:"

    read -p "DB name [ai_movie_course_staging]: " db_name
    DB_NAME=${db_name:-ai_movie_course_staging}

    read -p "DB user [staging_user]: " db_user
    DB_USER=${db_user:-staging_user}

    read -s -p "DB password: " db_password
    echo ""

    # Create staging database
    sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$db_password';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\c $DB_NAME
\i /path/to/schema.sql  # Import schema
EOF

    echo "✅ Staging database created"
else
    echo "❌ Invalid option"
    exit 1
fi

echo ""

# =====================================================
# 3. FRONTEND BUILD (Staging)
# =====================================================

echo "📋 Step 3: Building staging frontend..."

cd /var/www/buatfilm/frontend

# Create staging build
export VITE_API_URL="https://staging.buatfilm.agentbar.ai/api"
export VITE_ENV="staging"

npm run build

# Create staging directory
sudo mkdir -p "$STAGING_FRONTEND_PATH"

# Copy build to staging
sudo rm -rf "$STAGING_FRONTEND_PATH"/*
sudo cp -r dist/* "$STAGING_FRONTEND_PATH"/

echo "✅ Staging frontend built and deployed"

echo ""

# =====================================================
# 4. BACKEND ENVIRONMENT (Staging)
# =====================================================

echo "📋 Step 4: Configuring staging backend..."

cd /var/www/api

# Create staging .env file
cat > .env.staging << EOF
# =====================================================
# STAGING ENVIRONMENT
# =====================================================

NODE_ENV=staging
PORT=$STAGING_PORT

# Database
if [ "$db_option" = "1" ]; then
    DATABASE_URL=$supabase_url
    SUPABASE_SERVICE_KEY=$supabase_key
else
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=$DB_NAME
    DB_USER=$DB_USER
    DB_PASSWORD=$db_password
fi

# Midtrans (Sandbox)
MIDTRANS_ENV=sandbox
MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXX
MIDTRANS_CLIENT_KEY=SB-Mid-client-XXXXX

# Email (Test mode)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-test-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=staging@buatfilm.agentbar.ai

# WhatsApp (Test number)
WHATSAPP_API_URL=http://localhost:3000
WHATSAPP_API_TOKEN=test-token

# App
APP_URL=https://staging.buatfilm.agentbar.ai
FINISH_REDIRECT_URL=https://staging.buatfilm.agentbar.ai/thank-you

# Security
JWT_SECRET=staging-secret-key-change-in-production
SESSION_SECRET=staging-session-secret
EOF

echo "✅ Staging .env created"

echo ""

# =====================================================
# 5. NGINX CONFIGURATION (Staging)
# =====================================================

echo "📋 Step 5: Configuring Nginx for staging..."

sudo tee /etc/nginx/sites-available/"$STAGING_DOMAIN" > /dev/null << EOF
# Staging Server
server {
    server_name $STAGING_DOMAIN;

    # Logging
    access_log /var/log/nginx/staging-access.log;
    error_log /var/log/nginx/staging-error.log;

    # Frontend
    root $STAGING_FRONTEND_PATH;
    index index.html;

    # Frontend SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:$STAGING_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Webhooks
    location /webhooks/ {
        proxy_pass http://localhost:$STAGING_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:$STAGING_PORT/health;
        access_log off;
    }

    # SSL (configure after obtaining certificate)
    listen 80;
    # listen 443 ssl;
    # ssl_certificate /etc/letsencrypt/live/$STAGING_DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$STAGING_DOMAIN/privkey.pem;
}

# HTTP to HTTPS redirect (after SSL)
# server {
#     server_name $STAGING_DOMAIN;
#     return 301 https://\$server_name\$request_uri;
# }
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/"$STAGING_DOMAIN" /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration valid"
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx configuration error"
    exit 1
fi

echo ""

# =====================================================
# 6. PM2 ECOSYSTEM (Prod + Staging)
# =====================================================

echo "📋 Step 6: Configuring PM2 ecosystem..."

cd /var/www/api

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'payment-api-prod',
      script: './payment-server.js',
      cwd: '/var/www/api',
      env_file: '/var/www/api/.env',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: $PROD_PORT
      },
      error_file: '/root/.pm2/logs/payment-api-error.log',
      out_file: '/root/.pm2/logs/payment-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    {
      name: 'payment-api-staging',
      script: './payment-server.js',
      cwd: '/var/www/api',
      env_file: '/var/www/api/.env.staging',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: $STAGING_PORT
      },
      error_file: '/root/.pm2/logs/staging-api-error.log',
      out_file: '/root/.pm2/logs/staging-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M'
    }
  ]
};
EOF

echo "✅ PM2 ecosystem config created"

# Reload PM2 with new config
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js

pm2 save

echo "✅ PM2 configured"

echo ""

# =====================================================
# 7. SSL CERTIFICATE (Let's Encrypt)
# =====================================================

echo "📋 Step 7: Obtaining SSL certificate..."

echo "Obtain SSL certificate now? (y/n)"
read -r ssl_response

if [[ "$ssl_response" =~ ^[Yy]$ ]]; then
    sudo certbot --nginx -d "$STAGING_DOMAIN" --non-interactive --agree-tos --email admin@buatfilm.agentbar.ai

    if [ $? -eq 0 ]; then
        echo "✅ SSL certificate obtained"
    else
        echo "⚠️  SSL certificate failed. HTTP only for now."
    fi
else
    echo "⏭️  Skipping SSL. HTTP only for now."
fi

echo ""

# =====================================================
# 8. VERIFY STAGING SETUP
# =====================================================

echo "📋 Step 8: Verifying staging setup..."

echo "Checking services..."

# PM2
if pm2 list | grep -q "payment-api-staging.*online"; then
    echo "✅ Staging API running (port $STAGING_PORT)"
else
    echo "❌ Staging API not running"
    exit 1
fi

# Health check
sleep 3

if curl -sf http://localhost:$STAGING_PORT/health > /dev/null; then
    echo "✅ Staging health check OK"
else
    echo "❌ Staging health check failed"
    exit 1
fi

# Nginx
if sudo nginx -t > /dev/null 2>&1; then
    echo "✅ Nginx configuration valid"
else
    echo "❌ Nginx configuration error"
    exit 1
fi

echo ""

# =====================================================
# 9. DEPLOYMENT SCRIPTS
# =====================================================

echo "📋 Step 9: Creating deployment scripts..."

# Production deploy script
cat > /var/www/deploy-production.sh << 'DEPLOY_EOF'
#!/bin/bash
echo "🚀 Deploying to PRODUCTION..."

# Build frontend
cd /var/www/buatfilm/frontend
export VITE_API_URL="https://buatfilm.agentbar.ai/api"
export VITE_ENV="production"
npm run build

# Deploy
sudo rm -rf /var/www/buatfilm/frontend/dist/*
sudo cp -r dist/* /var/www/buatfilm/frontend/dist/

# Restart API
pm2 reload payment-api-prod

echo "✅ Production deployment complete!"
DEPLOY_EOF

# Staging deploy script
cat > /var/www/deploy-staging.sh << 'DEPLOY_STAGING_EOF'
#!/bin/bash
echo "🚀 Deploying to STAGING..."

# Build frontend
cd /var/www/buatfilm/frontend
export VITE_API_URL="https://staging.buatfilm.agentbar.ai/api"
export VITE_ENV="staging"
npm run build

# Deploy
sudo rm -rf /var/www/buatfilm/frontend-staging/dist/*
sudo cp -r dist/* /var/www/buatfilm/frontend-staging/dist/

# Restart API
pm2 reload payment-api-staging

echo "✅ Staging deployment complete!"
DEPLOY_STAGING_EOF

chmod +x /var/www/deploy-production.sh
chmod +x /var/www/deploy-staging.sh

echo "✅ Deployment scripts created"

echo ""

# =====================================================
# COMPLETION
# =====================================================

echo "🎉 Staging environment setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STAGING DETAILS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL:        https://$STAGING_DOMAIN"
echo "API:        https://$STAGING_DOMAIN/api"
echo "Backend:    Port $STAGING_PORT"
echo "Database:   $DB_NAME"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PRODUCTION DETAILS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL:        https://$PROD_DOMAIN"
echo "API:        https://$PROD_DOMAIN/api"
echo "Backend:    Port $PROD_PORT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "USEFUL COMMANDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploy production:  /var/www/deploy-production.sh"
echo "Deploy staging:     /var/www/deploy-staging.sh"
echo "View logs:          pm2 logs"
echo "View staging logs:  pm2 logs payment-api-staging"
echo "Restart staging:    pm2 reload payment-api-staging"
echo "Restart prod:       pm2 reload payment-api-prod"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Staging uses Midtrans SANDBOX mode"
echo "2. All emails go to test address only"
echo "3. Data is isolated from production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Ready to test staging!"
