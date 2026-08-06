import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

const COMMITMENT_STATUSES = Object.freeze(['draft', 'committed', 'partially_delivered', 'delivered', 'cancelled']);
const RFQ_STATUSES = Object.freeze(['draft', 'sent', 'closed', 'cancelled']);
const UPDATE_TYPES = Object.freeze(['progress', 'delivery', 'issue', 'resolution', 'cost_adjustment', 'cancellation']);

function text(value) { return String(value ?? '').trim() || null; }
function uuid(value) { const result = text(value); return result && /^[0-9a-f-]{36}$/i.test(result) ? result : null; }
function money(value, field = 'Amount') { const result = Number(value); if (!Number.isFinite(result) || result < 0) throw Object.assign(new Error(`${field} must be zero or more.`), { status: 400 }); return result; }
function date(value) { if (!value) return null; const result = new Date(value); return Number.isNaN(result.getTime()) ? null : result; }
function currency(value) { return (text(value) || 'AED').toUpperCase().slice(0, 3); }

async function assertJob(client, jobId) {
  const result = await client.query('SELECT id FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL', [jobId]);
  if (!result.rows.length) throw Object.assign(new Error('Ongoing Job not found.'), { status: 404 });
}

async function assertWorkPackage(client, jobId, workPackageId) {
  if (!workPackageId) return;
  const result = await client.query(`SELECT id FROM job_scope_lines WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL`, [workPackageId, jobId]);
  if (!result.rows.length) throw Object.assign(new Error('Work package does not belong to this Job.'), { status: 400 });
}

async function audit(actor, action, resource, resourceId, summary, jobId = null) {
  await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action, resource, resourceId, summary, metadata: jobId ? { ongoingJobId: jobId } : {} });
}

export async function getProcurementWorkspace(jobId) {
  const job = await db.query('SELECT id FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL', [jobId]);
  if (!job.rows.length) throw Object.assign(new Error('Ongoing Job not found.'), { status: 404 });
  const [suppliers, rfqs, quotes, commitments, updates, workPackages] = await Promise.all([
      db.query(`SELECT sp.id, sp.organization_id AS "organizationId", o.canonical_name AS name,
                    sp.status, sp.capability_tags AS "capabilityTags", sp.capability_notes AS "capabilityNotes"
             FROM supplier_profiles sp JOIN organizations o ON o.id = sp.organization_id
             WHERE sp.status = 'active' AND o.archived_at IS NULL ORDER BY o.canonical_name`),
      db.query(`SELECT sr.id, sr.title, sr.requirement, sr.required_by AS "requiredBy", sr.status,
                    sr.work_package_id AS "workPackageId", jsl.title AS "workPackageTitle", sr.created_at AS "createdAt"
             FROM supplier_rfqs sr LEFT JOIN job_scope_lines jsl ON jsl.id = sr.work_package_id
             WHERE sr.ongoing_job_id = $1::uuid ORDER BY sr.created_at DESC`, [jobId]),
      db.query(`SELECT sq.id, sq.supplier_rfq_id AS "rfqId", sq.supplier_profile_id AS "supplierId",
                    o.canonical_name AS "supplierName", sq.reference, sq.amount, sq.currency, sq.received_at AS "receivedAt",
                    sq.valid_until AS "validUntil", sq.lead_time_days AS "leadTimeDays", sq.status, sq.note
             FROM supplier_quotes sq JOIN supplier_profiles sp ON sp.id = sq.supplier_profile_id
             JOIN organizations o ON o.id = sp.organization_id JOIN supplier_rfqs sr ON sr.id = sq.supplier_rfq_id
             WHERE sr.ongoing_job_id = $1::uuid ORDER BY sq.amount, sq.received_at DESC`, [jobId]),
      db.query(`SELECT sc.id, sc.supplier_profile_id AS "supplierId", o.canonical_name AS "supplierName",
                    sc.supplier_quote_id AS "supplierQuoteId", sc.work_package_id AS "workPackageId", jsl.title AS "workPackageTitle",
                    sc.reference, sc.description, sc.status, sc.committed_amount AS "committedAmount",
                    sc.actual_amount AS "actualAmount", sc.currency, sc.expected_delivery_at AS "expectedDeliveryAt",
                    sc.actual_delivery_at AS "actualDeliveryAt", sc.created_at AS "createdAt"
             FROM supplier_commitments sc JOIN supplier_profiles sp ON sp.id = sc.supplier_profile_id
             JOIN organizations o ON o.id = sp.organization_id LEFT JOIN job_scope_lines jsl ON jsl.id = sc.work_package_id
             WHERE sc.ongoing_job_id = $1::uuid ORDER BY sc.created_at DESC`, [jobId]),
      db.query(`SELECT scu.id, scu.supplier_commitment_id AS "commitmentId", scu.update_type AS type, scu.note,
                    scu.created_at AS "createdAt", COALESCE(u.name, 'EGS Team') AS author
             FROM supplier_commitment_updates scu LEFT JOIN users u ON u.id = scu.created_by_user_id
             JOIN supplier_commitments sc ON sc.id = scu.supplier_commitment_id
             WHERE sc.ongoing_job_id = $1::uuid ORDER BY scu.created_at DESC`, [jobId]),
      db.query(`SELECT id, title FROM job_scope_lines WHERE ongoing_job_id = $1::uuid AND archived_at IS NULL ORDER BY display_order, created_at`, [jobId]),
  ]);
  const quoteRows = quotes.rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  const commitmentRows = commitments.rows.map((row) => ({
    ...row,
    committedAmount: Number(row.committedAmount),
    actualAmount: row.actualAmount == null ? null : Number(row.actualAmount),
    updates: updates.rows.filter((update) => update.commitmentId === row.id),
  }));
  const totals = commitmentRows.filter((row) => row.status !== 'cancelled').reduce((result, row) => ({
    committed: result.committed + row.committedAmount,
    actual: result.actual + (row.actualAmount ?? 0),
    actualKnown: result.actualKnown + (row.actualAmount == null ? 0 : 1),
  }), { committed: 0, actual: 0, actualKnown: 0 });
  return {
    suppliers: suppliers.rows,
    rfqs: rfqs.rows.map((rfq) => ({ ...rfq, quotes: quoteRows.filter((quote) => quote.rfqId === rfq.id) })),
    commitments: commitmentRows,
    workPackages: workPackages.rows,
    totals: { ...totals, variance: totals.actual - totals.committed },
    commitmentStatuses: COMMITMENT_STATUSES,
    rfqStatuses: RFQ_STATUSES,
    updateTypes: UPDATE_TYPES,
  };
}

