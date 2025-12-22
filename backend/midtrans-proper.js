require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const midtransClient = require('midtrans-client');
const database = require('./database');
const { WhatsAppService } = require('./services/whatsapp-enhanced');
const { EmailService } = require('./services/email-enhanced');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize services
const whatsappService = new WhatsAppService();
const emailService = new EmailService();

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-test',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-test'
});

// Create Snap Token (Step B)
app.post('/api/payments/midtrans/token', async (req, res) => {
  try {
    const orderId = `ORDER-${Date.now()}`;
    
    const params = {
      transaction_details: {
        order_id: orderId,
        gross_amount: req.body.amount
      },
      customer_details: {
        first_name: req.body.name,
        email: req.body.email,
        phone: req.body.phone
      },
      item_details: [{
        id: 'ai-movie-course',
        name: 'Buat Film AI Course',
        price: req.body.amount,
        quantity: 1
      }]
    };

    const { token, redirect_url } = await snap.createTransaction(params);
    
    // Save order to database
    await database.createOrder({
      id: orderId,
      customerName: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      amount: req.body.amount,
      paymentMethod: 'midtrans',
      status: 'pending'
    });

    res.json({ orderId, token, redirect_url });
    
  } catch (error) {
    console.error('Token creation error:', error);
    res.status(500).json({ error: 'Failed to create payment token' });
  }
});

// Webhook Handler (Step D) - CRITICAL
app.post('/webhooks/midtrans', async (req, res) => {
  try {
    const notification = req.body;
    
    // Validate signature (WAJIB)
    const expected = crypto
      .createHash('sha512')
      .update(`${notification.order_id}${notification.status_code}${notification.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
      .digest('hex');
    
    if (notification.signature_key !== expected) {
      return res.status(401).send('Invalid signature');
    }

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    
    // Idempotent processing
    const existingOrder = await database.getOrder(orderId);
    if (!existingOrder) {
      return res.status(404).send('Order not found');
    }

    // Map Midtrans status to our status
    let orderStatus;
    switch (transactionStatus) {
      case 'settlement':
      case 'capture':
        orderStatus = 'paid';
        break;
      case 'expire':
        orderStatus = 'expired';
        break;
      case 'cancel':
      case 'deny':
        orderStatus = 'failed';
        break;
      case 'pending':
        orderStatus = 'pending';
        break;
      default:
        orderStatus = 'unknown';
    }

    // Update order status (idempotent)
    if (existingOrder.status !== orderStatus) {
      await database.updateOrderStatus(orderId, orderStatus);
      
      // Send notifications for successful payment
      if (orderStatus === 'paid') {
        const orderData = {
          id: orderId,
          customerName: existingOrder.customer_name,
          email: existingOrder.email,
          phone: existingOrder.phone
        };
        
        await Promise.all([
          whatsappService.sendSuccessNotification(orderData),
          emailService.sendPaymentSuccessEmail(orderData)
        ]);
      }
    }

    res.status(200).send('OK');
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Get order status (Step E - optional)
app.get('/api/orders/:orderId/status', async (req, res) => {
  try {
    const order = await database.getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      customerName: order.customer_name
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to get order status' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Proper Midtrans Integration Server running on port ${PORT}`);
  console.log(`📧 Email: endikc@gmail.com`);
  console.log(`📱 WhatsApp: 08118088180`);
  console.log(`👤 Customer: Endik (08811210687, aribuy88@gmail.com)`);
});