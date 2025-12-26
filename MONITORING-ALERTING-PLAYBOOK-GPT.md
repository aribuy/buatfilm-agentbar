# UAT-GO-LIVE-CHECKLIST-GPT.md
# BuatFilm AgentBar — UAT & Go-Live Checklist (FINAL)

Version: v1.0  
Status: FINAL  
Aligned With:
- ARCHITECTURE-GPT.md
- DEVELOPER-GUIDE-GPT.md
- USE-CASES-GPT.md
- NOTIFICATION-TEMPLATES-GPT.md

Payment Provider: Midtrans Only  
Notification: Email & WhatsApp (Self-hosted)

---

## 1. PRE-UAT CHECKLIST (WAJIB LULUS)

### 1.1 Environment Readiness
- [ ] Frontend & Backend ter-deploy di environment UAT
- [ ] Domain UAT aktif (HTTPS)
- [ ] Environment variable terisi lengkap
- [ ] Midtrans mode **Sandbox** aktif
- [ ] SMTP test server aktif
- [ ] WhatsApp Sandbox / Test Number aktif

---

### 1.2 Configuration Validation
- [ ] `MIDTRANS_SERVER_KEY` benar
- [ ] `VITE_MIDTRANS_CLIENT_KEY` benar
- [ ] Webhook URL terdaftar di Midtrans Dashboard
- [ ] Redirect / Finish URL mengarah ke FE
- [ ] Payment expiry sesuai konfigurasi (mis. 24 jam)

---

## 2. UAT — FUNCTIONAL TESTING

### 2.1 Checkout & Order Creation
- [ ] Submit checkout form valid → order berhasil dibuat
- [ ] Order ID format DDMMYYXXXXXX benar
- [ ] Status awal = `PENDING_PAYMENT`
- [ ] Snap token berhasil dibuat
- [ ] FE menampilkan instruksi dengan benar

---

### 2.2 Initial Payment Instruction (Email + WhatsApp)
- [ ] Email instruksi pembayaran terkirim
- [ ] WhatsApp instruksi pembayaran terkirim
- [ ] Link pembayaran valid
- [ ] Pesan hanya terkirim **1x**
- [ ] Tidak ada pesan success dikirim di tahap ini

---

### 2.3 Payment Execution (Midtrans)
Test **SEMUA metode utama**:
- [ ] Virtual Account (BCA/BNI/Mandiri)
- [ ] E-Wallet (GoPay / ShopeePay / DANA)
- [ ] QRIS

Untuk setiap metode:
- [ ] Pembayaran sukses
- [ ] Midtrans menampilkan status benar
- [ ] Webhook terkirim ke backend

---

### 2.4 Webhook Processing
- [ ] Signature webhook tervalidasi
- [ ] Raw payload tersimpan di `payment_events`
- [ ] Order status berubah ke `PAID`
- [ ] Tidak ada error 5xx
- [ ] Duplicate webhook **tidak** menyebabkan:
  - double entitlement
  - double notification

---

### 2.5 Payment Success Flow
- [ ] Entitlement kursus dibuat
- [ ] Email success terkirim
- [ ] WhatsApp success terkirim
- [ ] User bisa login & akses course
- [ ] FE result page menampilkan status PAID

---

### 2.6 Pending & Reminder Flow
- [ ] Order dibiarkan pending
- [ ] Reminder 1 terkirim sesuai waktu
- [ ] Reminder 2 (jika ada) terkirim
- [ ] Reminder berhenti setelah PAID
- [ ] Reminder berhenti setelah EXPIRED

---

### 2.7 Expired Payment
- [ ] Order melewati expiry
- [ ] Status berubah ke `EXPIRED`
- [ ] FE menampilkan expired state
- [ ] Tidak bisa bayar ulang order lama
- [ ] Tidak ada reminder setelah expired

---

## 3. UAT — NEGATIVE & EDGE CASES

### 3.1 Invalid Webhook
- [ ] Signature salah → webhook ditolak
- [ ] Status order tidak berubah
- [ ] Event tercatat untuk audit

---

### 3.2 Duplicate / Delayed Webhook
- [ ] Webhook dikirim ulang → idempotent
- [ ] Webhook telat → tidak downgrade PAID
- [ ] Tidak ada notifikasi ganda

---

### 3.3 Notification Failure
- [ ] SMTP dimatikan → outbox retry
- [ ] WA API gagal → retry
- [ ] Retry berhenti setelah max attempt
- [ ] Tidak ada crash sistem

---

### 3.4 Reconciliation Job
- [ ] Webhook dimatikan sementara
- [ ] Scheduler reconcile jalan
- [ ] Status order tersinkronisasi dari Midtrans
- [ ] Entitlement & notif tetap berjalan

---

## 4. FRONTEND UAT (SERVER TRUTH)

- [ ] FE **tidak** pakai query param status
- [ ] FE selalu GET `/api/orders/{id}`
- [ ] UI sesuai status:
  - PAID → success
  - PENDING → instruksi
  - FAILED → retry
  - EXPIRED → new order

---

## 5. SECURITY & COMPLIANCE UAT

- [ ] Server Key tidak bocor ke FE
- [ ] HTTPS enforced
- [ ] Rate limiting aktif
- [ ] PII dimasking di log
- [ ] Webhook endpoint tidak public tanpa signature

---

## 6. ADMIN & OPS UAT

- [ ] Admin bisa search order
- [ ] Admin bisa lihat payment timeline
- [ ] Admin bisa trigger reconciliation
- [ ] Admin bisa resend notification
- [ ] Admin **tidak bisa** manual set PAID

---

## 7. PERFORMANCE & LOAD (MINIMUM)

- [ ] 50–100 concurrent checkout
- [ ] Tidak ada deadlock order
- [ ] Webhook paralel aman
- [ ] Worker tetap stabil
- [ ] Outbox backlog tidak menumpuk

---

## 8. GO-LIVE CHECKLIST (FINAL)

### 8.1 Switch to Production
- [ ] Midtrans mode **Production**
- [ ] Production Server Key aktif
- [ ] Production Client Key aktif
- [ ] Webhook URL production terdaftar
- [ ] SMTP production aktif
- [ ] WhatsApp production number aktif

---

### 8.2 Data & Monitoring
- [ ] Logging aktif
- [ ] Alert webhook failure
- [ ] Alert outbox backlog
- [ ] Alert pending order aging

---

### 8.3 Smoke Test (Wajib)
- [ ] 1 transaksi sukses (real payment)
- [ ] Email success diterima
- [ ] WhatsApp success diterima
- [ ] Akses course aktif

---

## 9. GO-LIVE APPROVAL

| Role | Name | Signature | Date |
|----|------|----------|------|
| Product Owner | | | |
| Tech Lead | | | |
| QA | | | |
| Ops / CS | | | |

---

## 10. POST GO-LIVE (24–48 Jam)

- [ ] Monitor conversion rate
- [ ] Monitor pending vs paid
- [ ] Monitor notif failure
- [ ] Monitor CS ticket
- [ ] Siapkan hotfix plan

---

END OF CHECKLIST