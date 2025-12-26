# INCIDENT-RESPONSE-SOP-GPT.md
# BuatFilm AgentBar — Incident Response SOP (FINAL)

Version: v1.0  
Status: FINAL  
Scope: Payment, Webhook, Notification, Access  
Aligned With:
- ARCHITECTURE-GPT.md
- DEVELOPER-GUIDE-GPT.md
- USE-CASES-GPT.md
- UAT-GO-LIVE-CHECKLIST-GPT.md
- MONITORING-ALERTING-PLAYBOOK-GPT.md

---

## 1. Tujuan SOP
SOP ini digunakan untuk:
- Menangani insiden **secara cepat, terstruktur, dan aman**
- Memastikan **tidak ada pembayaran hilang**
- Menjaga **kepercayaan user & bisnis**
- Menghindari **aksi panik / manual yang berbahaya**

⚠️ **SOP ini WAJIB diikuti. Tidak boleh improvisasi.**

---

## 2. Definisi Insiden
Insiden adalah kondisi di mana:
- User **tidak bisa membayar**
- Pembayaran **sudah dilakukan tapi status belum PAID**
- Notifikasi **tidak terkirim**
- Akses kursus **tidak aktif padahal PAID**
- Webhook **gagal / tidak masuk**
- Worker / scheduler **mati**

---

## 3. Severity Level (WAJIB DIGUNAKAN)

| Level | Nama | Contoh | Target Response |
|----|------|-------|----------------|
| **P0** | Critical | Tidak ada user bisa bayar | Immediate |
| **P1** | High | PAID tapi akses belum aktif | < 30 menit |
| **P2** | Medium | Reminder telat / WA gagal | < 4 jam |
| **P3** | Low | Minor UX / cosmetic | Next release |

---

## 4. Incident Roles & Responsibility

### 4.1 Incident Commander (IC)
Biasanya: **Tech Lead / Senior Engineer**

Tugas:
- Ambil keputusan teknis
- Koordinasi DevOps & Ops
- Final approval tindakan

---

### 4.2 DevOps / Engineer
Tugas:
- Investigasi teknis
- Eksekusi mitigation
- Monitoring sistem

---

### 4.3 Ops / Customer Support
Tugas:
- Handle komunikasi ke user
- Jangan janji teknis
- Update status ke IC

⚠️ **CS DILARANG mengubah status order**

---

## 5. Incident Lifecycle (WAJIB URUT)

### STEP 1 — DETECT
Sumber deteksi:
- Alert monitoring
- CS ticket
- Midtrans dashboard
- Internal dashboard

📌 **Catat:**
- Jam kejadian
- Order ID
- Dampak (berapa user)

---

### STEP 2 — CLASSIFY
Tentukan:
- Severity (P0–P3)
- Komponen terdampak:
  - Payment
  - Webhook
  - Notification
  - Access

---

### STEP 3 — CONTAIN (MITIGATION CEPAT)
Tujuan: **hentikan dampak meluas**

Contoh:
- Restart worker
- Disable reminder sementara
- Switch to reconciliation mode
- Inform CS untuk hold komunikasi

---

### STEP 4 — INVESTIGATE (ROOT CAUSE)
Checklist investigasi:
- Cek logs (order_id)
- Cek webhook payload
- Cek Midtrans status
- Cek outbox & worker
- Cek database consistency

⚠️ **JANGAN mengubah data sebelum tahu sebabnya**

---

### STEP 5 — RESOLVE
Tindakan resolusi:
- Jalankan reconciliation
- Resend notification
- Grant entitlement (jika PAID valid)
- Fix config / restart service

📌 Semua aksi harus **tercatat**

---

### STEP 6 — COMMUNICATE
Komunikasi:
- Internal: status update ke tim
- External (user): hanya oleh CS, berdasarkan arahan IC

Template komunikasi:
> “Kami sedang melakukan pengecekan sistem pembayaran.  
> Akses Anda akan dipastikan aktif setelah proses verifikasi.”

⚠️ **Dilarang menyebut bug teknis detail ke user**

---

### STEP 7 — CLOSE & POST-MORTEM
Untuk P0 / P1:
- Buat post-mortem ≤ 48 jam
- Dokumentasikan:
  - Root cause
  - Timeline
  - Dampak
  - Action item

---

## 6. SOP PER SCENARIO (KRITIKAL)

---

### 6.1 P0 — Semua Pembayaran Gagal
**Severity:** P0  
**Gejala:**
- Paid rate = 0
- Banyak pending
- CS report mass issue

**Action:**
1. Cek Midtrans dashboard
2. Cek Snap availability
3. Cek server key / environment
4. Pause campaign / traffic jika perlu
5. Inform CS untuk broadcast notice

---

### 6.2 P1 — Sudah Bayar tapi Akses Belum Aktif
**Severity:** P1  

**Action:**
1. Cari order_id
2. Cek Midtrans status (dashboard/API)
3. Jika PAID valid:
   - Jalankan reconciliation
   - Grant entitlement
4. Kirim success notification ulang
5. CS follow-up user

⚠️ **Tidak boleh manual set PAID tanpa bukti Midtrans**

---

### 6.3 Webhook Tidak Masuk
**Severity:** P1 / P0  

**Action:**
1. Cek webhook endpoint uptime
2. Cek signature logic
3. Cek firewall / WAF
4. Jalankan reconciliation job
5. Monitor pending orders

---

### 6.4 Notification Tidak Terkirim
**Severity:** P2  

**Action:**
1. Cek outbox backlog
2. Cek SMTP / WA API
3. Restart worker
4. Requeue failed jobs
5. CS siapkan manual follow-up sementara

---

### 6.5 Worker / Scheduler Mati
**Severity:** P1  

**Action:**
1. Restart service
2. Pastikan tidak ada stuck lock
3. Monitor backlog drain
4. Pastikan reminder & reconcile berjalan

---

## 7. HAL YANG DILARANG (ABSOLUTE)

❌ Manual set `PAID` tanpa bukti Midtrans  
❌ Menghapus payment_event  
❌ Mengirim success notification tanpa PAID  
❌ Mengubah data production tanpa log  
❌ CS melakukan perubahan teknis  

---

## 8. Incident Documentation Template

Wajib untuk P0/P1:

Incident ID:
Date/Time:
Severity:
Detected By:
Root Cause:
Impact:
Resolution:
Preventive Action:
Owner:

---

## 9. Training & Drill
- SOP ini harus dibaca oleh:
  - Tech Lead
  - DevOps
  - Ops / CS Lead
- Lakukan **incident drill** minimal 1x / 3 bulan

---

## 10. Final Notes
- Incident bukan soal siapa salah
- Incident soal **kecepatan, ketepatan, dan disiplin SOP**
- Payment system = **zero tolerance for chaos**

---

END OF DOCUMENT