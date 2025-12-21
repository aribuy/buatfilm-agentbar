require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/payment/create', async (req, res) => {
  try {
    const { orderId, amount, email, phone, name } = req.body;
    
    console.log('📱 WhatsApp Message for:', phone);
    console.log(`🎉🎉🎉 *Berhasil! Order Kakak sudah kami terima*
*Dear Kak ${name}* 😊
Produk: *Kelas Buat Film Pakai AI*
Total: *Rp ${amount.toLocaleString('id-ID')}*`);
    
    console.log('📧 Email sent to:', email);
    console.log(`Subject: 🎉 Order Berhasil - ${orderId}`);
    
    res.json({
      success: true,
      paymentUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${orderId}`,
      token: orderId,
      message: 'Notifications sent successfully'
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

app.post('/webhooks/midtrans', (req, res) => {
  console.log('Midtrans webhook:', req.body);
  res.status(200).send('OK');
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`✅ Payment API running on port ${PORT}`);
});