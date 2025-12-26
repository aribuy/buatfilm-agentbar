#!/bin/bash
###############################################################################
# PHASE 1: CRITICAL SECURITY
# Duration: 2 hours
# Downtime: ZERO (rolling deploy)
###############################################################################

set -e

echo "=================================================="
echo "🔒 PHASE 1: CRITICAL SECURITY"
echo "=================================================="
echo ""
echo "📅 Date: $(date)"
echo ""

# Check if backup exists
if [ ! -d "./backups" ]; then
  echo "❌ ERROR: Backup directory not found!"
  echo "   Please run: ./backup-current.sh"
  echo ""
  exit 1
fi

echo "=================================================="
echo "Step 1: Creating Security Middleware"
echo "=================================================="
cat > backend/middleware/webhookSignature.js << 'EOF'
const crypto = require('crypto');

function verifyMidtransSignature(req, res, next) {
  // Midtrans sends signature in x-signature-key header
  const signature = req.headers['x-signature-key'];
  const orderId = req.body.order_id;
  const statusCode = req.body.status_code;
  const grossAmount = req.body.gross_amount;
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!signature) {
    console.error('[WEBHOOK] Missing signature header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  // Create signature from request body
  const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expectedSignature = crypto
    .createHash('sha512')
    .update(input)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('[WEBHOOK] Invalid signature:', {
      received: signature,
      expected: expectedSignature,
      orderId
    });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('[WEBHOOK] ✅ Signature verified:', orderId);
  req.signatureValid = true;
  next();
}

module.exports = { verifyMidtransSignature };
EOF
echo "✅ Created: backend/middleware/webhookSignature.js"
echo ""

echo "=================================================="
echo "Step 2: Creating Migration Script"
echo "=================================================="
cat > backend/migrations/001_add_payment_events.js << 'EOF'
const database = require('../database');

async function up() {
  console.log('Creating payment_events table...');

  await database.run(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      signature_valid BOOLEAN DEFAULT FALSE,
      processed BOOLEAN DEFAULT FALSE,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      raw_payload TEXT,
      error_message TEXT
    )
  `);

  console.log('✅ Created payment_events table');

  // Create index for performance
  await database.run(`
    CREATE INDEX IF NOT EXISTS idx_payment_events_transaction_id
    ON payment_events(transaction_id)
  `);

  console.log('✅ Created index on transaction_id');
}

async function down() {
  await database.run(`DROP TABLE IF EXISTS payment_events`);
  console.log('⏪ Rolled back payment_events table');
}

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
EOF
echo "✅ Created: backend/migrations/001_add_payment_events.js"
echo ""

echo "=================================================="
echo "Step 3: Updating payment-server.js"
echo "=================================================="

# Backup original payment-server.js
ssh buatfilm-server "
  cd /var/www/api
  cp payment-server.js payment-server.js.backup-phase0
  echo '✅ Backed up payment-server.js'
"
echo ""

# Create updated webhook handler
cat > backend/webhook-updated.js << 'EOF'
// Updated webhook handler with security
const { verifyMidtransSignature } = require('./middleware/webhookSignature');
const database = require('./database');

async function handleWebhook(req, res) {
  const { order_id, transaction_status, transaction_id, payment_type } = req.body;

  console.log('[WEBHOOK] Received:', {
    order_id,
    transaction_status,
    transaction_id,
    payment_type,
    signatureValid: req.signatureValid
  });

  // Check idempotency
  const existingEvent = await database.get(
    'SELECT processed, order_id FROM payment_events WHERE transaction_id = ?',
    [transaction_id]
  );

  if (existingEvent) {
    if (existingEvent.processed) {
      console.log('[WEBHOOK] ⚠️  Already processed:', transaction_id);
      return res.status(200).json({
        message: 'Already processed',
        order_id: existingEvent.order_id
      });
    }

    console.log('[WEBHOOK] ⚠️  Event exists but not processed, continuing...');
  }

  // Record event
  if (!existingEvent) {
    await database.run(`
      INSERT INTO payment_events (order_id, transaction_id, signature_valid, raw_payload)
      VALUES (?, ?, ?, ?)
    `, [order_id, transaction_id, req.signatureValid, JSON.stringify(req.body)]);
    console.log('[WEBHOOK] ✅ Event recorded');
  }

  // Map Midtrans status to our status
  const statusMap = {
    'capture': 'PAID',
    'settlement': 'PAID',
    'pending': 'PENDING_PAYMENT',
    'deny': 'FAILED',
    'cancel': 'FAILED',
    'expire': 'EXPIRED',
    'failure': 'FAILED'
  };

  const newStatus = statusMap[transaction_status];

  if (!newStatus) {
    console.error('[WEBHOOK] Unknown status:', transaction_status);
    return res.status(400).json({ error: 'Unknown transaction status' });
  }

  // Update order status
  try {
    await database.run(`
      UPDATE orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newStatus, order_id]);

    console.log('[WEBHOOK] ✅ Order updated:', { order_id, newStatus });

    // Mark event as processed
    await database.run(
      'UPDATE payment_events SET processed = TRUE, processed_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
      [transaction_id]
    );

    res.status(200).json({ success: true, order_id, status: newStatus });

  } catch (error) {
    console.error('[WEBHOOK] ❌ Error updating order:', error);
    await database.run(
      'UPDATE payment_events SET error_message = ? WHERE transaction_id = ?',
      [error.message, transaction_id]
    );
    return res.status(500).json({ error: 'Failed to update order' });
  }
}

