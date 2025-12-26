#!/bin/bash
###############################################################################
# PHASE 3: OBSERVABILITY
# Duration: 2 hours
# Downtime: ZERO
###############################################################################

set -e

echo "=================================================="
echo "📊 PHASE 3: OBSERVABILITY"
echo "=================================================="
echo ""

echo "=================================================="
echo "Step 1: Installing Logging Dependencies"
echo "=================================================="
cd backend
npm install pino pino-pretty
cd ..
echo "✅ Logging packages installed"
echo ""

echo "=================================================="
echo "Step 2: Creating Structured Logger"
echo "=================================================="
cat > backend/lib/logger.js << 'EOF'
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
      singleLine: false
    }
  },
  base: {
    service: 'buatfilm-payment-api',
    environment: process.env.NODE_ENV || 'production'
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  }
});

module.exports = logger;
EOF
echo "✅ Created: backend/lib/logger.js"
echo ""

echo "=================================================="
echo "Step 3: Creating Health Check Routes"
echo "=================================================="
cat > backend/routes/health.js << 'EOF'
const express = require('express');
const router = express.Router();
const database = require('../database');
const logger = require('../lib/logger');

router.get('/health', async (req, res) => {
  const checks = {
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    status: 'healthy',
    service: 'buatfilm-payment-api'
  };

  try {
    // Check database
    await database.raw('SELECT 1');
    checks.database = { status: 'healthy', message: 'Connection OK' };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  logger.info({ health_check: checks }, 'Health check performed');
  res.status(statusCode).json(checks);
});

router.get('/health/ready', async (req, res) => {
  try {
    await database.raw('SELECT 1');
    res.status(200).json({
      ready: true,
      message: 'System ready to accept requests'
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      message: 'System not ready',
      error: error.message
    });
  }
});

router.get('/health/live', (req, res) => {
  res.status(200).json({
    alive: true,
    uptime: Math.floor(process.uptime())
  });
});

module.exports = router;
EOF
echo "✅ Created: backend/routes/health.js"
echo ""

echo "=================================================="
echo "Step 4: Creating PM2 Ecosystem Config"
echo "=================================================="
cat > backend/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'payment-api',
    script: './payment-server.js',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
EOF
echo "✅ Created: backend/ecosystem.config.js"
echo ""

echo "=================================================="
echo "Step 5: Uploading Files to Server"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  mkdir -p lib routes logs
"

scp backend/lib/logger.js root@srv941062.hstgr.cloud:/var/www/api/lib/
scp backend/routes/health.js root@srv941062.hstgr.cloud:/var/www/api/routes/
scp backend/ecosystem.config.js root@srv941062.hstgr.cloud:/var/www/api/
echo "✅ Files uploaded"
echo ""

echo "=================================================="
echo "Step 6: Updating payment-server.js"
echo "=================================================="
echo "📝 Manual update required:"
echo ""
echo "Add to payment-server.js:"
echo ""
echo "const healthRoutes = require('./routes/health');"
echo "const logger = require('./lib/logger');"
echo ""
echo "// Replace console.log with logger"
echo "// Add health check routes"
echo "app.use('/', healthRoutes);"
echo ""
read -p "Press Enter after manual update..."
echo ""

echo "=================================================="
echo "Step 7: Creating Logs Directory"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  mkdir -p logs
  chown www-data:www-data logs
  chmod 755 logs
  echo '✅ Logs directory created'
"
echo ""

echo "=================================================="
echo "Step 8: Restarting with PM2 Ecosystem"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  cd /var/www/api
  pm2 delete payment-api 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
  echo '✅ PM2 ecosystem started'
"
echo ""

echo "=================================================="
echo "Step 9: Verification"
echo "=================================================="
echo "📊 Health Checks:"
curl -s https://buatfilm.agentbar.ai/health | jq '.'
echo ""
echo "📊 Ready Check:"
curl -s https://buatfilm.agentbar.ai/health/ready | jq '.'
echo ""
echo "📊 Live Check:"
curl -s https://buatfilm.agentbar.ai/health/live | jq '.'
echo ""

echo "=================================================="
echo "Step 10: PM2 Monitoring Setup"
echo "=================================================="
ssh root@srv941062.hstgr.cloud "
  echo '=== PM2 Status ==='
  pm2 status
  echo ''
  echo '=== PM2 Monit ==='
  pm2 monit --no-interaction --sleep 3
"
echo ""

echo "=================================================="
echo "✅ PHASE 3 COMPLETE!"
echo "=================================================="
echo ""
echo "🎉 Observability Features:"
echo "   ✅ Structured logging (Pino)"
echo "   ✅ Health check endpoints"
echo "   ✅ PM2 cluster mode (2 instances)"
echo "   ✅ Log files (./logs/)"
echo "   ✅ Process monitoring"
echo ""
echo "📊 Monitoring URLs:"
echo "   Health: https://buatfilm.agentbar.ai/health"
echo "   Ready:  https://buatfilm.agentbar.ai/health/ready"
echo "   Live:   https://buatfilm.agentbar.ai/health/live"
echo ""
echo "🚀 Ready for Phase 4!"
echo "   ./deploy-phase4-resilience.sh"
echo ""
