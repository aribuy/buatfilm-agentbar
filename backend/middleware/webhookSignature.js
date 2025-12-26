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
