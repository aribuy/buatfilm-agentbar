import express from 'express';
import midtransClient from 'midtrans-client';
import { Xendit } from 'xendit-node';

const router = express.Router();

// Initialize payment gateways
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY
});

const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY
});

// Create payment
router.post('/create', async (req, res) => {
  try {
    const { paymentMethod, customerData, orderData } = req.body;
    
    const orderId = `ORDER-${Date.now()}`;
    const amount = 99000;
    
    let paymentResponse;
    
    switch (paymentMethod) {
      case 'qris':
        paymentResponse = await createQRISPayment(orderId, amount, customerData);
        break;
      case 'gopay':
      case 'shopeepay':
      case 'ovo':
      case 'dana':
      case 'linkaja':
        paymentResponse = await createEWalletPayment(paymentMethod, orderId, amount, customerData);
        break;
      case 'bca':
      case 'bsi':
      case 'bni':
      case 'jago':
        paymentResponse = await createVAPayment(paymentMethod, orderId, amount, customerData);
        break;
      default:
        return res.status(400).json({ error: 'Payment method not supported' });
    }
    
    res.json({
      success: true,
      orderId,
      paymentData: paymentResponse
    });
    
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

// QRIS Payment via Xendit
async function createQRISPayment(orderId, amount, customerData) {
  const { QRCode } = xendit;
  const qrCode = new QRCode({});
  
  return await qrCode.createCode({
    externalId: orderId,
    type: 'DYNAMIC',
    callbackUrl: `${process.env.BASE_URL}/api/payments/webhook/xendit`,
    amount: amount
  });
}

// E-Wallet Payment via Xendit
async function createEWalletPayment(paymentMethod, orderId, amount, customerData) {
  const { EWallet } = xendit;
  const eWallet = new EWallet({});
  
  const ewalletTypes = {
    'gopay': 'GOPAY',
    'shopeepay': 'SHOPEEPAY',
    'ovo': 'OVO',
    'dana': 'DANA',
    'linkaja': 'LINKAJA'
  };
  
  return await eWallet.createPayment({
    externalId: orderId,
    amount: amount,
    phone: customerData.phone,
    ewalletType: ewalletTypes[paymentMethod],
    callbackUrl: `${process.env.BASE_URL}/api/payments/webhook/xendit`,
    redirectUrl: `${process.env.FRONTEND_URL}/success`
  });
}

// Virtual Account via Midtrans
async function createVAPayment(bankCode, orderId, amount, customerData) {
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount
    },
    customer_details: {
      first_name: customerData.name,
      email: customerData.email,
      phone: customerData.phone
    },
    payment_type: 'bank_transfer',
    bank_transfer: {
      bank: getBankCode(bankCode)
    }
  };
  
  return await snap.createTransaction(parameter);
}

function getBankCode(paymentMethod) {
  const bankCodes = {
    'bca': 'bca',
    'bsi': 'bsi', 
    'bni': 'bni',
    'jago': 'other'
  };
  return bankCodes[paymentMethod] || 'bca';
}

// Webhook handlers
router.post('/webhook/midtrans', (req, res) => {
  const notification = req.body;
  
  console.log('Midtrans notification:', notification);
  
  // Process payment notification
  // Update order status in database
  
  res.status(200).send('OK');
});

router.post('/webhook/xendit', (req, res) => {
  const notification = req.body;
  
  console.log('Xendit notification:', notification);
  
  // Process payment notification
  // Update order status in database
  
  res.status(200).send('OK');
});

export default router;