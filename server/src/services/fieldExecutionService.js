import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.resolve(serviceDir, '../../../uploads/field-execution');
const ACTIONS = new Set(['start', 'pause', 'progress', 'problem', 'complete']);
const PHOTO_TYPES = new Set(['progress_photo', 'installation_photo', 'final_photo', 'problem_photo']);
function text(value) { return String(value ?? '').trim() || null; }
function uuid(value) { const result = text(value); return result && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result) ? result : null; }
function safeName(value) { return path.basename(String(value || 'photo')).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 180); }
function dayBounds(value) {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}$/);
  const start = match ? new Date(`${match[0]}T00:00:00+04:00`) : new Date();
  if (!match) start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const upcoming = new Date(end); upcoming.setDate(upcoming.getDate() + 7);
  return { start, end, upcoming };
}

async function currentResource(client, userId) {
  if (!uuid(userId)) return null;
  const result = await client.query(`SELECT id, name, resource_type AS "resourceType" FROM operational_resources WHERE user_id=$1::uuid AND status='active' AND resource_type IN ('employee','contractor') LIMIT 1`, [userId]);
  return result.rows[0] || null;
}

export async function getTodayWorkspace(actor = {}, { date } = {}) {
  const { start, end, upcoming } = dayBounds(date);
  const client = await db.getClient();
  try {
    const resource = await currentResource(client, actor?.userId);
    const activities = await client.query(`SELECT ja.id, ja.ongoing_job_id AS "jobId", oj.job_number AS "jobNumber", oj.title AS "jobTitle", oj.summary_stage AS "jobStage",
      ja.title, ja.activity_type AS "activityType", ja.status, ja.blocker, ja.planned_start AS "plannedStart", ja.planned_end AS "plannedEnd", ja.completed_at AS "completedAt",
      ja.work_package_id AS "workPackageId", wp.title AS "workPackageTitle", ja.phase_id AS "phaseId", ph.name AS "phaseName",
      ja.location_id AS "locationId", loc.name AS "locationName", loc.address, loc.city, ja.owner_user_id AS "ownerUserId", ou.name AS "ownerName",
      timer.id AS "runningTimerId", timer.started_at AS "timerStartedAt",
      COALESCE(assigned.items,'[]'::jsonb) AS resources, COALESCE(inventory.items,'[]'::jsonb) AS inventory,
      COALESCE(packing.items,'[]'::jsonb) AS "packingLists", COALESCE(suppliers.items,'[]'::jsonb) AS suppliers,
      COALESCE(updates.items,'[]'::jsonb) AS updates, COALESCE(updates.evidence_count,0)::int AS "evidenceCount"
      FROM job_activities ja JOIN ongoing_jobs oj ON oj.id=ja.ongoing_job_id
      LEFT JOIN job_scope_lines wp ON wp.id=ja.work_package_id LEFT JOIN job_phases ph ON ph.id=ja.phase_id LEFT JOIN job_locations loc ON loc.id=ja.location_id LEFT JOIN users ou ON ou.id=ja.owner_user_id
      LEFT JOIN LATERAL (SELECT te.id,te.started_at FROM project_time_entries te WHERE te.job_activity_id=ja.id AND te.resource_id=$2::uuid AND te.status='running' ORDER BY te.started_at DESC LIMIT 1) timer ON TRUE
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'type',r.resource_type,'role',a.assignment_role) ORDER BY r.resource_type,r.name) AS items FROM job_activity_resource_assignments a JOIN operational_resources r ON r.id=a.resource_id WHERE a.job_activity_id=ja.id) assigned ON TRUE
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',ir.id,'itemName',ii.name,'sku',ii.sku,'quantity',ir.quantity,'status',ir.status,'assetTag',ia.asset_tag) ORDER BY ii.name) AS items FROM inventory_reservations ir JOIN inventory_items ii ON ii.id=ir.inventory_item_id LEFT JOIN inventory_assets ia ON ia.id=ir.inventory_asset_id WHERE ir.ongoing_job_id=ja.ongoing_job_id AND ir.status='active' AND (ir.work_package_id IS NULL OR ir.work_package_id=ja.work_package_id)) inventory ON TRUE
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',pl.id,'reference',pl.reference,'status',pl.status) ORDER BY pl.created_at DESC) AS items FROM inventory_packing_lists pl WHERE pl.ongoing_job_id=ja.ongoing_job_id AND pl.status NOT IN ('returned','cancelled')) packing ON TRUE
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',sc.id,'supplierName',o.canonical_name,'description',sc.description,'status',sc.status,'expectedDeliveryAt',sc.expected_delivery_at) ORDER BY sc.expected_delivery_at NULLS LAST) AS items FROM supplier_commitments sc JOIN supplier_profiles sp ON sp.id=sc.supplier_profile_id JOIN organizations o ON o.id=sp.organization_id WHERE sc.ongoing_job_id=ja.ongoing_job_id AND sc.status<>'cancelled' AND (sc.work_package_id IS NULL OR sc.work_package_id=ja.work_package_id)) suppliers ON TRUE
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',jau.id,'type',jau.update_type,'note',jau.note,'fileName',jau.file_name,'url',jau.public_url,'createdAt',jau.created_at) ORDER BY jau.created_at DESC) AS items, COUNT(*) FILTER (WHERE jau.file_path IS NOT NULL) AS evidence_count FROM job_activity_updates jau WHERE jau.job_activity_id=ja.id) updates ON TRUE
      WHERE ja.archived_at IS NULL AND oj.deleted_at IS NULL AND ja.status<>'cancelled'
        AND (ja.owner_user_id=$1::uuid OR EXISTS (SELECT 1 FROM job_activity_resource_assignments own WHERE own.job_activity_id=ja.id AND own.resource_id=$2::uuid))
        AND ((ja.status<>'completed' AND ja.planned_start < $5) OR (ja.status='completed' AND ja.completed_at >= $3 AND ja.completed_at < $4))
      ORDER BY ja.planned_start NULLS LAST, oj.title, ja.title`, [actor?.userId || null, resource?.id || null, start, end, upcoming]);

    const jobIds = [...new Set(activities.rows.map((item) => item.jobId))];
    const documents = jobIds.length ? await client.query(`SELECT pr.ongoing_job_id AS "jobId", 'quotation' AS type, q.title, qv.original_file_name AS "fileName", qv.public_url AS url, qv.version_number AS version
      FROM production_releases pr JOIN quote_versions qv ON qv.id=pr.quote_version_id JOIN quotes q ON q.id=qv.quote_id WHERE pr.status='active' AND pr.ongoing_job_id=ANY($1::uuid[])
      UNION ALL
      SELECT pr.ongoing_job_id, 'design', ds.title, dv.original_file_name, dv.public_url, dv.version_number
      FROM production_releases pr JOIN production_release_design_versions link ON link.production_release_id=pr.id JOIN design_versions dv ON dv.id=link.design_version_id JOIN design_sets ds ON ds.id=dv.design_set_id
      WHERE pr.status='active' AND pr.ongoing_job_id=ANY($1::uuid[]) ORDER BY "jobId",type,title`, [jobIds]) : { rows: [] };
    const tasks = uuid(actor?.userId) ? await client.query(`SELECT t.id,t.title,t.status,t.priority,t.due_at AS "dueAt",t.opportunity_id AS "jobId",oj.title AS "jobTitle",t.job_activity_id AS "activityId",t.blocked_reason AS "blockedReason",t.waiting_on AS "waitingOn"
      FROM tasks t LEFT JOIN ongoing_jobs oj ON oj.id=t.opportunity_id WHERE t.deleted_at IS NULL AND t.owner_user_id=$1::uuid AND t.status IN ('pending','blocked','waiting') ORDER BY t.due_at NULLS LAST LIMIT 30`, [actor.userId]) : { rows: [] };
    const rows = activities.rows.map((item) => ({ ...item, documents: documents.rows.filter((doc) => doc.jobId === item.jobId) }));
    const groups = { overdue: [], today: [], upcoming: [], completed: [] };
    for (const item of rows) {
      if (item.status === 'completed') groups.completed.push(item);
      else if (item.plannedEnd && new Date(item.plannedEnd) < start) groups.overdue.push(item);
      else if (item.plannedStart && new Date(item.plannedStart) < end && new Date(item.plannedEnd || item.plannedStart) >= start) groups.today.push(item);
      else groups.upcoming.push(item);
    }
    return { date: start, resource, resourceRequired: !resource, groups, tasks: tasks.rows, summary: { totalActivities: rows.length, today: groups.today.length, overdue: groups.overdue.length, upcoming: groups.upcoming.length, completed: groups.completed.length, openTasks: tasks.rows.length, runningTimers: rows.filter((item) => item.runningTimerId).length } };
  } finally { client.release(); }
}

