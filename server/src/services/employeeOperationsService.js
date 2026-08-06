import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';
import { hashPassword } from './authService.js';
import { isValidRole, ROLES } from '../constants/userRoles.js';

export const EMPLOYMENT_TYPES = Object.freeze(['permanent', 'temporary', 'contract', 'freelance']);
export const CERTIFICATION_TYPES = Object.freeze(['site_access', 'safety', 'driving', 'equipment', 'trade', 'other']);
export const AVAILABILITY_TYPES = Object.freeze(['leave', 'sick', 'training', 'external_booking', 'maintenance', 'other']);

function text(value) { return String(value ?? '').trim() || null; }
function uuid(value) { const result = text(value); return result && /^[0-9a-f-]{36}$/i.test(result) ? result : null; }
function date(value) { if (!value) return null; const result = String(value).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null; }
function tags(value) { return [...new Set((Array.isArray(value) ? value : String(value || '').split(',')).map(text).filter(Boolean))]; }
function money(value) { if (value === '' || value == null) return null; const result = Number(value); if (!Number.isFinite(result) || result < 0) throw Object.assign(new Error('Hourly planning cost must be zero or more.'), { status: 400 }); return result; }
async function audit(actor, action, resource, resourceId, summary) { await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action, resource, resourceId, summary }); }

export async function getEmployeeOperationsWorkspace() {
  const [people, certifications, memberships, teams, availability, assignments, time, users] = await Promise.all([
    db.query(`SELECT r.id, r.name, r.resource_type AS "resourceType", r.user_id AS "userId", r.identifier,
      r.capability_tags AS "capabilityTags", r.hourly_cost_aed AS "hourlyCostAed", r.status,
      p.job_title AS "jobTitle", p.employment_type AS "employmentType", p.joined_on AS "joinedOn", p.ended_on AS "endedOn",
      u.email
      FROM operational_resources r
      LEFT JOIN employee_operational_profiles p ON p.resource_id = r.id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.resource_type IN ('employee', 'contractor') ORDER BY r.status, r.name`),
    db.query(`SELECT id, resource_id AS "resourceId", certification_type AS "certificationType", title, issuer,
      reference_number AS "referenceNumber", issued_on AS "issuedOn", expires_on AS "expiresOn", notes
      FROM employee_certifications WHERE archived_at IS NULL ORDER BY expires_on NULLS LAST, title`),
    db.query(`SELECT m.id, m.team_resource_id AS "teamResourceId", m.member_resource_id AS "memberResourceId",
      m.membership_role AS role, m.starts_on AS "startsOn", m.ends_on AS "endsOn", t.name AS "teamName"
      FROM resource_team_memberships m JOIN operational_resources t ON t.id = m.team_resource_id
      ORDER BY m.starts_on DESC`),
    db.query(`SELECT id, name, capability_tags AS "capabilityTags", status FROM operational_resources WHERE resource_type = 'team' ORDER BY status, name`),
    db.query(`SELECT id, resource_id AS "resourceId", starts_at AS "startsAt", ends_at AS "endsAt", reason, block_type AS "blockType"
      FROM resource_availability_blocks WHERE ends_at >= NOW() - INTERVAL '30 days' AND starts_at <= NOW() + INTERVAL '180 days' ORDER BY starts_at`),
    db.query(`SELECT a.resource_id AS "resourceId", COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE ja.planned_end IS NULL OR ja.planned_end >= NOW())::int AS upcoming
      FROM job_activity_resource_assignments a JOIN job_activities ja ON ja.id = a.job_activity_id
      WHERE ja.archived_at IS NULL AND ja.status <> 'cancelled' GROUP BY a.resource_id`),
    db.query(`SELECT resource_id AS "resourceId", COALESCE(SUM(duration_minutes), 0)::int AS minutes
      FROM project_time_entries WHERE status = 'completed' AND started_at >= date_trunc('month', NOW()) GROUP BY resource_id`),
    db.query(`SELECT u.id, u.name, u.name AS "displayName", u.email, u.role, u.is_active AS "isActive",
      r.id AS "linkedResourceId", r.name AS "linkedResourceName"
      FROM users u LEFT JOIN operational_resources r ON r.user_id = u.id ORDER BY u.is_active DESC, u.name`),
  ]);
  const assignmentMap = new Map(assignments.rows.map((row) => [row.resourceId, row]));
  const timeMap = new Map(time.rows.map((row) => [row.resourceId, Number(row.minutes)]));
  const rows = people.rows.map((row) => ({
    ...row,
    hourlyCostAed: row.hourlyCostAed == null ? null : Number(row.hourlyCostAed),
    certifications: certifications.rows.filter((item) => item.resourceId === row.id),
    memberships: memberships.rows.filter((item) => item.memberResourceId === row.id),
    availability: availability.rows.filter((item) => item.resourceId === row.id),
    assignmentCount: assignmentMap.get(row.id)?.count || 0,
    upcomingAssignmentCount: assignmentMap.get(row.id)?.upcoming || 0,
    monthMinutes: timeMap.get(row.id) || 0,
  }));
  const today = new Date(); const warning = new Date(Date.now() + 60 * 86400000);
  const activeCertifications = certifications.rows.filter((item) => item.expiresOn);
  const normalized = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const syncCandidates = users.rows.map((user) => {
    const suggestion = user.linkedResourceId ? null : rows.find((person) => !person.userId && normalized(person.name) === normalized(user.name));
    return { ...user, suggestedResourceId: suggestion?.id || null, suggestedResourceName: suggestion?.name || null };
  });
  return {
    people: rows, teams: teams.rows, users: users.rows.filter((item) => item.isActive), userSyncCandidates: syncCandidates,
    employmentTypes: EMPLOYMENT_TYPES, certificationTypes: CERTIFICATION_TYPES, availabilityTypes: AVAILABILITY_TYPES,
    summary: {
      activePeople: rows.filter((item) => item.status === 'active').length,
      unavailableNow: rows.filter((item) => item.availability.some((block) => new Date(block.startsAt) <= today && new Date(block.endsAt) >= today)).length,
      expiringSoon: activeCertifications.filter((item) => new Date(item.expiresOn) >= today && new Date(item.expiresOn) <= warning).length,
      expired: activeCertifications.filter((item) => new Date(item.expiresOn) < today).length,
    },
  };
}

