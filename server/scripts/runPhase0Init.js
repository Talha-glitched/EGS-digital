import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function main() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
    
    if (!connectionString) {
        console.error('❌ Error: POSTGRES_URL, DATABASE_URL or POSTGRES_URI is not set in environment variables.');
        process.exit(1);
    }

    console.log('Connecting to PostgreSQL database...');
    const pool = new Pool({
        connectionString,
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
        const sqlFilePath = path.join(__dirname, '04_add_missing_tables.sql');
        console.log(`Reading SQL schema from ${sqlFilePath}...`);
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Executing DDL Phase 0 queries...');
        await pool.query(sql);

        console.log('✅ PostgreSQL Phase 0 Tables & Columns initialized successfully!');
    } catch (err) {
        console.error('❌ Error executing Phase 0 SQL schema:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
