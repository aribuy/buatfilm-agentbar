# CIRCUIT-BREAKER-IMPLEMENTATION-GPT.md
# BuatFilm AgentBar — Circuit Breaker & Error Handling Implementation

Version: v1.0
Status: PRODUCTION CRITICAL
Aligned With: PRODUCTION-READY-ADDENDUM-GPT.md

---

## 1. CIRCUIT BREAKER PATTERN

### 1.1 Purpose

Mencegah cascade failure ketika external service (Midtrans, SMTP, WhatsApp) mengalami downtime.

**Tanpa Circuit Breaker:**
- Midtrans down → 1000 request gagal → Server timeout → Seluruh system down

**Dengan Circuit Breaker:**
- Midtrans down → 5 request gagal → Circuit OPEN → Skip Midtrans → Queue & Retry → System tetap up

### 1.2 Circuit Breaker States

```
CLOSED → OPEN → HALF_OPEN → CLOSED
  ↑        ↓         ↑
  └─────────────────┘
```

**States:**
1. **CLOSED** (Normal): Requests pass through
2. **OPEN** (Failure): Requests immediately rejected, no call to service
3. **HALF_OPEN** (Testing): Allow 1 test request to check if service recovered

### 1.3 Implementation

```javascript
// lib/circuit-breaker.js

const CircuitBreaker = require('opossum');

// Configuration
const circuitBreakerOptions = {
  timeout: 10000,           // 10s timeout for each request
  errorThresholdPercentage: 50,  // Open if 50% fail
  resetTimeout: 60000,      // Try again after 60s
  rollingCountTimeout: 10000,    // Stats window: 10s
  rollingCountBuckets: 10,       // Buckets: 1s each
  fallback: myFallback      // Fallback function
};

// Midtrans Snap Token Circuit Breaker
const midtransBreaker = new CircuitBreaker(createSnapToken, circuitBreakerOptions);

midtransBreaker.on('open', () => {
  console.error('[CRITICAL] Midtrans Circuit Breaker OPEN');
  sendAlertToOps('Midtrans circuit breaker opened - service may be down');
});

midtransBreaker.on('halfOpen', () => {
  console.log('[INFO] Midtrans Circuit Breaker HALF_OPEN - testing connection');
});

midtransBreaker.on('close', () => {
  console.log('[INFO] Midtrans Circuit Breaker CLOSED - service recovered');
  sendAlertToOps('Midtrans circuit breaker closed - service recovered');
});

// Fallback function
function myFallback(result) {
  // Queue order for retry
  queueOrderForRetry(result);
  return {
    error: 'Service temporarily unavailable, order queued for retry',
    queued: true
  };
}

// Usage
async function createOrderWithCB(orderData) {
  try {
    const snapToken = await midtransBreaker.fire(orderData);
    return { success: true, snapToken };
  } catch (error) {
    if (error.message.includes('Breaker is open')) {
      return {
        success: false,
        error: 'Payment service temporarily unavailable',
        queued: true
      };
    }
    throw error;
  }
}
```

### 1.4 Service-Specific Configuration

```javascript
// config/circuit-breaker.config.js

module.exports = {
  midtrans: {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000,        // 1 minute
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10
  },

  smtp: {
    timeout: 5000,
    errorThresholdPercentage: 60,
    resetTimeout: 120000,       // 2 minutes
    rollingCountTimeout: 30000,
    rollingCountBuckets: 30
  },

  whatsapp: {
    timeout: 8000,
    errorThresholdPercentage: 70,
    resetTimeout: 300000,       // 5 minutes
    rollingCountTimeout: 60000,
    rollingCountBuckets: 60
  },

  database: {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000,        // 10 seconds
    rollingCountTimeout: 5000,
    rollingCountBuckets: 5
  }
};
```

---

## 2. RETRY STRATEGY

### 2.1 Exponential Backoff with Jitter

