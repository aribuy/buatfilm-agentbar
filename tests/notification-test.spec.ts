import { test } from '@playwright/test';

test('Test Notifications - Endik', async ({ page, request }) => {
  console.log('🧪 Testing notification system...');
  
  // Test API directly
  const response = await request.post('http://srv941062.hstgr.cloud:3001/payment/create', {
    data: {
      orderId: 'TEST' + Date.now(),
      amount: 99000,
      email: 'endikc@gmail.com',
      phone: '+628118088180',
      name: 'Endik'
    }
  });
  
  const result = await response.json();
  console.log('API Response:', result);
  
  if (result.success) {
    console.log('✅ Order created successfully');
    console.log('📱 WhatsApp notification should be sent to: +628118088180');
    console.log('📧 Email notification should be sent to: endikc@gmail.com');
  } else {
    console.log('❌ Order creation failed:', result.message);
  }
});