# DEVELOPER-GUIDE-GPT.md
# BuatFilm AgentBar — Developer Implementation Guide
(Midtrans Only • Email & WhatsApp Self-Hosted • Webhook-First)

Version: v1.0  
Status: FINAL  
Architecture Reference: ARCHITECTURE-GPT.md  
Use Cases Reference: USE-CASES-GPT.md  

---

## 1. Tujuan Dokumen
Dokumen ini adalah **panduan teknis wajib** bagi developer untuk mengimplementasikan sistem:
- Checkout
- Payment (Midtrans)
- Webhook verification
- Notification (Email & WhatsApp)
- Course access (entitlement)

Tanpa mengikuti dokumen ini, implementasi dianggap **tidak valid**.

---

## 2. Prinsip Wajib (Non-Negotiable)

1. **Webhook adalah satu-satunya sumber kebenaran pembayaran**
2. **Frontend tidak pernah menentukan status PAID**
3. **Notifikasi wajib lewat Outbox + Worker**
4. **Order state bersifat monotonic**
5. **Tidak ada manual upload bukti / verifikasi manual**
6. **Midtrans Snap only**

---

## 3. Lingkungan & Domain

| Komponen | URL |
|--------|-----|
| Frontend | https://buatfilm.agentbar.ai |
| Backend API | https://api.agentbar.ai |
| Webhook | https://api.agentbar.ai/api/webhooks/midtrans |

---

## 4. Environment Variables

### 4.1 Frontend
```env
VITE_API_BASE_URL=https://api.agentbar.ai
VITE_MIDTRANS_CLIENT_KEY=xxxx

⚠️ Server Key Midtrans TIDAK BOLEH ada di frontend


4.2 Backend
MIDTRANS_SERVER_KEY=xxxx
MIDTRANS_IS_PRODUCTION=true
PUBLIC_FE_BASE_URL=https://buatfilm.agentbar.ai

SMTP_HOST=mail.domain.com
SMTP_PORT=587
SMTP_USER=noreply@domain.com
SMTP_PASS=secret
SMTP_FROM="BuatFilm <noreply@domain.com>"

WA_PROVIDER=meta_cloud
WA_ACCESS_TOKEN=xxxx
WA_PHONE_NUMBER_ID=xxxx

REMINDER_1_MINUTES=15
REMINDER_2_MINUTES=120
PAYMENT_EXPIRE_HOURS=24
RECONCILE_MINUTES=10

5. Data Model Contract (Wajib Dipatuhi)

5.1 orders

{
  "order_id": "DDMMYYXXXXXX",
  "customer_name": "",
  "customer_email": "",
  "customer_phone": "",
  "package_id": "",
  "package_name": "",
  "final_amount": 99000,
  "status": "PENDING_PAYMENT",
  "created_at": "",
  "expires_at": ""
}

Status valid:
	•	CREATED
	•	PENDING_PAYMENT
	•	PAID
	•	FAILED
	•	EXPIRED
	
	5.2 payment_attempts
	
	{
  "attempt_id": "",
  "order_id": "",
  "provider": "MIDTRANS",
  "snap_token": "",
  "status": "PENDING",
  "created_at": ""
}

5.3 payment_events

{
  "event_id": "",
  "order_id": "",
  "raw_payload": {},
  "signature_valid": true,
  "received_at": ""
}

5.4 entitlements
{
  "order_id": "",
  "user_email": "",
  "course_id": "",
  "status": "ACTIVE",
  "granted_at": ""
}

5.5 notification_outbox
{
  "order_id": "",
  "channel": "EMAIL | WHATSAPP",
  "template_name": "",
  "status": "PENDING",
  "attempt_count": 0
}

UNIQUE KEY
(order_id, channel, template_name)

6. API Contract

6.1 Create Order

POST /api/orders

Input:

{
  "customer_name": "",
  "customer_email": "",
  "customer_phone": "",
  "package_id": ""
}

Output:

{
  "order_id": "",
  "status": "PENDING_PAYMENT",
  "final_amount": 99000,
  "expires_at": ""
}

6.2 Create / Refresh Payment

POST /api/orders/{order_id}/pay

Rules:
	•	Jika PAID → return status PAID
	•	Jika EXPIRED → reject
	•	Jika token expired → buat attempt baru

Output:

{
  "snap_token": "",
  "status": "PENDING_PAYMENT"
}

6.3 Get Order Status (Frontend Truth)

GET /api/orders/{order_id}

Output:
{
  "status": "PAID",
  "course_login_link": ""
}

6.4 Webhook Midtrans

POST /api/webhooks/midtrans

Responsibilities:
	1.	Verify signature
	2.	Simpan payment_event
	3.	Update order state
	4.	Return HTTP 200 secepat mungkin


7. Order State Machine

Allowed transitions:
	•	CREATED → PENDING_PAYMENT
	•	PENDING_PAYMENT → PAID
	•	PENDING_PAYMENT → FAILED
	•	PENDING_PAYMENT → EXPIRED

⚠️ PAID adalah FINAL STATE

⸻

8. Notification Workflow

8.1 Initial Payment Instruction

Trigger:
	•	Order dibuat + Snap token tersedia

Action:
	•	Create outbox (EMAIL + WHATSAPP)

⸻

8.2 Reminder Payment

Trigger:
	•	Order masih PENDING_PAYMENT
	•	Age ≥ REMINDER_X_MINUTES

Rules:
	•	Max 2 reminder
	•	Stop otomatis jika PAID / EXPIRED

⸻

8.3 Payment Success

Trigger:
	•	Webhook update → PAID

Action:
	•	Grant entitlement
	•	Send success Email + WhatsApp

⸻

9. Worker (Notification Processor)

9.1 Worker Loop
	1.	Fetch outbox PENDING
	2.	Lock job
	3.	Send message
	4.	Update status SENT / RETRYING

Retry:
	•	Exponential backoff
	•	Max attempt: 5

⸻

10. Scheduler Jobs

10.1 Reminder Scheduler
	•	Scan pending orders
	•	Create reminder outbox

10.2 Reconciliation Scheduler
	•	Scan aging pending orders
	•	Query Midtrans status
	•	Sync state

⸻

11. Frontend Rules (WAJIB)

Frontend:
	•	Selalu GET status dari backend
	•	Render berdasarkan status
	•	Tidak percaya redirect Midtrans

Frontend DILARANG:
	•	Set PAID
	•	Kirim notifikasi
	•	Simpan server key

⸻

12. Security Checklist
	•	Verify webhook signature
	•	Rate limit order/pay
	•	Mask PII di log
	•	Unique outbox key
	•	HTTPS only

⸻

13. Testing Wajib
	•	Happy path payment
	•	Duplicate webhook
	•	Pending + reminder
	•	Webhook missed + reconciliation
	•	SMTP / WA failure & retry

⸻

14. Ownership & Enforcement

Dokumen ini:
	•	Wajib dipatuhi developer
	•	Menjadi dasar review PR
	•	Setiap deviasi harus disetujui arsitek
	
	END OF DOCUMENT
