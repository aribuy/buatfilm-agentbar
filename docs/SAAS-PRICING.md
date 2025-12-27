# SaaS Pricing Model & Feature Matrix

## 💰 Pricing Tiers

### **Starter Plan** - Rp 299K/month
**Target:** Solo creators, small courses

**Features:**
- ✅ 100 orders/month
- ✅ 1 admin user
- ✅ Midtrans Sandbox + Production
- ✅ Email notifications (Midtrans native)
- ✅ Basic order tracking
- ✅ Thank You page (non-branded)
- ✅ In-depth analytics (7 days)
- ❌ No custom domain
- ❌ No WhatsApp automation
- ❌ No API access
- ❌ No white-label

**Use Cases:**
- Course creators selling 1-2 products
- Coaches with small client base
- Webinar funnels

---

### **Pro Plan** - Rp 999K/month ⭐ CURRENT PLAN
**Target:** Growing businesses, multiple products

**Features:**
- ✅ 1,000 orders/month
- ✅ 3 admin users
- ✅ Midtrans full integration
- ✅ Custom email templates
- ✅ WhatsApp automation (Baileys)
- ✅ Custom domain (yourdomain.com)
- ✅ White-label (remove "BuatFilm" branding)
- ✅ Advanced analytics (90 days)
- ✅ API access (rate-limited)
- ✅ Webhook replay
- ✅ Export orders (CSV/Excel)
- ✅ Priority support (WhatsApp)

**Use Cases:**
- Course businesses with multiple products
- Agencies managing client funnels
- E-commerce with digital products

---

### **Enterprise Plan** - Rp 4,999K/month
**Target:** High-volume sellers, agencies

**Features:**
- ✅ Unlimited orders
- ✅ 10 admin users
- ✅ Everything in Pro
- ✅ Dedicated WhatsApp Business API
- ✅ Custom payment gateway (DOKU, Xendit, etc.)
- ✅ Advanced fraud detection
- ✅ Custom integrations (Zapier, Make)
- ✅ SLA: 99.9% uptime
- ✅ Dedicated account manager
- ✅ On-premise deployment option
- ✅ Custom development (5 hours/month)
- ✅ White-label mobile app (optional add-on)

**Use Cases:**
- Large course platforms
- Agencies with 10+ clients
- Marketplaces (multi-vendor)

---

## 📊 Feature Comparison Matrix

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| **Orders** | 100/mo | 1,000/mo | Unlimited |
| **Admin Users** | 1 | 3 | 10 |
| **Products** | 1 | 10 | Unlimited |
| **Payment Gateway** | Midtrans | Midtrans | Custom |
| **Custom Domain** | ❌ | ✅ | ✅ |
| **White-label** | ❌ | ✅ | ✅ |
| **Email Templates** | ❌ | ✅ | ✅ |
| **WhatsApp Bot** | ❌ | Baileys | Official API |
| **API Access** | ❌ | Rate-limited | Full access |
| **Analytics Retention** | 7 days | 90 days | Forever |
| **Webhook Replay** | ❌ | ✅ | ✅ |
| **Fraud Detection** | Basic | Basic | Advanced |
| **Custom Integrations** | ❌ | ❌ | ✅ |
| **SLA** | Best effort | Best effort | 99.9% |
| **Support** | Email | WhatsApp | Dedicated Manager |

---

## 🎯 Upsell Opportunities

### **Add-Ons (All Plans)**

#### 1. Additional Admin Users
- **Starter:** Rp 99K/user/month
- **Pro:** Rp 149K/user/month
- **Enterprise:** Rp 199K/user/month

#### 2. Extra Orders (Overages)
- **Starter:** Rp 3K/extra order
- **Pro:** Rp 1.5K/extra order
- **Enterprise:** Unlimited

#### 3. WhatsApp Business API Setup
- **One-time:** Rp 2,500,000
- **Monthly:** Rp 500K (includes Meta fees)

#### 4. Custom Integration
- **Rate:** Rp 1,500K/hour
- **Minimum:** 3 hours

#### 5. White-Label Mobile App
- **Setup:** Rp 15,000,000 (one-time)
- **Maintenance:** Rp 1,500K/month

---

## 💡 Pricing Strategy Notes

### **Psychological Pricing**
- Starter: Rp 299K (under 300K barrier)
- Pro: Rp 999K (just under 1 million)
- Enterprise: Rp 4,999K (premium positioning)

### **Anchor Pricing**
- Show Pro as "Most Popular" (highlighted)
- Starter = "Entry level"
- Enterprise = "Contact Sales"

### **Free Trial?**
- **7 days free trial** (Pro plan)
- Requires credit card (Midtrans verification)
- Auto-convert to paid after trial
- OR Manual approval (reduce fraud)

### **Annual Discount**
- **Pay yearly, get 2 months free**
- Starter: Rp 2,992K/year (save Rp 596K)
- Pro: Rp 9,990K/year (save Rp 1,998K)
- Enterprise: Rp 49,990K/year (save Rp 9,998K)

### **Refund Policy**
- **30-day money-back guarantee**
- Only if < 10 orders processed
- Prevents abuse from high-volume users

---

