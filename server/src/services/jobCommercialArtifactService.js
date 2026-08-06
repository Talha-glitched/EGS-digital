import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.resolve(serviceDir, '../../../uploads/job-artifacts');
const DECISIONS = new Set(['approved', 'rejected', 'changes_requested', 'withdrawn']);

function cleanText(value) { return String(value || '').trim() || null; }
function uuid(value) { const v = cleanText(value); return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null; }
function safeName(value) { return path.basename(String(value || 'artifact')).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 180); }
function dateOnly(value) { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); }
function parseQuoteLines(value) {
  if (!value) return [];
  try { const rows = typeof value === 'string' ? JSON.parse(value) : value; if (!Array.isArray(rows)) throw new Error(); return rows; }
  catch { throw Object.assign(new Error('Quotation lines must be a valid list.'), { status: 400 }); }
}

async function assertJob(client, jobId) {
  const result = await client.query('SELECT id, job_number FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL', [jobId]);
  if (!result.rows.length) throw Object.assign(new Error('Ongoing Job not found.'), { status: 404 });
  return result.rows[0];
}

async function workPackageForJob(client, jobId, value) {
  const id=uuid(value); if(!id) return null;
  const result=await client.query(`SELECT id FROM job_scope_lines WHERE id=$1::uuid AND ongoing_job_id=$2::uuid AND archived_at IS NULL`,[id,jobId]);
  if(!result.rows.length) throw Object.assign(new Error('Work package does not belong to this Job.'),{status:400}); return id;
}

async function persistFile(file, jobId, familyType, familyId) {
  if (!file?.buffer) throw Object.assign(new Error('Attach the exact design or quotation file.'), { status: 400 });
  const targetDir = path.join(uploadRoot, String(jobId), familyType, String(familyId));
  await fs.mkdir(targetDir, { recursive: true });
  const storedName = `${crypto.randomUUID()}-${safeName(file.originalname)}`;
  const filePath = path.join(targetDir, storedName);
  await fs.writeFile(filePath, file.buffer, { flag: 'wx' });
  return {
    filePath,
    publicUrl: `/uploads/job-artifacts/${jobId}/${familyType}/${familyId}/${storedName}`,
    originalFileName: file.originalname,
    mimeType: file.mimetype || null,
    sizeBytes: file.size || file.buffer.length,
    checksum: crypto.createHash('sha256').update(file.buffer).digest('hex'),
  };
}

async function audit(actor, action, resource, resourceId, summary, jobId) {
  await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action, resource, resourceId, summary, metadata: { ongoingJobId: jobId } });
}