```javascript
// lib/retry.js

const retry = require('async-retry');

async function executeWithRetry(operation, options = {}) {
  const defaults = {
    retries: 5,
    factor: 2,                // Exponential factor
    minTimeout: 1000,         // 1s
    maxTimeout: 60000,        // 60s
    randomize: true,          // Add jitter (prevent thundering herd)
    onRetry: (error, attempt) => {
      console.log(`[RETRY] Attempt ${attempt}: ${error.message}`);
    }
  };

  const config = { ...defaults, ...options };

  return await retry(operation, config);
}

// Usage examples
await executeWithRetry(
  async () => await sendEmail(to, subject, body),
  { retries: 3 }
);

await executeWithRetry(
  async () => await midtransAPI.checkStatus(orderId),
  {
    retries: 5,
    factor: 2,
    minTimeout: 2000,
    maxTimeout: 30000
  }
);
```

### 2.2 Retryable vs Non-Retryable Errors

```javascript
// lib/retryable-errors.js

class RetryableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RetryableError';
    this.retryable = true;
  }
}

class NonRetryableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NonRetryableError';
    this.retryable = false;
  }
}

function isRetryable(error) {
  // Network errors
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ENOTFOUND') return true;

  // HTTP errors
  if (error.response) {
    const status = error.response.status;
    // Retry on 5xx, 429 (rate limit), 408 (timeout)
    if (status >= 500 || status === 429 || status === 408) return true;
  }

  // Custom errors
  if (error instanceof RetryableError) return true;
  if (error instanceof NonRetryableError) return false;

  // Default: don't retry
  return false;
}

// Wrapper
async function executeWithRetryCheck(operation) {
  return await executeWithRetry(async (bail) => {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error)) {
        // Don't retry on non-retryable errors
        bail(error);
        throw error;
      }
      throw new RetryableError(error.message);
    }
  });
}
```

---

## 3. DEAD LETTER QUEUE (DLQ)

### 3.1 DLQ Implementation

```javascript
// lib/dlq.js

class DeadLetterQueue {
  constructor(db) {
    this.db = db;
  }

  async addToDLQ(outboxId, reason, error) {
    await this.db.query(`
      UPDATE notification_outbox
      SET status = 'DLQ',
        last_error = $2,
        error_history = error_history || jsonb_build_object(
          'timestamp', NOW(),
          'error', $2,
          'reason', $3
        )
      WHERE id = $1
    `, [outboxId, error.message, reason]);

    // Alert ops
    await sendAlertToOps(`DLQ: Notification ${outboxId} - ${reason}`);
  }

  async getDLQItems(limit = 100) {
    const result = await this.db.query(`
      SELECT * FROM notification_outbox
      WHERE status = 'DLQ'
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  async retryFromDLQ(outboxId) {
    await this.db.query(`
      UPDATE notification_outbox
      SET status = 'PENDING',
        attempt_count = 0,
        last_error = NULL,
        next_retry_at = NOW()
      WHERE id = $1
    `, [outboxId]);
  }

  async bulkRetryDLQ(itemIds) {
    await this.db.query(`
      UPDATE notification_outbox
      SET status = 'PENDING',
        attempt_count = 0,
        last_error = NULL,
        next_retry_at = NOW()
      WHERE id = ANY($1)
    `, [itemIds]);
  }
}

module.exports = DeadLetterQueue;
```

### 3.2 DLQ Monitoring

```javascript
// worker/notifications.js

const dlq = new DeadLetterQueue(db);

