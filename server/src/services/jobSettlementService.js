import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

// Governing decision: CRM_FOUNDATION_SPEC D-040. Zoho Books owns invoices,
// credits, payments and balance. EGS owns the operational milestone position,
// the Zoho reference and physical delivery state. Nothing here posts ledger
// entries or lets a person hand-enter an invoice amount.
export const MILESTONE_STATES = Object.freeze([
  'waiting_po_approval',
  'awaiting_initial_downpayment',
  'initial_payment_received',
  'awaiting_final_payment',
  'fully_paid',
]);

export const MILESTONE_LABELS = Object.freeze({
  waiting_po_approval: 'Waiting for PO / approval',
  awaiting_initial_downpayment: 'Awaiting initial downpayment',
  initial_payment_received: 'Initial payment received',
  awaiting_final_payment: 'Awaiting final payment',
  fully_paid: 'Fully paid',
});

export const DELIVERY_STATES = Object.freeze(['not_delivered', 'delivered']);

function text(value) { return String(value ?? '').trim() || null; }
function uuid(value) { const result = text(value); return result && /^[0-9a-f-]{36}$/i.test(result) ? result : null; }
function amount(value, label = 'Amount') {
  if (value === undefined || value === null || value === '') return null;
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) throw Object.assign(new Error(`${label} must be zero or more.`), { status: 400 });
  return result;
}
function numeric(row, fields) {
  const result = { ...row };
  fields.forEach((field) => { result[field] = result[field] == null ? null : Number(result[field]); });
  return result;
}

async function requireJob(jobId, client = db) {
  const id = uuid(jobId);
  if (!id) throw Object.assign(new Error('Valid Job is required.'), { status: 400 });
  const result = await client.query(
    `SELECT id, title, job_number AS "jobNumber", summary_stage AS stage,
            physical_delivery_state AS "physicalDeliveryState"
       FROM ongoing_jobs WHERE id=$1::uuid AND deleted_at IS NULL`, [id],
  );
  if (!result.rows.length) throw Object.assign(new Error('Ongoing Job not found.'), { status: 404 });
  return result.rows[0];
}

async function audit(actor, action, resourceId, summary, metadata = {}) {
  await writeAuditLog({
    userId: actor?.userId || null,
    userDisplayName: actor?.displayName || 'EGS Team',
    action, resource: 'job_settlement', resourceId, summary, metadata,
  });
}

const SETTLEMENT_COLUMNS = `
  ongoing_job_id AS "ongoingJobId", job_number AS "jobNumber", title,
  value_aed AS "valueAed", physical_delivery_state AS "physicalDeliveryState",
  physically_delivered_at AS "physicallyDeliveredAt",
  zoho_invoice_count AS "zohoInvoiceCount", invoiced_total AS "invoicedTotal",
  outstanding, received_total AS "receivedTotal", last_synced_at AS "lastSyncedAt",
  earliest_unpaid_due_on AS "earliestUnpaidDueOn",
  operational_milestone_state AS "milestoneState",
  milestone_zoho_reference AS "milestoneZohoReference",
  milestone_confirmed_at AS "milestoneConfirmedAt",
  milestone_confirmed_from AS "milestoneConfirmedFrom",
  settlement_source AS "settlementSource", payment_status AS "paymentStatus",
  is_overdue AS "isOverdue", days_overdue AS "daysOverdue",
  is_delivered_but_unpaid AS "isDeliveredButUnpaid",
  is_ready_for_job_done AS "isReadyForJobDone",
  settlement_unrecorded AS "settlementUnrecorded"
`;

const MONEY_FIELDS = ['valueAed', 'invoicedTotal', 'outstanding', 'receivedTotal'];

