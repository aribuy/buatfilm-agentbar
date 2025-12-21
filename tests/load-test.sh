#!/bin/bash

echo "🚀 Starting Load Test for buatfilm.agentbar.ai"

# Install artillery if not exists
if ! command -v artillery &> /dev/null; then
    echo "Installing Artillery..."
    npm install -g artillery
fi

# Create load test config
cat > load-test.yml << 'EOF'
config:
  target: 'https://buatfilm.agentbar.ai'
  phases:
    - duration: 60
      arrivalRate: 5
    - duration: 120
      arrivalRate: 10
    - duration: 60
      arrivalRate: 20
  processor: "./load-processor.js"

scenarios:
  - name: "Complete Purchase Flow"
    weight: 70
    flow:
      - get:
          url: "/"
      - think: 2
      - post:
          url: "http://srv941062.hstgr.cloud:3001/payment/create"
          json:
            orderId: "LOAD{{ $randomString() }}"
            amount: 99000
            email: "load{{ $randomInt(1, 1000) }}@test.com"
            phone: "+628{{ $randomInt(1000000000, 9999999999) }}"
            name: "Load Test User {{ $randomInt(1, 1000) }}"
  
  - name: "Landing Page Visit"
    weight: 30
    flow:
      - get:
          url: "/"
      - think: 5
EOF

# Create processor
cat > load-processor.js << 'EOF'
module.exports = {
  randomString: function() {
    return Math.random().toString(36).substring(7).toUpperCase();
  },
  randomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};
EOF

echo "📊 Running Load Test..."
artillery run load-test.yml

echo "✅ Load Test Completed!"