export async function getSupplierDirectory() {
  const [suppliers, recentCommitments] = await Promise.all([
    db.query(`SELECT sp.id, sp.organization_id AS "organizationId", o.canonical_name AS name, sp.status,
                     sp.capability_tags AS "capabilityTags", sp.capability_notes AS "capabilityNotes",
                     COALESCE(metrics.jobs_count, 0)::int AS "jobsCount",
                     COALESCE(metrics.active_commitments, 0)::int AS "activeCommitments",
                     COALESCE(metrics.committed_spend, 0) AS "committedSpend",
                     COALESCE(metrics.actual_spend, 0) AS "actualSpend",
                     COALESCE(issues.issues_count, 0)::int AS "issuesCount", metrics.last_used_at AS "lastUsedAt",
                     COALESCE(contacts.emails, '{}') AS emails, COALESCE(contacts.phones, '{}') AS phones
              FROM supplier_profiles sp JOIN organizations o ON o.id = sp.organization_id
              LEFT JOIN LATERAL (
                SELECT COUNT(DISTINCT ongoing_job_id) AS jobs_count,
                       COUNT(*) FILTER (WHERE status NOT IN ('delivered', 'cancelled')) AS active_commitments,
                       SUM(committed_amount) FILTER (WHERE status <> 'cancelled') AS committed_spend,
                       SUM(actual_amount) FILTER (WHERE status <> 'cancelled') AS actual_spend,
                       MAX(created_at) AS last_used_at
                FROM supplier_commitments WHERE supplier_profile_id = sp.id
              ) metrics ON TRUE
              LEFT JOIN LATERAL (
                SELECT COUNT(*) AS issues_count FROM supplier_commitment_updates scu
                JOIN supplier_commitments sc ON sc.id = scu.supplier_commitment_id
                WHERE sc.supplier_profile_id = sp.id AND scu.update_type = 'issue'
              ) issues ON TRUE
              LEFT JOIN LATERAL (
                SELECT array_agg(DISTINCT original_value) FILTER (WHERE type = 'email' AND validity = 'valid') AS emails,
                       array_agg(DISTINCT original_value) FILTER (WHERE type IN ('phone', 'switchboard') AND validity = 'valid') AS phones
                FROM organization_contact_methods WHERE organization_id = o.id
              ) contacts ON TRUE
              WHERE o.archived_at IS NULL ORDER BY o.canonical_name`),
    db.query(`SELECT sc.id, sc.supplier_profile_id AS "supplierId", sc.ongoing_job_id AS "jobId",
                     oj.job_number AS "jobNumber", oj.title AS "jobTitle", sc.description, sc.status,
                     sc.committed_amount AS "committedAmount", sc.actual_amount AS "actualAmount", sc.currency,
                     sc.expected_delivery_at AS "expectedDeliveryAt", sc.actual_delivery_at AS "actualDeliveryAt",
                     sc.created_at AS "createdAt"
              FROM supplier_commitments sc JOIN ongoing_jobs oj ON oj.id = sc.ongoing_job_id
              ORDER BY sc.created_at DESC`),
  ]);
  const commitmentRows = recentCommitments.rows.map((row) => ({ ...row, committedAmount: Number(row.committedAmount), actualAmount: row.actualAmount == null ? null : Number(row.actualAmount) }));
  const rows = suppliers.rows.map((row) => ({
    ...row,
    committedSpend: Number(row.committedSpend),
    actualSpend: Number(row.actualSpend),
    recentCommitments: commitmentRows.filter((item) => item.supplierId === row.id).slice(0, 8),
  }));
  const capabilities = [...new Set(rows.flatMap((row) => row.capabilityTags || []))].sort((a, b) => a.localeCompare(b));
  return { suppliers: rows, capabilities };
}

