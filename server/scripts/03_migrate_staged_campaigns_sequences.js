import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🚀 Starting optimized 03_migrate_staged_campaigns_sequences.js...');

    // 1. Ensure columns exist on target tables
    await client.query(`
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS mongo_campaign_id VARCHAR(50);
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS payload JSONB;
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE sequences ADD COLUMN IF NOT EXISTS mongo_sequence_id VARCHAR(50);
      ALTER TABLE sequences ADD COLUMN IF NOT EXISTS mongo_campaign_id VARCHAR(50);
      ALTER TABLE sequences ADD COLUMN IF NOT EXISTS payload JSONB;
      ALTER TABLE sequences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE pipeline_configs ADD COLUMN IF NOT EXISTS pipeline_key VARCHAR(100);
      ALTER TABLE pipeline_configs ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

      ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS mongo_enrollment_id VARCHAR(50);
      ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS mongo_lead_id VARCHAR(50);
      ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS mongo_campaign_id VARCHAR(50);
      ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS mongo_sequence_id VARCHAR(50);
      ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS payload JSONB;
    `);

    // 2. Ingest Pipeline Configs
    console.log('📦 Ingesting Pipeline Configs...');
    const pipeDocs = await client.query(`
      SELECT mongo_id, payload 
      FROM migration_source_document 
      WHERE collection_name = 'pipelineconfigs'
    `);
    for (const r of pipeDocs.rows) {
      const p = r.payload;
      const key = p.key || 'sales';
      const stagesJson = JSON.stringify(p.stages || []);
      const updatedBy = p.updatedBy || 'admin';
      const updatedAt = p.updatedAt?.$date?.$numberLong 
        ? new Date(Number(p.updatedAt.$date.$numberLong)) 
        : new Date();

      await client.query(`
        INSERT INTO pipeline_configs (pipeline_name, pipeline_key, stages, is_active, updated_by, updated_at)
        VALUES ($1, $2, $3::jsonb, true, $4, $5)
        ON CONFLICT DO NOTHING;
      `, ['Sales Pipeline', key, stagesJson, updatedBy, updatedAt]);
    }

    // 3. Ingest Project Campaigns
    console.log('📦 Ingesting Project Campaigns...');
    const campaignDocs = await client.query(`
      SELECT mongo_id, payload 
      FROM migration_source_document 
      WHERE collection_name = 'projectcampaigns'
    `);

    let campaignCount = 0;
    for (const r of campaignDocs.rows) {
      const mongoId = r.mongo_id;
      const p = r.payload;
      const name = p.projectName || p.name || 'Unnamed Campaign';
      const lifecycle = p.status || p.milestone || 'Active Planning';
      const createdAt = p.createdAt?.$date?.$numberLong 
        ? new Date(Number(p.createdAt.$date.$numberLong)) 
        : new Date();
      const updatedAt = p.updatedAt?.$date?.$numberLong 
        ? new Date(Number(p.updatedAt.$date.$numberLong)) 
        : createdAt;

      const res = await client.query(`
        INSERT INTO campaigns (name, lifecycle, mongo_campaign_id, payload, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [name, lifecycle, mongoId, JSON.stringify(p), createdAt, updatedAt]);

      if (res.rows.length > 0) {
        const sqlId = res.rows[0].id;
        await client.query(`
          INSERT INTO migration_entity_map (source_collection, source_mongo_id, target_table, target_entity_id, mapping_kind)
          VALUES ('projectcampaigns', $1, 'campaigns', $2, 'direct')
          ON CONFLICT DO NOTHING;
        `, [mongoId, sqlId]);
      }
      campaignCount++;
    }
    console.log(`  ✓ Staged and migrated ${campaignCount} campaigns into PostgreSQL.`);

    // 4. Ingest Sequences
    console.log('📦 Ingesting Sequences...');
    const seqDocs = await client.query(`
      SELECT mongo_id, payload 
      FROM migration_source_document 
      WHERE collection_name = 'sequences'
    `);

    let seqCount = 0;
    for (const r of seqDocs.rows) {
      const mongoId = r.mongo_id;
      const p = r.payload;
      const name = p.name || p.sequenceName || 'Unnamed Sequence';
      const mongoCampaignId = p.campaignId?.$oid || (typeof p.campaignId === 'string' ? p.campaignId : null);
      const createdAt = p.createdAt?.$date?.$numberLong 
        ? new Date(Number(p.createdAt.$date.$numberLong)) 
        : new Date();
      const updatedAt = p.updatedAt?.$date?.$numberLong 
        ? new Date(Number(p.updatedAt.$date.$numberLong)) 
        : createdAt;

      const res = await client.query(`
        INSERT INTO sequences (name, mongo_sequence_id, mongo_campaign_id, payload, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [name, mongoId, mongoCampaignId, JSON.stringify(p), createdAt, updatedAt]);

      if (res.rows.length > 0) {
        const sqlSeqId = res.rows[0].id;
        await client.query(`
          INSERT INTO migration_entity_map (source_collection, source_mongo_id, target_table, target_entity_id, mapping_kind)
          VALUES ('sequences', $1, 'sequences', $2, 'direct')
          ON CONFLICT DO NOTHING;
        `, [mongoId, sqlSeqId]);
      }
      seqCount++;
    }
    console.log(`  ✓ Staged and migrated ${seqCount} sequences into PostgreSQL.`);

    // 5. Ingest Sequence Enrollments in Batch
    console.log('📦 Ingesting Sequence Enrollments in Batches...');
    const enrollDocs = await client.query(`
      SELECT mongo_id, payload 
      FROM migration_source_document 
      WHERE collection_name = 'sequenceenrollments'
    `);

    const BATCH_SIZE = 100;
    let enrollCount = 0;
    for (let i = 0; i < enrollDocs.rows.length; i += BATCH_SIZE) {
      const chunk = enrollDocs.rows.slice(i, i + BATCH_SIZE);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const r of chunk) {
        const mongoId = r.mongo_id;
        const p = r.payload;
        const mongoLeadId = p.leadId?.$oid || (typeof p.leadId === 'string' ? p.leadId : null);
        const mongoCampaignId = p.campaignId?.$oid || (typeof p.campaignId === 'string' ? p.campaignId : null);
        const mongoSeqId = p.sequenceId?.$oid || (typeof p.sequenceId === 'string' ? p.sequenceId : null);
        const executionState = p.completedAt ? 'completed' : (p.frozen ? 'frozen' : 'active');
        const enrolledAt = p.createdAt?.$date?.$numberLong 
          ? new Date(Number(p.createdAt.$date.$numberLong)) 
          : new Date();

        values.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6}::jsonb)`);
        params.push(mongoId, mongoLeadId, mongoCampaignId, mongoSeqId, executionState, enrolledAt, JSON.stringify(p));
        paramIdx += 7;
        enrollCount++;
      }

      if (values.length > 0) {
        const sql = `
          INSERT INTO sequence_enrollments 
            (mongo_enrollment_id, mongo_lead_id, mongo_campaign_id, mongo_sequence_id, execution_state, enrolled_at, payload)
          VALUES ${values.join(', ')}
          ON CONFLICT DO NOTHING;
        `;
        await client.query(sql, params);
      }
    }
    console.log(`  ✓ Staged and migrated ${enrollCount} sequence enrollments into PostgreSQL.`);

    await client.query('COMMIT');
    console.log('🎉 03_migrate_staged_campaigns_sequences.js completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