export async function getJobCommercialArtifacts(jobId) {
  const client = await db.getClient();
  try {
    await assertJob(client, jobId);
    const [sets, designs, quotes, quoteVersions, quoteLines, decisions, packages, services, uoms] = await Promise.all([
      db.query(`SELECT ds.id, ds.title, ds.work_package_id AS "workPackageId", ds.created_at AS "createdAt", jsl.title AS "workPackageTitle"
                    FROM design_sets ds LEFT JOIN job_scope_lines jsl ON jsl.id = ds.work_package_id
                    WHERE ds.ongoing_job_id = $1::uuid AND ds.archived_at IS NULL ORDER BY ds.created_at`, [jobId]),
      db.query(`SELECT dv.id, dv.design_set_id AS "designSetId", dv.version_number AS version, dv.status,
                           dv.original_file_name AS "fileName", dv.public_url AS url, dv.mime_type AS "mimeType",
                           dv.size_bytes AS "sizeBytes", dv.checksum_sha256 AS checksum, dv.revision_note AS "revisionNote",
                           dv.issued_at AS "issuedAt", dv.created_at AS "createdAt", COALESCE(u.name, 'EGS Team') AS author
                    FROM design_versions dv LEFT JOIN users u ON u.id = dv.created_by_user_id
                    JOIN design_sets ds ON ds.id = dv.design_set_id
                    WHERE ds.ongoing_job_id = $1::uuid ORDER BY dv.version_number DESC`, [jobId]),
      db.query(`SELECT q.id, q.quote_family_number AS "familyNumber", q.title, q.work_package_id AS "workPackageId",
                           q.created_at AS "createdAt", jsl.title AS "workPackageTitle"
                    FROM quotes q LEFT JOIN job_scope_lines jsl ON jsl.id = q.work_package_id
                    WHERE q.ongoing_job_id = $1::uuid AND q.archived_at IS NULL ORDER BY q.created_at`, [jobId]),
      db.query(`SELECT qv.id, qv.quote_id AS "quoteId", qv.version_number AS version, qv.status,
                           qv.issued_at AS "issuedAt", qv.valid_until AS "validUntil", qv.total_amount AS "totalAmount",
                           qv.currency, qv.original_file_name AS "fileName", qv.public_url AS url,
                           qv.mime_type AS "mimeType", qv.size_bytes AS "sizeBytes", qv.checksum_sha256 AS checksum,
                           qv.revision_note AS "revisionNote", qv.created_at AS "createdAt", COALESCE(u.name, 'EGS Team') AS author
                    FROM quote_versions qv LEFT JOIN users u ON u.id = qv.created_by_user_id
                    JOIN quotes q ON q.id = qv.quote_id WHERE q.ongoing_job_id = $1::uuid ORDER BY qv.version_number DESC`, [jobId]),
      db.query(`SELECT ql.id, ql.quote_version_id AS "quoteVersionId", ql.work_package_id AS "workPackageId",
                           ql.job_phase_id AS "phaseId", ql.job_location_id AS "locationId", ql.service_offering_id AS "serviceOfferingId",
                           ql.uom_id AS "uomId", ql.quantity, ql.unit_price AS "unitPrice", ql.line_total AS "lineTotal",
                           ql.description_snapshot AS description, ql.service_label_snapshot AS "serviceLabel",
                           ql.uom_label_snapshot AS "uomLabel", ql.work_package_title_snapshot AS "workPackageTitle",
                           ql.phase_name_snapshot AS "phaseName", ql.location_name_snapshot AS "locationName", ql.display_order AS "displayOrder"
                    FROM quote_lines ql JOIN quote_versions qv ON qv.id=ql.quote_version_id JOIN quotes q ON q.id=qv.quote_id
                    WHERE q.ongoing_job_id=$1::uuid ORDER BY ql.display_order,ql.id`, [jobId]),
      db.query(`SELECT ad.id, ad.artifact_type AS "artifactType", ad.design_version_id AS "designVersionId",
                           ad.quote_version_id AS "quoteVersionId", ad.decision, ad.decision_note AS note,
                           ad.evidence_reference AS "evidenceReference", ad.decided_at AS "decidedAt",
                           source.conversation_id AS "sourceConversationId", source.message_id AS "sourceMessageId",
                           COALESCE(p.display_name, 'Client contact not specified') AS "decidedBy",
                           COALESCE(u.name, 'EGS Team') AS "recordedBy"
                    FROM artifact_decisions ad
                    LEFT JOIN people p ON p.id = ad.decided_by_person_id
                    LEFT JOIN users u ON u.id = ad.recorded_by_user_id
                    LEFT JOIN LATERAL (
                      SELECT cjl.conversation_id, cja.message_id
                      FROM communication_job_actions cja
                      JOIN conversation_job_links cjl ON cjl.id = cja.conversation_job_link_id
                      WHERE cja.target_table = 'artifact_decisions' AND cja.target_entity_id = ad.id
                      ORDER BY cja.created_at DESC LIMIT 1
                    ) source ON TRUE
                    WHERE ad.ongoing_job_id = $1::uuid ORDER BY ad.decided_at DESC`, [jobId]),
      db.query(`SELECT w.id, COALESCE(w.title,w.description,'Untitled work package') AS title,
                           w.service_offering_id AS "serviceOfferingId", w.uom_id AS "uomId", w.job_phase_id AS "phaseId", w.job_location_id AS "locationId",
                           so.canonical_label AS "serviceLabel", u.label AS "uomLabel"
                    FROM job_scope_lines w LEFT JOIN service_offerings so ON so.id=w.service_offering_id LEFT JOIN uoms u ON u.id=w.uom_id
                    WHERE w.ongoing_job_id = $1::uuid AND w.archived_at IS NULL ORDER BY w.display_order,w.created_at`, [jobId]),
      db.query(`SELECT id, canonical_label AS label FROM service_offerings WHERE active_to IS NULL ORDER BY canonical_label`),
      db.query(`SELECT id, label, stable_code AS code FROM uoms ORDER BY label`),
    ]);
    const decisionByDesign = decisions.rows.reduce((grouped, decision) => {
      if (decision.designVersionId) (grouped[decision.designVersionId] ||= []).push(decision);
      return grouped;
    }, {});
    const decisionByQuote = decisions.rows.reduce((grouped, decision) => {
      if (decision.quoteVersionId) (grouped[decision.quoteVersionId] ||= []).push(decision);
      return grouped;
    }, {});
    return {
      designSets: sets.rows.map((set) => ({ ...set, versions: designs.rows.filter((v) => v.designSetId === set.id).map((v) => ({ ...v, decisions: decisionByDesign[v.id] || [] })) })),
      quotes: quotes.rows.map((quote) => ({ ...quote, versions: quoteVersions.rows.filter((v) => v.quoteId === quote.id).map((v) => ({ ...v, totalAmount: v.totalAmount == null ? null : Number(v.totalAmount), lines: quoteLines.rows.filter((line) => line.quoteVersionId === v.id).map((line) => ({ ...line, quantity: line.quantity == null ? null : Number(line.quantity), unitPrice: line.unitPrice == null ? null : Number(line.unitPrice), lineTotal: line.lineTotal == null ? null : Number(line.lineTotal) })), decisions: decisionByQuote[v.id] || [] })) })),
      workPackages: packages.rows,
      services: services.rows,
      uoms: uoms.rows,
      decisionOptions: [...DECISIONS],
    };
  } finally { client.release(); }
}

