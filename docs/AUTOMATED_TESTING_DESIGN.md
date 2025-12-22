# 🧪 AUTOMATED TESTING DESIGN - COMPLETE USER JOURNEY

## 📋 TESTING OVERVIEW

Berdasarkan complete user journey yang sudah didefinisikan, ini adalah design lengkap untuk automated testing.

---

## 🎯 TESTING STRATEGY

### **Testing Pyramid**

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲         5 tests (Critical paths)
                 ╱──────╲
                ╱        ╲
               ╱Integration╲      15 tests (API + UI flow)
              ╱────────────╲
             ╱              ╲
            ╱  Unit Tests    ╲    50+ tests (Functions/Components)
           ╱──────────────────╲
          ╱____________________╲
```

### **Testing Scope**

| Layer | Coverage | Tools | Priority |
|-------|----------|-------|----------|
| **E2E** | Complete user journeys | Playwright | 🔴 Critical |
| **Integration** | API + Frontend integration | Supertest + Playwright | 🟡 High |
| **Unit** | Individual functions | Jest/Vitest | 🟢 Medium |
| **Visual** | UI components | Percy/Chromatic | 🔵 Low |
| **Performance** | Load & speed | Lighthouse, K6 | 🟢 Medium |

---

## 🧪 TEST SCENARIOS DESIGN

### **SCENARIO 1: Happy Path - Bank Transfer (BCA)** ⭐ CRITICAL
**Priority**: P0 - Must Pass
**Frequency**: Every deployment
**Duration**: ~3-5 minutes

#### **Test Flow**
```
START
  ↓
Visit Landing Page
  ↓
Verify Page Loaded (Hero, Countdown, Pricing)
  ↓
Click "DAPATKAN AKSES SEKARANG"
  ↓
Verify Checkout Form Displayed
  ↓
Fill Customer Data
  - Name: "Test User Automation"
  - Phone: "81234567890"
  - Email: "test+{timestamp}@example.com"
  ↓
Select Payment Method: BCA
  ↓
Verify Order Summary Correct
  ↓
Click "Order Sekarang"
  ↓
Wait for API Response
  ↓
Verify Payment Instructions Displayed
  - Order ID present
  - BCA account number shown
  - Exact amount with unique code
  ↓
[SIMULATE] Call payment webhook (paid status)
  ↓
Wait for status update (polling)
  ↓
Verify Success Page Displayed
  ↓
Verify Email Sent (test inbox)
  ↓
Verify Course Access Created
  ↓
END (PASS)
```

#### **Playwright Test Code**

```typescript
// e2e/tests/happy-path-bank-transfer.spec.ts
import { test, expect } from '@playwright/test';
import { simulatePayment, getTestEmail } from '../helpers/test-utils';

