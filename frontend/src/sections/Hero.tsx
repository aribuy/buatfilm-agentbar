import React, { useEffect, useState } from 'react';

interface HeroProps {
  onCTAClick: () => void;
}

const Hero: React.FC<HeroProps> = ({ onCTAClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  
  const fullText = "Bikin Film Pendek Berkualitas Hanya dengan AI – Tanpa Kamera, Tanpa Tim";
  
  useEffect(() => {
    setIsVisible(true);
    
    // Typewriter effect
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setTypewriterText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Background Video/Image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        <img 
          src="/api/placeholder/1920/1080" 
          alt="Cinematic background"
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Floating Elements */}
      <div className="absolute inset-0 z-5">
        <div className="floating-element absolute top-20 left-10 w-16 h-16 bg-orange-500/20 rounded-full animate-pulse"></div>
        <div className="floating-element absolute top-40 right-20 w-12 h-12 bg-red-500/20 rounded-full animate-bounce"></div>
        <div className="floating-element absolute bottom-32 left-1/4 w-20 h-20 bg-yellow-500/20 rounded-full animate-ping"></div>
      </div>

      {/* Main Content */}
      <div className={`relative z-20 text-center px-4 max-w-6xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Main Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            {typewriterText}
          </span>
          <span className="animate-pulse">|</span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
          <span className="bg-yellow-200 text-black px-2 py-1 rounded font-semibold">Belajar step-by-step</span> membuat short movie profesional dari rumah dengan tools AI. Cocok untuk pemula tanpa background film
        </p>
        
        {/* Social Proof */}
        <div className="flex flex-wrap justify-center items-center gap-6 mb-8 text-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <span>1,247+ Students</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <span>4.9/5 Rating</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎬</span>
            <span>500+ Films Created</span>
          </div>
        </div>
        
        {/* Price Display */}
        <div className="mb-8">
          <div className="text-gray-400 text-lg line-through mb-2">Rp 199.000</div>
          <div className="text-4xl md:text-5xl font-bold text-white mb-2">
            <span className="text-red-500">Rp 99.000</span>
          </div>
          <div className="text-green-400 font-semibold">Hemat 50% - Promo Terbatas!</div>
        </div>
        
        {/* CTA Button */}
        <button 
          onClick={onCTAClick}
          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-full hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-orange-500/25"
        >
          <span className="mr-3">🚀</span>
          DAPATKAN AKSES SEKARANG
          <span className="ml-3 group-hover:translate-x-1 transition-transform">→</span>
          
          {/* Pulse effect */}
          <div className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-20"></div>
        </button>
        
        {/* Urgency Message */}
        <p className="mt-4 text-sm text-yellow-300 animate-pulse">
          ⚡ Hanya tersisa 23 slot dengan harga promo ini!
        </p>
        
        {/* Video Preview Button */}
        <div className="mt-8">
          <button className="group flex items-center justify-center mx-auto text-white hover:text-orange-400 transition-colors">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mr-4 group-hover:bg-orange-500/30 transition-colors">
              <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
              </svg>
            </div>
            <span className="text-lg">Tonton Preview Course (2 menit)</span>
          </button>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2 animate-bounce"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;