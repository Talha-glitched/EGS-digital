import mongoose from 'mongoose';
import { Company } from '../models/Company.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Lead } from '../models/Lead.js';
import { RevenueEntry } from '../models/RevenueEntry.js';
import { AnalyticsSnapshot } from '../models/AnalyticsSnapshot.js';
import { SequenceEnrollment } from '../models/SequenceEnrollment.js';
import { getMailConfigStatus } from './mailTransport.js';
import { normalizeDomain, normalizeEmail } from '../utils/normalizeDomain.js';

function assertDb() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('MongoDB is required for CRM.');
    error.status = 503;
    throw error;
  }
}

export function getCrmAdminStatus() {
  const mail = getMailConfigStatus();
  return {
    mongodbReady: mongoose.connection.readyState === 1,
    smtpReady: mail.smtpReady,
    imapReady: mail.imapReady,
    openAiReady: Boolean(process.env.OPENAI_API_KEY),
    queueBackend: 'mongodb',
    mailboxDailyCap: Number(process.env.MAILBOX_DAILY_CAP) || 150,
  };
}

export async function listProjects() {
  assertDb();
  return ProjectCampaign.find().sort({ createdAt: -1 }).lean();
}

export async function getProject(id) {
  assertDb();
  const project = await ProjectCampaign.findById(id).lean();
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }
  return project;
}

export async function createProject(payload) {
  assertDb();
  const {
    projectName,
    milestone,
    allocatedToolBudget = 0,
    domainFixedCosts = 0,
    laborCosts = 0,
  } = payload;

  if (!projectName?.trim()) {
    const error = new Error('Project name is required.');
    error.status = 400;
    throw error;
  }

  const project = await ProjectCampaign.create({
    projectName: projectName.trim(),
    milestone: String(milestone || '').trim(),
    fromEmail: process.env.EMAIL_SMTP_USER || '',
    fromName: process.env.EMAIL_FROM_NAME || 'Exhibit Graphic Sign',
    financialLedger: {
      allocatedToolBudget: Number(allocatedToolBudget) || 0,
      domainFixedCosts: Number(domainFixedCosts) || 0,
      laborCosts: Number(laborCosts) || 0,
    },
  });
  project.recalculateCosts();
  await project.save();
  return project.toObject();
}

export async function updateProject(id, payload) {
  assertDb();
  const project = await ProjectCampaign.findById(id);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  if (payload.projectName !== undefined) project.projectName = String(payload.projectName).trim();
  if (payload.milestone !== undefined) project.milestone = String(payload.milestone || '').trim();
  if (payload.status !== undefined) project.status = payload.status;

  if (payload.financialLedger) {
    const ledger = project.financialLedger || {};
    if (payload.financialLedger.allocatedToolBudget !== undefined) {
      ledger.allocatedToolBudget = Number(payload.financialLedger.allocatedToolBudget) || 0;
    }
    if (payload.financialLedger.domainFixedCosts !== undefined) {
      ledger.domainFixedCosts = Number(payload.financialLedger.domainFixedCosts) || 0;
    }
    if (payload.financialLedger.laborCosts !== undefined) {
      ledger.laborCosts = Number(payload.financialLedger.laborCosts) || 0;
    }
    project.financialLedger = ledger;
  }

  project.recalculateCosts();
  await project.save();
  return project.toObject();
}

export async function importTargetCompanies(projectId, rows) {
  assertDb();
  const project = await ProjectCampaign.findById(projectId);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  let created = 0;
  let linked = 0;
  const errors = [];

  for (const row of rows) {
    const companyName = String(row.companyName || row.name || '').trim();
    const domain = normalizeDomain(row.domain || row.website || row.url || '');
    if (!companyName || !domain) {
      errors.push({ row, reason: 'Missing company name or domain' });
      continue;
    }

    const existing = await Company.findOne({ domain }).select('_id').lean();
    if (existing) {
      // Use a targeted update so legacy/invalid fields on the stored document
      // (e.g. an old globalStatus value) don't trigger full-document re-validation.
      await Company.updateOne(
        { _id: existing._id },
        { $addToSet: { projectsAssociated: project._id } }
      );
      linked += 1;
    } else {
      await Company.create({
        companyName,
        domain,
        industry: String(row.industry || '').trim(),
        boothNumber: String(row.boothNumber || row.booth || '').trim(),
        projectsAssociated: [project._id],
      });
      created += 1;
    }
  }

  const count = await Company.countDocuments({ projectsAssociated: project._id });
  project.targetCompaniesCount = count;
  await project.save();

  return { created, linked, total: count, errors };
}

export async function listProjectCompanies(projectId, { page = 1, limit = 50 } = {}) {
  assertDb();
  const skip = (Math.max(page, 1) - 1) * limit;
  const [items, total] = await Promise.all([
    Company.find({ projectsAssociated: projectId }).sort({ companyName: 1 }).skip(skip).limit(limit).lean(),
    Company.countDocuments({ projectsAssociated: projectId }),
  ]);
  return { items, total, page, limit };
}

