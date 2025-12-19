# AI Movie Maker Course - Integrated Version

## 🎬 Buat Film Pakai AI - Course Platform

Platform pembelajaran lengkap untuk membuat film menggunakan AI tools.

### 🚀 Production URL
- **Frontend**: https://buatfilm.agentbar.ai
- **Backend API**: https://api.agentbar.ai

### 🛠️ Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Payment**: Xendit + Midtrans
- **Database**: MongoDB/PostgreSQL

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
VITE_XENDIT_PUBLIC_KEY=your_xendit_public_key
VITE_MIDTRANS_CLIENT_KEY=your_midtrans_client_key
```