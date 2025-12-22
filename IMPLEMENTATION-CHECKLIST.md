# 🚀 MIDTRANS SNAP IMPLEMENTATION CHECKLIST

## 📋 BACKEND SETUP

### Database & Dependencies
- [ ] Install MongoDB locally atau setup MongoDB Atlas
- [ ] Install dependencies: `cd backend && npm install`
- [ ] Test database connection: `node -e "require('./database').connectDB()"`

### Environment Configuration
- [ ] Update `.env` dengan Midtrans Sandbox credentials:
  ```
  MIDTRANS_SERVER_KEY=SB-Mid-server-xxx
  MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
  MIDTRANS_IS_PRODUCTION=false
  MONGODB_URI=mongodb://localhost:27017/buatfilm
  ```
- [ ] Test environment: `node -e "console.log(process.env.MIDTRANS_SERVER_KEY)"`

### API Testing
- [ ] Start server: `npm start`
- [ ] Test order creation:
  ```bash
  curl -X POST http://localhost:3002/api/orders/create \
    -H "Content-Type: application/json" \
    -d '{"name":"Test User","email":"test@test.com","phone":"081234567890","paymentMethod":"gopay"}'
  ```
- [ ] Verify response contains `snapToken`
- [ ] Check MongoDB: order tersimpan dengan status `pending`

---

## 🎨 FRONTEND INTEGRATION

### Snap.js Setup
- [ ] Update `frontend/.env`:
  ```
  VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
  VITE_MIDTRANS_IS_PRODUCTION=false
  ```
- [ ] Test Snap.js loading di `utils/midtransSnap.ts`

### Checkout Form Integration
- [ ] Update `IntegratedCheckout.tsx`:
  - [ ] Replace fake order creation dengan API call
  - [ ] Integrate Snap.js popup
  - [ ] Handle payment callbacks
  - [ ] Add loading states
- [ ] Test form submission → API call → Snap popup

### Status Polling
- [ ] Implement polling di `PaymentConfirmation.tsx`:
  ```javascript
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/orders/${orderId}/status`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'paid') {
            setPaymentConfirmed(true);
          }
        });
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId]);
  ```
- [ ] Remove fake "Konfirmasi Pembayaran" button

---

## 🔗 WEBHOOK TESTING

### Ngrok Setup (Development)
- [ ] Install ngrok: `npm install -g ngrok`
- [ ] Expose webhook: `ngrok http 3002`
- [ ] Copy ngrok URL: `https://xxx.ngrok.io`

### Midtrans Dashboard Configuration
- [ ] Login ke Midtrans Sandbox Dashboard
- [ ] Settings → Configuration → Notification URL:
  ```
  https://xxx.ngrok.io/api/orders/webhook
  ```
- [ ] Enable semua notification events

### Webhook Testing
- [ ] Create test order via frontend
- [ ] Complete payment di Snap popup (use test cards)
- [ ] Check server logs: webhook received
- [ ] Check MongoDB: status updated ke `paid`
- [ ] Verify frontend: status polling detects payment

---

## 🧪 END-TO-END TESTING

### Happy Path Test
- [ ] **Step 1**: Visit landing page
- [ ] **Step 2**: Click "DAPATKAN AKSES SEKARANG"
- [ ] **Step 3**: Fill checkout form
- [ ] **Step 4**: Submit → Snap popup opens
- [ ] **Step 5**: Complete payment (test card: 4811 1111 1111 1114)
- [ ] **Step 6**: Redirect back → status updates to "paid"
- [ ] **Step 7**: Success page displays

### Error Scenarios
- [ ] **Invalid form data**: Validation errors shown
- [ ] **Payment failed**: Error message displayed
- [ ] **Payment cancelled**: User can retry
- [ ] **Network error**: Graceful error handling

---

## 📧 EMAIL SYSTEM (Optional - Phase 2)

### Email Service Setup
- [ ] Configure Nodemailer di `services/email.js`
- [ ] Create email templates:
  - [ ] Order confirmation
  - [ ] Payment success
  - [ ] Course access credentials
- [ ] Test email sending

### Integration
- [ ] Send emails di webhook handler
- [ ] Add email status tracking
- [ ] Handle email failures

---

## 🎓 COURSE ACCESS (Optional - Phase 2)

### LMS Integration
- [ ] Setup course platform (Teachable/custom)
- [ ] Create user accounts automatically
- [ ] Generate course access credentials
- [ ] Send access emails

---

## 🚀 PRODUCTION DEPLOYMENT

### Environment Setup
- [ ] Update production `.env`:
  ```
  MIDTRANS_IS_PRODUCTION=true
  MIDTRANS_SERVER_KEY=Mid-server-xxx (production)
  MIDTRANS_CLIENT_KEY=Mid-client-xxx (production)
  MONGODB_URI=mongodb+srv://production-cluster
  ```

### Midtrans Production
- [ ] Submit business documents ke Midtrans
- [ ] Get production credentials
- [ ] Update webhook URL ke production domain
- [ ] Test dengan real payment methods

### Deployment
- [ ] Deploy backend ke VPS/cloud
- [ ] Deploy frontend ke CDN/hosting
- [ ] Setup SSL certificate (HTTPS required)
- [ ] Configure domain DNS
- [ ] Test production flow

---

## 📊 MONITORING & ANALYTICS

### Logging
- [ ] Add structured logging
- [ ] Monitor webhook failures
- [ ] Track conversion rates
- [ ] Setup error alerts

### Analytics
- [ ] Google Analytics integration
- [ ] Facebook Pixel setup
- [ ] Conversion tracking
- [ ] A/B testing setup

---

## ✅ COMPLETION CRITERIA

### MVP Ready
- [ ] Order creation works
- [ ] Payment popup opens
- [ ] Webhook processes correctly
- [ ] Status updates automatically
- [ ] Success page displays

### Production Ready
- [ ] All error scenarios handled
- [ ] Email notifications working
- [ ] Course access automated
- [ ] Monitoring in place
- [ ] Performance optimized

---

## 🎯 PRIORITY ORDER

**Phase 1 (Critical):**
1. Backend setup ✅
2. Frontend integration
3. Webhook testing
4. E2E testing

**Phase 2 (Important):**
5. Email system
6. Course access
7. Error handling
8. Production deployment

**Phase 3 (Nice to have):**
9. Analytics
10. Monitoring
11. Performance optimization
12. A/B testing

---

**Status**: Backend complete ✅ | Frontend pending ⏳ | Testing pending ⏳