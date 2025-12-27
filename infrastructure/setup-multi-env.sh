#!/bin/bash
# =====================================================
# Multi-Environment Setup Script
# AgentBar Funnel Platform
# =====================================================
#
# This script sets up:
# - funnelstaging.agentbar.ai (Staging)
# - funnel.agentbar.ai (Production)
# - admin.funnelstaging.agentbar.ai (Admin Staging)
# - admin.funnel.agentbar.ai (Admin Production)
# - buatfilm.agentbar.ai (Pilot Tenant)
#
# Usage: ./setup-multi-env.sh [staging|production|both]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/var/www/funnel-platform"
BACKUP_DIR="/var/backups/funnel-platform"

# Domains
PLATFORM_STAGING="funnelstaging.agentbar.ai"
PLATFORM_PROD="funnel.agentbar.ai"
ADMIN_STAGING="admin.funnelstaging.agentbar.ai"
ADMIN_PROD="admin.funnel.agentbar.ai"
PILOT_TENANT="buatfilm.agentbar.ai"

# Ports
API_STAGING_PORT=3003
API_PROD_PORT=3002
ADMIN_STAGING_PORT=3005
ADMIN_PROD_PORT=3004

# =====================================================
# Helper Functions
# =====================================================

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# =====================================================
# Step 1: Pre-flight Checks
# =====================================================

preflight_checks() {
    print_header "STEP 1: PRE-FLIGHT CHECKS"

    # Check root privileges
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
    print_success "Running as root"

    # Check nginx
    if ! command -v nginx &> /dev/null; then
        print_error "nginx not found. Installing..."
        apt update && apt install nginx -y
    fi
    print_success "nginx is installed"

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 not found. Installing..."
        npm install -g pm2
    fi
    print_success "PM2 is installed"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    print_success "Node.js $(node -v) is installed"

    echo ""
}

# =====================================================
# Step 2: Directory Structure
# =====================================================

create_directory_structure() {
    print_header "STEP 2: CREATING DIRECTORY STRUCTURE"

    # Platform directories
    mkdir -p "$PROJECT_ROOT/frontend/dist"
    mkdir -p "$PROJECT_ROOT/frontend-staging/dist"
    mkdir -p "$PROJECT_ROOT/backend"
    mkdir -p "$PROJECT_ROOT/admin-frontend/dist"
    mkdir -p "$PROJECT_ROOT/admin-frontend-staging/dist"
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/backups"
    mkdir -p "$PROJECT_ROOT/ssl"

    # Create symlinks for current tenant
    mkdir -p "/var/www/buatfilm"

    print_success "Directory structure created"
    echo ""
}

# =====================================================
# Step 3: SSL Certificates (Wildcard)
# =====================================================

setup_ssl() {
    print_header "STEP 3: SETTING UP SSL CERTIFICATES"

    echo -e "${YELLOW}Note: You need a wildcard SSL certificate for *.agentbar.ai${NC}"
    echo ""

    # Check if wildcard cert exists
    if [ -f "/etc/letsencrypt/live/agentbar.ai/fullchain.pem" ]; then
        print_success "Wildcard SSL certificate already exists"
    else
        print_warning "Wildcard SSL not found. You need to obtain one:"
        echo ""
        echo "Option 1: Let's Encrypt with DNS challenge (Cloudflare)"
        echo "  sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/.secrets/certbot-cloudflare.ini -d '*.agentbar.ai' -d 'agentbar.ai'"
        echo ""
        echo "Option 2: Manual DNS verification"
        echo "  sudo certbot certonly --manual -d '*.agentbar.ai' -d 'agentbar.ai'"
        echo ""
        read -p "Have you obtained the wildcard SSL? (y/n) " ssl_done

        if [[ ! "$ssl_done" =~ ^[Yy]$ ]]; then
            print_error "SSL setup required. Please obtain wildcard SSL first."
            exit 1
        fi
    fi

    print_success "SSL certificates configured"
    echo ""
}

# =====================================================
# Step 4: Nginx Configuration
# =====================================================

