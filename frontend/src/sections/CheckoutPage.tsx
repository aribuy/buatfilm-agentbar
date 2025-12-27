import React, { useState } from 'react';
import PaymentInstructions from '../components/PaymentInstructions';

interface FormData {
  name: string;
  phone: string;
  email: string;
  paymentMethod: string;
}

const CheckoutPage: React.FC = () => {
  // Show payment instructions after successful order
  if (showPaymentInstructions && orderData) {
    return (
      <PaymentInstructions
        paymentMethod={orderData.paymentMethod}
        orderData={orderData}
        onClose={() => {
          setShowPaymentInstructions(false);
        }}
      />
    );
  }
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    paymentMethod: 'bca'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);

  const paymentMethods = [
    { id: 'bca', name: 'Bank BCA', logo: 'https://cdn.scalev.id/icons/BCA.png', type: 'bank' },
    { id: 'bsi', name: 'Bank Syariah Indonesia', logo: 'https://cdn.scalev.id/icons/BT_bankbsi.png', type: 'bank' },
    { id: 'bni', name: 'Bank BNI', logo: 'https://cdn.scalev.id/icons/BNI.png', type: 'bank' },
    { id: 'jago', name: 'Bank Jago', logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzAwNzNFNiIvPgo8dGV4dCB4PSIyNCIgeT0iMjgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5KQUdPPC90ZXh0Pgo8L3N2Zz4K', type: 'bank' },
    { id: 'qris', name: 'QRIS', logo: 'https://cdn.scalev.id/icons/qris.png', type: 'qr' },
    { id: 'gopay', name: 'GoPay', logo: 'https://cdn.scalev.id/icons/gopay.png', type: 'ewallet' },
    { id: 'shopeepay', name: 'ShopeePay', logo: 'https://cdn.scalev.id/icons/shopeepay.png', type: 'ewallet' },
    { id: 'ovo', name: 'OVO', logo: 'https://cdn.scalev.id/icons/ovo.png', type: 'ewallet' },
    { id: 'dana', name: 'DANA', logo: 'https://cdn.scalev.id/icons/dana.png', type: 'ewallet' },
    { id: 'linkaja', name: 'LinkAja', logo: 'https://cdn.scalev.id/icons/linkaja.png', type: 'ewallet' }
  ];

  const bankMethods = paymentMethods.filter(m => m.type === 'bank');
  const ewalletMethods = paymentMethods.filter(m => m.type === 'ewallet');
  const qrMethods = paymentMethods.filter(m => m.type === 'qr');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newOrderData = {
        orderId: `ORDER-${Date.now()}`,
        amount: 99000,
        customerName: formData.name,
        paymentMethod: formData.paymentMethod
      };
      
      setOrderData(newOrderData);
      setShowPaymentInstructions(true);
      
    } catch (error) {
      console.error('Order error:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Lengkapi data untuk mendapatkan akses course</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left: Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
              
              {/* Customer Info */}
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
                    {bankMethods.map((method) => (
                      <label key={method.id} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={formData.paymentMethod === method.id}
                          onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                          className="sr-only"
                        />
                        <img src={method.logo} alt={method.name} className="w-8 h-8 object-contain mr-3" />
                        <span className="text-sm font-medium">{method.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* E-Wallet */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-3">📱 E-Wallet</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {ewalletMethods.map((method) => (
                      <label key={method.id} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={formData.paymentMethod === method.id}
                          onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                          className="sr-only"
                        />
                        <img src={method.logo} alt={method.name} className="w-8 h-8 object-contain mr-3" />
                        <span className="text-sm font-medium">{method.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* QRIS */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">🔲 Scan & Pay</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {qrMethods.map((method) => (
                      <label key={method.id} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={formData.paymentMethod === method.id}
                          onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                          className="sr-only"
                        />
                        <img src={method.logo} alt={method.name} className="w-8 h-8 object-contain mr-3" />
                        <span className="text-sm font-medium">{method.name} - Semua Bank & E-Wallet</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? 'Memproses...' : '🚀 Bayar Sekarang - Rp 99.000'}
              </button>
            </form>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h3 className="text-xl font-bold mb-4">📋 Ringkasan Pesanan</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>AI Movie Maker Course</span>
                  <span className="font-semibold">Rp 99.000</span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">Rp 99.000</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">✅ Yang Anda Dapatkan:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 5 Modul Lengkap</li>
                  <li>• Studi Kasus Nyata</li>
                  <li>• Tools AI Premium</li>
                  <li>• Template Prompt</li>
                  <li>• Grup Eksklusif</li>
                  <li>• Akses Seumur Hidup</li>
                </ul>
              </div>

              <div className="mt-4 text-center">
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                  <span>🔒 Aman</span>
                  <span>⚡ Instan</span>
                  <span>💰 Garansi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;