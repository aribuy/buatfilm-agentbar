const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.apiUrl = 'https://api.whatsapp.com/send';
    this.businessPhone = '08118088180'; // Notification source
  }

  async sendOrderNotification(orderData) {
    const message = `🎬 *PESANAN BARU - Buat Film AI*

📋 *Detail Pesanan:*
• ID: ${orderData.id}
• Nama: ${orderData.customerName}
• Email: ${orderData.email}
• Phone: ${orderData.phone}
• Total: Rp ${orderData.totalAmount.toLocaleString()}
• Payment: ${orderData.paymentMethod}

⏰ ${new Date().toLocaleString('id-ID')}

✅ Pesanan berhasil dibuat!`;

    try {
      // Send to business WhatsApp
      await this.sendMessage(this.businessPhone, message);
      
      // Send confirmation to customer
      const customerMessage = `✅ *Pesanan Berhasil!*

Halo ${orderData.customerName}! 

Pesanan Anda telah berhasil dibuat:
• ID: ${orderData.id}
• Total: Rp ${orderData.totalAmount.toLocaleString()}

Silakan lakukan pembayaran melalui ${orderData.paymentMethod}.

Terima kasih! 🙏`;

      await this.sendMessage(orderData.phone, customerMessage);
      
      console.log('✅ WhatsApp notifications sent');
      return true;
    } catch (error) {
      console.error('❌ WhatsApp notification failed:', error.message);
      return false;
    }
  }

  async sendMessage(phone, message) {
    // Format phone number
    const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    
    // Using WhatsApp Business API or third-party service
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    // For production, use actual WhatsApp Business API
    console.log(`📱 WhatsApp to ${phone}:`, message);
    return true;
  }

  async sendSuccessNotification(orderData) {
    const message = `🎉 *PEMBAYARAN BERHASIL!*

Pesanan ${orderData.id} telah dibayar.
Customer: ${orderData.customerName}

Silakan proses pesanan segera! 🚀`;

    await this.sendMessage(this.businessPhone, message);
    
    const customerMessage = `🎉 *Pembayaran Berhasil!*

Terima kasih ${orderData.customerName}!

Pembayaran untuk pesanan ${orderData.id} telah berhasil.
Anda akan segera mendapat akses ke course.

Happy learning! 🎬✨`;

    await this.sendMessage(orderData.phone, customerMessage);
  }
}

module.exports = { WhatsAppService };