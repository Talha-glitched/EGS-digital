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
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URI;
    
    if (!connectionString) {
        console.error('❌ Error: DATABASE_URL or POSTGRES_URI is not set in environment variables.');
        console.log('Usage: DATABASE_URL="postgres://user:pass@host:5432/dbname" node scripts/runSchemaInit.js');
        process.exit(1);
    }

    console.log('Connecting to PostgreSQL database...');
    const pool = new Pool({
        connectionString,
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
        const sqlFilePath = path.join(__dirname, '01_init_postgresql_schema.sql');
        console.log(`Reading SQL schema from ${sqlFilePath}...`);
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Executing DDL schema queries...');
        await pool.query(sql);

        console.log('✅ PostgreSQL Schema & Migration Control Tables initialized successfully!');
    } catch (err) {
        console.error('❌ Error executing SQL schema:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
