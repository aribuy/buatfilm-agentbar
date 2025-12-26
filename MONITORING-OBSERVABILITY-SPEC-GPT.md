# MONITORING-OBSERVABILITY-SPEC-GPT.md
# BuatFilm AgentBar — Monitoring & Observability Specification

Version: v1.0
Status: PRODUCTION CRITICAL
Aligned With: PRODUCTION-READY-ADDENDUM-GPT.md

---

## 1. OBSERVABILITY STACK

### 1.1 Recommended Stack

**Core:**
- **Metrics:** Prometheus + Grafana
- **Logs:** Loki (or ELK Stack: Elasticsearch + Logstash + Kibana)
- **Tracing:** Jaeger (optional, for distributed tracing)
- **Dashboards:** Grafana
- **Alerting:** Alertmanager (Prometheus) + PagerDuty/Opsgenie

**Alternative (SaaS):**
- Datadog (All-in-one)
- New Relic
- LogRocket (Frontend)

### 1.2 Architecture

```
Application → Metrics Exporter → Prometheus → Alertmanager → PagerDuty
     ↓              ↓                       ↓
  Structured    Loki               Grafana Dashboards
     Logs
```

---

## 2. STRUCTURED LOGGING

### 2.1 Log Format Standard

**All logs MUST follow this format:**

```javascript
{
  // Standard fields
  "timestamp": "2025-12-26T13:00:00.123Z",    // ISO 8601
  "level": "INFO",                            // DEBUG, INFO, WARN, ERROR
  "message": "Payment successful",

  // Correlation
  "correlation_id": "ord-201225AB12345",      // Order ID or Request ID
  "request_id": "req-abc123",

  // Component
  "service": "payment-api",
  "component": "webhook_handler",
  "environment": "production",

  // Context
  "order_id": "201225AB12345",
  "payment_method": "gopay",
  "amount": 99000,

  // Performance
  "duration_ms": 45,

  // Error context (if applicable)
  "error": {
    "type": "PaymentGatewayError",
    "message": "Midtrans timeout",
    "stack": "...",
    "code": "ECONNABORTED"
  },

  // Metadata
  "metadata": {
    "midtrans_transaction_id": "tx-12345",
    "retry_attempt": 1
  }
}
```

### 2.2 Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **DEBUG** | Detailed diagnostics | SQL queries, HTTP payloads |
| **INFO** | Normal operations | Order created, payment successful |
| **WARN** | Unexpected but recoverable | Retry attempt, fallback activated |
| **ERROR** | Error but service continues | Payment failed, webhook rejected |
| **FATAL** | Service may crash | Database connection lost |

### 2.3 Logging Implementation

```javascript
// lib/logger.js

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: () => {
    return `time: "${new Date().toISOString()}"`;
  },
  base: {
    service: 'buatfilm-payment-api',
    environment: process.env.NODE_ENV || 'development'
  }
});

// Child logger with correlation
function createLogger(correlationId) {
  return logger.child({ correlation_id: correlationId });
}

// Usage examples
logger.info({ order_id: '123' }, 'Order created');

logger.error(
  {
    order_id: '123',
    error: {
      type: 'PaymentError',
      message: 'Midtrans timeout'
    }
  },
  'Payment failed'
);

// With performance timing
const startTime = Date.now();
// ... do work ...
const duration = Date.now() - startTime;
logger.info(
  { order_id: '123', duration_ms: duration },
  'Order processed'
);

module.exports = { logger, createLogger };
```

### 2.4 Sensitive Data Masking

```javascript
// lib/logger-masking.js

const maskEmail = (email) => {
  if (!email) return email;
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}***@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone) return phone;
  return phone.substring(0, 4) + '****' + phone.substring(8);
};

const maskString = (str, visibleChars = 4) => {
  if (!str || str.length <= visibleChars) return str;
  return str.substring(0, visibleChars) + '***';
};

// Redaction rules for Pino
const redact = {
  paths: [
    'email',
    'customer_email',
    'customer_phone',
    'user.email',
    'password',
    'token',
    'secret',
    'api_key',
    'authorization'
  ],
  remove: true,
  censor: '***REDACTED***'
};

const logger = pino({
  redact
});

// Or custom censor
const logger = pino({
  redact: [
    'customer_email',
    'customer_phone',
    'midtrans.server_key'
  ],
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.req
  }
});
```

