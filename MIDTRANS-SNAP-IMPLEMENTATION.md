# Implementasi Midtrans Snap Integration

## 🎯 Overview
Implementasi lengkap Midtrans Snap (recommended approach) sesuai dokumentasi resmi dengan:
- **Snap Token**: Backend generate token, frontend tampilkan popup
- **Webhook Validation**: SHA512 signature verification
- **Idempotent Processing**: Anti double callback
- **Status Mapping**: settlement/capture → paid, expire/cancel/deny → failed

## 🔧 Backend Implementation

### 1. Routes Setup (`/backend/routes/payments.js`)
```javascript
// Create Snap Token
POST /api/payments/midtrans/token
- Input: { customerData: {name, email, phone}, amount }
- Output: { success, orderId, token, redirect_url }

// Webhook Handler
POST /webhooks/midtrans
- Signature validation dengan SHA512
- Status mapping otomatis
- Database update idempotent

// Status Check (optional)
GET /api/payments/status/:orderId
- Double-check status via Midtrans API
```

### 2. Server Integration (`/backend/payment-server.js`)
```javascript
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// SHA512 signature validation
function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex');
}
```

### 3. Environment Variables
```env
MIDTRANS_SERVER_KEY=Mid-server-xxx
MIDTRANS_CLIENT_KEY=Mid-client-xxx
MIDTRANS_IS_PRODUCTION=false
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_admin_password
```

## 🎨 Frontend Implementation

### 1. Snap.js Integration (`/frontend/src/utils/midtransSnap.ts`)
```typescript
// Load Snap.js script dynamically
export const loadSnapScript = (): Promise<void>

// Open payment popup
export const openSnapPayment = async (token: string, callbacks)
```

### 2. Payment Service (`/frontend/src/utils/paymentService.ts`)
```typescript
// Call backend untuk token, lalu buka popup
const result = await fetch('/api/payments/midtrans/token', {
  method: 'POST',
  body: JSON.stringify({ customerData, amount })
});

await openSnapPayment(result.token, {
  onSuccess: (result) => window.location.href = '/success',
  onPending: (result) => console.log('Payment pending'),
  onError: (result) => alert('Pembayaran gagal'),
  onClose: () => console.log('Popup closed')
});
```

### 3. Environment Variables
```env
VITE_MIDTRANS_CLIENT_KEY=Mid-client-xxx
VITE_MIDTRANS_IS_PRODUCTION=false
VITE_API_URL=http://localhost:3002
```

## 🔄 Payment Flow

### 1. User Journey
```
Landing Page → Checkout Form → Submit → Snap Popup → Payment → Success
```

### 2. Technical Flow
```
1. Frontend: User submit form
2. Frontend: Call POST /api/payments/midtrans/token
3. Backend: Generate Snap token via Midtrans API
4. Backend: Save order to database
5. Frontend: Receive token, load Snap.js
6. Frontend: Open payment popup dengan token
7. User: Complete payment di popup Midtrans
8. Midtrans: Send webhook ke /webhooks/midtrans
9. Backend: Validate signature, update order status
10. Backend: Send notification (WhatsApp/Email)
```

## 🛡️ Security Features

### 1. Signature Validation
```javascript
const expected = sha512(
  `${order_id}${status_code}${gross_amount}${serverKey}`
);

if (notification.signature_key !== expected) {
  return res.status(401).send('Invalid signature');
}
```

### 2. Idempotent Processing
- Cek status order sebelum update
- Hindari double processing webhook
- Status mapping konsisten

### 3. Environment Security
- Server key hanya di backend
- Client key untuk frontend
- JWT untuk admin authentication

## 📊 Status Mapping

### Midtrans Status → Order Status
```javascript
const statusMapping = {
  'settlement': 'paid',
  'capture': 'paid',
  'pending': 'pending',
  'expire': 'failed',
  'cancel': 'failed',
  'deny': 'failed'
};
```

## 🚀 Deployment Checklist

### Backend
- [x] Environment variables configured
- [x] Webhook endpoint public (HTTPS)
- [x] Database schema ready
- [x] Error handling implemented
- [x] Signature validation active

### Frontend
- [x] Snap.js integration ready
- [x] Client key configured
- [x] Payment callbacks handled
- [x] Error handling implemented
- [x] Success/failure flows

## 🧪 Testing

### 1. Sandbox Testing
```bash
# Test token creation
curl -X POST http://localhost:3002/api/payments/midtrans/token \
  -H "Content-Type: application/json" \
  -d '{"customerData":{"name":"Test","email":"test@test.com","phone":"081234567890"},"amount":99000}'

# Test webhook
curl -X POST http://localhost:3002/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ORDER-123","status_code":"200","gross_amount":"99000","signature_key":"valid_signature"}'
```

### 2. Frontend Testing
- Form submission → Token generation
- Snap popup → Payment completion
- Success/error callbacks
- Status updates

## 📱 Supported Payment Methods

### Via Snap Popup
- **Credit Card**: Visa, MasterCard, JCB
- **Bank Transfer**: BCA, BNI, BRI, Mandiri, Permata
- **E-Wallet**: GoPay, ShopeePay, OVO, DANA, LinkAja
- **Convenience Store**: Indomaret, Alfamart
- **Cardless Credit**: Akulaku, Kredivo

### Auto-enabled di Snap
Semua metode payment otomatis tersedia di popup Midtrans tanpa konfigurasi tambahan.

## 🔧 Customization Options

### 1. Payment Methods Filter
```javascript
const params = {
  // ... other params
  enabled_payments: ['credit_card', 'gopay', 'shopeepay', 'bca_va'],
  custom_expiry: {
    order_time: "2024-12-31 17:00:00 +0700",
    expiry_duration: 60,
    unit: "minute"
  }
};
```

### 2. UI Customization
```javascript
// Custom finish URL
finish_url: "https://buatfilm.agentbar.ai/success"

// Custom error URL  
error_url: "https://buatfilm.agentbar.ai/error"

// Custom pending URL
pending_url: "https://buatfilm.agentbar.ai/pending"
```

## 📈 Monitoring & Analytics

### 1. Webhook Logs
- Log semua webhook notifications
- Track signature validation
- Monitor status transitions

### 2. Payment Analytics
- Success rate tracking
- Payment method preferences
- Transaction volume monitoring

### 3. Error Tracking
- Failed signature validations
- Network timeouts
- Database errors

## 🎯 Production Deployment

### 1. Switch to Production
```env
MIDTRANS_IS_PRODUCTION=true
MIDTRANS_SERVER_KEY=Mid-server-production-xxx
MIDTRANS_CLIENT_KEY=Mid-client-production-xxx
```

### 2. Webhook URL
```
Production: https://buatfilm.agentbar.ai/webhooks/midtrans
Sandbox: https://your-ngrok-url.ngrok.io/webhooks/midtrans
```

### 3. SSL Certificate
- HTTPS required untuk production
- Valid SSL certificate
- Webhook endpoint accessible

## ✅ Implementation Complete

Integrasi Midtrans Snap telah diimplementasikan dengan:
- ✅ **Backend**: Token generation + webhook validation
- ✅ **Frontend**: Snap.js popup integration
- ✅ **Security**: SHA512 signature validation
- ✅ **Database**: Order tracking + status updates
- ✅ **Notifications**: WhatsApp + Email integration
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Documentation**: Complete implementation guide

**Ready for production deployment!** 🚀