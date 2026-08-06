import db from '../src/db/index.js';
import { listUnifiedTasks } from '../src/services/unifiedTaskService.js';

const checks = await db.query(`SELECT
  (SELECT COUNT(*)::int FROM tasks) AS total_tasks,
  (SELECT COUNT(*)::int FROM tasks WHERE deleted_at IS NULL) AS active_tasks,
  (SELECT COUNT(*)::int FROM task_dependencies WHERE task_id = depends_on_task_id) AS self_dependencies,
  (SELECT COUNT(*)::int FROM task_dependencies d LEFT JOIN tasks t ON t.id=d.task_id LEFT JOIN tasks p ON p.id=d.depends_on_task_id WHERE t.id IS NULL OR p.id IS NULL) AS orphan_dependencies,
  (SELECT COUNT(*)::int FROM task_evidence e LEFT JOIN tasks t ON t.id=e.task_id WHERE t.id IS NULL) AS orphan_evidence,
  (SELECT COUNT(*)::int FROM tasks t JOIN job_scope_lines w ON w.id=t.work_package_id WHERE t.opportunity_id IS DISTINCT FROM w.ongoing_job_id) AS wrong_package_context,
  (SELECT COUNT(*)::int FROM tasks t JOIN job_phases p ON p.id=t.job_phase_id WHERE t.opportunity_id IS DISTINCT FROM p.ongoing_job_id) AS wrong_phase_context,
  (SELECT COUNT(*)::int FROM tasks t JOIN job_locations l ON l.id=t.job_location_id WHERE t.opportunity_id IS DISTINCT FROM l.ongoing_job_id) AS wrong_location_context,
  (SELECT COUNT(*)::int FROM tasks t JOIN job_activities a ON a.id=t.job_activity_id WHERE t.opportunity_id IS DISTINCT FROM a.ongoing_job_id) AS wrong_activity_context`);

const row = checks.rows[0];
for (const field of ['self_dependencies', 'orphan_dependencies', 'orphan_evidence', 'wrong_package_context', 'wrong_phase_context', 'wrong_location_context', 'wrong_activity_context']) {
  if (row[field] !== 0) throw new Error(`${field} must be zero; found ${row[field]}.`);
}

const readModel = await listUnifiedTasks({ status: 'All' });
if (readModel.items.length !== row.active_tasks) throw new Error('Unified task read model omitted active tasks.');
console.log(JSON.stringify({ ...row, read_model_tasks: readModel.items.length }, null, 2));
await db.getPool().end();
