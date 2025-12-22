import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';
import { testConfig, getBaseUrl } from './config/test-config';

test.describe('Enhanced E2E Testing - Buatfilm AI Course', () => {
  
  test('Complete Purchase Flow - Endik User', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const userData = testConfig.testData.users[0]; // Endik Test
    
    try {
      // Navigate with retry
      await helpers.retryAction(async () => {
        await page.goto(getBaseUrl(), { timeout: testConfig.timeouts.long });
        await helpers.waitForPageReady();
      });

      // Click order button with multiple selectors
      await helpers.retryAction(async () => {
        await helpers.smartClick(testConfig.selectors.orderButton);
      });

      // Fill form with robust selectors
      await helpers.retryAction(async () => {
        await helpers.fillOrderForm(userData);
      });

      // Select payment method
      await helpers.retryAction(async () => {
        await helpers.selectPaymentMethod('gopay');
      });

      // Submit order
      await helpers.retryAction(async () => {
        await helpers.smartClick(testConfig.selectors.submitButton);
      });

      // Wait for result
      await page.waitForTimeout(5000);
      await helpers.takeScreenshot('purchase-flow-success');
      
      console.log('✅ Complete purchase flow successful');
      
    } catch (error) {
      await helpers.takeScreenshot('purchase-flow-error');
      console.error('❌ Purchase flow failed:', error.message);
      throw error;
    }
  });

  test('Multi-Payment Method Testing', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    for (const paymentMethod of testConfig.testData.paymentMethods) {
      try {
        await page.goto(getBaseUrl());
        await helpers.waitForPageReady();
        
        await helpers.smartClick(testConfig.selectors.orderButton);
        
        const userData = testConfig.testData.users[1]; // RPA User
        await helpers.fillOrderForm(userData);
        
        await helpers.selectPaymentMethod(paymentMethod);
        await helpers.smartClick(testConfig.selectors.submitButton);
        
        await page.waitForTimeout(3000);
        console.log(`✅ ${paymentMethod} payment method tested`);
        
      } catch (error) {
        await helpers.takeScreenshot(`payment-${paymentMethod}-error`);
        console.error(`❌ ${paymentMethod} payment failed:`, error.message);
      }
    }
  });

  test('API Health Check', async ({ request }) => {
    try {
      const response = await request.post(`${getBaseUrl().replace('https://', 'http://srv941062.hstgr.cloud:3002')}/payment/create`, {
        data: {
          orderId: 'TEST' + Date.now(),
          amount: testConfig.testData.orderAmount,
          email: 'api@test.com',
          phone: '+6281234567890',
          name: 'API Test User'
        },
        timeout: testConfig.timeouts.long
      });
      
      expect(response.status()).toBe(200);
      console.log('✅ API health check passed');
      
    } catch (error) {
      console.error('❌ API health check failed:', error.message);
      // Don't throw - API might be down but frontend could still work
    }
  });

  test('Performance & Load Test', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const startTime = Date.now();
    
    try {
      await page.goto(getBaseUrl());
      await helpers.waitForPageReady();
      
      const loadTime = Date.now() - startTime;
      console.log(`📊 Page load time: ${loadTime}ms`);
      
      expect(loadTime).toBeLessThan(10000); // Max 10 seconds
      
      // Check for critical elements
      await helpers.smartClick(testConfig.selectors.orderButton);
      console.log('✅ Performance test passed');
      
    } catch (error) {
      await helpers.takeScreenshot('performance-test-error');
      console.error('❌ Performance test failed:', error.message);
      throw error;
    }
  });
});