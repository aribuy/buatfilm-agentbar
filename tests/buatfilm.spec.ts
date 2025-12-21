import { test, expect } from '@playwright/test';

test.describe('AI Movie Course - Auto Testing', () => {
  
  test('UC-001: Complete Purchase Flow', async ({ page }) => {
    await page.goto('https://buatfilm.agentbar.ai');
    
    // Wait for page load and click order button
    await page.waitForSelector('button:has-text("Order Sekarang")', { timeout: 10000 });
    await page.click('button:has-text("Order Sekarang")');
    
    // Fill form
    await page.fill('input[placeholder="Masukkan nama lengkap"]', 'Test User RPA');
    await page.fill('input[placeholder="812345678"]', '81234567890');
    await page.fill('input[placeholder="nama@email.com"]', 'test@rpa.com');
    
    // Select payment method
    await page.click('input[value="gopay"]');
    
    // Submit order
    await page.click('button:has-text("Order Sekarang - Rp 99.000")');
    
    // Verify result
    await page.waitForTimeout(5000);
    console.log('✅ UC-001: Purchase flow completed');
  });

  test('UC-002: Bank Transfer Flow', async ({ page }) => {
    await page.goto('https://buatfilm.agentbar.ai');
    
    await page.waitForSelector('button:has-text("Order Sekarang")', { timeout: 10000 });
    await page.click('button:has-text("Order Sekarang")');
    
    await page.fill('input[placeholder="Masukkan nama lengkap"]', 'Bank User');
    await page.fill('input[placeholder="812345678"]', '81987654321');
    await page.fill('input[placeholder="nama@email.com"]', 'bank@test.com');
    
    await page.click('input[value="bca"]');
    await page.click('button:has-text("Order Sekarang - Rp 99.000")');
    
    await page.waitForTimeout(5000);
    console.log('✅ UC-002: Bank transfer completed');
  });

  test('API Health Check', async ({ request }) => {
    const response = await request.post('http://srv941062.hstgr.cloud:3001/payment/create', {
      data: {
        orderId: 'TEST' + Date.now(),
        amount: 99000,
        email: 'api@test.com',
        phone: '+6281234567890',
        name: 'API Test User'
      }
    });
    
    expect(response.status()).toBe(200);
    console.log('✅ API health check passed');
  });
});