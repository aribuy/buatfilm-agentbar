const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.notificationEmail = 'endikc@gmail.com'; // Notification source
    
    // SMTP Configuration
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'noreply@agentbar.ai',
        pass: process.env.EMAIL_PASS || 'your_app_password'
      }
    });
  }

  async sendOrderNotification(orderData) {
    try {
      // Send to business email
      await this.sendEmail({
        to: this.notificationEmail,
        subject: `🎬 Pesanan Baru - ${orderData.id}`,
        html: this.getBusinessEmailTemplate(orderData)
      });

      // Send confirmation to customer
      await this.sendEmail({
        to: orderData.email,
        subject: `✅ Pesanan Berhasil - Buat Film AI Course`,
        html: this.getCustomerEmailTemplate(orderData)
      });

      console.log('✅ Email notifications sent');
      return true;
    } catch (error) {
      console.error('❌ Email notification failed:', error.message);
      return false;
    }
  }

  async sendEmail({ to, subject, html }) {
    const mailOptions = {
      from: `"Buat Film AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    return await this.transporter.sendMail(mailOptions);
  }

  getBusinessEmailTemplate(orderData) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">🎬 Pesanan Baru - Buat Film AI</h2>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Detail Pesanan:</h3>
        <p><strong>ID:</strong> ${orderData.id}</p>
        <p><strong>Nama:</strong> ${orderData.customerName}</p>
        <p><strong>Email:</strong> ${orderData.email}</p>
        <p><strong>Phone:</strong> ${orderData.phone}</p>
        <p><strong>Total:</strong> Rp ${orderData.totalAmount.toLocaleString()}</p>
        <p><strong>Payment:</strong> ${orderData.paymentMethod}</p>
        <p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID')}</p>
      </div>
      
      <p style="color: #059669;">✅ Pesanan berhasil dibuat dan menunggu pembayaran.</p>
    </div>`;
  }

  getCustomerEmailTemplate(orderData) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">✅ Pesanan Berhasil!</h2>
      
      <p>Halo <strong>${orderData.customerName}</strong>!</p>
      
      <p>Terima kasih telah memesan <strong>Buat Film AI Course</strong>. Pesanan Anda telah berhasil dibuat:</p>
      
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>ID Pesanan:</strong> ${orderData.id}</p>
        <p><strong>Total:</strong> Rp ${orderData.totalAmount.toLocaleString()}</p>
        <p><strong>Metode Pembayaran:</strong> ${orderData.paymentMethod}</p>
      </div>
      
      <p>Silakan lakukan pembayaran melalui link berikut:</p>
      <a href="${orderData.paymentUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Bayar Sekarang</a>
      
      <p style="margin-top: 30px; color: #6b7280;">
        Jika ada pertanyaan, silakan hubungi kami di WhatsApp: 08118088180
      </p>
      
      <p>Terima kasih! 🙏</p>
    </div>`;
  }

  async sendPaymentSuccessEmail(orderData) {
    // Send to business
    await this.sendEmail({
      to: this.notificationEmail,
      subject: `🎉 Pembayaran Berhasil - ${orderData.id}`,
      html: `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #059669;">🎉 Pembayaran Berhasil!</h2>
        <p>Pesanan <strong>${orderData.id}</strong> telah dibayar oleh ${orderData.customerName}.</p>
        <p>Silakan proses akses course segera! 🚀</p>
      </div>`
    });

    // Send to customer
    await this.sendEmail({
      to: orderData.email,
      subject: `🎉 Pembayaran Berhasil - Akses Course Anda`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">🎉 Pembayaran Berhasil!</h2>
        
        <p>Halo <strong>${orderData.customerName}</strong>!</p>
        
        <p>Pembayaran untuk pesanan <strong>${orderData.id}</strong> telah berhasil diproses.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>✅ Anda akan segera mendapat akses ke <strong>Buat Film AI Course</strong></p>
          <p>📧 Link akses akan dikirim dalam 5-10 menit</p>
        </div>
        
        <p>Selamat belajar dan happy creating! 🎬✨</p>
      </div>`
    });
  }
}

module.exports = { EmailService };