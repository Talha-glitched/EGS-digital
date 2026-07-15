import mongoose from 'mongoose';
import { Company } from '../models/Company.js';
import { normalizeGenericEmails, formatCompanyRecord } from '../utils/companyEmails.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Lead } from '../models/Lead.js';
import { RevenueEntry } from '../models/RevenueEntry.js';
import { AnalyticsSnapshot } from '../models/AnalyticsSnapshot.js';
import { SequenceEnrollment } from '../models/SequenceEnrollment.js';
import { SendJob } from '../models/SendJob.js';
import { Reply } from '../models/Reply.js';
import { getMailConfigStatus } from './mailTransport.js';
import { computeProjectSnapshot, computeVendorMatrix } from './analyticsCronService.js';
import { normalizeDomain, normalizeEmail, isValidEmail } from '../utils/normalizeDomain.js';
import { getLeadEmailCandidates, getPrimaryLeadEmail } from '../utils/contactEmails.js';
import { ContactInteraction } from '../models/ContactInteraction.js';
import {
  enrichCompaniesWithResponse,
  enrichLeadsWithResponse,
  buildLatestDateByLead,
  mergeLatestDateMaps,
  interactionQueryForLeadIds,
  getLeadResponseMeta,
  buildEarliestInboundByLead,
} from '../utils/leadResponse.js';
import { buildLatestInteractionDateMap } from './interactionService.js';
import {
  softDeleteRecord,
  restoreRecord,
  registerRevisionModel,
} from './revisionService.js';

function assertDb() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('MongoDB is required for CRM.');
    error.status = 503;
    throw error;
  }
}

function normalizeObjectIdList(values = []) {
  return [...new Set(
    values
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter((value) => mongoose.isValidObjectId(value)),
  )];
}

export function buildStepPerformance(sentRows = [], replyRows = [], maxSteps = 5) {
  const sentMap = new Map(sentRows.map((row) => [Number(row._id), Number(row.count) || 0]));
  const repliesMap = new Map(replyRows.map((row) => [Number(row._id), Number(row.count) || 0]));

  return Array.from({ length: maxSteps }, (_, stepIndex) => {
    const sent = sentMap.get(stepIndex) || 0;
    const replies = repliesMap.get(stepIndex) || 0;
    return {
      step: stepIndex + 1,
      sent,
      replies,
      rate: sent ? (replies / sent) * 100 : 0,
    };
  });
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

const EMAILED_STATUSES = ['Emailed Outbound', 'Replied', 'Bounced / Invalid'];

const MAX_LIST_LIMIT = 500;

const CAMPAIGN_STATUSES = ['Active Planning', 'Active Campaigning', 'Completed', 'Archived'];
const AUTO_LOCKED_STATUSES = ['Completed', 'Archived'];

export async function deriveAutoCampaignStatus(projectId) {
  const [activeQueues, emailedCount] = await Promise.all([
    SequenceEnrollment.countDocuments({
      campaignId: projectId,
      frozen: false,
      completedAt: null,
    }),
    Lead.countDocuments({
      campaignId: projectId,
      deliveryStatus: { $in: EMAILED_STATUSES },
    }),
  ]);

  if (activeQueues > 0 || emailedCount > 0) {
    return 'Active Campaigning';
  }
  return 'Active Planning';
}

export async function syncAutoCampaignStatus(projectId) {
  const project = await ProjectCampaign.findById(projectId);
  if (!project || project.statusSource === 'manual') {
    return project?.toObject() || null;
  }

  if (AUTO_LOCKED_STATUSES.includes(project.status)) {
    return project.toObject();
  }

  const nextStatus = await deriveAutoCampaignStatus(projectId);
  if (nextStatus !== project.status) {
    project.status = nextStatus;
    await project.save();
  }
  return project.toObject();
}

function normalizeIdList(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => String(id).trim()).filter(Boolean);
}

async function bulkSoftDelete(ids, deleteFn, actor = {}) {
  const uniqueIds = [...new Set(normalizeIdList(ids))];
  const results = [];
  for (const id of uniqueIds) {
    try {
      const result = await deleteFn(id, actor);
      results.push({ id, ok: true, ...result });
    } catch (err) {
      results.push({ id, ok: false, message: err.message || 'Delete failed.' });
    }
  }
  return {
    deleted: results.filter((row) => row.ok).length,
    failed: results.filter((row) => !row.ok).length,
    results,
  };
}

