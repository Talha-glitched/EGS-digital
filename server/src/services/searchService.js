import db from '../db/index.js';

export async function globalSearch(query, { limit = 5 } = {}) {
  const term = String(query || '').trim();
  if (term.length < 2) {
    return { query: term, groups: [] };
  }

  const cap = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const pattern = `%${term}%`;

  const [peopleRes, orgsRes, jobsRes, tasksRes] = await Promise.all([
    db.query(
      `SELECT id, display_name AS name, identity_notes AS notes FROM people 
       WHERE display_name ILIKE $1 ORDER BY updated_at DESC LIMIT $2`,
      [pattern, cap]
    ),
    db.query(
      `SELECT id, canonical_name AS "companyName", trading_name AS "domain" FROM organizations 
       WHERE canonical_name ILIKE $1 OR trading_name ILIKE $1 ORDER BY updated_at DESC LIMIT $2`,
      [pattern, cap]
    ),
    db.query(
      `SELECT oj.id, oj.title, oj.summary_stage AS stage FROM ongoing_jobs oj
       WHERE oj.title ILIKE $1
         AND oj.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1
           FROM migration_entity_map legacy_job_map
           WHERE legacy_job_map.target_table = 'ongoing_jobs'
             AND legacy_job_map.target_entity_id = oj.id
             AND legacy_job_map.source_collection = 'jobs'
         )
       ORDER BY oj.updated_at DESC LIMIT $2`,
      [pattern, cap]
    ),
    db.query(
      `SELECT id, title, status FROM tasks 
       WHERE title ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC LIMIT $2`,
      [pattern, cap]
    ),
  ]);

  const groups = [];

  if (peopleRes.rows.length) {
    groups.push({
      id: 'contacts',
      label: 'Contacts',
      items: peopleRes.rows.map(p => ({
        id: `lead-${p.id}`,
        type: 'contact',
        recordId: p.id,
        title: p.name || 'Unnamed contact',
        subtitle: p.notes || '',
        href: '/admin/crm/people',
        meta: '',
      })),
    });
  }

  if (orgsRes.rows.length) {
    groups.push({
      id: 'companies',
      label: 'Companies',
      items: orgsRes.rows.map(c => ({
        id: `company-${c.id}`,
        type: 'company',
        recordId: c.id,
        title: c.companyName || 'Unnamed company',
        subtitle: c.domain || '',
        href: '/admin/crm/companies',
        meta: '',
      })),
    });
  }

  if (jobsRes.rows.length) {
    groups.push({
      id: 'ongoing_jobs',
      label: 'Ongoing Jobs',
      items: jobsRes.rows.map(j => ({
        id: `opp-${j.id}`,
        type: 'ongoing_job',
        recordId: j.id,
        title: j.title || 'Untitled Ongoing Job',
        subtitle: j.stage || '',
        href: '/admin/crm/ongoing-jobs',
        meta: j.stage || '',
      })),
    });
  }

  if (tasksRes.rows.length) {
    groups.push({
      id: 'tasks',
      label: 'Tasks',
      items: tasksRes.rows.map(t => ({
        id: `task-${t.id}`,
        type: 'task',
        recordId: t.id,
        title: t.title || 'Untitled task',
        subtitle: t.status || '',
        href: '/admin/crm/tasks',
        meta: t.status || '',
      })),
    });
  }

  return { query: term, groups };
}