## 🎁 Launch Offer (Early Adopters)

### **Founding Members Plan**
- **Price:** Rp 499K/month (locked for 1 year)
- **Features:** Same as Pro plan (Rp 999K value)
- **Limit:** First 100 customers only
- **Bonus:** Free setup + migration assistance

### **Agency/Reseller Program**
- **Discount:** 40% off Enterprise plan
- **Requirement:** Manage 5+ client accounts
- **Benefit:** White-label dashboard
- **Support:** Dedicated agency account manager

---

## 🚀 Implementation Checklist

### **Phase 1: Billing System**
- [ ] Create `plans` table in DB
- [ ] Implement usage tracking (orders count per month)
- [ ] Build payment page for plan subscription
- [ ] Create `subscriptions` table
- [ ] Integrate with Midtrans recurring payment

### **Phase 2: Feature Gating**
- [ ] Middleware to check plan limits
- [ ] UI to show/hide features based on plan
- [ ] Upgrade prompts (hit limits → upgrade CTA)
- [ ] Downgrade flow (data retention policy)

### **Phase 3: Admin Dashboard**
- [ ] Billing page (show usage, next billing date)
- [ ] Invoice generation (PDF)
- [ ] Payment method management
- [ ] Plan change (upgrade/downgrade)
- [ ] Cancel subscription flow

### **Phase 4: Self-Serve Onboarding**
- [ ] Landing page for SaaS product
- [ ] Sign up flow (email verification)
- [ ] Tenant provisioning (auto-create DB schema)
- [ ] First-run wizard (configure Midtrans keys)
- [ ] Welcome email + onboarding guide

---

## 📈 Revenue Projection (Year 1)

**Conservative Scenario:**
- Month 1-3: 10 paying customers = Rp 9,990K/month
- Month 4-6: 30 customers = Rp 29,970K/month
- Month 7-9: 50 customers = Rp 49,950K/month
- Month 10-12: 80 customers = Rp 79,920K/month
- **Year 1 Total: ~Rp 500 Million**

**Aggressive Scenario:**
- Month 1-3: 30 customers = Rp 29,970K/month
- Month 4-6: 80 customers = Rp 79,920K/month
- Month 7-9: 150 customers = Rp 149,850K/month
- Month 10-12: 250 customers = Rp 249,750K/month
- **Year 1 Total: ~Rp 1.5 Billion**

**Break-even Analysis:**
- Development cost: ~Rp 50 Million (1 developer, 2 months)
- Server costs: ~Rp 500K/month
- **Break-even:** 6 months (conservative)

---

## 🎯 Target Customer Segments

### **Primary: Course Creators**
- Indonesian online course market: ~Rp 5 Trillion/year
- Target: Solo creators + small academies
- Pain point: Manual order tracking, no automation
- Solution: All-in-one payment + delivery platform

### **Secondary: Digital Product Sellers**
- E-books, templates, presets, software
- Market: Growing fast with creator economy
- Need: Simple checkout + instant delivery

### **Tertiary: Agencies**
- Manage funnels for clients
- Need: White-label, multi-client dashboard
- High-value customers (Enterprise plan)

---

## 💬 Marketing Messages

### **For Course Creators:**
"Jual course dengan otomatis. Payment, pengiriman materi, semuanya serahkan ke kami."

### **For Agencies:**
"Kelola payment gateway 10 klien Anda dalam 1 dashboard. White-label, full control."

### **For Enterprise:**
"Platform payment digital produk yang scalable. Dari 100 sampai 100,000 orders/hari, tanpa rewrite."

---

## ⚠️ Pricing Validation Needed

**Questions:**
1. Is Rp 999K/month too expensive for Indonesian market?
2. Should we have cheaper "Micro" plan (Rp 149K, 50 orders)?
3. Should we offer lifetime deal (LTD) for early adopters?
4. Should we charge per transaction instead?

**A/B Test Ideas:**
- Free tier (10 orders/month, 5% transaction fee) vs No free tier
- Monthly only vs Monthly + Annual discount
- Per-order pricing vs Flat subscription

---

## 🚦 Ready to Launch?

**YES, if:**
- ✅ Database schema finalized
- ✅ Multi-tenancy implemented
- ✅ Billing system ready
- ✅ Onboarding flow tested
- ✅ Documentation complete

**Timeline to Launch:**
- Phase 1 (Core features): 4 weeks
- Phase 2 (Billing): 2 weeks
- Phase 3 (Testing): 1 week
- Phase 4 (Launch): 1 week
- **Total: 8 weeks** to full SaaS launch

---

## 🎯 Next Steps

**Immediate (This Week):**
1. Set up Supabase database
2. Implement tenant_id in all queries
3. Create tenant provisioning script
4. Build basic admin login

**Short-term (Month 1):**
1. Complete billing system
2. Build settings page (per-tenant config)
3. Implement plan-based feature gating
4. Test multi-tenancy with 2-3 beta users

**Long-term (Month 2-3):**
1. Build self-service onboarding
2. Create marketing landing page
3. Set up analytics (customer LTV, churn)
4. Launch to public

---

**Shall I proceed with implementing the SaaS foundation now?** 🚀
