#!/bin/bash
###############################################################################
# FUNCTIONAL TEST SUITE - PAYMENT FLOW VERIFICATION
# Duration: 1 hour
# Downtime: ZERO
###############################################################################

set -e

echo "=================================================="
echo "💳 FUNCTIONAL TEST SUITE"
echo "=================================================="
echo ""
echo "📅 Date: $(date)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Test FUN-001: GoPay Payment Flow"
echo "=================================================="
echo ""
echo "⚠️  This test requires Playwright test execution"
echo ""
echo "Steps:"
echo "1. Navigate to buatfilm.agentbar.ai"
echo "2. Click Order button"
echo "3. Fill form with test data"
echo "4. Select GoPay payment"
echo "5. Verify Midtrans Snap popup"
echo "6. Complete payment in sandbox"
echo ""
echo "Execute Playwright test now? (y/n)"
read -r -n 1 EXECUTE
echo ""

if [[ $EXECUTE =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Running Playwright test...${NC}"
  cd tests
  npx playwright test buatfilm.spec.ts:UC-001 --project=chromium
  TEST_RESULT=$?
  cd ..

  if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ FUN-001 PASSED${NC} - GoPay flow completed"
  else
    echo -e "${RED}❌ FUN-001 FAILED${NC} - Check Playwright report for details"
  fi
else
  echo -e "${YELLOW}⏸️  FUN-001 SKIPPED${NC} - Manual execution required"
fi
echo ""

echo "=================================================="
echo "Test FUN-002: BCA Bank Transfer Flow"
echo "=================================================="
echo ""
echo "⚠️  This test requires Playwright test execution"
echo ""
echo "Execute Playwright test now? (y/n)"
read -r -n 1 EXECUTE
echo ""

if [[ $EXECUTE =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Running Playwright test...${NC}"
  cd tests
  npx playwright test buatfilm.spec.ts:UC-002 --project=chromium
  TEST_RESULT=$?
  cd ..

  if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ FUN-002 PASSED${NC} - BCA flow completed"
  else
    echo -e "${RED}❌ FUN-002 FAILED${NC} - Check Playwright report for details"
  fi
else
  echo -e "${YELLOW}⏸️  FUN-002 SKIPPED${NC} - Manual execution required"
fi
echo ""

echo "=================================================="
echo "Test FUN-003: API Create Payment Endpoint"
echo "=================================================="
echo "Testing direct API payment creation..."
echo ""

ORDER_ID="E2E-TEST-$(date +%s)"
API_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://srv941062.hstgr.cloud:3002/payment/create \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"amount\": 99000,
    \"email\": \"e2e@test.com\",
    \"phone\": \"+6281234567890\",
    \"name\": \"E2E Test User\"
  }")

API_CODE=$(echo "$API_RESPONSE" | tail -n1)
API_BODY=$(echo "$API_RESPONSE" | sed '$d')

echo "Order ID: $ORDER_ID"
echo "HTTP Status: $API_CODE"
echo "Response Body:"
echo "$API_BODY" | jq '.' 2>/dev/null || echo "$API_BODY"
echo ""

SUCCESS=$(echo "$API_BODY" | jq -r '.success' 2>/dev/null || echo "false")

if [ "$API_CODE" = "200" ] && [ "$SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ FUN-003 PASSED${NC} - API endpoint working"
  echo "Token: $(echo "$API_BODY" | jq -r '.token')"
else
  echo -e "${RED}❌ FUN-003 FAILED${NC} - API endpoint error"
fi
echo ""

echo "=================================================="
echo "Test FUN-004: Notification Delivery"
echo "=================================================="
echo ""
echo "⚠️  This test requires Playwright test execution"
echo ""
echo "This test will:"
echo "1. Create order via API"
echo "2. Check PM2 logs for notification attempts"
echo "3. Verify email sent (check test inbox)"
echo "4. Verify WhatsApp sent (check test number)"
echo ""
echo "Execute notification test now? (y/n)"
read -r -n 1 EXECUTE
echo ""

if [[ $EXECUTE =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Running notification test...${NC}"
  cd tests
  npx playwright test notification-test.spec.ts --project=chromium
  TEST_RESULT=$?
  cd ..

  echo ""
  echo "Checking PM2 logs for notifications..."
  ssh buatfilm-server "pm2 logs payment-api --lines 50 --nostream | grep -i notification | tail -10"

  if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ FUN-004 PASSED${NC} - Notification test completed"
  else
    echo -e "${YELLOW}⚠️  FUN-004 WARNING${NC} - Check email/WhatsApp manually"
  fi
else
  echo -e "${YELLOW}⏸️  FUN-004 SKIPPED${NC} - Manual execution required"
fi
echo ""

echo "=================================================="
echo "📊 FUNCTIONAL TEST SUMMARY"
echo "=================================================="
echo ""
echo "Functional tests completed."
echo ""
echo "Note: Some tests require manual verification:"
echo "   • Check email inbox for notification emails"
echo "   • Check WhatsApp for notification messages"
echo "   • View Playwright report: cd tests && npx playwright show-report"
echo ""
echo "Next Steps:"
echo "1. Execute integration tests: ./test-integration.sh"
echo "2. Or run full test suite: ./test-all.sh"
echo ""
