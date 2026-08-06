#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();
const [{ default: db }, procurement, sales] = await Promise.all([import('../src/db/index.js'), import('../src/services/supplierProcurementService.js'), import('../src/services/salesService.js')]);
try {
  const schema = await db.query(`SELECT
    to_regclass('public.supplier_profiles') IS NOT NULL AS suppliers_ready,
    to_regclass('public.supplier_rfqs') IS NOT NULL AS rfqs_ready,
    to_regclass('public.supplier_quotes') IS NOT NULL AS quotes_ready,
    to_regclass('public.supplier_commitments') IS NOT NULL AS commitments_ready,
    to_regclass('public.supplier_commitment_updates') IS NOT NULL AS updates_ready,
    (SELECT COUNT(*)::int FROM supplier_profiles sp LEFT JOIN organizations o ON o.id = sp.organization_id WHERE o.id IS NULL) AS orphan_suppliers,
    (SELECT COUNT(*)::int FROM supplier_rfqs sr LEFT JOIN ongoing_jobs oj ON oj.id = sr.ongoing_job_id WHERE oj.id IS NULL) AS orphan_rfqs,
    (SELECT COUNT(*)::int FROM supplier_quotes sq LEFT JOIN supplier_rfqs sr ON sr.id = sq.supplier_rfq_id WHERE sr.id IS NULL) AS orphan_quotes,
    (SELECT COUNT(*)::int FROM supplier_commitments sc LEFT JOIN ongoing_jobs oj ON oj.id = sc.ongoing_job_id WHERE oj.id IS NULL) AS orphan_commitments,
    (SELECT COUNT(*)::int FROM supplier_commitment_updates scu LEFT JOIN supplier_commitments sc ON sc.id = scu.supplier_commitment_id WHERE sc.id IS NULL) AS orphan_updates`);
  const job = await db.query('SELECT id FROM ongoing_jobs WHERE deleted_at IS NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1');
  if (!job.rows.length) throw new Error('No Job available for procurement workspace verification.');
  const workspace = await procurement.getProcurementWorkspace(job.rows[0].id);
  const directory = await procurement.getSupplierDirectory();
  const timeline = await sales.getOngoingJobTimeline(job.rows[0].id);
  const result = { ...schema.rows[0], workspaceJobId: job.rows[0].id, suppliersLoaded: workspace.suppliers.length, directorySuppliersLoaded: directory.suppliers.length, capabilitiesLoaded: directory.capabilities.length, rfqsLoaded: workspace.rfqs.length, commitmentsLoaded: workspace.commitments.length, timelineEventsLoaded: timeline.events.length };
  if (!result.suppliers_ready || !result.rfqs_ready || !result.quotes_ready || !result.commitments_ready || !result.updates_ready || result.orphan_suppliers || result.orphan_rfqs || result.orphan_quotes || result.orphan_commitments || result.orphan_updates) throw new Error(`Supplier procurement verification failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result, null, 2));
  console.log('Read-only supplier procurement verification passed.');
} finally { await db.getPool().end(); }