async function processNotification(notification) {
  const maxAttempts = notification.max_attempts || 5;

  try {
    // Send notification
    if (notification.channel === 'EMAIL') {
      await sendEmail(
        notification.recipient,
        notification.subject,
        notification.body_template,
        notification.body_data
      );
    } else if (notification.channel === 'WHATSAPP') {
      await sendWhatsApp(
        notification.recipient,
        notification.body_template,
        notification.body_data
      );
    }

    // Mark as sent
    await db.query(`
      UPDATE notification_outbox
      SET status = 'SENT',
        sent_at = NOW()
      WHERE id = $1
    `, [notification.id]);

  } catch (error) {
    const newAttemptCount = notification.attempt_count + 1;

    // Check if should go to DLQ
    if (newAttemptCount >= maxAttempts) {
      await dlq.addToDLQ(
        notification.id,
        `Max retries (${maxAttempts}) exceeded`,
        error
      );
    } else {
      // Calculate next retry with exponential backoff
      const nextRetryAt = new Date();
      const backoffMs = Math.min(
        1000 * Math.pow(2, newAttemptCount), // Exponential
        60000  // Max 60s
      );
      nextRetryAt.setTime(nextRetryAt.getTime() + backoffMs);

      await db.query(`
        UPDATE notification_outbox
        SET status = 'RETRYING',
          attempt_count = $2,
          next_retry_at = $3,
          last_error = $4,
          error_history = error_history || jsonb_build_object(
            'timestamp', NOW(),
            'attempt', $2,
            'error', $4
          )
        WHERE id = $1
      `, [notification.id, newAttemptCount, nextRetryAt, error.message]);
    }
  }
}
```

---

## 4. IDEMPOTENCY

### 4.1 Idempotency Key Implementation

```javascript
// middleware/idempotency.js

const crypto = require('crypto');

function generateIdempotencyKey(payload) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(payload));
  return hash.digest('hex');
}

async function withIdempotency(operation, key, ttl = 3600) {
  // Check if already processed
  const existing = await db.query(`
    SELECT result
    FROM idempotency_store
    WHERE idempotency_key = $1
      AND created_at > NOW() - INTERVAL '1 second' * $2
  `, [key, ttl]);

  if (existing.rows.length > 0) {
    console.log(`[IDEMPOTENT] Returning cached result for key: ${key}`);
    return existing.rows[0].result;
  }

  // Execute operation
  const result = await operation();

  // Store result
  await db.query(`
    INSERT INTO idempotency_store (idempotency_key, result)
    VALUES ($1, $2)
    ON CONFLICT (idempotency_key) DO NOTHING
  `, [key, result]);

  return result;
}

// Create idempotency store table
const createIdempotencyTable = `
CREATE TABLE IF NOT EXISTS idempotency_store (
  id BIGSERIAL PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_idempotency_key ON idempotency_store(idempotency_key);
CREATE INDEX idx_idempotency_created ON idempotency_store(created_at);

-- Cleanup old entries (run daily)
DELETE FROM idempotency_store WHERE created_at < NOW() - INTERVAL '24 hours';
`;
```

### 4.2 Webhook Idempotency

```javascript
// handlers/webhook.js

