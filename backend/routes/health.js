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
