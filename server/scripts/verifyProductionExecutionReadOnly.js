#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();
const [{ default: db }, production] = await Promise.all([import('../src/db/index.js'), import('../src/services/productionExecutionService.js')]);
try {
  const schema = await db.query(`SELECT
    to_regclass('public.production_releases') IS NOT NULL AS releases_ready,
    to_regclass('public.job_activities') IS NOT NULL AS activities_ready,
    to_regclass('public.job_activity_updates') IS NOT NULL AS updates_ready,
    (SELECT COUNT(*)::int FROM production_releases pr LEFT JOIN ongoing_jobs oj ON oj.id = pr.ongoing_job_id WHERE oj.id IS NULL) AS orphan_releases,
    (SELECT COUNT(*)::int FROM job_activities ja LEFT JOIN ongoing_jobs oj ON oj.id = ja.ongoing_job_id WHERE oj.id IS NULL) AS orphan_activities,
    (SELECT COUNT(*)::int FROM job_activity_updates jau LEFT JOIN job_activities ja ON ja.id = jau.job_activity_id WHERE ja.id IS NULL) AS orphan_updates,
    (SELECT COUNT(*)::int FROM (SELECT ongoing_job_id FROM production_releases WHERE status = 'active' GROUP BY ongoing_job_id HAVING COUNT(*) > 1) duplicate) AS jobs_with_multiple_active_releases`);
  const job = await db.query('SELECT id FROM ongoing_jobs WHERE deleted_at IS NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1');
  if (!job.rows.length) throw new Error('No Job available for production workspace smoke test.');
  const workspace = await production.getProductionWorkspace(job.rows[0].id);
  const calendar = await production.getPlanCalendar({});
  const result = { ...schema.rows[0], workspaceJobId: job.rows[0].id, activitiesLoaded: workspace.activities.length, calendarItemsLoaded: calendar.items.length, schedulableJobsLoaded: calendar.jobs.length };
  if (!result.releases_ready || !result.activities_ready || !result.updates_ready || result.orphan_releases || result.orphan_activities || result.orphan_updates || result.jobs_with_multiple_active_releases || !result.schedulableJobsLoaded) throw new Error(`Production verification failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result, null, 2));
  console.log('Read-only production execution verification passed.');
} finally { await db.getPool().end(); }
