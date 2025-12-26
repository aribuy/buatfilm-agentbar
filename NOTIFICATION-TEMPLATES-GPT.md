# NOTIFICATION-TEMPLATES-GPT.md
# 📣 BuatFilm AgentBar — Notification Templates (FINAL)

Version: v1.0  
Status: FINAL  
Aligned With:
- ARCHITECTURE-GPT.md
- DEVELOPER-GUIDE-GPT.md
- USE-CASES-GPT.md

Channels:
- Email (Self-hosted SMTP)
- WhatsApp (WhatsApp Business API – Self-hosted Logic)

Delivery Pattern:
- Outbox Pattern
- Worker-based (Retry-safe, Idempotent)

---

## 1. Purpose
Dokumen ini berisi **template notifikasi resmi** yang digunakan oleh sistem  
untuk komunikasi dengan customer selama proses:

- Checkout
- Pembayaran
- Reminder
- Akses kursus

Dokumen ini **digunakan oleh tim Ops & CS**, dan menjadi referensi bagi developer  
saat mengimplementasikan sistem notifikasi.

---

## 2. Global Rules (WAJIB DIPATUHI)

1. ❌ **Dilarang mengirim pesan “Payment Success” sebelum order status = PAID**
2. ✅ Semua notifikasi **harus lewat `notification_outbox`**
3. 🔁 Setiap template hanya boleh dikirim **1x per order**
4. ⛔ Reminder otomatis berhenti jika status berubah `PAID` atau `EXPIRED`
5. 🕒 Waktu & isi pesan harus konsisten dengan status backend
6. 📜 Semua pengiriman harus tercatat (audit trail)

---

## 3. Template Variable Dictionary

Template variables yang **WAJIB konsisten** di semua channel:

| Variable | Description |
|--------|------------|
| `{{customer_name}}` | Nama customer |
| `{{order_id}}` | ID pesanan |
| `{{package_name}}` | Nama paket kursus |
| `{{final_amount}}` | Total pembayaran |
| `{{payment_link}}` | Link untuk melanjutkan pembayaran |
| `{{expires_at}}` | Waktu kadaluarsa pembayaran |
| `{{course_login_link}}` | Link login / akses kursus |
| `{{support_whatsapp_link}}` | Link kontak CS |

---

## 4. INITIAL PAYMENT INSTRUCTION  
📌 **Dikirim segera setelah user klik “Order”**

### 4.1 EMAIL — Initial Payment Instruction

**Template Name:** `EMAIL_PAYMENT_INSTRUCTION_INITIAL`  
**Subject:**  
🔔 Tinggal 1 Langkah Lagi! Selesaikan Pembayaran Kursus AI Movie 🎬

**Body:**

Halo {{customer_name}},

Terima kasih sudah mendaftar kursus
🎬 “Buat Film Pakai AI”.

Berikut detail pesanan kamu:

🧾 Order ID   : {{order_id}}
📦 Paket      : {{package_name}}
💳 Total Bayar: Rp {{final_amount}}

👉 Silakan selesaikan pembayaran melalui link berikut:
{{payment_link}}

⏰ Link ini berlaku sampai {{expires_at}}

Setelah pembayaran terkonfirmasi, akses kursus akan aktif otomatis.

Jika kamu mengalami kendala, silakan hubungi kami:
{{support_whatsapp_link}}

Salam,
Tim BuatFilm AgentBar

---

### 4.2 WHATSAPP — Initial Payment Instruction

**Template Name (WA):** `payment_instruction_initial`

**Message:**

Halo {{customer_name}} 👋

Terima kasih sudah mendaftar kursus
🎬 Buat Film Pakai AI

🧾 Order ID: {{order_id}}
📦 Paket: {{package_name}}
💳 Total: Rp {{final_amount}}

Silakan lanjutkan pembayaran melalui link berikut:
👉 {{payment_link}}

⏰ Link berlaku sampai {{expires_at}}

Jika ada kendala, hubungi admin:
{{support_whatsapp_link}}

---

## 5. PAYMENT REMINDER (PENDING)  
📌 **Dikirim hanya jika status masih `PENDING_PAYMENT`**

