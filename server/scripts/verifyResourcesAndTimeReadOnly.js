#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();
const [{ default: db }, resources, production] = await Promise.all([import('../src/db/index.js'), import('../src/services/resourceTimeService.js'), import('../src/services/productionExecutionService.js')]);
try {
  const schema = await db.query(`SELECT
    to_regclass('public.operational_resources') IS NOT NULL AS resources_ready,
    to_regclass('public.job_activity_resource_assignments') IS NOT NULL AS assignments_ready,
    to_regclass('public.resource_availability_blocks') IS NOT NULL AS availability_ready,
    to_regclass('public.project_time_entries') IS NOT NULL AS time_ready,
    to_regclass('public.project_time_corrections') IS NOT NULL AS corrections_ready,
    (SELECT COUNT(*)::int FROM job_activity_resource_assignments a LEFT JOIN job_activities ja ON ja.id = a.job_activity_id LEFT JOIN operational_resources r ON r.id = a.resource_id WHERE ja.id IS NULL OR r.id IS NULL) AS orphan_assignments,
    (SELECT COUNT(*)::int FROM resource_availability_blocks b LEFT JOIN operational_resources r ON r.id = b.resource_id WHERE r.id IS NULL) AS orphan_availability,
    (SELECT COUNT(*)::int FROM project_time_entries te LEFT JOIN operational_resources r ON r.id = te.resource_id LEFT JOIN ongoing_jobs oj ON oj.id = te.ongoing_job_id WHERE r.id IS NULL OR oj.id IS NULL) AS orphan_time,
    (SELECT COUNT(*)::int FROM project_time_entries te JOIN job_activities ja ON ja.id = te.job_activity_id WHERE te.job_activity_id IS NOT NULL AND te.ongoing_job_id <> ja.ongoing_job_id) AS cross_job_time,
    (SELECT COUNT(*)::int FROM (SELECT resource_id FROM project_time_entries WHERE status = 'running' GROUP BY resource_id HAVING COUNT(*) > 1) duplicate) AS duplicate_running_timers`);
  const job = await db.query('SELECT id FROM ongoing_jobs WHERE deleted_at IS NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1');
  if (!job.rows.length) throw new Error('No Job available for resource verification.');
  const [workspace, jobProduction, calendar] = await Promise.all([resources.getResourceWorkspace({}, {}), production.getProductionWorkspace(job.rows[0].id), production.getPlanCalendar({})]);
  const result = { ...schema.rows[0], workspaceJobId: job.rows[0].id, resourcesLoaded: workspace.resources.length, assignmentsLoaded: workspace.assignments.length, timeEntriesLoaded: workspace.timeEntries.length, productionResourcesLoaded: jobProduction.resources.length, calendarResourcesLoaded: calendar.resources.length, calendarItemsLoaded: calendar.items.length };
  if (!result.resources_ready || !result.assignments_ready || !result.availability_ready || !result.time_ready || !result.corrections_ready || result.orphan_assignments || result.orphan_availability || result.orphan_time || result.cross_job_time || result.duplicate_running_timers) throw new Error(`Resource/time verification failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result, null, 2));
  console.log('Read-only resources and project-time verification passed.');
} finally { await db.getPool().end(); }
