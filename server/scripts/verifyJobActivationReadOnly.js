import db from '../src/db/index.js';
import { getJobActivationWorkspace } from '../src/services/jobActivationService.js';

const result = await db.query(`SELECT
  (SELECT COUNT(*)::int FROM delivery_activity_templates WHERE active=TRUE) AS templates,
  (SELECT COUNT(*)::int FROM job_delivery_activations) AS activations,
  (SELECT COUNT(*)::int FROM job_activities WHERE delivery_activation_id IS NOT NULL) AS activated_activities,
  (SELECT COUNT(*)::int FROM job_delivery_activations a LEFT JOIN ongoing_jobs j ON j.id=a.ongoing_job_id WHERE j.id IS NULL) AS orphan_activations,
  (SELECT COUNT(*)::int FROM job_activities a LEFT JOIN delivery_activity_templates t ON t.id=a.activity_template_id WHERE a.activity_template_id IS NOT NULL AND t.id IS NULL) AS orphan_template_links,
  (SELECT COUNT(*)::int FROM delivery_activity_templates WHERE duration_hours<=0) AS invalid_durations`);
const row=result.rows[0];
if (row.templates < 13) throw new Error(`Expected at least 13 active activity templates, found ${row.templates}.`);
for (const key of ['orphan_activations','orphan_template_links','invalid_durations']) if (row[key] !== 0) throw new Error(`${key} must be zero.`);
const sample=await db.query(`SELECT id,title FROM ongoing_jobs WHERE deleted_at IS NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1`);
const workspace=sample.rows[0]?await getJobActivationWorkspace(sample.rows[0].id):null;
if(workspace&&(!workspace.templates.length||!Array.isArray(workspace.resourceBookings)||!Array.isArray(workspace.services)))throw new Error('Activation workspace read model is invalid.');
console.log(JSON.stringify({...row,sample_job:sample.rows[0]?.title||null,sample_scope:workspace?.workPackages.length||0,sample_activities:workspace?.activities.length||0},null,2));
await db.getPool().end();
