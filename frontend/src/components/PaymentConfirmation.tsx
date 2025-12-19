import React, { useState } from 'react';
import { Order, bankAccounts } from '../utils/orderSystem';
import PaymentSuccess from './PaymentSuccess';

interface PaymentConfirmationProps {
  order: Order;
  onClose: () => void;
}

const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({ order, onClose }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  
  const bankAccount = bankAccounts[order.paymentMethod as keyof typeof bankAccounts];
  const formatPhone = (phone: string) => phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1***$3');
  
  const isQRPayment = ['qris', 'gopay', 'shopeepay', 'ovo', 'dana', 'linkaja'].includes(order.paymentMethod);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Disalin ke clipboard!');
  };
  
  if (paymentConfirmed) {
    return <PaymentSuccess order={order} onClose={onClose} />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🎉 Instruksi Pembayaran</h2>
              <div className="flex items-center mt-2">
                <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  ⏰ Pending
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
              ×
            </button>
          </div>
          <p className="mt-2 opacity-90">Order ID: {order.id}</p>
        </div>
        
        <div className="bg-white rounded-b-2xl shadow-2xl">

        <div className="p-6">
          {/* Order Info */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Order ID</p>
                <p className="font-bold text-xl text-gray-900">{order.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
                <p className="font-bold text-xl text-gray-900">Rp {order.totalAmount.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {order.createdAt.toLocaleDateString('id-ID', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          <button 
            onClick={() => setShowHistory(true)}
            className="text-blue-600 hover:underline mb-6 font-medium"
          >
            Lihat Riwayat Status Pemesanan
          </button>

          {/* Customer Info */}
          <div className="space-y-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Nama Pemesan</p>
              <p className="font-semibold text-gray-900">{order.customerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">No. Telepon Pemesan</p>
              <p className="font-semibold text-gray-900">{formatPhone(order.phone)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
              <p className="font-semibold text-gray-900">{order.email}</p>
            </div>
          </div>

          {/* Order Details */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">Kelas Buat Film Pakai AI</p>
                  <p className="text-sm text-gray-500">Kuantitas: 1 x Rp {order.basePrice.toLocaleString()}</p>
                </div>
                <p className="font-semibold text-gray-900">Rp {order.basePrice.toLocaleString()}</p>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Kode Unik (Diskon)</span>
                <span className="text-green-600 font-semibold">- Rp {order.uniqueCode}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-lg text-gray-900">Total</span>
                <span className="font-bold text-lg text-gray-900">Rp {order.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="space-y-3 mb-6 bg-red-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Status Pembayaran</span>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">Unpaid</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Metode Pembayaran</span>
              <span className="font-medium text-gray-900">{isQRPayment ? 'QRIS/E-Wallet' : 'Bank Transfer'}</span>
            </div>
          </div>










          {/* Payment Instructions */}
          {isQRPayment ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-64 h-64 bg-white border-4 border-dashed border-blue-300 mx-auto mb-4 flex items-center justify-center rounded-2xl">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center mb-2">
                      <span className="text-4xl">📱</span>
                    </div>
                    <p className="text-gray-600 text-sm">QR Code akan muncul di sini</p>
                  </div>
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                  📥 Download QR Code
                </button>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h4 className="font-semibold mb-3 text-blue-900">📱 Cara Pembayaran {order.paymentMethod.toUpperCase()}:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Buka aplikasi e-wallet (GoPay, DANA, OVO, ShopeePay, dll)</li>
                  <li>Pilih menu "Scan QR" atau "Bayar"</li>
                  <li>Scan QR code di atas</li>
                  <li>Konfirmasi pembayaran sebesar Rp {order.totalAmount.toLocaleString()}</li>
                  <li>Selesaikan pembayaran</li>
                </ol>
              </div>
            </div>
          ) : bankAccount ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-dashed border-green-300 p-6 rounded-2xl">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mr-4 border-2 border-gray-200">
                    <img src={bankAccount.logo} alt={bankAccount.code} className="w-12 h-12 object-contain" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-gray-900">Bank {bankAccount.code}</h4>
                    <p className="text-gray-600">{bankAccount.name}</p>
                  </div>
                </div>
                
                <div className="space-y-3 text-left">
                  <div>
                    <span className="text-gray-600">No. Rekening:</span>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="font-mono font-bold text-2xl text-gray-900">{bankAccount.account}</span>
                      <button 
                        onClick={() => copyToClipboard(bankAccount.account)}
                        className="text-blue-600 text-sm underline hover:text-blue-800"
                      >
                        📋 Salin
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Atas Nama:</span>
                    <div className="font-semibold text-lg text-gray-900">{bankAccount.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Jumlah Transfer:</span>
                    <div className="font-bold text-3xl text-green-600">Rp {order.totalAmount.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                <h4 className="font-semibold mb-3 text-yellow-900">🏦 Cara Transfer:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
                  <li>Login ke mobile banking atau ATM</li>
                  <li>Pilih menu Transfer</li>
                  <li>Masukkan nomor rekening: {bankAccount.account}</li>
                  <li>Masukkan nominal: Rp {order.totalAmount.toLocaleString()}</li>
                  <li>Konfirmasi transfer</li>
                  <li>Simpan bukti transfer</li>
                </ol>
              </div>
            </div>
          ) : null}

          {/* Total Amount to Pay */}
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-sm font-medium text-gray-700 mb-2">Total Nominal Yang Harus Dibayar</p>
            <p className="text-3xl font-bold text-blue-900">Rp {order.totalAmount.toLocaleString()}</p>
          </div>

          {/* Timer */}
          <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-center">
            <p className="text-red-600 font-bold text-lg">
              ⏰ Selesaikan pembayaran dalam 24 jam
            </p>
          </div>

          {/* Contact Info */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-3">
              Butuh bantuan? Hubungi kami:
            </p>
            <div className="flex justify-center space-x-4">
              <button className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center">
                📱 WhatsApp
              </button>
              <button 
                onClick={() => setPaymentConfirmed(true)}
                className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors"
              >
                Konfirmasi Pembayaran
              </button>
              <button 
                onClick={() => setShowHistory(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                📋 Riwayat Status
              </button>
            </div>
          </div>
        </div>

        {/* Status History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-gray-900">📋 Riwayat Status Pemesanan</h3>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Order ID: {order.id}</p>
                  <p className="text-sm text-gray-600">Customer: {order.customerName}</p>
                  <p className="text-sm text-gray-600">Total: Rp {order.totalAmount.toLocaleString()}</p>
                </div>
                {[...order.statusHistory].reverse().map((history, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="text-sm text-gray-600">
                        {history.timestamp.toLocaleDateString('id-ID', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        history.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        history.status === 'created' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {history.status === 'pending' ? 'Pending' : 
                         history.status === 'created' ? 'Created' : history.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;