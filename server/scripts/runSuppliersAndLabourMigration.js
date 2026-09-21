#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
if (!connectionString) throw new Error('PostgreSQL connection string is required.');

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 1,
});

try {
  const sql = await fs.readFile(path.join(scriptDir, '34_suppliers_and_labour.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ Suppliers, buy history, and outsource labour migration applied successfully.');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  await pool.end();
}