### 5.1 EMAIL — Payment Reminder

**Template Name:** `EMAIL_PAYMENT_REMINDER_PENDING`  
**Subject:**  
⏰ Reminder Pembayaran Kursus AI Movie

**Body:**

Halo {{customer_name}},

Kami ingin mengingatkan bahwa pesanan kursus AI Movie kamu
masih menunggu pembayaran.

🧾 Order ID: {{order_id}}
💳 Total Bayar: Rp {{final_amount}}

Silakan lanjutkan pembayaran melalui link berikut:
{{payment_link}}

Jika kamu sudah melakukan pembayaran, mohon abaikan email ini.

Terima kasih,
Tim BuatFilm AgentBar

---

### 5.2 WHATSAPP — Payment Reminder

**Template Name (WA):** `payment_reminder_pending`

**Message:**

Halo {{customer_name}} 😊

Kami mengingatkan bahwa pembayaran untuk kursus
🎬 Buat Film Pakai AI
masih belum selesai.

🧾 Order ID: {{order_id}}
💳 Total: Rp {{final_amount}}

Silakan lanjutkan pembayaran:
👉 {{payment_link}}

Jika sudah membayar, mohon abaikan pesan ini 🙏

---

## 6. PAYMENT SUCCESS + COURSE ACCESS  
📌 **Dikirim HANYA setelah webhook valid → status `PAID`**

### 6.1 EMAIL — Payment Success & Access

**Template Name:** `EMAIL_PAYMENT_SUCCESS_ACCESS`  
**Subject:**  
✅ Pembayaran Berhasil! Akses Kursus Kamu Sudah Aktif 🎉

**Body:**

Halo {{customer_name}} 🎉

Pembayaran kamu untuk kursus
🎬 “Buat Film Pakai AI”
telah BERHASIL dikonfirmasi.

🧾 Order ID: {{order_id}}
📦 Paket: {{package_name}}

Sekarang kamu bisa langsung mulai belajar melalui link berikut:
{{course_login_link}}

Jika ini pertama kali login:
	•	Gunakan email ini sebagai username
	•	Klik “Lupa Password” untuk membuat password

Butuh bantuan?
Hubungi kami di:
{{support_whatsapp_link}}

Selamat belajar & berkarya!
Tim BuatFilm AgentBar

---

### 6.2 WHATSAPP — Payment Success

**Template Name (WA):** `payment_success_access`

**Message:**

Halo {{customer_name}} 🎉

Pembayaran kamu untuk kursus
🎬 Buat Film Pakai AI
telah BERHASIL dikonfirmasi ✅

Sekarang kamu bisa langsung mulai belajar:
👉 {{course_login_link}}

Selamat berkarya! 🚀
Jika ada kendala, hubungi admin:
{{support_whatsapp_link}}

---

## 7. OPTIONAL — Order Expired Notification

### 7.1 EMAIL — Order Expired

**Template Name:** `EMAIL_ORDER_EXPIRED`  
**Subject:**  
❌ Pesanan Kedaluwarsa — Silakan Buat Pesanan Baru

**Body:**

Halo {{customer_name}},

Pesanan kursus AI Movie kamu dengan
🧾 Order ID: {{order_id}}
telah kedaluwarsa karena pembayaran tidak diterima tepat waktu.

Silakan lakukan pemesanan ulang melalui website kami:
https://buatfilm.agentbar.ai

Jika butuh bantuan, hubungi:
{{support_whatsapp_link}}

Terima kasih,
Tim BuatFilm AgentBar

---

## 8. Operational Notes (Untuk Ops & CS)

- Initial instruction dikirim **otomatis oleh sistem**
- Reminder maksimal **2–3 kali**
- Success notification **tidak boleh dikirim manual**
- CS boleh melakukan **resend notifikasi** via dashboard (jika tersedia)
- Semua pengiriman tercatat di database (audit-ready)

---

## 9. Change Management
- Setiap perubahan isi template **harus melalui review**
- Versi template harus diperbarui jika ada perubahan wording besar
- Template WA harus disesuaikan dengan approval WhatsApp Business

---

END OF DOCUMENT

