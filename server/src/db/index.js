import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;

let pool = null;

export function getPool() {
  if (!pool) {
    if (!connectionString) {
      console.warn('⚠️ Warning: Neither POSTGRES_URL nor DATABASE_URL is set in environment.');
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: Number(process.env.POSTGRES_MAX_POOL || 20),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

/**
 * Execute a SQL query with parameters using connection pool
 * @param {string} text - SQL Query string
 * @param {Array} params - Parameter array
 * @returns {Promise<import('pg').QueryResult>} Query Result
 */
export async function query(text, params) {
  const start = Date.now();
  const p = getPool();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 200) {
      console.warn(`🐢 Slow query (${duration}ms): ${text.substring(0, 100)}...`);
    }
    return res;
  } catch (error) {
    console.error(`❌ Database Query Error [${text.substring(0, 80)}...]:`, error.message);
    throw error;
  }
}

/**
 * Get a client from pool for transactions
 * @returns {Promise<import('pg').PoolClient>}
 */
export async function getClient() {
  const p = getPool();
  return await p.connect();
}

/**
 * Test PostgreSQL connection
 */
export async function testConnection() {
  try {
    const res = await query('SELECT CURRENT_TIMESTAMP as now, version() as version');
    console.info(`✅ Connected to PostgreSQL DB (${res.rows[0].now}). Engine: ${res.rows[0].version.split(' ')[0]}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error.message);
    return false;
  }
}

export default {
  query,
  getClient,
  getPool,
  testConnection,
};