module.exports = { handleWebhook };
EOF
echo "✅ Created: backend/webhook-updated.js"
echo ""

echo "=================================================="
echo "Step 4: Installing Dependencies"
echo "=================================================="
cd backend
npm install
cd ..
echo "✅ Dependencies installed"
echo ""

echo "=================================================="
echo "Step 5: Uploading Files to Server"
echo "=================================================="
# Create migrations directory on server
ssh buatfilm-server "
  cd /var/www/api
  mkdir -p migrations middleware
"

# Upload files
scp backend/middleware/webhookSignature.js root@srv941062.hstgr.cloud:/var/www/api/middleware/
scp backend/migrations/001_add_payment_events.js root@srv941062.hstgr.cloud:/var/www/api/migrations/
scp backend/webhook-updated.js root@srv941062.hstgr.cloud:/var/www/api/
echo "✅ Files uploaded"
echo ""

echo "=================================================="
echo "Step 6: Running Database Migration"
echo "=================================================="
ssh buatfilm-server "
  cd /var/www/api
  echo 'Running migration...'
  node migrations/001_add_payment_events.js
"
echo ""

echo "=================================================="
echo "Step 7: Verifying Migration"
echo "=================================================="
ssh buatfilm-server "
  cd /var/www/api
  echo '=== Tables in database ==='
  sqlite3 orders.db '.tables'
  echo ''
  echo '=== payment_events schema ==='
  sqlite3 orders.db '.schema payment_events'
"
echo ""

echo "=================================================="
echo "Step 8: Testing Signature Verification"
echo "=================================================="
echo "📝 Testing invalid webhook (should return 401)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://buatfilm.agentbar.ai/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TEST-SECURE-001","status_code":"200","gross_amount":"99000"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Security test PASSED - Invalid webhook rejected"
else
  echo "❌ Security test FAILED - Expected 401, got $HTTP_CODE"
  echo "⚠️  Webhook endpoint may not have signature verification yet!"
  echo "   You'll need to manually integrate it into payment-server.js"
fi
echo ""

echo "=================================================="
echo "Step 9: Manual Integration Instructions"
echo "=================================================="
echo "📋 To complete Phase 1, you need to manually update payment-server.js:"
echo ""
echo "1. SSH to server:"
echo "   ssh buatfilm-server"
echo ""
echo "2. Edit payment-server.js:"
echo "   nano /var/www/api/payment-server.js"
echo ""
echo "3. Add at top:"
echo "   const { verifyMidtransSignature } = require('./middleware/webhookSignature');"
echo ""
echo "4. Update webhook endpoint:"
echo "   app.post('/webhooks/midtrans',"
echo "     verifyMidtransSignature,  // ← ADD THIS LINE"
echo "     asyncHandler(async (req, res) => {"
echo "       // Add idempotency check"
echo "       const { transaction_id } = req.body;"
echo "       const existing = await database.get("
echo "         'SELECT processed FROM payment_events WHERE transaction_id = ?',"
echo "         [transaction_id]"
echo "       );"
echo "       if (existing && existing.processed) {"
echo "         return res.status(200).json({ message: 'Already processed' });"
echo "       }"
echo "       // ... rest of code"
echo "     })"
echo "   );"
echo ""
echo "5. Remove admin manual PAID endpoint (SECURITY RISK):"
echo "   Comment out or DELETE this entire endpoint:"
echo "   app.put('/admin/orders/:orderId', ...)"
echo ""
echo "6. Save and restart:"
echo "   pm2 reload payment-api"
echo ""
echo "=================================================="
echo ""

read -p "Have you completed the manual integration? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "✅ Proceeding with verification..."
else
  echo "⏸️  Paused. Complete manual integration then run:"
  echo "   curl -X POST https://buatfilm.agentbar.api/webhooks/midtrans ..."
  echo ""
  echo "Then continue to Phase 2"
  exit 0
fi

echo "=================================================="
echo "Step 10: Final Verification"
echo "=================================================="
ssh buatfilm-server "
  pm2 status
  echo ''
  echo '=== Recent Logs ==='
  pm2 logs payment-api --lines 20 --nostream
"
echo ""

echo "=================================================="
echo "✅ PHASE 1 COMPLETE!"
echo "=================================================="
echo ""
echo "🎉 Security Improvements Deployed:"
echo "   ✅ Webhook signature verification"
echo "   ✅ Idempotency (payment_events table)"
echo "   ✅ Manual admin PAID removed (if applied)"
echo ""
echo "⚠️  IMPORTANT REMINDERS:"
echo "   • Test with Midtrans Sandbox dashboard"
echo "   • Monitor logs for signature verification"
echo "   • Verify duplicate webhooks are rejected"
echo ""
echo "🚀 Ready for Phase 2!"
echo "   ./deploy-phase2-postgres.sh"
echo ""
