#!/usr/bin/env node

import dotenv from 'dotenv'; dotenv.config();
const [{ default: db }, costing, inventory, reports] = await Promise.all([
  import('../src/db/index.js'),
  import('../src/services/jobCostingService.js'),
  import('../src/services/inventoryService.js'),
  import('../src/services/operationalReportingService.js'),
]);

function assert(condition, message) { if (!condition) throw new Error(message); }

try {
  const schema = await db.query(`SELECT
    to_regclass('public.job_cost_estimates') IS NOT NULL AS estimates_ready,
    to_regclass('public.job_actual_costs') IS NOT NULL AS actuals_ready,
    to_regclass('public.job_cost_confirmations') IS NOT NULL AS confirmations_ready,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='default_unit_cost_aed') AS item_cost_ready,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='unit_cost_aed') AS movement_cost_ready,
    (SELECT COUNT(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgname IN ('trg_cost_reopen_supplier','trg_cost_reopen_time','trg_cost_reopen_inventory','trg_cost_reopen_other')) AS invalidation_triggers,
    (SELECT COUNT(*)::int FROM job_cost_estimates e LEFT JOIN ongoing_jobs j ON j.id=e.ongoing_job_id LEFT JOIN job_scope_lines w ON w.id=e.work_package_id WHERE j.id IS NULL OR (e.work_package_id IS NOT NULL AND (w.id IS NULL OR w.ongoing_job_id<>e.ongoing_job_id))) AS invalid_estimates,
    (SELECT COUNT(*)::int FROM job_actual_costs c LEFT JOIN ongoing_jobs j ON j.id=c.ongoing_job_id LEFT JOIN job_scope_lines w ON w.id=c.work_package_id WHERE j.id IS NULL OR (c.work_package_id IS NOT NULL AND (w.id IS NULL OR w.ongoing_job_id<>c.ongoing_job_id))) AS invalid_actuals`);
  const job = await db.query(`SELECT oj.id FROM ongoing_jobs oj WHERE oj.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM migration_entity_map mem WHERE mem.target_table='ongoing_jobs' AND mem.target_entity_id=oj.id AND mem.source_collection='jobs') ORDER BY oj.updated_at DESC NULLS LAST LIMIT 1`);
  assert(job.rows.length, 'No current Job is available for costing verification.');
  const workspace = await costing.getJobCosting(job.rows[0].id);
  const inventoryWorkspace = await inventory.getInventoryWorkspace();
  const report = await reports.getOperationalReport();
  const result = { ...schema.rows[0], sampleJobId: job.rows[0].id, estimateRows: workspace.estimates.length, supplierActualRows: workspace.actuals.suppliers.length, laborActualRows: workspace.actuals.labor.length, materialActualRows: workspace.actuals.materials.length, otherActualRows: workspace.actuals.other.length, inventoryItemsLoaded: inventoryWorkspace.items.length, operationalJobsLoaded: report.jobs.length, confirmedMarginJobs: report.summary.trustworthyMarginJobs };
  assert(result.estimates_ready && result.actuals_ready && result.confirmations_ready && result.item_cost_ready && result.movement_cost_ready && result.invalidation_triggers === 4, 'Job costing schema or invalidation controls are incomplete.');
  assert(!result.invalid_estimates && !result.invalid_actuals, 'Job costing relationships are invalid.');
  assert(workspace.summary.actualMargin == null || workspace.summary.marginReady, 'Margin appeared without confirmed cost completeness.');
  console.log(JSON.stringify(result, null, 2)); console.log('Read-only Job costing verification passed.');
} finally { await db.getPool().end(); }
