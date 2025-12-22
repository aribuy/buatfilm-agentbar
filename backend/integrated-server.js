require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
  serverKey: process.env.MIDTRANS_SERVER_KEY || 'Mid-server-test',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-test'
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      whatsapp: 'ready',
      email: 'ready',
      midtrans: 'configured'
    }
  });
});

// Payment creation with full integration
app.post('/payment/create', async (req, res) => {
  try {
    const { orderId, amount, email, phone, name } = req.body;
    
    // Validate required fields
    if (!orderId || !amount || !email || !phone || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Midtrans transaction
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: name,
        email: email,
        phone: phone
      },
      enabled_payments: ['gopay', 'shopeepay', 'bca_va', 'bni_va', 'bri_va', 'echannel', 'qris']
    });
    
    // Save to database
    await database.createOrder({
      id: orderId,
      customerName: name,
      email,
      phone,
      amount,
      paymentMethod: 'midtrans',
      status: 'pending'
    });
    
    // Send notifications
    const orderData = {
      id: orderId,
      customerName: name,
      email,
      phone,
      totalAmount: amount,
      paymentUrl: transaction.redirect_url,
      paymentMethod: 'midtrans'
    };
    
    // Send WhatsApp & Email notifications
    await Promise.all([
      whatsappService.sendOrderNotification(orderData),
      emailService.sendOrderNotification(orderData)
    ]);
    
    res.json({
      success: true,
      paymentUrl: transaction.redirect_url,
      token: transaction.token,
      orderId: orderId
    });
    
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ 
      error: 'Payment creation failed',
      message: error.message 
    });
  }
});

// Webhook handler
app.post('/webhooks/midtrans', async (req, res) => {
  try {
    const { order_id, transaction_status } = req.body;
    
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      await database.updateOrderStatus(order_id, 'paid');
      
      const order = await database.getOrder(order_id);
      if (order) {
        const orderData = {
          id: order_id,
          customerName: order.customer_name,
          email: order.email,
          phone: order.phone
        };
        
        // Send success notifications
        await Promise.all([
          whatsappService.sendSuccessNotification(orderData),
          emailService.sendPaymentSuccessEmail(orderData)
        ]);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Test notification endpoint
app.post('/test/notifications', async (req, res) => {
  try {
    const orderData = req.body;
    
    await Promise.all([
      whatsappService.sendOrderNotification(orderData),
      emailService.sendOrderNotification(orderData)
    ]);
    
    res.json({ success: true, message: 'Notifications sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Integrated Payment Server running on port ${PORT}`);
  console.log(`📧 Email notifications: endikc@gmail.com`);
  console.log(`📱 WhatsApp notifications: 08118088180`);
  console.log(`👤 Customer: Endik (08811210687, aribuy88@gmail.com)`);
});