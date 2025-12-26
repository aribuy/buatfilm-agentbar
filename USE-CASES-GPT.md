# USE-CASES-GPT.md
# 🎬 BuatFilm AgentBar — Use Cases (FINAL)

Version: v2.0  
Status: FINAL  
Aligned With:
- ARCHITECTURE-GPT.md
- DEVELOPER-GUIDE-GPT.md
- NOTIFICATION-TEMPLATES-GPT.md

Payment Provider: **Midtrans Only**  
Notification: **Email & WhatsApp (Self-hosted, Outbox-based)**

---

## 1. Overview
Dokumen ini mendeskripsikan **seluruh use case fungsional & sistem**  
untuk platform **Buat Film Pakai AI**, mencakup:

- User journey end-to-end
- Payment flow (Midtrans)
- Notification flow
- System-level & background processes
- Error & edge cases

Dokumen ini **bersifat kontrak fungsional** antara Product, Engineering, dan Ops.

---

## 2. Actors
- **Customer (User)**: Pembeli kursus
- **System**: Backend API + Scheduler + Worker
- **Midtrans**: Payment Gateway
- **Admin / Support**: Tim operasional

---

## 3. Customer Journey – Happy Path

### UC-001: Successful Course Purchase
**Actor:** Customer  
**Goal:** Membeli dan mengakses kursus AI Movie

**Steps:**
1. Customer mengunjungi landing page
2. Melihat informasi & harga paket
3. Klik **Order Sekarang**
4. Mengisi checkout form (nama, email, phone)
5. Memilih metode pembayaran
6. Klik **Order**
7. System membuat `order_id` dan payment attempt
8. System mengirim **Initial Payment Instruction** (Email + WhatsApp)
9. Customer menyelesaikan pembayaran via Midtrans
10. Midtrans mengirim webhook
11. System memverifikasi webhook & update status `PAID`
12. System memberikan akses kursus
13. System mengirim **Payment Success Notification**
14. Customer login dan mengakses kursus

**Expected Result:**  
Customer mendapatkan akses kursus **setelah pembayaran terkonfirmasi**

---

## 4. Payment Method Use Cases (Midtrans Snap)

### UC-002: Virtual Account Payment
**Actor:** Customer

**Steps:**
1. Customer memilih pembayaran via Bank VA (BCA/BNI/Mandiri)
2. Midtrans menghasilkan Virtual Account
3. Customer transfer ke VA
4. Midtrans mendeteksi pembayaran
5. Webhook dikirim ke system
6. Order status berubah ke `PAID`
7. Akses kursus diberikan otomatis

---

### UC-003: E-Wallet Payment
**Actor:** Customer

**Steps:**
1. Customer memilih GoPay / ShopeePay / DANA
2. Midtrans Snap menampilkan instruksi
3. Customer menyelesaikan pembayaran di aplikasi
4. Webhook diterima system
5. Status order menjadi `PAID`
6. Akses kursus aktif

---

### UC-004: QRIS Payment
**Actor:** Customer

**Steps:**
1. Customer memilih QRIS
2. QR code ditampilkan
3. Customer scan QR
4. Midtrans mengonfirmasi pembayaran
5. Webhook diproses
6. Order `PAID` dan akses diberikan

---

## 5. Error & Edge Case Scenarios

### UC-005: Payment Timeout / Expired
**Actor:** System

**Steps:**
1. Customer membuat order
2. Pembayaran tidak dilakukan sampai `expires_at`
3. System mengubah status menjadi `EXPIRED`
4. Reminder dihentikan
5. Customer harus membuat order baru

---

### UC-006: Payment Failed
**Actor:** Customer

**Steps:**
1. Customer mencoba membayar
2. Pembayaran gagal (saldo/timeout)
3. Order tetap `PENDING_PAYMENT`
4. Customer dapat retry pembayaran

---

### UC-007: Invalid Checkout Data
**Actor:** Customer

**Steps:**
1. Customer submit data tidak valid
2. Frontend menampilkan error
3. Customer memperbaiki data
4. Order berhasil dibuat

---

## 6. Notification Use Cases

