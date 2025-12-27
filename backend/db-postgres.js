// =====================================================
// POSTGRESQL DATABASE CONNECTION
// =====================================================

const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_movie_course',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Connection event handlers
pool.on('connect', () => {
  console.log(`✅ PostgreSQL connected: ${process.env.DB_NAME}`);
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
  process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL connection test failed:', err.message);
    console.log('⚠️  Make sure PostgreSQL is running or check DB_* environment variables');
  } else {
    console.log(`✅ PostgreSQL connection verified at ${res.rows[0].now}`);
  }
});

module.exports = pool;
