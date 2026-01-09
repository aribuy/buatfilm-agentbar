require("dotenv").config();
const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");
const database = require("./database");
const auth = require("./middleware/auth");
const {
  errorHandler,
  asyncHandler,
  validateOrder,
} = require("./middleware/errorHandler");
const path = require("path");
const logger = require("./lib/logger");
const healthRoutes = require("./routes/health");
const circuitBreaker = require("./lib/circuitBreaker");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public/downloads
app.use("/downloads", express.static(path.join(__dirname, "public/downloads")));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(
    { method: req.method, url: req.url, ip: req.ip },
    "Incoming request"
  );
  next();
});

const snap = new midtransClient.Snap({
  isProduction: process.env.NODE_ENV === "production",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Wrap Midtrans calls with circuit breaker
const createTransactionBreaker = circuitBreaker(
  async (transactionDetails) => {
    return await snap.createTransaction(transactionDetails);
  },
  { name: "Midtrans-CreateTransaction" }
);

console.log(
  "✅ " +
    (process.env.DB_TYPE || "postgresql").toUpperCase() +
    " Order Storage Enabled"
);

// Admin login
app.post(
  "/admin/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (username === "admin" && password === process.env.ADMIN_PASSWORD) {
      const token = auth.generateToken({ username, role: "admin" });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  })
);

// Get all orders (admin only)
app.get(
  "/admin/orders",
  auth.verifyToken,
  auth.adminAuth,
  asyncHandler(async (req, res) => {
    const orders = await database.getAllOrders();
    res.json({ success: true, orders });
  })
);

// Update order status (admin only)
app.put(
  "/admin/orders/:orderId",
  auth.verifyToken,
  auth.adminAuth,
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    await database.updateOrderStatus(orderId, status);
    res.json({ success: true, message: "Order status updated" });
  })
);

// Get order status (public - used by Thank You page)
app.get(
  "/orders/:orderId/status",
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const order = await database.getOrder(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Return a subset of order data for the Thank You page
    res.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        totalAmount: order.amount,
        customerName: order.customerName,
        email: order.email,
      },
    });
  })
);

app.post(
  "/payment/create",
  validateOrder,
  asyncHandler(async (req, res) => {
    const { orderId, amount, email, phone, name } = req.body;

    const transactionDetails = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: name,
        email: email,
        phone: phone,
      },
      enabled_payments: [
        "credit_card",
        "bca_va",
        "bni_va",
        "bri_va",
        "echannel",
        "gopay",
        "shopeepay",
        "qris",
      ],
      finish_redirect_url:
        "https://buatfilm.agentbar.ai/thank-you?order_id=" + orderId,
    };

    // Use circuit breaker for Midtrans call
    const transaction = await createTransactionBreaker.fire(transactionDetails);

    // Save to database
    await database.createOrder({
      id: orderId,
      customerName: name,
      email,
      phone,
      amount,
      paymentMethod: "midtrans",
    });

    // Data for notifications
    const orderData = {
      id: orderId,
      customerName: name,
      email,
      phone,
      totalAmount: amount,
      paymentUrl: transaction.redirect_url,
      paymentMethod: "midtrans",
      token: orderId,
    };

    // Queue to outbox correctly matching the DB schema (order_id, channel, template_name, recipient, body_data)
    try {
      const insertSQL = `
      INSERT INTO notification_outbox (order_id, channel, template_name, recipient, body_data, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())
    `;

      // Queue WhatsApp
      await database.query(insertSQL, [
        orderId,
        "WHATSAPP",
        "order_confirmation",
        phone,
        JSON.stringify(orderData),
      ]);

      // Queue Email
      await database.query(insertSQL, [
        orderId,
        "EMAIL",
        "order_confirmation",
        email,
        JSON.stringify(orderData),
      ]);

      logger.info({ orderId }, "Notifications queued to outbox");
    } catch (error) {
      logger.error(
        { error: error.message, orderId },
        "Failed to queue notifications"
      );
      // Don't fail the request if notification queue fails
    }

    res.json({
      success: true,
      paymentUrl: transaction.redirect_url,
      token: transaction.token,
    });
  })
);

app.post(
  "/webhooks/midtrans",
  asyncHandler(async (req, res) => {
    logger.info({ webhook: req.body }, "Midtrans webhook received");

    const { order_id, transaction_status } = req.body;

    if (
      transaction_status === "settlement" ||
      transaction_status === "capture"
    ) {
      await database.updateOrderStatus(order_id, "paid");

      const order = await database.getOrder(order_id);

      if (order) {
        const orderData = {
          id: order_id,
          customerName: order.customerName || order.customer_name,
          email: order.email || order.customer_email,
          token: order_id,
        };

        const recipientPhone = order.phone || order.customer_phone;
        const recipientEmail = order.email || order.customer_email;

        // Queue success notifications to outbox
        try {
          const insertSQL = `
          INSERT INTO notification_outbox (order_id, channel, template_name, recipient, body_data, status, created_at)
          VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())
          ON CONFLICT (order_id, channel, template_name) DO NOTHING
        `;

          await database.query(insertSQL, [
            order_id,
            "WHATSAPP",
            "payment_success",
            recipientPhone,
            JSON.stringify(orderData),
          ]);

          await database.query(insertSQL, [
            order_id,
            "EMAIL",
            "payment_success",
            recipientEmail,
            JSON.stringify(orderData),
          ]);

          logger.info(
            { orderId: order_id },
            "Success notifications queued to outbox"
          );
        } catch (error) {
          logger.error(
            { error: error.message, orderId: order_id },
            "Failed to queue success notifications"
          );
        }
      }
    }

    res.status(200).send("OK");
  })
);

// Health check routes
app.use("/", healthRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  logger.info(`Payment API with Database running on port ${PORT}`);
});
