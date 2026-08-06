import db from '../src/db/index.js';
import { getTodayWorkspace } from '../src/services/fieldExecutionService.js';

const checks = await db.query(`SELECT
  (SELECT COUNT(*)::int FROM field_execution_submissions) AS submissions,
  (SELECT COUNT(*)::int FROM field_execution_files) AS files,
  (SELECT COUNT(*)::int FROM field_execution_submissions s LEFT JOIN job_activities a ON a.id=s.job_activity_id LEFT JOIN ongoing_jobs j ON j.id=s.ongoing_job_id WHERE a.id IS NULL OR j.id IS NULL OR a.ongoing_job_id<>s.ongoing_job_id) AS invalid_context,
  (SELECT COUNT(*)::int FROM field_execution_files f LEFT JOIN field_execution_submissions s ON s.id=f.submission_id WHERE s.id IS NULL) AS orphan_files,
  (SELECT COUNT(*)::int FROM operational_resources WHERE user_id IS NOT NULL AND resource_type IN ('employee','contractor')) AS linked_people`);
for (const field of ['invalid_context','orphan_files']) if (checks.rows[0][field] !== 0) throw new Error(`${field} must be zero.`);
const users = await db.query(`SELECT u.id,u.name,r.id AS resource_id,r.name AS resource_name
  FROM users u JOIN operational_resources r ON r.user_id=u.id
  WHERE u.is_active=TRUE AND r.status='active' AND r.resource_type IN ('employee','contractor')
  ORDER BY u.name`);
const coverage = [];
for (const user of users.rows) {
  const workspace = await getTodayWorkspace({ userId: user.id, displayName: user.name });
  if (!Array.isArray(workspace.groups.today) || workspace.resource?.id !== user.resource_id) throw new Error(`Today read model is invalid for ${user.name}.`);
  coverage.push({ user: user.name, resource: user.resource_name, activities: workspace.summary.totalActivities, tasks: workspace.summary.openTasks });
}
console.log(JSON.stringify({ ...checks.rows[0], linked_user_coverage: coverage }, null, 2));
await db.getPool().end();
