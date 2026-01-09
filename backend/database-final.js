const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'orders.db');
const db = new sqlite3.Database(dbPath);

console.log(`[DB] Connected to ${dbPath}`);

// Initialize tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING_PAYMENT',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      token TEXT,
      payment_url TEXT
    )
  `);
  // payment_events is created by migration 001
});

// Generic methods
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('[DB] Error running sql:', sql, err);
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('[DB] Error getting:', sql, err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('[DB] Error all:', sql, err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Helpers
async function createOrder(orderData) {
  const { id, customerName, email, phone, amount, paymentMethod, token, paymentUrl } = orderData;
  await run(
    `INSERT INTO orders (id, customer_name, email, phone, amount, payment_method, token, payment_url) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, customerName, email, phone, amount, paymentMethod, token, paymentUrl]
  );
  return orderData;
}

async function getOrder(orderId) {
  const row = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!row) return null;
  // Map snake_case to camelCase if needed, or keeping it simple
  return {
    id: row.id,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    totalAmount: row.amount,
    paymentMethod: row.payment_method,
    status: row.status,
    createdAt: row.created_at,
    token: row.token,
    paymentUrl: row.payment_url
  };
}

async function updateOrderStatus(orderId, status) {
  await run(
    'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, orderId]
  );
  return getOrder(orderId);
}

module.exports = { 
  db, 
  run, 
  get, 
  all,
  createOrder,
  getOrder,
  updateOrderStatus
};
