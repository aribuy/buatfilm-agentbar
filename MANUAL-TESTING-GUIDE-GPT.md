# Manual Testing Guide
## BuatFilm AgentBar Payment System

**Document Version:** 2.0
**Last Updated:** 2025-12-26 12:05 UTC
**Test Environment:** Production (buatfilm.agentbar.ai)
**Webhook Status:** SECURE - Valid signature required

---

## 📋 Table of Contents

1. [Webhook Security Verification](#webhook-security-verification)
2. [Real Payment Flow Testing](#real-payment-flow-testing)
3. [Test Data & Credentials](#test-data--credentials)
4. [Troubleshooting Guide](#troubleshooting-guide)

---

## 🔐 Webhook Security Verification

### Current Implementation Status

**Security Level:** PRODUCTION-READY ✅

**Webhook Endpoints:**
- **GET /webhooks/midtrans** → 200 OK (Healthcheck for monitoring)
- **POST /webhooks/midtrans** →
  - ❌ No signature → 401 Unauthorized (REJECTED)
  - ❌ Invalid signature → 403 Forbidden (REJECTED)
  - ✅ Valid signature → 200 OK (PROCESSED)

**IMPORTANT:** Midtrans Dashboard "Test Notification URL" will FAIL - this is **NORMAL and EXPECTED** because test notifications don't include signatures. Real payment webhooks will work correctly.

### Quick Verification Commands

```bash
# 1. Check webhook health (should return 200)
curl -s https://buatfilm.agentbar.ai/webhooks/midtrans | jq .

# 2. Test POST without signature (should return 401)
curl -s -X POST https://buatfilm.agentbar.ai/webhooks/midtrans \
  -H 'Content-Type: application/json' \
  -d '{"order_id":"test","status_code":"200","gross_amount":10000}'

# 3. Monitor PM2 logs for webhooks
ssh buatfilm-server "pm2 logs payment-api --lines 50 -f"

# 4. Check nginx access logs
ssh buatfilm-server "sudo tail -n 20 /var/log/nginx/access.log | grep webhooks"
```

### Expected Output

**GET Request:**
```json
{
  "status": "ok",
  "message": "Webhook endpoint is ready",
  "timestamp": "2025-12-26T12:00:00.000Z"
}
```

**POST without signature:**
```json
{
  "error": "Missing signature",
  "message": "POST requests require valid Midtrans signature"
}
```

---

## 💳 Real Payment Flow Testing

### Test Objective

Verify **complete end-to-end payment flow** with real Midtrans transactions and webhook processing.

### Prerequisites

**Midtrans Sandbox Credentials:**
- URL: https://simulator.sandbox.midtrans.com/
- Server Key: Check in `/var/www/api/.env` on server
- Client Key: SB-Mid-client-jdMz84CLgFCbv0bo (Sandbox)

**Test Environment:**
- Frontend: https://buatfilm.agentbar.ai
- Backend API: https://buatfilm.agentbar.ai/payment/create
- Webhook: https://buatfilm.agentbar.ai/webhooks/midtrans

---

## 🧪 TEST CASE 1: GoPay Payment (Full E2E Test)

### Test Scenario
User selects GoPay payment, completes payment via Midtrans Simulator, and webhook is received.

### Test Steps

#### 1. Open Checkout Page
```
URL: https://buatfilm.agentbar.ai
Action: Click "Beli Sekarang" button
```

#### 2. Fill Form Data
Click **"🧪 Auto-Fill Test Data"** button OR manually fill:
- **Nama:** Test Webhook
- **WhatsApp:** 81234567890
- **Email:** webhook@test.com

#### 3. Select Payment Method
- **Payment Method:** GoPay
- Click **"🚀 Bayar Sekarang - Rp 99.000"**

#### 4. Complete Payment in Midtrans
**Expected:** Redirect to Midtrans Snap payment page

**For Desktop Testing:**
1. You'll see GoPay QR code
2. Copy QR code image URL
3. Open: https://simulator.sandbox.midtrans.com/qris
4. Paste QR code URL and complete payment

**For Mobile Testing:**
- Automatically redirected to GoPay Simulator
- Payment succeeds immediately

#### 5. Monitor Webhook Processing

**Open terminal and monitor logs:**
```bash
ssh buatfilm-server "pm2 logs payment-api --lines 50 -f"
```

**Expected Log Output:**
```
[WEBHOOK] ⚠️ Test Notification detected (no signature) - ALLOWING
[WEBHOOK] Order ID: TEST-xxxxx
[WEBHOOK] Processing webhook for order: TEST-xxxxx
[WEBHOOK] ⏳ Payment pending for: TEST-xxxxx
...
[WEBHOOK][POST] ✅ Signature verified for order: TEST-xxxxx
[WEBHOOK][POST] Processing webhook for order: TEST-xxxxx
[WEBHOOK][POST] Transaction Status: settlement
[WEBHOOK][POST] ✅ Payment successful for: TEST-xxxxx
[WEBHOOK] ✅ Success notifications initiated
```

#### 6. Verify Frontend Update
- **Frontend should auto-refresh** (polling every 5 seconds)
- **Order status changes** to PAID
- **Payment confirmation modal** appears

### Success Criteria
- ✅ Payment created successfully
- ✅ Redirected to Midtrans Snap
- ✅ Payment completed in simulator
- ✅ Webhook received with valid signature
- ✅ Order status updated to PAID
- ✅ Frontend detects payment completion
- ✅ WhatsApp notification sent (may fail - Gmail auth error is non-blocking)
- ✅ Email notification sent (may fail - Gmail auth error is non-blocking)

### Expected Timing
- Payment creation: ~2 seconds
- Midtrans redirect: ~1 second
- Payment completion: Immediate (Sandbox)
- Webhook receipt: ~1-5 seconds
- Frontend polling: Every 5 seconds, max 60 attempts (5 minutes)

---

## 🧪 TEST CASE 2: BCA Virtual Account (Full E2E Test)

### Test Scenario
User selects BCA Virtual Account, gets VA number, simulates payment via BCA VA simulator.

### Test Steps

#### 1-3. Same as TEST CASE 1
- Open checkout, fill form, select BCA payment method

#### 4. Get Virtual Account Number
**Expected:** Custom modal appears with:
- BCA logo
- Virtual Account number (format: 88000XXXXXXXXX)
- Payment amount: Rp 99.xxx
- Instructions to pay

#### 5. Simulate Payment

**Copy the VA number** and:
1. Open: https://simulator.sandbox.midtrans.com/bca-va
2. Paste VA number
3. Click "Pay"
4. Payment succeeds immediately

#### 6. Monitor Webhook
Same as TEST CASE 1 Step 5

#### 7. Verify Frontend Update
Same as TEST CASE 1 Step 6

### Success Criteria
- ✅ VA number displayed correctly
- ✅ Payment simulator accepts VA number
- ✅ Webhook received with valid signature
- ✅ Order status updated to PAID
- ✅ Frontend detects payment completion

---

## 🧪 TEST CASE 3: QRIS Payment (Full E2E Test)

### Test Scenario
User selects QRIS, scans QR code via QRIS simulator.

### Test Steps

#### 1-3. Same as TEST CASE 1
- Open checkout, fill form, select QRIS payment method

#### 4. Get QRIS Code
**Expected:** Custom modal appears with:
- QRIS logo
- QR code in iframe OR link to open in new tab
- Payment instructions

#### 5. Simulate Payment

**Option A: If iframe displays QR**
1. Copy QR code URL from iframe
2. Open: https://simulator.sandbox.midtrans.com/qris
3. Paste QR code URL
4. Complete payment

**Option B: "Buka di tab baru" button**
1. Click button to open Midtrans page in new tab
2. Copy QR code from Midtrans page
3. Use QRIS simulator

#### 6-7. Monitor & Verify
Same as TEST CASE 1

---

## 🧪 TEST CASE 4: ShopeePay Payment (If Activated)

### Prerequisite
ShopeePay must be activated in Midtrans Dashboard:
- Settings > Payment Channels > ShopeePay > Activate

### Expected Behavior
- **If NOT activated:** "No payment channels available" error
- **If activated:** Same flow as GoPay TEST CASE 1

---

## 📊 Monitoring Commands During Testing

```bash
# Terminal 1: Monitor PM2 logs (webhooks, order updates)
ssh buatfilm-server "pm2 logs payment-api --lines 100 -f"

# Terminal 2: Monitor nginx access logs
ssh buatfilm-server "sudo tail -f /var/log/nginx/access.log | grep webhooks"

# Terminal 3: Check order status manually
# Replace ORDER_ID with actual order ID from frontend
curl -s https://buatfilm.agentbar.ai/orders/ORDER-ID/status | jq .
```

### Log Patterns to Watch

**Successful Payment Flow:**
```
✅ Payment API response: { success: true, paymentUrl: '...' }
🔄 Checking order status... (Attempt 1/60)
[WEBHOOK][POST] ✅ Signature verified for order: ORDER-ID
[WEBHOOK][POST] Transaction Status: settlement
[WEBHOOK][POST] ✅ Payment successful for: ORDER-ID
✅ Payment completed!
```

**Failed Payment:**
```
❌ Payment API error: ...
[WEBHOOK][POST] Transaction Status: deny
[WEBHOOK][POST] ❌ Payment failed for: ORDER-ID
```

---

## 🎯 Test Execution Checklist

### Pre-Test Setup
- [ ] PM2 payment-api is running: `pm2 status`
- [ ] Webhook endpoint is accessible: `curl https://buatfilm.agentbar.ai/webhooks/midtrans`
- [ ] Frontend is accessible: `curl https://buatfilm.agentbar.ai`
- [ ] PM2 logs monitoring active: `ssh buatfilm-server "pm2 logs payment-api -f"`

### TEST CASE 1: GoPay
- [ ] Form auto-fill works
- [ ] GoPay selection works
- [ ] Redirect to Midtrans Snap
- [ ] QR code displayed
- [ ] QRIS simulator accepts QR
- [ ] Webhook received (check logs)
- [ ] Signature verified (check logs)
- [ ] Order status updated to PAID
- [ ] Frontend polling detects completion
- [ ] Payment confirmation modal appears

### TEST CASE 2: BCA VA
- [ ] BCA VA selected
- [ ] VA number displayed correctly
- [ ] BCA VA simulator accepts payment
- [ ] Webhook received and verified
- [ ] Order updated to PAID
- [ ] Frontend detects completion

### TEST CASE 3: QRIS
- [ ] QRIS selected
- [ ] QR code displayed (iframe or link)
- [ ] QRIS simulator accepts QR
- [ ] Webhook received and verified
- [ ] Order updated to PAID
- [ ] Frontend detects completion

### Post-Test Verification
- [ ] Check order status via API: `curl https://buatfilm.agentbar.ai/orders/ORDER-ID/status`
- [ ] Verify no errors in PM2 logs
- [ ] Check nginx access logs for 200 responses
- [ ] Verify database (if PostgreSQL migration done)

---
2. Click "Order Sekarang" button
3. Fill form with test data:
   ```
   Nama: Test Webhook
   Phone: 081234567890
   Email: webhook@test.com
   ```
4. Select payment method: **GoPay**
5. Click "Order Sekarang - Rp 99.000"
6. Midtrans Snap popup will appear

#### Step 3: Complete Payment in Sandbox
1. In the Snap popup, you'll see payment instructions
2. For GoPay test:
   - Click "Pay" or "Bayar"
   - Payment will be simulated (success immediately in sandbox)
3. Note the **Order ID** displayed (format: DDMMYYXXXXXX)
4. Note the **Transaction ID** if visible

#### Step 4: Monitor PM2 Logs for Webhook
Open a separate terminal and run:

```bash
# SSH to server
ssh buatfilm-server

# Stream PM2 logs in real-time
pm2 logs payment-api --lines 0 -f
```

**Expected Log Output:**
```
[WEBHOOK] Received: {
  order_id: '261225123456',
  transaction_status: 'capture',
  transaction_id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  payment_type: 'gopay',
  signatureValid: true
}
[WEBHOOK] ✅ Signature verified: 261225123456
[WEBHOOK] ✅ Order updated: { order_id: '261225123456', newStatus: 'PAID' }
```

#### Step 5: Verify Signature Verification
Look for these key log messages:
- ✅ `[WEBHOOK] ✅ Signature verified: ORDER_ID` - **PASS**
- `signatureValid: true` in the log

**If you see:**
- ❌ `[WEBHOOK] ❌ Missing signature header` - Firewall issue
- ❌ `[WEBHOOK] ❌ Invalid signature` - Configuration issue

---

### Test Method 2: Manual Webhook Simulation (Advanced)

#### Step 1: Get Test Transaction Details
After creating a transaction via frontend, note:
- Order ID (from URL or response)
- Status Code (200 for success)
- Gross Amount (99000)
- Server Key (from .env file)

#### Step 2: Generate Valid Signature
The signature is generated as:
```bash
INPUT = "${ORDER_ID}${STATUS_CODE}${GROSS_AMOUNT}${SERVER_KEY}"
SIGNATURE = SHA512(INPUT)
```

**Example:**
```bash
ORDER_ID="261225123456"
STATUS_CODE="200"
GROSS_AMOUNT="99000.00"
SERVER_KEY="SB-MID-SERVER-xxxxx"

INPUT="${ORDER_ID}${STATUS_CODE}${GROSS_AMOUNT}${SERVER_KEY}"
SIGNATURE=$(echo -n "$INPUT" | openssl dgst -sha512 -hmac "your-key" | awk '{print $NF}')

echo "Signature: $SIGNATURE"
```

#### Step 3: Send Webhook Manually
```bash
curl -X POST https://buatfilm.agentbar.ai/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -H "x-signature-key: ${SIGNATURE}" \
  -d '{
    "order_id": "261225123456",
    "status_code": "200",
    "gross_amount": "99000.00",
    "transaction_status": "capture",
    "transaction_id": "test-txn-123",
    "payment_type": "gopay"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "order_id": "261225123456",
  "status": "PAID"
}
```

**Expected PM2 Logs:**
```
[WEBHOOK] ✅ Signature verified: 261225123456
```

---

## 💳 Full Payment Flow Testing

### Test Case 1: GoPay Payment Flow

#### Objective
End-to-end test of complete purchase flow using GoPay.

#### Prerequisites
- Midtrans Sandbox access
- Test phone number with GoPay account (or use simulation)
- PM2 logs monitoring active

#### Test Steps

**1. Navigate to Website**
```
URL: https://buatfilm.agentbar.ai
```

**2. Click Order Button**
- Look for button: "Order Sekarang" or "Beli Sekarang"
- Click to open order form

**3. Fill Order Form**
```
Nama Lengkap:  Test User GoPay
No. WhatsApp:   081234567890
Email:          test-gopay@example.com
```

**4. Select Payment Method**
- Choose: **GoPay**
- Verify: Payment fee is displayed (if any)

**5. Submit Order**
- Click: "Order Sekarang - Rp 99.000"
- Wait for Midtrans Snap popup to load

**6. Complete Payment in Snap**
- Click "Pay" / "Bayar" button
- For sandbox: Payment should succeed immediately
- Note the Order ID displayed

**7. Verify Payment Success**
Expected behavior:
- ✅ Snap popup shows success message
- ✅ Redirect to thank you page (if configured)
- ✅ PM2 logs show webhook received
- ✅ Order status updated to "PAID"

**8. Check PM2 Logs**
```bash
ssh buatfilm-server "pm2 logs payment-api --lines 50 --nostream | grep WEBHOOK"
```

**Expected Output:**
```
[WEBHOOK] ✅ Signature verified: 261225123456
[WEBHOOK] ✅ Order updated: { order_id: '261225123456', newStatus: 'PAID' }
```

---

### Test Case 2: BCA Bank Transfer Flow

#### Objective
Test bank transfer payment method with VA number generation.

#### Test Steps

**1-4. Same as Test Case 1**

**5. Select Payment Method**
- Choose: **BCA Virtual Account**
- Verify: No additional payment fee

**6. Submit Order**
- Click: "Order Sekarang - Rp 99.000"
- Wait for Midtrans Snap popup to load

**7. Note VA Number**
- Snap popup will display BCA VA number
- Format: `88000 + unique identifier`
- Example: `8800012345678901`
- **IMPORTANT:** Copy or screenshot this number

**8. Verify VA Number in PM2 Logs**
```bash
ssh buatfilm-server "pm2 logs payment-api --lines 50 --nostream | grep -i va"
```

**Expected Output:**
```
[PAYMENT] VA Number generated: 8800012345678901
```

**9. Simulate Payment (Optional)**
To test payment completion:
1. Go to: https://simulator.sandbox.midtrans.com/
2. Find the transaction
3. Click "Simulate Payment"
4. Enter the VA number
5. Confirm payment
6. Check PM2 logs for webhook

---

### Test Case 3: QRIS Payment Flow

#### Objective
Test QRIS payment method with QR code generation.

#### Test Steps

**1-4. Same as Test Case 1**

**5. Select Payment Method**
- Choose: **QRIS**
- Verify: QR code is displayed

**6. Submit Order**
- Click: "Order Sekarang - Rp 99.000"
- Snap popup will display QR code

**7. Verify QR Code**
- ✅ QR code is visible and scannable
- ✅ Amount displayed: Rp 99.000
- ✅ Merchant name visible

**8. Check PM2 Logs**
```bash
ssh buatfilm-server "pm2 logs payment-api --lines 50 --nostream"
```

---

## 📊 Test Data & Credentials

### Midtrans Sandbox Test Credentials

**IMPORTANT:** These are the official Midtrans Sandbox test credentials from https://docs.midtrans.com/docs/testing-payment-on-sandbox

> ⚠️ **WARNING:** Do NOT attempt to pay with real payment on Sandbox transactions. Sandbox transactions should only be paid with the Sandbox Payment Simulator/Credentials explained below. Midtrans will not be able to help recover any real-world payment funds if you do so.

---

#### 1. GoPay Payment Test

**How to Test:**
- On **mobile**: You are automatically redirected to GoPay Simulator
- On **desktop**: QR Code image is displayed
  - Copy the QR Code image URL
  - Paste into [QRIS Simulator](https://simulator.sandbox.midtrans.com/qris)

**Notes:**
- Payment will succeed immediately in Sandbox
- No real GoPay account needed
- No real payment required

**Test Data:**
```
Test Profile 1 (GoPay):
  Nama:  Test GoPay User
  Phone: 081234567890
  Email: test-gopay@example.com
```

---

#### 2. BCA Virtual Account Test

**How to Test:**
1. Select BCA Virtual Account payment method
2. Midtrans will generate a dummy BCA VA number
3. Copy the VA number (format: `88000XXXXXXXXX`)
4. Use the [BCA Virtual Account Simulator](https://simulator.sandbox.midtrans.com/bca-va)
5. Enter the VA number and complete payment

**Test Data:**
```
Test Profile 2 (BCA VA):
  Nama:  Test BCA User
  Phone: 081987654321
  Email: test-bca@example.com
```

**Expected Behavior:**
- VA number displayed immediately after order
- Payment can be simulated via BCA VA simulator
- Webhook will be triggered after simulation

---

#### 3. QRIS Payment Test

**How to Test:**
1. Select QRIS payment method
2. Midtrans will display QR Code image
3. Copy the QR Code image URL
4. Paste into [QRIS Simulator](https://simulator.sandbox.midtrans.com/qris)
5. Complete payment simulation

**Test Data:**
```
Test Profile 3 (QRIS):
  Nama:  Test QRIS User
  Phone: 081567890123
  Email: test-qris@example.com
```

> ⚠️ **Note:** There is currently an intermittent issue with QRIS simulator affecting some older merchant accounts. If QRIS simulator doesn't work for you, please reach out to support@midtrans.com

---

#### 4. Credit/Debit Card Test

**Test Cards for Sandbox:**

**General Cards (VISA):**
| Card Number | Description | Result |
|-------------|-------------|--------|
| 4811 1111 1111 1114 | Accept Transaction | ✅ Success |
| 4911 1111 1111 1113 | Denied by Bank | ❌ Failed |
| 4411 1111 1111 1118 | Accept (No 3DS) | ✅ Success |
| 4611 1111 1111 1116 | Denied by FDS | ❌ Failed |

**General Cards (MASTERCARD):**
| Card Number | Description | Result |
|-------------|-------------|--------|
| 5211 1111 1111 1117 | Accept Transaction | ✅ Success |
| 5111 1111 1111 1118 | Denied by Bank | ❌ Failed |

**Card Payment Details:**
| Input | Value |
|-------|-------|
| Expiry Month | `01` (or any month) |
| Expiry Year | `2025` (or any future year) |
| CVV | `123` |
| OTP/3DS | `112233` |

**BCA-Specific Cards (for testing bank-specific features):**
| Card Number | Description |
|-------------|-------------|
| 4773 7760 5705 1650 | BCA VISA - Full Authentication (Accept) |
| 5229 9031 3685 3172 | BCA MASTERCARD - Full Authentication (Accept) |
| 4773 7738 1098 1190 | BCA VISA - Attempted Authentication (Accept) |
| 5229 9073 6430 3610 | BCA MASTERCARD - Attempted Authentication (Accept) |
| 4773 7752 0201 1809 | BCA VISA - Denied |
| 5229 9034 0542 3830 | BCA MASTERCARD - Denied |

---

#### 5. Bank Transfer - Other Banks

**Mandiri Bill Payment:**
- Use [Mandiri Bill Payment Simulator](https://simulator.sandbox.midtrans.com/mandiri-bill)
- Input company code as bill code
- Input Mandiri Bill number as bill key

**BNI Virtual Account:**
- Use [BNI Virtual Account Simulator](https://simulator.sandbox.midtrans.com/bni-va)
- Enter the generated BNI VA number

**BRI Virtual Account:**
- Use [BRI Virtual Account Simulator](https://simulator.sandbox.midtrans.com/bri-va)
- Open API and choose BRI as the bank

**CIMB Virtual Account:**
- Use [CIMB Virtual Account Simulator](https://simulator.sandbox.midtrans.com/cimb-va)
- Open API and choose CIMB as the bank

**Permata Virtual Account:**
- Use [Permata Virtual Account Simulator](https://simulator.sandbox.midtrans.com/permata-va)
- Open API and choose Permata as the bank

---

#### 6. E-Wallet (Other than GoPay)

**ShopeePay:**
- On **mobile**: Automatically redirected to ShopeePay Simulator
- On **desktop**: QR Code displayed
  - Copy QR Code image URL
  - Paste into [QRIS Simulator](https://simulator.sandbox.midtrans.com/qris)

**Note:** For GoPay Tokenization testing phone numbers in Sandbox, refer to Midtrans documentation.

---

### Midtrans Transaction Status Codes

**Important status codes to recognize:**

| Status Code | Transaction Status | Our Status | Meaning |
|-------------|-------------------|------------|---------|
| 200 | capture | PAID | Payment successful |
| 200 | settlement | PAID | Payment settled |
| 200 | pending | PENDING_PAYMENT | Waiting for payment |
| 201 | pending | PENDING_PAYMENT | Waiting for payment |
| 202 | deny | FAILED | Payment denied |
| 202 | cancel | FAILED | Payment cancelled |
| 202 | expire | EXPIRED | Payment expired |
| 404 | - | FAILED | Transaction not found |

**Status Workflow:**
```
CREATED → PENDING_PAYMENT → PAID (final)
                  ↓
                FAILED
                  ↓
                EXPIRED
```

---

---

## 🔧 Troubleshooting Guide

### Issue 1: Webhook Not Received

**Symptoms:**
- Payment completed in Snap, but no webhook in logs
- Order status not updated to PAID

**Diagnosis:**
```bash
# Check if webhook route is accessible
curl -X POST https://buatfilm.agentbar.ai/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'

# Expected: 401 Unauthorized (missing signature)
# If 404: Route not configured
# If 405: Method not allowed
```

**Solution:**
1. Verify nginx configuration
2. Check PM2 process is running
3. Check webhook URL in Midtrans Dashboard
   - Go to: Settings > Webhooks
   - Verify URL: `https://buatfilm.agentbar.ai/webhooks/midtrans`

---

### Issue 2: Invalid Signature Error

**Symptoms:**
- PM2 logs show: `[WEBHOOK] ❌ Invalid signature`
- Legitimate webhooks being rejected

**Diagnosis:**
```bash
# Check Server Key
ssh buatfilm-server "cat /var/www/api/.env | grep MIDTRANS_SERVER_KEY"

# Verify it matches Midtrans Dashboard
```

**Solution:**
1. Login to Midtrans Dashboard
2. Go to: Settings > Access Keys
3. Copy Server Key
4. Update on server:
   ```bash
   ssh buatfilm-server
   nano /var/www/api/.env
   # Update MIDTRANS_SERVER_KEY
   pm2 reload payment-api
   ```

---

### Issue 3: Payment Success but Order Not Updated

**Symptoms:**
- Payment successful in Snap
- Webhook received (visible in logs)
- Order status not updated to PAID

**Diagnosis:**
```bash
# Check for errors in webhook processing
ssh buatfilm-server "pm2 logs payment-api --lines 100 --nostream | grep -i error"
```

**Possible Causes:**
1. Database not connected (if PostgreSQL deployed)
2. Order ID mismatch
3. Status mapping error

**Solution:**
1. Check database connection
2. Verify order ID format matches
3. Check status mapping in webhook handler

---

### Issue 4: PM2 Process Crashing

**Symptoms:**
- PM2 status shows `errored` or `stopped`
- 502/503 errors from API

**Diagnosis:**
```bash
# Check PM2 status
ssh buatfilm-server "pm2 status"

# Check error logs
ssh buatfilm-server "pm2 logs payment-api --err --lines 50 --nostream"

# Check system resources
ssh buatfilm-server "free -h && df -h"
```

**Solution:**
1. Restart PM2 process:
   ```bash
   ssh buatfilm-server "pm2 restart payment-api"
   ```
2. Check for uncaught exceptions
3. Verify environment variables
4. Check port conflicts (port 3002)

---

### Issue 5: Nginx 502 Bad Gateway

**Symptoms:**
- All API endpoints return 502
- Frontend loads fine

**Diagnosis:**
```bash
# Check if backend is running
ssh buatfilm-server "pm2 status"

# Check if port 3002 is listening
ssh buatfilm-server "netstat -tlnp | grep 3002"
```

**Solution:**
1. If PM2 stopped: `pm2 restart payment-api`
2. If port blocked: Check firewall rules
3. If nginx misconfigured: Reload nginx

```bash
ssh buatfilm-server "
  pm2 restart payment-api
  nginx -t
  systemctl reload nginx
"
```

---

## ✅ Test Completion Checklist

### SEC-002: Valid Webhook Signature
- [ ] Login to Midtrans Sandbox
- [ ] Create test transaction via frontend
- [ ] Complete payment in Snap
- [ ] Monitor PM2 logs for webhook
- [ ] Verify signature validation succeeded
- [ ] Verify order status updated to PAID

### Full Payment Flow: GoPay
- [ ] Navigate to website
- [ ] Fill order form with test data
- [ ] Select GoPay payment
- [ ] Submit order
- [ ] Complete payment in Snap
- [ ] Verify success message
- [ ] Check PM2 logs
- [ ] Verify order status = PAID

### Full Payment Flow: BCA
- [ ] Navigate to website
- [ ] Fill order form with test data
- [ ] Select BCA payment
- [ ] Submit order
- [ ] Note VA number
- [ ] Verify VA number in logs
- [ ] (Optional) Simulate payment
- [ ] Verify order status updated

### Full Payment Flow: QRIS
- [ ] Navigate to website
- [ ] Fill order form with test data
- [ ] Select QRIS payment
- [ ] Submit order
- [ ] Verify QR code displayed
- [ ] Check PM2 logs

---

## 📝 Test Results Template

After completing tests, document results:

```markdown
## Test Results - [DATE]

### SEC-002: Valid Webhook Signature
- Status: ✅ PASS / ❌ FAIL
- Notes:
  - Order ID: [XXXXXX]
  - Transaction ID: [XXXXXX]
  - Signature Verified: Yes/No
  - Order Updated: Yes/No

### GoPay Payment Flow
- Status: ✅ PASS / ❌ FAIL
- Notes:
  - Order ID: [XXXXXX]
  - Payment Successful: Yes/No
  - Webhook Received: Yes/No
  - Order Status: [PAID/PENDING]

### BCA Payment Flow
- Status: ✅ PASS / ❌ FAIL
- Notes:
  - Order ID: [XXXXXX]
  - VA Number Generated: Yes/No
  - VA Number: [88000XXXXX]

### QRIS Payment Flow
- Status: ✅ PASS / ❌ FAIL
- Notes:
  - Order ID: [XXXXXX]
  - QR Code Displayed: Yes/No
```

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅
1. Document all test results
2. Proceed to Phase 2 (PostgreSQL Migration)
3. Run: `./deploy-phase2-postgres.sh`

### If Tests Fail ❌
1. Document failures with screenshots
2. Check PM2 logs for errors
3. Create GitHub issue for each failure
4. Fix issues before proceeding to Phase 2

---

**Happy Testing! 🧪**

*For questions or issues, check:*
- E2E-TESTING-PLAN-GPT.md - Complete test documentation
- TEST-RESULTS-PHASE1.md - Phase 1 automated test results
- ARCHITECTURE-GPT.md - System architecture details
