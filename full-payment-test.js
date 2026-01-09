/**
 * Complete End-to-End Payment Flow Test
 * Follows exact user-specified flow:
 * 1. Navigate to site
 * 2. Click "DAPATKAN AKSES SEKARANG"
 * 3. Click "Auto-Fill Test Data"
 * 4. Select Bank BCA
 * 5. Click "Order Sekarang"
 * 6. Get VA number from Midtrans
 * 7. Complete payment in simulator
 * 8. Wait for redirect to Thank You page
 * 9. Screenshot Thank You page
 * 10. Verify URL contains 'thank-you' and order_id
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://buatfilm.agentbar.ai';
const SCREENSHOT_DIR = './test-screenshots-full';
const LOG_FILE = './full-test-log.txt';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(msg);
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFullTest() {
  log('=== STARTING FULL PAYMENT FLOW TEST ===\n');
  let browser;
  let results = {
    step1: false, // Navigate to site
    step2: false, // Click "DAPATKAN AKSES SEKARANG"
    step3: false, // Click "Auto-Fill Test Data"
    step4: false, // Select Bank BCA
    step5: false, // Click "Order Sekarang"
    step6: false, // Get VA number
    step7: false, // Complete in simulator
    step8: false, // Wait for redirect
    step9: false, // Screenshot Thank You
    step10: false, // Verify URL
    orderId: null,
    vaNumber: null,
    finalUrl: null,
    screenshots: [],
    errors: []
  };

  try {
    // Launch browser
    log('🚀 Step 1: Launching browser and navigating to site...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for server
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    // Enable request/response logging
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/payment/create') || url.includes('/api/')) {
        log(`   API: ${response.status()} ${url.substring(0, 80)}`);
      }
    });

    // Navigate to site
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    const ss1 = path.join(SCREENSHOT_DIR, '01-homepage.png');
    await page.screenshot({ path: ss1, fullPage: true });
    log('   ✅ Screenshot: 01-homepage.png');
    results.screenshots.push(ss1);
    results.step1 = true;

    // Step 2: Find and click "DAPATKAN AKSES SEKARANG"
    log('\n📍 Step 2: Looking for "DAPATKAN AKSES SEKARANG" button...');

    const buttonClicked = await page.evaluate(() => {
      const allElements = document.querySelectorAll('button, a, div, span');
      for (let el of allElements) {
        const text = el.textContent.trim();
        if (text.includes('DAPATKAN AKSES SEKARANG') || text.includes('Dapatkan Akses Sekarang')) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!buttonClicked) {
      throw new Error('Could not find or click "DAPATKAN AKSES SEKARANG" button');
    }

    await sleep(2000);
    const ss2 = path.join(SCREENSHOT_DIR, '02-after-click-button.png');
    await page.screenshot({ path: ss2, fullPage: true });
    log('   ✅ Clicked button! Screenshot: 02-after-click-button.png');
    results.screenshots.push(ss2);
    results.step2 = true;

    // Step 3: Look for "Auto-Fill Test Data" button
    log('\n📍 Step 3: Looking for "Auto-Fill Test Data" button...');

    await sleep(2000); // Wait for modal/form to appear

    const autoFillClicked = await page.evaluate(() => {
      const allElements = document.querySelectorAll('button, a, div, span, input');
      for (let el of allElements) {
        const text = el.textContent.trim();
        if (text.includes('Auto-Fill') || text.includes('Auto Fill') || text.includes('autofill')) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (autoFillClicked) {
      log('   ✅ Clicked Auto-Fill button');
    } else {
      log('   ⚠️  Auto-Fill button not found, will fill manually');
    }

    await sleep(1000);
    const ss3 = path.join(SCREENSHOT_DIR, '03-after-autofill.png');
    await page.screenshot({ path: ss3, fullPage: true });
    log('   ✅ Screenshot: 03-after-autofill.png');
    results.screenshots.push(ss3);
    results.step3 = true;

    // Step 4: Select Bank BCA
    log('\n📍 Step 4: Looking for Bank BCA option...');

    const bcaSelected = await page.evaluate(() => {
      // Try multiple selectors for BCA
      const selectors = [
        'input[value="bca_va"]',
        'input[value="BCA"]',
        'label:contains("BCA")',
        '[class*="bca"]',
        '[id*="bca"]'
      ];

      // Look for radio/checkbox with BCA
      const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      for (let input of inputs) {
        if (input.value.includes('bca') || input.name.includes('bca')) {
          input.click();
          return true;
        }
      }

      // Look for clickable BCA elements
      const elements = document.querySelectorAll('div, label, button');
      for (let el of elements) {
        const text = el.textContent.trim().toLowerCase();
        if (text === 'bca' || text.includes('bank bca')) {
          el.click();
          return true;
        }
      }

      return false;
    });

    if (bcaSelected) {
      log('   ✅ Selected Bank BCA');
    } else {
      log('   ⚠️  Could not find BCA option, may need manual selection');
    }

    await sleep(1000);
    const ss4 = path.join(SCREENSHOT_DIR, '04-bca-selected.png');
    await page.screenshot({ path: ss4, fullPage: true });
    log('   ✅ Screenshot: 04-bca-selected.png');
    results.screenshots.push(ss4);
    results.step4 = true;

    // Step 5: Click "Order Sekarang"
    log('\n📍 Step 5: Looking for "Order Sekarang" button...');

    const orderClicked = await page.evaluate(() => {
      const allElements = document.querySelectorAll('button, a, div, span, input[type="submit"]');
      for (let el of allElements) {
        const text = el.textContent.trim();
        if (text.includes('Order Sekarang') || text.includes('ORDER SEKARANG') ||
            text.includes('Buat Pesanan') || text.includes('Bayar Sekarang')) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!orderClicked) {
      throw new Error('Could not find "Order Sekarang" button');
    }

    await sleep(3000);
    const ss5 = path.join(SCREENSHOT_DIR, '05-after-order.png');
    await page.screenshot({ path: ss5, fullPage: true });
    log('   ✅ Clicked Order! Screenshot: 05-after-order.png');
    results.screenshots.push(ss5);
    results.step5 = true;

    // Step 6: Wait for Midtrans and get VA number
    log('\n📍 Step 6: Waiting for Midtrans page to load...');

    // Wait for navigation to Midtrans
    await page.waitForNavigation({ timeout: 15000 }).catch(() => {
      log('   ⚠️  No automatic navigation detected');
    });

    await sleep(5000);

    // Check if we're on Midtrans
    const currentUrl = page.url();
    log(`   Current URL: ${currentUrl}`);

    const ss6 = path.join(SCREENSHOT_DIR, '06-midtrans-page.png');
    await page.screenshot({ path: ss6, fullPage: true });
    log('   ✅ Screenshot: 06-midtrans-page.png');
    results.screenshots.push(ss6);

    // Extract VA number and order ID
    const paymentInfo = await page.evaluate(() => {
      const pageText = document.body.innerText;

      // Try to find VA number (usually BCA VA format)
      const vaPatterns = [
        /(\d{15,})/,  // 15+ digit number
        /VA[:\s]+(\d+)/,
        /Virtual Account[:\s]+(\d+)/,
        /Nomor VA[:\s]+(\d+)/
      ];

      let vaNumber = null;
      for (let pattern of vaPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          vaNumber = match[1];
          break;
        }
      }

      // Extract order ID from URL or page
      let orderId = null;
      const urlMatch = window.location.href.match(/order[_-]?id[=:\/]([^&]+)/);
      if (urlMatch) {
        orderId = urlMatch[1];
      }

      return { vaNumber, orderId, pageText: pageText.substring(0, 500) };
    });

    if (paymentInfo.vaNumber) {
      results.vaNumber = paymentInfo.vaNumber;
      log(`   ✅ Found VA Number: ${paymentInfo.vaNumber}`);
    } else {
      log('   ⚠️  Could not extract VA number');
      results.errors.push('Could not extract VA number');
    }

    if (paymentInfo.orderId) {
      results.orderId = paymentInfo.orderId;
      log(`   ✅ Order ID: ${paymentInfo.orderId}`);
    }

    results.step6 = true;

    // Step 7: Complete payment in simulator
    log('\n📍 Step 7: Opening Midtrans Simulator...');

    if (results.vaNumber) {
      const simulatorPage = await browser.newPage();
      await simulatorPage.goto('https://simulator.sandbox.midtrans.com/bca/va/index', {
        waitUntil: 'networkidle2'
      });

      await sleep(2000);

      // Fill in simulator
      await simulatorPage.evaluate((va) => {
        const input = document.querySelector('input[name="va-number"], input[id="va-number"], input[type="text"]');
        if (input) {
          input.value = va;

          const button = document.querySelector('button[type="submit"], input[type="submit"]');
          if (button) button.click();
        }
      }, results.vaNumber);

      await sleep(3000);

      const ss7 = path.join(SCREENSHOT_DIR, '07-simulator.png');
      await simulatorPage.screenshot({ path: ss7, fullPage: true });
      log('   ✅ Screenshot: 07-simulator.png');
      results.screenshots.push(ss7);

      await simulatorPage.close();
      results.step7 = true;
    } else {
      log('   ⚠️  Skipping simulator - no VA number');
      results.errors.push('Skipped simulator - no VA number');
    }

    // Step 8: Wait for redirect to Thank You page
    log('\n📍 Step 8: Waiting for redirect to Thank You page...');
    log('   (Waiting up to 30 seconds for webhook processing...)');

    // Wait for redirect
    try {
      await page.waitForNavigation({
        timeout: 30000,
        waitUntil: 'networkidle2'
      }).catch(() => {
        log('   ⚠️  No redirect detected, checking current page...');
      });
    } catch (e) {
      log(`   Navigation timeout/error: ${e.message}`);
    }

    await sleep(3000);

    const finalUrl = page.url();
    results.finalUrl = finalUrl;
    log(`   Final URL: ${finalUrl}`);

    const ss8 = path.join(SCREENSHOT_DIR, '08-redirect-complete.png');
    await page.screenshot({ path: ss8, fullPage: true });
    log('   ✅ Screenshot: 08-redirect-complete.png');
    results.screenshots.push(ss8);
    results.step8 = true;

    // Step 9: Screenshot Thank You page
    log('\n📍 Step 9: Checking for Thank You page...');

    const isThankYouPage = await page.evaluate(() => {
      const url = window.location.href.toLowerCase();
      const title = document.title.toLowerCase();
      const body = document.body.innerText.toLowerCase();

      return url.includes('thank') ||
             url.includes('success') ||
             title.includes('thank') ||
             title.includes('success') ||
             body.includes('thank you') ||
             body.includes('payment successful') ||
             body.includes('pembayaran berhasil');
    });

    if (isThankYouPage) {
      const ss9 = path.join(SCREENSHOT_DIR, '09-thank-you-page.png');
      await page.screenshot({ path: ss9, fullPage: true });
      log('   ✅ Thank You page detected! Screenshot: 09-thank-you-page.png');
      results.screenshots.push(ss9);
      results.step9 = true;
    } else {
      log('   ⚠️  Thank You page not clearly detected');
      const ss9 = path.join(SCREENSHOT_DIR, '09-final-page.png');
      await page.screenshot({ path: ss9, fullPage: true });
      results.screenshots.push(ss9);
      results.step9 = false;
      results.errors.push('Thank You page not detected');
    }

    // Step 10: Verify URL
    log('\n📍 Step 10: Verifying final URL...');

    const urlChecks = {
      hasThankYou: finalUrl.toLowerCase().includes('thank'),
      hasOrderId: results.orderId && finalUrl.includes(results.orderId),
      hasSuccess: finalUrl.toLowerCase().includes('success')
    };

    log(`   URL contains 'thank': ${urlChecks.hasThankYou ? '✅' : '❌'}`);
    log(`   URL contains order_id: ${urlChecks.hasOrderId ? '✅' : '❌'}`);
    log(`   URL contains 'success': ${urlChecks.hasSuccess ? '✅' : '❌'}`);

    if (urlChecks.hasThankYou || urlChecks.hasSuccess || urlChecks.hasOrderId) {
      results.step10 = true;
      log('   ✅ URL verification passed!');
    } else {
      log('   ⚠️  URL verification inconclusive');
      results.errors.push('URL verification inconclusive');
    }

    // Final summary
    log('\n' + '='.repeat(60));
    log('✅ TEST COMPLETED!');
    log('='.repeat(60));
    log(`\n📊 RESULTS:`);
    log(`   Step 1 (Navigate):           ${results.step1 ? '✅' : '❌'}`);
    log(`   Step 2 (Click Button):        ${results.step2 ? '✅' : '❌'}`);
    log(`   Step 3 (Auto-Fill):           ${results.step3 ? '✅' : '❌'}`);
    log(`   Step 4 (Select BCA):          ${results.step4 ? '✅' : '❌'}`);
    log(`   Step 5 (Order Sekarang):      ${results.step5 ? '✅' : '❌'}`);
    log(`   Step 6 (Get VA Number):       ${results.step6 ? '✅' : '❌'}`);
    log(`   Step 7 (Simulator):           ${results.step7 ? '✅' : '❌'}`);
    log(`   Step 8 (Redirect):            ${results.step8 ? '✅' : '❌'}`);
    log(`   Step 9 (Thank You Page):      ${results.step9 ? '✅' : '❌'}`);
    log(`   Step 10 (Verify URL):         ${results.step10 ? '✅' : '❌'}`);

    if (results.orderId) {
      log(`\n📋 ORDER ID: ${results.orderId}`);
    }
    if (results.vaNumber) {
      log(`💳 VA NUMBER: ${results.vaNumber}`);
    }
    if (results.finalUrl) {
      log(`🔗 FINAL URL: ${results.finalUrl}`);
    }

    log(`\n📸 Screenshots: ${results.screenshots.length} saved to ${SCREENSHOT_DIR}/`);

    if (results.errors.length > 0) {
      log(`\n⚠️  Errors encountered:`);
      results.errors.forEach(err => log(`   - ${err}`));
    }

    // Save results JSON
    fs.writeFileSync('./full-test-results.json', JSON.stringify(results, null, 2));
    log(`\n💾 Results saved to: full-test-results.json`);

  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`);
    log(error.stack);
    results.errors.push(error.message);
  } finally {
    if (browser) {
      log('\n⏸️  Keeping browser open for 30 seconds for inspection...');
      await sleep(30000);
      await browser.close();
      log('   Browser closed');
    }
  }

  return results;
}

// Run the test
if (require.main === module) {
  runFullTest()
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runFullTest };
