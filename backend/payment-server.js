require('dotenv').config();
const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');
const database = require('./database');
const auth = require('./middleware/auth');
const { errorHandler, asyncHandler, validateOrder } = require('./middleware/errorHandler');
const { sendWhatsAppMessage, sendSuccessWhatsApp } = require('./services/whatsapp');
const { sendOrderConfirmationEmail, sendPaymentSuccessEmail } = require('./services/email');

const app = express();
app.use(cors());
app.use(express.json());

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Admin login
app.post('/admin/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
    const token = auth.generateToken({ username, role: 'admin' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}));

// Get all orders (admin only)
app.get('/admin/orders', auth.verifyToken, auth.adminAuth, asyncHandler(async (req, res) => {
  const orders = await database.getAllOrders();
  res.json({ success: true, orders });
}));

// Update order status (admin only)
app.put('/admin/orders/:orderId', auth.verifyToken, auth.adminAuth, asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  await database.updateOrderStatus(orderId, status);
  res.json({ success: true, message: 'Order status updated' });
}));

app.post('/payment/create', validateOrder, asyncHandler(async (req, res) => {
  const { orderId, amount, email, phone, name } = req.body;
  
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
    enabled_payments: ['credit_card', 'bca_va', 'bni_va', 'bri_va', 'echannel', 'gopay', 'shopeepay']
  });
  
  // Save to database
  await database.createOrder({
    id: orderId,
    customerName: name,
    email,
    phone,
    amount,
    paymentMethod: 'midtrans'
  });
  
  // Send notifications
  const orderData = { 
    id: orderId, 
    customerName: name, 
    email, 
    phone, 
    totalAmount: amount, 
    paymentUrl: transaction.redirect_url, 
    paymentMethod: 'midtrans', 
    token: orderId 
  };
  
  await sendWhatsAppMessage(orderData);
  await sendOrderConfirmationEmail(orderData);
  
  res.json({
    success: true,
    paymentUrl: transaction.redirect_url,
    token: transaction.token
  });
}));

app.post('/webhooks/midtrans', asyncHandler(async (req, res) => {
  console.log('Midtrans webhook:', req.body);
  
  const { order_id, transaction_status } = req.body;
  
  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    await database.updateOrderStatus(order_id, 'paid');
    
    const order = await database.getOrder(order_id);
    
    if (order) {
      const orderData = {
        id: order_id,
        customerName: order.customer_name,
        email: order.email,
        token: order_id
      };
      
      await sendSuccessWhatsApp(orderData);
      await sendPaymentSuccessEmail(orderData);
    }
  }
  
  res.status(200).send('OK');
}));

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Payment API with Database running on port ${PORT}`);
});