export async function createSupplier(jobId, payload = {}, actor = {}) {
  const name = text(payload.name); const organizationId = uuid(payload.organizationId);
  if (!name && !organizationId) throw Object.assign(new Error('Supplier name is required.'), { status: 400 });
  const tags = [...new Set((Array.isArray(payload.capabilityTags) ? payload.capabilityTags : String(payload.capabilityTags || '').split(',')).map(text).filter(Boolean))];
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    if (jobId) await assertJob(client, jobId);
    let resolvedOrganizationId = organizationId;
    if (!resolvedOrganizationId) {
      const existing = await client.query('SELECT id FROM organizations WHERE lower(canonical_name) = lower($1) AND archived_at IS NULL LIMIT 1', [name]);
      if (existing.rows.length) resolvedOrganizationId = existing.rows[0].id;
      else {
        const created = await client.query(`INSERT INTO organizations (canonical_name, organization_type) VALUES ($1, 'supplier') RETURNING id`, [name]);
        resolvedOrganizationId = created.rows[0].id;
      }
    }
    const result = await client.query(`INSERT INTO supplier_profiles (organization_id, capability_tags, capability_notes, created_by_user_id)
      VALUES ($1::uuid, $2::text[], $3, $4::uuid)
      ON CONFLICT (organization_id) DO UPDATE SET status = 'active', capability_tags = EXCLUDED.capability_tags,
        capability_notes = COALESCE(EXCLUDED.capability_notes, supplier_profiles.capability_notes), updated_at = NOW()
      RETURNING id`, [resolvedOrganizationId, tags, text(payload.capabilityNotes), actor?.userId || null]);
    await client.query('COMMIT');
    await audit(actor, 'create', 'supplier_profile', result.rows[0].id, `Added supplier: ${name || resolvedOrganizationId}`, jobId);
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}

export async function updateSupplierProfile(supplierId, payload = {}, actor = {}) {
  const tags = [...new Set((Array.isArray(payload.capabilityTags) ? payload.capabilityTags : String(payload.capabilityTags || '').split(',')).map(text).filter(Boolean))];
  const status = payload.status === 'inactive' ? 'inactive' : 'active';
  const result = await db.query(`UPDATE supplier_profiles SET capability_tags = $2::text[], capability_notes = $3,
    status = $4, updated_at = NOW() WHERE id = $1::uuid RETURNING id`, [supplierId, tags, text(payload.capabilityNotes), status]);
  if (!result.rows.length) throw Object.assign(new Error('Supplier not found.'), { status: 404 });
  await audit(actor, 'update', 'supplier_profile', supplierId, 'Updated supplier capabilities and status');
  return { ok: true };
}