test.describe('Happy Path - Bank Transfer (BCA)', () => {

  test('Complete purchase flow with BCA bank transfer', async ({ page }) => {
    // Generate unique email for this test run
    const timestamp = Date.now();
    const testEmail = `test+${timestamp}@example.com`;

    // Step 1: Visit landing page
    await test.step('Visit landing page', async () => {
      await page.goto('http://localhost:3002');

      // Verify page loads
      await expect(page.locator('h1')).toContainText('Bikin Film');
      await expect(page.locator('text=DAPATKAN AKSES SEKARANG')).toBeVisible();

      // Screenshot for visual regression
      await page.screenshot({ path: 'screenshots/landing-page.png' });
    });

    // Step 2: Click CTA button
    await test.step('Click order button', async () => {
      await page.click('text=DAPATKAN AKSES SEKARANG');

      // Wait for checkout form
      await page.waitForSelector('text=Data Diri', { timeout: 5000 });
      await expect(page.locator('h2')).toContainText('DAPATKAN AKSES SEKARANG');
    });

    // Step 3: Fill checkout form
    await test.step('Fill customer data', async () => {
      // Name field
      await page.fill('input[placeholder*="nama lengkap"]', 'Test User Automation');

      // Phone field (without +62)
      await page.fill('input[placeholder*="812345678"]', '81234567890');

      // Email field
      await page.fill('input[placeholder*="email"]', testEmail);

      // Verify form filled
      await expect(page.locator('input[value="Test User Automation"]')).toBeVisible();
    });

    // Step 4: Select payment method
    await test.step('Select BCA bank transfer', async () => {
      await page.click('text=Bank BCA');

      // Verify selection (border should change)
      const bcaOption = page.locator('label:has-text("Bank BCA")');
      await expect(bcaOption).toHaveClass(/border-blue-500/);
    });

    // Step 5: Verify order summary
    await test.step('Verify order summary', async () => {
      await expect(page.locator('text=Kelas Buat Film Pakai AI')).toBeVisible();
      await expect(page.locator('text=Rp 99.000')).toBeVisible();
    });

    // Step 6: Submit order
    let orderId: string;
    await test.step('Submit order', async () => {
      // Listen for API call
      const orderPromise = page.waitForResponse(
        response => response.url().includes('/api/orders/create') && response.status() === 200
      );

      await page.click('text=Order Sekarang');

      // Wait for loading state
      await expect(page.locator('text=Memproses Pesanan')).toBeVisible();

      // Wait for API response
      const orderResponse = await orderPromise;
      const orderData = await orderResponse.json();
      orderId = orderData.orderId;

      console.log('✅ Order created:', orderId);
    });

    // Step 7: Verify payment instructions
    await test.step('Verify payment instructions displayed', async () => {
      // Should see payment page
      await expect(page.locator('text=Instruksi Pembayaran')).toBeVisible({ timeout: 10000 });

      // Verify order ID
      await expect(page.locator(`text=${orderId}`)).toBeVisible();

      // Verify BCA account details
      await expect(page.locator('text=1330018381608')).toBeVisible();
      await expect(page.locator('text=Faisal heri setiawan')).toBeVisible();

      // Verify amount with unique code (e.g., Rp 98,567)
      const amountText = await page.textContent('text=/Rp 98,\\d{3}/');
      expect(amountText).toMatch(/Rp 98,\d{3}/);

      // Screenshot payment instructions
      await page.screenshot({ path: `screenshots/payment-instructions-${orderId}.png` });
    });

    // Step 8: Simulate payment via webhook
    await test.step('Simulate payment webhook', async () => {
      const paymentResult = await simulatePayment(orderId, 'midtrans', {
        transaction_status: 'settlement',
        gross_amount: '98567',
        payment_type: 'bank_transfer',
        va_numbers: [{ bank: 'bca', va_number: '1330018381608' }]
      });

      expect(paymentResult.success).toBe(true);
      console.log('✅ Payment webhook simulated');
    });

    // Step 9: Wait for status update (polling)
    await test.step('Wait for payment confirmation', async () => {
      // Frontend should poll and update status
      await page.waitForSelector('text=Pembayaran Berhasil', { timeout: 15000 });

      // Verify success page
      await expect(page.locator('text=🎉')).toBeVisible();
      await expect(page.locator(`text=${orderId}`)).toBeVisible();

      // Screenshot success page
      await page.screenshot({ path: `screenshots/payment-success-${orderId}.png` });
    });

    // Step 10: Verify email sent
    await test.step('Verify course access email sent', async () => {
      // Wait a bit for email to be sent
      await page.waitForTimeout(3000);

      // Check test email inbox
      const emails = await getTestEmail(testEmail);

      // Should have 2 emails: payment confirmation + course access
      expect(emails.length).toBeGreaterThanOrEqual(2);

      // Verify course access email
      const courseEmail = emails.find(e => e.subject.includes('Akses Course'));
      expect(courseEmail).toBeDefined();
      expect(courseEmail.body).toContain('course.agentbar.ai');
      expect(courseEmail.body).toMatch(/password/i);

      console.log('✅ Emails verified:', emails.map(e => e.subject));
    });

    // Step 11: Verify course access created
    await test.step('Verify course access in LMS', async () => {
      // Call API to check course access
      const response = await fetch(`http://localhost:3002/api/course/access?email=${testEmail}`);
      const courseAccess = await response.json();

      expect(courseAccess.exists).toBe(true);
      expect(courseAccess.courseId).toBe('ai-movie-maker');
      expect(courseAccess.status).toBe('active');

      console.log('✅ Course access verified');
    });

    // Final assertion
    console.log('✅ TEST PASSED: Complete happy path with BCA bank transfer');
  });
});
```

#### **Expected Results**
- ✅ Order created in database
- ✅ Payment gateway called (Midtrans API)
- ✅ Webhook processed successfully
- ✅ Order status updated to "paid"
- ✅ 2 emails sent (confirmation + access)
- ✅ Course access created in LMS
- ✅ User sees success page

#### **Test Data**
```json
{
  "customer": {
    "name": "Test User Automation",
    "phone": "+6281234567890",
    "email": "test+{timestamp}@example.com"
  },
  "order": {
    "basePrice": 99000,
    "uniqueCode": 567,
    "totalAmount": 98433,
    "paymentMethod": "bca"
  },
  "expectedDuration": "180000ms",
  "assertions": 25
}
```

---

### **SCENARIO 2: Happy Path - QRIS Payment** ⭐ CRITICAL
**Priority**: P0
**Duration**: ~2-3 minutes

#### **Test Flow**
```
Visit Landing → Checkout → Fill Form → Select QRIS
→ Submit Order → Verify QR Code Displayed
→ Simulate Payment → Verify Success → Verify Email
```

#### **Key Assertions**
- QR code image is real (not placeholder)
- QR code contains valid QRIS data
- QR code can be scanned
- Payment confirmed within 30 seconds
- Webhook processed correctly

#### **Playwright Code Snippet**
```typescript
test('Complete purchase with QRIS', async ({ page }) => {
  const testEmail = `qris+${Date.now()}@example.com`;

  await page.goto('http://localhost:3002');
  await page.click('text=DAPATKAN AKSES SEKARANG');

  // Fill form
  await page.fill('input[placeholder*="nama"]', 'QRIS Test User');
  await page.fill('input[placeholder*="812"]', '82234567890');
  await page.fill('input[placeholder*="email"]', testEmail);

  // Select QRIS
  await page.click('text=QRIS - Semua Bank');

  // Submit
  await page.click('text=Order Sekarang');

  // Verify QR code
  await expect(page.locator('img[alt*="QR"]')).toBeVisible();

  // Check QR is real (not placeholder)
  const qrSrc = await page.getAttribute('img[alt*="QR"]', 'src');
  expect(qrSrc).not.toContain('placeholder');
  expect(qrSrc).toMatch(/data:image\/png|https:.*xendit/);

  // Can download QR
  const downloadPromise = page.waitForEvent('download');
  await page.click('text=Download QR');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('qr');

  // Simulate payment
  const orderId = await page.textContent('text=/ORDER-/');
  await simulatePayment(orderId.match(/ORDER-\w+/)[0], 'xendit', {
    status: 'PAID',
    amount: 98567
  });

  // Verify success
  await expect(page.locator('text=Pembayaran Berhasil')).toBeVisible({ timeout: 10000 });
});
```

---

### **SCENARIO 3: Happy Path - E-Wallet (GoPay)** ⭐ CRITICAL
**Priority**: P0
**Duration**: ~2-3 minutes

#### **Test Flow**
```
Visit Landing → Checkout → Fill Form → Select GoPay
→ Submit → Verify Deeplink/QR → Simulate Payment → Success
```

#### **Key Assertions**
- GoPay deeplink generated
- Deeplink opens GoPay app (mobile)
- QR code displayed (desktop)
- Payment completed in GoPay
- Webhook received and processed

---

### **SCENARIO 4: Form Validation Errors** 🔴 CRITICAL
**Priority**: P0
**Duration**: ~1 minute

#### **Test Cases**

**4.1 Empty Form Submission**
```typescript
test('Cannot submit empty form', async ({ page }) => {
  await page.goto('http://localhost:3002');
  await page.click('text=DAPATKAN AKSES SEKARANG');

  // Try to submit without filling
  await page.click('text=Order Sekarang');

  // Should show validation errors
  await expect(page.locator('text=/required|wajib/i')).toBeVisible();

  // Order should NOT be created
  const apiCalled = await page.evaluate(() => {
    return (window as any).lastAPICall !== undefined;
  });
  expect(apiCalled).toBe(false);
});
```

**4.2 Invalid Email Format**
```typescript
test('Reject invalid email format', async ({ page }) => {
  await page.goto('http://localhost:3002');
  await page.click('text=DAPATKAN AKSES SEKARANG');

  await page.fill('input[placeholder*="nama"]', 'Test User');
  await page.fill('input[placeholder*="812"]', '81234567890');
  await page.fill('input[placeholder*="email"]', 'invalid-email'); // ❌ Invalid

  await page.click('text=Order Sekarang');

  // Should show email validation error
  await expect(page.locator('text=/email.*valid/i')).toBeVisible();
});
```

**4.3 Invalid Phone Number**
```typescript
test('Reject invalid phone number', async ({ page }) => {
  // Too short
  await page.fill('input[placeholder*="812"]', '123'); // ❌ Only 3 digits
  await page.click('text=Order Sekarang');
  await expect(page.locator('text=/phone.*valid/i')).toBeVisible();

  // Contains letters
  await page.fill('input[placeholder*="812"]', '812abc5678'); // ❌ Has letters
  await page.click('text=Order Sekarang');
  await expect(page.locator('text=/phone.*number/i')).toBeVisible();
});
```

**4.4 Name Too Short**
```typescript
test('Reject name less than 3 characters', async ({ page }) => {
  await page.fill('input[placeholder*="nama"]', 'AB'); // ❌ Only 2 chars
  await page.click('text=Order Sekarang');
  await expect(page.locator('text=/name.*3.*character/i')).toBeVisible();
});
```

---

### **SCENARIO 5: Payment Timeout** 🟡 IMPORTANT
**Priority**: P1
**Duration**: ~2 minutes (fast-forward time)

#### **Test Flow**
```typescript
test('Order expires after 24 hours', async ({ page }) => {
  // Create order
  const orderId = await createTestOrder(page, {
    name: 'Timeout Test',
    phone: '84234567890',
    email: 'timeout@test.com',
    paymentMethod: 'bca'
  });

  // Fast-forward system time by 25 hours
  await page.evaluate(() => {
    const now = Date.now();
    const future = now + (25 * 60 * 60 * 1000); // +25 hours
    Date.now = () => future;
  });

  // Try to pay expired order
  const paymentResult = await simulatePayment(orderId, 'midtrans');

  // Should reject payment
  expect(paymentResult.success).toBe(false);
  expect(paymentResult.error).toContain('expired');

  // Check order status in database
  const order = await getOrderStatus(orderId);
  expect(order.status).toBe('expired');
});
```

---

### **SCENARIO 6: Duplicate Payment Prevention** 🟡 IMPORTANT
**Priority**: P1
**Duration**: ~1 minute

#### **Test Flow**
```typescript
test('Cannot pay same order twice', async ({ page }) => {
  // Create and pay order
  const orderId = await createAndPayOrder(page, {
    name: 'Duplicate Test',
    email: 'duplicate@test.com'
  });

  // Wait for order to be marked as paid
  await waitForOrderStatus(orderId, 'paid');

  // Try to pay again
  const secondPayment = await simulatePayment(orderId, 'midtrans');

  // Should reject
  expect(secondPayment.success).toBe(false);
  expect(secondPayment.error).toContain('already paid');

  // Course access should not be duplicated
  const courseAccess = await getCourseAccessCount('duplicate@test.com');
  expect(courseAccess.count).toBe(1); // Only 1 access
});
```

---

### **SCENARIO 7: Wrong Payment Amount** 🟡 IMPORTANT
**Priority**: P1
**Duration**: ~1 minute

#### **Test Flow**
```typescript
test('Reject payment with wrong amount', async ({ page }) => {
  const orderId = await createTestOrder(page);

  // Expected amount: Rp 98,567
  // Send wrong amount: Rp 99,000
  const paymentResult = await simulatePayment(orderId, 'midtrans', {
    transaction_status: 'settlement',
    gross_amount: '99000' // ❌ Wrong! Should be 98567
  });

  // Should reject or flag for manual review
  expect(paymentResult.success).toBe(false);
  expect(paymentResult.error).toContain('amount mismatch');

  // Order status should still be pending
  const order = await getOrderStatus(orderId);
  expect(order.status).toBe('pending');
});
```

---

### **SCENARIO 8: Network Error Handling** 🟢 MEDIUM
**Priority**: P2
**Duration**: ~2 minutes

#### **Test Cases**

**8.1 API Timeout**
```typescript
test('Handle API timeout gracefully', async ({ page }) => {
  // Mock slow API (10 second delay)
  await page.route('**/api/orders/create', route => {
    setTimeout(() => route.abort(), 10000);
  });

  await fillCheckoutForm(page);
  await page.click('text=Order Sekarang');

  // Should show error message
  await expect(page.locator('text=/timeout|error|failed/i')).toBeVisible({ timeout: 12000 });

  // Should allow retry
  await expect(page.locator('text=/try again|retry/i')).toBeVisible();
});
```

**8.2 Server Error (500)**
```typescript
test('Handle 500 server error', async ({ page }) => {
  await page.route('**/api/orders/create', route => {
    route.fulfill({ status: 500, body: 'Internal Server Error' });
  });

  await fillCheckoutForm(page);
  await page.click('text=Order Sekarang');

  // Should show user-friendly error
  await expect(page.locator('text=/something went wrong/i')).toBeVisible();
});
```

**8.3 Network Offline**
```typescript
test('Handle offline state', async ({ page, context }) => {
  await fillCheckoutForm(page);

  // Go offline
  await context.setOffline(true);

  await page.click('text=Order Sekarang');

  // Should show offline message
  await expect(page.locator('text=/no.*connection|offline/i')).toBeVisible();

  // Go back online
  await context.setOffline(false);

  // Should allow retry
  await page.click('text=Try Again');
  await expect(page.locator('text=Instruksi Pembayaran')).toBeVisible();
});
```

---

### **SCENARIO 9: Email Delivery** 🟡 IMPORTANT
**Priority**: P1
**Duration**: ~2 minutes

#### **Test Flow**
```typescript
test('Customer receives all expected emails', async ({ page }) => {
  const testEmail = `email-test+${Date.now()}@example.com`;

  // Complete purchase
  await completePurchase(page, {
    name: 'Email Test User',
    email: testEmail,
    paymentMethod: 'bca'
  });

  // Wait for emails (up to 30 seconds)
  await page.waitForTimeout(5000);

  // Check test inbox
  const emails = await getTestEmails(testEmail);

  // Should receive 3 emails:
  expect(emails.length).toBe(3);

  // 1. Order confirmation
  const orderConfirm = emails.find(e => e.subject.includes('Order Confirmation'));
  expect(orderConfirm).toBeDefined();
  expect(orderConfirm.body).toContain('Order ID');

  // 2. Payment confirmation
  const paymentConfirm = emails.find(e => e.subject.includes('Payment Confirmed'));
  expect(paymentConfirm).toBeDefined();
  expect(paymentConfirm.body).toContain('Rp 98,');

  // 3. Course access
  const courseAccess = emails.find(e => e.subject.includes('Akses Course'));
  expect(courseAccess).toBeDefined();
  expect(courseAccess.body).toContain('course.agentbar.ai');
  expect(courseAccess.body).toMatch(/password.*:\s*\w+/i);

  // Verify email deliverability
  expect(emails.every(e => e.delivered)).toBe(true);

  // Verify no emails in spam
  const spamEmails = await getSpamEmails(testEmail);
  expect(spamEmails.length).toBe(0);
});
```

---

### **SCENARIO 10: Course Access** 🟡 IMPORTANT
**Priority**: P1
**Duration**: ~3 minutes

#### **Test Flow**
```typescript
test('User can login to course after payment', async ({ page, browser }) => {
  const testEmail = `course-login+${Date.now()}@example.com`;

  // Complete purchase
  const { orderId, tempPassword } = await completePurchase(page, {
    email: testEmail
  });

  // Wait for course access email
  await page.waitForTimeout(3000);

  // Open new tab for course platform
  const coursePage = await browser.newPage();
  await coursePage.goto('https://course.agentbar.ai/login');

  // Login with credentials
  await coursePage.fill('input[type="email"]', testEmail);
  await coursePage.fill('input[type="password"]', tempPassword);
  await coursePage.click('button[type="submit"]');

  // Should redirect to dashboard
  await expect(coursePage).toHaveURL(/.*dashboard/);

  // Verify course access
  await expect(coursePage.locator('text=AI Movie Maker')).toBeVisible();
  await expect(coursePage.locator('text=Module 1')).toBeVisible();

  // Verify user can start first lesson
  await coursePage.click('text=Start Module 1');
  await expect(coursePage.locator('video')).toBeVisible();
});
```

---

## 🔧 TEST HELPERS & UTILITIES

### **Helper Functions**

```typescript
// e2e/helpers/test-utils.ts