setup_nginx() {
    print_header "STEP 4: CONFIGURING NGINX"

    # 1. Platform Staging
    cat > /etc/nginx/sites-available/"$PLATFORM_STAGING" << EOF
# Platform Staging: funnelstaging.agentbar.ai
server {
    server_name $PLATFORM_STAGING;

    # Logging
    access_log /var/log/nginx/funnelstaging-access.log;
    error_log /var/log/nginx/funnelstaging-error.log;

    # Frontend
    root $PROJECT_ROOT/frontend-staging/dist;
    index index.html;

    # Frontend SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API Routes
    location /api/ {
        proxy_pass http://localhost:$API_STAGING_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Environment staging;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:$API_STAGING_PORT/health;
        access_log off;
    }

    # SSL
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/agentbar.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agentbar.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}

# HTTP to HTTPS redirect
server {
    server_name $PLATFORM_STAGING;
    return 301 https://\$server_name\$request_uri;
}
EOF

    ln -sf /etc/nginx/sites-available/"$PLATFORM_STAGING" /etc/nginx/sites-enabled/
    print_success "$PLATFORM_STAGING configured"

    # 2. Platform Production
    cat > /etc/nginx/sites-available/"$PLATFORM_PROD" << EOF
# Platform Production: funnel.agentbar.ai
server {
    server_name $PLATFORM_PROD;

    # Logging
    access_log /var/log/nginx/funnelprod-access.log;
    error_log /var/log/nginx/funnelprod-error.log;

    # Frontend
    root $PROJECT_ROOT/frontend/dist;
    index index.html;

    # Frontend SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API Routes
    location /api/ {
        proxy_pass http://localhost:$API_PROD_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Environment production;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:$API_PROD_PORT/health;
        access_log off;
    }

    # SSL
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/agentbar.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agentbar.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}

# HTTP to HTTPS redirect
server {
    server_name $PLATFORM_PROD;
    return 301 https://\$server_name\$request_uri;
}
EOF

    ln -sf /etc/nginx/sites-available/"$PLATFORM_PROD" /etc/nginx/sites-enabled/
    print_success "$PLATFORM_PROD configured"

    # 3. Admin Staging
    cat > /etc/nginx/sites-available/"$ADMIN_STAGING" << EOF
# Admin Staging: admin.funnelstaging.agentbar.ai
server {
    server_name $ADMIN_STAGING;

    # Logging
    access_log /var/log/nginx/admin-funnelstaging-access.log;
    error_log /var/log/nginx/admin-funnelstaging-error.log;

    # Frontend
    root $PROJECT_ROOT/admin-frontend-staging/dist;
    index index.html;

    # Frontend SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Admin API Routes
    location /api/ {
        proxy_pass http://localhost:$ADMIN_STAGING_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Environment staging;
    }

    # SSL
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/agentbar.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agentbar.ai/privkey.pem;
}

# HTTP to HTTPS redirect
server {
    server_name $ADMIN_STAGING;
    return 301 https://\$server_name\$request_uri;
}
EOF

    ln -sf /etc/nginx/sites-available/"$ADMIN_STAGING" /etc/nginx/sites-enabled/
    print_success "$ADMIN_STAGING configured"

    # 4. Admin Production
    cat > /etc/nginx/sites-available/"$ADMIN_PROD" << EOF
# Admin Production: admin.funnel.agentbar.ai
server {
    server_name $ADMIN_PROD;

    # Logging
    access_log /var/log/nginx/admin-funnelprod-access.log;
    error_log /var/log/nginx/admin-funnelprod-error.log;

    # Frontend
    root $PROJECT_ROOT/admin-frontend/dist;
    index index.html;

    # Frontend SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Admin API Routes
    location /api/ {
        proxy_pass http://localhost:$ADMIN_PROD_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Environment production;
    }

    # SSL
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/agentbar.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agentbar.ai/privkey.pem;
}

# HTTP to HTTPS redirect
server {
    server_name $ADMIN_PROD;
    return 301 https://\$server_name\$request_uri;
}
EOF

    ln -sf /etc/nginx/sites-available/"$ADMIN_PROD" /etc/nginx/sites-enabled/
    print_success "$ADMIN_PROD configured"

    # 5. Wildcatch for tenant subdomains
    cat > /etc/nginx/sites-available/tenants.agentbar.ai << EOF
# Tenant Subdomains: *.agentbar.ai
server {
    server_name ~^(?<tenant_subdomain>[^.]+)\.agentbar\.ai$;

    # Exclude platform domains
    set \$exclude_host 0;
    if (\$host ~ ^(funnel|funnelstaging|admin|admin\.funnel|admin\.funnelstaging)\.agentbar\.ai$) {
        set \$exclude_host 1;
    }

    # Process only if not excluded
    location / {
        if (\$exclude_host = 1) {
            return 404;
        }

        # Extract tenant from subdomain
        set \$tenant_slug \$tenant_subdomain;

        # Proxy to tenant handler
        proxy_pass http://localhost:$API_PROD_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Tenant-Slug \$tenant_slug;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API routes (tenant-scoped)
    location /api/ {
        if (\$exclude_host = 1) {
            return 404;
        }

        proxy_pass http://localhost:$API_PROD_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Tenant-Slug \$tenant_slug;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Webhooks
    location /webhooks/ {
        if (\$exclude_host = 1) {
            return 404;
        }

        proxy_pass http://localhost:$API_PROD_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Tenant-Slug \$tenant_slug;
    }

    # SSL
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/agentbar.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agentbar.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
}
EOF

    ln -sf /etc/nginx/sites-available/tenants.agentbar.ai /etc/nginx/sites-enabled/
    print_success "Wildcard tenant subdomains configured"

    # Test nginx configuration
    echo -e "\n${BLUE}Testing nginx configuration...${NC}"
    if nginx -t; then
        print_success "nginx configuration is valid"
        systemctl reload nginx
        print_success "nginx reloaded"
    else
        print_error "nginx configuration error"
        exit 1
    fi

    echo ""
}

# =====================================================
# Step 5: PM2 Ecosystem Configuration
# =====================================================

setup_pm2() {
    print_header "STEP 5: CONFIGURING PM2 ECOSYSTEM"

    cat > "$PROJECT_ROOT/backend/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    // ==========================
    // STAGING ENVIRONMENT
    // ==========================

    {
      name: 'funnel-api-staging',
      script: './platform-server.js',
      cwd: '\$__dirname',
      env_file: '\$__dirname/.env.staging',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: $API_STAGING_PORT,
        ENVIRONMENT: 'staging'
      },
      error_file: '\$__dirname/../logs/funnel-staging-error.log',
      out_file: '\$__dirname/../logs/funnel-staging-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M'
    },

    {
      name: 'funnel-admin-staging',
      script: './admin-server.js',
      cwd: '\$__dirname',
      env_file: '\$__dirname/.env.staging',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: $ADMIN_STAGING_PORT,
        ENVIRONMENT: 'staging'
      },
      error_file: '\$__dirname/../logs/admin-staging-error.log',
      out_file: '\$__dirname/../logs/admin-staging-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M'
    },

    // ==========================
    // PRODUCTION ENVIRONMENT
    // ==========================

    {
      name: 'funnel-api-prod',
      script: './platform-server.js',
      cwd: '\$__dirname',
      env_file: '\$__dirname/.env.production',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: $API_PROD_PORT,
        ENVIRONMENT: 'production'
      },
      error_file: '\$__dirname/../logs/funnel-prod-error.log',
      out_file: '\$__dirname/../logs/funnel-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },

    {
      name: 'funnel-admin-prod',
      script: './admin-server.js',
      cwd: '\$__dirname',
      env_file: '\$__dirname/.env.production',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: $ADMIN_PROD_PORT,
        ENVIRONMENT: 'production'
      },
      error_file: '\$__dirname/../logs/admin-prod-error.log',
      out_file: '\$__dirname/../logs/admin-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M'
    }
  ]
};
EOF

    print_success "PM2 ecosystem configuration created"
    echo ""
}

