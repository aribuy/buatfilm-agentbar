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
    .access-button { display: inline-block; background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .download-item { background: #f0f7ff; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #2196F3; }
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
        <p>Status Pembayaran: <strong>LUNAS</strong></p>
      </div>

      <h3>📦 Link Download Materi Course</h3>
      <p>Silakan download semua materi course di bawah ini:</p>

      <div class="download-item">
        <strong>📚 Modul 1: Pengenalan AI untuk Film Making</strong><br>
        <small>Dasar-dasar penggunaan AI tools untuk pembuatan film</small><br>
        <a href="https://agentbar.ai/downloads/modul-1-ai-film-intro.pdf" class="access-button">Download Modul 1</a>
      </div>

      <div class="download-item">
        <strong>🎬 Modul 2: Script Writing dengan AI</strong><br>
        <small>Teknik membuat script film yang menarik menggunakan AI</small><br>
        <a href="https://agentbar.ai/downloads/modul-2-script-ai.pdf" class="access-button">Download Modul 2</a>
      </div>

      <div class="download-item">
        <strong>🎨 Modul 3: Visual Generation & Storyboard</strong><br>
        <small>Membuat visual dan storyboard dengan AI tools</small><br>
        <a href="https://agentbar.ai/downloads/modul-3-visual-ai.pdf" class="access-button">Download Modul 3</a>
      </div>

      <div class="download-item">
        <strong>🎵 Modul 4: Audio & Voice Over AI</strong><br>
        <small>Generate musik dan voice over berkualitas dengan AI</small><br>
        <a href="https://agentbar.ai/downloads/modul-4-audio-ai.pdf" class="access-button">Download Modul 4</a>
      </div>

      <div class="download-item">
        <strong>🎥 Modul 5: Editing & Final Output</strong><br>
        <small>Teknik editing lanjutan dan produksi final</small><br>
        <a href="https://agentbar.ai/downloads/modul-5-editing-ai.pdf" class="access-button">Download Modul 5</a>
      </div>

      <div class="download-item" style="background: #fff9e6; border-left-color: #ffc107;">
        <strong>🛠️ Bonus: Premium AI Tools Pack</strong><br>
        <small>Kumpulan prompt templates dan AI tools premium</small><br>
        <a href="https://agentbar.ai/downloads/bonus-tools-pack.zip" class="access-button" style="background: #ffc107;">Download Bonus</a>
      </div>

      <h3>🌐 Akses Via Web</h3>
      <p>Kakak juga bisa akses semua materi di halaman khusus member:</p>
      <a href="https://buatfilm.agentbar.ai/thank-you?order_id=${orderData.token}" class="access-button">🚀 Akses Halaman Member</a>

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
        <li>📱 WhatsApp: <a href="https://wa.me/6281234567890">+62 812-3456-7890</a></li>
        <li>📧 Email: <a href="mailto:support@komitdigital.my.id">support@komitdigital.my.id</a></li>
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