export async function listProjects() {
  assertDb();
  const projects = await ProjectCampaign.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
  if (!projects.length) return [];

  const projectIds = projects.map((p) => p._id);

  await Promise.all(
    projects
      .filter((project) => project.statusSource !== 'manual' && !AUTO_LOCKED_STATUSES.includes(project.status))
      .map((project) => syncAutoCampaignStatus(project._id)),
  );

  const refreshedProjects = await ProjectCampaign.find({ _id: { $in: projectIds }, deletedAt: null })
    .sort({ createdAt: -1 })
    .lean();

  const [pocCounts, emailedCounts, respondedCounts, reachedCounts, activeQueues, companyCounts, withPocCounts] = await Promise.all([
    Lead.aggregate([
      { $match: { campaignId: { $in: projectIds }, deletedAt: null } },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: { campaignId: { $in: projectIds }, deletedAt: null, deliveryStatus: { $in: EMAILED_STATUSES } } },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: { campaignId: { $in: projectIds }, deletedAt: null, deliveryStatus: 'Replied' } },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: { campaignId: { $in: projectIds }, deletedAt: null, deliveryStatus: { $in: EMAILED_STATUSES } } },
      { $group: { _id: { campaignId: '$campaignId', companyId: '$companyId' } } },
      { $group: { _id: '$_id.campaignId', count: { $sum: 1 } } },
    ]),
    SequenceEnrollment.aggregate([
      { $match: { campaignId: { $in: projectIds }, frozen: false, completedAt: null } },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } },
    ]),
    Company.aggregate([
      { $match: { deletedAt: null, projectsAssociated: { $in: projectIds } } },
      { $unwind: '$projectsAssociated' },
      { $match: { projectsAssociated: { $in: projectIds } } },
      { $group: { _id: '$projectsAssociated', count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: { campaignId: { $in: projectIds }, deletedAt: null } },
      { $group: { _id: { campaignId: '$campaignId', companyId: '$companyId' } } },
      { $group: { _id: '$_id.campaignId', count: { $sum: 1 } } },
    ]),
  ]);

  const toCountMap = (rows) => new Map(rows.map((row) => [String(row._id), row.count]));
  const pocMap = toCountMap(pocCounts);
  const emailedMap = toCountMap(emailedCounts);
  const respondedMap = toCountMap(respondedCounts);
  const reachedMap = toCountMap(reachedCounts);
  const queueMap = toCountMap(activeQueues);
  const companyMap = toCountMap(companyCounts);
  const withPocMap = toCountMap(withPocCounts);

  // Persist live counters so every campaign (not only opened ones) stays accurate.
  await Promise.all(refreshedProjects.map(async (project) => {
    const target = companyMap.get(String(project._id)) || 0;
    const withPoc = withPocMap.get(String(project._id)) || 0;
    if (
      Number(project.targetCompaniesCount || 0) !== target
      || Number(project.companiesWithPocsFound || 0) !== withPoc
    ) {
      await ProjectCampaign.updateOne(
        { _id: project._id },
        { $set: { targetCompaniesCount: target, companiesWithPocsFound: withPoc } },
      );
    }
  }));

  return refreshedProjects.map((project) => ({
    ...project,
    targetCompaniesCount: companyMap.get(String(project._id)) || 0,
    companiesWithPocsFound: withPocMap.get(String(project._id)) || 0,
    pocsFound: pocMap.get(String(project._id)) || 0,
    pocsEmailed: emailedMap.get(String(project._id)) || 0,
    pocsResponded: respondedMap.get(String(project._id)) || 0,
    companiesReached: reachedMap.get(String(project._id)) || 0,
    activeQueues: queueMap.get(String(project._id)) || 0,
  }));
}

export async function getProject(id) {
  assertDb();
  await syncAutoCampaignStatus(id);
  await syncCampaignResponseCounts(id);
  await recalculateCampaignCoverageStats(id);
  const project = await ProjectCampaign.findById(id).lean();
  if (!project || project.deletedAt) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }
  return project;
}

/**
 * Keep denormalized exhibitor / POC coverage counters in sync with live non-deleted records.
 */
export async function recalculateCampaignCoverageStats(projectId) {
  assertDb();
  if (!projectId) return null;
  const project = await ProjectCampaign.findById(projectId);
  if (!project || project.deletedAt) return null;

  // Companies with live campaign contacts should appear in the Companies list.
  const companyIdsWithLeads = await Lead.distinct('companyId', {
    campaignId: projectId,
    deletedAt: null,
  });
  if (companyIdsWithLeads.length) {
    await Company.updateMany(
      { _id: { $in: companyIdsWithLeads }, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, deletedBy: null } },
    );
  }

  const [companyCount, pocAgg] = await Promise.all([
    Company.countDocuments({ projectsAssociated: projectId, deletedAt: null }),
    Lead.aggregate([
      { $match: { campaignId: project._id, deletedAt: null } },
      { $group: { _id: '$companyId' } },
      { $count: 'total' },
    ]),
  ]);

  project.targetCompaniesCount = companyCount;
  project.companiesWithPocsFound = pocAgg[0]?.total || 0;
  await project.save();
  return project;
}

