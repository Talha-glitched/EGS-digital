#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env'), override: true });
const [{ default: db }, { listJobMemory }] = await Promise.all([
  import('../src/db/index.js'),
  import('../src/services/jobMemoryService.js'),
]);

try {
  const jobResult = await db.query(
    `SELECT id FROM ongoing_jobs WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`,
  );
  if (!jobResult.rows.length) throw new Error('No active Ongoing Job is available for verification.');
  const jobId = jobResult.rows[0].id;
  const memory = await listJobMemory(jobId, { limit: 5 });
  const schemaResult = await db.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('notes', 'note_versions', 'note_attachments')
     ORDER BY table_name`,
  );
  console.log(JSON.stringify({
    ok: true,
    verifiedJobId: jobId,
    returnedEntries: memory.items.length,
    availableTypes: memory.types.length,
    tables: schemaResult.rows.map((row) => row.table_name),
  }, null, 2));
} finally {
  await db.getPool().end();
}
