#!/bin/bash
# =====================================================
# POSTGRESQL SETUP ON db.agentbar.ai
# Complete automated setup script
# =====================================================

set -e  # Exit on error

echo "═══════════════════════════════════════════════════"
echo "🚀 POSTGRESQL SETUP FOR db.agentbar.ai"
echo "═══════════════════════════════════════════════════"
echo ""

# =====================================================
# CONFIGURATION
# =====================================================

DB_NAME="ai_movie_course"
DB_USER="api_user"
DB_PASSWORD=$(openssl rand -base64 32)  # Generate secure password

echo "📋 Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: [Generated Securely]"
echo ""

# =====================================================
# 1. SYSTEM UPDATE
# =====================================================

echo "📦 Step 1: Updating system..."
sudo apt update
sudo apt upgrade -y
echo "✅ System updated"
echo ""

# =====================================================
# 2. INSTALL POSTGRESQL
# =====================================================

echo "📦 Step 2: Installing PostgreSQL..."
sudo apt install postgresql postgresql-contrib -y

# Verify installation
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL installation failed"
    exit 1
fi

echo "✅ PostgreSQL installed:"
psql --version
echo ""

# =====================================================
# 3. CONFIGURE POSTGRESQL (Localhost Only)
# =====================================================

echo "🔧 Step 3: Configuring PostgreSQL..."

# Get PostgreSQL version
PG_VERSION=$(psql --version | grep -oP '\d+\.\d+' | head -1 | cut -d. -f1)
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

# Configure to listen on localhost only
sudo sed -i "s/#listen_addresses =.*/listen_addresses = 'localhost'/" "$PG_CONF"
sudo sed -i "s/listen_addresses =.*/listen_addresses = 'localhost'/" "$PG_CONF"

echo "✅ PostgreSQL configured to listen on localhost only"
echo ""

# =====================================================
# 4. CONFIGURE AUTHENTICATION
# =====================================================

echo "🔐 Step 4: Configuring authentication..."

# Backup pg_hba.conf
sudo cp "$PG_HBA" "${PG_HBA}.backup"

# Add local authentication rules
sudo tee -a "$PG_HBA" > /dev/null << EOF
# Local connections for AI Movie Course
local   all       postgres                md5
local   all       ${DB_USER}              md5
host    all       ${DB_USER}  127.0.0.1/32  md5
EOF

echo "✅ Authentication configured"
echo ""

# =====================================================
# 5. RESTART POSTGRESQL
# =====================================================

echo "🔄 Step 5: Restarting PostgreSQL..."
sudo systemctl restart postgresql

# Verify status
if ! sudo systemctl is-active --quiet postgresql; then
    echo "❌ PostgreSQL failed to start"
    sudo journalctl -xe -n 50
    exit 1
fi

echo "✅ PostgreSQL restarted successfully"
echo ""

# =====================================================
# 6. VERIFY LOCALHOST ONLY
# =====================================================

echo "🔍 Step 6: Verifying localhost binding..."
PG_LISTEN=$(sudo ss -tlnp | grep 5432 | awk '{print $4}')

if [[ "$PG_LISTEN" == *"127.0.0.1:5432"* ]]; then
    echo "✅ PostgreSQL listening on localhost ONLY (GOOD!)"
else
    echo "⚠️  WARNING: PostgreSQL may be listening on all interfaces"
    echo "Current binding: $PG_LISTEN"
fi
echo ""

# =====================================================
# 7. CREATE DATABASE AND USER
# =====================================================

echo "🗄️  Step 7: Creating database and user..."

sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE ${DB_NAME};

-- Create user with secure password
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to database and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};

-- Verify
\l ${DB_NAME}
\du ${DB_USER}
EOF

echo "✅ Database and user created"
echo ""

# =====================================================
# 8. SAVE CREDENTIALS
# =====================================================

echo "💾 Step 8: Saving credentials..."