async function handleMidtransWebhook(payload) {
  // Generate idempotency key from unique webhook identifier
  const idempotencyKey = payload.transaction_id ||
                         payload.order_id ||
                         generateIdempotencyKey(payload);

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Check if already processed
    const existingEvent = await client.query(`
      SELECT processed, order_id
      FROM payment_events
      WHERE idempotency_key = $1
      FOR UPDATE
    `, [idempotencyKey]);

    if (existingEvent.rows.length > 0) {
      const event = existingEvent.rows[0];

      if (event.processed) {
        console.log(`[WEBHOOK] Already processed: ${idempotencyKey}`);
        await client.query('ROLLBACK');
        return {
          status: 'already_processed',
          order_id: event.order_id
        };
      }
    }

    // Process webhook
    const result = await processPaymentUpdate(payload);

    // Record event
    await client.query(`
      INSERT INTO payment_events (
        event_id,
        idempotency_key,
        order_id,
        raw_payload,
        signature_valid,
        processed,
        processed_at
      ) VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
      ON CONFLICT (idempotency_key) DO UPDATE
      SET processed = TRUE,
          processed_at = NOW()
    `, [
      crypto.randomUUID(),
      idempotencyKey,
      result.order_id,
      JSON.stringify(payload),
      true
    ]);

    await client.query('COMMIT');
    return result;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 5. GRACEFUL DEGRADATION

### 5.1 Degradation Levels

```javascript
// lib/degradation.js

const DegradationLevel = {
  NORMAL: 'normal',
  DEGRADED: 'degraded',      // One service down, fallback active
  SEVERE: 'severe',          // Multiple services down
  EMERGENCY: 'emergency'     // Critical systems down
};

class SystemHealth {
  constructor() {
    this.services = {
      midtrans: { healthy: true, lastCheck: null },
      database: { healthy: true, lastCheck: null },
      smtp: { healthy: true, lastCheck: null },
      whatsapp: { healthy: true, lastCheck: null }
    };

    this.degradationLevel = DegradationLevel.NORMAL;
  }

  updateServiceHealth(serviceName, healthy) {
    this.services[serviceName] = {
      healthy,
      lastCheck: new Date()
    };

    this.recalculateDegradation();
  }

  recalculateDegradation() {
    const unhealthyCount = Object.values(this.services)
      .filter(s => !s.healthy).length;

    if (unhealthyCount === 0) {
      this.degradationLevel = DegradationLevel.NORMAL;
    } else if (unhealthyCount === 1) {
      this.degradationLevel = DegradationLevel.DEGRADED;
    } else if (unhealthyCount === 2) {
      this.degradationLevel = DegradationLevel.SEVERE;
    } else {
      this.degradationLevel = DegradationLevel.EMERGENCY;
    }

    console.log(`[HEALTH] Level: ${this.degradationLevel}, Unhealthy: ${unhealthyCount}`);
  }

  isDegraded() {
    return this.degradationLevel !== DegradationLevel.NORMAL;
  }

  canAcceptOrders() {
    return this.services.midtrans.healthy &&
           this.services.database.healthy;
  }

  canSendNotifications() {
    return this.services.smtp.healthy || this.services.whatsapp.healthy;
  }
}

const systemHealth = new SystemHealth();

// Middleware
function requireSystemService(serviceName) {
  return (req, res, next) => {
    if (!systemHealth.services[serviceName].healthy) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        degradation: systemHealth.degradationLevel,
        retryAfter: 60
      });
    }
    next();
  };
}

module.exports = { systemHealth, DegradationLevel, requireSystemService };
```

### 5.2 Health Check Endpoint

```javascript
// routes/health.js

const express = require('express');
const router = express.Router();

router.get('/health', async (req, res) => {
  const checks = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    degradation: systemHealth.degradationLevel,
    services: {}
  };

  // Check database
  try {
    await db.query('SELECT 1');
    checks.services.database = { status: 'healthy' };
    systemHealth.updateServiceHealth('database', true);
  } catch (error) {
    checks.services.database = {
      status: 'unhealthy',
      error: error.message
    };
    systemHealth.updateServiceHealth('database', false);
  }

  // Check Midtrans
  try {
    await midtransAPI.ping();
    checks.services.midtrans = { status: 'healthy' };
    systemHealth.updateServiceHealth('midtrans', true);
  } catch (error) {
    checks.services.midtrans = {
      status: 'unhealthy',
      error: error.message
    };
    systemHealth.updateServiceHealth('midtrans', false);
  }

  // Check SMTP
  try {
    await smtpVerifier.verify();
    checks.services.smtp = { status: 'healthy' };
    systemHealth.updateServiceHealth('smtp', true);
  } catch (error) {
    checks.services.smtp = {
      status: 'unhealthy',
      error: error.message
    };
    systemHealth.updateServiceHealth('smtp', false);
  }

  // Check worker
  const workerAlive = await checkWorkerHeartbeat();
  checks.services.worker = {
    status: workerAlive ? 'healthy' : 'unhealthy'
  };

  // Determine HTTP status
  const allHealthy = Object.values(checks.services)
    .every(s => s.status === 'healthy');

  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json(checks);
});

router.get('/health/ready', async (req, res) => {
  const ready = systemHealth.canAcceptOrders();

  res.status(ready ? 200 : 503).json({
    ready,
    message: ready ? 'System ready' : 'System not ready to accept orders'
  });
});

router.get('/health/live', async (req, res) => {
  // Kubernetes liveness probe - just check if process is alive
  res.status(200).json({ status: 'alive' });
});

module.exports = router;
```

---

END OF DOCUMENT
