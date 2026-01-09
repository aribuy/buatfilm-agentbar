/**
 * Automated Browser Test for Production Website
 * Tests actual BuatFilm payment flow with BCA
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://buatfilm.agentbar.ai';
const SCREENSHOT_DIR = './test-screenshots';
const LOG_FILE = './test-results.log';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testProductionFlow() {
  log('=== Starting Production Payment Flow Test ===');
  let browser;
  let testData = {
    success: false,
    screenshots: [],
    error: null
  };

  try {
    log('🚀 Launching Chrome browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // Monitor console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        log(`Browser console error: ${msg.text()}`);
      }
    });

    // Monitor API calls
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/payment/create') || url.includes('/health') || url.includes('/api/')) {
        const status = response.status();
        log(`API Response: ${status} ${url.substring(0, 100)}`);
      }
    });

    // Step 1: Navigate to production site
    log('\n📍 Step 1: Navigating to production site...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000); // Wait for React to render

    const screenshot1 = path.join(SCREENSHOT_DIR, '1-homepage.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    log(`   ✅ Screenshot: ${screenshot1}`);
    testData.screenshots.push(screenshot1);

    // Step 2: Look for "Dapatkan Akses Sekarang" button
    log('\n📍 Step 2: Looking for "Dapatkan Akses Sekarang" button...');

    // Try multiple approaches to find the button
    let buttonFound = false;
    const buttonSelectors = [
      'button:contains("Dapatkan Akses")',
      'a:contains("Dapatkan Akses")',
      '[class*="button"]',
      'button[type="button"]',
      'a[href*="order"]',
      'a[href*="payment"]'
    ];

    // Take screenshot of page structure
    const pageStructure = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.map(btn => ({
        tag: btn.tagName,
        text: btn.textContent.trim().substring(0, 50),
        class: btn.className,
        href: btn.href
      }));
    });

    log(`   Found ${pageStructure.length} clickable elements`);
    pageStructure.slice(0, 10).forEach((el, i) => {
      log(`   [${i}] ${el.tag}: "${el.text}" (class: ${el.class || 'none'})`);
    });

    // Look for the button with Indonesian text
    const targetButton = await page.evaluate(() => {
      const allElements = document.querySelectorAll('button, a, div, span');
      for (let el of allElements) {
        const text = el.textContent.trim().toLowerCase();
        if (text.includes('dapatkan') || text.includes('akses') || text.includes('sekarang') || text.includes('beli') || text.includes('order')) {
          return {
            tag: el.tagName,
            text: el.textContent.trim(),
            selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : null
          };
        }
      }
      return null;
    });

    if (targetButton) {
      log(`   Found button: ${targetButton.tag} - "${targetButton.text.substring(0, 50)}"`);
      buttonFound = true;
    } else {
      log('   ⚠️  Button not found with exact text, trying alternatives...');
    }

    const screenshot2 = path.join(SCREENSHOT_DIR, '2-after-search.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    log(`   ✅ Screenshot: ${screenshot2}`);
    testData.screenshots.push(screenshot2);

    // Step 3: Try to click the button
    if (buttonFound) {
      log('\n📍 Step 3: Clicking the button...');

      try {
        // Try clicking with text content
        await page.evaluate(() => {
          const allElements = document.querySelectorAll('button, a, div, span');
          for (let el of allElements) {
            const text = el.textContent.trim().toLowerCase();
            if ((text.includes('dapatkan') && text.includes('akses')) ||
                text.includes('beli sekarang') ||
                text.includes('order sekarang')) {
              el.click();
              return true;
            }
          }
          return false;
        });

        await delay(3000);

        const screenshot3 = path.join(SCREENSHOT_DIR, '3-after-click.png');
        await page.screenshot({ path: screenshot3, fullPage: true });
        log(`   ✅ Screenshot: ${screenshot3}`);
        testData.screenshots.push(screenshot3);

      } catch (error) {
        log(`   ⚠️  Click error: ${error.message}`);
      }
    }

    // Step 4: Look for payment modal/form
    log('\n📍 Step 4: Looking for payment interface...');

    const hasModal = await page.evaluate(() => {
      // Check for any modal or dialog
      const modals = document.querySelectorAll('[role="dialog"], .modal, .popup, [class*="modal"], [class*="popup"]');
      return modals.length > 0;
    });

    if (hasModal) {
      log('   ✅ Modal detected');
    } else {
      log('   ℹ️  No modal visible (might be a different flow)');
    }

    // Check for Midtrans
    const hasMidtrans = await page.evaluate(() => {
      return window.snap || document.querySelector('[src*="midtrans"]');
    });

    if (hasMidtrans) {
      log('   ✅ Midtrans detected on page');
    }

    const screenshot4 = path.join(SCREENSHOT_DIR, '4-payment-interface.png');
    await page.screenshot({ path: screenshot4, fullPage: true });
    log(`   ✅ Screenshot: ${screenshot4}`);
    testData.screenshots.push(screenshot4);

    // Step 5: Direct API test
    log('\n📍 Step 5: Testing payment API directly...');

    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('https://buatfilm.agentbar.ai/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: `PROD-TEST-${Date.now()}`,
            amount: 149000,
            email: 'test@buatfilm.com',
            phone: '6281111123456',
            name: 'Production Test User'
          })
        });
        const data = await response.json();
        return { success: response.ok, status: response.status, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (apiResponse.success) {
      log('   ✅ API call successful!');
      log(`   Payment URL: ${apiResponse.data.paymentUrl}`);
      testData.success = true;
      testData.paymentUrl = apiResponse.data.paymentUrl;

      // Navigate to Midtrans
      log('\n📍 Step 6: Opening Midtrans payment page...');
      const midtransPage = await browser.newPage();
      await midtransPage.goto(apiResponse.data.paymentUrl, { waitUntil: 'networkidle2' });
      await delay(3000);

      const screenshot5 = path.join(SCREENSHOT_DIR, '5-midtrans-payment.png');
      await midtransPage.screenshot({ path: screenshot5, fullPage: true });
      log(`   ✅ Screenshot: ${screenshot5}`);
      testData.screenshots.push(screenshot5);

      // Look for BCA
      log('\n📍 Step 7: Looking for BCA payment option...');

      const bcaFound = await midtransPage.evaluate(() => {
        const allText = document.body.innerText;
        return allText.toLowerCase().includes('bca');
      });

      if (bcaFound) {
        log('   ✅ BCA payment option available!');

        const screenshot6 = path.join(SCREENSHOT_DIR, '6-bca-option.png');
        await midtransPage.screenshot({ path: screenshot6, fullPage: true });
        log(`   ✅ Screenshot: ${screenshot6}`);
        testData.screenshots.push(screenshot6);
      }

      await midtransPage.close();
    } else {
      log(`   ❌ API call failed: ${apiResponse.status}`);
      testData.error = apiResponse.error || 'API call failed';
    }

    testData.success = apiResponse.success;

    log('\n✅ Test completed!');
    log(`   Total screenshots: ${testData.screenshots.length}`);

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`);
    testData.error = error.message;
  } finally {
    if (browser) {
      await delay(2000);
      await browser.close();
    }
  }

  // Save results
  fs.writeFileSync('./test-results.json', JSON.stringify(testData, null, 2));

  log('\n=== Test Summary ===');
  log(`Success: ${testData.success ? '✅ YES' : '❌ NO'}`);
  log(`Screenshots: ${testData.screenshots.length}`);
  if (testData.paymentUrl) {
    log(`Payment URL: ${testData.paymentUrl}`);
  }
  if (testData.error) {
    log(`Error: ${testData.error}`);
  }

  return testData;
}

// Run test
if (require.main === module) {
  testProductionFlow()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { testProductionFlow };