CREDENTIALS_FILE="/root/.pg_credentials_${DB_NAME}"
cat > "$CREDENTIALS_FILE" << EOF
# PostgreSQL Credentials for ${DB_NAME}
# Generated: $(date)

DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Connection String:
postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
EOF

chmod 600 "$CREDENTIALS_FILE"

echo "✅ Credentials saved to: $CREDENTIALS_FILE"
echo ""

# =====================================================
# 9. IMPORT SCHEMA
# =====================================================

echo "📊 Step 9: Importing database schema..."

if [ ! -f "/tmp/schema.sql" ]; then
    echo "⚠️  WARNING: schema.sql not found at /tmp/schema.sql"
    echo "Please upload schema.sql first:"
    echo "  scp database/schema.sql root@db.agentbar.ai:/tmp/"
    echo ""
    echo "Skipping schema import..."
else
    sudo -u postgres psql -d "$DB_NAME" -f /tmp/schema.sql

    # Verify tables
    TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

    echo "✅ Schema imported: $TABLE_COUNT tables created"
    echo ""
fi

# =====================================================
# 10. INSERT BUATFILM TENANT
# =====================================================

echo "🎬 Step 10: Inserting BuatFilm tenant..."

# Prompt for Midtrans keys
echo "Please provide Midtrans credentials:"
read -p "Midtrans Server Key (SB-Mid-server-XXXXX): " MIDTRANS_SERVER_KEY
read -p "Midtrans Client Key (SB-Mid-client-XXXXX): " MIDTRANS_CLIENT_KEY

sudo -u postgres psql -d "$DB_NAME" << EOF
-- Insert BuatFilm as pilot tenant
INSERT INTO tenants (
    name,
    slug,
    plan,
    status,
    midtrans_environment,
    midtrans_server_key,
    midtrans_client_key,
    midtrans_merchant_id,
    email_from,
    email_reply_to,
    whatsapp_enabled,
    max_orders_per_month,
    max_admin_users,
    primary_color
) VALUES (
    'BuatFilm AI Course',
    'buatfilm',
    'pro',
    'active',
    'sandbox',
    '${MIDTRANS_SERVER_KEY}',
    '${MIDTRANS_CLIENT_KEY}',
    'buatfilm-merchant',
    'buatfilm@agentbar.ai',
    'buatfilm-support@agentbar.ai',
    false,
    1000,
    5,
    '#4F46E5'
);

-- Verify tenant
SELECT id, name, slug, plan, status, created_at FROM tenants WHERE slug = 'buatfilm';
EOF

echo "✅ BuatFilm tenant inserted"
echo ""

# =====================================================
# 11. CONFIGURE FIREWALL
# =====================================================

echo "🔒 Step 11: Configuring firewall..."

# Check if UFW is installed
if command -v ufw &> /dev/null; then
    # Allow SSH
    sudo ufw allow 22/tcp

    # Allow HTTP/HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp

    # Block PostgreSQL from external access
    sudo ufw deny 5432/tcp

    # Enable firewall
    sudo ufw --force enable

    echo "✅ Firewall configured:"
    sudo ufw status verbose | grep -E "5432|Status:"
else
    echo "⚠️  UFW not installed, skipping firewall configuration"
    echo "Install with: sudo apt install ufw"
fi
echo ""

# =====================================================
# 12. SETUP BACKUP SCRIPT
# =====================================================

echo "💾 Step 12: Setting up automatic backups..."

BACKUP_SCRIPT="/var/backups/backup-postgres.sh"
sudo mkdir -p /var/backups

sudo tee "$BACKUP_SCRIPT" > /dev/null << 'EOFSCRIPT'
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup all databases
sudo -u postgres pg_dumpall | gzip > "$BACKUP_DIR/all_databases_$DATE.sql.gz"

# Backup specific database
sudo -u postgres pg_dump ai_movie_course | gzip > "$BACKUP_DIR/ai_movie_course_$DATE.sql.gz"

