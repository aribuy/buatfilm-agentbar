import express from 'express';

const router = express.Router();

// Create order
router.post('/create', async (req, res) => {
  try {
    const { name, phone, email, paymentMethod } = req.body;
    
    // Validate input
    if (!name || !phone || !email || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const orderId = `ORDER-${Date.now()}`;
    
    // Save order to database (implement your DB logic here)
    const order = {
      id: orderId,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      paymentMethod: paymentMethod,
      amount: 99000,
      status: 'pending',
      createdAt: new Date()
    };
    
    console.log('Order created:', order);
    
    // Send WhatsApp notification (optional)
    await sendWhatsAppNotification(phone, name, orderId);
    
    res.json({
      success: true,
      orderId: orderId,
      message: 'Order created successfully'
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// Get order status
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order from database
    const order = {
      id: orderId,
      status: 'pending',
      amount: 99000
    };
    
    res.json({ success: true, order });
    
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

async function sendWhatsAppNotification(phone, name, orderId) {
  try {
    const message = `Halo ${name}, terima kasih sudah memesan AI Movie Maker Course! Order ID: ${orderId}. Kami akan segera menghubungi Anda untuk konfirmasi pembayaran.`;
    
    // Implement WhatsApp API call here
    console.log(`WhatsApp to ${phone}: ${message}`);
    
  } catch (error) {
    console.error('WhatsApp notification error:', error);
  }
}

export default router;