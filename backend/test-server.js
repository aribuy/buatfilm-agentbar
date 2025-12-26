import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server working!' });
});

// Orders endpoint
app.post('/api/orders/create', (req, res) => {
  const { name, email, phone, paymentMethod } = req.body;
  const orderId = `ORDER-${Date.now()}`;
  
  res.json({
    success: true,
    orderId,
    snapToken: `snap_${Math.random().toString(36).substr(2, 9)}`,
    redirectUrl: `https://app.sandbox.midtrans.com/snap/demo`
  });
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
});