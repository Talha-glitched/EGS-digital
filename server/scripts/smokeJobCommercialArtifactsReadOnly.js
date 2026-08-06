#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();
const [{ default: db }, { getJobCommercialArtifacts }] = await Promise.all([
  import('../src/db/index.js'),
  import('../src/services/jobCommercialArtifactService.js'),
]);
try {
  const job = await db.query('SELECT id FROM ongoing_jobs WHERE deleted_at IS NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1');
  if (!job.rows.length) throw new Error('No Job available for the read-only smoke test.');
  const result = await getJobCommercialArtifacts(job.rows[0].id);
  if (!Array.isArray(result.designSets) || !Array.isArray(result.quotes) || !Array.isArray(result.workPackages) || !Array.isArray(result.services) || !Array.isArray(result.uoms) || result.quotes.some((quote) => quote.versions.some((version) => !Array.isArray(version.lines)))) {
    throw new Error('Commercial artifact workspace returned an invalid shape.');
  }
  console.log(JSON.stringify({ jobId: job.rows[0].id, designSets: result.designSets.length, quotes: result.quotes.length, structuredLines: result.quotes.reduce((sum,quote)=>sum+quote.versions.reduce((versionSum,version)=>versionSum+version.lines.length,0),0), workPackages: result.workPackages.length, services: result.services.length, uoms: result.uoms.length }));
  console.log('Read-only commercial artifact service smoke test passed.');
} finally {
  await db.getPool().end();
}
