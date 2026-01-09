const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
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
      return res;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  },

  get: async (sql, params) => {
    const res = await pool.query(sql, params);
    return res.rows[0];
  },

  all: async (sql, params) => {
    const res = await pool.query(sql, params);
    return res.rows;
  },

  run: async (sql, params) => {
    await pool.query(sql, params);
  },

  raw: async (sql, params) => {
    return await pool.query(sql, params);
  },

  // Interface methods used by payment-server.js
  createOrder: async (orderData) => {
    const { id, customerName, email, phone, amount, status } = orderData;
    // Note: Schema uses order_id, customer_name, customer_email, customer_phone, final_amount, status
    await pool.query(
      `INSERT INTO orders (
        order_id, customer_name, customer_email, customer_phone, 
        package_id, package_name, final_amount, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (order_id) DO NOTHING`,
      [
        id, 
        customerName, 
        email, 
        phone, 
        'ai-movie-course', 
        'Buat Film Pakai AI', 
        amount, 
        (status || 'CREATED').toUpperCase()
      ]
    );
    return orderData;
  },

  getOrder: async (orderId) => {
    const res = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [orderId]
    );
    const row = res.rows[0];
    if (!row) return null;
    
    // Map back to legacy JS object format if needed by caller
    return {
      ...row,
      id: row.order_id,
      customerName: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      amount: row.final_amount
    };
  },

  updateOrderStatus: async (orderId, status) => {
    await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2',
      [status.toUpperCase(), orderId]
    );
  },

  getAllOrders: async () => {
    const res = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    return res.rows.map(row => ({
      ...row,
      id: row.order_id,
      customerName: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      amount: row.final_amount
    }));
  }
};
