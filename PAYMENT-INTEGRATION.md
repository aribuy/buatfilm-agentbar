# 💳 Payment Integration Guide

## 🔧 Environment Setup

Create `.env` in frontend folder:
```env
VITE_API_URL=https://api.agentbar.ai
VITE_XENDIT_PUBLIC_KEY=xnd_public_development_xxx
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
```

## 🏦 Xendit Integration

### 1. Install Xendit SDK
```bash
cd frontend
npm install xendit-node
```

### 2. Payment Methods
- **Bank Transfer**: BCA, BSI, BNI, Jago
- **E-Wallet**: GoPay, ShopeePay, OVO, DANA, LinkAja
- **QRIS**: Universal QR Code

### 3. Implementation
```typescript
// utils/xendit.ts
import { Xendit } from 'xendit-node';

const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY!
});

export const createPayment = async (orderData: any) => {
  return await xendit.Invoice.createInvoice({
    externalId: orderData.orderId,
    amount: orderData.amount,
    payerEmail: orderData.email,
    description: 'AI Movie Course - Buat Film Pakai AI'
  });
};
```

## 🎯 Midtrans Integration

### 1. Install Midtrans SDK
```bash
npm install midtrans-client
```

### 2. Implementation
```typescript
// utils/midtrans.ts
import midtransClient from 'midtrans-client';

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY!
});

export const createTransaction = async (orderData: any) => {
  return await snap.createTransaction({
    transaction_details: {
      order_id: orderData.orderId,
      gross_amount: orderData.amount
    },
    customer_details: {
      email: orderData.email,
      phone: orderData.phone
    }
  });
};
```

## 🚀 Quick Deploy Commands

```bash
# Build and deploy
./deploy-vscode.sh

# Or manual steps:
cd frontend && npm run build
scp -r dist/* root@srv941062.hstgr.cloud:/var/www/buatfilm.agentbar.ai/
```

## 📱 Testing

1. **Local**: http://localhost:3001
2. **Production**: https://buatfilm.agentbar.ai
3. **API**: https://api.agentbar.ai

## 🔗 Webhook URLs

- **Xendit**: https://api.agentbar.ai/webhooks/xendit
- **Midtrans**: https://api.agentbar.ai/webhooks/midtrans