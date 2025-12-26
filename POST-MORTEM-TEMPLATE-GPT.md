# POST-MORTEM-TEMPLATE-GPT.md
# BuatFilm AgentBar — Incident Post-Mortem Report

Version: v1.0  
Status: TEMPLATE (WAJIB DIGUNAKAN)  
Applies To: Incident Severity P0 / P1  
Confidentiality: Internal Only

Aligned With:
- INCIDENT-RESPONSE-SOP-GPT.md
- MONITORING-ALERTING-PLAYBOOK-GPT.md
- ARCHITECTURE-GPT.md

---

## 1. Incident Summary (Ringkasan Eksekutif)

**Incident ID:**  
**Incident Title:**  
**Severity:** P0 / P1  
**Date:**  
**Time Window:** (Start – End)  
**Detected By:** (Monitoring / CS / Dev / Midtrans / Other)

**One-paragraph summary (WAJIB):**  
> Jelaskan secara singkat apa yang terjadi, dampaknya ke user & bisnis,  
> dan apakah insiden sudah sepenuhnya diselesaikan.

---

## 2. Impact Assessment (Dampak)

### 2.1 User Impact
- Jumlah user terdampak:
- Gejala yang dialami user:
  - ☐ Tidak bisa bayar
  - ☐ Sudah bayar tapi belum dapat akses
  - ☐ Tidak menerima email / WhatsApp
  - ☐ Lainnya: ___________

### 2.2 Business Impact
- Estimasi transaksi tertunda:
- Estimasi potensi revenue impact:
- Campaign / traffic terdampak? Ya / Tidak

---

## 3. Timeline of Events (KRITIKAL)

| Time (WIB) | Event | Actor |
|-----------|-------|-------|
| HH:MM | Incident mulai terjadi | System |
| HH:MM | Alert pertama muncul | Monitoring |
| HH:MM | Incident dikonfirmasi | Tech Lead |
| HH:MM | Mitigasi awal | DevOps |
| HH:MM | Root cause ditemukan | Engineer |
| HH:MM | Sistem pulih | System |
| HH:MM | Incident ditutup | IC |

⚠️ Timeline **WAJIB faktual, tanpa asumsi**

---

## 4. Root Cause Analysis (RCA)

### 4.1 What Happened (Apa yang terjadi)
Deskripsikan kondisi teknis secara jelas.

---

### 4.2 Why It Happened (Kenapa terjadi)
Gunakan **5 Whys** (WAJIB untuk P0):

1. Why #1:
2. Why #2:
3. Why #3:
4. Why #4:
5. Why #5:

**Root Cause Final:**  
> (1 kalimat yang spesifik & teknis)

---

### 4.3 What Did NOT Cause This
Tuliskan faktor yang **sudah dicek tapi terbukti bukan penyebab**  
(untuk mencegah asumsi salah di masa depan).

---

## 5. Detection & Response Evaluation

### 5.1 Detection
- Apakah incident terdeteksi otomatis? Ya / Tidak
- Jika tidak, kenapa?
- Waktu dari kejadian → deteksi: ___ menit

---

### 5.2 Response
- Apakah SOP diikuti? Ya / Tidak
- Waktu dari deteksi → mitigasi: ___ menit
- Apakah response time sesuai SLA? Ya / Tidak

---

## 6. Resolution & Recovery

### 6.1 Mitigation Actions (Saat Incident)
- [ ] Restart service
- [ ] Jalankan reconciliation
- [ ] Pause reminder
- [ ] Manual entitlement (jika PAID valid)
- [ ] Lainnya: ___________

---

### 6.2 Final Fix
Jelaskan solusi permanen yang diterapkan.

---

## 7. Customer Communication

### 7.1 Internal Communication
- Tim yang diberi update:
  - ☐ Product
  - ☐ Ops / CS
  - ☐ Management

---

### 7.2 External Communication (Jika Ada)
- User diberi notifikasi? Ya / Tidak
- Channel:
  - ☐ Email
  - ☐ WhatsApp
- Ringkasan pesan ke user:
> (ringkas, non-teknis)

---

## 8. Preventive Actions (WAJIB)

| Action Item | Owner | Priority | ETA |
|------------|-------|----------|-----|
| | | High / Medium | |
| | | | |

⚠️ Minimal **1 preventive action** wajib ada

---

## 9. Lessons Learned

### 9.1 What Went Well
- …

### 9.2 What Could Be Improved
- …

---

## 10. Follow-Up & Verification

- [ ] Fix sudah deploy ke production
- [ ] Monitoring/alert baru ditambahkan
- [ ] SOP / Docs diperbarui
- [ ] Issue tidak muncul lagi (observasi ___ hari)

---

## 11. Approval & Sign-off

| Role | Name | Signature | Date |
|----|------|----------|------|
| Incident Commander | | | |
| Tech Lead | | | |
| Product Owner | | | |

---

## 12. Appendix (Optional)
- Log snippet
- Screenshot dashboard
- Midtrans reference ID
- Query database (sanitized)

---

END OF POST-MORTEM

Cara Pakai (Best Practice)
	•	P0 / P1: wajib dibuat ≤ 48 jam
	•	Jangan cari siapa salah → fokus system & process
	•	Action item harus ditrack (Jira / Notion / GitHub Issue)