export async function fillCheckoutForm(
  page: Page,
  data: {
    name: string;
    phone: string;
    email: string;
    paymentMethod: string;
  }
) {
  await page.fill('input[placeholder*="nama"]', data.name);
  await page.fill('input[placeholder*="812"]', data.phone);
  await page.fill('input[placeholder*="email"]', data.email);
  await page.click(`text=${getPaymentLabel(data.paymentMethod)}`);
}

export async function simulatePayment(
  orderId: string,
  gateway: 'midtrans' | 'xendit',
  customPayload?: any
) {
  const webhookUrl = gateway === 'midtrans'
    ? 'http://localhost:3002/webhooks/midtrans'
    : 'http://localhost:3002/webhooks/xendit';

  const defaultPayload = gateway === 'midtrans' ? {
    order_id: orderId,
    transaction_status: 'settlement',
    gross_amount: '98567',
    payment_type: 'bank_transfer'
  } : {
    external_id: orderId,
    status: 'PAID',
    amount: 98567
  };

  const payload = { ...defaultPayload, ...customPayload };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return {
    success: response.ok,
    status: response.status,
    data: await response.json().catch(() => ({}))
  };
}

export async function getTestEmails(email: string) {
  // Using MailHog test email server
  const response = await fetch(`http://localhost:8025/api/v2/search?kind=to&query=${email}`);
  const data = await response.json();

  return data.items.map(item => ({
    subject: item.Content.Headers.Subject[0],
    body: item.Content.Body,
    from: item.Content.Headers.From[0],
    delivered: true,
    timestamp: item.Created
  }));
}

