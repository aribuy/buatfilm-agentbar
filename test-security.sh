#!/bin/bash
###############################################################################
# SECURITY TEST SUITE - PHASE 1 VERIFICATION
# Duration: 30 minutes
# Downtime: ZERO
###############################################################################

set -e

echo "=================================================="
echo "🔒 SECURITY TEST SUITE"
echo "=================================================="
echo ""
echo "📅 Date: $(date)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL=5
PASSED=0
FAILED=0

echo "=================================================="
echo "Test SEC-001: Invalid Webhook Signature"
echo "=================================================="
echo "Testing webhook rejection of invalid signature..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://buatfilm.agentbar.ai/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "TEST-SEC-001",
    "status_code": "200",
    "gross_amount": "99000",
    "transaction_status": "capture",
    "transaction_id": "TEST-SEC-001-TXN"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
echo ""

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ SEC-001 PASSED${NC} - Invalid webhook correctly rejected"
  ((PASSED++))
else
  echo -e "${RED}❌ SEC-001 FAILED${NC} - Expected 401, got $HTTP_CODE"
  ((FAILED++))
fi
echo ""

echo "=================================================="
echo "Test SEC-002: Valid Webhook Signature"
echo "=================================================="
echo "⚠️  This test requires Midtrans Sandbox manual verification"
echo ""
echo "Steps:"
echo "1. Go to https://simulator.sandbox.midtrans.com/"
echo "2. Create a test transaction"
echo "3. Trigger payment webhook"
echo "4. Check PM2 logs for signature verification"
echo ""
echo "Check logs now? (y/n)"
read -r -n 1 CHECK_LOGS
echo ""

if [[ $CHECK_LOGS =~ ^[Yy]$ ]]; then
  echo "Fetching PM2 logs..."
  ssh buatfilm-server "pm2 logs payment-api --lines 100 --nostream | grep -E '(WEBHOOK|Signature)' | tail -20"
fi

echo -e "${YELLOW}⏸️  SEC-002 SKIPPED${NC} - Requires manual verification via Midtrans Sandbox"
echo ""

echo "=================================================="
echo "Test SEC-003: Health Check - /health"
echo "=================================================="
echo "Testing /health endpoint..."
echo ""

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" https://buatfilm.agentbar.ai/health)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

echo "HTTP Status: $HEALTH_CODE"
echo "Response Body:"
echo "$HEALTH_BODY" | jq '.' 2>/dev/null || echo "$HEALTH_BODY"
echo ""

if [ "$HEALTH_CODE" = "200" ] || [ "$HEALTH_CODE" = "503" ]; then
  echo -e "${GREEN}✅ SEC-003 PASSED${NC} - /health endpoint responding (status $HEALTH_CODE)"
  ((PASSED++))
else
  echo -e "${RED}❌ SEC-003 FAILED${NC} - Unexpected status code: $HEALTH_CODE"
  ((FAILED++))
fi
echo ""

echo "=================================================="
echo "Test SEC-004: Health Check - /health/ready"
echo "=================================================="
echo "Testing /health/ready endpoint..."
echo ""

READY_RESPONSE=$(curl -s -w "\n%{http_code}" https://buatfilm.agentbar.ai/health/ready)
READY_CODE=$(echo "$READY_RESPONSE" | tail -n1)
READY_BODY=$(echo "$READY_RESPONSE" | sed '$d')

echo "HTTP Status: $READY_CODE"
echo "Response Body:"
echo "$READY_BODY" | jq '.' 2>/dev/null || echo "$READY_BODY"
echo ""

if [ "$READY_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SEC-004 PASSED${NC} - /health/ready endpoint working"
  ((PASSED++))
else
  echo -e "${RED}❌ SEC-004 FAILED${NC} - Expected 200, got $READY_CODE"
  ((FAILED++))
fi
echo ""

echo "=================================================="
echo "Test SEC-005: Health Check - /health/live"
echo "=================================================="
echo "Testing /health/live endpoint..."
echo ""

LIVE_RESPONSE=$(curl -s -w "\n%{http_code}" https://buatfilm.agentbar.ai/health/live)
LIVE_CODE=$(echo "$LIVE_RESPONSE" | tail -n1)
LIVE_BODY=$(echo "$LIVE_RESPONSE" | sed '$d')

echo "HTTP Status: $LIVE_CODE"
echo "Response Body:"
echo "$LIVE_BODY" | jq '.' 2>/dev/null || echo "$LIVE_BODY"
echo ""

if [ "$LIVE_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SEC-005 PASSED${NC} - /health/live endpoint working"
  ((PASSED++))
else
  echo -e "${RED}❌ SEC-005 FAILED${NC} - Expected 200, got $LIVE_CODE"
  ((FAILED++))
fi
echo ""

echo "=================================================="
echo "📊 SECURITY TEST SUMMARY"
echo "=================================================="
echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Skipped: $((TOTAL - PASSED - FAILED))${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL SECURITY TESTS PASSED!${NC}"
  echo ""
  echo "Next Steps:"
  echo "1. Execute functional tests: ./test-functional.sh"
  echo "2. Or run full test suite: ./test-all.sh"
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  echo "Please review failures above and fix before proceeding to Phase 2"
fi
echo ""

exit $FAILED
