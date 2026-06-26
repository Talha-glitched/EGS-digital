import mongoose from 'mongoose';
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Opportunity } from '../models/Opportunity.js';
import { Task } from '../models/Task.js';

function assertDb() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('MongoDB is required for CRM search.');
    error.status = 503;
    throw error;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function globalSearch(query, { limit = 5 } = {}) {
  assertDb();
  const term = String(query || '').trim();
  if (term.length < 2) {
    return { query: term, groups: [] };
  }

  const re = new RegExp(escapeRegExp(term), 'i');
  const cap = Math.min(Math.max(Number(limit) || 5, 1), 10);

  const [leads, companies, projects, opportunities, tasks] = await Promise.all([
    Lead.find({ $or: [{ name: re }, { email: re }, { designation: re }] })
      .sort({ updatedAt: -1 })
      .limit(cap)
      .populate('companyId', 'companyName domain')
      .lean(),
    Company.find({ $or: [{ companyName: re }, { domain: re }, { city: re }, { industry: re }, { genericEmails: re }] })
      .sort({ updatedAt: -1 })
      .limit(cap)
      .lean(),
    ProjectCampaign.find({ $or: [{ projectName: re }, { milestone: re }] })
      .sort({ updatedAt: -1 })
      .limit(cap)
      .lean(),
    Opportunity.find({ $or: [{ name: re }, { eventName: re }, { owner: re }] })
      .sort({ updatedAt: -1 })
      .limit(cap)
      .populate('companyId', 'companyName')
      .lean(),
    Task.find({ $or: [{ title: re }, { notes: re }] })
      .sort({ dueAt: 1, updatedAt: -1 })
      .limit(cap)
      .populate('companyId', 'companyName')
      .populate('opportunityId', 'name')
      .lean(),
  ]);

  const campaignIds = [...new Set(leads.map((l) => String(l.campaignId)).filter(Boolean))];
  const campaigns = campaignIds.length
    ? await ProjectCampaign.find({ _id: { $in: campaignIds } }).select('projectName').lean()
    : [];
  const campaignMap = new Map(campaigns.map((c) => [String(c._id), c.projectName]));

  const groups = [];

  if (leads.length) {
    groups.push({
      id: 'contacts',
      label: 'Contacts',
      items: leads.map((lead) => ({
        id: `lead-${lead._id}`,
        type: 'contact',
        title: lead.name || lead.email || 'Unnamed contact',
        subtitle: [lead.companyId?.companyName, lead.email, campaignMap.get(String(lead.campaignId))]
          .filter(Boolean)
          .join(' · '),
        href: `/admin/crm/people?q=${encodeURIComponent(lead.email || lead.name || '')}`,
        meta: lead.designation || '',
      })),
    });
  }

  if (companies.length) {
    groups.push({
      id: 'companies',
      label: 'Companies',
      items: companies.map((company) => ({
        id: `company-${company._id}`,
        type: 'company',
        title: company.companyName || company.domain || 'Unnamed company',
        subtitle: [company.domain, company.city, company.industry].filter(Boolean).join(' · '),
        href: `/admin/crm/companies?q=${encodeURIComponent(company.companyName || company.domain || '')}`,
        meta: company.globalStatus || '',
      })),
    });
  }

  if (projects.length) {
    groups.push({
      id: 'projects',
      label: 'Projects',
      items: projects.map((project) => ({
        id: `project-${project._id}`,
        type: 'project',
        title: project.projectName || 'Untitled project',
        subtitle: [project.milestone, project.status].filter(Boolean).join(' · '),
        href: `/admin/crm/projects/${project._id}`,
        meta: project.status || '',
      })),
    });
  }

  if (opportunities.length) {
    groups.push({
      id: 'opportunities',
      label: 'Opportunities',
      items: opportunities.map((opp) => ({
        id: `opp-${opp._id}`,
        type: 'opportunity',
        title: opp.name || 'Untitled opportunity',
        subtitle: [opp.companyId?.companyName, opp.stage, opp.owner].filter(Boolean).join(' · '),
        href: `/admin/crm/pipeline?q=${encodeURIComponent(opp.name || '')}`,
        meta: opp.stage || '',
      })),
    });
  }

  if (tasks.length) {
    groups.push({
      id: 'tasks',
      label: 'Tasks',
      items: tasks.map((task) => ({
        id: `task-${task._id}`,
        type: 'task',
        title: task.title || 'Untitled task',
        subtitle: [task.companyId?.companyName, task.opportunityId?.name, task.owner]
          .filter(Boolean)
          .join(' · '),
        href: `/admin/crm/tasks`,
        meta: task.status || '',
      })),
    });
  }

  return { query: term, groups };
}
