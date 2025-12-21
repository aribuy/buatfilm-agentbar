import React from 'react';

interface PaymentInstructionsProps {
  paymentMethod: string;
  orderData: {
    orderId: string;
    amount: number;
    customerName: string;
  };
  onClose: () => void;
}

const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({ 
  paymentMethod, 
  orderData, 
  onClose 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Disalin ke clipboard!');
  };

  const renderQRISInstructions = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-48 h-48 bg-gray-200 mx-auto mb-4 flex items-center justify-center">
          <span className="text-gray-500">QR Code akan muncul di sini</span>
        </div>
        <button className="text-blue-600 underline">Download QR Code</button>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Cara Pembayaran QRIS:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Buka aplikasi e-wallet (GoPay, DANA, OVO, ShopeePay, dll)</li>
          <li>Pilih menu "Scan QR" atau "Bayar"</li>
          <li>Scan QR code di atas</li>
          <li>Konfirmasi pembayaran sebesar {formatCurrency(orderData.amount)}</li>
          <li>Selesaikan pembayaran</li>
        </ol>
      </div>
    </div>
  );

  const renderBankTransferInstructions = () => {
    const bankDetails = {
      bca: { name: 'Bank BCA', account: '5226288510', holder: 'Faisal Heri Setiawan' },
      bsi: { name: 'Bank Syariah Indonesia', account: '5226288510', holder: 'Faisal Heri Setiawan' },
      bni: { name: 'Bank BNI', account: '5226288510', holder: 'Faisal Heri Setiawan' },
      jago: { name: 'Bank Jago', account: '5226288510', holder: 'Faisal Heri Setiawan' }
    };

    const bank = bankDetails[paymentMethod as keyof typeof bankDetails];

    return (
      <div className="space-y-6">
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center">
          <h4 className="font-bold text-lg mb-4">{bank.name}</h4>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">No. Rekening:</span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono font-bold text-lg">{bank.account}</span>
                <button 
                  onClick={() => copyToClipboard(bank.account)}
                  className="text-blue-600 text-sm underline"
                >
                  📋 Salin
                </button>
              </div>
            </div>
            <div>
              <span className="text-gray-600">Atas Nama:</span>
              <div className="font-semibold">{bank.holder}</div>
            </div>
            <div>
              <span className="text-gray-600">Jumlah Transfer:</span>
              <div className="font-bold text-xl text-green-600">{formatCurrency(orderData.amount)}</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Cara Transfer:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Login ke mobile banking atau ATM</li>
            <li>Pilih menu Transfer</li>
            <li>Masukkan nomor rekening: {bank.account}</li>
            <li>Masukkan nominal: {formatCurrency(orderData.amount)}</li>
            <li>Konfirmasi transfer</li>
            <li>Simpan bukti transfer</li>
          </ol>
        </div>
      </div>
    );
  };

  const renderEWalletInstructions = () => {
    const walletNames = {
      gopay: 'GoPay',
      dana: 'DANA', 
      ovo: 'OVO',
      shopeepay: 'ShopeePay',
      linkaja: 'LinkAja'
    };

    return (
      <div className="space-y-6">
        <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
          <h4 className="font-bold text-lg mb-2">Pembayaran {walletNames[paymentMethod as keyof typeof walletNames]}</h4>
          <p className="text-gray-600 mb-4">Anda akan diarahkan ke aplikasi {walletNames[paymentMethod as keyof typeof walletNames]}</p>
          <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold">
            Buka {walletNames[paymentMethod as keyof typeof walletNames]}
          </button>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Langkah Pembayaran:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Klik tombol "Buka {walletNames[paymentMethod as keyof typeof walletNames]}" di atas</li>
            <li>Login ke akun {walletNames[paymentMethod as keyof typeof walletNames]} Anda</li>
            <li>Konfirmasi pembayaran sebesar {formatCurrency(orderData.amount)}</li>
            <li>Masukkan PIN atau verifikasi biometrik</li>
            <li>Pembayaran selesai</li>
          </ol>
        </div>
      </div>
    );
  };

  const renderInstructions = () => {
    if (paymentMethod === 'qris') return renderQRISInstructions();
    if (['gopay', 'dana', 'ovo', 'shopeepay', 'linkaja'].includes(paymentMethod)) {
      return renderEWalletInstructions();
    }
    return renderBankTransferInstructions();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Instruksi Pembayaran</h2>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="mt-2 opacity-90">Order ID: {orderData.orderId}</p>
        </div>

        <div className="p-6">
          {/* Order Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">Detail Pesanan:</h3>
            <div className="flex justify-between items-center">
              <span>Kelas Buat Film Pakai AI</span>
              <span className="font-bold text-green-600">{formatCurrency(orderData.amount)}</span>
            </div>
          </div>

          {/* Payment Instructions */}
          {renderInstructions()}

          {/* Timer */}
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-red-600 font-semibold">
              ⏰ Selesaikan pembayaran dalam 24 jam
            </p>
          </div>

          {/* Contact Info */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-2">
              Butuh bantuan? Hubungi kami:
            </p>
            <div className="flex justify-center space-x-4 text-sm">
              <a href="https://wa.me/6281234567890" className="text-green-600 font-semibold">
                📱 WhatsApp
              </a>
              <a href="mailto:support@komitdigital.my.id" className="text-blue-600 font-semibold">
                📧 Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentInstructions;