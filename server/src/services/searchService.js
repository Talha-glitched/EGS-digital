import mongoose from 'mongoose';
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Opportunity } from '../models/Opportunity.js';
import { Task } from '../models/Task.js';
import db from '../db/index.js';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function globalSearch(query, { limit = 5 } = {}) {
  const term = String(query || '').trim();
  if (term.length < 2) {
    return { query: term, groups: [] };
  }

  const cap = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const pattern = `%${term}%`;

  try {
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
        `SELECT id, title, summary_stage AS stage FROM ongoing_jobs 
         WHERE title ILIKE $1 ORDER BY updated_at DESC LIMIT $2`,
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
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const re = new RegExp(escapeRegExp(term), 'i');
      const [leads, companies, opportunities, tasks] = await Promise.all([
        Lead.find({ deletedAt: null, $or: [{ name: re }, { email: re }] }).limit(cap).lean(),
        Company.find({ deletedAt: null, $or: [{ companyName: re }, { domain: re }] }).limit(cap).lean(),
        Opportunity.find({ deletedAt: null, $or: [{ name: re }] }).limit(cap).lean(),
        Task.find({ deletedAt: null, $or: [{ title: re }] }).limit(cap).lean(),
      ]);

      const groups = [];
      if (leads.length) {
        groups.push({
          id: 'contacts',
          label: 'Contacts',
          items: leads.map(l => ({ id: `lead-${l._id}`, type: 'contact', recordId: l._id, title: l.name || l.email, href: '/admin/crm/people' })),
        });
      }
      if (companies.length) {
        groups.push({
          id: 'companies',
          label: 'Companies',
          items: companies.map(c => ({ id: `company-${c._id}`, type: 'company', recordId: c._id, title: c.companyName, href: '/admin/crm/companies' })),
        });
      }
      return { query: term, groups };
    }
    throw err;
  }
}
