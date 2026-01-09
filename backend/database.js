const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'buatfilm_production',
  user: process.env.PG_USER || 'buatfilm_user',
  password: process.env.PG_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      // console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  },

  get: async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows[0];
  },

  all: async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows;
  },

  run: async (text, params) => {
    await pool.query(text, params);
  },

  raw: async (text) => {
    return pool.query(text);
  },

  // Helper methods for orders
  createOrder: async (orderData) => {
    const { id, customerName, email, phone, amount, paymentMethod, paymentUrl, token } = orderData;
    await pool.query(
      `INSERT INTO payment_orders (id, customer_name, email, phone, amount, payment_method, payment_url, token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, customerName, email, phone, amount, paymentMethod, paymentUrl || null, token || null]
    );
    return { id, ...orderData };
  },

  getOrder: async (orderId) => {
    const res = await pool.query(
      'SELECT * FROM payment_orders WHERE id = $1',
      [orderId]
    );
    return res.rows[0];
  },

  updateOrderStatus: async (orderId, status) => {
    await pool.query(
      'UPDATE payment_orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, orderId]
    );
  },

  getAllOrders: async () => {
    const res = await pool.query(
      'SELECT * FROM payment_orders ORDER BY created_at DESC'
    );
    return res.rows;
  }
};
