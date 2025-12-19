import React, { useState, useEffect } from 'react';

interface PricingProps {
  onOrderClick: () => void;
}

const Pricing: React.FC<PricingProps> = ({ onOrderClick }) => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59
  });
  
  const [slotsLeft, setSlotsLeft] = useState(23);
  const [priceAnimation, setPriceAnimation] = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Price animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setPriceAnimation(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Simulate slot reduction
  useEffect(() => {
    const interval = setInterval(() => {
      setSlotsLeft(prev => Math.max(1, prev - Math.floor(Math.random() * 2)));
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const benefits = [
    "🎬 5 Modul Lengkap - Naskah hingga Video Jadi",
    "🧠 Studi Kasus Nyata - Proyek Short Movie", 
    "🛠️ Panduan Tools AI Lengkap",
    "🎁 Bonus Template Prompt (Nilai Rp 200k)",
    "💬 Grup Diskusi Eksklusif",
    "📱 Akses Seumur Hidup",
    "🎓 Sertifikat Completion",
    "💰 30 Hari Money Back Guarantee"
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            PENAWARAN SPESIAL
          </h2>
          <p className="text-xl text-gray-300 mb-6">
            Untuk yang serius mau produksi film/video pendek dengan AI
          </p>
          
          {/* Urgency Indicators */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="bg-red-600 text-white px-4 py-2 rounded-full animate-pulse">
              ⚡ Hanya tersisa {slotsLeft} slot!
            </div>
            <div className="bg-orange-600 text-white px-4 py-2 rounded-full">
              🔥 1,247+ orang sudah bergabung
            </div>
          </div>
        </div>

        {/* Main Pricing Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden transform hover:scale-105 transition-all duration-300">
          
          {/* Countdown Timer */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 text-center">
            <h3 className="text-xl font-bold mb-4">⏰ Promo Berakhir Dalam:</h3>
            <div className="flex justify-center space-x-4">
              <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
                <div className="text-2xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</div>
                <div className="text-sm">Jam</div>
              </div>
              <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
                <div className="text-2xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</div>
                <div className="text-sm">Menit</div>
              </div>
              <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
                <div className="text-2xl font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</div>
                <div className="text-sm">Detik</div>
              </div>
            </div>
          </div>

          <div className="p-8">
            
            {/* Price Display */}
            <div className="text-center mb-8">
              <div className="text-gray-500 text-xl line-through mb-2">
                Harga Normal: Rp 199.000
              </div>
              
              <div className={`transform transition-all duration-1000 ${priceAnimation ? 'scale-110' : 'scale-100'}`}>
                <div className="text-5xl md:text-6xl font-bold text-red-600 mb-2">
                  Rp 99.000
                </div>
                <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                  💰 HEMAT 50% - Rp 100.000
                </div>
              </div>
              
              <p className="text-gray-600 mt-4">
                Sekarang kamu bisa belajar bikin film pendek dengan mengikuti semua panduan di kelas ini
              </p>
            </div>

            {/* Benefits List */}
            <div className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Yang Kamu Dapatkan:
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Value Calculation */}
            <div className="bg-blue-50 p-6 rounded-xl mb-8">
              <h4 className="font-bold text-gray-900 mb-3">💎 Total Nilai Jika Beli Terpisah:</h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Course AI Movie Making</span>
                  <span>Rp 150.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Template Prompt Premium</span>
                  <span>Rp 200.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Akses Grup Eksklusif</span>
                  <span>Rp 100.000</span>
                </div>
                <div className="flex justify-between">
                  <span>1-on-1 Mentoring Session</span>
                  <span>Rp 300.000</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Nilai</span>
                  <span>Rp 750.000</span>
                </div>
                <div className="text-center text-green-600 font-bold">
                  Kamu hemat Rp 651.000! 🎉
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button 
              onClick={onOrderClick}
              className="w-full group relative bg-gradient-to-r from-orange-500 to-red-600 text-white text-xl font-bold py-6 px-8 rounded-2xl hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-orange-500/25"
            >
              <span className="flex items-center justify-center">
                <span className="mr-3">🚀</span>
                DAPATKAN AKSES SEKARANG
                <span className="ml-3 group-hover:translate-x-2 transition-transform">→</span>
              </span>
              
              {/* Pulse Animation */}
              <div className="absolute inset-0 bg-orange-400 rounded-2xl animate-ping opacity-20"></div>
            </button>

            {/* Trust Indicators */}
            <div className="mt-6 text-center space-y-2">
              <div className="flex justify-center items-center space-x-4 text-sm text-gray-600">
                <span>🔒 Pembayaran Aman</span>
                <span>💳 Berbagai Metode Payment</span>
                <span>📱 Akses Instant</span>
              </div>
              <p className="text-xs text-gray-500">
                * Garansi 30 hari uang kembali jika tidak puas
              </p>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-12 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h4 className="text-white font-bold mb-4">Apa kata mereka yang sudah bergabung:</h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/20 p-4 rounded-lg">
                <p className="text-white mb-2">"Dalam 2 minggu sudah bisa bikin film AI pertama!"</p>
                <p className="text-gray-300">- Sarah, Content Creator</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <p className="text-white mb-2">"Tools AI-nya game changer banget!"</p>
                <p className="text-gray-300">- Budi, Filmmaker</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <p className="text-white mb-2">"Worth it banget, ROI langsung balik!"</p>
                <p className="text-gray-300">- Maya, Entrepreneur</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;