# =====================================================
# Step 6: Environment Files
# =====================================================

setup_env_files() {
    print_header "STEP 6: CREATING ENVIRONMENT FILES"

    # Staging environment
    cat > "$PROJECT_ROOT/backend/.env.staging" << EOF
# =====================================================
# STAGING ENVIRONMENT
# =====================================================

NODE_ENV=staging
ENVIRONMENT=staging

# Database
DB_HOST=your-staging-db.supabase.co
DB_PORT=5432
DB_NAME=agentbar_funnel_staging
DB_USER=postgres
DB_PASSWORD=your-staging-db-password

# Midtrans Sandbox
MIDTRANS_ENV=sandbox
MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXX
MIDTRANS_CLIENT_KEY=SB-Mid-client-XXXXX

# Email (Test mode)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-test@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=staging@agentbar.ai

# WhatsApp (Test)
WA_API_URL=http://localhost:3000
WA_API_TOKEN=test-token
WA_SENDER=6281234567890

# Platform URLs
PLATFORM_URL=https://funnelstaging.agentbar.ai
ADMIN_URL=https://admin.funnelstaging.agentbar.ai

# Security
JWT_SECRET=staging-secret-key-change-in-production
SESSION_SECRET=staging-session-secret

# Feature Flags
DEBUG=true
VERBOSE_LOGGING=true
MOCK_PAYMENT=false
EOF

    print_success ".env.staging created"

    # Production environment
    cat > "$PROJECT_ROOT/backend/.env.production" << EOF
# =====================================================
# PRODUCTION ENVIRONMENT
# =====================================================

NODE_ENV=production
ENVIRONMENT=production

# Database
DB_HOST=your-prod-db.supabase.co
DB_PORT=5432
DB_NAME=agentbar_funnel_prod
DB_USER=postgres
DB_PASSWORD=your-prod-db-password

# Midtrans Production
MIDTRANS_ENV=production
MIDTRANS_SERVER_KEY=Mid-server-XXXXX
MIDTRANS_CLIENT_KEY=Mid-client-XXXXX

# Email (Production)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=hello@agentbar.ai
EMAIL_PASS=your-app-password
EMAIL_FROM=info@agentbar.ai

# WhatsApp (Production)
WA_API_URL=https://wa.agentbar.ai
WA_API_TOKEN=prod-token-secure
WA_SENDER=6281234567890

# Platform URLs
PLATFORM_URL=https://funnel.agentbar.ai
ADMIN_URL=https://admin.funnel.agentbar.ai

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-super-secret-session-key

# Feature Flags
DEBUG=false
VERBOSE_LOGGING=false
MOCK_PAYMENT=false
EOF

    print_success ".env.production created"

    echo -e "${YELLOW}⚠️  IMPORTANT: Update the environment files with real credentials!${NC}"
    echo ""
}