/** Refresh exhibitor / POC coverage counters for every active campaign. */
export async function recalculateAllCampaignCoverageStats() {
  assertDb();
  const projects = await ProjectCampaign.find({ deletedAt: null }).select('_id').lean();
  let updated = 0;
  for (const project of projects) {
    await recalculateCampaignCoverageStats(project._id);
    updated += 1;
  }
  return { updated };
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
    fromEmail: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_SMTP_USER || 'rana@exhibitgraphicsign.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Exhibit Graphic Sign',
    targetCompaniesCount: 0,
    companiesWithPocsFound: 0,
    companiesRespondedCount: 0,
    financialLedger: {
      allocatedToolBudget: Number(allocatedToolBudget) || 0,
      domainFixedCosts: Number(domainFixedCosts) || 0,
      laborCosts: Number(laborCosts) || 0,
    },
  });
  project.recalculateCosts();
  await project.save();
  await computeProjectSnapshot(project._id);
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

  if (payload.statusSource === 'auto') {
    project.statusSource = 'auto';
    if (!AUTO_LOCKED_STATUSES.includes(project.status)) {
      project.status = await deriveAutoCampaignStatus(id);
    }
  } else if (payload.status !== undefined) {
    if (!CAMPAIGN_STATUSES.includes(payload.status)) {
      const error = new Error('Invalid campaign status.');
      error.status = 400;
      throw error;
    }
    project.status = payload.status;
    project.statusSource = 'manual';
  } else if (payload.statusSource === 'manual') {
    project.statusSource = 'manual';
  }

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
  let contactsCreated = 0;
  const errors = [];

  for (const row of rows) {
    const companyName = String(row.companyName || row.name || '').trim();
    const domain = normalizeDomain(row.domain || row.website || row.url || '');
    if (!companyName || !domain) {
      errors.push({ row, reason: 'Missing company name or domain' });
      continue;
    }

    const importedEmails = normalizeGenericEmails(row.genericEmail || row.genericEmails);
    const genericPhone = String(row.genericPhone || '').trim();

    let companyId = null;
    const existing = await Company.findOne({ domain }).select('_id genericEmails deletedAt companyName').lean();
    if (existing) {
      const importedFields = {
        city: String(row.city || '').trim(),
        country: String(row.country || '').trim(),
        genericPhone,
        notes: String(row.notes || '').trim(),
        industry: String(row.industry || '').trim(),
        boothNumber: String(row.boothNumber || row.booth || '').trim(),
      };
      const nonBlankFields = Object.fromEntries(Object.entries(importedFields).filter(([, value]) => value));
      if (companyName && (!existing.companyName || existing.deletedAt)) {
        nonBlankFields.companyName = companyName;
      }
      const update = {
        $addToSet: {
          projectsAssociated: project._id,
          ...(importedEmails.length ? { genericEmails: { $each: importedEmails } } : {}),
        },
        $set: {
          ...nonBlankFields,
          // Re-importing must surface previously soft-deleted companies in the campaign list.
          deletedAt: null,
          deletedBy: null,
        },
      };
      await Company.updateOne({ _id: existing._id }, update);
      companyId = existing._id;
      linked += 1;
    } else {
      const company = await Company.create({
        companyName,
        domain,
        industry: String(row.industry || '').trim(),
        boothNumber: String(row.boothNumber || row.booth || '').trim(),
        city: String(row.city || '').trim(),
        country: String(row.country || '').trim(),
        genericEmails: importedEmails,
        genericPhone,
        notes: String(row.notes || '').trim(),
        projectsAssociated: [project._id],
      });
      companyId = company._id;
      created += 1;
    }

    contactsCreated += await ensureGenericInboxContacts({
      companyId,
      campaignId: project._id,
      companyName,
      emails: importedEmails,
      phone: genericPhone,
    });
  }

  // If contacts exist for soft-deleted companies in this campaign, restore them into the list.
  const companyIdsWithLeads = await Lead.distinct('companyId', {
    campaignId: projectId,
    deletedAt: null,
  });
  if (companyIdsWithLeads.length) {
    await Company.updateMany(
      { _id: { $in: companyIdsWithLeads }, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, deletedBy: null } },
    );
  }

  const count = (await recalculateCampaignCoverageStats(projectId))?.targetCompaniesCount
    ?? await Company.countDocuments({ projectsAssociated: project._id, deletedAt: null });

  await computeProjectSnapshot(projectId);

  return { created, linked, contactsCreated, total: count, errors };
}

