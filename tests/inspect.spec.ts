import { test, expect } from '@playwright/test';

test('Page Load Test', async ({ page }) => {
  await page.goto('https://buatfilm.agentbar.ai');
  
  // Take screenshot
  await page.screenshot({ path: 'page-screenshot.png' });
  
  // Check page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Get all button texts
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons found:', buttons);
  
  // Get all text containing "order"
  const orderElements = await page.locator('text=/order/i').allTextContents();
  console.log('Order elements:', orderElements);
  
  console.log('✅ Page inspection completed');
});