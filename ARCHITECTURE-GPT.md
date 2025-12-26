# ARCHITECTURE-GPT.md
# BuatFilm AgentBar — Payment & Access System Architecture (Midtrans Only)

Version: v1.0  
Status: FINAL  
Aligned Documents:
- USE-CASES-GPT.md
- DEVELOPER-GUIDE-GPT.md
- NOTIFICATION-TEMPLATES-GPT.md

---

## 1. Purpose of This Document
Dokumen ini menjadi **arsitektur resmi & sumber kebenaran (single source of truth)**  
untuk pengembangan sistem checkout, pembayaran, notifikasi, dan akses kursus pada:

- **Frontend**: https://buatfilm.agentbar.ai  
- **Backend API**: https://api.agentbar.ai  

Dokumen ini **WAJIB diikuti developer** dan digunakan sebagai referensi audit, scaling, dan onboarding.

---

## 2. Architecture Principles (Wajib Dipatuhi)

1. **Webhook is the Source of Truth**
   - Status pembayaran **hanya sah** jika berasal dari Midtrans webhook
   - Redirect / success page **tidak boleh** mengubah status database

2. **Monotonic Order State Machine**
   - Status final (`PAID`) tidak boleh diturunkan
   - Sistem harus idempotent terhadap webhook ganda

3. **Outbox Pattern for Notifications**
   - Email & WhatsApp **tidak boleh dikirim langsung**
   - Semua pesan harus lewat `notification_outbox` + worker

4. **Midtrans Only**
   - Tidak ada Xendit
   - Tidak ada upload bukti transfer
   - Tidak ada verifikasi manual oleh admin

5. **Server Truth for Frontend**
   - Frontend selalu render status dari backend (`GET /orders/{id}`)

---

## 3. High-Level System Components

### 3.1 Frontend (React + Vite)
Responsibilities:
- Landing page & pricing
- Checkout form
- Payment page (Snap trigger)
- Result / Pending / Failed page
- Login & course access redirect

Frontend **TIDAK BOLEH**:
- Menentukan status PAID
- Mengirim notifikasi
- Menyimpan server key

---

### 3.2 Backend API (Node.js + Express)
Responsibilities:
- Order creation & validation
- Midtrans Snap token generation
- Webhook verification
- Order state machine
- Entitlement granting
- Notification outbox creation
- Reminder & reconciliation scheduler

---

### 3.3 Payment Gateway — Midtrans Snap
Used features:
- Snap UI
- Virtual Account (BCA, BNI, Mandiri, dll)
- QRIS
- E-wallet (GoPay, ShopeePay, DANA)

Not used:
- Manual transfer verification
- Client-side status confirmation

---

### 3.4 Database (Logical View)

Core tables/collections:
- `orders`
- `payment_attempts`
- `payment_events`
- `entitlements`
- `notification_outbox`

Database berfungsi sebagai **single source of truth** untuk seluruh status sistem.

---

### 3.5 Notification System (Self-hosted)

Components:
- Notification Worker (background process)
- SMTP Server (self-hosted)
- WhatsApp Business API (Meta Cloud API / BSP)

Fungsi:
- Kirim Email & WhatsApp
- Retry otomatis
- Anti duplicate message
- Logging & audit trail

---

## 4. End-to-End System Flow (Narrative)

1. User mengisi checkout dan klik **Order**
2. Backend:
   - Generate `order_id`
   - Generate Midtrans Snap token
   - Set status `PENDING_PAYMENT`
3. Sistem mengirim:
   - **Initial Payment Instruction**
   - via Email + WhatsApp (berisi payment link)
4. User melakukan pembayaran di Midtrans
5. Midtrans mengirim webhook ke backend
6. Backend:
   - Verifikasi signature
   - Simpan payment_event
   - Update order status
7. Jika `PAID`:
   - Grant course entitlement
   - Kirim **Payment Success Notification**
8. Jika `PENDING`:
   - Scheduler mengirim reminder
9. Frontend selalu membaca status dari backend

---

## 5. Order State Machine (Final)

Allowed transitions:

- `CREATED → PENDING_PAYMENT`
- `PENDING_PAYMENT → PAID`
- `PENDING_PAYMENT → FAILED`
- `PENDING_PAYMENT → EXPIRED`

Rules:
- `PAID` adalah final state
- Tidak boleh downgrade
- Semua transition harus idempotent

---

## 6. Notification Strategy

### 6.1 Initial Payment Instruction
Trigger:
- Order dibuat + Snap token tersedia

Channel:
- Email
- WhatsApp

Isi:
- Order ID
- Total bayar
- Link pembayaran
- Waktu kadaluarsa

---

### 6.2 Payment Reminder
Trigger:
- Order masih `PENDING_PAYMENT`
- Melewati threshold waktu (mis. 15 menit, 2 jam)

Rules:
- Maksimal 2–3 kali reminder
- Stop otomatis jika PAID / EXPIRED

---

### 6.3 Payment Success Notification
Trigger:
- Order berubah menjadi `PAID` (via webhook)

Isi:
- Konfirmasi pembayaran
- Link login / course access

---

## 7. Webhook & Reconciliation

### 7.1 Webhook Processing
- Endpoint: `/api/webhooks/midtrans`
- Wajib verifikasi signature
- Simpan raw payload
- Update status via state machine

### 7.2 Reconciliation Job
Digunakan jika:
- Webhook terlambat
- Webhook gagal terkirim

Flow:
- Cari order pending yang aging
- Query status ke Midtrans
- Sinkronkan status

---

## 8. Frontend Rendering Rules

Frontend page **WAJIB**:
- Memanggil `GET /api/orders/{order_id}`
- Render berdasarkan status:
  - PAID → success + access
  - PENDING → instruksi bayar
  - FAILED → retry
  - EXPIRED → buat order baru

Frontend **DILARANG**:
- Mengandalkan query param redirect Midtrans

---

## 9. Security Rules (Mandatory)

- Midtrans Server Key hanya di backend
- Webhook signature validation wajib
- Rate limit endpoint order & pay
- Mask email & phone di log
- Outbox unique constraint mencegah spam

---

## 10. Operational Notes

- Worker harus berjalan terpisah dari API
- Monitoring:
  - Webhook error rate
  - Pending order aging
  - Outbox backlog
- Admin hanya boleh:
  - View status
  - Trigger reconciliation
  - Resend notification

Admin **tidak boleh**:
- Manual set PAID tanpa audit

---

## 11. Document Ownership
Dokumen ini:
- Digunakan sebagai **kontrak arsitektur**
- Setiap perubahan sistem **HARUS update dokumen ini**
- Developer **WAJIB** mengacu ke dokumen ini sebelum coding

---

END OF DOCUMENT