import pg from 'pg';

const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL env var is required for STORAGE_DRIVER=postgres');
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
    });
  }
  return pool;
}

export async function query(sql, params) {
  return getPool().query(sql, params);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
