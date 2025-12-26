# End-to-End Testing Plan
## BuatFilm AgentBar Payment System

**Document Version:** 1.0
**Last Updated:** 2025-12-26
**Test Environment:** Production (buatfilm.agentbar.ai)
**Test Scope:** Phase 1 Security + Full Payment Flow

---

## 📋 Table of Contents

1. [Test Objectives](#test-objectives)
2. [Test Environment Setup](#test-environment-setup)
3. [Phase 1 Security Tests](#phase-1-security-tests)
4. [Functional Payment Flow Tests](#functional-payment-flow-tests)
5. [Integration Tests](#integration-tests)
6. [Load & Performance Tests](#load--performance-tests)
7. [Test Execution Guide](#test-execution-guide)
8. [Success Criteria](#success-criteria)

---

## 🎯 Test Objectives

### Primary Goals
- ✅ Verify **webhook signature verification** is working correctly
- ✅ Validate **health check endpoints** are accessible
- ✅ Test complete **payment flow** from order creation to payment confirmation
- ✅ Ensure **PM2 process management** is stable
- ✅ Validate **Midtrans integration** in sandbox mode

### Test Coverage
- Security: Webhook signature validation (SHA512)
- Functionality: Order creation, payment processing, status updates
- Integration: Midtrans API, webhook handling, notification delivery
- Performance: Health check response times, PM2 process stability
- User Experience: Frontend form submission, payment method selection

---

## 🛠️ Test Environment Setup

### Prerequisites

```bash
# 1. SSH Access
ssh buatfilm-server  # Should work without password

# 2. PM2 Status Check
pm2 status
# Expected: payment-api running on port 3002

# 3. PM2 Logs
pm2 logs payment-api --lines 50

# 4. Local Test Setup
cd /Users/endik/PyCharmMiscProject/ai-movie-course-integrated/tests
npm install
npx playwright install chromium
```

### Environment Variables (Verification)

```bash
# On server
ssh buatfilm-server "cat /var/www/api/.env | grep -E 'MIDTRANS|PORT'"
```

Expected:
```
PORT=3002
MIDTRANS_SERVER_KEY=SB-xxx-xxx  # Sandbox key
MIDTRANS_CLIENT_KEY=SB-xxx-xxx
```

---

## 🔒 Phase 1 Security Tests

### Test SEC-001: Webhook Signature Verification - Invalid Signature

**Objective:** Verify webhook rejects requests without valid signature

**Test Steps:**
```bash
# Send webhook without signature
curl -X POST https://buatfilm.agentbar.ai/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "TEST-SEC-001",
    "status_code": "200",
    "gross_amount": "99000",
    "transaction_status": "capture",
    "transaction_id": "TEST-SEC-001-TXN"
  }' -v
```

**Expected Result:**
- HTTP Status: `401 Unauthorized`
- Response body: `{"error": "Missing signature"}` or `{"error": "Invalid signature"}`

**Actual Result:** ⏸️ _To be executed_

**Status:** ☐ Pass / ☐ Fail

---

### Test SEC-002: Webhook Signature Verification - Valid Signature

**Objective:** Verify webhook accepts properly signed requests

**Test Steps:**
```bash
# This test requires Midtrans Sandbox dashboard
# 1. Go to https://simulator.sandbox.midtrans.com/
# 2. Create a test transaction
# 3. Trigger payment webhook
# 4. Check PM2 logs for signature verification

# Alternative: Check logs for legitimate webhooks
ssh buatfilm-server "pm2 logs payment-api --lines 100 --nostream | grep 'WEBHOOK'"
```

**Expected Result:**
- Log message: `[WEBHOOK] ✅ Signature verified: ORDER_ID`
- HTTP Status: `200 OK`

**Actual Result:** ⏸️ _To be executed_

**Status:** ☐ Pass / ☐ Fail

---

### Test SEC-003: Health Check Endpoint - /health

**Objective:** Verify health check endpoint returns system status

**Test Steps:**
```bash
curl -s https://buatfilm.agentbar.ai/health | jq '.'
```

**Expected Result:**
```json
{
  "uptime": <number>,
  "timestamp": "<ISO8601>",
  "status": "healthy" | "degraded",
  "service": "buatfilm-payment-api",
  "database": {
    "status": "healthy" | "unhealthy",
    "message": "Connection OK" | "<error>"
  }
}
```
- HTTP Status: `200 OK` (if healthy) or `503 Service Unavailable` (if degraded)

**Actual Result:** ⏸️ _To be executed_

**Status:** ☐ Pass / ☐ Fail

---

### Test SEC-004: Health Check Endpoint - /health/ready

**Objective:** Verify readiness probe

**Test Steps:**
```bash
curl -s https://buatfilm.agentbar.ai/health/ready | jq '.'
```

**Expected Result:**
```json
{
  "ready": true,
  "message": "System ready to accept requests"
}
```
- HTTP Status: `200 OK`

**Actual Result:** ⏸️ _To be executed_

**Status:** ☐ Pass / ☐ Fail

---

### Test SEC-005: Health Check Endpoint - /health/live

**Objective:** Verify liveness probe

**Test Steps:**
```bash
curl -s https://buatfilm.agentbar.ai/health/live | jq '.'
```

**Expected Result:**
```json
{
  "alive": true,
  "uptime": <number>
}
```
- HTTP Status: `200 OK`

**Actual Result:** ⏸️ _To be executed_

**Status:** ☐ Pass / ☐ Fail

---

## 💳 Functional Payment Flow Tests

### Test FUN-001: Complete Purchase Flow - GoPay

**Objective:** End-to-end test of GoPay payment

**Test Script:** [buatfilm.spec.ts:UC-001](tests/buatfilm.spec.ts)

**Test Steps:**
1. Navigate to `https://buatfilm.agentbar.ai`
2. Click "Order Sekarang" button
3. Fill form:
   - Nama: `Test User E2E`
   - Phone: `81234567890`
   - Email: `test@e2e.com`
4. Select GoPay payment method
5. Submit order
6. Verify Midtrans Snap popup appears
7. Complete payment in Midtrans Sandbox
8. Verify order status update via webhook

**Expected Result:**
- Order created successfully
- Midtrans Snap popup loads
- Payment can be completed
- Webhook received and processed
- Order status updated to `PAID`

**Execution:**
```bash
cd tests
npx playwright test buatfilm.spec.ts --project=chromium
```

**Status:** ☐ Pass / ☐ Fail

---

### Test FUN-002: Complete Purchase Flow - BCA Bank Transfer

**Objective:** End-to-end test of BCA bank transfer payment

**Test Script:** [buatfilm.spec.ts:UC-002](tests/buatfilm.spec.ts)

**Test Steps:**
1. Navigate to `https://buatfilm.agentbar.ai`
2. Click "Order Sekarang" button
3. Fill form:
   - Nama: `Bank User E2E`
   - Phone: `81987654321`
   - Email: `bank@e2e.com`
4. Select BCA payment method
5. Submit order
6. Verify VA number is displayed
7. Note VA number for payment simulation

**Expected Result:**
- Order created successfully
- BCA VA number displayed
- Order status: `PENDING_PAYMENT`

**Execution:**
```bash
cd tests
npx playwright test buatfilm.spec.ts:UC-002 --project=chromium
```

**Status:** ☐ Pass / ☐ Fail

---

### Test FUN-003: API Create Payment Endpoint

**Objective:** Test direct API payment creation

**Test Steps:**
```bash
curl -X POST http://srv941062.hstgr.cloud:3002/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "E2E-TEST-001",
    "amount": 99000,
    "email": "e2e@test.com",
    "phone": "+6281234567890",
    "name": "E2E Test User"
  }' | jq '.'
```

**Expected Result:**
```json
{
  "success": true,
  "token": "<SNAP_TOKEN>",
  "redirectUrl": "https://app.sandbox.midtrans.com/snap/v1/vtlong/<TOKEN>"
}
```
- HTTP Status: `200 OK`

**Actual Result:** ⏸️ _To be executed_

**Status:** ☐ Pass / ☐ Fail

---

### Test FUN-004: Notification Delivery - Email & WhatsApp

**Objective:** Verify notifications are sent after order creation

**Test Script:** [notification-test.spec.ts](tests/notification-test.spec.ts)

**Test Steps:**
1. Create order via API
2. Check PM2 logs for notification attempts
3. Verify email sent (check test inbox)
4. Verify WhatsApp message sent (check test number)

**Expected Result:**
- Log: `[NOTIFICATION] Sending email to: e2e@test.com`
- Log: `[NOTIFICATION] Sending WhatsApp to: +6281234567890`
- Email received with order details
- WhatsApp message received

**Execution:**
```bash
cd tests
npx playwright test notification-test.spec.ts --project=chromium
```

**Status:** ☐ Pass / ☐ Fail

---

## 🔗 Integration Tests

### Test INT-001: Midtrans Snap Integration

**Objective:** Verify Midtrans Snap token generation

**Test Steps:**
1. Create order via frontend or API
2. Extract Snap token from response
3. Open Snap URL in browser
4. Verify payment options display correctly

**Expected Result:**
- Snap token generated
- Snap UI loads without errors
- Payment methods match configuration (GoPay, BCA, Mandiri, BNI, QRIS)

**Status:** ☐ Pass / ☐ Fail

---

### Test INT-002: Webhook Idempotency

**Objective:** Verify duplicate webhooks are rejected

**Test Steps:**
1. Send valid webhook twice with same `transaction_id`
2. Check first response: `200 OK`
3. Check second response: `200 OK` with `"message": "Already processed"`
4. Verify database: Only one `payment_events` record created

**Expected Result:**
- First webhook: Processed
- Second webhook: Rejected as duplicate
- No duplicate order status updates

**Test Command:**
```bash
# After real payment, check PM2 logs
ssh buatfilm-server "pm2 logs payment-api --lines 200 --nostream | grep -E '(WEBHOOK|Already processed)'"
```

**Status:** ☐ Pass / ☐ Fail

---

### Test INT-003: PM2 Process Stability

**Objective:** Verify PM2 process stays stable under load

**Test Steps:**
1. Check current PM2 status
2. Send 10 rapid payment creation requests
3. Monitor PM2 process memory and CPU
4. Verify process doesn't crash
5. Check error logs

**Expected Result:**
- Process stays `online`
- Memory usage stable (<500MB)
- No uncaught exceptions
- No auto-restarts

**Test Commands:**
```bash
# Before load test
ssh buatfilm-server "pm2 status && pm2 describe payment-api"

# After load test
ssh buatfilm-server "pm2 status && pm2 describe payment-api"
```

**Status:** ☐ Pass / ☐ Fail

---

## 🚀 Load & Performance Tests

### Test PERF-001: Concurrent Users - 10 Users

**Objective:** System stability under light load

**Test Script:** [load-test.sh](tests/load-test.sh)

**Configuration:**
- Duration: 60 seconds
- Arrival Rate: 5 users/second
- Total Requests: ~300 requests

**Execution:**
```bash
cd tests
chmod +x load-test.sh
./load-test.sh
```

**Expected Result:**
- Response Time (p95): <500ms
- Error Rate: 0%
- No HTTP 500 errors

**Status:** ☐ Pass / ☐ Fail

---

### Test PERF-002: Concurrent Users - 50 Users

**Objective:** System stability under moderate load

**Configuration:**
- Duration: 120 seconds
- Arrival Rate: 10 users/second
- Total Requests: ~1200 requests

**Expected Result:**
- Response Time (p95): <1000ms
- Error Rate: <1%
- PM2 process stable

**Status:** ☐ Pass / ☐ Fail

---

### Test PERF-003: Health Check Response Time

**Objective:** Verify health check endpoint performance

**Test Steps:**
```bash
# Run 100 requests and measure response time
for i in {1..100}; do
  curl -w "@-" -o /dev/null -s https://buatfilm.agentbar.ai/health <<< 'time_total: %{time_total}\n'
done | awk '{sum+=$1; count++} END {print "Avg:", sum/count "s"}'
```

**Expected Result:**
- Average Response Time: <100ms
- No timeouts

**Actual Result:** ⏸️ _To be executed_

**Status:** ☐ Pass / ☐ Fail

---

## 📊 Test Execution Guide

### Phase 1: Security Tests (30 minutes)

```bash
# Execute all security tests
./test-security.sh
```

**Manual Verification:**
- [ ] SEC-001: Invalid webhook rejected (401)
- [ ] SEC-002: Valid webhook accepted (200)
- [ ] SEC-003: /health endpoint working
- [ ] SEC-004: /health/ready endpoint working
- [ ] SEC-005: /health/live endpoint working

---

### Phase 2: Functional Tests (1 hour)

```bash
# Execute Playwright tests
cd tests
npx playwright test --project=chromium
```

**Manual Verification:**
- [ ] FUN-001: GoPay flow completed
- [ ] FUN-002: BCA flow completed
- [ ] FUN-003: API endpoint working
- [ ] FUN-004: Notifications sent

---

### Phase 3: Integration Tests (30 minutes)

```bash
# Manual integration tests
./test-integration.sh
```

**Manual Verification:**
- [ ] INT-001: Midtrans Snap loads
- [ ] INT-002: Idempotency working
- [ ] INT-003: PM2 process stable

---

### Phase 4: Load Tests (30 minutes)

```bash
# Execute load tests
cd tests
./load-test.sh
```

**Manual Verification:**
- [ ] PERF-001: Light load passed
- [ ] PERF-002: Moderate load passed
- [ ] PERF-003: Health check performance OK

---

## ✅ Success Criteria

### Critical (Must Pass)
- ✅ All security tests (SEC-001 to SEC-005) MUST pass
- ✅ At least one functional payment flow (FUN-001 or FUN-002) MUST pass
- ✅ Health check endpoints MUST respond within 100ms
- ✅ No PM2 process crashes during tests

### Important (Should Pass)
- ⚠️ 80% of functional tests should pass
- ⚠️ Load tests should show <500ms response time (p95)
- ⚠️ No critical errors in PM2 logs

### Nice to Have
- 💡 Notification delivery verified (email + WhatsApp)
- 💡 Idempotency verified (duplicate webhooks rejected)
- 💡 Load tests handle 50 concurrent users

---

## 📈 Test Results Summary

### Test Execution Date: ⏸️ _To be filled_

| Test Category | Total | Passed | Failed | Skipped |
|---------------|-------|--------|--------|---------|
| Security (SEC) | 5 | _ | _ | _ |
| Functional (FUN) | 4 | _ | _ | _ |
| Integration (INT) | 3 | _ | _ | _ |
| Performance (PERF) | 3 | _ | _ | _ |
| **TOTAL** | **15** | **_** | **_** | **_** |

### Overall Status: ☐ PASS / ☐ FAIL

### Critical Issues Found:
- _None identified yet_

### Recommendations:
- _To be filled after test execution_

---

## 📝 Test Execution Checklist

### Pre-Test Setup
- [ ] SSH access verified (`ssh buatfilm-server`)
- [ ] PM2 status checked (`pm2 status`)
- [ ] PM2 logs reviewed (`pm2 logs payment-api --lines 50`)
- [ ] Health check endpoints accessible
- [ ] Local test dependencies installed (`cd tests && npm install`)

### During Test Execution
- [ ] Monitor PM2 logs in separate terminal: `ssh buatfilm-server "pm2 logs payment-api --lines 0 -f"`
- [ ] Document all test results in this document
- [ ] Capture screenshots of failed tests
- [ ] Save test reports: `npx playwright show-report`

### Post-Test Cleanup
- [ ] Archive test results: `mv test-results test-results-$(date +%Y%m%d_%H%M%S)`
- [ ] Archive Playwright report: `mv playwright-report playwright-report-$(date +%Y%m%d_%H%M%S)`
- [ ] Update this document with actual results
- [ ] Create GitHub issue for any failed tests

---

## 🐛 Issue Tracker Template

For failed tests, create GitHub issues with:

```markdown
## Test Failure: [Test ID] - [Test Name]

**Test ID:** [SEC-001 / FUN-001 / etc]
**Test Name:** [Test title from this document]
**Date:** [YYYY-MM-DD]
**Tester:** [Your name]

### Actual Result:
[What happened]

### Expected Result:
[What should have happened]

### Error Messages:
[Log snippets, error messages]

### Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Environment:
- Node Version: [output of `node --version`]
- PM2 Version: [output of `pm2 --version`]
- Server: srv941062.hstgr.cloud

### Severity:
- [ ] Critical (blocks production)
- [ ] High (major functionality broken)
- [ ] Medium (workaround exists)
- [ ] Low (minor issue)
```

---

## 📚 Additional Resources

### Midtrans Sandbox Dashboard
- URL: https://simulator.sandbox.midtrans.com/
- Credentials: Check `.env` file on server

### PM2 Monitoring
```bash
# Real-time monitoring
ssh buatfilm-server "pm2 monit"

# Log streaming
ssh buatfilm-server "pm2 logs payment-api --lines 0 -f"
```

### Playwright Test Reports
```bash
# View HTML report
cd tests
npx playwright show-report
```

---

**Document Status:** 📝 Ready for Test Execution

**Next Steps:**
1. Execute all tests in order
2. Document results
3. Create GitHub issues for failures
4. Fix critical issues before Phase 2 (PostgreSQL migration)

---

*Prepared by: Claude Code*
*Date: 2025-12-26*