export async function updateSupplierRfq(jobId, rfqId, payload = {}, actor = {}) {
  if (!RFQ_STATUSES.includes(payload.status)) throw Object.assign(new Error('Invalid RFQ status.'), { status: 400 });
  const result = await db.query(`UPDATE supplier_rfqs SET status = $3, updated_at = NOW()
    WHERE id = $1::uuid AND ongoing_job_id = $2::uuid RETURNING id`, [rfqId, jobId, payload.status]);
  if (!result.rows.length) throw Object.assign(new Error('Supplier RFQ not found.'), { status: 404 });
  await audit(actor, 'update', 'supplier_rfq', rfqId, `Supplier RFQ updated to ${payload.status}`, jobId);
  return { ok: true };
}

export async function createSupplierRfq(jobId, payload = {}, actor = {}) {
  const title = text(payload.title);
  if (!title) throw Object.assign(new Error('RFQ title is required.'), { status: 400 });
  const workPackageId = uuid(payload.workPackageId);
  const client = await db.getClient();
  try { await assertJob(client, jobId); await assertWorkPackage(client, jobId, workPackageId); } finally { client.release(); }
  const result = await db.query(`INSERT INTO supplier_rfqs (ongoing_job_id, work_package_id, title, requirement, required_by, status, created_by_user_id)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid) RETURNING id`, [jobId, workPackageId, title,
      text(payload.requirement), payload.requiredBy || null, RFQ_STATUSES.includes(payload.status) ? payload.status : 'draft', actor?.userId || null]);
  await audit(actor, 'create', 'supplier_rfq', result.rows[0].id, `Created supplier RFQ: ${title}`, jobId);
  return result.rows[0];
}

export async function createSupplierQuote(jobId, rfqId, payload = {}, actor = {}) {
  const supplierId = uuid(payload.supplierId);
  if (!supplierId) throw Object.assign(new Error('Select a supplier.'), { status: 400 });
  const valid = await db.query(`SELECT sr.id FROM supplier_rfqs sr, supplier_profiles sp WHERE sr.id = $1::uuid AND sr.ongoing_job_id = $2::uuid AND sp.id = $3::uuid`, [rfqId, jobId, supplierId]);
  if (!valid.rows.length) throw Object.assign(new Error('RFQ or supplier not found.'), { status: 404 });
  const result = await db.query(`INSERT INTO supplier_quotes (supplier_rfq_id, supplier_profile_id, reference, amount, currency, received_at, valid_until, lead_time_days, note, created_by_user_id)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5, COALESCE($6, NOW()), $7, $8, $9, $10::uuid) RETURNING id`, [rfqId, supplierId,
      text(payload.reference), money(payload.amount), currency(payload.currency), date(payload.receivedAt), payload.validUntil || null,
      payload.leadTimeDays === '' || payload.leadTimeDays == null ? null : Math.max(0, Number.parseInt(payload.leadTimeDays, 10)), text(payload.note), actor?.userId || null]);
  await audit(actor, 'create', 'supplier_quote', result.rows[0].id, 'Recorded supplier quotation', jobId);
  return result.rows[0];
}

