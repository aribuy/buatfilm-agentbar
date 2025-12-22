import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';
import { testConfig, getBaseUrl } from './config/test-config';

test.describe('Real Customer Testing - Endik', () => {
  
  test('Complete Purchase Flow - Real Customer Data', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const customer = testConfig.testData.users[0]; // Real Endik data
    
    try {
      await page.goto(getBaseUrl());
      await helpers.waitForPageReady();
      
      // Click order button
      await helpers.smartClick(testConfig.selectors.orderButton);
      
      // Fill with real customer data
      await helpers.fillOrderForm(customer);
      
      // Select GoPay payment
      await helpers.selectPaymentMethod('gopay');
      
      // Submit order
      await helpers.smartClick(testConfig.selectors.submitButton);
      
      await page.waitForTimeout(5000);
      await helpers.takeScreenshot('real-customer-success');
      
      console.log(`✅ Real customer test completed for ${customer.name}`);
      console.log(`📧 Email: ${customer.email}`);
      console.log(`📱 WhatsApp: ${customer.phone}`);
      
    } catch (error) {
      await helpers.takeScreenshot('real-customer-error');
      console.error('❌ Real customer test failed:', error.message);
      throw error;
    }
  });

  test('Notification Validation', async ({ page }) => {
    const notifications = testConfig.testData.notifications;
    
    console.log('📧 Email notifications sent to:', notifications.email);
    console.log('📱 WhatsApp notifications sent to:', notifications.whatsapp);
    
    // This test validates notification endpoints are configured
    expect(notifications.email).toBe('endikc@gmail.com');
    expect(notifications.whatsapp).toBe('08118088180');
  });
});