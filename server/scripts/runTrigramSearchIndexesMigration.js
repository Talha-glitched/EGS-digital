import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function main() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
    
    if (!connectionString) {
        console.warn('⚠️ Warning: Neither POSTGRES_URL nor DATABASE_URL is set in environment. Skipping migration execution.');
        process.exit(0);
    }

    console.log('Connecting to PostgreSQL database...');
    const pool = new Pool({
        connectionString,
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
        const sqlFilePath = path.join(__dirname, '32_trigram_search_and_performance_indexes.sql');
        console.log(`Reading SQL schema from ${sqlFilePath}...`);
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Executing pg_trgm search and performance index migration...');
        await pool.query(sql);

        console.log('✅ PostgreSQL Trigram Search & Performance Indexes applied successfully!');
    } catch (err) {
        console.error('❌ Error executing trigram index migration:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
