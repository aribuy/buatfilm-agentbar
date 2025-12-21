import { test } from '@playwright/test';

test('Auto Fill - Endik Data', async ({ page }) => {
  await page.goto('https://buatfilm.agentbar.ai');
  
  // Auto-fill script injection
  await page.addInitScript(() => {
    window.addEventListener('load', () => {
      setTimeout(() => {
        // Find and click order button
        const orderBtn = document.querySelector('button') || 
                        document.querySelector('[class*="order"]') ||
                        document.querySelector('[class*="btn"]');
        if (orderBtn) orderBtn.click();
        
        setTimeout(() => {
          // Auto fill form
          const nameInput = document.querySelector('input[placeholder*="nama"]') ||
                           document.querySelector('input[name*="name"]');
          if (nameInput) nameInput.value = 'Endik';
          
          const phoneInput = document.querySelector('input[placeholder*="812"]') ||
                            document.querySelector('input[type="tel"]');
          if (phoneInput) phoneInput.value = '8118088180';
          
          const emailInput = document.querySelector('input[placeholder*="email"]') ||
                            document.querySelector('input[type="email"]');
          if (emailInput) emailInput.value = 'endikc@gmail.com';
          
          // Select GoPay
          const gopayRadio = document.querySelector('input[value="gopay"]');
          if (gopayRadio) gopayRadio.click();
          
          // Submit after 2 seconds
          setTimeout(() => {
            const submitBtn = document.querySelector('button[type="submit"]') ||
                             document.querySelectorAll('button')[document.querySelectorAll('button').length - 1];
            if (submitBtn) submitBtn.click();
          }, 2000);
          
        }, 1000);
      }, 2000);
    });
  });
  
  // Wait and observe
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'auto-fill-result.png', fullPage: true });
  
  console.log('✅ Auto-fill completed for Endik');
});