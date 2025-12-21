require('dotenv').config();
const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');
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

app.post('/payment/create', async (req, res) => {
  try {
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
    
    // Send notifications
    const orderData = { id: orderId, customerName: name, email, phone, totalAmount: amount, paymentUrl: transaction.redirect_url, paymentMethod: 'midtrans', token: orderId };
    
    // Send WhatsApp notification
    await sendWhatsAppMessage(orderData);
    
    // Send email confirmation
    await sendOrderConfirmationEmail(orderData);
    
    res.json({
      success: true,
      paymentUrl: transaction.redirect_url,
      token: transaction.token
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

app.post('/webhooks/midtrans', async (req, res) => {
  console.log('Midtrans webhook:', req.body);
  
  const { order_id, transaction_status } = req.body;
  
  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    // Payment successful - send success notifications
    const orderData = {
      id: order_id,
      customerName: 'Customer', // Get from database
      email: 'customer@email.com', // Get from database
      token: order_id
    };
    
    await sendSuccessWhatsApp(orderData);
    await sendPaymentSuccessEmail(orderData);
  }
  
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Midtrans API running on port ${PORT}`);
});