export async function getJobSettlement(jobId) {
  const job = await requireJob(jobId);
  const [status, milestones] = await Promise.all([
    db.query(`SELECT ${SETTLEMENT_COLUMNS} FROM job_settlement_status WHERE ongoing_job_id=$1::uuid`, [job.id]),
    db.query(
      `SELECT fm.id, fm.milestone, fm.amount, fm.currency, fm.milestone_state AS "milestoneState",
              fm.due_on AS "dueOn", fm.display_order AS "displayOrder", fm.zoho_reference AS "zohoReference",
              fm.confirmed_from AS "confirmedFrom", fm.confirmed_at AS "confirmedAt",
              COALESCE(u.name, 'EGS Team') AS "confirmedBy"
         FROM financial_milestones fm
         LEFT JOIN users u ON u.id = fm.confirmed_by_user_id
        WHERE fm.ongoing_job_id=$1::uuid
        ORDER BY fm.display_order, fm.id`, [job.id],
    ),
  ]);

  return {
    job,
    // Always present, even before anything is recorded, so the UI can say
    // "unrecorded" rather than implying nothing is owed.
    settlement: numeric(status.rows[0] || {
      ongoingJobId: job.id, settlementSource: 'unrecorded', paymentStatus: 'unrecorded',
      settlementUnrecorded: true, physicalDeliveryState: job.physicalDeliveryState,
    }, MONEY_FIELDS),
    milestones: milestones.rows.map((row) => numeric(row, ['amount'])),
    milestoneStates: MILESTONE_STATES.map((value) => ({ value, label: MILESTONE_LABELS[value] })),
    // Set only once the Zoho sync exists; until then the UI must not present
    // a hand-set milestone as a reconciled balance.
    zohoIntegrationActive: (status.rows[0]?.settlementSource === 'zoho_sync'),
  };
}

export async function setPhysicalDelivery(jobId, payload = {}, actor = {}) {
  const job = await requireJob(jobId);
  const state = text(payload.state);
  if (!DELIVERY_STATES.includes(state)) {
    throw Object.assign(new Error('Physical delivery must be not_delivered or delivered.'), { status: 400 });
  }
  const deliveredAt = state === 'delivered' ? (payload.deliveredAt ? new Date(payload.deliveredAt) : new Date()) : null;
  if (deliveredAt && Number.isNaN(deliveredAt.getTime())) {
    throw Object.assign(new Error('A valid delivery date is required.'), { status: 400 });
  }

  await db.query(
    `UPDATE ongoing_jobs
        SET physical_delivery_state=$2,
            physically_delivered_at=$3,
            physical_delivery_updated_by_user_id=$4::uuid,
            updated_at=NOW()
      WHERE id=$1::uuid`,
    [job.id, state, deliveredAt, actor?.userId || null],
  );

  await audit(actor, 'settlement.physical_delivery', job.id,
    state === 'delivered' ? 'Job marked physically delivered' : 'Job marked not delivered',
    { previousState: job.physicalDeliveryState, state, deliveredAt });

  return getJobSettlement(job.id);
}

