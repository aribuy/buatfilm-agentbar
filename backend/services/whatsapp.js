const sendWhatsAppMessage = async (orderData) => {
  const pendingMessage = `🎉🎉🎉 *Berhasil! Order Kakak sudah kami terima, silakan lanjutkan pembayaran*

*Dear Kak ${orderData.customerName}* 😊

Terima kasih telah melakukan produk kami *Kelas Buat Film Pakai AI*.

Status pembayaran
*Menunggu Pembayaran*

Langkah selanjutnya adalah *melakukan pembayaran* agar kakak dapat segera mendapatkan produknya.. :)

Sebagai informasi, berikut detail pesanan kakak:

Produk: *Kelas Buat Film Pakai AI*
Total Pembayaran: *Rp ${orderData.totalAmount.toLocaleString('id-ID')}*

Agar pesanannya kami proses kakak bisa melakukan pembayaran melalui link berikut ini :

${orderData.paymentUrl || 'Link pembayaran akan dikirim segera'}

agentbar
Komitmen Memberikan Yang Terbaik`;

  // Send via WhatsApp API (implement your preferred service)
  console.log('WhatsApp message sent:', pendingMessage);
  return pendingMessage;
};

const sendSuccessWhatsApp = async (orderData) => {
  const successMessage = `👋 Selamat! Pesanan kakak untuk produk Kelas Buat Film Pakai AI Telah Selesai!

Pembayaran telah berhasil kami terima dan verifikasi. Terima kasih sudah berbelanja melalui Komit Studio.

untuk selanjutnya silahkan akses produk di email yang sudah kami kirim. disana tersedia link untuk akses produk nya. 

Terimakasih 😊 
agentbar`;

  console.log('Success WhatsApp sent:', successMessage);
  return successMessage;
};

module.exports = { sendWhatsAppMessage, sendSuccessWhatsApp };