import React, { useState, useEffect } from 'react';
import PaymentConfirmation from '../components/PaymentConfirmation';
import PaymentInstructions from '../components/PaymentInstructions';
import { generateOrderId, generateOrderToken, generateUniqueCode, calculateTotal, Order, OrderStatus } from '../utils/orderSystem';
import { createPayment } from '../utils/paymentService';
import { pollOrderStatus } from '../utils/orderService';

interface FormData {
  name: string;
  phone: string;
  email: string;
  paymentMethod: string;
}

interface IntegratedCheckoutProps {
  onOrderCreated: (order: Order) => void;
  onBack: () => void;
}

const IntegratedCheckout: React.FC<IntegratedCheckoutProps> = ({ onOrderCreated, onBack }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    paymentMethod: 'bca'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [orderData, setOrderData] = useState<Order | null>(null);
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



  const handlePaymentComplete = () => {
    if (orderData) {
      onOrderCreated(orderData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const basePrice = 99000;
      const uniqueCode = generateUniqueCode();
      const now = new Date();

      const order: Order = {
        id: generateOrderId(),
        token: generateOrderToken(),
        customerName: formData.name,
        phone: `+62${formData.phone}`,
        email: formData.email,
        basePrice,
        uniqueCode,
        totalAmount: calculateTotal(basePrice, uniqueCode),
        status: 'pending' as OrderStatus,
        paymentMethod: formData.paymentMethod,
        createdAt: now,
        statusHistory: [
          { status: 'created' as OrderStatus, timestamp: now },
          { status: 'pending' as OrderStatus, timestamp: now }
        ]
      };

      // Create payment
      const paymentData = {
        orderId: order.id,
        amount: order.totalAmount,
        email: order.email,
        phone: order.phone,
        name: order.customerName,
        paymentMethod: formData.paymentMethod // Send selected payment method
      };

      const paymentResult = await createPayment(paymentData);

      if (!paymentResult.success) {
        throw new Error(paymentResult.message || 'Payment creation failed');
      }

      // Store order data AND payment URL
      order.paymentUrl = paymentResult.paymentUrl;
      setOrderData(order);

      // For e-wallets (GoPay, ShopeePay, OVO, DANA, LinkAja) - direct redirect
      const ewalletMethods = ['gopay', 'shopeepay', 'ovo', 'dana', 'linkaja'];
      // For bank transfers - also redirect to Midtrans to see actual VA number
      const bankMethods = ['bca', 'bni', 'bri', 'mandiri', 'bsi', 'jago'];

      if (ewalletMethods.includes(formData.paymentMethod) || bankMethods.includes(formData.paymentMethod)) {
        // Redirect directly to Midtrans payment page to see actual VA/QR number
        window.location.href = paymentResult.paymentUrl;
      } else if (formData.paymentMethod === 'qris') {
        // For QRIS - show custom payment instructions modal with iframe
        setShowPaymentInstructions(true);

        // Start polling for payment status
        pollOrderStatus(order.id, handlePaymentComplete, 60, 5000);

        setIsSubmitting(false);
      } else {
        // Fallback - show custom payment instructions modal
        setShowPaymentInstructions(true);

        // Start polling for payment status
        pollOrderStatus(order.id, handlePaymentComplete, 60, 5000);

        setIsSubmitting(false);
      }

    } catch (error) {
      console.error('Order error:', error);
      alert('Terjadi kesalahan saat membuat pesanan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 py-8">
      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <button 
          onClick={onBack}
          className="text-white hover:text-gray-300 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>
      </div>
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Countdown Timer at Top */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-2xl text-center mb-8">
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
        
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🚀 DAPATKAN AKSES SEKARANG
          </h2>
          <p className="text-xl text-gray-300 mb-6">
            Isi form di bawah untuk mendapatkan akses course
          </p>
          
          {/* Scarcity Indicators */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="bg-red-600 text-white px-4 py-2 rounded-full animate-pulse">
              ⚡ Hanya tersisa 17 slot!
            </div>
            <div className="bg-orange-600 text-white px-4 py-2 rounded-full">
              🔥 1,247+ orang sudah bergabung
            </div>
            <div className="bg-yellow-600 text-white px-4 py-2 rounded-full">
              ⏰ Promo berakhir dalam 23:59:45
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left: Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8">
              
              {/* Customer Data */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">📝 Data Diri</h3>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      name: 'Test Webhook',
                      phone: '81234567890',
                      email: 'webhook@test.com'
                    })}
                    className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    🧪 Auto-Fill Test Data
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nama Lengkap *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Masukkan nama lengkap"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">WhatsApp *</label>
                    <div className="flex">
                      <div className="flex items-center px-3 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                        <span className="text-gray-700">+62</span>
                      </div>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="812345678"
                        className="flex-1 px-4 py-3 border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="nama@email.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">💳 Pilih Metode Pembayaran</h3>
                
                {/* Bank Transfer */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-3">🏦 Bank Transfer</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'bca' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bca"
                        checked={formData.paymentMethod === 'bca'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="https://cdn.scalev.id/icons/BCA.png" alt="Bank BCA" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">Bank BCA</span>
                    </label>
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'bsi' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bsi"
                        checked={formData.paymentMethod === 'bsi'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="https://cdn.scalev.id/icons/BT_bankbsi.png" alt="Bank Syariah Indonesia" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">Bank Syariah Indonesia</span>
                    </label>
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'bni' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bni"
                        checked={formData.paymentMethod === 'bni'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="https://cdn.scalev.id/icons/BNI.png" alt="Bank BNI" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">Bank BNI</span>
                    </label>
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'jago' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="jago"
                        checked={formData.paymentMethod === 'jago'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzAwNzNFNiIvPgo8dGV4dCB4PSIyNCIgeT0iMjgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5KQUdPPC90ZXh0Pgo8L3N2Zz4K" alt="Bank Jago" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">Bank Jago</span>
                    </label>
                  </div>
                </div>

                {/* E-Wallet */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-3">📱 E-Wallet</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'gopay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="gopay"
                        checked={formData.paymentMethod === 'gopay'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="https://cdn.scalev.id/icons/gopay.png" alt="GoPay" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">GoPay</span>
                    </label>
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'shopeepay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="shopeepay"
                        checked={formData.paymentMethod === 'shopeepay'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="https://cdn.scalev.id/icons/shopeepay.png" alt="ShopeePay" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">ShopeePay</span>
                    </label>
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'ovo' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="ovo"
                        checked={formData.paymentMethod === 'ovo'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="https://cdn.scalev.id/icons/ovo.png" alt="OVO" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">OVO</span>
                    </label>
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'dana' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="dana"
                        checked={formData.paymentMethod === 'dana'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="https://cdn.scalev.id/icons/dana.png" alt="DANA" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">DANA</span>
                    </label>
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'linkaja' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="linkaja"
                        checked={formData.paymentMethod === 'linkaja'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="https://cdn.scalev.id/icons/linkaja.png" alt="LinkAja" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">LinkAja</span>
                    </label>
                  </div>
                </div>

                {/* QRIS */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">🔲 Scan & Pay</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'qris' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="qris"
                        checked={formData.paymentMethod === 'qris'}
                        onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        className="sr-only"
                      />
                      <img src="https://cdn.scalev.id/icons/qris.png" alt="QRIS" className="w-8 h-8 object-contain mr-3" />
                      <span className="text-sm font-medium">QRIS - Semua Bank & E-Wallet</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Memproses Pesanan...
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center">
                      <span className="mr-3">🚀</span>
                      Order Sekarang - Rp 99.000
                      <span className="ml-3">→</span>
                    </div>
                    <div className="text-sm mt-1 opacity-90">
                      ⚡ Klaim slot Anda sebelum terlambat!
                    </div>
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4">📋 Ringkasan Pesanan</h3>
              
              <div className="space-y-4">
                <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-3 mb-4">
                  <p className="text-yellow-300 font-semibold text-sm text-center">
                    🔥 HARGA PROMO TERBATAS!
                  </p>
                  <div className="flex justify-between text-xs text-yellow-200 mt-1">
                    <span>Harga Normal:</span>
                    <span className="line-through">Rp 199.000</span>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span>Kelas Buat Film Pakai AI</span>
                  <span className="font-semibold">Rp 99.000</span>
                </div>
                
                <div className="border-t border-white/20 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-orange-400">Rp 99.000</span>
                  </div>
                  <p className="text-green-300 text-sm mt-1">
                    💰 Anda hemat Rp 100.000!
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-500/20 rounded-lg">
                <h4 className="font-semibold text-green-300 mb-2">✅ Yang Anda Dapatkan:</h4>
                <ul className="text-sm text-green-200 space-y-1">
                  <li>• 5 Modul Lengkap</li>
                  <li>• Studi Kasus Nyata</li>
                  <li>• Tools AI Premium</li>
                  <li>• Template Prompt</li>
                  <li>• Grup Eksklusif</li>
                  <li>• Akses Seumur Hidup</li>
                </ul>
              </div>

              <div className="mt-4 text-center">
                <div className="bg-red-500/20 border border-red-400 rounded-lg p-3 mb-4">
                  <p className="text-red-300 font-semibold text-sm">
                    ⚠️ PERINGATAN: Hanya 17 slot tersisa!
                  </p>
                  <p className="text-red-200 text-xs">
                    Setelah slot habis, harga akan naik menjadi Rp 199.000
                  </p>
                </div>
                
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-300">
                  <span>🔒 Pembayaran Aman</span>
                  <span>📱 Akses Instant</span>
                  <span>💰 Garansi 30 Hari</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Payment Instructions Modal */}
      {showPaymentInstructions && orderData && (
        <PaymentInstructions
          paymentMethod={formData.paymentMethod}
          orderData={{
            orderId: orderData.id,
            amount: orderData.totalAmount,
            customerName: orderData.customerName
          }}
          paymentUrl={orderData.paymentUrl}
          onClose={() => setShowPaymentInstructions(false)}
        />
      )}
    </div>
  );
};

export default IntegratedCheckout;// Force rebuild - Fri Dec 26 19:40:19 WIB 2025
