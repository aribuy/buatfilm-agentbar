// =====================================================
// PAYMENT SERVER V2 - TENANT-SUPPORTED VERSION
// This version supports multi-tenant architecture
// =====================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');
const ordersRepo = require('./repositories/ordersRepository');
const auth = require('./middleware/auth');
const { resolveTenant } = require('./middleware/tenantResolver');
const { errorHandler, asyncHandler, validateOrder } = require('./middleware/errorHandler');
const { sendWhatsAppMessage, sendSuccessWhatsApp } = require('./services/whatsapp');
const { sendOrderConfirmationEmail, sendPaymentSuccessEmail } = require('./services/email');

const app = express();
app.use(cors());
app.use(express.json());

// =====================================================
// TENANT-SPECIFIC MIDTRANS INSTANCE
// =====================================================

/**
 * Create Midtrans Snap instance for specific tenant
 * @param {Object} tenant - Tenant object with Midtrans config
 * @returns {Object} Midtrans Snap instance
 */
function createMidtransSnap(tenant) {
  return new midtransClient.Snap({
    isProduction: tenant.midtrans_environment === 'production',
    serverKey: tenant.midtrans_server_key,
    clientKey: tenant.midtrans_client_key
  });
}

// =====================================================
// HEALTH CHECK (No tenant required)
// =====================================================

app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    version: '2.0.0',
    database: process.env.DB_NAME || 'not configured',
    timestamp: new Date().toISOString()
  };

  if (req.tenant) {
    health.tenant = req.tenant.slug;
  }

  res.json(health);
});

// =====================================================
// ADMIN ROUTES (Tenant-scoped)
// =====================================================

// Admin login (tenant-scoped)
app.post('/admin/login', resolveTenant, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
    const token = auth.generateToken({
      username,
      role: 'admin',
      tenantId: req.tenantId
    });

    res.json({
      success: true,
      token,
      tenant: {
        id: req.tenant.id,
        name: req.tenant.name,
        slug: req.tenant.slug
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}));

// Get all orders for this tenant (admin only)
app.get('/admin/orders', resolveTenant, auth.verifyToken, auth.adminAuth, asyncHandler(async (req, res) => {
  const orders = await ordersRepo.getAllOrders(req.tenantId);
  res.json({ success: true, orders });
}));

// Get order statistics for this tenant (admin only)
app.get('/admin/stats', resolveTenant, auth.verifyToken, auth.adminAuth, asyncHandler(async (req, res) => {
  const stats = await ordersRepo.getOrderStats(req.tenantId);
  res.json({ success: true, stats });
}));

// Update order status (admin only)
app.put('/admin/orders/:orderId', resolveTenant, auth.verifyToken, auth.adminAuth, asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  await ordersRepo.updateOrderStatus(orderId, status);
  res.json({ success: true, message: 'Order status updated' });
}));

// =====================================================
// PAYMENT ROUTES (Tenant-scoped)
// =====================================================

// Create payment transaction (tenant-scoped)
app.post('/payment/create', resolveTenant, validateOrder, asyncHandler(async (req, res) => {
  try {
    const { orderId, amount, email, phone, name, paymentMethod } = req.body;

    console.log(`[${req.tenantSlug}] Creating payment for order: ${orderId}`);

    // Get tenant-specific Midtrans Snap instance
    const snap = createMidtransSnap(req.tenant);

    // Create transaction with tenant config
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: name,
        email: email,
        phone: phone
      },
      enabled_payments: ['credit_card', 'bca_va', 'bni_va', 'bri_va', 'echannel', 'gopay', 'shopeepay'],
      finish_redirect_url: `https://${req.tenant.slug}.agentbar.ai/thank-you?order_id=${orderId}`
    });

    // Store order with tenant_id
    const order = await ordersRepo.createOrder({
      id: orderId,
      customerName: name,
      email,
      phone,
      amount,
      paymentMethod,
      tenantId: req.tenantId
    });

    console.log(`[${req.tenantSlug}] Order created: ${orderId}`);

    // Send notifications with tenant email config (non-blocking)
    const orderData = {
      id: orderId,
      customerName: name,
      email,
      phone,
      totalAmount: amount,
      paymentUrl: transaction.redirect_url,
      paymentMethod: 'midtrans',
      token: orderId,
      tenantEmailFrom: req.tenant.email_from,
      tenantEmailReplyTo: req.tenant.email_reply_to
    };

    // Send notifications asynchronously - don't block response
    sendWhatsAppMessage(orderData).catch(err => {
      console.error(`[${req.tenantSlug}] WhatsApp error:`, err.message);
    });

    sendOrderConfirmationEmail(orderData).catch(err => {
      console.error(`[${req.tenantSlug}] Email error:`, err.message);
    });

    res.json({
      success: true,
      redirectUrl: transaction.redirect_url,
      token: transaction.token
    });
  } catch (error) {
    console.error(`[${req.tenantSlug}] Payment creation error:`, error);
    throw error;
  }
}));

// Get order status (tenant-scoped)
app.get('/orders/:orderId/status', resolveTenant, asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await ordersRepo.getOrder(orderId);

  if (!order) {
    return res.status(404).json({
      error: 'Order not found',
      orderId
    });
  }

  // Verify order belongs to this tenant
  if (order.tenant_id !== req.tenantId) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Order does not belong to this tenant'
    });
  }

  res.json({
    success: true,
    order: {
      orderId: order.order_id,
      customerName: order.customer_name,
      email: order.email,
      amount: order.amount,
      paymentMethod: order.payment_method,
      status: order.status,
      createdAt: order.created_at
    }
  });
}));

// =====================================================
// WEBHOOK ROUTES (Tenant-scoped)
// =====================================================

// Midtrans webhook handler (tenant-scoped)
app.post('/webhooks/midtrans', resolveTenant, asyncHandler(async (req, res) => {
  console.log(`[${req.tenantSlug}] Midtrans webhook received:`, req.body);

  const { order_id, transaction_status } = req.body;

  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    // Update order status
    await ordersRepo.updateOrderStatus(order_id, 'paid');

    // Get order details
    const order = await ordersRepo.getOrder(order_id);

    if (order) {
      const orderData = {
        id: order_id,
        customerName: order.customer_name,
        email: order.email,
        token: order_id,
        tenantEmailFrom: req.tenant.email_from,
        tenantEmailReplyTo: req.tenant.email_reply_to
      };

      // Send success notifications
      await sendSuccessWhatsApp(orderData);
      await sendPaymentSuccessEmail(orderData);

      console.log(`[${req.tenantSlug}] Order ${order_id} marked as PAID`);
    }
  }

  res.status(200).send('OK');
}));

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.path
  });
});

// Error handling middleware
app.use(errorHandler);

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ PAYMENT SERVER V2 (Tenant-Supported) running on port ${PORT}`);
  console.log('═══════════════════════════════════════════════════');
  console.log(`Version: 2.0.0`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_NAME || 'not configured'}`);
  console.log(`Tenant Resolution: Enabled`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});
