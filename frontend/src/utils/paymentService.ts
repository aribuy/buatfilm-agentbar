export const createPayment = async (orderData: any) => {
  try {
    // Call production API via nginx proxy (HTTPS)
    const response = await fetch('https://buatfilm.agentbar.ai/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.orderId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
        name: orderData.name,
        paymentMethod: orderData.paymentMethod // Send payment method to backend
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Payment API response:', data);

      // Return with redirect URL for Midtrans Snap
      return {
        success: true,
        paymentUrl: data.redirectUrl || data.token, // Midtrans Snap token/URL
        token: data.token,
        message: 'Payment created successfully'
      };
    }

    throw new Error(`API error: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('❌ Payment API error:', error);

    // Return error - don't fallback to demo mode in production
    return {
      success: false,
      paymentUrl: null,
      message: `Failed to create payment: ${error.message}`
    };
  }
};