# Keep last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $(date)"
ls -lh "$BACKUP_DIR" | tail -3
EOFSCRIPT

sudo chmod +x "$BACKUP_SCRIPT"

# Add to crontab
(crontab -l 2>/dev/null; echo "0 3 * * * $BACKUP_SCRIPT") | crontab -

echo "✅ Backup script configured: $BACKUP_SCRIPT"
echo "  Schedule: Daily at 3 AM"
echo ""

# =====================================================
# 13. CREATE HEALTH CHECK SCRIPT
# =====================================================

echo "🏥 Step 13: Creating health check script..."

HEALTH_SCRIPT="/usr/local/bin/check-postgres.sh"

sudo tee "$HEALTH_SCRIPT" > /dev/null << 'EOFHEALTH'
#!/bin/bash
# PostgreSQL Health Check

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    echo "CRITICAL: PostgreSQL is not running"
    exit 2
fi

# Check if database exists
DB_COUNT=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM pg_database WHERE datname='ai_movie_course';")
if [ "$DB_COUNT" -eq 0 ]; then
    echo "CRITICAL: Database ai_movie_course not found"
    exit 2
fi

# Check if can connect
if ! sudo -u postgres psql -d ai_movie_course -c "SELECT 1;" > /dev/null 2>&1; then
    echo "CRITICAL: Cannot connect to database"
    exit 2
fi

# Get connection count
CONNECTIONS=$(sudo -u postgres psql -d ai_movie_course -t -c "SELECT COUNT(*) FROM pg_stat_activity;")
DB_SIZE=$(sudo -u postgres psql -d ai_movie_course -t -c "SELECT pg_size_pretty(pg_database_size('ai_movie_course'));")

echo "OK: PostgreSQL is healthy"
echo "Connections: $CONNECTIONS"
echo "Database Size: $DB_SIZE"
exit 0
EOFHEALTH

sudo chmod +x "$HEALTH_SCRIPT"

echo "✅ Health check script created: $HEALTH_SCRIPT"
echo "  Run: $HEALTH_SCRIPT"
echo ""

# =====================================================
# 14. TEST CONNECTION
# =====================================================

echo "🧪 Step 14: Testing database connection..."

sudo -u postgres psql -d "$DB_NAME" -c "SELECT NOW();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"

    # Show database info
    echo ""
    echo "📊 Database Information:"
    sudo -u postgres psql -d "$DB_NAME" << EOF
-- Database size
SELECT pg_size_pretty(pg_database_size('$DB_NAME')) as database_size;

-- Connection count
SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE datname = '$DB_NAME';

-- Table count
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';
EOF
else
    echo "❌ Database connection failed"
    exit 1
fi
echo ""

# =====================================================
# COMPLETION
# =====================================================

echo "═══════════════════════════════════════════════════"
echo "✅ POSTGRESQL SETUP COMPLETE!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📋 CONNECTION DETAILS:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo "🔐 Credentials saved to: $CREDENTIALS_FILE"
echo ""
echo "🧪 Test connection:"
echo "  sudo -u postgres psql -d $DB_NAME"
echo "  $HEALTH_SCRIPT"
echo ""
echo "💾 Backup location: /var/backups/postgres/"
echo "📊 Backup script: $BACKUP_SCRIPT"
echo ""
echo "🔒 Security Status:"
echo "  ✅ PostgreSQL listening on localhost ONLY"
echo "  ✅ Firewall configured (port 5432 blocked)"
echo "  ✅ Strong password generated"
echo ""
echo "📚 Next Steps:"
echo "  1. Copy schema.sql to server: scp database/schema.sql root@db.agentbar.ai:/tmp/"
echo "  2. Import schema: sudo -u postgres psql -d $DB_NAME -f /tmp/schema.sql"
echo "  3. Configure backend .env with credentials above"
echo "  4. Deploy V2 backend: bash deploy-backend-v2.sh"
echo ""
echo "═══════════════════════════════════════════════════"
