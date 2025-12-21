import { test } from '@playwright/test';

test('Manual Test - Endik Data', async ({ page }) => {
  console.log('🚀 Starting manual test with Endik data...');
  
  // Go to website
  await page.goto('https://buatfilm.agentbar.ai');
  console.log('✅ Website loaded');
  
  // Take screenshot
  await page.screenshot({ path: 'manual-test.png', fullPage: true });
  console.log('📸 Screenshot taken');
  
  // Wait for user interaction
  console.log('⏳ Waiting 30 seconds for manual interaction...');
  console.log('📝 Please manually:');
  console.log('   1. Click Order button');
  console.log('   2. Fill: Nama = Endik');
  console.log('   3. Fill: Phone = 08118088180');
  console.log('   4. Fill: Email = endikc@gmail.com');
  console.log('   5. Select payment method');
  console.log('   6. Submit order');
  
  await page.waitForTimeout(30000);
  
  // Final screenshot
  await page.screenshot({ path: 'manual-test-final.png', fullPage: true });
  console.log('✅ Manual test completed');
});