/** Create People-tab contacts from company general emails so they can be enrolled in sequences. */
async function ensureGenericInboxContacts({
  companyId,
  campaignId,
  companyName = '',
  emails = [],
  phone = '',
}) {
  let created = 0;
  const displayName = String(companyName || '').trim();
  for (const raw of emails) {
    const email = normalizeEmail(raw);
    if (!email || !isValidEmail(email)) continue;

    const existing = await Lead.findOne({ campaignId, email });
    if (existing) {
      const patch = {};
      if (existing.deletedAt) {
        patch.deletedAt = null;
        patch.deletedBy = null;
      }
      if (phone && !existing.phone) patch.phone = phone;
      if (displayName && (!existing.name || existing.name === email)) patch.name = displayName;
      if (companyId && String(existing.companyId) !== String(companyId)) patch.companyId = companyId;
      if (Object.keys(patch).length) {
        await Lead.updateOne({ _id: existing._id }, { $set: patch });
      }
      continue;
    }

    try {
      await Lead.create({
        companyId,
        campaignId,
        email,
        name: displayName || email,
        phone: phone || '',
        contactKind: 'genericInbox',
        sources: ['Manual'],
        primarySource: 'Manual',
        deliveryStatus: 'Pending Inqueue',
      });
      created += 1;
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }
  return created;
}

export async function syncCampaignResponseCounts(campaignId) {
  assertDb();
  if (!campaignId) return null;

  const project = await ProjectCampaign.findById(campaignId);
  if (!project) return null;

  const leads = await Lead.find({ campaignId, deletedAt: null }).lean();
  const interactionFilter = interactionQueryForLeadIds(leads.map((lead) => lead._id));
  const interactions = interactionFilter
    ? await ContactInteraction.find(interactionFilter)
      .select('leadId relatedLeadIds direction outcome occurredAt')
      .lean()
    : [];

  const inboundByLead = buildEarliestInboundByLead(interactions);
  const respondedCompanyIds = new Set();

  leads.forEach((lead) => {
    const meta = getLeadResponseMeta(lead, {
      manualInboundAt: inboundByLead.get(String(lead._id)) || null,
    });
    if (meta.hasResponded && lead.companyId) {
      respondedCompanyIds.add(String(lead.companyId));
    }
  });

  project.companiesRespondedCount = respondedCompanyIds.size;
  await project.save();
  return project.toObject();
}

export async function listProjectCompanies(projectId, { page = 1, limit = 50 } = {}) {
  assertDb();
  const p = Math.max(Number(page) || 1, 1);
  const lim = Math.min(Math.max(Number(limit) || 50, 1), MAX_LIST_LIMIT);
  const skip = (p - 1) * lim;
  const [items, total, campaignLeads] = await Promise.all([
    Company.find({ projectsAssociated: projectId, deletedAt: null }).sort({ companyName: 1 }).skip(skip).limit(lim).lean(),
    Company.countDocuments({ projectsAssociated: projectId, deletedAt: null }),
    Lead.find({ campaignId: projectId, deletedAt: null }).lean(),
  ]);

  const leadIds = campaignLeads.map((lead) => lead._id);
  const interactionFilter = interactionQueryForLeadIds(leadIds);
  const interactions = interactionFilter
    ? await ContactInteraction.find(interactionFilter)
      .select('leadId relatedLeadIds companyId direction outcome occurredAt')
      .lean()
    : [];

  const enriched = enrichCompaniesWithResponse(items, campaignLeads, interactions).map(formatCompanyRecord);
  return { items: enriched, total, page: p, limit: lim };
}

export async function listProjectLeads(projectId, filters = {}) {
  assertDb();
  const query = { campaignId: projectId, deletedAt: null };
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
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), MAX_LIST_LIMIT);
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(query),
  ]);

  const companyIds = [...new Set(leads.map((l) => String(l.companyId)))];
  const companies = await Company.find({ _id: { $in: companyIds } }).lean();
  const companyMap = new Map(companies.map((c) => [String(c._id), c]));

  const leadIds = leads.map((lead) => lead._id);
  const interactionFilter = interactionQueryForLeadIds(leadIds);
  const interactions = interactionFilter
    ? await ContactInteraction.find(interactionFilter)
      .select('leadId relatedLeadIds direction outcome occurredAt')
      .lean()
    : [];

  const enriched = enrichLeadsWithResponse(
    leads.map((lead) => ({
      ...lead,
      companyName: companyMap.get(String(lead.companyId))?.companyName || '',
    })),
    interactions,
  );

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
  if (String(currency).toUpperCase() !== 'AED') {
    const error = new Error('Revenue must be recorded in AED until currency conversion is configured.');
    error.status = 400;
    throw error;
  }
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    const error = new Error('Revenue amount must be greater than zero.');
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

function computeRoiPercent(ledger = {}) {
  const cost = ledger.totalProjectCost || 0;
  const revenue = ledger.validatedRevenueWon || 0;
  if (cost <= 0) return 0;
  return ((revenue - cost) / cost) * 100;
}

export async function getFinanceOverview() {
  assertDb();
  const [projects, recentRevenue] = await Promise.all([
    ProjectCampaign.find().sort({ updatedAt: -1 }).lean(),
    RevenueEntry.find()
      .sort({ closedAt: -1, createdAt: -1 })
      .limit(40)
      .populate('companyId', 'companyName')
      .populate('campaignId', 'projectName')
      .lean(),
  ]);

  const projectRows = projects.map((project) => {
    const ledger = project.financialLedger || {};
    return {
      _id: project._id,
      projectName: project.projectName,
      milestone: project.milestone,
      status: project.status,
      financialLedger: ledger,
      roiPercent: computeRoiPercent(ledger),
    };
  });

  const totals = projectRows.reduce(
    (acc, row) => {
      const ledger = row.financialLedger || {};
      acc.totalCost += ledger.totalProjectCost || 0;
      acc.totalRevenue += ledger.validatedRevenueWon || 0;
      acc.toolBudget += ledger.allocatedToolBudget || 0;
      acc.domainCosts += ledger.domainFixedCosts || 0;
      acc.laborCosts += ledger.laborCosts || 0;
      acc.aiCosts += ledger.accumulatedOpenAiCost || 0;
      return acc;
    },
    { totalCost: 0, totalRevenue: 0, toolBudget: 0, domainCosts: 0, laborCosts: 0, aiCosts: 0 },
  );
  totals.roiPercent = computeRoiPercent({
    totalProjectCost: totals.totalCost,
    validatedRevenueWon: totals.totalRevenue,
  });
  totals.netProfit = totals.totalRevenue - totals.totalCost;

  return { totals, projects: projectRows, recentRevenue };
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
  const project = await getProject(projectId);
  const [vendorMatrix, activeQueues] = await Promise.all([
    computeVendorMatrix(projectId),
    SequenceEnrollment.countDocuments({
      campaignId: projectId,
      frozen: false,
      completedAt: null,
    }),
  ]);

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
    vendorMatrix,
    activeQueues,
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
  await Promise.all(getLeadEmailCandidates(lead).map((email) => Suppression.updateOne(
    { email },
    { $set: { email, reason: 'blacklisted', campaignId: lead.campaignId, leadId: lead._id } },
    { upsert: true }
  )));
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
  lead.outcome = 'Won';
  await lead.save();
  await Company.findByIdAndUpdate(lead.companyId, { globalStatus: 'Client Partner' });
  return lead.toObject();
}