---

## 3. METRICS

### 3.1 Metric Types

**Counter:**
```javascript
// Things that only increase
orders_total{status="paid"} 1234
webhook_received_total 5678
notification_sent_total{channel="email"} 345
```

**Gauge:**
```javascript
// Current value (up/down)
orders_pending 45
notification_outbox_backlog 12
worker_alive 1
```

**Histogram:**
```javascript
// Distribution
http_request_duration_seconds_bucket{le="0.1"} 800
http_request_duration_seconds_bucket{le="0.5"} 950
http_request_duration_seconds_bucket{le="1.0"} 990
http_request_duration_seconds_bucket{le="+Inf"} 1000
```

**Summary:**
```javascript
// Similar to histogram but pre-calculated
payment_processing_duration_seconds{quantile="0.5"} 0.45
payment_processing_duration_seconds{quantile="0.9"} 0.78
payment_processing_duration_seconds{quantile="0.99"} 1.23
```

### 3.2 Business Metrics

```javascript
// lib/metrics.js

const promClient = require('prom-client');

// Create registry
const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// =====================================================
// ORDER METRICS
// =====================================================

const orderCounter = new promClient.Counter({
  name: 'orders_total',
  help: 'Total orders created',
  labelNames: ['status', 'payment_method'],
  registers: [register]
});

const orderDuration = new promClient.Histogram({
  name: 'order_creation_duration_seconds',
  help: 'Order creation duration in seconds',
  labelNames: ['payment_method'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const orderGauge = new promClient.Gauge({
  name: 'orders_pending',
  help: 'Number of pending orders',
  registers: [register]
});

// =====================================================
// PAYMENT METRICS
// =====================================================

const paymentCounter = new promClient.Counter({
  name: 'payment_transactions_total',
  help: 'Total payment transactions',
  labelNames: ['status', 'provider', 'payment_type'],
  registers: [register]
});

const paymentAmount = new promClient.Histogram({
  name: 'payment_amount_histogram',
  help: 'Payment amount distribution',
  labelNames: ['payment_method'],
  buckets: [50000, 75000, 99000, 150000, 200000, 500000],
  registers: [register]
});

const webhookCounter = new promClient.Counter({
  name: 'webhook_received_total',
  help: 'Total webhooks received',
  labelNames: ['valid', 'provider'],
  registers: [register]
});

const webhookDuration = new promClient.Histogram({
  name: 'webhook_processing_duration_seconds',
  help: 'Webhook processing duration',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register]
});

// =====================================================
// NOTIFICATION METRICS
// =====================================================

const notificationCounter = new promClient.Counter({
  name: 'notifications_sent_total',
  help: 'Total notifications sent',
  labelNames: ['channel', 'template', 'status'],
  registers: [register]
});

const outboxGauge = new promClient.Gauge({
  name: 'notification_outbox_backlog',
  help: 'Number of pending notifications in outbox',
  labelNames: ['channel', 'status'],
  registers: [register]
});

// =====================================================
// SYSTEM METRICS
// =====================================================

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register]
});

const externalServiceDuration = new promClient.Histogram({
  name: 'external_service_duration_seconds',
  help: 'External service call duration',
  labelNames: ['service', 'operation', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// =====================================================
// USAGE FUNCTIONS
// =====================================================

function recordOrderCreated(status, paymentMethod, duration) {
  orderCounter.inc({ status, payment_method: paymentMethod });
  orderDuration.observe({ payment_method: paymentMethod }, duration);
}

function recordPayment(status, provider, paymentType, amount) {
  paymentCounter.inc({ status, provider, payment_type: paymentType });
  paymentAmount.observe({ payment_method: paymentType }, amount);
}

function recordWebhook(valid, provider, duration) {
  webhookCounter.inc({ valid: valid.toString(), provider });
  webhookDuration.observe(duration);
}

function recordNotificationSent(channel, template, status) {
  notificationCounter.inc({ channel, template, status });
}

async function updateOutboxBacklog() {
  const result = await db.query(`
    SELECT channel, status, COUNT(*) as count
    FROM notification_outbox
    WHERE status IN ('PENDING', 'RETRYING')
    GROUP BY channel, status
  `);

  result.rows.forEach(row => {
    outboxGauge.set(
      { channel: row.channel, status: row.status },
      row.count
    );
  });
}

// =====================================================
// METRICS ENDPOINT
// =====================================================

function setupMetricsEndpoint(app) {
  app.get('/metrics', async (req, res) => {
    // Update gauges before serving
    await updateOutboxBacklog();

    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}

module.exports = {
  register,
  recordOrderCreated,
  recordPayment,
  recordWebhook,
  recordNotificationSent,
  setupMetricsEndpoint
};
```

