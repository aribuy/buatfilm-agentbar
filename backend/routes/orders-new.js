import express from 'express';
import midtransClient from 'midtrans-client';
import crypto from 'crypto';
import { Order } from '../database.js';

const router = express.Router();

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY
});

// Create Order & Snap Token
router.post('/create', async (req, res) => {
  try {
    const { name, email, phone, paymentMethod } = req.body;
    const orderId = `${new Date().toISOString().slice(2,10).replace(/-/g,'')}${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    const amount = 99000;
    
    // Create Snap transaction
    const params = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: name,
        email: email,
        phone: phone
      },
      item_details: [{
        id: 'ai-movie-course',
        name: 'Kelas Buat Film Pakai AI',
        price: amount,
        quantity: 1
      }]
    };
    
    const { token, redirect_url } = await snap.createTransaction(params);
    
    // Save to database
    const order = new Order({
      orderId,
      customerName: name,
      email,
      phone,
      paymentMethod,
      amount,
      snapToken: token,
      status: 'pending'
    });
    
    await order.save();
    
    res.json({
      success: true,
      orderId,
      snapToken: token,
      redirectUrl: redirect_url
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// Get Order Status
router.get('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      orderId: order.orderId,
      status: order.status,
      paidAt: order.paidAt
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

// SHA512 helper for signature validation
function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex');
}

// Midtrans Webhook
router.post('/webhook', async (req, res) => {
  try {
    const notification = req.body;
    
    // Validate signature
    const expected = sha512(
      `${notification.order_id}${notification.status_code}${notification.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`
    );
    
    if (notification.signature_key !== expected) {
      return res.status(401).send('Invalid signature');
    }
    
    const { order_id, transaction_status } = notification;
    
    // Map status
    let orderStatus = 'pending';
    if (['settlement', 'capture'].includes(transaction_status)) {
      orderStatus = 'paid';
    } else if (['expire', 'cancel', 'deny'].includes(transaction_status)) {
      orderStatus = 'failed';
    }
    
    // Update order
    const order = await Order.findOneAndUpdate(
      { orderId: order_id },
      { 
        status: orderStatus,
        paidAt: orderStatus === 'paid' ? new Date() : undefined,
        transactionId: notification.transaction_id
      },
      { new: true }
    );
    
    if (order && orderStatus === 'paid') {
      // TODO: Send confirmation email
      // TODO: Create course access
      console.log(`✅ Order ${order_id} paid successfully`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

export default router;