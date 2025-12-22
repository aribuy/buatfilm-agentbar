export const testConfig = {
  environments: {
    local: 'http://localhost:3001',
    production: 'https://buatfilm.agentbar.ai'
  },
  
  timeouts: {
    short: 5000,
    medium: 15000,
    long: 30000
  },
  
  selectors: {
    orderButton: [
      'button:has-text("Order Sekarang")',
      '[data-testid="order-button"]',
      'button[class*="order"]',
      'button:first-of-type'
    ],
    
    nameInput: [
      'input[placeholder*="nama"]',
      'input[name="customerName"]',
      'input[type="text"]:first-of-type'
    ],
    
    phoneInput: [
      'input[placeholder*="812"]',
      'input[name="phone"]',
      'input[type="tel"]'
    ],
    
    emailInput: [
      'input[placeholder*="email"]',
      'input[name="email"]',
      'input[type="email"]'
    ],
    
    paymentMethods: {
      gopay: 'input[value="gopay"]',
      bca: 'input[value="bca"]',
      qris: 'input[value="qris"]'
    },
    
    submitButton: [
      'button[type="submit"]',
      'button:has-text("Order Sekarang")',
      'button:last-of-type'
    ]
  },
  
  testData: {
    users: [
      { name: 'Endik', phone: '08811210687', email: 'aribuy88@gmail.com' },
      { name: 'RPA User', phone: '81234567890', email: 'rpa@test.com' }
    ],
    paymentMethods: ['gopay', 'bca', 'qris'],
    notifications: {
      email: 'endikc@gmail.com',
      whatsapp: '08118088180'
    }
  }
};

export const getBaseUrl = () => testConfig.environments.production;