export async function createSupplierCommitment(jobId, payload = {}, actor = {}) {
  const supplierId = uuid(payload.supplierId); const description = text(payload.description); const supplierQuoteId = uuid(payload.supplierQuoteId);
  if (!supplierId || !description) throw Object.assign(new Error('Supplier and commitment description are required.'), { status: 400 });
  const client = await db.getClient();
  try {
    await client.query('BEGIN'); await assertJob(client, jobId);
    const workPackageId = uuid(payload.workPackageId);
    await assertWorkPackage(client, jobId, workPackageId);
    const supplier = await client.query('SELECT id FROM supplier_profiles WHERE id = $1::uuid AND status = \'active\'', [supplierId]);
    if (!supplier.rows.length) throw Object.assign(new Error('Active supplier not found.'), { status: 404 });
    let quote = null;
    if (supplierQuoteId) {
      const result = await client.query(`SELECT sq.id, sq.amount, sq.currency FROM supplier_quotes sq JOIN supplier_rfqs sr ON sr.id = sq.supplier_rfq_id
        WHERE sq.id = $1::uuid AND sq.supplier_profile_id = $2::uuid AND sr.ongoing_job_id = $3::uuid`, [supplierQuoteId, supplierId, jobId]);
      if (!result.rows.length) throw Object.assign(new Error('Supplier quotation does not belong to this Job and supplier.'), { status: 400 });
      quote = result.rows[0];
    }
    const amount = payload.committedAmount === '' || payload.committedAmount == null ? Number(quote?.amount || 0) : money(payload.committedAmount, 'Committed amount');
    const result = await client.query(`INSERT INTO supplier_commitments (ongoing_job_id, work_package_id, supplier_profile_id, supplier_quote_id,
      reference, description, status, committed_amount, currency, expected_delivery_at, created_by_user_id)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, 'committed', $7, $8, $9, $10::uuid) RETURNING id`,
      [jobId, workPackageId, supplierId, supplierQuoteId, text(payload.reference), description, amount,
        currency(payload.currency || quote?.currency), date(payload.expectedDeliveryAt), actor?.userId || null]);
    if (supplierQuoteId) {
      await client.query(`UPDATE supplier_quotes SET status = CASE WHEN id = $1::uuid THEN 'accepted' ELSE CASE WHEN status = 'received' THEN 'rejected' ELSE status END END, updated_at = NOW()
        WHERE supplier_rfq_id = (SELECT supplier_rfq_id FROM supplier_quotes WHERE id = $1::uuid)`, [supplierQuoteId]);
    }
    await client.query('COMMIT');
    await audit(actor, 'create', 'supplier_commitment', result.rows[0].id, `Committed supplier work: ${description}`, jobId);
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}

export async function updateSupplierCommitment(jobId, commitmentId, payload = {}, actor = {}) {
  const current = await db.query('SELECT * FROM supplier_commitments WHERE id = $1::uuid AND ongoing_job_id = $2::uuid', [commitmentId, jobId]);
  if (!current.rows.length) throw Object.assign(new Error('Supplier commitment not found.'), { status: 404 });
  const row = current.rows[0]; const nextStatus = COMMITMENT_STATUSES.includes(payload.status) ? payload.status : row.status;
  const actual = Object.hasOwn(payload, 'actualAmount') ? (payload.actualAmount === '' || payload.actualAmount == null ? null : money(payload.actualAmount, 'Actual amount')) : row.actual_amount;
  await db.query(`UPDATE supplier_commitments SET status = $3, actual_amount = $4, expected_delivery_at = $5,
    actual_delivery_at = CASE WHEN $3 = 'delivered' THEN COALESCE($6, actual_delivery_at, NOW()) ELSE $6 END, updated_at = NOW()
    WHERE id = $1::uuid AND ongoing_job_id = $2::uuid`, [commitmentId, jobId, nextStatus, actual,
      Object.hasOwn(payload, 'expectedDeliveryAt') ? date(payload.expectedDeliveryAt) : row.expected_delivery_at,
      Object.hasOwn(payload, 'actualDeliveryAt') ? date(payload.actualDeliveryAt) : row.actual_delivery_at]);
  await audit(actor, 'update', 'supplier_commitment', commitmentId, `Supplier commitment updated to ${nextStatus}`, jobId);
  return { ok: true };
}

export async function addSupplierCommitmentUpdate(jobId, commitmentId, payload = {}, actor = {}) {
  const type = UPDATE_TYPES.includes(payload.type) ? payload.type : 'progress'; const note = text(payload.note);
  if (!note) throw Object.assign(new Error('Update note is required.'), { status: 400 });
  const current = await db.query('SELECT id FROM supplier_commitments WHERE id = $1::uuid AND ongoing_job_id = $2::uuid', [commitmentId, jobId]);
  if (!current.rows.length) throw Object.assign(new Error('Supplier commitment not found.'), { status: 404 });
  const result = await db.query(`INSERT INTO supplier_commitment_updates (supplier_commitment_id, update_type, note, created_by_user_id)
    VALUES ($1::uuid, $2, $3, $4::uuid) RETURNING id`, [commitmentId, type, note, actor?.userId || null]);
  if (type === 'delivery') await db.query(`UPDATE supplier_commitments SET status = 'delivered', actual_delivery_at = COALESCE(actual_delivery_at, NOW()), updated_at = NOW() WHERE id = $1::uuid`, [commitmentId]);
  if (type === 'cancellation') await db.query(`UPDATE supplier_commitments SET status = 'cancelled', updated_at = NOW() WHERE id = $1::uuid`, [commitmentId]);
  await audit(actor, 'create', 'supplier_commitment_update', result.rows[0].id, `Supplier ${type}: ${note}`, jobId);
  return result.rows[0];
}