export async function listAllLeads({
  search,
  campaignId,
  deliveryStatus,
  pocStatus,
  rightPocOnly,
  relationshipStatus,
  serviceCategory,
  followUp,
  sort,
  page = 1,
  limit = 50,
} = {}) {
  assertDb();
  const onlyRightPoc = rightPocOnly === true || rightPocOnly === '1' || rightPocOnly === 'true';
  const query = { deletedAt: null };
  if (campaignId && campaignId !== 'All') {
    query.campaignId = campaignId;
  }
  if (deliveryStatus && deliveryStatus !== 'All') {
    query.deliveryStatus = deliveryStatus;
  }
  if (onlyRightPoc) {
    query['pocQualification.status'] = 'Confirmed';
  } else if (pocStatus && pocStatus !== 'All') {
    query['pocQualification.status'] = pocStatus;
  }
  if (relationshipStatus && relationshipStatus !== 'All') {
    query['relationshipProfile.status'] = relationshipStatus;
  }
  if (serviceCategory && serviceCategory !== 'All') {
    query['relationshipProfile.serviceCategories'] = serviceCategory;
  }
  if (followUp === 'overdue') {
    query['relationshipProfile.nextFollowUpAt'] = { $lt: new Date() };
  } else if (followUp === 'upcoming') {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    query['relationshipProfile.nextFollowUpAt'] = { $gte: new Date(), $lte: nextWeek };
  } else if (followUp === 'scheduled') {
    query['relationshipProfile.nextFollowUpAt'] = { $ne: null };
  } else if (followUp === 'none') {
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { 'relationshipProfile.nextFollowUpAt': null },
          { 'relationshipProfile.nextFollowUpAt': { $exists: false } },
        ],
      },
    ];
  }
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$and = [
      ...(query.$and || []),
      { $or: [{ name: re }, { email: re }, { designation: re }] },
    ];
  }

  const p = Math.max(Number(page) || 1, 1);
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const skip = (p - 1) * lim;
  const sortSpec = sort === 'followUp'
    ? { 'relationshipProfile.nextFollowUpAt': 1, name: 1 }
    : { createdAt: -1 };

  const [leads, total] = await Promise.all([
    Lead.find(query).sort(sortSpec).skip(skip).limit(lim).populate('companyId').lean(),
    Lead.countDocuments(query),
  ]);

  const campaignIds = normalizeObjectIdList(leads.map((l) => l.campaignId));
  const campaigns = campaignIds.length
    ? await ProjectCampaign.find({ _id: { $in: campaignIds } }).select('projectName').lean()
    : [];
  const campaignMap = new Map(campaigns.map((c) => [String(c._id), c]));

  const enriched = leads.map((lead) => ({
    ...lead,
    companyName: lead.companyId?.companyName || '',
    domain: lead.companyId?.domain || '',
    campaignName: campaignMap.get(String(lead.campaignId))?.projectName || (lead.campaignId ? 'Campaign' : ''),
  }));

  const leadIds = enriched.map((lead) => lead._id);
  if (!leadIds.length) {
    return { items: enriched, total, page: p, limit: lim };
  }

  const [interactions, replies, sendJobs, latestInteractionMap] = await Promise.all([
    ContactInteraction.find(interactionQueryForLeadIds(leadIds))
      .select('leadId relatedLeadIds direction outcome occurredAt')
      .lean(),
    Reply.find({ leadId: { $in: leadIds } }).select('leadId receivedAt').lean(),
    SendJob.find({ leadId: { $in: leadIds }, status: 'sent' }).select('leadId sentAt').lean(),
    buildLatestInteractionDateMap(leadIds),
  ]);

  const latestByLead = mergeLatestDateMaps(
    latestInteractionMap,
    buildLatestDateByLead(replies, 'leadId', 'receivedAt'),
    buildLatestDateByLead(sendJobs, 'leadId', 'sentAt'),
  );

  return {
    items: enrichLeadsWithResponse(enriched, interactions, latestByLead),
    total,
    page: p,
    limit: lim,
  };
}

export async function getLeadById(leadId) {
  assertDb();
  const lead = await Lead.findOne({ _id: leadId, deletedAt: null }).populate('companyId').lean();
  if (!lead) {
    const error = new Error('Contact not found.');
    error.status = 404;
    throw error;
  }

  const campaign = lead.campaignId
    ? await ProjectCampaign.findById(lead.campaignId).select('projectName').lean()
    : null;

  return {
    ...lead,
    companyName: lead.companyId?.companyName || '',
    domain: lead.companyId?.domain || '',
    campaignName: campaign?.projectName || (lead.campaignId ? 'Campaign' : ''),
  };
}

