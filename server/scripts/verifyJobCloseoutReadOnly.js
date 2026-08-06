#!/usr/bin/env node

import dotenv from 'dotenv'; dotenv.config();
const [{ default: db }, closeout] = await Promise.all([import('../src/db/index.js'), import('../src/services/jobCloseoutService.js')]);
try {
  const schema = await db.query(`SELECT
    to_regclass('public.job_closeouts') IS NOT NULL AS closeouts_ready,
    to_regclass('public.job_closeout_evidence') IS NOT NULL AS evidence_ready,
    to_regclass('public.job_snags') IS NOT NULL AS snags_ready,
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_job_done_final_photo' AND NOT tgisinternal) AS photo_trigger_ready,
    (SELECT COUNT(*)::int FROM job_closeout_evidence e LEFT JOIN ongoing_jobs oj ON oj.id = e.ongoing_job_id WHERE oj.id IS NULL) AS orphan_evidence,
    (SELECT COUNT(*)::int FROM job_snags s LEFT JOIN ongoing_jobs oj ON oj.id = s.ongoing_job_id WHERE oj.id IS NULL) AS orphan_snags,
    (SELECT COUNT(*)::int FROM job_snags s JOIN job_scope_lines jsl ON jsl.id = s.work_package_id WHERE s.work_package_id IS NOT NULL AND s.ongoing_job_id <> jsl.ongoing_job_id) AS cross_job_work_packages,
    (SELECT COUNT(*)::int FROM job_snags s JOIN job_locations jl ON jl.id = s.location_id WHERE s.location_id IS NOT NULL AND s.ongoing_job_id <> jl.ongoing_job_id) AS cross_job_locations,
    (SELECT COUNT(*)::int FROM job_closeout_evidence WHERE evidence_type = 'final_photo' AND COALESCE(mime_type, '') NOT LIKE 'image/%') AS invalid_final_photos`);
  const job = await db.query(`SELECT id FROM ongoing_jobs WHERE deleted_at IS NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1`); if (!job.rows.length) throw new Error('No Job available for closeout verification.'); const workspace = await closeout.getJobCloseout(job.rows[0].id);
  const result = { ...schema.rows[0], workspaceJobId: job.rows[0].id, evidenceLoaded: workspace.evidence.length, snagsLoaded: workspace.snags.length, finalPhotosLoaded: workspace.readiness.finalPhotoCount };
  if (!result.closeouts_ready || !result.evidence_ready || !result.snags_ready || !result.photo_trigger_ready || result.orphan_evidence || result.orphan_snags || result.cross_job_work_packages || result.cross_job_locations || result.invalid_final_photos) throw new Error(`Job closeout verification failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result, null, 2)); console.log('Read-only Job closeout verification passed.');
} finally { await db.getPool().end(); }
