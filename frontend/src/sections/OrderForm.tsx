import React, { useState } from 'react';
import PaymentInstructions from '../components/PaymentInstructions';

interface FormData {
  name: string;
  phone: string;
  email: string;
  paymentMethod: string;
}

interface OrderFormProps {
  isVisible: boolean;
  onClose: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ isVisible, onClose }) => {
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
    { 
      id: 'bca', 
      name: 'Bank BCA', 
      logo: 'https://cdn.scalev.id/icons/BCA.png'
    },
    { 
      id: 'bsi', 
      name: 'Bank Syariah Indonesia', 
      logo: 'https://cdn.scalev.id/icons/BT_bankbsi.png'
    },
    { 
      id: 'bni', 
      name: 'Bank BNI', 
      logo: 'https://cdn.scalev.id/icons/BNI.png'
    },
    { 
      id: 'jago', 
      name: 'Bank Jago', 
      logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzAwNzNFNiIvPgo8dGV4dCB4PSIyNCIgeT0iMjgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5KQUdPPC90ZXh0Pgo8L3N2Zz4K'
    },
    { 
      id: 'qris', 
      name: 'QRIS', 
      logo: 'https://cdn.scalev.id/icons/qris.png'
    },
    { 
      id: 'gopay', 
      name: 'GoPay', 
      logo: 'https://cdn.scalev.id/icons/gopay.png'
    },
    { 
      id: 'shopeepay', 
      name: 'ShopeePay', 
      logo: 'https://cdn.scalev.id/icons/shopeepay.png'
    },
    { 
      id: 'ovo', 
      name: 'OVO', 
      logo: 'https://cdn.scalev.id/icons/ovo.png'
    },
    { 
      id: 'dana', 
      name: 'DANA', 
      logo: 'https://cdn.scalev.id/icons/dana.png'
    },
    { 
      id: 'linkaja', 
      name: 'LinkAja', 
      logo: 'https://cdn.scalev.id/icons/linkaja.png'
    }
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nama lengkap wajib diisi';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor WhatsApp wajib diisi';
    } else if (!/^(\+62|62|0)[0-9]{8,13}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Format nomor WhatsApp tidak valid';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', formData);
    
    if (!validateForm()) {
      console.log('Validation failed', errors);
      return;
    }
    
    setIsSubmitting(true);
    console.log('Processing order...');
    
    try {
      // Simulate API call - reduced delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate order data
      const newOrderData = {
        orderId: `ORDER-${Date.now()}`,
        amount: 99000,
        customerName: formData.name,
        paymentMethod: formData.paymentMethod
      };
      
      console.log('Order created:', newOrderData);
      setOrderData(newOrderData);
      setShowPaymentInstructions(true);
      
      // Track conversion event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'purchase', {
          transaction_id: newOrderData.orderId,
          value: 99000,
          currency: 'IDR',
          items: [{
            item_id: 'ai-movie-course',
            item_name: 'AI Movie Maker Course',
            category: 'Course',
            quantity: 1,
            price: 99000
          }]
        });
      }
      
    } catch (error) {
      console.error('Order error:', error);
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isVisible) return null;

  // Show payment instructions after successful order
  if (showPaymentInstructions && orderData) {
    return (
      <PaymentInstructions
        paymentMethod={orderData.paymentMethod}
        orderData={orderData}
        onClose={() => {
          setShowPaymentInstructions(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Lengkapi Data Pemesanan</h2>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="mt-2 opacity-90">Isi form di bawah untuk mendapatkan akses course</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          
          {/* Customer Data */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Lengkapi Data:</h3>
              <div className="flex-1 h-0.5 bg-gray-300 ml-4"></div>
            </div>
            
            {/* Name Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Contoh: Krisdayanti"
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                  errors.name ? 'border-red-500' : 'border-gray-300 focus:border-orange-500'
                }`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Phone Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                No. WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <div className="flex items-center px-3 py-3 bg-gray-100 border-2 border-r-0 border-gray-300 rounded-l-lg">
                  <img src="https://cdn.scalev.id/icons/id.png" alt="ID" className="w-6 h-4 mr-2" />
                  <span className="text-gray-700">+62</span>
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="812345678"
                  className={`flex-1 px-4 py-3 border-2 border-l-0 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.phone ? 'border-red-500' : 'border-gray-300 focus:border-orange-500'
                  }`}
                />
              </div>
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            {/* Email Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Contoh: krisdayanti@gmail.com"
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                  errors.email ? 'border-red-500' : 'border-gray-300 focus:border-orange-500'
                }`}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Metode Pembayaran:</h3>
              <div className="flex-1 h-0.5 bg-gray-300 ml-4"></div>
            </div>
            
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <label 
                  key={method.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                    formData.paymentMethod === method.id 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={formData.paymentMethod === method.id}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                    formData.paymentMethod === method.id 
                      ? 'border-orange-500' 
                      : 'border-gray-300'
                  }`}>
                    {formData.paymentMethod === method.id && (
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <img 
                      src={method.logo} 
                      alt={method.name}
                      className="w-12 h-12 object-contain mr-4"
                    />
                    <span className="font-medium text-gray-900">{method.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="mb-8 p-6 border-2 border-orange-500 rounded-lg bg-orange-50">
            <h4 className="font-bold text-gray-900 mb-4 underline">RINCIAN PESANAN:</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Kelas Buat Film Pakai AI</span>
                <span className="font-semibold">Rp 99.000</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-lg text-orange-600">Rp 99.000</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg transition-all duration-300 ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Memproses Pesanan...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="mr-3">🚀</span>
                Order Sekarang
                <span className="ml-3">→</span>
              </div>
            )}
          </button>

          {/* Trust Indicators */}
          <div className="mt-6 text-center">
            <div className="flex justify-center items-center space-x-4 text-sm text-gray-600 mb-2">
              <span>🔒 Pembayaran Aman</span>
              <span>📱 Akses Instant</span>
              <span>💰 Garansi 30 Hari</span>
            </div>
            <p className="text-xs text-gray-500">
              This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;