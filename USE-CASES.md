# 🎬 AI Movie Course - Use Cases

## 1. **Customer Journey - Happy Path**

### UC-001: Successful Course Purchase
**Actor:** Potential Customer
**Goal:** Purchase AI Movie Course

**Steps:**
1. Customer visits https://buatfilm.agentbar.ai
2. Views landing page with course benefits
3. Clicks "Order Sekarang" button
4. Fills checkout form:
   - Name: "Budi Santoso"
   - Phone: "81234567890"
   - Email: "budi@gmail.com"
   - Payment: "GoPay"
5. Submits order
6. Gets Order ID: 2012255XXXXX
7. Redirected to Midtrans payment page
8. Completes payment via GoPay
9. Receives confirmation & course access

**Expected Result:** ✅ Customer gets instant course access

---

## 2. **Payment Method Scenarios**

### UC-002: Bank Transfer Payment
**Steps:**
1. Customer selects "Bank BCA"
2. Gets payment instructions with account: 5226288510
3. Transfers exact amount: Rp 98,XXX (with unique code)
4. Uploads payment proof
5. Admin verifies payment
6. Course access granted

### UC-003: E-Wallet Payment
**Steps:**
1. Customer selects "GoPay/ShopeePay/DANA"
2. Redirected to Midtrans Snap
3. Chooses e-wallet method
4. Scans QR code or opens app
5. Confirms payment
6. Instant course access

### UC-004: QRIS Payment
**Steps:**
1. Customer selects "QRIS"
2. QR code displayed
3. Scans with any banking app
4. Confirms payment
5. Instant access granted

---

## 3. **Error Scenarios**

### UC-005: Payment Timeout
**Steps:**
1. Customer creates order
2. Doesn't complete payment within 24 hours
3. Order expires
4. Customer needs to create new order

### UC-006: Payment Failed
**Steps:**
1. Customer attempts payment
2. Insufficient balance/network error
3. Payment fails
4. Customer can retry or choose different method

### UC-007: Invalid Form Data
**Steps:**
1. Customer submits incomplete form
2. Validation errors shown
3. Customer corrects data
4. Resubmits successfully

---

## 4. **Admin Use Cases**

### UC-008: Order Management
**Actor:** Admin
**Steps:**
1. Admin logs into dashboard
2. Views all orders with status
3. Filters by date/status/payment method
4. Manually confirms payments if needed
5. Grants course access

### UC-009: Payment Verification
**Steps:**
1. Customer uploads bank transfer proof
2. Admin receives notification
3. Verifies transfer amount matches order
4. Updates order status to "paid"
5. Customer gets access email

---

## 5. **Technical Use Cases**

### UC-010: Webhook Processing
**Actor:** Midtrans System
**Steps:**
1. Payment completed on Midtrans
2. Webhook sent to `/webhooks/midtrans`
3. System validates webhook signature
4. Updates order status automatically
5. Sends confirmation email to customer

### UC-011: Order ID Generation
**Steps:**
1. Customer submits form
2. System generates unique Order ID: DDMMYYXXXXXX
3. Creates unique discount code: XXX (3 digits)
4. Calculates final amount: 99000 - discount
5. Stores order in database

---

## 6. **Mobile Use Cases**

### UC-012: Mobile Checkout
**Steps:**
1. Customer visits on mobile device
2. Responsive design adapts to screen
3. Touch-friendly payment selection
4. Mobile-optimized payment flow
5. App-to-app payment (GoPay/DANA)

---

## 7. **Business Use Cases**

### UC-013: Promo Campaign
**Steps:**
1. Admin sets limited-time discount
2. Countdown timer shows urgency
3. "Only 17 slots left" scarcity message
4. Customer rushes to purchase
5. Conversion rate increases

### UC-014: Affiliate Tracking
**Steps:**
1. Customer clicks affiliate link: `?ref=PARTNER123`
2. System tracks referral source
3. Order created with affiliate data
4. Commission calculated for partner
5. Partner gets payment report

---

## 8. **Integration Use Cases**

### UC-015: WhatsApp Notification
**Steps:**
1. Payment confirmed
2. System sends WhatsApp message to customer
3. Message contains course access link
4. Customer joins exclusive group
5. Gets instant support

### UC-016: Email Automation
**Steps:**
1. Order created → Welcome email sent
2. Payment pending → Reminder email (2 hours)
3. Payment confirmed → Access email with login
4. Day 1 → Course introduction email
5. Day 7 → Progress check email

---

## 9. **Testing Scenarios**

### UC-017: Load Testing
**Steps:**
1. 100 concurrent users visit site
2. All attempt to purchase simultaneously
3. System handles load without crashes
4. All orders processed correctly
5. Payment gateway remains stable

### UC-018: Security Testing
**Steps:**
1. Attempt SQL injection on forms
2. Try XSS attacks on input fields
3. Test webhook signature validation
4. Verify payment data encryption
5. Confirm no sensitive data leaks

---

## 10. **Success Metrics**

### UC-019: Conversion Tracking
**KPIs to Monitor:**
- Landing page → Checkout: 15%
- Checkout → Payment: 80%
- Payment → Success: 95%
- Total conversion: 11.4%
- Average order value: Rp 98,500

### UC-020: Customer Satisfaction
**Metrics:**
- Payment completion time: < 3 minutes
- Customer support tickets: < 5%
- Course completion rate: > 70%
- Customer reviews: > 4.5/5 stars
- Refund requests: < 2%

---

## 🎯 **Priority Use Cases for Testing:**

1. **UC-001** - Basic purchase flow
2. **UC-003** - E-wallet payment (most popular)
3. **UC-002** - Bank transfer (backup method)
4. **UC-006** - Payment failure handling
5. **UC-010** - Webhook processing

**Test these first untuk ensure core functionality works!** 🚀