export async function createEmployee(payload = {}, actor = {}) {
  const name = text(payload.name); const resourceType = payload.resourceType === 'contractor' ? 'contractor' : 'employee';
  if (!name) throw Object.assign(new Error('Employee name is required.'), { status: 400 });
  const employmentType = EMPLOYMENT_TYPES.includes(payload.employmentType) ? payload.employmentType : (resourceType === 'contractor' ? 'contract' : 'permanent');
  const creatingLogin = payload.loginMode === 'create';
  const loginEmail = text(payload.loginEmail)?.toLowerCase(); const loginPassword = String(payload.loginPassword || '');
  const loginRole = isValidRole(payload.loginRole) ? payload.loginRole : ROLES.SALES_REP;
  if (creatingLogin && (!loginEmail || !/^\S+@\S+\.\S+$/.test(loginEmail) || loginPassword.length < 8)) throw Object.assign(new Error('A valid login email and password of at least 8 characters are required.'), { status: 400 });
  const passwordHash = creatingLogin ? await hashPassword(loginPassword) : null;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    let loginUser = null; let linkedUserId = uuid(payload.userId); let resourceName = name;
    if (creatingLogin) {
      const userResult = await client.query(`INSERT INTO users (name, email, password_hash, role, is_active)
        VALUES ($1,$2,$3,$4,TRUE) RETURNING id, name AS "displayName", email, role, is_active AS "isActive"`, [name, loginEmail, passwordHash, loginRole]);
      loginUser = userResult.rows[0]; linkedUserId = loginUser.id;
    }
    if (linkedUserId && !creatingLogin) {
      const linkedUser = await client.query(`SELECT id,name,email,role,is_active AS "isActive" FROM users WHERE id=$1::uuid FOR UPDATE`, [linkedUserId]);
      if (!linkedUser.rows.length || !linkedUser.rows[0].isActive) throw Object.assign(new Error('Select an active ERP/CRM user.'), { status: 400 });
      resourceName = linkedUser.rows[0].name; loginUser = null;
    }
    const resource = await client.query(`INSERT INTO operational_resources
      (resource_type, name, user_id, identifier, capability_tags, hourly_cost_aed, created_by_user_id)
      VALUES ($1, $2, $3::uuid, $4, $5::text[], $6, $7::uuid) RETURNING id`,
    [resourceType, resourceName, linkedUserId, text(payload.identifier), tags(payload.capabilityTags), money(payload.hourlyCostAed), actor?.userId || null]);
    await client.query(`INSERT INTO employee_operational_profiles
      (resource_id, job_title, employment_type, joined_on, ended_on, created_by_user_id, updated_by_user_id)
      VALUES ($1::uuid, $2, $3, $4::date, $5::date, $6::uuid, $6::uuid)
      ON CONFLICT (resource_id) DO UPDATE SET job_title=EXCLUDED.job_title, employment_type=EXCLUDED.employment_type,
      joined_on=EXCLUDED.joined_on, ended_on=EXCLUDED.ended_on, updated_by_user_id=EXCLUDED.updated_by_user_id, updated_at=NOW()`,
    [resource.rows[0].id, text(payload.jobTitle), employmentType, date(payload.joinedOn), date(payload.endedOn), actor?.userId || null]);
    await client.query('COMMIT');
    await audit(actor, 'create', 'employee_operational_profile', resource.rows[0].id, `Created operational employee: ${name}`);
    if (loginUser) await audit(actor, 'create', 'user', loginUser.id, `Created ERP/CRM user with employee: ${name}`);
    return { ...resource.rows[0], user: loginUser };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); if (error.code === '23505') throw Object.assign(new Error(creatingLogin ? 'That login email already exists, or the selected login is already linked.' : 'That login is already linked to another resource.'), { status: 409 }); throw error; } finally { client.release(); }
}