### 3.3 Critical Metrics Dashboard

**Grafana Dashboard JSON Structure:**

```json
{
  "dashboard": {
    "title": "BuatFilm Payment System - Production",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Order Funnel",
        "targets": [
          {
            "expr": "orders_total{status=\"created\"}"
          },
          {
            "expr": "orders_total{status=\"pending_payment\"}"
          },
          {
            "expr": "orders_total{status=\"paid\"}"
          },
          {
            "expr": "orders_total{status=\"failed\"}"
          }
        ]
      },
      {
        "title": "Payment Conversion Rate",
        "targets": [
          {
            "expr": "rate(payment_transactions_total{status=\"paid\"}[1h]) / rate(payment_transactions_total[1h]) * 100"
          }
        ]
      },
      {
        "title": "Webhook Processing Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, webhook_processing_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Outbox Backlog",
        "targets": [
          {
            "expr": "notification_outbox_backlog"
          }
        ]
      },
      {
        "title": "Database Query Performance",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, db_query_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "External Service Health",
        "targets": [
          {
            "expr": "rate(external_service_duration_seconds_bucket{status=\"error\"}[5m])"
          }
        ]
      }
    ]
  }
}
```

---

## 4. ALERTING RULES

### 4.1 Alert Rules (Prometheus)

```yaml
# alert-rules.yml

groups:
  - name: buatfilm_critical
    interval: 30s
    rules:
      # =====================================================
      # CRITICAL ALERTS (P0)
      # =====================================================

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
          priority: P0
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.endpoint }}"
          runbook: "https://docs.buatfilm.agentbar.ai/runbooks/high-error-rate"

      - alert: PaymentWebhookStopped
        expr: rate(webhook_received_total[10m]) == 0
        for: 10m
        labels:
          severity: critical
          priority: P0
        annotations:
          summary: "No webhooks received in 10 minutes"
          description: "Payment webhooks have stopped arriving. Check Midtrans status."

      - alert: DatabaseDown
        expr: up{job="postgresql"} == 0
        for: 1m
        labels:
          severity: critical
          priority: P0
        annotations:
          summary: "Database is down"
          description: "PostgreSQL database is not responding"

      - alert: WorkerDown
        expr: up{job="notification-worker"} == 0
        for: 5m
        labels:
          severity: critical
          priority: P0
        annotations:
          summary: "Notification worker is down"
          description: "Background notification worker is not running"

      # =====================================================
      # HIGH ALERTS (P1)
      # =====================================================

      - alert: LowPaymentConversion
        expr: |
          rate(payment_transactions_total{status="paid"}[1h])
          /
          rate(payment_transactions_total[1h]) < 0.7
        for: 15m
        labels:
          severity: high
          priority: P1
        annotations:
          summary: "Payment conversion rate dropped below 70%"
          description: "Conversion rate is {{ $value | humanizePercentage }}"

      - alert: HighOutboxBacklog
        expr: notification_outbox_backlog > 50
        for: 5m
        labels:
          severity: high
          priority: P1
        annotations:
          summary: "Notification outbox backlog is high"
          description: "{{ $value }} notifications are pending"

      - alert: ManyFailedWebhooks
        expr: rate(webhook_received_total{valid="false"}[5m]) > 0.1
        for: 5m
        labels:
          severity: high
          priority: P1
        annotations:
          summary: "High rate of invalid webhooks"
          description: "{{ $value | humanizePercentage }} of webhooks are invalid"

      - alert: SlowWebhookProcessing
        expr: histogram_quantile(0.95, webhook_processing_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: high
          priority: P1
        annotations:
          summary: "Webhook processing is slow"
          description: "P95 webhook latency is {{ $value }}s"

      # =====================================================
      # MEDIUM ALERTS (P2)
      # =====================================================

      - alert: MidtransSlowResponse
        expr: histogram_quantile(0.95, external_service_duration_seconds_bucket{service="midtrans"}) > 5
        for: 10m
        labels:
          severity: warning
          priority: P2
        annotations:
          summary: "Midtrans API is slow"
          description: "P95 response time is {{ $value }}s"

      - alert: HighPendingOrders
        expr: orders_pending > 20
        for: 30m
        labels:
          severity: warning
          priority: P2
        annotations:
          summary: "Many pending orders"
          description: "{{ $value }} orders have been pending for >30 minutes"

      - alert: NotificationFailureRate
        expr: |
          rate(notifications_sent_total{status="failed"}[10m])
          /
          rate(notifications_sent_total[10m]) > 0.1
        for: 10m
        labels:
          severity: warning
          priority: P2
        annotations:
          summary: "High notification failure rate"
          description: "{{ $value | humanizePercentage }} of notifications are failing"

      # =====================================================
      # LOW ALERTS (P3)
      # =====================================================

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 512
        for: 10m
        labels:
          severity: info
          priority: P3
        annotations:
          summary: "High memory usage"
          description: "Process using {{ $value }}MB memory"

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes < 0.1
        for: 30m
        labels:
          severity: info
          priority: P3
        annotations:
          summary: "Disk space is low"
          description: "Less than 10% disk space available"
```

