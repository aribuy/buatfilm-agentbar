interface OrderStatusResponse {
  success: boolean;
  order?: {
    id: string;
    status: string;
    paymentMethod: string;
    createdAt: string;
  };
  message?: string;
}

/**
 * Check payment status for an order
 */
export const checkOrderStatus = async (orderId: string): Promise<OrderStatusResponse> => {
  try {
    const response = await fetch(`https://buatfilm.agentbar.ai/orders/${orderId}/status`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Order status response:', data);
      return {
        success: true,
        order: data.order
      };
    }

    throw new Error(`API error: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('❌ Order status check error:', error);

    return {
      success: false,
      message: `Failed to check order status: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Poll order status until payment is completed or timeout
 * @param orderId Order ID to check
 * @param onPaymentComplete Callback when payment is complete
 * @param maxAttempts Maximum number of polling attempts (default: 60 = 5 minutes)
 * @param interval Polling interval in ms (default: 5000ms = 5 seconds)
 */
export const pollOrderStatus = async (
  orderId: string,
  onPaymentComplete: () => void,
  maxAttempts: number = 60,
  interval: number = 5000
): Promise<void> => {
  let attempts = 0;

  const poll = async (): Promise<void> => {
    attempts++;

    if (attempts > maxAttempts) {
      console.log('⏰ Order status polling timeout');
      return;
    }

    console.log(`🔄 Checking order status... (Attempt ${attempts}/${maxAttempts})`);

    const result = await checkOrderStatus(orderId);

    if (result.success && result.order) {
      const status = result.order.status.toUpperCase();

      if (status === 'PAID' || status === 'SETTLED') {
        console.log('✅ Payment completed!');
        onPaymentComplete();
        return;
      }

      if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
        console.log('❌ Payment failed or expired');
        return;
      }

      // Still pending, continue polling
      setTimeout(poll, interval);
    } else {
      // Error checking status, continue polling
      console.warn('⚠️ Could not check order status, retrying...');
      setTimeout(poll, interval);
    }
  };

  // Start polling
  poll();
};
