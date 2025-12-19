import React, { useEffect, useRef, useState } from 'react';

const ProblemSolution: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const problems = [
    {
      icon: "❌",
      text: "Mau bikin film/video tapi bingung mulai dari mana",
      delay: "delay-100"
    },
    {
      icon: "❌", 
      text: "Gak punya kamera mahal atau kru produksi?",
      delay: "delay-200"
    },
    {
      icon: "❌",
      text: "Ide banyak, tapi gak tahu cara visualisasinya?",
      delay: "delay-300"
    },
    {
      icon: "❌",
      text: "Nonton AI-generated film keren di TikTok tapi gak tahu cara bikinnya?",
      delay: "delay-400"
    }
  ];

  const solutions = [
    {
      icon: "🎬",
      title: "5 Modul Lengkap",
      description: "Dari naskah hingga video jadi"
    },
    {
      icon: "🧠", 
      title: "Studi Kasus Nyata",
      description: "Proyek short movie"
    },
    {
      icon: "🛠️",
      title: "Panduan Tools AI",
      description: "Naskah, video, voice over hingga video jadi"
    },
    {
      icon: "🎁",
      title: "Bonus Template Prompt", 
      description: "Siap pakai untuk berbagai genre"
    },
    {
      icon: "💬",
      title: "Grup Diskusi Eksklusif",
      description: "Komunitas pembelajar aktif"
    }
  ];

  return (
    <section ref={sectionRef} className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Problem Section */}
        <div className="mb-20">
          <div className="flex items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Apakah ini yang sering anda hadapi
            </h2>
            <div className="flex-1 h-0.5 bg-gray-300 ml-4"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {problems.map((problem, index) => (
              <div 
                key={index}
                className={`flex items-start space-x-4 p-6 bg-red-50 border-l-4 border-red-500 rounded-lg transform transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'} ${problem.delay}`}
              >
                <div className="text-2xl text-red-500 flex-shrink-0">
                  {problem.icon}
                </div>
                <p className="text-gray-800 leading-relaxed">{problem.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transition */}
        <div className="text-center mb-16">
          <div className={`inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full transform transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-180'}`}>
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          
          <div className={`mt-6 p-6 bg-blue-50 rounded-lg transform transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <p className="text-lg font-semibold text-center text-blue-900">
              Tenang semua itu akan terselesaikan jika anda mengikuti step by step dari
            </p>
            <h3 className="text-3xl font-bold text-blue-600 mt-2">
              AI Movie Maker Program
            </h3>
          </div>
        </div>

        {/* Solution Section */}
        <div>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Kamu akan belajar:
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              <strong>AI Movie Maker Program</strong> adalah kelas online lengkap yang membimbing kamu membuat film pendek menggunakan tools AI terkini — <strong>tanpa ribet, tanpa mahal.</strong>
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {solutions.map((solution, index) => (
              <div 
                key={index}
                className={`group p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl border border-gray-100 transform transition-all duration-700 hover:scale-105 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${600 + index * 100}ms` }}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {solution.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {solution.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {solution.description}
                </p>
                
                {/* Hover effect border */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-200 rounded-xl transition-colors duration-300"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Stories Preview */}
        <div className={`mt-16 text-center transform transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Sudah 1,247+ orang berhasil membuat film AI mereka!
            </h3>
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>500+ Film Diproduksi</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>Rating 4.9/5</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>100% Satisfaction</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;