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
  console.log('[WHATSAPP] Pending message sent:', pendingMessage);
  return pendingMessage;
};

const sendSuccessWhatsApp = async (orderData) => {
  const successMessage = `🎉🎉🎉 *SELAMAT! PEMBAYARAN KAKAK BERHASIL*

*Dear Kak ${orderData.customerName}*

Terima kasih telah bergabung dengan *Kelas Buat Film Pakai AI*! 🎬

Status Pembayaran: ✅ *LUNAS*

━━━━━━━━━━━━━━━━━━━━━

📦 *LINK DOWNLOAD PRODUK*

Kakak bisa langsung download semua materi course di bawah ini:

📚 *Modul 1: Pengenalan AI untuk Film Making*
https://agentbar.ai/downloads/modul-1-ai-film-intro.pdf

🎬 *Modul 2: Script Writing dengan AI*
https://agentbar.ai/downloads/modul-2-script-ai.pdf

🎨 *Modul 3: Visual Generation & Storyboard*
https://agentbar.ai/downloads/modul-3-visual-ai.pdf

🎵 *Modul 4: Audio & Voice Over AI*
https://agentbar.ai/downloads/modul-4-audio-ai.pdf

🎥 *Modul 5: Editing & Final Output*
https://agentbar.ai/downloads/modul-5-editing-ai.pdf

🛠️ *Bonus: Premium AI Tools Pack*
https://agentbar.ai/downloads/bonus-tools-pack.zip

━━━━━━━━━━━━━━━━━━━━━

🌐 *Akses Via Web*
Kakak juga bisa akses semua materi di:
https://buatfilm.agentbar.ai/thank-you?order_id=${orderData.id || orderData.token}

━━━━━━━━━━━━━━━━━━━━━

📱 *GRUP EKSKLUSIF*
Link grup WhatsApp akan dikirim ke email kakak.

📧 *CEK EMAIL KAKAK*
Detail download dan grup eksklusif juga sudah dikirim ke:
${orderData.email || 'email anda'}

Terima kasih sudah berbelanja di Komit Studio! 😊

agentbar
Komitmen Memberikan Yang Terbaik`;

  console.log('[WHATSAPP] Success message sent:', successMessage);
  return successMessage;
};

module.exports = { sendWhatsAppMessage, sendSuccessWhatsApp };
