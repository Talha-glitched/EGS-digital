import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI, ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false });
try { await pool.query(await fs.readFile(path.join(scriptDir, '21_employee_user_sync.sql'), 'utf8')); console.log('Employee/user sync migration applied successfully.'); } finally { await pool.end(); }

