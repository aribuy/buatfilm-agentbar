const API_URL = 'http://localhost:3000';

export const createXenditPayment = async (orderData: any) => {
  try {
    const response = await fetch(`${API_URL}/payment/xendit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.orderId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
        method: orderData.method
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Xendit payment error:', error);
    return { success: false, message: 'Network error' };
  }
};

export const createMidtransPayment = async (orderData: any) => {
  try {
    const response = await fetch(`${API_URL}/payment/midtrans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.orderId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Midtrans payment error:', error);
    return { success: false, message: 'Network error' };
  }
};