export async function listAllCompanies({ search, page = 1, limit = 50 } = {}) {
  assertDb();
  const query = { deletedAt: null };
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { companyName: re },
      { domain: re },
      { city: re },
      { country: re },
      { industry: re },
      { genericEmails: re },
    ];
  }

  const p = Math.max(Number(page) || 1, 1);
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const skip = (p - 1) * lim;

  const [companies, total] = await Promise.all([
    Company.find(query).sort({ companyName: 1 }).skip(skip).limit(lim).lean(),
    Company.countDocuments(query),
  ]);

  const companyIds = companies.map(c => c._id);
  const leadCounts = await Lead.aggregate([
    { $match: { companyId: { $in: companyIds } } },
    { $group: { _id: '$companyId', count: { $sum: 1 } } }
  ]);
  const leadCountMap = new Map(leadCounts.map(lc => [String(lc._id), lc.count]));

  const allCampaignIds = normalizeObjectIdList(companies.flatMap((c) => c.projectsAssociated || []));
  const campaigns = allCampaignIds.length
    ? await ProjectCampaign.find({ _id: { $in: allCampaignIds } }).select('projectName').lean()
    : [];
  const campaignMap = new Map(campaigns.map(c => [String(c._id), c]));

  const enriched = companies.map((comp) => formatCompanyRecord({
    ...comp,
    pocCount: leadCountMap.get(String(comp._id)) || 0,
    campaignNames: (comp.projectsAssociated || [])
      .map((pid) => campaignMap.get(String(pid))?.projectName)
      .filter(Boolean),
  }));

  return { items: enriched, total, page: p, limit: lim };
}

export async function getCompanyDetails(companyId) {
  assertDb();
  const company = await Company.findById(companyId).lean();
  if (!company) {
    const error = new Error('Company not found.');
    error.status = 404;
    throw error;
  }

  const leads = await Lead.find({ companyId }).sort({ createdAt: -1 }).lean();
  
  const campaignIds = normalizeObjectIdList(leads.map((l) => l.campaignId));
  const campaigns = campaignIds.length
    ? await ProjectCampaign.find({ _id: { $in: campaignIds } }).select('projectName').lean()
    : [];
  const campaignMap = new Map(campaigns.map(c => [String(c._id), c]));
  
  const interactions = await ContactInteraction.find({
    companyId,
    deletedAt: null,
  })
    .select('leadId relatedLeadIds direction outcome occurredAt')
    .lean();

  const enrichedLeads = enrichLeadsWithResponse(
    leads.map((l) => ({
      ...l,
      campaignName: campaignMap.get(String(l.campaignId))?.projectName || (l.campaignId ? 'Campaign' : ''),
    })),
    interactions,
  );

  const companyResponse = enrichCompaniesWithResponse([company], leads, interactions)[0];

  return {
    company: formatCompanyRecord({
      ...company,
      hasResponded: companyResponse.hasResponded,
      respondedAt: companyResponse.respondedAt,
      responseChannels: companyResponse.responseChannels,
      respondingContactCount: companyResponse.respondingContactCount,
    }),
    leads: enrichedLeads,
  };
}

export async function createCompany(payload = {}) {
  assertDb();
  const companyName = String(payload.companyName || '').trim();
  const domain = normalizeDomain(String(payload.domain || '').trim());
  if (!companyName || !domain) {
    const error = new Error('Company name and domain are required.');
    error.status = 400;
    throw error;
  }

  const existing = await Company.findOne({ domain });
  if (existing) {
    const error = new Error('A company with this domain already exists.');
    error.status = 409;
    throw error;
  }

  const company = await Company.create({
    companyName,
    domain,
    industry: String(payload.industry || '').trim(),
    boothNumber: String(payload.boothNumber || '').trim(),
    city: String(payload.city || '').trim(),
    country: String(payload.country || '').trim(),
    genericEmails: normalizeGenericEmails(payload.genericEmails ?? payload.genericEmail),
    genericPhone: String(payload.genericPhone || '').trim(),
    notes: String(payload.notes || '').trim(),
    globalStatus: payload.globalStatus || 'Lead',
    projectsAssociated: [],
  });

  return formatCompanyRecord(company);
}

async function findOrCreateCompanyForLead({ companyId, companyName, domain }) {
  if (companyId) {
    const company = await Company.findById(companyId);
    if (!company) {
      const error = new Error('Company not found.');
      error.status = 404;
      throw error;
    }
    return company;
  }

  const normalizedDomain = normalizeDomain(String(domain || '').trim());
  const trimmedName = String(companyName || '').trim();
  if (!trimmedName || !normalizedDomain) {
    const error = new Error('Select an existing company or provide company name and domain.');
    error.status = 400;
    throw error;
  }

  const existing = await Company.findOne({ domain: normalizedDomain });
  if (existing) return existing;

  return Company.create({
    companyName: trimmedName,
    domain: normalizedDomain,
    globalStatus: 'Lead',
    projectsAssociated: [],
  });
}

