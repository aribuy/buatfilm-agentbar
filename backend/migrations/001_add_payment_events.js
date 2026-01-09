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