# =====================================================
# Step 7: Deployment Scripts
# =====================================================

create_deployment_scripts() {
    print_header "STEP 7: CREATING DEPLOYMENT SCRIPTS"

    # Deploy platform staging
    cat > "$PROJECT_ROOT/deploy-platform-staging.sh" << 'EOF'
#!/bin/bash
echo "🚀 Deploying to PLATFORM STAGING..."

cd /var/www/funnel-platform/frontend-staging
export VITE_API_URL=https://funnelstaging.agentbar.ai/api
export VITE_ENV=staging
npm run build

sudo rm -rf /var/www/funnel-platform/frontend-staging/dist/*
sudo cp -r dist/* /var/www/funnel-platform/frontend-staging/dist/

pm2 reload funnel-api-staging
pm2 reload funnel-admin-staging

echo "✅ Platform staging deployment complete!"
EOF

    # Deploy platform production
    cat > "$PROJECT_ROOT/deploy-platform-prod.sh" << 'EOF'
#!/bin/bash
echo "🚀 Deploying to PLATFORM PRODUCTION..."

cd /var/www/funnel-platform/frontend
export VITE_API_URL=https://funnel.agentbar.ai/api
export VITE_ENV=production
npm run build

sudo rm -rf /var/www/funnel-platform/frontend/dist/*
sudo cp -r dist/* /var/www/funnel-platform/frontend/dist/

pm2 reload funnel-api-prod
pm2 reload funnel-admin-prod

echo "✅ Platform production deployment complete!"
EOF

    # Deploy tenant (buatfilm)
    cat > "$PROJECT_ROOT/deploy-tenant.sh" << 'EOF'
#!/bin/bash
TENANT_SLUG=$1
ENVIRONMENT=$2

if [ -z "$TENANT_SLUG" ] || [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./deploy-tenant.sh [tenant_slug] [staging|production]"
    exit 1
fi

echo "🚀 Deploying tenant: $TENANT_SLUG ($ENVIRONMENT)..."

if [ "$ENVIRONMENT" = "staging" ]; then
    FRONTEND_DIR="/var/www/funnel-platform/tenants/$TENANT_SLUG-staging"
    API_URL="https://funnelstaging.agentbar.ai/api"
else
    FRONTEND_DIR="/var/www/funnel-platform/tenants/$TENANT_SLUG"
    API_URL="https://funnel.agentbar.ai/api"
fi

cd "$FRONTEND_DIR"
export VITE_API_URL=$API_URL
export VITE_TENANT_SLUG=$TENANT_SLUG
export VITE_ENV=$ENVIRONMENT
npm run build

sudo rm -rf ${FRONTEND_DIR}/dist/*
sudo cp -r dist/* ${FRONTEND_DIR}/dist/

echo "✅ Tenant $TENANT_SLUG deployment complete!"
EOF

    chmod +x "$PROJECT_ROOT"/deploy-*.sh
    print_success "Deployment scripts created"
    echo ""
}

# =====================================================
# Step 8: Backup Scripts
# =====================================================

create_backup_scripts() {
    print_header "STEP 8: CREATING BACKUP SCRIPTS"

    cat > "$PROJECT_ROOT/backup.sh" << 'EOF'
#!/bin/bash
# Backup AgentBar Funnel Platform

BACKUP_DIR="/var/backups/funnel-platform"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "📦 Starting backup..."

# Database backup (if using Supabase, use their backup)
# This is for additional safety

# Backup environment files
tar -czf "$BACKUP_DIR/env_$DATE.tar.gz" \
    /var/www/funnel-platform/backend/.env.* \
    /etc/nginx/sites-available/*agentbar.ai* \
    2>/dev/null

# Backup tenant data
tar -czf "$BACKUP_DIR/tenants_$DATE.tar.gz" \
    /var/www/funnel-platform/tenants \
    2>/dev/null

echo "✅ Backup complete: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
EOF

    chmod +x "$PROJECT_ROOT/backup.sh"
    print_success "Backup script created"
    echo ""
}

# =====================================================
# Final Summary
# =====================================================

print_summary() {
    print_header "🎉 MULTI-ENVIRONMENT SETUP COMPLETE!"

    echo ""
    echo -e "${GREEN}Environments Configured:${NC}"
    echo ""
    echo "┌─────────────────────────────────────────────────────────┐"
    echo "│ Layer              │ Staging                            │ Production                    │"
    echo "├─────────────────────────────────────────────────────────┤"
    echo "│ Platform           │ funnelstaging.agentbar.ai        │ funnel.agentbar.ai             │"
    echo "│ Admin              │ admin.funnelstaging.agentbar.ai  │ admin.funnel.agentbar.ai      │"
    echo "│ Tenant (BuatFilm)  │ BuatFilm (staging mode)         │ buatfilm.agentbar.ai          │"
    echo "│ Database           │ agentbar_funnel_staging          │ agentbar_funnel_prod           │"
    echo "│ Payment            │ Midtrans Sandbox                 │ Midtrans Production            │"
    echo "│ Email              │ Internal/test                    │ Real customers                 │"
    echo "│ WhatsApp           │ Test number                      │ Real number                    │"
    echo "└─────────────────────────────────────────────────────────┘"
    echo ""

    echo -e "${GREEN}Next Steps:${NC}"
    echo ""
    echo "1. Update environment files with real credentials:"
    echo "   nano /var/www/funnel-platform/backend/.env.staging"
    echo "   nano /var/www/funnel-platform/backend/.env.production"
    echo ""
    echo "2. Start PM2 processes:"
    echo "   cd /var/www/funnel-platform/backend"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 save"
    echo ""
    echo "3. Deploy frontends:"
    echo "   ./deploy-platform-staging.sh"
    echo "   ./deploy-platform-prod.sh"
    echo ""
    echo "4. Check status:"
    echo "   pm2 status"
    echo "   pm2 logs"
    echo ""
    echo -e "${YELLOW}Important Files:${NC}"
    echo "  - PM2 ecosystem: /var/www/funnel-platform/backend/ecosystem.config.js"
    echo "  - Nginx configs: /etc/nginx/sites-available/*agentbar.ai"
    echo "  - Env files: /var/www/funnel-platform/backend/.env.*"
    echo "  - Logs: /var/www/funnel-platform/logs/"
    echo "  - Backups: /var/backups/funnel-platform/"
    echo ""
}

# =====================================================
# Main Execution
# =====================================================

main() {
    print_header "AGENTBAR FUNNEL PLATFORM - MULTI-ENVIRONMENT SETUP"

    preflight_checks
    create_directory_structure
    setup_ssl
    setup_nginx
    setup_pm2
    setup_env_files
    create_deployment_scripts
    create_backup_scripts
    print_summary

    echo -e "${GREEN}✨ Setup complete! Your multi-environment platform is ready.${NC}"
    echo ""
}

# Run main function
main "$@"
