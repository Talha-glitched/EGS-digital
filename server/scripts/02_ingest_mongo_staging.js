import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Backup directory containing the converted .json files
// Default relative path: ../../mongo_backup/egs-web or passed via command line arg
const backupDirArg = process.argv[2] || path.join(__dirname, '../../mongo_backup/egs-web');

async function main() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URI;
    if (!connectionString) {
        console.error('❌ Error: DATABASE_URL is not set in environment variables.');
        console.log('Usage: DATABASE_URL="postgres://user:pass@host:5432/dbname" node scripts/02_ingest_mongo_staging.js [path_to_mongo_json_dir]');
        process.exit(1);
    }

    const backupDir = path.resolve(backupDirArg);
    if (!fs.existsSync(backupDir)) {
        console.error(`❌ Error: Backup directory does not exist: ${backupDir}`);
        process.exit(1);
    }

    console.log(`📂 Inspecting Mongo JSON backup directory: ${backupDir}`);
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
        console.error('❌ No .json files found in backup directory. Did you run Step 1 bsondump?');
        process.exit(1);
    }

    console.log(`Found ${files.length} JSON backup files to ingest.`);

    const pool = new Pool({
        connectionString,
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create or get active migration run
        const runRes = await client.query(`
            INSERT INTO migration_run (run_type, source_database, status)
            VALUES ('initial_ingest', 'egs-web', 'running')
            RETURNING id;
        `);
        const runId = runRes.rows[0].id;
        console.log(`🚀 Started Migration Run ID: ${runId}`);

        let totalIngested = 0;

        for (const file of files) {
            const collectionName = path.basename(file, '.json');
            const filePath = path.join(backupDir, file);
            console.log(`\n📦 Processing collection: ${collectionName} (${file})...`);

            const fileContent = fs.readFileSync(filePath, 'utf8');
            const lines = fileContent.split('\n').filter(line => line.trim().length > 0);

            let ingestedInCollection = 0;

            for (const line of lines) {
                try {
                    const doc = JSON.parse(line);
                    
                    // Extract Mongo _id
                    let mongoId;
                    if (doc._id && doc._id.$oid) {
                        mongoId = doc._id.$oid;
                    } else if (typeof doc._id === 'string') {
                        mongoId = doc._id;
                    } else if (doc._id) {
                        mongoId = JSON.stringify(doc._id);
                    } else {
                        mongoId = crypto.randomUUID();
                    }

                    const jsonString = JSON.stringify(doc);
                    const hash = crypto.createHash('sha256').update(jsonString).digest('hex');

                    await client.query(`
                        INSERT INTO migration_source_document 
                            (run_id, collection_name, mongo_id, payload, payload_sha256, terminal_disposition)
                        VALUES ($1, $2, $3, $4, $5, 'pending')
                        ON CONFLICT (collection_name, mongo_id) DO UPDATE SET
                            payload = EXCLUDED.payload,
                            payload_sha256 = EXCLUDED.payload_sha256,
                            extracted_at = CURRENT_TIMESTAMP;
                    `, [runId, collectionName, mongoId, doc, hash]);

                    ingestedInCollection++;
                    totalIngested++;
                } catch (err) {
                    console.error(`⚠️ Failed to parse line in ${file}:`, err.message);
                }
            }

            console.log(`  ✓ Staged ${ingestedInCollection} documents for collection '${collectionName}'`);
        }

        // Update run status
        await client.query(`
            UPDATE migration_run 
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
            WHERE id = $1;
        `, [runId]);

        await client.query('COMMIT');
        console.log(`\n🎉 Step 3A Complete! Total ${totalIngested} Mongo source documents safely ingested into PostgreSQL staging table (migration_source_document).`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during staging ingestion:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
