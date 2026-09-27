const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Most managed cloud MySQL providers (PlanetScale, Railway, Aiven, RDS) require SSL.
  // Set DB_SSL=true in .env if your provider requires it.
  // rejectUnauthorized: false is needed for PlanetScale and some providers
  // that use self-signed certificates or where the CA chain isn't recognized.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

// Handle pool-level errors (e.g. MySQL server restart, network issues).
// Without this, an unhandled 'error' event on the pool would crash the process.
pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

// Test the database connection on startup and log the result.
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[DB] Connection successful');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    console.error('[DB] API endpoints that need the database will return 503 errors.');
  }
})();

module.exports = pool;