export async function createDesignSet(jobId, payload = {}, actor = {}) {
  const client = await db.getClient();
  try {
    await assertJob(client, jobId);
    const title = cleanText(payload.title);
    if (!title) throw Object.assign(new Error('Design title is required.'), { status: 400 });
    const workPackageId=await workPackageForJob(client,jobId,payload.workPackageId);
    const result = await client.query(`INSERT INTO design_sets (ongoing_job_id, work_package_id, title, created_by_user_id)
      VALUES ($1::uuid, $2::uuid, $3, $4::uuid) RETURNING id, title, work_package_id AS "workPackageId", created_at AS "createdAt"`,
      [jobId, workPackageId, title, actor?.userId || null]);
    await audit(actor, 'create', 'design_set', result.rows[0].id, `Created design series: ${title}`, jobId);
    return result.rows[0];
  } finally { client.release(); }
}

export async function addDesignVersion(jobId, designSetId, payload = {}, file, actor = {}) {
  const client = await db.getClient(); let stored;
  try {
    await client.query('BEGIN');
    await assertJob(client, jobId);
    const family = await client.query('SELECT id FROM design_sets WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL FOR UPDATE', [designSetId, jobId]);
    if (!family.rows.length) throw Object.assign(new Error('Design series not found.'), { status: 404 });
    stored = await persistFile(file, jobId, 'designs', designSetId);
    const result = await client.query(`INSERT INTO design_versions (
      ongoing_job_id, design_set_id, version_number, status, file_path, original_file_name, public_url,
      mime_type, size_bytes, checksum_sha256, revision_note, created_by_user_id, issued_at
    ) VALUES ($1::uuid, $2::uuid, (SELECT COALESCE(MAX(version_number), 0) + 1 FROM design_versions WHERE design_set_id = $2::uuid),
      $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid, CASE WHEN $3 = 'issued' THEN NOW() ELSE NULL END)
    RETURNING id, version_number AS version`, [jobId, designSetId, payload.status === 'issued' ? 'issued' : 'draft', stored.filePath,
      stored.originalFileName, stored.publicUrl, stored.mimeType, stored.sizeBytes, stored.checksum, cleanText(payload.revisionNote), actor?.userId || null]);
    await client.query('COMMIT');
    await audit(actor, 'create', 'design_version', result.rows[0].id, `Added design V${result.rows[0].version}`, jobId);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (stored?.filePath) await fs.unlink(stored.filePath).catch(() => {});
    throw error;
  } finally { client.release(); }
}

export async function createQuote(jobId, payload = {}, actor = {}) {
  const client = await db.getClient();
  try {
    const job = await assertJob(client, jobId);
    const title = cleanText(payload.title);
    if (!title) throw Object.assign(new Error('Quotation title is required.'), { status: 400 });
    const familyNumber = cleanText(payload.familyNumber) || `${job.job_number || 'Q'}-${Date.now().toString().slice(-6)}`;
    const workPackageId=await workPackageForJob(client,jobId,payload.workPackageId);
    const result = await client.query(`INSERT INTO quotes (ongoing_job_id, quote_family_number, title, work_package_id, created_by_user_id)
      VALUES ($1::uuid, $2, $3, $4::uuid, $5::uuid)
      RETURNING id, quote_family_number AS "familyNumber", title, work_package_id AS "workPackageId", created_at AS "createdAt"`,
      [jobId, familyNumber, title, workPackageId, actor?.userId || null]);
    await audit(actor, 'create', 'quote', result.rows[0].id, `Created quotation series: ${title}`, jobId);
    return result.rows[0];
  } finally { client.release(); }
}