export async function getOrderStatus(orderId: string) {
  const response = await fetch(`http://localhost:3002/api/orders/${orderId}/status`);
  return response.json();
}

export async function waitForOrderStatus(orderId: string, expectedStatus: string, timeout = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const order = await getOrderStatus(orderId);
    if (order.status === expectedStatus) {
      return order;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Order ${orderId} did not reach status ${expectedStatus} within ${timeout}ms`);
}

export function generateTestData() {
  const timestamp = Date.now();
  return {
    name: `Test User ${timestamp}`,
    phone: `8${Math.random().toString().slice(2, 11)}`,
    email: `test+${timestamp}@example.com`
  };
}
```

---

## 📊 TEST EXECUTION PLAN

### **Test Environment Setup**

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  # Frontend
  frontend:
    build: ./frontend
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=test
      - VITE_API_URL=http://backend:5000

  # Backend
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=test
      - DATABASE_URL=mongodb://mongodb:27017/buatfilm_test
      - MIDTRANS_IS_PRODUCTION=false
      - EMAIL_TEST_MODE=true
    depends_on:
      - mongodb
      - mailhog

  # Test Database
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"

  # Test Email Server
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

  # Playwright
  playwright:
    image: mcr.microsoft.com/playwright:latest
    volumes:
      - ./e2e:/e2e
      - ./screenshots:/screenshots
    command: npx playwright test
    depends_on:
      - frontend
      - backend
```

### **Test Execution Commands**

```bash
# Setup test environment
docker-compose -f docker-compose.test.yml up -d

# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test happy-path-bank-transfer.spec.ts

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Generate report
npx playwright test --reporter=html
npx playwright show-report

# Cleanup
docker-compose -f docker-compose.test.yml down
```

---

## 📈 TEST COVERAGE GOALS

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| **E2E Critical Paths** | 0% | 100% | 🔴 P0 |
| **Payment Methods** | 0% | 100% | 🔴 P0 |
| **Form Validation** | 0% | 100% | 🔴 P0 |
| **Error Handling** | 0% | 80% | 🟡 P1 |
| **Email Delivery** | 0% | 95% | 🟡 P1 |
| **Course Access** | 0% | 90% | 🟡 P1 |
| **Edge Cases** | 0% | 70% | 🟢 P2 |
| **Performance** | 0% | 80% | 🟢 P2 |

---

## 🎯 SUCCESS CRITERIA

### **Definition of Done**
- ✅ All P0 tests passing (100%)
- ✅ All P1 tests passing (>95%)
- ✅ Test execution time < 10 minutes
- ✅ CI/CD integrated
- ✅ Test reports generated
- ✅ Screenshots captured
- ✅ No flaky tests

### **Quality Gates**
- E2E pass rate: >98%
- Test stability: >95%
- Execution time: <10min
- Code coverage: >70%

---

## 🚀 IMPLEMENTATION ROADMAP

### **Phase 1: Foundation** (Week 1)
- [ ] Setup Playwright
- [ ] Create test helpers
- [ ] Setup test environment (Docker)
- [ ] Implement 1 happy path test

### **Phase 2: Critical Tests** (Week 2)
- [ ] All payment method tests
- [ ] Form validation tests
- [ ] Error handling tests

### **Phase 3: Integration** (Week 3)
- [ ] Email delivery tests
- [ ] Course access tests
- [ ] CI/CD integration

### **Phase 4: Optimization** (Week 4)
- [ ] Performance tests
- [ ] Edge case tests
- [ ] Test reporting
- [ ] Documentation

---

**Next Step**: Implement the test infrastructure and start with Scenario 1 (Happy Path - Bank Transfer)
