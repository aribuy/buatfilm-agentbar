#!/bin/bash

echo "🧪 Testing Payment Integration..."

# Test Xendit Payment
echo "📱 Testing Xendit (E-wallet)..."
curl -X POST http://localhost:3000/payment/xendit \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST001",
    "amount": 99000,
    "email": "test@example.com",
    "phone": "+6281234567890",
    "method": "gopay"
  }'

echo -e "\n\n🏦 Testing Midtrans (Bank Transfer)..."
curl -X POST http://localhost:3000/payment/midtrans \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST002",
    "amount": 99000,
    "email": "test@example.com",
    "phone": "+6281234567890"
  }'

echo -e "\n\n✅ Test completed!"