/**
 * OTS Desk — PostgreSQL connection pool
 * One shared pool for the whole app. Reads from env so the same code runs
 * locally and on the Hostinger VPS.
 */
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  user:     process.env.DB_USER     || 'otsdesk',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'otsdesk',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('PG pool error:', err.message));

async function query(text, params) { return pool.query(text, params); }
async function one(text, params) { const r = await pool.query(text, params); return r.rows[0] || null; }
async function tx(fn) {
  const c = await pool.connect();
  try { await c.query('BEGIN'); const r = await fn(c); await c.query('COMMIT'); return r; }
  catch (e) { await c.query('ROLLBACK'); throw e; }
  finally { c.release(); }
}

module.exports = { pool, query, one, tx };