export async function createStandaloneLead(payload = {}) {
  assertDb();
  const email = normalizeEmail(String(payload.email || '').trim());
  if (!email) {
    const error = new Error('Email is required.');
    error.status = 400;
    throw error;
  }

  const company = await findOrCreateCompanyForLead(payload);
  const campaignId = payload.campaignId || null;

  if (campaignId) {
    const campaign = await ProjectCampaign.findById(campaignId);
    if (!campaign) {
      const error = new Error('Campaign not found.');
      error.status = 404;
      throw error;
    }
    const duplicate = await Lead.findOne({ campaignId, email });
    if (duplicate) {
      const error = new Error('A contact with this email already exists in that campaign.');
      error.status = 409;
      throw error;
    }
  } else {
    const duplicate = await Lead.findOne({ companyId: company._id, email, campaignId: null });
    if (duplicate) {
      const error = new Error('This contact already exists for this company without a campaign.');
      error.status = 409;
      throw error;
    }
  }

  const lead = await Lead.create({
    companyId: company._id,
    campaignId,
    email,
    name: String(payload.name || '').trim(),
    designation: String(payload.designation || '').trim(),
    phone: String(payload.phone || '').trim(),
    linkedinUrl: String(payload.linkedinUrl || '').trim(),
    sources: ['Manual'],
    primarySource: 'Manual',
    deliveryStatus: 'Pending Inqueue',
  });

  if (campaignId && !company.projectsAssociated.some((pid) => String(pid) === String(campaignId))) {
    company.projectsAssociated.push(campaignId);
    await company.save();
  }

  const campaign = campaignId
    ? await ProjectCampaign.findById(campaignId).select('projectName').lean()
    : null;

  return {
    ...lead.toObject(),
    companyName: company.companyName,
    domain: company.domain,
    campaignName: campaign?.projectName || '',
  };
}

export async function assignLeadToCampaign(leadId, campaignId) {
  assertDb();
  const lead = await Lead.findById(leadId);
  if (!lead) {
    const error = new Error('Lead not found.');
    error.status = 404;
    throw error;
  }

  if (!campaignId) {
    lead.campaignId = null;
    await lead.save();
    const company = await Company.findById(lead.companyId);
    return {
      ...lead.toObject(),
      companyName: company?.companyName || '',
      domain: company?.domain || '',
      campaignName: '',
    };
  }

  const campaign = await ProjectCampaign.findById(campaignId);
  if (!campaign) {
    const error = new Error('Campaign not found.');
    error.status = 404;
    throw error;
  }

  if (String(lead.campaignId) !== String(campaignId)) {
    const duplicate = await Lead.findOne({
      campaignId,
      email: lead.email,
      _id: { $ne: lead._id },
    });
    if (duplicate) {
      const error = new Error('A contact with this email already exists in that campaign.');
      error.status = 409;
      throw error;
    }
    lead.campaignId = campaignId;
    await lead.save();
  }

  const company = await Company.findById(lead.companyId);
  if (company && !company.projectsAssociated.some((pid) => String(pid) === String(campaignId))) {
    company.projectsAssociated.push(campaignId);
    await company.save();
  }

  return {
    ...lead.toObject(),
    companyName: company?.companyName || '',
    domain: company?.domain || '',
    campaignName: campaign.projectName || '',
  };
}

export async function updateCompanyDetails(companyId, payload) {
  assertDb();
  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error('Company not found.');
    error.status = 404;
    throw error;
  }

  const fields = ['companyName', 'domain', 'industry', 'boothNumber', 'city', 'country', 'genericPhone', 'notes', 'globalStatus'];
  fields.forEach((f) => {
    if (payload[f] !== undefined) company[f] = payload[f];
  });
  if (payload.genericEmails !== undefined || payload.genericEmail !== undefined) {
    company.genericEmails = normalizeGenericEmails(payload.genericEmails ?? payload.genericEmail);
  }

  await company.save();
  return formatCompanyRecord(company);
}

export async function addLeadToCompany(companyId, payload) {
  return createStandaloneLead({ ...payload, companyId });
}