export async function linkUserToEmployee(resourceId, userId, actor = {}) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const person = await client.query(`SELECT id,user_id,name FROM operational_resources WHERE id=$1::uuid AND resource_type IN ('employee','contractor') FOR UPDATE`, [resourceId]);
    const user = await client.query(`SELECT id,name,email,role,is_active AS "isActive" FROM users WHERE id=$1::uuid FOR UPDATE`, [userId]);
    if (!person.rows.length || !user.rows.length) throw Object.assign(new Error('Employee or ERP/CRM user not found.'), { status: 404 });
    if (!user.rows[0].isActive) throw Object.assign(new Error('An inactive ERP/CRM user cannot be linked.'), { status: 400 });
    if (person.rows[0].user_id && String(person.rows[0].user_id) !== String(userId)) throw Object.assign(new Error('This employee is already linked to another login.'), { status: 409 });
    const other = await client.query(`SELECT id FROM operational_resources WHERE user_id=$1::uuid AND id<>$2::uuid LIMIT 1`, [userId, resourceId]);
    if (other.rows.length) throw Object.assign(new Error('This ERP/CRM user is already linked to another employee.'), { status: 409 });
    await client.query(`UPDATE operational_resources SET user_id=$2::uuid,name=$3,updated_at=NOW() WHERE id=$1::uuid`, [resourceId, userId, user.rows[0].name]);
    await client.query('COMMIT'); await audit(actor, 'update', 'employee_operational_profile', resourceId, `Linked ERP/CRM login ${user.rows[0].email}`);
    return { id: resourceId, userId, name: user.rows[0].name };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function createEmployeeFromUser(userId, payload = {}, actor = {}) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const user = await client.query(`SELECT u.id,u.name,u.email,u.is_active AS "isActive",r.id AS "linkedResourceId" FROM users u LEFT JOIN operational_resources r ON r.user_id=u.id WHERE u.id=$1::uuid FOR UPDATE OF u`, [userId]);
    if (!user.rows.length) throw Object.assign(new Error('ERP/CRM user not found.'), { status: 404 });
    if (!user.rows[0].isActive) throw Object.assign(new Error('An inactive ERP/CRM user cannot create an active employee.'), { status: 400 });
    if (user.rows[0].linkedResourceId) throw Object.assign(new Error('This ERP/CRM user is already linked to an employee.'), { status: 409 });
    const resourceType = payload.resourceType === 'contractor' ? 'contractor' : 'employee';
    const employmentType = EMPLOYMENT_TYPES.includes(payload.employmentType) ? payload.employmentType : (resourceType === 'contractor' ? 'contract' : 'permanent');
    const resource = await client.query(`INSERT INTO operational_resources (resource_type,name,user_id,identifier,capability_tags,hourly_cost_aed,created_by_user_id)
      VALUES ($1,$2,$3::uuid,$4,$5::text[],$6,$7::uuid) RETURNING id`, [resourceType,user.rows[0].name,userId,text(payload.identifier),tags(payload.capabilityTags),money(payload.hourlyCostAed),actor?.userId || null]);
    await client.query(`INSERT INTO employee_operational_profiles (resource_id,job_title,employment_type,joined_on,created_by_user_id,updated_by_user_id)
      VALUES ($1::uuid,$2,$3,$4::date,$5::uuid,$5::uuid)
      ON CONFLICT (resource_id) DO UPDATE SET job_title=EXCLUDED.job_title,employment_type=EXCLUDED.employment_type,
      joined_on=EXCLUDED.joined_on,updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=NOW()`, [resource.rows[0].id,text(payload.jobTitle),employmentType,date(payload.joinedOn),actor?.userId || null]);
    await client.query('COMMIT'); await audit(actor, 'create', 'employee_operational_profile', resource.rows[0].id, `Created employee from ERP/CRM user: ${user.rows[0].name}`); return resource.rows[0];
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); if (error.code === '23505') throw Object.assign(new Error('This ERP/CRM user is already linked.'), { status: 409 }); throw error; } finally { client.release(); }
}