export async function addQuoteVersion(jobId, quoteId, payload = {}, file, actor = {}) {
  const client = await db.getClient(); let stored;
  try {
    await client.query('BEGIN');
    await assertJob(client, jobId);
    const family = await client.query('SELECT id FROM quotes WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL FOR UPDATE', [quoteId, jobId]);
    if (!family.rows.length) throw Object.assign(new Error('Quotation series not found.'), { status: 404 });
    const status = payload.status === 'issued' ? 'issued' : 'draft';
    const rawLines = parseQuoteLines(payload.quoteLines); if (rawLines.length > 200) throw Object.assign(new Error('A quotation version cannot contain more than 200 lines.'), { status: 400 });
    if (status === 'issued' && !rawLines.length) throw Object.assign(new Error('Add at least one structured line before issuing a quotation.'), { status: 400 });
    const [packageRows, serviceRows, uomRows] = await Promise.all([
      client.query(`SELECT w.id,COALESCE(w.title,w.description,'Untitled work package') AS title,w.service_offering_id,w.uom_id,w.job_phase_id,w.job_location_id,so.canonical_label AS service_label,u.label AS uom_label,p.name AS phase_name,l.name AS location_name FROM job_scope_lines w LEFT JOIN service_offerings so ON so.id=w.service_offering_id LEFT JOIN uoms u ON u.id=w.uom_id LEFT JOIN job_phases p ON p.id=w.job_phase_id LEFT JOIN job_locations l ON l.id=w.job_location_id WHERE w.ongoing_job_id=$1::uuid AND w.archived_at IS NULL`,[jobId]),
      client.query(`SELECT id,canonical_label FROM service_offerings WHERE active_to IS NULL`),
      client.query(`SELECT id,label FROM uoms`),
    ]);
    const packageMap=new Map(packageRows.rows.map((row)=>[row.id,row])); const serviceMap=new Map(serviceRows.rows.map((row)=>[row.id,row])); const uomMap=new Map(uomRows.rows.map((row)=>[row.id,row]));
    const lines=rawLines.map((line,index)=>{ const workPackageId=uuid(line.workPackageId); const pack=workPackageId?packageMap.get(workPackageId):null; if(workPackageId&&!pack) throw Object.assign(new Error(`Quotation line ${index+1} has an invalid work package.`),{status:400}); const serviceOfferingId=uuid(line.serviceOfferingId)||pack?.service_offering_id||null; const uomId=uuid(line.uomId)||pack?.uom_id||null; if(serviceOfferingId&&!serviceMap.has(serviceOfferingId)) throw Object.assign(new Error(`Quotation line ${index+1} has an invalid service.`),{status:400}); if(uomId&&!uomMap.has(uomId)) throw Object.assign(new Error(`Quotation line ${index+1} has an invalid UOM.`),{status:400}); const description=cleanText(line.description)||pack?.title; const quantity=Number(line.quantity); const unitPrice=Number(line.unitPrice); if(!description||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(unitPrice)||unitPrice<0) throw Object.assign(new Error(`Quotation line ${index+1} requires a description, positive quantity and non-negative unit price.`),{status:400}); return {workPackageId,serviceOfferingId,uomId,phaseId:pack?.job_phase_id||null,locationId:pack?.job_location_id||null,description,quantity,unitPrice,lineTotal:Math.round(quantity*unitPrice*100)/100,serviceLabel:serviceOfferingId?serviceMap.get(serviceOfferingId).canonical_label:null,uomLabel:uomId?uomMap.get(uomId).label:null,workPackageTitle:pack?.title||null,phaseName:pack?.phase_name||null,locationName:pack?.location_name||null,displayOrder:index+1}; });
    const lineTotal=lines.reduce((sum,line)=>sum+line.lineTotal,0); const suppliedAmount=payload.totalAmount===''||payload.totalAmount==null?null:Number(payload.totalAmount); if(suppliedAmount!=null&&(!Number.isFinite(suppliedAmount)||suppliedAmount<0)) throw Object.assign(new Error('Quotation total must be zero or more.'),{status:400}); if(lines.length&&suppliedAmount!=null&&Math.abs(suppliedAmount-lineTotal)>0.01) throw Object.assign(new Error(`Quotation total must equal the structured line total (${lineTotal.toFixed(2)} AED).`),{status:400}); const amount=lines.length?lineTotal:suppliedAmount;
    stored = await persistFile(file, jobId, 'quotations', quoteId);
    const result = await client.query(`INSERT INTO quote_versions (
      quote_id, version_number, status, issued_at, valid_until, total_amount, currency,
      original_file_name, file_path, public_url, mime_type, size_bytes, checksum_sha256,
      revision_note, created_by_user_id
    ) VALUES ($1::uuid, (SELECT COALESCE(MAX(version_number), 0) + 1 FROM quote_versions WHERE quote_id = $1::uuid),
      $2, CASE WHEN $2 = 'issued' THEN NOW() ELSE NULL END, $3, $4, 'AED', $5, $6, $7, $8, $9, $10, $11, $12::uuid)
    RETURNING id, version_number AS version`, [quoteId, status, dateOnly(payload.validUntil), Number.isFinite(amount) ? amount : null,
      stored.originalFileName, stored.filePath, stored.publicUrl, stored.mimeType, stored.sizeBytes, stored.checksum,
      cleanText(payload.revisionNote), actor?.userId || null]);
    for (const line of lines) await client.query(`INSERT INTO quote_lines (quote_version_id,work_package_id,job_phase_id,job_location_id,service_offering_id,uom_id,quantity,unit_price,line_total,description_snapshot,service_label_snapshot,uom_label_snapshot,work_package_title_snapshot,phase_name_snapshot,location_name_snapshot,display_order) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,[result.rows[0].id,line.workPackageId,line.phaseId,line.locationId,line.serviceOfferingId,line.uomId,line.quantity,line.unitPrice,line.lineTotal,line.description,line.serviceLabel,line.uomLabel,line.workPackageTitle,line.phaseName,line.locationName,line.displayOrder]);
    await client.query('COMMIT');
    await audit(actor, 'create', 'quote_version', result.rows[0].id, `Added quotation V${result.rows[0].version}`, jobId);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (stored?.filePath) await fs.unlink(stored.filePath).catch(() => {});
    throw error;
  } finally { client.release(); }
}

export async function recordArtifactDecision(jobId, payload = {}, actor = {}) {
  const client = await db.getClient();
  try {
    await assertJob(client, jobId);
    const artifactType = payload.artifactType === 'quotation' ? 'quotation' : 'design';
    const versionId = uuid(payload.versionId);
    const decision = cleanText(payload.decision)?.toLowerCase();
    if (!versionId || !DECISIONS.has(decision)) throw Object.assign(new Error('Exact artifact version and valid decision are required.'), { status: 400 });
    const ownership = artifactType === 'design'
      ? await client.query(`SELECT dv.id FROM design_versions dv JOIN design_sets ds ON ds.id = dv.design_set_id WHERE dv.id = $1::uuid AND ds.ongoing_job_id = $2::uuid`, [versionId, jobId])
      : await client.query(`SELECT qv.id FROM quote_versions qv JOIN quotes q ON q.id = qv.quote_id WHERE qv.id = $1::uuid AND q.ongoing_job_id = $2::uuid`, [versionId, jobId]);
    if (!ownership.rows.length) throw Object.assign(new Error('Artifact version not found for this Job.'), { status: 404 });
    const result = await client.query(`INSERT INTO artifact_decisions (
      ongoing_job_id, artifact_type, design_version_id, quote_version_id, decision,
      decided_by_person_id, decision_note, evidence_reference, recorded_by_user_id, decided_at
    ) VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6::uuid, $7, $8, $9::uuid, COALESCE($10::timestamptz, NOW())) RETURNING id`,
      [jobId, artifactType, artifactType === 'design' ? versionId : null, artifactType === 'quotation' ? versionId : null,
        decision, uuid(payload.decidedByPersonId), cleanText(payload.note), cleanText(payload.evidenceReference), actor?.userId || null,
        payload.decidedAt ? new Date(payload.decidedAt) : null]);
    await audit(actor, 'create', 'artifact_decision', result.rows[0].id, `${artifactType} marked ${decision.replace('_', ' ')}`, jobId);
    return result.rows[0];
  } finally { client.release(); }
}