export async function listProjectLeads(projectId, filters = {}) {
  assertDb();
  const query = { campaignId: projectId };
  if (filters.deliveryStatus && filters.deliveryStatus !== 'All') {
    query.deliveryStatus = filters.deliveryStatus;
  }
  if (filters.source && filters.source !== 'All') {
    query.sources = filters.source;
  }
  if (filters.search) {
    const re = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: re }, { email: re }];
  }

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(query),
  ]);

  const companyIds = [...new Set(leads.map((l) => String(l.companyId)))];
  const companies = await Company.find({ _id: { $in: companyIds } }).lean();
  const companyMap = new Map(companies.map((c) => [String(c._id), c]));

  const enriched = leads.map((lead) => ({
    ...lead,
    companyName: companyMap.get(String(lead.companyId))?.companyName || '',
  }));

  if (filters.source && filters.source !== 'All') {
    return { items: enriched, total, page, limit };
  }

  return { items: enriched, total, page, limit };
}

export async function logRevenue(payload) {
  assertDb();
  const { campaignId, amount, companyId, leadId, description, currency = 'AED' } = payload;
  if (!campaignId || !amount) {
    const error = new Error('Campaign ID and amount are required.');
    error.status = 400;
    throw error;
  }

  const project = await ProjectCampaign.findById(campaignId);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  const entry = await RevenueEntry.create({
    campaignId,
    companyId: companyId || null,
    leadId: leadId || null,
    amount: Number(amount),
    currency,
    description: String(description || '').trim(),
  });

  const totalRevenue = await RevenueEntry.aggregate([
    { $match: { campaignId: project._id } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  project.financialLedger.validatedRevenueWon = totalRevenue[0]?.total || 0;
  project.recalculateCosts();
  await project.save();

  return { entry: entry.toObject(), project: project.toObject() };
}

export async function updateOverhead(payload) {
  assertDb();
  const { campaignId, allocatedToolBudget, domainFixedCosts, laborCosts } = payload;
  const project = await ProjectCampaign.findById(campaignId);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  const ledger = project.financialLedger || {};
  if (allocatedToolBudget !== undefined) ledger.allocatedToolBudget = Number(allocatedToolBudget) || 0;
  if (domainFixedCosts !== undefined) ledger.domainFixedCosts = Number(domainFixedCosts) || 0;
  if (laborCosts !== undefined) ledger.laborCosts = Number(laborCosts) || 0;
  project.financialLedger = ledger;
  project.recalculateCosts();
  await project.save();
  return project.toObject();
}

export async function getGlobalAnalytics() {
  assertDb();
  const cached = await AnalyticsSnapshot.findOne({ scope: 'global' }).sort({ computedAt: -1 }).lean();
  if (cached) return cached;

  const [projectCount, leadCount, activeEnrollments] = await Promise.all([
    ProjectCampaign.countDocuments(),
    Lead.countDocuments(),
    SequenceEnrollment.countDocuments({ frozen: false, completedAt: null }),
  ]);

  return {
    scope: 'global',
    activeQueues: activeEnrollments,
    projectCount,
    leadCount,
    computedAt: new Date(),
  };
}

export async function getProjectAnalytics(projectId) {
  assertDb();
  const cached = await AnalyticsSnapshot.findOne({ scope: 'project', campaignId: projectId })
    .sort({ computedAt: -1 })
    .lean();
  if (cached) return cached;

  const project = await getProject(projectId);
  const target = project.targetCompaniesCount || 0;
  const withPoc = project.companiesWithPocsFound || 0;
  const responded = project.companiesRespondedCount || 0;

  return {
    scope: 'project',
    campaignId: projectId,
    pocDiscoveryPercent: target ? (withPoc / target) * 100 : 0,
    interactionProgressPercent: target ? (responded / target) * 100 : 0,
    roiPercent: new ProjectCampaign(project).getRoiPercent(),
    totalProjectCost: project.financialLedger?.totalProjectCost || 0,
    validatedRevenueWon: project.financialLedger?.validatedRevenueWon || 0,
    vendorMatrix: [],
    computedAt: new Date(),
  };
}

export async function blacklistLead(leadId) {
  assertDb();
  const lead = await Lead.findById(leadId);
  if (!lead) {
    const error = new Error('Lead not found.');
    error.status = 404;
    throw error;
  }
  lead.deliveryStatus = 'Opted Out';
  await lead.save();
  const { Suppression } = await import('../models/Suppression.js');
  await Suppression.updateOne(
    { email: lead.email },
    { $set: { email: lead.email, reason: 'blacklisted', campaignId: lead.campaignId, leadId: lead._id } },
    { upsert: true }
  );
  return lead.toObject();
}

export async function markLeadWon(leadId, { amount, description } = {}) {
  assertDb();
  const lead = await Lead.findById(leadId);
  if (!lead) {
    const error = new Error('Lead not found.');
    error.status = 404;
    throw error;
  }
  if (amount) {
    await logRevenue({
      campaignId: lead.campaignId,
      companyId: lead.companyId,
      leadId: lead._id,
      amount,
      description: description || 'Closed deal',
    });
  }
  await Company.findByIdAndUpdate(lead.companyId, { globalStatus: 'Client Partner' });
  return lead.toObject();
}

export { normalizeEmail, normalizeDomain };