### UC-008: Initial Payment Instruction
**Actor:** System  
**Trigger:** Order dibuat + Snap token tersedia

**Steps:**
1. Order berstatus `PENDING_PAYMENT`
2. System membuat outbox:
   - Email: Payment Instruction
   - WhatsApp: Payment Instruction
3. Worker mengirim notifikasi
4. Pesan hanya dikirim **sekali per order**

---

### UC-009: Payment Reminder (Pending)
**Actor:** System  
**Trigger:** Order masih `PENDING_PAYMENT` melewati threshold waktu

**Steps:**
1. Scheduler memeriksa order pending
2. Reminder belum pernah dikirim
3. System membuat outbox reminder
4. Worker mengirim Email + WhatsApp
5. Reminder dihentikan jika order `PAID` / `EXPIRED`

---

### UC-010: Payment Success Notification
**Actor:** System  
**Trigger:** Order berubah ke `PAID`

**Steps:**
1. System membuat entitlement kursus
2. System membuat outbox success
3. Worker mengirim Email + WhatsApp
4. Tidak ada pengiriman ganda (idempotent)

---

## 7. System-Level Use Cases (CRITICAL)

### UC-011: Midtrans Webhook Processing
**Actor:** Midtrans

**Steps:**
1. Midtrans mengirim webhook
2. System memverifikasi signature
3. Payload disimpan sebagai `payment_event`
4. Order state machine diperbarui
5. Response 200 OK dikirim cepat

---

### UC-012: Idempotent Webhook Handling
**Actor:** System

**Steps:**
1. Webhook duplikat diterima
2. System mendeteksi event sudah ada
3. Tidak ada side-effect ganda
4. Order & notifikasi tetap konsisten

---

### UC-013: Order State Machine Enforcement
**Actor:** System

**Steps:**
1. Order sudah `PAID`
2. Webhook terlambat dengan status non-paid
3. System menolak downgrade
4. Status tetap `PAID`

---

### UC-014: Notification Outbox Processing
**Actor:** System

**Steps:**
1. Outbox job dibuat
2. Worker mengambil job
3. Mengirim notifikasi
4. Gagal → retry
5. Berhasil → mark SENT

---

### UC-015: Payment Reconciliation Job
**Actor:** System (Scheduler)

**Steps:**
1. Order `PENDING_PAYMENT` terlalu lama
2. System query status ke Midtrans
3. Jika `PAID` → update & grant akses
4. Jika `EXPIRED` → update status

---

## 8. Admin & Support Use Cases

### UC-016: Admin Order Support
**Actor:** Admin

**Steps:**
1. Admin mencari order (order_id/email)
2. Melihat status & event pembayaran
3. Menjalankan reconciliation manual
4. Resend notifikasi jika diperlukan

⚠️ Admin **tidak boleh** manual set status `PAID`

---

## 9. Frontend Rendering Use Cases

### UC-017: Server-Truth Rendering
**Actor:** Frontend

**Steps:**
1. Frontend memanggil `GET /api/orders/{id}`
2. Render UI berdasarkan status:
   - `PAID` → success + course link
   - `PENDING_PAYMENT` → instruksi bayar
   - `FAILED` → retry
   - `EXPIRED` → order baru

---

## 10. Testing & Non-Functional Use Cases

### UC-018: Load & Stress Handling
**Actor:** System

**Steps:**
1. Banyak order dibuat bersamaan
2. Webhook datang paralel
3. System tetap konsisten
4. Tidak ada duplikasi akses/notifikasi

---

### UC-019: Security Validation
**Actor:** System

**Steps:**
1. Coba webhook invalid
2. System menolak
3. Data sensitif tidak bocor
4. Audit trail tersedia

---

## 11. Success Metrics (Reference)

- Checkout → Payment ≥ 80%
- Payment → Success ≥ 95%
- Duplicate notification: 0
- Akses kursus tanpa PAID: 0

---

## 12. Final Notes
- Dokumen ini **FINAL & MENGIKAT**
- Setiap perubahan sistem **WAJIB update dokumen**
- Developer & Ops **WAJIB mengacu** ke use cases ini

---

END OF DOCUMENT