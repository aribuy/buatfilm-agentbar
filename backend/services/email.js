const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOrderConfirmationEmail = async (orderData) => {
  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .payment-button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Order Berhasil Dibuat!</h1>
      <p>Terima kasih telah memesan Kelas Buat Film Pakai AI</p>
    </div>
    
    <div class="content">
      <h2>Dear ${orderData.customerName} 😊</h2>
      
      <p>Terima kasih telah melakukan pemesanan produk kami <strong>Kelas Buat Film Pakai AI</strong>.</p>
      
      <p><strong>Status pembayaran: Menunggu Pembayaran</strong></p>
      
      <p>Langkah selanjutnya adalah melakukan pembayaran agar Anda dapat segera mendapatkan produknya.</p>
      
      <div class="order-details">
        <h3>📋 Detail Pesanan</h3>
        <p><strong>Order ID:</strong> ${orderData.id}</p>
        <p><strong>Produk:</strong> Kelas Buat Film Pakai AI</p>
        <p><strong>Total Pembayaran:</strong> Rp ${orderData.totalAmount.toLocaleString('id-ID')}</p>
        <p><strong>Email:</strong> ${orderData.email}</p>
        <p><strong>WhatsApp:</strong> ${orderData.phone}</p>
      </div>
      
      <p>Untuk melakukan pembayaran, silakan klik tombol di bawah ini:</p>
      
      <a href="${orderData.paymentUrl || '#'}" class="payment-button">💳 Bayar Sekarang</a>
      
      <p><strong>Metode Pembayaran:</strong> ${orderData.paymentMethod.toUpperCase()}</p>
      
      <p>Jika tombol tidak berfungsi, copy link berikut ke browser Anda:</p>
      <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
        ${orderData.paymentUrl || 'Link pembayaran akan dikirim segera'}
      </p>
      
      <div class="footer">
        <p><strong>agentbar</strong><br>
        Komitmen Memberikan Yang Terbaik</p>
        
        <p>Butuh bantuan? Hubungi kami di WhatsApp: +62 812-3456-7890</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: '"AgentBar" <noreply@agentbar.ai>',
    to: orderData.email,
    subject: '🎉 Order Berhasil - Kelas Buat Film Pakai AI',
    html: htmlTemplate
  };

  return await transporter.sendMail(mailOptions);
};

const sendPaymentSuccessEmail = async (orderData) => {
  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .success-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #4CAF50; }
    .access-button { display: inline-block; background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Pembayaran Berhasil!</h1>
      <p>Selamat! Pesanan Anda telah dikonfirmasi</p>
    </div>
    
    <div class="content">
      <h2>Dear ${orderData.customerName} 😊</h2>
      
      <div class="success-box">
        <h3>✅ Pembayaran Berhasil Diverifikasi</h3>
        <p>Pesanan Anda untuk produk <strong>Kelas Buat Film Pakai AI</strong> telah selesai!</p>
        <p>Pembayaran telah berhasil kami terima dan verifikasi. Terima kasih sudah berbelanja melalui Komit Studio.</p>
      </div>
      
      <h3>🎓 Akses Course Anda</h3>
      <p>Untuk mengakses course, silakan klik tombol di bawah ini:</p>
      
      <a href="https://course.agentbar.ai/access?token=${orderData.token}" class="access-button">🚀 Akses Course Sekarang</a>
      
      <div class="success-box">
        <h3>📚 Yang Anda Dapatkan:</h3>
        <ul>
          <li>✅ 5 Modul Lengkap Buat Film AI</li>
          <li>✅ Video Tutorial Step-by-Step</li>
          <li>✅ Template & Tools Premium</li>
          <li>✅ Studi Kasus Nyata</li>
          <li>✅ Grup Eksklusif Member</li>
          <li>✅ Akses Seumur Hidup</li>
        </ul>
      </div>
      
      <h3>📞 Butuh Bantuan?</h3>
      <p>Jika ada pertanyaan atau kendala, jangan ragu untuk menghubungi kami:</p>
      <ul>
        <li>📱 WhatsApp: +62 812-3456-7890</li>
        <li>📧 Email: support@agentbar.ai</li>
        <li>💬 Grup Member: <a href="https://chat.whatsapp.com/xxx">Join Grup</a></li>
      </ul>
      
      <div class="footer">
        <p><strong>agentbar</strong><br>
        Komitmen Memberikan Yang Terbaik</p>
        
        <p>Selamat belajar dan semoga sukses! 🚀</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: '"AgentBar" <noreply@agentbar.ai>',
    to: orderData.email,
    subject: '🎉 Akses Course - Kelas Buat Film Pakai AI',
    html: htmlTemplate
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendOrderConfirmationEmail, sendPaymentSuccessEmail };