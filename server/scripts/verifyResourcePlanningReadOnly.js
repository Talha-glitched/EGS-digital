import db from '../src/db/index.js';
import { getPlanCalendar } from '../src/services/productionExecutionService.js';

const checks = await db.query(`SELECT
  (SELECT COUNT(*)::int FROM job_activity_resource_assignments) AS assignments,
  (SELECT COUNT(*)::int FROM job_activity_resource_assignments WHERE planned_minutes < 0) AS invalid_planned_minutes,
  (SELECT COUNT(*)::int FROM (SELECT job_activity_id,resource_id,COUNT(*) FROM job_activity_resource_assignments GROUP BY job_activity_id,resource_id HAVING COUNT(*) > 1) duplicates) AS duplicate_assignments,
  (SELECT COUNT(*)::int FROM job_activity_resource_assignments a LEFT JOIN job_activities ja ON ja.id=a.job_activity_id LEFT JOIN operational_resources r ON r.id=a.resource_id WHERE ja.id IS NULL OR r.id IS NULL) AS orphan_assignments,
  (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='job_activity_resource_assignments' AND column_name='planned_minutes') AS planned_column`);
const row = checks.rows[0];
for (const field of ['invalid_planned_minutes','duplicate_assignments','orphan_assignments']) if (row[field] !== 0) throw new Error(`${field} must be zero; found ${row[field]}.`);
if (row.planned_column !== 1) throw new Error('planned_minutes column is missing.');
const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth() - 1, 1); const to = new Date(now.getFullYear(), now.getMonth() + 2, 1);
const workspace = await getPlanCalendar({ from, to });
if (!Array.isArray(workspace.taskItems)) throw new Error('Plan Calendar has no unified task read model.');
for (const item of workspace.items) {
  if (!Array.isArray(item.resourceAssignments)) throw new Error(`Activity ${item.id} has no resource assignment read model.`);
  if (!Number.isFinite(Number(item.plannedLaborCostAed)) || !Number.isFinite(Number(item.actualLaborCostAed))) throw new Error(`Activity ${item.id} has invalid labor costs.`);
}
console.log(JSON.stringify({ ...row, calendar_items: workspace.items.length, task_due_items: workspace.taskItems.length, resources: workspace.resources.length, jobs: workspace.jobs.length }, null, 2));
await db.getPool().end();
