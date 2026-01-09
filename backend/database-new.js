const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'orders.db');
const db = new sqlite3.Database(dbPath);

console.log(`[DB] Connected to ${dbPath}`);

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

// Initialize tables if needed (optional here since migration does it, but good for safety)
// But migration handles it.

module.exports = { run, get, all, db };
