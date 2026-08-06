import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function text(value){return String(value??'').trim()||null;}
function uuid(value){const valueText=text(value);return valueText&&UUID_RE.test(valueText)?valueText:null;}
function targetDate(value){const match=String(value||'').match(/^\d{4}-\d{2}-\d{2}$/);if(!match)throw Object.assign(new Error('Choose the main delivery or installation date.'),{status:400});return match[0];}
function plannedTimes(target,days,durationHours){const start=new Date(`${target}T08:00:00+04:00`);start.setUTCDate(start.getUTCDate()+Number(days||0));const end=new Date(start.getTime()+Number(durationHours||8)*3600000);return{start,end};}

async function assertJob(client,jobId){const result=await client.query(`SELECT id,title,job_number AS "jobNumber",summary_stage AS stage,owner FROM ongoing_jobs WHERE id=$1::uuid AND deleted_at IS NULL`,[jobId]);if(!result.rows.length)throw Object.assign(new Error('Ongoing Job not found.'),{status:404});return result.rows[0];}
async function assertContext(client,table,id,jobId,label){if(!id)return null;const result=await client.query(`SELECT id FROM ${table} WHERE id=$1::uuid AND ongoing_job_id=$2::uuid AND archived_at IS NULL`,[id,jobId]);if(!result.rows.length)throw Object.assign(new Error(`${label} does not belong to this Job.`),{status:400});return id;}

export async function getJobActivationWorkspace(jobId){
    const job=await assertJob(db,jobId);
    const [templates,services,workPackages,phases,locations,users,resources,activities,bookings,activations,coverage]=await Promise.all([
      db.query(`SELECT id,stable_code AS code,title,description,activity_type AS "activityType",days_from_target AS "daysFromTarget",duration_hours::float AS "durationHours",applicable_service_codes AS "serviceCodes",requires_location AS "requiresLocation",requires_work_package AS "requiresWorkPackage" FROM delivery_activity_templates WHERE active=TRUE ORDER BY display_order,title`),
      db.query(`SELECT id,stable_code AS code,canonical_label AS label FROM service_offerings WHERE active_to IS NULL ORDER BY canonical_label`),
      db.query(`SELECT w.id,w.title,w.service_offering_id AS "serviceOfferingId",s.stable_code AS "serviceCode",s.canonical_label AS "serviceLabel",w.target_date AS "targetDate",w.job_location_id AS "locationId",w.job_phase_id AS "phaseId" FROM job_scope_lines w LEFT JOIN service_offerings s ON s.id=w.service_offering_id WHERE w.ongoing_job_id=$1::uuid AND w.archived_at IS NULL ORDER BY w.display_order,w.created_at`,[jobId]),
      db.query(`SELECT id,name,start_date AS "startDate",deadline FROM job_phases WHERE ongoing_job_id=$1::uuid AND archived_at IS NULL ORDER BY display_order,created_at`,[jobId]),
      db.query(`SELECT id,name,address,city,deadline FROM job_locations WHERE ongoing_job_id=$1::uuid AND archived_at IS NULL ORDER BY created_at`,[jobId]),
      db.query(`SELECT id,name,email,role FROM users WHERE is_active=TRUE ORDER BY name`),
      db.query(`SELECT id,name,resource_type AS "resourceType",user_id AS "userId",capability_tags AS "capabilityTags" FROM operational_resources WHERE status='active' ORDER BY resource_type,name`),
      db.query(`SELECT id,title,activity_type AS "activityType",planned_start AS "plannedStart",planned_end AS "plannedEnd",status,owner_user_id AS "ownerUserId",work_package_id AS "workPackageId",location_id AS "locationId" FROM job_activities WHERE ongoing_job_id=$1::uuid AND archived_at IS NULL AND status<>'cancelled' ORDER BY planned_start NULLS LAST`,[jobId]),
      db.query(`SELECT a.resource_id AS "resourceId",r.name AS "resourceName",ja.title,oj.title AS "jobTitle",ja.planned_start AS "plannedStart",ja.planned_end AS "plannedEnd" FROM job_activity_resource_assignments a JOIN operational_resources r ON r.id=a.resource_id JOIN job_activities ja ON ja.id=a.job_activity_id JOIN ongoing_jobs oj ON oj.id=ja.ongoing_job_id WHERE ja.archived_at IS NULL AND ja.status NOT IN ('completed','cancelled') AND ja.planned_start IS NOT NULL AND ja.planned_end IS NOT NULL`),
      db.query(`SELECT a.id,a.target_date AS "targetDate",a.activity_count AS "activityCount",a.activated_at AS "activatedAt",u.name AS "activatedBy",w.title AS "workPackageTitle",l.name AS "locationName" FROM job_delivery_activations a LEFT JOIN users u ON u.id=a.activated_by_user_id LEFT JOIN job_scope_lines w ON w.id=a.work_package_id LEFT JOIN job_locations l ON l.id=a.location_id WHERE a.ongoing_job_id=$1::uuid ORDER BY a.activated_at DESC`,[jobId]),
      db.query(`SELECT EXISTS(SELECT 1 FROM notes WHERE target_entity_type='ongoing_job' AND target_entity_id=$1::uuid AND note_type='brief') AS "hasBrief",EXISTS(SELECT 1 FROM production_releases WHERE ongoing_job_id=$1::uuid AND status='active') AS "hasProductionRelease"`,[jobId]),
    ]);
    const dates=[...workPackages.rows.map((item)=>item.targetDate),...locations.rows.map((item)=>item.deadline),...phases.rows.map((item)=>item.deadline)].filter(Boolean).sort();
    return{job,templates:templates.rows,services:services.rows,workPackages:workPackages.rows,phases:phases.rows,locations:locations.rows,users:users.rows,resources:resources.rows,activities:activities.rows,resourceBookings:bookings.rows,activations:activations.rows,suggestedTargetDate:dates[0]||null,readiness:{...coverage.rows[0],hasScope:workPackages.rows.length>0,hasLocation:locations.rows.length>0,hasActivities:activities.rows.length>0,datedActivities:activities.rows.filter((item)=>item.plannedStart&&item.plannedEnd).length,ownedActivities:activities.rows.filter((item)=>item.ownerUserId).length}};
}