export async function updateEmployee(resourceId, payload = {}, actor = {}) {
  const current = await db.query(`SELECT r.*, p.job_title, p.employment_type, p.joined_on, p.ended_on, u.name AS linked_user_name FROM operational_resources r LEFT JOIN employee_operational_profiles p ON p.resource_id = r.id LEFT JOIN users u ON u.id=r.user_id WHERE r.id = $1::uuid AND r.resource_type IN ('employee','contractor')`, [resourceId]);
  if (!current.rows.length) throw Object.assign(new Error('Employee resource not found.'), { status: 404 }); const row = current.rows[0];
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE operational_resources SET name=$2, resource_type=$3, user_id=$4::uuid, identifier=$5,
      capability_tags=$6::text[], hourly_cost_aed=$7, status=$8, updated_at=NOW() WHERE id=$1::uuid`, [resourceId,
      row.user_id ? row.linked_user_name : text(payload.name) || row.name, payload.resourceType === 'contractor' ? 'contractor' : payload.resourceType === 'employee' ? 'employee' : row.resource_type,
      Object.hasOwn(payload, 'userId') ? uuid(payload.userId) : row.user_id, Object.hasOwn(payload, 'identifier') ? text(payload.identifier) : row.identifier,
      Object.hasOwn(payload, 'capabilityTags') ? tags(payload.capabilityTags) : row.capability_tags,
      Object.hasOwn(payload, 'hourlyCostAed') ? money(payload.hourlyCostAed) : row.hourly_cost_aed, payload.status === 'inactive' ? 'inactive' : 'active']);
    await client.query(`INSERT INTO employee_operational_profiles (resource_id, job_title, employment_type, joined_on, ended_on, created_by_user_id, updated_by_user_id)
      VALUES ($1::uuid,$2,$3,$4::date,$5::date,$6::uuid,$6::uuid)
      ON CONFLICT (resource_id) DO UPDATE SET job_title=EXCLUDED.job_title, employment_type=EXCLUDED.employment_type,
      joined_on=EXCLUDED.joined_on, ended_on=EXCLUDED.ended_on, updated_by_user_id=EXCLUDED.updated_by_user_id, updated_at=NOW()`,
    [resourceId, Object.hasOwn(payload, 'jobTitle') ? text(payload.jobTitle) : row.job_title,
      EMPLOYMENT_TYPES.includes(payload.employmentType) ? payload.employmentType : row.employment_type || 'permanent',
      Object.hasOwn(payload, 'joinedOn') ? date(payload.joinedOn) : row.joined_on, Object.hasOwn(payload, 'endedOn') ? date(payload.endedOn) : row.ended_on, actor?.userId || null]);
    await client.query('COMMIT'); await audit(actor, 'update', 'employee_operational_profile', resourceId, `Updated operational employee: ${text(payload.name) || row.name}`); return { id: resourceId };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function createCertification(resourceId, payload = {}, actor = {}) {
  const title = text(payload.title); const type = CERTIFICATION_TYPES.includes(payload.certificationType) ? payload.certificationType : null;
  if (!title || !type) throw Object.assign(new Error('Certification type and title are required.'), { status: 400 });
  const result = await db.query(`INSERT INTO employee_certifications (resource_id, certification_type, title, issuer, reference_number, issued_on, expires_on, notes, created_by_user_id)
    SELECT r.id,$2,$3,$4,$5,$6::date,$7::date,$8,$9::uuid FROM operational_resources r WHERE r.id=$1::uuid AND r.resource_type IN ('employee','contractor') RETURNING id`,
  [resourceId, type, title, text(payload.issuer), text(payload.referenceNumber), date(payload.issuedOn), date(payload.expiresOn), text(payload.notes), actor?.userId || null]);
  if (!result.rows.length) throw Object.assign(new Error('Employee resource not found.'), { status: 404 }); await audit(actor, 'create', 'employee_certification', result.rows[0].id, `Added ${title}`); return result.rows[0];
}

export async function archiveCertification(resourceId, certificationId, actor = {}) {
  const result = await db.query(`UPDATE employee_certifications SET archived_at=NOW(), updated_at=NOW() WHERE id=$1::uuid AND resource_id=$2::uuid AND archived_at IS NULL RETURNING id,title`, [certificationId, resourceId]);
  if (!result.rows.length) throw Object.assign(new Error('Certification not found.'), { status: 404 }); await audit(actor, 'delete', 'employee_certification', certificationId, `Archived ${result.rows[0].title}`); return { ok: true };
}

export async function createTeamMembership(resourceId, payload = {}, actor = {}) {
  const teamId = uuid(payload.teamResourceId); const startsOn = date(payload.startsOn) || new Date().toISOString().slice(0, 10); const endsOn = date(payload.endsOn);
  if (!teamId) throw Object.assign(new Error('Select a team.'), { status: 400 });
  const client = await db.getClient();
  try {
    await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`team-membership:${resourceId}`]);
    const valid = await client.query(`SELECT COUNT(*)::int AS count FROM operational_resources WHERE (id=$1::uuid AND resource_type='team') OR (id=$2::uuid AND resource_type IN ('employee','contractor'))`, [teamId, resourceId]);
    if (valid.rows[0].count !== 2) throw Object.assign(new Error('Valid team and employee resources are required.'), { status: 400 });
    const overlap = await client.query(`SELECT id FROM resource_team_memberships WHERE team_resource_id=$1::uuid AND member_resource_id=$2::uuid
      AND starts_on <= COALESCE($4::date,'infinity'::date) AND COALESCE(ends_on,'infinity'::date) >= $3::date LIMIT 1`, [teamId, resourceId, startsOn, endsOn]);
    if (overlap.rows.length) throw Object.assign(new Error('This person already has an overlapping membership in that team.'), { status: 409 });
    const result = await client.query(`INSERT INTO resource_team_memberships (team_resource_id, member_resource_id, membership_role, starts_on, ends_on, created_by_user_id)
      VALUES ($1::uuid,$2::uuid,$3,$4::date,$5::date,$6::uuid) RETURNING id`, [teamId, resourceId, text(payload.role), startsOn, endsOn, actor?.userId || null]);
    await client.query('COMMIT'); await audit(actor, 'create', 'resource_team_membership', result.rows[0].id, 'Added employee to operational team'); return result.rows[0];
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function endTeamMembership(resourceId, membershipId, payload = {}, actor = {}) {
  const endsOn = date(payload.endsOn) || new Date().toISOString().slice(0, 10);
  const result = await db.query(`UPDATE resource_team_memberships SET ends_on=$3::date, updated_at=NOW() WHERE id=$1::uuid AND member_resource_id=$2::uuid AND starts_on <= $3::date RETURNING id`, [membershipId, resourceId, endsOn]);
  if (!result.rows.length) throw Object.assign(new Error('Active team membership not found.'), { status: 404 }); await audit(actor, 'update', 'resource_team_membership', membershipId, 'Ended operational team membership'); return { ok: true };
}
