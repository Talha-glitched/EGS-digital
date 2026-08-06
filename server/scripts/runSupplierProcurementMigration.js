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
const pool = new pg.Pool({ connectionString, ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false, max: 1 });
try {
  await pool.query(await fs.readFile(path.join(scriptDir, '14_supplier_procurement.sql'), 'utf8'));
  console.log('Supplier procurement migration applied successfully.');
} finally { await pool.end(); }
