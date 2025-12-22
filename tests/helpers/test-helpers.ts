import { Page, expect } from '@playwright/test';
import { testConfig } from '../config/test-config';

export class TestHelpers {
  constructor(private page: Page) {}

  async smartClick(selectors: string[], timeout = testConfig.timeouts.medium) {
    for (const selector of selectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.click(selector);
        return true;
      } catch (error) {
        continue;
      }
    }
    throw new Error(`Failed to click any selector: ${selectors.join(', ')}`);
  }

  async smartFill(selectors: string[], value: string, timeout = testConfig.timeouts.medium) {
    for (const selector of selectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.fill(selector, value);
        return true;
      } catch (error) {
        continue;
      }
    }
    throw new Error(`Failed to fill any selector: ${selectors.join(', ')}`);
  }

  async waitForPageReady() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForFunction(() => document.readyState === 'complete');
  }

  async retryAction(action: () => Promise<any>, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await action();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.page.waitForTimeout(1000 * Math.pow(2, i));
      }
    }
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/${name}-${Date.now()}.png`, 
      fullPage: true 
    });
  }

  async fillOrderForm(userData: any) {
    await this.smartFill(testConfig.selectors.nameInput, userData.name);
    await this.smartFill(testConfig.selectors.phoneInput, userData.phone);
    await this.smartFill(testConfig.selectors.emailInput, userData.email);
  }

  async selectPaymentMethod(method: string) {
    const selector = testConfig.selectors.paymentMethods[method];
    if (!selector) throw new Error(`Payment method ${method} not found`);
    
    await this.page.waitForSelector(selector, { timeout: testConfig.timeouts.medium });
    await this.page.click(selector);
  }
}