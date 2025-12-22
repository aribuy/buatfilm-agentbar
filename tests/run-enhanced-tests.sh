#!/bin/bash

# Enhanced Test Runner with Comprehensive Error Handling
set -e

echo "🚀 Starting Enhanced E2E Testing..."

# Create test results directory
mkdir -p test-results

# Function to run tests with retry
run_test_with_retry() {
    local test_file=$1
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        echo "📋 Running $test_file (Attempt $((retry_count + 1))/$max_retries)"
        
        if npx playwright test $test_file --config=playwright.config.enhanced.ts; then
            echo "✅ $test_file passed"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                echo "⚠️ $test_file failed, retrying in 5 seconds..."
                sleep 5
            fi
        fi
    done
    
    echo "❌ $test_file failed after $max_retries attempts"
    return 1
}

# Check if site is accessible
echo "🔍 Checking site accessibility..."
if curl -f -s --max-time 10 https://buatfilm.agentbar.ai > /dev/null; then
    echo "✅ Site is accessible"
else
    echo "⚠️ Site may be down, but continuing with tests..."
fi

# Run enhanced tests
echo "🧪 Running Enhanced E2E Tests..."
run_test_with_retry "enhanced-e2e.spec.ts"

# Run original auto-fill test as backup
echo "🔄 Running Backup Auto-Fill Test..."
run_test_with_retry "auto-fill.spec.ts" || echo "⚠️ Backup test failed but continuing..."

# Generate summary report
echo "📊 Generating Test Summary..."
if [ -f "test-results/results.json" ]; then
    echo "✅ Test results available in test-results/results.json"
else
    echo "⚠️ No test results file found"
fi

# Check for screenshots
screenshot_count=$(find test-results -name "*.png" 2>/dev/null | wc -l)
echo "📸 Screenshots captured: $screenshot_count"

echo "🏁 Enhanced testing completed!"
echo "📋 View detailed report: playwright-report/index.html"