### 4.2 Alert Routing

```javascript
// Alertmanager configuration

global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

  routes:
    # Critical (P0) - PagerDuty + Slack + Call
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true

    - match:
        priority: P0
      receiver: 'slack-critical'
      continue: true

    - match:
        priority: P0
      receiver: 'call-on-call'

    # High (P1) - Slack + Email
    - match:
        priority: P1
      receiver: 'slack-high'
      continue: true

    - match:
        priority: P1
      receiver: 'email-team'

    # Medium (P2) - Slack only
    - match:
        priority: P2
      receiver: 'slack-medium'

    # Low (P3) - Email only
    - match:
        priority: P3
      receiver: 'email-low'

receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        severity: 'critical'

  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'slack-high'
    slack_configs:
      - channel: '#alerts-high'
        title: '⚠️ HIGH: {{ .GroupLabels.alertname }}'

  - name: 'slack-medium'
    slack_configs:
      - channel: '#alerts-medium'
        title: '⚡ MEDIUM: {{ .GroupLabels.alertname }}'

  - name: 'email-team'
    email_configs:
      - to: 'oncall@buatfilm.agentbar.ai'
        headers:
          Subject: '🚨 Alert: {{ .GroupLabels.alertname }}'

  - name: 'email-low'
    email_configs:
      - to: 'team@buatfilm.agentbar.ai'
        headers:
          Subject: 'ℹ️ Info: {{ .GroupLabels.alertname }}'
```

---

## 5. DISTRIBUTED TRACING

### 5.1 Jaeger Integration

```javascript
// lib/tracing.js

const { initTracer } = require('jaeger-client');

const config = {
  serviceName: 'buatfilm-payment-api',
  reporter: {
    logSpans: true,
    agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
    agentPort: process.env.JAEGER_AGENT_PORT || 6832
  },
  sampler: {
    type: 'probabilistic',
    param: 0.1  // Sample 10% of traces
  }
};

const tracer = initTracer(config);

// Middleware
function tracingMiddleware(req, res, next) {
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    tags: {
      'http.method': req.method,
      'http.url': req.url,
      'http.host': req.headers.host
    }
  });

  req.span = span;

  res.on('finish', () => {
    span.setTag('http.status_code', res.statusCode);

    if (res.statusCode >= 500) {
      span.setTag('error', true);
      span.log({ error: res.statusMessage });
    }

    span.finish();
  });

  next();
}

// Usage
app.use(tracingMiddleware);

// In handlers
app.post('/api/orders', async (req, res) => {
  const span = tracer.startSpan('create_order', {
    childOf: req.span.context()
  });

  try {
    // Create order
    span.setTag('order_id', order.id);
    span.log({ event: 'order_created', order_id: order.id });

    res.json(order);
  } catch (error) {
    span.setTag('error', true);
    span.log({ event: 'error', error: error.message });
    throw error;
  } finally {
    span.finish();
  }
});
```

---

END OF DOCUMENT
