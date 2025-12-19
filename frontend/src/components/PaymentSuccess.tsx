import React from 'react';
import { Order } from '../utils/orderSystem';

interface PaymentSuccessProps {
  order: Order;
  onClose: () => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ order, onClose }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-8 text-center shadow-2xl">
        
        {/* Success Animation */}
        <div className="mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎉 Pembayaran Berhasil!</h1>
          <p className="text-gray-600">Terima kasih, pembayaran Anda telah dikonfirmasi</p>
        </div>

        {/* Order Details */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="font-bold text-lg">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Dibayar</p>
              <p className="font-bold text-lg text-green-600">Rp {order.totalAmount.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="text-left">
            <p className="font-semibold text-gray-900 mb-2">Kelas Buat Film Pakai AI</p>
            <p className="text-sm text-gray-600">Customer: {order.customerName}</p>
            <p className="text-sm text-gray-600">Email: {order.email}</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-blue-900 mb-3">📚 Langkah Selanjutnya:</h3>
          <div className="text-left space-y-2 text-sm text-blue-800">
            <p>✅ Link akses course telah dikirim ke email Anda</p>
            <p>✅ Cek folder inbox/spam untuk email konfirmasi</p>
            <p>✅ Join grup WhatsApp eksklusif untuk diskusi</p>
            <p>✅ Download materi bonus dan template prompt</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button className="w-full bg-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors">
            📧 Buka Email Course
          </button>
          
          <button className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-blue-700 transition-colors">
            💬 Join Grup WhatsApp
          </button>
          
          <button 
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>

        {/* Support */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Butuh bantuan?</p>
          <div className="flex justify-center space-x-4">
            <a href="https://wa.me/6281234567890" className="text-green-600 font-semibold text-sm">
              📱 WhatsApp Support
            </a>
            <a href="mailto:support@komitdigital.my.id" className="text-blue-600 font-semibold text-sm">
              📧 Email Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;