export async function saveMilestone(jobId, payload = {}, actor = {}) {
  const job = await requireJob(jobId);
  const milestoneState = text(payload.milestoneState);
  if (milestoneState && !MILESTONE_STATES.includes(milestoneState)) {
    throw Object.assign(new Error('Choose a valid operational payment milestone.'), { status: 400 });
  }
  const label = text(payload.milestone) || (milestoneState ? MILESTONE_LABELS[milestoneState] : null);
  if (!label) throw Object.assign(new Error('A milestone description is required.'), { status: 400 });

  const milestoneId = uuid(payload.id);
  const values = [
    job.id, label, amount(payload.amount, 'Milestone amount') ?? 0,
    text(payload.currency) || 'AED', milestoneState,
    payload.dueOn || null, Number(payload.displayOrder) || 0,
    text(payload.zohoReference), actor?.userId || null,
  ];

  let saved;
  if (milestoneId) {
    const result = await db.query(
      `UPDATE financial_milestones
          SET milestone=$2, amount=$3, currency=$4, milestone_state=$5, due_on=$6,
              display_order=$7, zoho_reference=$8,
              confirmed_from='human', confirmed_at=NOW(), confirmed_by_user_id=$9::uuid
        WHERE id=$10::uuid AND ongoing_job_id=$1::uuid
        RETURNING id`,
      [...values, milestoneId],
    );
    if (!result.rows.length) throw Object.assign(new Error('Milestone not found on this Job.'), { status: 404 });
    saved = result.rows[0];
  } else {
    const result = await db.query(
      `INSERT INTO financial_milestones
         (ongoing_job_id, milestone, amount, currency, milestone_state, due_on,
          display_order, zoho_reference, confirmed_by_user_id, confirmed_from, confirmed_at, is_paid)
       VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9::uuid,'human',NOW(),FALSE)
       RETURNING id`,
      values,
    );
    saved = result.rows[0];
  }

  await audit(actor, milestoneId ? 'settlement.milestone_updated' : 'settlement.milestone_recorded', job.id,
    `Payment position set to ${milestoneState ? MILESTONE_LABELS[milestoneState] : label}`,
    { milestoneId: saved.id, milestoneState, zohoReference: text(payload.zohoReference) });

  return getJobSettlement(job.id);
}

export async function deleteMilestone(jobId, milestoneId, actor = {}) {
  const job = await requireJob(jobId);
  const id = uuid(milestoneId);
  if (!id) throw Object.assign(new Error('Valid milestone is required.'), { status: 400 });
  const result = await db.query(
    `DELETE FROM financial_milestones WHERE id=$1::uuid AND ongoing_job_id=$2::uuid RETURNING milestone`,
    [id, job.id],
  );
  if (!result.rows.length) throw Object.assign(new Error('Milestone not found on this Job.'), { status: 404 });
  await audit(actor, 'settlement.milestone_removed', job.id, `Removed payment milestone: ${result.rows[0].milestone}`, { milestoneId: id });
  return getJobSettlement(job.id);
}

// The two exception queues this tranche exists to produce, plus the silence
// queue so Jobs nobody has recorded a position for stay visible.
export async function getSettlementQueues({ limit = 100 } = {}) {
  const cap = Math.max(1, Math.min(500, Number(limit) || 100));
  const rows = await db.query(
    `SELECT ${SETTLEMENT_COLUMNS} FROM job_settlement_status
      WHERE physical_delivery_state='delivered' OR settlement_unrecorded OR is_overdue
      ORDER BY is_overdue DESC, days_overdue DESC NULLS LAST, physically_delivered_at DESC NULLS LAST
      LIMIT $1`, [cap],
  );
  // The row list is capped for display, so totals are counted separately.
  // Without this the UI badge would report the capped page size as the real
  // number and quietly understate how much is outstanding or unrecorded.
  const totals = await db.query(
    `SELECT COUNT(*) FILTER (WHERE is_delivered_but_unpaid)::int AS "deliveredButUnpaid",
            COUNT(*) FILTER (WHERE is_overdue)::int             AS overdue,
            COUNT(*) FILTER (WHERE settlement_unrecorded)::int  AS unrecorded,
            COUNT(*) FILTER (WHERE is_ready_for_job_done)::int   AS "readyForJobDone"
       FROM job_settlement_status`,
  );
  const items = rows.rows.map((row) => numeric(row, MONEY_FIELDS));
  return {
    deliveredButUnpaid: items.filter((item) => item.isDeliveredButUnpaid),
    // Overdue is Zoho-derived only. A hand-set milestone has no due date, so
    // this queue stays empty until the sync exists rather than guessing.
    overdue: items.filter((item) => item.isOverdue),
    unrecorded: items.filter((item) => item.settlementUnrecorded),
    readyForJobDone: items.filter((item) => item.isReadyForJobDone),
    totals: totals.rows[0],
    truncated: items.length >= cap,
  };
}
