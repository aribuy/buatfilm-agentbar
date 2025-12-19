import React, { useState, useEffect } from 'react';

const CountdownBanner: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 43
  });

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

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 px-4 text-center sticky top-0 z-50">
      <div className="flex items-center justify-center space-x-2 text-sm md:text-base">
        <span className="font-bold">⏰ Promo Berakhir Dalam:</span>
        <div className="flex space-x-1">
          <div className="bg-white/20 px-2 py-1 rounded">
            <span className="font-bold">{timeLeft.hours.toString().padStart(2, '0')}</span>
          </div>
          <span>:</span>
          <div className="bg-white/20 px-2 py-1 rounded">
            <span className="font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          </div>
          <span>:</span>
          <div className="bg-white/20 px-2 py-1 rounded">
            <span className="font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownBanner;