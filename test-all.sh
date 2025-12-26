#!/bin/bash
###############################################################################
# COMPLETE TEST SUITE - END-TO-END VERIFICATION
# Duration: 2.5 hours
# Downtime: ZERO
###############################################################################

set -e

echo "=================================================="
echo "🧪 COMPLETE TEST SUITE - END-TO-END"
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

# Create results directory
RESULTS_DIR="./test-results-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "📁 Results Directory: $RESULTS_DIR"
echo ""

# Phase 1: Security Tests
echo "=================================================="
echo "PHASE 1: SECURITY TESTS (30 min)"
echo "=================================================="
echo ""
./test-security.sh 2>&1 | tee "$RESULTS_DIR/security-tests.log"
echo ""

# Phase 2: Functional Tests
echo "=================================================="
echo "PHASE 2: FUNCTIONAL TESTS (1 hour)"
echo "=================================================="
echo ""
./test-functional.sh 2>&1 | tee "$RESULTS_DIR/functional-tests.log"
echo ""

# Phase 3: Integration Tests
echo "=================================================="
echo "PHASE 3: INTEGRATION TESTS (30 min)"
echo "=================================================="
echo ""
./test-integration.sh 2>&1 | tee "$RESULTS_DIR/integration-tests.log"
echo ""

# Phase 4: Performance Tests
echo "=================================================="
echo "PHASE 4: PERFORMANCE TESTS (30 min)"
echo "=================================================="
echo ""
echo "⚠️  Load test execution required"
echo ""
echo "Execute load tests now? (y/n)"
read -r -n 1 EXECUTE_LOAD
echo ""

if [[ $EXECUTE_LOAD =~ ^[Yy]$ ]]; then
  cd tests
  ./load-test.sh 2>&1 | tee "../$RESULTS_DIR/load-tests.log"
  cd ..
  echo ""
else
  echo "⏸️  Load tests skipped"
  echo ""
fi

# Final Summary
echo "=================================================="
echo "📊 FINAL TEST SUMMARY"
echo "=================================================="
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""
echo "Test Logs:"
echo "  • security-tests.log"
echo "  • functional-tests.log"
echo "  • integration-tests.log"
echo "  • load-tests.log"
echo ""

echo "PM2 Status:"
ssh buatfilm-server "pm2 status"
echo ""

echo "PM2 Logs (Last 20 lines):"
ssh buatfilm-server "pm2 logs payment-api --lines 20 --nostream"
echo ""

echo "=================================================="
echo "✅ TEST SUITE COMPLETE!"
echo "=================================================="
echo ""
echo "Next Steps:"
echo "1. Review all logs in $RESULTS_DIR"
echo "2. Check Playwright report: cd tests && npx playwright show-report"
echo "3. Fix any critical failures before Phase 2"
echo "4. Create GitHub issues for failed tests"
echo ""
echo "Documentation:"
echo "  • Full Test Plan: E2E-TESTING-PLAN-GPT.md"
echo "  • Issue Template: See section in E2E-TESTING-PLAN-GPT.md"
echo ""
