const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

// SQLite connection
const sqliteDb = new sqlite3.Database('./orders.db');

// PostgreSQL connection
const pgPool = new Pool({
  host: '127.0.0.1', // Force IPv4
  database: 'buatfilm_production',
  user: 'buatfilm_user',
  password: process.env.PG_PASSWORD,
  max: 10
});

async function migrateOrders() {
  console.log('🔄 Starting migration...');

  // Get all orders from SQLite
  const orders = await new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM orders', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log(`📦 Found ${orders.length} orders to migrate`);

  let migrated = 0;
  let failed = 0;

  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    for (const order of orders) {
      try {
        await client.query(`
          INSERT INTO orders (
            order_id, customer_name, customer_email, customer_phone,
            package_id, package_name, final_amount,
            status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (order_id) DO NOTHING
        `, [
          order.id,
          order.customerName,
          order.email,
          order.phone,
          'ai-movie-course',
          'Buat Film Pakai AI',
          order.amount,
          order.status || 'PENDING_PAYMENT',
          order.created_at ? new Date(order.created_at).toISOString() : new Date().toISOString(),
          new Date().toISOString()
        ]);

        migrated++;
        if (migrated % 10 === 0) {
          console.log(`✅ Progress: ${migrated}/${orders.length}`);
        }

      } catch (error) {
        failed++;
        console.error(`❌ Failed to migrate ${order.id}:`, error.message);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Transaction committed');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Success: ${migrated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Total: ${orders.length}`);

  await pgPool.end();
  sqliteDb.close();

  if (failed > 0) {
    process.exit(1);
  }
}

migrateOrders().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
