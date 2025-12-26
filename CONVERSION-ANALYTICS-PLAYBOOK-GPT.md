# CONVERSION-ANALYTICS-PLAYBOOK-GPT.md
# BuatFilm AgentBar — Conversion Analytics Playbook (FINAL)

Version: v1.0  
Status: FINAL  
Scope: Funnel Awareness → Paid → Course Access  
Aligned With:
- ARCHITECTURE-GPT.md
- USE-CASES-GPT.md
- MONITORING-ALERTING-PLAYBOOK-GPT.md

---

## 1. Tujuan Playbook
Playbook ini bertujuan untuk:
- Mengukur **conversion funnel secara end-to-end**
- Mengidentifikasi **drop-off terbesar**
- Memberi panduan **aksi optimasi berbasis data**
- Memisahkan masalah **UX / Marketing vs Payment / System**

📌 Prinsip utama:
> **Jangan menebak. Selalu ukur.**

---

## 2. Conversion Funnel (FINAL)
Visitor
↓
Landing Page View
↓
Click “Order Sekarang”
↓
Checkout Form Submitted
↓
Order Created
↓
Payment Attempt Created
↓
Payment PAID
↓
Course Access Activated

---

## 3. Funnel Metrics (WAJIB ADA)

### 3.1 Core Conversion Metrics

| Stage | Event | KPI Normal |
|-----|------|-----------|
| Awareness | landing_view | 100% |
| Interest | cta_click | 20–35% |
| Checkout | checkout_submit | 60–80% |
| Order | order_created | ≥ 95% |
| Payment | payment_paid | ≥ 80% |
| Access | course_access | 100% (paid) |

🚨 **Red Flag:**
- Drop > 20% di satu stage → investigasi

---

### 3.2 Time-to-Convert Metrics

| Metric | Target |
|------|--------|
| Landing → CTA | < 60 detik |
| Checkout → Order | < 2 menit |
| Order → Paid | < 5 menit (e-wallet) |
| Paid → Access | < 1 menit |

---

## 4. Event Tracking Specification

### 4.1 Frontend Events
(Wajib dikirim ke analytics)

| Event | Trigger |
|-----|--------|
| `landing_view` | Page load |
| `cta_click` | Klik Order Sekarang |
| `checkout_opened` | Checkout visible |
| `checkout_submit` | Submit form |
| `payment_page_view` | Halaman instruksi |

---

### 4.2 Backend Events
(Wajib dari server)

| Event | Trigger |
|-----|--------|
| `order_created` | Order DB insert |
| `payment_attempt_created` | Snap token dibuat |
| `payment_paid` | Webhook PAID |
| `payment_failed` | Failed |
| `payment_expired` | Expired |
| `course_access_granted` | Entitlement created |

📌 **Rule:** Conversion KPI **HARUS** dari backend event.

---

## 5. Segmentation Wajib

Analisis harus bisa difilter berdasarkan:
- Device (Mobile / Desktop)
- Payment Method (VA / E-wallet / QRIS)
- Traffic Source (Ads / Organic / Affiliate)
- Time (Jam / Hari)
- Campaign / Promo

---

## 6. Diagnosa Masalah (PLAYBOOK)

### 6.1 CTA Rendah
**Gejala:** landing_view → cta_click rendah

**Aksi:**
- Improve headline
- Tambah social proof
- Kurangi distraksi
- A/B CTA copy

---

### 6.2 Checkout Drop
**Gejala:** checkout_opened → checkout_submit rendah

**Aksi:**
- Kurangi field form
- Validasi inline
- Tambah trust badge
- Default payment populer

---

### 6.3 Payment Drop
**Gejala:** order_created → payment_paid rendah

**Aksi:**
- Periksa metode populer
- Tambah reminder
- Perbaiki copy instruksi
- Cek Snap latency

---

### 6.4 Banyak Expired
**Gejala:** payment_expired tinggi

**Aksi:**
- Kurangi expiry time
- Reminder lebih cepat
- Highlight urgency di UI

---

## 7. Reminder Impact Measurement

Track:
- Order dengan reminder vs tanpa reminder
- Paid rate setelah reminder
- Time-to-paid setelah reminder

📌 **Target:** reminder meningkatkan paid rate ≥ 10%

---

## 8. Payment Method Performance

| Method | Paid Rate | Avg Time |
|------|----------|----------|
| GoPay | ≥ 90% | < 3 menit |
| QRIS | ≥ 85% | < 4 menit |
| VA | ≥ 70% | < 1 jam |

🚨 Turun signifikan → cek Midtrans / UX

---

## 9. Dashboard Minimum (WAJIB ADA)

Dashboard harus menampilkan:
- Funnel chart
- Conversion per payment method
- Time-to-paid histogram
- Pending vs Paid over time
- Reminder effectiveness

---

## 10. Experimentation (A/B Testing)

Yang boleh di-test:
- Headline
- CTA copy
- Harga display
- Urgency message
- Payment default method

❌ Yang TIDAK boleh:
- Payment logic
- Webhook handling
- Status update rules

---

## 11. Weekly Conversion Review (SOP)

Setiap minggu:
- Review funnel drop
- Review payment method
- Review reminder impact
- Tentukan 1–2 eksperimen

---

## 12. Guardrails (ANTI-BUG)

- Conversion metric **tidak boleh** dari frontend only
- Redirect Midtrans **bukan bukti paid**
- Paid tanpa webhook = INVALID
- Access tanpa paid = BUG KRITIKAL

---

## 13. Success Benchmark (Reference)

- Landing → Paid ≥ 10–15%
- Paid → Access = 100%
- Payment failure < 5%
- Expired < 10%

---

## 14. Final Notes
- Conversion naik = revenue naik
- Jangan optimasi tanpa data
- Payment system **harus stabil dulu**, baru optimasi funnel

---

END OF DOCUMENT