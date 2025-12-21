import { test, expect } from '@playwright/test';

test.describe('AI Movie Course - Real Customer Test', () => {
  
  test('Complete Purchase Flow - Endik', async ({ page }) => {
    await page.goto('https://buatfilm.agentbar.ai');
    
    // Wait and scroll to find order button
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Try multiple selectors for order button
    const orderButton = page.locator('button').filter({ hasText: /order|pesan|beli/i }).first();
    await orderButton.scrollIntoViewIfNeeded();
    await orderButton.click();
    
    // Fill customer data
    await page.fill('input[placeholder*="nama"]', 'Endik');
    await page.fill('input[placeholder*="812345678"]', '8118088180');
    await page.fill('input[placeholder*="email"]', 'endikc@gmail.com');
    
    // Select GoPay payment
    await page.click('input[value="gopay"]');
    
    // Submit order
    const submitButton = page.locator('button').filter({ hasText: /order|bayar|submit/i }).last();
    await submitButton.click();
    
    // Wait for result
    await page.waitForTimeout(5000);
    
    console.log('✅ Real customer test completed for Endik');
  });

  test('Bank Transfer Test - Endik', async ({ page }) => {
    await page.goto('https://buatfilm.agentbar.ai');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const orderButton = page.locator('button').filter({ hasText: /order|pesan|beli/i }).first();
    await orderButton.scrollIntoViewIfNeeded();
    await orderButton.click();
    
    await page.fill('input[placeholder*="nama"]', 'Endik');
    await page.fill('input[placeholder*="812345678"]', '8118088180');
    await page.fill('input[placeholder*="email"]', 'endikc@gmail.com');
    
    // Select BCA
    await page.click('input[value="bca"]');
    
    const submitButton = page.locator('button').filter({ hasText: /order|bayar|submit/i }).last();
    await submitButton.click();
    
    await page.waitForTimeout(5000);
    
    console.log('✅ Bank transfer test completed for Endik');
  });
});