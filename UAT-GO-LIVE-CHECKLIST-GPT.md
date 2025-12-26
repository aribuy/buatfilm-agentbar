# MONITORING-ALERTING-PLAYBOOK-GPT.md
# BuatFilm AgentBar — Monitoring & Alerting Playbook (FINAL)

Version: v1.0  
Status: FINAL  
Aligned With:
- ARCHITECTURE-GPT.md
- DEVELOPER-GUIDE-GPT.md
- USE-CASES-GPT.md
- UAT-GO-LIVE-CHECKLIST-GPT.md

Scope:
- Payment (Midtrans)
- Webhook
- Notification (Email & WhatsApp)
- Order State Machine
- Worker & Scheduler

---

## 1. Tujuan Playbook
Playbook ini bertujuan untuk:
- Mendeteksi masalah **sebelum user komplain**
- Memastikan **pembayaran tidak hilang**
- Memastikan **notifikasi tidak gagal diam-diam**
- Memberi panduan **aksi cepat (what to do)** saat alert muncul

---

## 2. Monitoring Stack (Recommended)
Minimal stack yang direkomendasikan:
- **Application Logs** (backend + worker)
- **Metrics** (Prometheus / Grafana / Cloud Monitoring)
- **Alerting** (Email / Slack / WhatsApp Ops)
- **Database Monitoring**

> Tool bebas (Grafana, Datadog, NewRelic, CloudWatch, dll)  
> Yang penting: **metric & threshold-nya sama**

---

## 3. Critical Metrics (WAJIB DIMONITOR)

### 3.1 Payment Funnel Metrics
| Metric | Description | Normal |
|------|------------|--------|
| checkout_created_count | Order dibuat | baseline |
| payment_attempt_count | Snap token dibuat | ≈ order |
| payment_paid_count | Order PAID | ≥ 95% |
| payment_failed_count | Gagal bayar | ≤ 5% |
| payment_expired_count | Expired | rendah |

🚨 **Alert jika:**
- `paid / attempt < 80%` selama 30 menit

---

### 3.2 Webhook Health
| Metric | Description |
|------|------------|
| webhook_received_total | Total webhook masuk |
| webhook_invalid_signature | Webhook invalid |
| webhook_processing_error | Error saat proses |
| webhook_latency_ms | Waktu proses webhook |

🚨 **Alert jika:**
- `webhook_processing_error > 0`
- `webhook_invalid_signature spike`
- `webhook_received = 0` selama 10 menit (jam ramai)

---

### 3.3 Order State Metrics
| Metric | Description |
|------|------------|
| orders_pending | Jumlah PENDING_PAYMENT |
| orders_pending_aging | Pending > X menit |
| orders_paid | PAID |
| orders_expired | EXPIRED |

🚨 **Alert jika:**
- Pending aging > threshold (mis. > 20 order > 30 menit)

---

### 3.4 Notification Outbox Metrics
| Metric | Description |
|------|------------|
| outbox_pending | Job belum terkirim |
| outbox_retrying | Job retry |
| outbox_failed | Job gagal |
| outbox_latency | Waktu kirim |

🚨 **Alert jika:**
- `outbox_pending > 20`
- `outbox_failed > 0`
- `outbox_latency > 5 menit`

---

### 3.5 Worker & Scheduler Health
| Metric | Description |
|------|------------|
| worker_alive | Worker running |
| scheduler_alive | Scheduler running |
| job_execution_time | Lama eksekusi job |

🚨 **Alert jika:**
- Worker mati
- Scheduler mati
- Job timeout

---

## 4. Logging Standard (WAJIB)

### 4.1 Correlation ID
Semua log WAJIB menyertakan:
- `order_id`
- `event_type`
- `component` (API / Worker / Scheduler)

Contoh:
```json
{
  "level": "INFO",
  "component": "webhook",
  "order_id": "201225XXXXXX",
  "event": "PAYMENT_PAID",
  "message": "Order updated to PAID"
}

4.2 Log Categories
	•	ORDER_CREATED
	•	PAYMENT_ATTEMPT_CREATED
	•	WEBHOOK_RECEIVED
	•	WEBHOOK_VERIFIED
	•	ORDER_STATUS_CHANGED
	•	ENTITLEMENT_GRANTED
	•	OUTBOX_CREATED
	•	NOTIFICATION_SENT
	•	NOTIFICATION_FAILED
	•	RECONCILIATION_RUN

⸻

5. Alert Matrix (WHAT → WHO → ACTION)

5.1 Webhook Failure Alert

Trigger: webhook error / no webhook
Notify: Tech Lead + DevOps
Action:
	1.	Cek endpoint availability
	2.	Cek signature validation logic
	3.	Jalankan reconciliation job manual
	4.	Monitor pending orders

⸻

5.2 Payment Conversion Drop

Trigger: paid rate < threshold
Notify: Product + Tech Lead
Action:
	1.	Cek Midtrans dashboard
	2.	Cek error payment method
	3.	Cek Snap UI availability
	4.	Komunikasi ke CS jika perlu

⸻

5.3 Notification Failure Alert

Trigger: outbox_failed > 0
Notify: Ops + DevOps
Action:
	1.	Cek SMTP / WA API
	2.	Restart worker jika perlu
	3.	Requeue failed jobs
	4.	CS siap manual follow-up (sementara)

⸻

5.4 Worker Down Alert

Trigger: worker_alive = false
Notify: DevOps
Action:
	1.	Restart worker
	2.	Cek resource (CPU/RAM)
	3.	Pastikan backlog terkirim

⸻

5.5 Pending Order Aging Alert

Trigger: pending > threshold
Notify: Ops + Product
Action:
	1.	Jalankan reconciliation
	2.	Pastikan reminder terkirim
	3.	Evaluasi UX/payment friction

⸻

6. Daily Ops Checklist (Post Go-Live)

Setiap hari (atau shift):
	•	Cek paid vs pending ratio
	•	Cek webhook error
	•	Cek outbox backlog
	•	Cek worker & scheduler
	•	Review CS tickets
	
7. Incident Severity Levels

Level
Description
SLA
P0
Tidak bisa bayar sama sekali
Immediate
P1
Webhook gagal / notif gagal
< 30 menit
P2
Reminder telat / minor delay
< 4 jam
P3
Cosmetic / non-blocking
Next release

8. Incident Response (Ringkas)
	1.	Detect (alert)
	2.	Assess (impact & scope)
	3.	Mitigate (reconciliation / restart)
	4.	Communicate (Ops & CS)
	5.	Resolve
	6.	Post-mortem (jika P0/P1)

⸻

9. Dashboard Minimum (WAJIB ADA)
	•	Payment Funnel (Order → Paid)
	•	Webhook Health
	•	Pending Aging Orders
	•	Outbox Backlog
	•	Worker Status

⸻

10. Final Notes
	•	Monitoring bukan opsional
	•	Lebih baik alert palsu daripada payment hilang
	•	Semua alert harus punya ACTIONABLE STEP

⸻

END OF DOCUMENT