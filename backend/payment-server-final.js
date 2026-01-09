require('dotenv').config();
const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const database = require('./database');
const { verifyMidtransSignature } = require('./middleware/webhookSignature');
const { sendWhatsAppMessage, sendSuccessWhatsApp } = require('./services/whatsapp');
const { sendOrderConfirmationEmail, sendPaymentSuccessEmail } = require('./services/email');

const app = express();
app.use(cors());
app.use(express.json());

const snap = new midtransClient.Snap({
  isProduction: false, // Update this when going to production
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

console.log('✅ SQLite Order Storage Enabled');

// =====================================================
// HEALTH CHECK ENDPOINT
// =====================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'buatfilm-payment-api'
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    await database.get('SELECT 1');
    res.json({ ready: true, message: 'System ready' });
  } catch(err) {
    res.status(503).json({ ready: false, error: err.message });
  }
});

app.get('/health/live', (req, res) => {
  res.json({ alive: true, uptime: Math.floor(process.uptime()) });
});

// =====================================================
// ORDER STATUS ENDPOINT
// =====================================================
app.get('/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await database.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('[STATUS] Error:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

// =====================================================
// PAYMENT ENDPOINTS
// =====================================================
app.post('/payment/create', async (req, res) => {
  try {
    const { orderId, amount, email, phone, name, paymentMethod } = req.body;
    
    // Payment method mapping
    // Start payment processing

    
    // Payment method mapping
    const paymentMethodMap = {
      'gopay': ['gopay', 'qris'],
      'shopeepay': ['shopeepay', 'qris'],
      'ovo': ['ovo', 'qris'],
      'dana': ['dana', 'qris'],
      'linkaja': ['linkaja', 'qris'],
      'qris': ['qris', 'gopay', 'shopeepay'],
      'bca': ['bca_va'],
      'bsi': ['bca_va'],
      'bni': ['bni_va'],
      'bri': ['bri_va'],
      'mandiri': ['echannel'],
      'jago': ['permata_va']
    };
    
    // Fallback: If map not found (or 'credit_card' selected), show common options including Qris
    const enabledPayments = paymentMethod && paymentMethodMap[paymentMethod] 
      ? paymentMethodMap[paymentMethod]
      : ['credit_card', 'bca_va', 'bni_va', 'bri_va', 'echannel', 'gopay', 'shopeepay', 'qris', 'ovo', 'dana', 'linkaja'];
    
    console.log('[PAYMENT] Creating transaction for order:', orderId, 'Payment method:', paymentMethod, 'Enabled:', enabledPayments);
    
    const customer_details = {
        first_name: (name || '').trim(),
        email: (email || '').trim(),
        phone: (phone || '').trim()
    };
    
    console.log('[PAYMENT] Customer Details:', JSON.stringify(customer_details));

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: customer_details,
      enabled_payments: enabledPayments,
      finish_redirect_url: 'https://buatfilm.agentbar.ai/thank-you?order_id=' + orderId
    });
    
    // Store order in SQLite
    const orderData = { 
      id: orderId, 
      customerName: name, 
      email, 
      phone, 
      amount: amount, 
      paymentUrl: transaction.redirect_url, 
      paymentMethod: paymentMethod || 'midtrans', 
      token: transaction.token 
    };

    await database.createOrder(orderData);
    console.log('[STORAGE] Order stored in DB:', orderId);
    
    // Send notifications asynchronously
    sendWhatsAppMessage(orderData).catch(err => {
      console.error('[NOTIFICATION] WhatsApp error:', err.message);
    });
    
    sendOrderConfirmationEmail(orderData).catch(err => {
      console.error('[NOTIFICATION] Email error:', err.message);
    });
    
    res.json({
      success: true,
      redirectUrl: transaction.redirect_url,
      token: transaction.token
    });
  } catch (error) {
    console.error('[PAYMENT] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// =====================================================
// WEBHOOK ENDPOINT (SECURED)
// =====================================================
app.get('/webhooks/midtrans', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
});

app.post('/webhooks/midtrans', 
  verifyMidtransSignature,
  async (req, res) => {
    const { order_id, transaction_status, transaction_id } = req.body;
    console.log('[WEBHOOK] Processing webhook for order:', order_id);
    
    try {
        // Idempotency check
        const existingEvent = await database.get(
            'SELECT processed, order_id FROM payment_events WHERE transaction_id = ?',
            [transaction_id]
        );

        if (existingEvent) {
          if (existingEvent.processed) {
            console.log('[WEBHOOK] ⚠️ Already processed:', transaction_id);
            return res.status(200).json({ message: 'Already processed' });
          }
        } else {
            // Record event
             await database.run(`
              INSERT INTO payment_events (order_id, transaction_id, signature_valid, raw_payload)
              VALUES (?, ?, ?, ?)
            `, [order_id, transaction_id, req.signatureValid, JSON.stringify(req.body)]);
        }

        const statusMap = {
          'capture': 'PAID',
          'settlement': 'PAID',
          'pending': 'PENDING_PAYMENT',
          'deny': 'FAILED',
          'cancel': 'FAILED',
          'expire': 'EXPIRED',
          'failure': 'FAILED'
        };

        const newStatus = statusMap[transaction_status];
        if (!newStatus) {
             return res.status(400).json({ error: 'Unknown transaction status' });
        }

        // Update in DB
        await database.updateOrderStatus(order_id, newStatus);
        
        // Mark event as processed
        await database.run(
          'UPDATE payment_events SET processed = TRUE, processed_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
          [transaction_id]
        );

        // Notifications
        if (newStatus === 'PAID') {
           const order = await database.getOrder(order_id);
           if (order) {
              const notifData = {
                id: order.id,
                customerName: order.customerName,
                email: order.email,
                token: order.id
              };
              
              sendSuccessWhatsApp(notifData).catch(err => console.error('WA Error:', err));
              sendPaymentSuccessEmail(notifData).catch(err => console.error('Email Error:', err));
           }
        }
        
        res.status(200).send('OK');

    } catch (error) {
        console.error('[WEBHOOK] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  }
);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Payment API running on port ${PORT}`);
  console.log('✅ Webhook signature verification: ENABLED');
});
