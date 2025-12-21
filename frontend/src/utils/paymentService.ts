export const createPayment = async (orderData: any) => {
  try {
    // Try real API first
    const response = await fetch('http://srv941062.hstgr.cloud:3002/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.orderId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
        name: orderData.name
      })
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error('API not available');
  } catch (error) {
    // Return fallback without URL for demo
    console.log('Backend not running - showing payment instructions');
    
    return {
      success: true,
      paymentUrl: null, // No URL = show instructions
      message: 'Backend not running - demo mode'
    };
  }
};