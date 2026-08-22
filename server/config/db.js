const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Drop idle connections quickly so Neon's scale-to-zero doesn't leave stale sockets
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  max: 5,
});

// Swallow connection errors so one broken socket doesn't crash the process
pool.on('error', (err) => console.error('pg pool error:', err.message));

module.exports = pool;
