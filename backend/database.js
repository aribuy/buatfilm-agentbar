const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'orders.db'));
    this.init();
  }

  init() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          customer_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          amount INTEGER NOT NULL,
          payment_method TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  }

  createOrder(orderData) {
    return new Promise((resolve, reject) => {
      const { id, customerName, email, phone, amount, paymentMethod } = orderData;
      this.db.run(
        `INSERT INTO orders (id, customer_name, email, phone, amount, payment_method) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, customerName, email, phone, amount, paymentMethod],
        function(err) {
          if (err) reject(err);
          else resolve({ id, ...orderData });
        }
      );
    });
  }

  getOrder(orderId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM orders WHERE id = ?',
        [orderId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  updateOrderStatus(orderId, status) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, orderId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  getAllOrders() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = new Database();