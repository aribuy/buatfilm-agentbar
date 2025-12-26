#!/bin/bash
###############################################################################
# INTEGRATION TEST SUITE - SYSTEM INTEGRATION VERIFICATION
# Duration: 30 minutes
# Downtime: ZERO
###############################################################################

set -e

echo "=================================================="
echo "🔗 INTEGRATION TEST SUITE"
echo "=================================================="
echo ""
echo "📅 Date: $(date)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Test INT-001: Midtrans Snap Integration"
echo "=================================================="
echo ""
echo "⚠️  This test requires manual verification via frontend"
echo ""
echo "Steps:"
echo "1. Create order via frontend or API"
echo "2. Extract Snap token from response"
echo "3. Open Snap URL: https://app.sandbox.midtrans.com/snap/v1/vtlong/<TOKEN>"
echo "4. Verify payment options display correctly"
echo ""
echo "Have you verified Snap integration? (y/n)"
read -r -n 1 VERIFIED
echo ""

if [[ $VERIFIED =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}✅ INT-001 PASSED${NC} - Midtrans Snap integration verified"
else
  echo -e "${YELLOW}⏸️  INT-001 SKIPPED${NC} - Manual verification required"
fi
echo ""

echo "=================================================="
echo "Test INT-002: Webhook Idempotency"
echo "=================================================="
echo ""
echo "⚠️  This test requires duplicate webhook verification"
echo ""
echo "This test verifies that duplicate webhooks are rejected."
echo ""
echo "Steps:"
echo "1. Make a real payment in Midtrans Sandbox"
echo "2. Note the transaction_id"
echo "3. Check PM2 logs for webhook processing"
echo "4. Verify no duplicate payment_events records"
echo ""
echo "Check PM2 logs now? (y/n)"
read -r -n 1 CHECK_LOGS
echo ""

if [[ $CHECK_LOGS =~ ^[Yy]$ ]]; then
  echo "Fetching PM2 logs for webhook activity..."
  ssh buatfilm-server "pm2 logs payment-api --lines 200 --nostream | grep -E '(WEBHOOK|Already processed)' | tail -20"
  echo ""
  echo "Look for:"
  echo "  • '[WEBHOOK] ✅ Signature verified' - First webhook processed"
  echo "  • '[WEBHOOK] ⚠️  Already processed' - Duplicate webhook rejected"
  echo ""
  echo "Have you seen idempotency working? (y/n)"
  read -r -n 1 IDEMPOTENCY_OK
  echo ""

  if [[ $IDEMPOTENCY_OK =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}✅ INT-002 PASSED${NC} - Idempotency verified"
  else
    echo -e "${YELLOW}⏸️  INT-002 SKIPPED${NC} - Requires real payment for verification"
  fi
else
  echo -e "${YELLOW}⏸️  INT-002 SKIPPED${NC} - Manual verification required"
fi
echo ""

echo "=================================================="
echo "Test INT-003: PM2 Process Stability"
echo "=================================================="
echo ""
echo "Checking PM2 process status..."
echo ""

echo "=== PM2 Status ==="
ssh buatfilm-server "pm2 status"
echo ""

echo "=== PM2 Process Details ==="
ssh buatfilm-server "pm2 describe payment-api"
echo ""

echo "=== PM2 Memory/CPU Usage ==="
STATUS_OUTPUT=$(ssh buatfilm-server "pm2 status --no-daemon | grep payment-api")
if echo "$STATUS_OUTPUT" | grep -q "online"; then
  echo -e "${GREEN}✅ Process is ONLINE${NC}"

  # Check memory
  MEMORY=$(ssh buatfilm-server "pm2 describe payment-api --no-daemon | grep memory | awk '{print \$4}'")
  echo "Memory Usage: $MEMORY"

  # Check restart count
  RESTARTS=$(ssh buatfilm-server "pm2 describe payment-api --no-daemon | grep restart | awk '{print \$4}'")
  echo "Restart Count: $RESTARTS"

  if [ "$RESTARTS" -lt 5 ]; then
    echo -e "${GREEN}✅ INT-003 PASSED${NC} - PM2 process stable"
  else
    echo -e "${YELLOW}⚠️  INT-003 WARNING${NC} - High restart count ($RESTARTS)"
  fi
else
  echo -e "${RED}❌ INT-003 FAILED${NC} - PM2 process not online"
fi
echo ""

echo "=================================================="
echo "Test INT-004: Database Connectivity (if PostgreSQL)"
echo "=================================================="
echo ""

# Check if PostgreSQL is installed
PG_CHECK=$(ssh buatfilm-server "which psql" 2>/dev/null || echo "not_found")

if [ "$PG_CHECK" != "not_found" ]; then
  echo "PostgreSQL detected, checking connection..."

  PG_TEST=$(ssh buatfilm-server "psql -U buatfilm_user -d buatfilm_production -c 'SELECT 1;' 2>&1" || echo "failed")

  if echo "$PG_TEST" | grep -q "1 row"; then
    echo -e "${GREEN}✅ PostgreSQL connection OK${NC}"
  else
    echo -e "${YELLOW}⚠️  PostgreSQL connection issue:${NC}"
    echo "$PG_TEST"
  fi
else
  echo -e "${YELLOW}⏸️  PostgreSQL not yet installed${NC} - Skipping DB test"
  echo "   (Will be tested in Phase 2)"
fi
echo ""

echo "=================================================="
echo "📊 INTEGRATION TEST SUMMARY"
echo "=================================================="
echo ""
echo "Integration tests completed."
echo ""
echo "Key Findings:"
echo "   • PM2 Process Status: Check above"
echo "   • Midtrans Integration: Manual verification required"
echo "   • Idempotency: Requires real payment to verify"
echo "   • Database: PostgreSQL status (if installed)"
echo ""
echo "Next Steps:"
echo "1. Execute load tests: cd tests && ./load-test.sh"
echo "2. Or run full test suite: ./test-all.sh"
echo ""