export async function getComprehensiveAnalytics() {
  assertDb();
  
  const [totalLeads, totalCompanies, totalCampaigns, campaigns] = await Promise.all([
    Lead.countDocuments(),
    Company.countDocuments(),
    ProjectCampaign.countDocuments(),
    ProjectCampaign.find().lean()
  ]);

  const outcomesAgg = await Lead.aggregate([
    { $group: { _id: '$outcome', count: { $sum: 1 } } }
  ]);
  const outcomes = {
    Won: 0,
    'Call Scheduled': 0,
    'Opted Out': 0,
    Lost: 0,
    Pending: 0
  };
  outcomesAgg.forEach(row => {
    const key = row._id || 'Pending';
    if (outcomes[key] !== undefined) outcomes[key] = row.count;
  });

  const statusAgg = await Lead.aggregate([
    { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } }
  ]);
  const statuses = {
    'Pending Inqueue': 0,
    'Emailed Outbound': 0,
    'Bounced / Invalid': 0,
    'Opted Out': 0,
    'Replied': 0
  };
  statusAgg.forEach(row => {
    const key = row._id || 'Pending Inqueue';
    if (statuses[key] !== undefined) statuses[key] = row.count;
  });

  const sentJobsAgg = await SendJob.aggregate([
    { $match: { status: 'sent' } },
    { $group: { _id: '$stepIndex', count: { $sum: 1 } } }
  ]);
  const leadRepliesAgg = await Lead.aggregate([
    { $match: { deliveryStatus: 'Replied' } },
    {
      $lookup: {
        from: 'sendjobs',
        let: { leadId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$leadId', '$$leadId'] }, status: 'sent' } },
          { $sort: { stepIndex: -1 } },
          { $limit: 1 }
        ],
        as: 'lastJob'
      }
    },
    { $unwind: { path: '$lastJob', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$lastJob.stepIndex', count: { $sum: 1 } } }
  ]);
  const stepsPerformance = buildStepPerformance(sentJobsAgg, leadRepliesAgg);

  const vendors = ['Apollo', 'Hunter', 'Lusha', 'Manual'];
  const vendorPerformance = [];
  for (const v of vendors) {
    const leads = await Lead.find({
      $or: [{ primarySource: v }, { sources: v }]
    }).select('_id deliveryStatus').lean();

    if (!leads.length) {
      vendorPerformance.push({ source: v, leadsCount: 0, replies: 0, bounces: 0 });
      continue;
    }

    const replies = leads.filter(l => l.deliveryStatus === 'Replied').length;
    const bounces = leads.filter(l => l.deliveryStatus === 'Bounced / Invalid').length;

    vendorPerformance.push({
      source: v,
      leadsCount: leads.length,
      replies,
      bounces
    });
  }

  const totalRevenue = campaigns.reduce((sum, p) => sum + (p.financialLedger?.validatedRevenueWon || 0), 0);
  const totalCost = campaigns.reduce((sum, p) => sum + (p.financialLedger?.totalProjectCost || 0), 0);
  const roiPercent = totalCost ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

  const campaignMetrics = campaigns.map(p => ({
    _id: p._id,
    projectName: p.projectName,
    milestone: p.milestone || '',
    status: p.status,
    totalCost: p.financialLedger?.totalProjectCost || 0,
    revenueWon: p.financialLedger?.validatedRevenueWon || 0,
    roi: p.financialLedger?.totalProjectCost ? ((p.financialLedger.validatedRevenueWon - p.financialLedger.totalProjectCost) / p.financialLedger.totalProjectCost) * 100 : 0,
    targetCompanies: p.targetCompaniesCount || 0
  }));

  return {
    totalLeads,
    totalCompanies,
    totalCampaigns,
    outcomes,
    statuses,
    stepsPerformance,
    vendorPerformance,
    financials: {
      totalRevenue,
      totalCost,
      roiPercent
    },
    campaignMetrics
  };
}

export async function deleteLead(id, actor = {}) {
  assertDb();
  registerRevisionModel('lead', Lead);
  const existing = await Lead.findById(id).select('campaignId').lean();
  const result = await softDeleteRecord({ Model: Lead, resourceType: 'lead', id, actor });
  if (existing?.campaignId) {
    await recalculateCampaignCoverageStats(existing.campaignId);
  }
  return result;
}

export async function restoreLead(id, actor = {}) {
  assertDb();
  registerRevisionModel('lead', Lead);
  const result = await restoreRecord({ Model: Lead, resourceType: 'lead', id, actor });
  const restored = await Lead.findById(id).select('campaignId').lean();
  if (restored?.campaignId) {
    await recalculateCampaignCoverageStats(restored.campaignId);
  }
  return result;
}

export async function deleteCompany(id, actor = {}) {
  assertDb();
  registerRevisionModel('company', Company);
  const existing = await Company.findById(id).select('projectsAssociated').lean();
  const result = await softDeleteRecord({ Model: Company, resourceType: 'company', id, actor });
  for (const campaignId of existing?.projectsAssociated || []) {
    await recalculateCampaignCoverageStats(campaignId);
  }
  return result;
}

export async function restoreCompany(id, actor = {}) {
  assertDb();
  registerRevisionModel('company', Company);
  const result = await restoreRecord({ Model: Company, resourceType: 'company', id, actor });
  const restored = await Company.findById(id).select('projectsAssociated').lean();
  for (const campaignId of restored?.projectsAssociated || []) {
    await recalculateCampaignCoverageStats(campaignId);
  }
  return result;
}

export async function deleteProject(id, actor = {}) {
  assertDb();
  registerRevisionModel('project', ProjectCampaign);
  return softDeleteRecord({ Model: ProjectCampaign, resourceType: 'project', id, actor });
}

export async function restoreProject(id, actor = {}) {
  assertDb();
  registerRevisionModel('project', ProjectCampaign);
  return restoreRecord({ Model: ProjectCampaign, resourceType: 'project', id, actor });
}

export async function deleteProjects(ids = [], actor = {}) {
  return bulkSoftDelete(ids, deleteProject, actor);
}

export async function deleteLeads(ids = [], actor = {}) {
  return bulkSoftDelete(ids, deleteLead, actor);
}

export async function deleteCompanies(ids = [], actor = {}) {
  return bulkSoftDelete(ids, deleteCompany, actor);
}

export { normalizeEmail, normalizeDomain };
