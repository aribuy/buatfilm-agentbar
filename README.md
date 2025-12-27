# AI Movie Maker Course - Integrated Version

## 🎬 Buat Film Pakai AI - Course Platform

Platform pembelajaran lengkap untuk membuat film menggunakan AI tools.

### 🚀 Production URL
- **Frontend**: https://buatfilm.agentbar.ai
- **Backend API**: https://buatfilm.agentbar.ai/api

---

## 🆕 MULTI-TENANT IMPLEMENTATION (December 2025)

**⚠️ IMPORTANT**: Platform is migrating to multi-tenant SaaS architecture!

### Current Status
- ✅ **Backend V2 Code Ready**: Tenant-aware payment server
- ⏳ **Database Setup**: Pending Supabase configuration
- ⏳ **Deployment**: Parallel mode (V1 + V2 running)
- ✅ **Production Safe**: Zero-downtime migration strategy

### Quick Links
- 📖 [Implementation Summary](./IMPLEMENTATION-SUMMARY.md) - Complete overview
- 🔧 [Supabase Setup Guide](./database/SUPABASE-SETUP-GUIDE.md) - Database configuration
- 🏗️ [Multi-Domain Architecture](./docs/MULTI-DOMAIN-ARCHITECTURE.md) - Platform design
- 🔄 [Migration to Tenant System](./database/MIGRATE-TO-TENANT.md) - Step-by-step guide

### What's Changing?
- **Backend**: SQLite → PostgreSQL (Supabase)
- **Architecture**: Single-tenant → Multi-tenant SaaS
- **Config**: Hardcoded → Database-driven per tenant
- **Scalability**: Single product → Unlimited tenants

**Impact**: BuatFilm production remains **STABLE** throughout migration! 🛡️

---

### 🛠️ Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Payment**: Midtrans (Snap UI)
- **Database**: PostgreSQL (production-ready)

### 📦 Development

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### 🔄 Deployment

**Automatic deployment via GitHub Actions:**
1. Push to `main` branch
2. GitHub Actions builds production
3. Deploy to buatfilm.agentbar.ai

### 💳 Payment Integration

**Supported Methods:**
- Bank Transfer (BCA, BSI, BNI, Jago)
- E-Wallet (GoPay, ShopeePay, OVO, DANA, LinkAja)
- QRIS (Universal QR Code)

**Features:**
- Unique order ID generation (DDMMYYXXXXXX)
- 3-digit discount codes
- Real-time payment confirmation
- Webhook integration

### 🎯 Key Features

- **Full Landing Page**: Hero, Problem/Solution, Pricing
- **Integrated Checkout**: Seamless payment flow
- **Eye-catching UI**: Professional design with animations
- **Mobile Responsive**: Optimized for all devices
- **Payment Success**: Complete confirmation flow

### 📱 Port Configuration
- **Development**: Port 3001
- **Production**: buatfilm.agentbar.ai

### 🔧 Environment Variables

```env
VITE_API_URL=https://api.agentbar.ai
VITE_MIDTRANS_CLIENT_KEY=your_midtrans_client_key
```