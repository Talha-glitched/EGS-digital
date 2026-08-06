import db from '../src/db/index.js';
import { getEmployeeOperationsWorkspace } from '../src/services/employeeOperationsService.js';

const result = await db.query(`SELECT
  (SELECT COUNT(*)::int FROM operational_resources WHERE resource_type IN ('employee','contractor')) AS people,
  (SELECT COUNT(*)::int FROM employee_operational_profiles) AS profiles,
  (SELECT COUNT(*)::int FROM employee_certifications WHERE archived_at IS NULL) AS certifications,
  (SELECT COUNT(*)::int FROM resource_team_memberships) AS memberships,
  (SELECT COUNT(*)::int FROM resource_availability_blocks) AS availability_blocks,
  (SELECT COUNT(*)::int FROM users) AS users,
  (SELECT COUNT(*)::int FROM operational_resources WHERE user_id IS NOT NULL) AS linked_users,
  (SELECT COUNT(*)::int FROM operational_resources r JOIN users u ON u.id=r.user_id WHERE r.name IS DISTINCT FROM u.name) AS linked_name_mismatches,
  (SELECT COUNT(*)::int FROM employee_operational_profiles p LEFT JOIN operational_resources r ON r.id=p.resource_id WHERE r.id IS NULL OR r.resource_type NOT IN ('employee','contractor')) AS invalid_profiles,
  (SELECT COUNT(*)::int FROM employee_certifications c LEFT JOIN operational_resources r ON r.id=c.resource_id WHERE r.id IS NULL OR r.resource_type NOT IN ('employee','contractor')) AS invalid_certifications,
  (SELECT COUNT(*)::int FROM resource_team_memberships m LEFT JOIN operational_resources t ON t.id=m.team_resource_id LEFT JOIN operational_resources p ON p.id=m.member_resource_id WHERE t.resource_type IS DISTINCT FROM 'team' OR p.resource_type NOT IN ('employee','contractor')) AS invalid_memberships,
  (SELECT COUNT(*)::int FROM resource_availability_blocks WHERE block_type NOT IN ('leave','sick','training','external_booking','maintenance','other')) AS invalid_availability_types`);
const row = result.rows[0];
if (row.people !== row.profiles) throw new Error(`Every employee/contractor must have one profile: ${row.people} people, ${row.profiles} profiles.`);
for (const field of ['invalid_profiles', 'invalid_certifications', 'invalid_memberships', 'invalid_availability_types', 'linked_name_mismatches']) if (row[field] !== 0) throw new Error(`${field} must be zero; found ${row[field]}.`);
const trigger = await db.query(`SELECT COUNT(*)::int AS count FROM pg_trigger WHERE tgname IN ('sync_user_name_to_operational_resource','initialize_employee_profile_from_resource','protect_employee_resource_kind_change') AND NOT tgisinternal`);
if (trigger.rows[0].count !== 3) throw new Error('One or more employee identity integrity triggers are missing.');
const workspace = await getEmployeeOperationsWorkspace();
if (workspace.people.length !== row.people) throw new Error('Employee workspace did not return every employee/contractor resource.');
if (workspace.userSyncCandidates.length !== row.users) throw new Error('Employee sync workspace did not return every ERP/CRM user.');
console.log(JSON.stringify({ ...row, sync_trigger: trigger.rows[0].count, workspace_people: workspace.people.length, workspace_teams: workspace.teams.length, sync_candidates: workspace.userSyncCandidates.length }, null, 2));
await db.getPool().end();