async function writeJobMemory(client, jobId, type, content, files, actor) {
  const note = await client.query(`INSERT INTO notes (target_entity_type,target_entity_id,author_user_id,note_type,content,current_version_number,is_pinned,updated_at) VALUES ('ongoing_job',$1::uuid,$2::uuid,$3,$4,1,FALSE,NOW()) RETURNING id`, [jobId, actor?.userId || null, type, content]);
  const version = await client.query(`INSERT INTO note_versions (note_id,version_number,content,change_reason,created_by_user_id) VALUES ($1::uuid,1,$2,'Captured from mobile field execution',$3::uuid) RETURNING id`, [note.rows[0].id, content, actor?.userId || null]);
  for (const file of files) await client.query(`INSERT INTO note_attachments (note_version_id,file_name,storage_path,public_url,mime_type,size_bytes,checksum_sha256,uploaded_by_user_id) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8::uuid)`, [version.rows[0].id,file.originalName,file.storagePath,file.publicUrl,file.mimeType,file.sizeBytes,file.checksum,actor?.userId || null]);
}

export async function submitFieldAction(activityId, payload = {}, photos = [], actor = {}) {
  const action = ACTIONS.has(payload.action) ? payload.action : null; const note = text(payload.note); const remainingWork = text(payload.remainingWork);
  if (!action) throw Object.assign(new Error('Choose a valid field action.'), { status: 400 });
  if (action === 'problem' && !note) throw Object.assign(new Error('Describe the problem so it can be resolved.'), { status: 400 });
  if (action === 'progress' && !note && !remainingWork && !photos.length) throw Object.assign(new Error('Add an update, remaining work, or photograph.'), { status: 400 });
  if (action === 'complete' && remainingWork) throw Object.assign(new Error('Use Progress when work still remains.'), { status: 400 });
  const photoType = PHOTO_TYPES.has(payload.photoType) ? payload.photoType : action === 'problem' ? 'problem_photo' : action === 'complete' ? 'installation_photo' : 'progress_photo';
  const client = await db.getClient(); const written = [];
  try {
    await client.query('BEGIN');
    const resource = await currentResource(client, actor?.userId);
    const activityResult = await client.query(`SELECT ja.*,oj.title AS job_title,wp.title AS work_package_title FROM job_activities ja JOIN ongoing_jobs oj ON oj.id=ja.ongoing_job_id LEFT JOIN job_scope_lines wp ON wp.id=ja.work_package_id WHERE ja.id=$1::uuid AND ja.archived_at IS NULL AND oj.deleted_at IS NULL FOR UPDATE`, [activityId]);
    if (!activityResult.rows.length) throw Object.assign(new Error('Assigned activity not found.'), { status: 404 }); const activity = activityResult.rows[0];
    const assigned = activity.owner_user_id === actor?.userId || (resource && (await client.query(`SELECT 1 FROM job_activity_resource_assignments WHERE job_activity_id=$1::uuid AND resource_id=$2::uuid`, [activityId, resource.id])).rows.length);
    if (!assigned) throw Object.assign(new Error('This activity is not assigned to your ERP user or employee resource.'), { status: 403 });

    let timeEntryId = null;
    if (action === 'start' && resource) {
      const timer = await client.query(`INSERT INTO project_time_entries (resource_id,user_id,ongoing_job_id,job_activity_id,work_package_id,started_at,entry_source,status,note,created_by_user_id) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,NOW(),'timer','running',$6,$2::uuid) ON CONFLICT DO NOTHING RETURNING id`, [resource.id,actor?.userId || null,activity.ongoing_job_id,activityId,activity.work_package_id,note]);
      if (!timer.rows.length) throw Object.assign(new Error('You already have a running project timer.'), { status: 409 }); timeEntryId=timer.rows[0].id;
    }
    if (['pause','complete'].includes(action) && resource) {
      const stopped = await client.query(`UPDATE project_time_entries SET ended_at=NOW(),duration_minutes=GREATEST(0,ROUND(EXTRACT(EPOCH FROM (NOW()-started_at))/60)::int),status='completed',updated_at=NOW() WHERE resource_id=$1::uuid AND job_activity_id=$2::uuid AND status='running' RETURNING id`, [resource.id,activityId]);
      timeEntryId=stopped.rows[0]?.id || null;
    }

    const submission = await client.query(`INSERT INTO field_execution_submissions (ongoing_job_id,job_activity_id,resource_id,action,note,remaining_work,project_time_entry_id,submitted_by_user_id) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::uuid,$8::uuid) RETURNING id`, [activity.ongoing_job_id,activityId,resource?.id || null,action,note,remainingWork,timeEntryId,actor?.userId || null]);
    const directory=path.join(uploadRoot,String(activity.ongoing_job_id),String(activityId),String(submission.rows[0].id)); await fs.mkdir(directory,{recursive:true}); const stored=[];
    for (const photo of photos) {
      const storedName=`${crypto.randomUUID()}-${safeName(photo.originalname)}`; const storagePath=path.join(directory,storedName); await fs.writeFile(storagePath,photo.buffer,{flag:'wx'}); written.push(storagePath);
      const item={originalName:photo.originalname,storagePath,publicUrl:`/uploads/field-execution/${activity.ongoing_job_id}/${activityId}/${submission.rows[0].id}/${storedName}`,mimeType:photo.mimetype,sizeBytes:photo.size || photo.buffer.length,checksum:crypto.createHash('sha256').update(photo.buffer).digest('hex')}; stored.push(item);
      await client.query(`INSERT INTO field_execution_files (submission_id,photo_type,file_name,storage_path,public_url,mime_type,size_bytes,checksum_sha256) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8)`,[submission.rows[0].id,photoType,item.originalName,item.storagePath,item.publicUrl,item.mimeType,item.sizeBytes,item.checksum]);
      await client.query(`INSERT INTO job_activity_updates (job_activity_id,update_type,note,file_name,file_path,public_url,mime_type,size_bytes,checksum_sha256,created_by_user_id) VALUES ($1::uuid,'evidence',$2,$3,$4,$5,$6,$7,$8,$9::uuid)`,[activityId,note,item.originalName,item.storagePath,item.publicUrl,item.mimeType,item.sizeBytes,item.checksum,actor?.userId || null]);
      if (photoType==='final_photo') await client.query(`INSERT INTO job_closeout_evidence (ongoing_job_id,evidence_type,title,file_name,storage_path,public_url,mime_type,size_bytes,checksum_sha256,captured_at,uploaded_by_user_id) VALUES ($1::uuid,'final_photo',$2,$3,$4,$5,$6,$7,$8,NOW(),$9::uuid)`,[activity.ongoing_job_id,note || activity.title,item.originalName,item.storagePath,item.publicUrl,item.mimeType,item.sizeBytes,item.checksum,actor?.userId || null]);
    }

    const content=[`${activity.title}: ${note || (action==='start'?'Work started':action==='pause'?'Work paused':action==='complete'?'Work completed':'Field update')}`,remainingWork && `Remaining work: ${remainingWork}`].filter(Boolean).join('\n');
    const memoryType=action==='problem'?'issue':action==='complete'?'installation_update':activity.activity_type==='installation'?'installation_update':'site_update';
    await writeJobMemory(client,activity.ongoing_job_id,memoryType,content,stored,actor);
    if (!stored.length) await client.query(`INSERT INTO job_activity_updates (job_activity_id,update_type,note,created_by_user_id) VALUES ($1::uuid,$2,$3,$4::uuid)`,[activityId,action==='problem'?'blocker':action==='complete'?'completion':'progress',content,actor?.userId || null]);

    let taskId=null;
    if (action==='problem') {
      await client.query(`UPDATE job_activities SET status='blocked',blocker=$2,updated_at=NOW() WHERE id=$1::uuid`,[activityId,note]);
      const task=await client.query(`INSERT INTO tasks (title,description,notes,status,priority,type,task_type,due_at,owner,owner_user_id,opportunity_id,work_package_id,job_phase_id,job_location_id,job_activity_id,blocked_reason,source_type,source_id,updated_at) VALUES ($1,$2,$2,'blocked','high','ongoing_job','ongoing_job',NOW()+INTERVAL '1 day',$3,$4::uuid,$5::uuid,$6::uuid,$7::uuid,$8::uuid,$9::uuid,$2,'field_execution',$10::uuid,NOW()) RETURNING id`,[`Resolve: ${activity.title}`,note,actor?.displayName || null,activity.owner_user_id || actor?.userId || null,activity.ongoing_job_id,activity.work_package_id,activity.phase_id,activity.location_id,activityId,submission.rows[0].id]); taskId=task.rows[0].id;
      await client.query(`UPDATE field_execution_submissions SET created_task_id=$2::uuid WHERE id=$1::uuid`,[submission.rows[0].id,taskId]);
    } else if (action==='complete') await client.query(`UPDATE job_activities SET status='completed',blocker=NULL,completion_note=$2,completed_at=COALESCE(completed_at,NOW()),updated_at=NOW() WHERE id=$1::uuid`,[activityId,note || 'Completed from field workspace']);
    else if (action==='start') await client.query(`UPDATE job_activities SET status='in_progress',updated_at=NOW() WHERE id=$1::uuid AND status IN ('not_started','ready')`,[activityId]);

    await client.query('COMMIT');
    await writeAuditLog({userId:actor?.userId,userDisplayName:actor?.displayName || 'EGS Team',action:'create',resource:'field_execution_submission',resourceId:submission.rows[0].id,summary:`Field ${action}: ${activity.title}`,metadata:{ongoingJobId:activity.ongoing_job_id,activityId,taskId,photoCount:photos.length}});
    return {ok:true,submissionId:submission.rows[0].id,taskId,timeEntryId};
  } catch(error) { await client.query('ROLLBACK').catch(()=>{}); await Promise.all(written.map((filePath)=>fs.unlink(filePath).catch(()=>{}))); throw error; } finally { client.release(); }
}
