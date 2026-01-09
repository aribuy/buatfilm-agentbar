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
