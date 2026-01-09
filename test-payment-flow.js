/**
 * Automated Browser Test for Payment Flow
 * Uses Puppeteer to automate Chrome browser
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://buatfilm.agentbar.ai';
const SCREENSHOT_DIR = './test-screenshots';
const LOG_FILE = './test-results.log';

// Create screenshots directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Logger function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testPaymentFlow() {
  log('=== Starting Automated Payment Flow Test ===');
  let browser;
  let testData = {
    success: false,
    orderId: null,
    paymentUrl: null,
    error: null
  };

  try {
    log('🚀 Launching Chrome browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true to run in background
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Enable request interception to monitor API calls
    page.on('request', request => {
      log(`📤 Request: ${request.method()} ${request.url()}`);
    });

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/payment/create') || url.includes('/health')) {
        log(`📥 Response: ${response.status()} ${url}`);
        try {
          const data = await response.json();
          log(`   Body: ${JSON.stringify(data, null, 2)}`);
        } catch (e) {
          // Not JSON, ignore
        }
      }
    });

    // Step 1: Navigate to the site
    log('\n📍 Step 1: Navigating to payment page...');
    await page.goto(`${BASE_URL}/test-payment.html`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await delay(2000);

    // Screenshot 1: Initial page load
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '1-initial-load.png'),
      fullPage: true
    });
    log('   ✅ Screenshot saved: 1-initial-load.png');

    // Step 2: Check system health
    log('\n📍 Step 2: Checking system health...');
    try {
      const healthStatus = await page.evaluate(() => {
        const statusDiv = document.querySelector('#healthStatus');
        return statusDiv ? statusDiv.textContent : 'Not found';
      });
      log(`   Health Status: ${healthStatus}`);
    } catch (error) {
      log(`   ⚠️  Could not read health status: ${error.message}`);
    }

    // Step 3: Fill form with test data
    log('\n📍 Step 3: Filling payment form...');
    const orderId = `AUTO-TEST-${Date.now()}`;

    await page.evaluate((id) => {
      document.querySelector('#orderId').value = id;
      document.querySelector('#name').value = 'Automated Test User';
      document.querySelector('#email').value = 'test-automation@example.com';
      document.querySelector('#phone').value = '6281111123456';
      document.querySelector('#amount').value = '149000';
    }, orderId);

    log(`   Order ID: ${orderId}`);
    log(`   Name: Automated Test User`);
    log(`   Email: test-automation@example.com`);
    log(`   Phone: 6281111123456`);
    log(`   Amount: Rp 149.000`);

    await delay(1000);

    // Screenshot 2: Form filled
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '2-form-filled.png'),
      fullPage: true
    });
    log('   ✅ Screenshot saved: 2-form-filled.png');

    // Step 4: Submit form
    log('\n📍 Step 4: Submitting payment form...');
    const submitPromise = page.evaluate(() => {
      return document.querySelector('#paymentForm').dispatchEvent(new Event('submit'));
    });
    await submitPromise;
    await delay(3000);

    // Screenshot 3: After submission
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '3-after-submit.png'),
      fullPage: true
    });
    log('   ✅ Screenshot saved: 3-after-submit.png');

    // Step 5: Check result
    log('\n📍 Step 5: Checking payment result...');
    const result = await page.evaluate(() => {
      const resultDiv = document.querySelector('#result');
      const errorMsg = document.querySelector('#errorMessage');

      if (resultDiv && resultDiv.classList.contains('show')) {
        const token = resultDiv.querySelector('.value:nth-child(3)')?.textContent;
        const paymentLink = resultDiv.querySelector('a[href]')?.href;
        return {
          success: true,
          token: token,
          paymentUrl: paymentLink
        };
      } else if (errorMsg && errorMsg.classList.contains('show')) {
        return {
          success: false,
          error: errorMsg.textContent
        };
      }
      return { success: false, error: 'No result shown' };
    });

    if (result.success) {
      log('   ✅ Payment created successfully!');
      log(`   Token: ${result.token}`);
      log(`   Payment URL: ${result.paymentUrl}`);

      testData = {
        success: true,
        orderId: orderId,
        paymentUrl: result.paymentUrl
      };

      // Step 6: Navigate to Midtrans
      log('\n📍 Step 6: Opening Midtrans payment page...');
      const midtransPage = await browser.newPage();
      await midtransPage.goto(result.paymentUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await delay(3000);

      // Screenshot 4: Midtrans page
      await midtransPage.screenshot({
        path: path.join(SCREENSHOT_DIR, '4-midtrans-page.png'),
        fullPage: true
      });
      log('   ✅ Screenshot saved: 4-midtrans-page.png');

      // Check payment methods visible
      const paymentMethods = await midtransPage.evaluate(() => {
        const methods = [];
        const elements = document.querySelectorAll('[class*="payment"], [class*="bank"]');
        elements.forEach(el => {
          const text = el.textContent.trim();
          if (text && text.length < 50) {
            methods.push(text);
          }
        });
        return methods;
      });

      log(`   Available payment methods: ${paymentMethods.length} found`);

      // Try to find and click BCA
      log('\n📍 Step 7: Looking for BCA payment option...');
      try {
        // Try multiple selectors for BCA
        const bcaSelectors = [
          'text/BCA',
          '[class*="bca"]',
          '[class*="BCA"]',
          'button:has-text("BCA")',
          'div:has-text("BCA")'
        ];

        let bcaFound = false;
        for (const selector of bcaSelectors) {
          try {
            const element = await midtransPage.$(selector);
            if (element) {
              log(`   Found BCA with selector: ${selector}`);
              bcaFound = true;
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        if (bcaFound) {
          log('   ✅ BCA payment option is available');

          // Screenshot before clicking
          await midtransPage.screenshot({
            path: path.join(SCREENSHOT_DIR, '5-bca-found.png'),
            fullPage: true
          });
          log('   ✅ Screenshot saved: 5-bca-found.png');

        } else {
          log('   ⚠️  BCA option not clearly visible, but page loaded');
        }
      } catch (error) {
        log(`   ⚠️  Error finding BCA: ${error.message}`);
      }

      await midtransPage.close();

    } else {
      log(`   ❌ Payment creation failed: ${result.error}`);
      testData = {
        success: false,
        error: result.error
      };
    }

    // Final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '6-final-state.png'),
      fullPage: true
    });
    log('   ✅ Screenshot saved: 6-final-state.png');

    log('\n✅ Test completed!');
    log(`   Screenshots saved to: ${SCREENSHOT_DIR}/`);
    log(`   Log file: ${LOG_FILE}`);

  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`);
    log(error.stack);
    testData.error = error.message;
  } finally {
    if (browser) {
      log('\n🔄 Keeping browser open for 10 seconds for inspection...');
      await delay(10000);
      await browser.close();
      log('   Browser closed');
    }
  }

  // Write final results
  const resultsPath = './test-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(testData, null, 2));
  log(`\n📊 Test results saved to: ${resultsPath}`);

  log('\n=== Test Summary ===');
  log(`Success: ${testData.success ? '✅ YES' : '❌ NO'}`);
  if (testData.success) {
    log(`Order ID: ${testData.orderId}`);
    log(`Payment URL: ${testData.paymentUrl}`);
  } else if (testData.error) {
    log(`Error: ${testData.error}`);
  }

  return testData;
}

// Run the test
if (require.main === module) {
  testPaymentFlow()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testPaymentFlow };