export async function activateJobDelivery(jobId,payload={},actor={}){
  const date=targetDate(payload.targetDate);const requested=Array.isArray(payload.activities)?payload.activities:[];
  if(!requested.length||requested.length>30)throw Object.assign(new Error('Choose between 1 and 30 delivery activities.'),{status:400});
  const ownerUserId=uuid(payload.ownerUserId);if(!ownerUserId)throw Object.assign(new Error('Choose the accountable owner for this plan.'),{status:400});
  const resourceIds=[...new Set((Array.isArray(payload.resourceIds)?payload.resourceIds:[]).map(uuid).filter(Boolean))];
  const client=await db.getClient();
  try{
    await client.query('BEGIN');const job=await assertJob(client,jobId);
    const activityOwnerIds=[...new Set([ownerUserId,...requested.map((item)=>uuid(item.ownerUserId)).filter(Boolean)])];
    const owners=await client.query(`SELECT id FROM users WHERE id=ANY($1::uuid[]) AND is_active=TRUE`,[activityOwnerIds]);if(owners.rows.length!==activityOwnerIds.length)throw Object.assign(new Error('One or more selected activity owners are not active ERP users.'),{status:400});
    if(resourceIds.length){const valid=await client.query(`SELECT id FROM operational_resources WHERE id=ANY($1::uuid[]) AND status='active'`,[resourceIds]);if(valid.rows.length!==resourceIds.length)throw Object.assign(new Error('One or more selected resources are unavailable.'),{status:400});}

    const templateIds=[...new Set(requested.map((item)=>uuid(item.templateId)).filter(Boolean))];
    if(templateIds.length!==requested.length)throw Object.assign(new Error('Each selected activity must use one unique active building block.'),{status:400});
    const templates=await client.query(`SELECT id,stable_code,title,activity_type,days_from_target,duration_hours::float,requires_location,requires_work_package FROM delivery_activity_templates WHERE id=ANY($1::uuid[]) AND active=TRUE`,[templateIds]);
    if(templates.rows.length!==templateIds.length)throw Object.assign(new Error('One or more activity building blocks are unavailable.'),{status:400});
    const bounds=templates.rows.map((item)=>plannedTimes(date,item.days_from_target,item.duration_hours));
    const phaseStart=new Date(Math.min(...bounds.map((item)=>item.start))).toISOString().slice(0,10);
    const phaseEnd=new Date(Math.max(...bounds.map((item)=>item.end))).toISOString().slice(0,10);

    let phaseId=await assertContext(client,'job_phases',uuid(payload.phaseId),jobId,'Phase');
    let locationId=await assertContext(client,'job_locations',uuid(payload.locationId),jobId,'Location');
    let workPackageId=await assertContext(client,'job_scope_lines',uuid(payload.workPackageId),jobId,'Work package');
    if(!phaseId&&text(payload.newPhaseName)){const phase=await client.query(`INSERT INTO job_phases(ongoing_job_id,name,display_order,start_date,deadline,current_progress,owner_user_id) VALUES($1::uuid,$2,COALESCE((SELECT MAX(display_order)+1 FROM job_phases WHERE ongoing_job_id=$1::uuid),1),$3::date,$4::date,'not_started',$5::uuid) RETURNING id`,[jobId,text(payload.newPhaseName),phaseStart,phaseEnd,ownerUserId]);phaseId=phase.rows[0].id;}
    if(!locationId&&text(payload.newLocation?.name)){const location=await client.query(`INSERT INTO job_locations(ongoing_job_id,name,address,city,role,deadline,current_progress) VALUES($1::uuid,$2,$3,$4,'delivery_site',$5::date,'not_started') RETURNING id`,[jobId,text(payload.newLocation.name),text(payload.newLocation.address),text(payload.newLocation.city),date]);locationId=location.rows[0].id;}
    if(!workPackageId&&text(payload.newWorkPackage?.title)){const serviceId=uuid(payload.newWorkPackage.serviceOfferingId);if(serviceId){const service=await client.query(`SELECT id FROM service_offerings WHERE id=$1::uuid AND active_to IS NULL`,[serviceId]);if(!service.rows.length)throw Object.assign(new Error('Selected service category is not active.'),{status:400});}const work=await client.query(`INSERT INTO job_scope_lines(ongoing_job_id,service_offering_id,title,description,current_scope_state,current_progress,owner_user_id,job_phase_id,job_location_id,target_date,display_order) VALUES($1::uuid,$2::uuid,$3,$3,'draft','not_started',$4::uuid,$5::uuid,$6::uuid,$7::date,COALESCE((SELECT MAX(display_order)+1 FROM job_scope_lines WHERE ongoing_job_id=$1::uuid),1)) RETURNING id`,[jobId,serviceId,text(payload.newWorkPackage.title),ownerUserId,phaseId,locationId,date]);workPackageId=work.rows[0].id;}

    if(templates.rows.some((item)=>item.requires_location&&!locationId))throw Object.assign(new Error('The selected activities require a Job location.'),{status:400});
    if(templates.rows.some((item)=>item.requires_work_package&&!workPackageId))throw Object.assign(new Error('The selected activities require a work package.'),{status:400});
    const activation=await client.query(`INSERT INTO job_delivery_activations(ongoing_job_id,work_package_id,phase_id,location_id,target_date,activity_count,activated_by_user_id) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::date,$6,$7::uuid) RETURNING id`,[jobId,workPackageId,phaseId,locationId,date,templates.rows.length,actor?.userId||null]);
    const byId=new Map(templates.rows.map((item)=>[item.id,item]));const created=[];
    for(const request of requested){const template=byId.get(request.templateId);const planned=plannedTimes(date,template.days_from_target,template.duration_hours);const activityOwnerId=uuid(request.ownerUserId)||ownerUserId;const activity=await client.query(`INSERT INTO job_activities(ongoing_job_id,work_package_id,phase_id,location_id,activity_type,title,owner_user_id,planned_start,planned_end,status,created_by_user_id,delivery_activation_id,activity_template_id) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7::uuid,$8,$9,'not_started',$10::uuid,$11::uuid,$12::uuid) RETURNING id,title,planned_start AS "plannedStart",planned_end AS "plannedEnd"`,[jobId,workPackageId,phaseId,locationId,template.activity_type,text(request.title)||template.title,activityOwnerId,planned.start,planned.end,actor?.userId||null,activation.rows[0].id,template.id]);created.push(activity.rows[0]);for(const resourceId of resourceIds)await client.query(`INSERT INTO job_activity_resource_assignments(job_activity_id,resource_id,planned_minutes,created_by_user_id) VALUES($1::uuid,$2::uuid,$3,$4::uuid)`,[activity.rows[0].id,resourceId,Math.round(template.duration_hours*60),actor?.userId||null]);}
    const summary=`Delivery plan activated for ${date}: ${created.map((item)=>item.title).join(', ')}`;
    const note=await client.query(`INSERT INTO notes(target_entity_type,target_entity_id,author_user_id,note_type,content,current_version_number,is_pinned,updated_at) VALUES('ongoing_job',$1::uuid,$2::uuid,'production_update',$3,1,FALSE,NOW()) RETURNING id`,[jobId,actor?.userId||null,summary]);
    await client.query(`INSERT INTO note_versions(note_id,version_number,content,change_reason,created_by_user_id) VALUES($1::uuid,1,$2,'Created by Prepare for Delivery',$3::uuid)`,[note.rows[0].id,summary,actor?.userId||null]);
    await client.query('COMMIT');
    await writeAuditLog({userId:actor?.userId,userDisplayName:actor?.displayName||'EGS Team',action:'create',resource:'job_delivery_activation',resourceId:activation.rows[0].id,summary:`Activated ${created.length} delivery activities for ${job.title}`,metadata:{ongoingJobId:jobId,targetDate:date,activityIds:created.map((item)=>item.id),workPackageId,phaseId,locationId}});
    return{ok:true,activationId:activation.rows[0].id,activityCount:created.length,activities:created,workPackageId,phaseId,locationId};
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
