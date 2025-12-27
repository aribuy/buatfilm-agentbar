import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface OrderData {
  order_id: string;
  status: string;
  amount: number;
  customerName?: string;
  email?: string;
}

const ThankYou: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const verifyOrder = async () => {
      if (!orderId) {
        setError('Order ID tidak ditemukan');
        setLoading(false);
        return;
      }

      try {
        // Fetch order status from backend
        const response = await fetch(`https://buatfilm.agentbar.ai/orders/${orderId}/status`);

        if (!response.ok) {
          throw new Error('Order tidak ditemukan');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error('Order tidak valid');
        }

        if (data.order.status !== 'PAID') {
          // Redirect to checkout if payment not completed
          navigate('/');
          return;
        }

        setOrderData({
          order_id: data.order.id,
          status: data.order.status,
          amount: data.order.totalAmount || 99000,
          customerName: data.order.customerName,
          email: data.order.email
        });
        setLoading(false);
      } catch (err) {
        console.error('Error verifying order:', err);
        setError('Gagal memverifikasi order. Silakan hubungi support.');
        setLoading(false);
      }
    };

    verifyOrder();
  }, [orderId, navigate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memverifikasi pembayaran...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h1>
          <p className="text-gray-600 mb-6">{error || 'Data order tidak ditemukan'}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Kembali ke Beranda
            </button>
            <a
              href="https://wa.me/6281234567890"
              className="block w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Hubungi WhatsApp Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  const downloadLinks = [
    {
      title: '📚 Modul 1: Pengenalan AI untuk Film Making',
      description: 'Dasar-dasar penggunaan AI tools untuk pembuatan film',
      link: 'https://agentbar.ai/downloads/modul-1-ai-film-intro.pdf'
    },
    {
      title: '🎬 Modul 2: Script Writing dengan AI',
      description: 'Teknik membuat script film yang menarik menggunakan AI',
      link: 'https://agentbar.ai/downloads/modul-2-script-ai.pdf'
    },
    {
      title: '🎨 Modul 3: Visual Generation & Storyboard',
      description: 'Membuat visual dan storyboard dengan AI tools',
      link: 'https://agentbar.ai/downloads/modul-3-visual-ai.pdf'
    },
    {
      title: '🎵 Modul 4: Audio & Voice Over AI',
      description: 'Generate musik dan voice over berkualitas dengan AI',
      link: 'https://agentbar.ai/downloads/modul-4-audio-ai.pdf'
    },
    {
      title: '🎥 Modul 5: Editing & Final Output',
      description: 'Teknik editing lanjutan dan produksi final',
      link: 'https://agentbar.ai/downloads/modul-5-editing-ai.pdf'
    },
    {
      title: '🛠️ Bonus: Premium AI Tools Pack',
      description: 'Kumpulan prompt templates dan AI tools premium',
      link: 'https://agentbar.ai/downloads/bonus-tools-pack.zip'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 text-center">
          <div className="text-green-500 text-7xl mb-4 animate-bounce">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Terima Kasih, {orderData.customerName || 'Sahabat Film'}!
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Pembayaran Anda telah berhasil
          </p>
          <div className="inline-block bg-green-100 text-green-800 px-6 py-3 rounded-full font-semibold">
            Order ID: {orderData.order_id}
          </div>
          <div className="mt-4 text-gray-500">
            Total Pembayaran: <span className="font-bold text-green-600">{formatCurrency(orderData.amount)}</span>
          </div>
        </div>

        {/* Download Section */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">📦 Akses Course</h2>
          <p className="text-gray-600 text-center mb-6">
            Silakan download semua materi course di bawah ini. Akses seumur hidup!
          </p>

          <div className="space-y-4">
            {downloadLinks.map((item, index) => (
              <a
                key={index}
                href={item.link}
                download
                className="block bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-400 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                  <div className="ml-4 bg-blue-600 text-white p-3 rounded-lg group-hover:bg-blue-700 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 <strong>Tips:</strong> Untuk pengalaman terbaik, download modul secara berurutan dari Modul 1 sampai Modul 5.
              Semua file bisa didownload ulang kapan saja.
            </p>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">🚀 Langkah Selanjutnya</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <span className="text-green-500 text-2xl mr-3">✅</span>
              <div>
                <p className="font-semibold text-gray-900">Download semua materi course</p>
                <p className="text-gray-600 text-sm">Klik tombol download di atas untuk setiap modul</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 text-2xl mr-3">✅</span>
              <div>
                <p className="font-semibold text-gray-900">Buka email Anda</p>
                <p className="text-gray-600 text-sm">Kami telah mengirimkan link download ke email {orderData.email}</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 text-2xl mr-3">✅</span>
              <div>
                <p className="font-semibold text-gray-900">Join Grup Eksklusif</p>
                <p className="text-gray-600 text-sm">Link grup telah dikirim ke WhatsApp dan email Anda</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-blue-500 text-2xl mr-3">📺</span>
              <div>
                <p className="font-semibold text-gray-900">Mulai belajar!</p>
                <p className="text-gray-600 text-sm">Ikuti modul dari awal dan praktikkan langsung</p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Butuh Bantuan?</h3>
          <p className="mb-6 opacity-90">
            Tim support kami siap membantu Anda 24/7
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/6281234567890?text=Halo,%20saya%20sudah%20transfer%20untuk%20kelas%20Buat%20Film%20Pakai%20AI.%20Order%20ID:%20${orderData.order_id}"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-600 transition-colors inline-flex items-center justify-center"
            >
              📱 WhatsApp Support
            </a>
            <a
              href="mailto:support@komitdigital.my.id?subject=Help%20-%20Order%20${orderData.order_id}"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
            >
              📧 Email Support
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 Komit Studio. All rights reserved.</p>
          <p className="mt-1">
            Terima kasih telah bergabung dengan <strong>AI Movie Maker Course</strong>! 🎬
          </p>
        </div>

      </div>
    </div>
  );
};

export default ThankYou;
