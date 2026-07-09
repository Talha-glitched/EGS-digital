import mongoose from 'mongoose';
import { Sequence } from '../models/Sequence.js';
import { SequenceEnrollment } from '../models/SequenceEnrollment.js';
import { SendJob } from '../models/SendJob.js';
import { Lead } from '../models/Lead.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { scheduleEnrollmentJob, cancelLeadJobs, sendPendingJobsBatch } from './sendWorker.js';
import { getEmailDeliveryStatus } from './userEmailService.js';
import { syncAutoCampaignStatus, syncCampaignResponseCounts } from './projectService.js';
import { getGstDayBounds } from '../utils/uaeBusinessHours.js';
import { normalizeFlowGraph, resolveEntryNodeId } from '../utils/sequenceFlowExecutor.js';
import { SequenceLaunch } from '../models/SequenceLaunch.js';
import { capResendBatchSize, RESEND_MAX_EMAILS_PER_REQUEST } from '../constants/resendLimits.js';
import {
  softDeleteRecord,
  restoreRecord,
  registerRevisionModel,
} from './revisionService.js';
import { formatDeliveryIssueRow } from '../utils/sendDeliveryErrors.js';
import { buildLeadEmailQuery, getPrimaryLeadEmail, getSendTargetEmail } from '../utils/contactEmails.js';
import { normalizeEmail } from '../utils/normalizeDomain.js';
import {
  getLeadsWithOpenSequenceStepJobs,
  getLeadsWithSentSequenceStep,
} from '../utils/sequenceSendGuards.js';

function normalizeObjectIdList(values = []) {
  return [...new Set(
    values
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter((value) => mongoose.isValidObjectId(value)),
  )];
}

export function assertEnrollmentConfirmed(options = {}) {
  if (options.confirmEnrollment !== true) {
    const error = new Error('Explicit launch confirmation is required.');
    error.status = 400;
    throw error;
  }
}

export function assertLaunchAudience(options = {}) {
  const imported = normalizeObjectIdList(options.importedCampaignIds || []);
  const hasImportCampaign = options.importCampaign === true && options.projectId;
  const hasCompanies = normalizeObjectIdList(options.includeCompanyIds || options.companyIds).length > 0;
  const hasLeads = normalizeObjectIdList(options.includeLeadIds || options.leadIds).length > 0;

  if (!imported.length && !hasImportCampaign && !hasCompanies && !hasLeads) {
    const error = new Error('Choose an audience before launching: import a campaign list or add companies/contacts.');
    error.status = 400;
    throw error;
  }
}

const BLOCKED_DELIVERY_STATUSES = ['Bounced / Invalid', 'Opted Out'];

export function enrollableDeliveryFilter() {
  return { deliveryStatus: { $nin: BLOCKED_DELIVERY_STATUSES } };
}

export function buildEnrollmentLeadQuery(projectId, options = {}) {
  const query = { campaignId: projectId, ...enrollableDeliveryFilter() };
  if (Array.isArray(options.leadIds) && options.leadIds.length) {
    query._id = { $in: options.leadIds };
  }
  if (Array.isArray(options.companyIds) && options.companyIds.length) {
    query.companyId = { $in: options.companyIds };
  }
  return query;
}

function normalizeIdList(ids) {
  return (Array.isArray(ids) ? ids : []).filter(Boolean).map(String);
}

export async function resolveAudienceLeadIds(projectId, options = {}) {
  const importedCampaignIds = normalizeIdList(
    options.importedCampaignIds?.length
      ? options.importedCampaignIds
      : (options.importCampaign === true && projectId ? [String(projectId)] : []),
  );
  const includeCompanyIds = normalizeIdList(options.includeCompanyIds || options.companyIds);
  const includeLeadIds = normalizeIdList(options.includeLeadIds || options.leadIds);
  const excludeCompanyIds = normalizeIdList(options.excludeCompanyIds);
  const excludeLeadIds = normalizeIdList(options.excludeLeadIds);

  const leadIdSet = new Set();

  const deliveryFilter = enrollableDeliveryFilter();

  for (const cid of importedCampaignIds) {
    const ids = await Lead.find({ campaignId: cid, ...deliveryFilter }).distinct('_id');
    ids.forEach((id) => leadIdSet.add(String(id)));
  }

  if (includeCompanyIds.length) {
    const ids = await Lead.find({
      companyId: { $in: includeCompanyIds },
      ...deliveryFilter,
    }).distinct('_id');
    ids.forEach((id) => leadIdSet.add(String(id)));
  }

  if (includeLeadIds.length) {
    const ids = await Lead.find({
      _id: { $in: includeLeadIds },
      ...deliveryFilter,
    }).distinct('_id');
    ids.forEach((id) => leadIdSet.add(String(id)));
  }

  if (excludeCompanyIds.length) {
    const excludeIds = await Lead.find({
      companyId: { $in: excludeCompanyIds },
    }).distinct('_id');
    excludeIds.forEach((id) => leadIdSet.delete(String(id)));
  }

  excludeLeadIds.forEach((id) => leadIdSet.delete(String(id)));

  return [...leadIdSet];
}

async function buildAudienceSnapshot(options = {}) {
  const importedCampaignIds = normalizeObjectIdList(
    options.importedCampaignIds?.length
      ? options.importedCampaignIds
      : (options.importCampaign === true && options.projectId ? [String(options.projectId)] : []),
  );
  const campaigns = importedCampaignIds.length
    ? await ProjectCampaign.find({ _id: { $in: importedCampaignIds } }).select('projectName').lean()
    : [];
  const nameMap = new Map(campaigns.map((row) => [String(row._id), row.projectName]));

  return {
    importedCampaignIds,
    importedCampaignNames: importedCampaignIds.map((id) => nameMap.get(String(id)) || 'Campaign list'),
    includeCompanyIds: normalizeObjectIdList(options.includeCompanyIds || options.companyIds),
    includeLeadIds: normalizeObjectIdList(options.includeLeadIds || options.leadIds),
    excludeCompanyIds: normalizeObjectIdList(options.excludeCompanyIds),
    excludeLeadIds: normalizeObjectIdList(options.excludeLeadIds),
  };
}

function resolveAudienceContextId(options = {}, audienceSnapshot = {}) {
  if (audienceSnapshot.importedCampaignIds?.length) {
    return String(audienceSnapshot.importedCampaignIds[0]);
  }
  if (options.projectId) return String(options.projectId);
  return null;
}

function dedupeLeads(leads = []) {
  const byId = new Map();
  for (const lead of leads) {
    if (lead?._id) byId.set(String(lead._id), lead);
  }
  return [...byId.values()];
}

const REMOVABLE_QUEUE_STATUSES = ['pending', 'processing', 'failed'];

export async function resolveLeadForCampaignEnrollment(lead, projectId) {
  if (!lead) return null;
  if (String(lead.campaignId) === String(projectId)) {
    return lead;
  }

  const primaryEmail = getPrimaryLeadEmail(lead);
  if (primaryEmail) {
    const emailQuery = buildLeadEmailQuery(primaryEmail);
    if (emailQuery) {
      const duplicate = await Lead.findOne({
        campaignId: projectId,
        _id: { $ne: lead._id },
        ...emailQuery,
      });
      if (duplicate) {
        return Lead.findById(duplicate._id);
      }
    }
  }

  lead.campaignId = projectId;
  await lead.save();

  const company = await Company.findById(lead.companyId);
  if (company && !company.projectsAssociated.some((pid) => String(pid) === String(projectId))) {
    company.projectsAssociated.push(projectId);
    await company.save();
  }

  return lead;
}

async function bulkResolveLeadsForCampaignEnrollment(leads, projectId) {
  const canonicalById = new Map();
  const needLookup = [];

  for (const lead of leads) {
    if (String(lead.campaignId) === String(projectId)) {
      canonicalById.set(String(lead._id), lead);
    } else {
      needLookup.push(lead);
    }
  }

  const chunkSize = 25;
  for (let index = 0; index < needLookup.length; index += chunkSize) {
    const chunk = needLookup.slice(index, index + chunkSize);
    const resolved = await Promise.all(
      chunk.map((lead) => resolveLeadForCampaignEnrollment(lead, projectId)),
    );
    resolved.filter(Boolean).forEach((lead) => {
      canonicalById.set(String(lead._id), lead);
    });
  }

  return [...canonicalById.values()];
}

async function buildEnrollmentStats(sequenceIds = []) {
  if (!sequenceIds.length) return new Map();

  const ids = sequenceIds.map((id) => new mongoose.Types.ObjectId(String(id)));
  const rows = await SequenceEnrollment.aggregate([
    { $match: { sequenceId: { $in: ids } } },
    {
      $group: {
        _id: '$sequenceId',
        enrolled: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $and: [{ $eq: ['$frozen', false] }, { $eq: ['$completedAt', null] }] }, 1, 0],
          },
        },
        completed: { $sum: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } },
      },
    },
  ]);

  const jobStats = await SendJob.aggregate([
    {
      $lookup: {
        from: 'sequenceenrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: '$enrollment' },
    {
      $match: {
        'enrollment.sequenceId': { $in: ids },
        status: { $in: ['pending', 'processing', 'failed', 'cancelled'] },
      },
    },
    {
      $group: {
        _id: { sequenceId: '$enrollment.sequenceId', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), {
      enrolled: row.enrolled,
      active: row.active,
      completed: row.completed,
      queued: 0,
      failed: 0,
      cancelled: 0,
    });
  }
  for (const row of jobStats) {
    const key = String(row._id.sequenceId);
    const current = map.get(key) || { enrolled: 0, active: 0, completed: 0, queued: 0, failed: 0, cancelled: 0 };
    if (row._id.status === 'pending' || row._id.status === 'processing') {
      current.queued += row.count;
    } else if (row._id.status === 'failed') {
      current.failed = row.count;
    } else if (row._id.status === 'cancelled') {
      current.cancelled = row.count;
    }
    map.set(key, current);
  }
  return map;
}

export async function listAllSequences() {
  const sequences = await Sequence.find({ deletedAt: null }).sort({ updatedAt: -1 }).lean();
  if (!sequences.length) return [];

  const campaignIds = normalizeObjectIdList(sequences.map((seq) => seq.campaignId));
  const campaigns = campaignIds.length
    ? await ProjectCampaign.find({ _id: { $in: campaignIds } })
      .select('projectName milestone status fromEmail fromName')
      .lean()
    : [];
  const campaignMap = Object.fromEntries(campaigns.map((campaign) => [String(campaign._id), campaign]));
  const statsMap = await buildEnrollmentStats(sequences.map((seq) => seq._id));

  return sequences.map((seq) => {
    const campaign = campaignMap[String(seq.campaignId)] || null;
    const stats = statsMap.get(String(seq._id)) || { enrolled: 0, active: 0, completed: 0, queued: 0, failed: 0, cancelled: 0 };
    return {
      ...seq,
      campaign,
      stats,
    };
  });
}

export async function getSequenceWithStats(id) {
  const seq = await getSequence(id);
  const campaign = seq.campaignId
    ? await ProjectCampaign.findById(seq.campaignId)
      .select('projectName milestone status fromEmail fromName')
      .lean()
    : null;
  const statsMap = await buildEnrollmentStats([seq._id]);
  const stats = statsMap.get(String(seq._id)) || { enrolled: 0, active: 0, completed: 0, queued: 0, failed: 0, cancelled: 0 };
  return { ...seq, campaign, stats };
}

export async function previewAudience(projectId, options = {}) {
  const hasAudienceSource = Boolean(
    projectId
    || options.importedCampaignIds?.length
    || options.importCampaign
    || options.includeLeadIds?.length
    || options.leadIds?.length
    || options.includeCompanyIds?.length
    || options.companyIds?.length,
  );
  if (!hasAudienceSource) {
    const error = new Error('Choose an audience list or contacts to preview.');
    error.status = 400;
    throw error;
  }

  if (projectId) {
    const project = await ProjectCampaign.findById(projectId).select('_id projectName').lean();
    if (!project) {
      const error = new Error('Project not found.');
      error.status = 404;
      throw error;
    }
  }

  const audienceContextId = resolveAudienceContextId(
    { ...options, projectId },
    await buildAudienceSnapshot({ ...options, projectId }),
  );
  const leadIds = await resolveAudienceLeadIds(audienceContextId, options);
  const eligible = leadIds.length;

  const itemLimit = options.full ? 500 : 8;
  const items = leadIds.length
    ? await Lead.find({ _id: { $in: leadIds } })
      .select('name designation email emailApollo emailHunter emailLusha companyId')
      .sort({ name: 1 })
      .limit(itemLimit)
      .lean()
    : [];

  let alreadyEnrolled = 0;
  let alreadyCompleted = 0;
  let alreadySent = 0;
  let alreadyInQueue = 0;
  let blockingContacts = [];
  if (options.sequenceId && eligible) {
    const [sentLeadIds, openLeadIds] = await Promise.all([
      getLeadsWithSentSequenceStep(options.sequenceId, leadIds, 0),
      getLeadsWithOpenSequenceStepJobs(options.sequenceId, leadIds, 0),
    ]);
    alreadySent = leadIds.filter((id) => sentLeadIds.has(String(id))).length;
    alreadyInQueue = leadIds.filter((id) => openLeadIds.has(String(id))).length;

    const enrollmentRows = await SequenceEnrollment.find({
      sequenceId: options.sequenceId,
      leadId: { $in: leadIds },
    }).lean();
    const leadMap = new Map(items.map((row) => [String(row._id), row]));
    const missingLeadIds = leadIds.filter((id) => !leadMap.has(String(id)));
    if (missingLeadIds.length) {
      const extraLeads = await Lead.find({ _id: { $in: missingLeadIds } }).select('name email').lean();
      extraLeads.forEach((row) => leadMap.set(String(row._id), row));
    }
    for (const row of enrollmentRows) {
      const lead = leadMap.get(String(row.leadId));
      if (row.frozen || row.completedAt) {
        alreadyCompleted += 1;
        blockingContacts.push({
          leadId: String(row.leadId),
          name: lead?.name || '',
          email: lead?.email || '',
          currentStepIndex: row.currentStepIndex,
          status: 'completed',
        });
        continue;
      }
      alreadyEnrolled += 1;
      blockingContacts.push({
        leadId: String(row.leadId),
        name: lead?.name || '',
        email: lead?.email || '',
        currentStepIndex: row.currentStepIndex,
        status: 'active',
      });
    }
  }

  const previouslyEnrolled = alreadyEnrolled + alreadyCompleted;
  const netNew = options.restart === true
    ? eligible
    : Math.max(0, eligible - alreadySent - alreadyInQueue);

  return {
    projectId: projectId || audienceContextId || null,
    eligible,
    alreadyEnrolled,
    alreadyCompleted,
    alreadySent,
    alreadyInQueue,
    previouslyEnrolled,
    blockingContacts,
    netNew,
    willRestart: options.restart === true ? previouslyEnrolled : 0,
    sample: items.slice(0, 8),
    items: options.full ? items : undefined,
    totalItems: eligible,
    composition: {
      importedCampaigns: normalizeIdList(
        options.importedCampaignIds?.length
          ? options.importedCampaignIds
          : (options.importCampaign === true ? [projectId] : []),
      ).length,
      includeCompanies: normalizeIdList(options.includeCompanyIds || options.companyIds).length,
      includeContacts: normalizeIdList(options.includeLeadIds || options.leadIds).length,
      excludeCompanies: normalizeIdList(options.excludeCompanyIds).length,
      excludeContacts: normalizeIdList(options.excludeLeadIds).length,
    },
  };
}

export async function getMailboxUsageStats() {
  const dailyCap = Number(process.env.MAILBOX_DAILY_CAP) || 150;
  const { start, end } = getGstDayBounds();

  const sentToday = await SendJob.countDocuments({
    status: 'sent',
    sentAt: { $gte: start, $lt: end },
  });

  const byCampaign = await SendJob.aggregate([
    { $match: { status: 'sent', sentAt: { $gte: start, $lt: end } } },
    {
      $lookup: {
        from: 'sequenceenrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: '$enrollment' },
    { $group: { _id: '$enrollment.campaignId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const campaignIds = byCampaign.map((row) => row._id).filter(Boolean);
  const campaigns = campaignIds.length
    ? await ProjectCampaign.find({ _id: { $in: campaignIds } }).select('projectName').lean()
    : [];
  const nameMap = Object.fromEntries(campaigns.map((c) => [String(c._id), c.projectName]));

  const breakdown = byCampaign.map((row) => ({
    campaignId: row._id,
    campaignName: nameMap[String(row._id)] || 'Other',
    count: row.count,
    percent: sentToday ? Math.round((row.count / sentToday) * 100) : 0,
  }));

  return {
    dailyCap,
    sentToday,
    remaining: Math.max(0, dailyCap - sentToday),
    usedPercent: dailyCap ? Math.round((sentToday / dailyCap) * 100) : 0,
    breakdown,
  };
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatSentEmailRow(row) {
  return {
    _id: row._id,
    sentAt: row.sentAt,
    recipientEmail: row.recipientEmail || '',
    renderedSubject: row.renderedSubject || '',
    renderedBody: row.renderedBody || '',
    stepIndex: row.stepIndex,
    stepNumber: Number(row.stepIndex) + 1,
    providerMessageId: row.providerMessageId || '',
    status: row.status,
    errorMessage: row.errorMessage || '',
    scheduledFor: row.scheduledFor,
    lead: row.lead
      ? {
          _id: row.lead._id,
          name: row.lead.name || '',
          email: row.lead.email || '',
          deliveryStatus: row.lead.deliveryStatus || '',
          designation: row.lead.designation || '',
          hasResponded: row.lead.deliveryStatus === 'Replied' || !!row.lead.repliedAt,
        }
      : null,
    company: row.company
      ? {
          _id: row.company._id,
          companyName: row.company.companyName || '',
        }
      : null,
    campaign: row.campaign
      ? {
          _id: row.campaign._id,
          projectName: row.campaign.projectName || '',
        }
      : null,
    sequence: row.sequence
      ? {
          _id: row.sequence._id,
          name: row.sequence.name || '',
        }
      : null,
  };
}

export async function getSentEmail(id) {
  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(String(id)) } },
    {
      $lookup: {
        from: 'leads',
        localField: 'leadId',
        foreignField: '_id',
        as: 'lead',
      },
    },
    { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'companies',
        localField: 'lead.companyId',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sequenceenrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: { path: '$enrollment', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sequences',
        localField: 'enrollment.sequenceId',
        foreignField: '_id',
        as: 'sequence',
      },
    },
    { $unwind: { path: '$sequence', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'projectcampaigns',
        localField: 'enrollment.campaignId',
        foreignField: '_id',
        as: 'campaign',
      },
    },
    { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } }
  ];

  const results = await SendJob.aggregate(pipeline);
  if (!results.length) {
    const error = new Error('Email not found.');
    error.status = 404;
    throw error;
  }

  return formatSentEmailRow(results[0]);
}

export async function listSentEmails(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const page = Math.max(Number(options.page) || 1, 1);
  const skip = (page - 1) * limit;

  const matchStage = {};
  if (options.includeAllStatuses === 'true' || options.includeAllStatuses === true) {
    // include pending, processing, sent, failed, cancelled
  } else {
    matchStage.status = 'sent';
    matchStage.sentAt = { $ne: null };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'leads',
        localField: 'leadId',
        foreignField: '_id',
        as: 'lead',
      },
    },
    { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
  ];

  if (options.repliedOnly === 'true' || options.repliedOnly === true) {
    pipeline.push({
      $match: { 'lead.deliveryStatus': 'Replied' },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'companies',
        localField: 'lead.companyId',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sequenceenrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: { path: '$enrollment', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sequences',
        localField: 'enrollment.sequenceId',
        foreignField: '_id',
        as: 'sequence',
      },
    },
    { $unwind: { path: '$sequence', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'projectcampaigns',
        localField: 'enrollment.campaignId',
        foreignField: '_id',
        as: 'campaign',
      },
    },
    { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } }
  );

  if (options.campaignId && mongoose.isValidObjectId(String(options.campaignId))) {
    pipeline.push({
      $match: { 'enrollment.campaignId': new mongoose.Types.ObjectId(String(options.campaignId)) },
    });
  }

  if (options.sequenceId && mongoose.isValidObjectId(String(options.sequenceId))) {
    pipeline.push({
      $match: { 'enrollment.sequenceId': new mongoose.Types.ObjectId(String(options.sequenceId)) },
    });
  }

  const search = String(options.q || options.search || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegExp(search), 'i');
    pipeline.push({
      $match: {
        $or: [
          { recipientEmail: rx },
          { renderedSubject: rx },
          { renderedBody: rx },
          { 'lead.name': rx },
          { 'lead.email': rx },
          { 'company.companyName': rx },
          { 'sequence.name': rx },
        ],
      },
    });
  }

  const sortStage = (options.includeAllStatuses === 'true' || options.includeAllStatuses === true)
    ? { createdAt: -1 }
    : { sentAt: -1 };

  pipeline.push(
    { $sort: sortStage },
    {
      $facet: {
        total: [{ $count: 'count' }],
        items: [{ $skip: skip }, { $limit: limit }],
      },
    },
  );

  const [result] = await SendJob.aggregate(pipeline);
  const total = result?.total?.[0]?.count || 0;
  const items = (result?.items || []).map(formatSentEmailRow);
  const { start, end } = getGstDayBounds();
  const sentToday = await SendJob.countDocuments({
    status: 'sent',
    sentAt: { $gte: start, $lt: end },
  });

  return {
    items,
    total,
    page,
    limit,
    pages: total ? Math.ceil(total / limit) : 0,
    summary: { sentToday, totalSent: total },
  };
}

function parseDeliveryStatusFilter(raw = '') {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'queued' || value === 'queue') return ['pending', 'processing'];
  if (value === 'failed') return ['failed'];
  if (value === 'cancelled' || value === 'canceled') return ['cancelled'];
  if (value === 'issues') return ['failed', 'cancelled'];
  return ['failed', 'cancelled', 'pending', 'processing'];
}

function buildDeliveryIssuePipeline({ statusFilter, campaignId, sequenceId, search, skip, limit }) {
  const pipeline = [
    { $match: { status: { $in: statusFilter } } },
    {
      $lookup: {
        from: 'leads',
        localField: 'leadId',
        foreignField: '_id',
        as: 'lead',
      },
    },
    { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sequenceenrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: { path: '$enrollment', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sequences',
        localField: 'enrollment.sequenceId',
        foreignField: '_id',
        as: 'sequence',
      },
    },
    { $unwind: { path: '$sequence', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'projectcampaigns',
        localField: 'enrollment.campaignId',
        foreignField: '_id',
        as: 'campaign',
      },
    },
    { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'companies',
        localField: 'lead.companyId',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
  ];

  if (campaignId && mongoose.isValidObjectId(String(campaignId))) {
    pipeline.push({
      $match: { 'enrollment.campaignId': new mongoose.Types.ObjectId(String(campaignId)) },
    });
  }

  if (sequenceId && mongoose.isValidObjectId(String(sequenceId))) {
    pipeline.push({
      $match: { 'enrollment.sequenceId': new mongoose.Types.ObjectId(String(sequenceId)) },
    });
  }

  if (search) {
    const rx = new RegExp(escapeRegExp(search), 'i');
    pipeline.push({
      $match: {
        $or: [
          { recipientEmail: rx },
          { renderedSubject: rx },
          { errorMessage: rx },
          { 'lead.name': rx },
          { 'lead.email': rx },
          { 'company.companyName': rx },
          { 'sequence.name': rx },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: { updatedAt: -1 } },
    {
      $facet: {
        total: [{ $count: 'count' }],
        items: [{ $skip: skip }, { $limit: limit }],
      },
    },
  );

  return pipeline;
}

export async function listSendDeliveryIssues(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const page = Math.max(Number(options.page) || 1, 1);
  const skip = (page - 1) * limit;
  const statusFilter = parseDeliveryStatusFilter(options.status || options.view || 'issues');
  const search = String(options.q || options.search || '').trim();

  const pipeline = buildDeliveryIssuePipeline({
    statusFilter,
    campaignId: options.campaignId,
    sequenceId: options.sequenceId,
    search,
    skip,
    limit,
  });

  const [result] = await SendJob.aggregate(pipeline);
  const total = result?.total?.[0]?.count || 0;
  const items = (result?.items || []).map(formatDeliveryIssueRow);

  const summaryMatch = {};
  if (options.campaignId && mongoose.isValidObjectId(String(options.campaignId))) {
    summaryMatch['enrollment.campaignId'] = new mongoose.Types.ObjectId(String(options.campaignId));
  }
  if (options.sequenceId && mongoose.isValidObjectId(String(options.sequenceId))) {
    summaryMatch['enrollment.sequenceId'] = new mongoose.Types.ObjectId(String(options.sequenceId));
  }

  const summaryRows = await SendJob.aggregate([
    {
      $lookup: {
        from: 'sequenceenrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: '$enrollment' },
    ...(Object.keys(summaryMatch).length ? [{ $match: summaryMatch }] : []),
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const summary = {
    failed: 0,
    cancelled: 0,
    queued: 0,
    processing: 0,
  };
  for (const row of summaryRows) {
    if (row._id === 'failed') summary.failed = row.count;
    else if (row._id === 'cancelled') summary.cancelled = row.count;
    else if (row._id === 'pending') summary.queued = row.count;
    else if (row._id === 'processing') summary.processing = row.count;
  }

  const errorBreakdown = {};
  for (const item of items) {
    const key = item.error?.code || 'unknown';
    errorBreakdown[key] = (errorBreakdown[key] || 0) + 1;
  }

  return {
    items,
    total,
    page,
    limit,
    pages: total ? Math.ceil(total / limit) : 0,
    summary: {
      ...summary,
      totalIssues: summary.failed + summary.cancelled,
    },
    errorBreakdown,
  };
}

export async function getSequenceDeliverySummary(sequenceId) {
  if (!mongoose.isValidObjectId(String(sequenceId))) {
    const error = new Error('Invalid sequence id.');
    error.status = 400;
    throw error;
  }

  const data = await listSendDeliveryIssues({
    sequenceId,
    status: 'issues',
    limit: 5,
    page: 1,
  });

  const recentFailed = data.items.filter((item) => item.status === 'failed');
  return {
    sequenceId,
    stats: {
      failed: data.summary.failed,
      cancelled: data.summary.cancelled,
      queued: data.summary.queued + data.summary.processing,
    },
    recentIssues: data.items,
    topError: recentFailed[0]?.error || null,
  };
}

export async function listSequences(projectId) {
  return Sequence.find({ campaignId: projectId, deletedAt: null }).sort({ createdAt: -1 }).lean();
}

export async function getSequence(id) {
  const seq = await Sequence.findById(id).lean();
  if (!seq) {
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }
  return seq;
}

export async function createStandaloneSequence(payload = {}) {
  const steps = (payload.steps || []).map((step, index) => ({
    stepOrder: index + 1,
    dayDelay: Number(step.dayDelay) || 0,
    delayUnit: step.delayUnit || 'days',
    subjectTemplate: String(step.subjectTemplate || ''),
    bodyTemplate: String(step.bodyTemplate || ''),
    useAiPersonalization: step.useAiPersonalization !== false,
    aiPrompt: String(step.aiPrompt || ''),
  }));

  return Sequence.create({
    campaignId: payload.campaignId || null,
    name: String(payload.name || 'Outreach Sequence').trim(),
    steps,
    flowGraph: normalizeFlowGraph(payload.flowGraph),
    isActive: false,
  });
}

export async function createSequence(projectId, payload) {
  if (!projectId) {
    return createStandaloneSequence(payload);
  }

  const project = await ProjectCampaign.findById(projectId);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  const steps = (payload.steps || []).map((step, index) => ({
    stepOrder: index + 1,
    dayDelay: Number(step.dayDelay) || 0,
    delayUnit: step.delayUnit || 'days',
    subjectTemplate: String(step.subjectTemplate || ''),
    bodyTemplate: String(step.bodyTemplate || ''),
    useAiPersonalization: step.useAiPersonalization !== false,
    aiPrompt: String(step.aiPrompt || ''),
  }));

  return Sequence.create({
    campaignId: projectId,
    name: String(payload.name || 'Outreach Sequence').trim(),
    steps,
    flowGraph: normalizeFlowGraph(payload.flowGraph),
    isActive: false,
  });
}

export async function updateSequence(id, payload) {
  const seq = await Sequence.findById(id);
  if (!seq) {
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }

  if (payload.name !== undefined) seq.name = String(payload.name).trim();
  if (payload.steps) {
    seq.steps = payload.steps.map((step, index) => ({
      stepOrder: index + 1,
      dayDelay: Number(step.dayDelay) || 0,
      delayUnit: step.delayUnit || 'days',
      subjectTemplate: String(step.subjectTemplate || ''),
      bodyTemplate: String(step.bodyTemplate || ''),
      useAiPersonalization: step.useAiPersonalization !== false,
      aiPrompt: String(step.aiPrompt || ''),
    }));
  }
  if (payload.flowGraph !== undefined) {
    seq.flowGraph = normalizeFlowGraph(payload.flowGraph);
  }
  if (payload.isActive !== undefined) seq.isActive = Boolean(payload.isActive);
  await seq.save();
  return seq.toObject();
}

export async function deleteSequence(id, actor = {}) {
  const seq = await Sequence.findById(id);
  if (!seq || seq.deletedAt) {
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }

  const enrollments = await SequenceEnrollment.find({ sequenceId: id }).select('_id leadId');
  const enrollmentIds = enrollments.map((row) => row._id);

  if (enrollmentIds.length) {
    await SendJob.deleteMany({ enrollmentId: { $in: enrollmentIds }, status: 'pending' });
    await SequenceEnrollment.deleteMany({ sequenceId: id });
  }

  registerRevisionModel('sequence', Sequence);
  const result = await softDeleteRecord({
    Model: Sequence,
    resourceType: 'sequence',
    id,
    actor,
  });
  await Sequence.updateOne({ _id: id }, { isActive: false });
  return { ...result, enrollmentsRemoved: enrollmentIds.length };
}

export async function restoreSequence(id, actor = {}) {
  registerRevisionModel('sequence', Sequence);
  const restored = await restoreRecord({ Model: Sequence, resourceType: 'sequence', id, actor });
  return restored;
}

export async function deleteSequences(ids = []) {
  const uniqueIds = [...new Set(normalizeIdList(ids))];
  const results = [];

  for (const id of uniqueIds) {
    try {
      const result = await deleteSequence(id, {});
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

export async function recordHistoricalSequenceSends(sequenceId, {
  sentEmails = [],
  bouncedEmails = [],
  campaignId = null,
  sentAt = new Date(),
} = {}) {
  const sequence = await Sequence.findById(sequenceId);
  if (!sequence) {
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }

  const campaignFilter = campaignId ? { campaignId } : {};
  const results = {
    markedSent: 0,
    markedBounced: 0,
    alreadyRecorded: 0,
    notFound: [],
  };

  async function findLeadByEmail(email) {
    const emailQuery = buildLeadEmailQuery(email);
    if (!emailQuery) return null;
    return Lead.findOne({ ...emailQuery, ...campaignFilter, deletedAt: null });
  }

  for (const rawEmail of bouncedEmails) {
    const email = normalizeEmail(rawEmail);
    const lead = await findLeadByEmail(email);
    if (!lead) {
      results.notFound.push(email);
      continue;
    }
    lead.deliveryStatus = 'Bounced / Invalid';
    await lead.save();
    results.markedBounced += 1;
  }

  for (const rawEmail of sentEmails) {
    const email = normalizeEmail(rawEmail);
    const lead = await findLeadByEmail(email);
    if (!lead) {
      results.notFound.push(email);
      continue;
    }

    let enrollment = await SequenceEnrollment.findOne({ sequenceId, leadId: lead._id });
    if (enrollment) {
      const sentJob = await SendJob.findOne({
        enrollmentId: enrollment._id,
        stepIndex: 0,
        status: 'sent',
      }).select('_id').lean();
      if (sentJob) {
        results.alreadyRecorded += 1;
        continue;
      }
    }

    if (!enrollment) {
      enrollment = await SequenceEnrollment.create({
        leadId: lead._id,
        campaignId: lead.campaignId,
        sequenceId,
        currentStepIndex: 0,
        frozen: true,
        completedAt: sentAt,
        lastSentAt: sentAt,
      });
    } else {
      enrollment.frozen = true;
      enrollment.completedAt = enrollment.completedAt || sentAt;
      enrollment.lastSentAt = sentAt;
      await enrollment.save();
    }

    await SendJob.create({
      leadId: lead._id,
      enrollmentId: enrollment._id,
      stepIndex: 0,
      status: 'sent',
      sentAt,
      recipientEmail: email,
      manualSend: true,
    });

    if (lead.deliveryStatus !== 'Replied') {
      lead.deliveryStatus = 'Emailed Outbound';
    }
    lead.trackingMetrics = lead.trackingMetrics || {};
    lead.trackingMetrics.emailsDeliveredCount = Math.max(lead.trackingMetrics.emailsDeliveredCount || 0, 1);
    await lead.save();
    results.markedSent += 1;
  }

  return results;
}

export async function launchSequence(sequenceId, options = {}) {
  const sequence = await Sequence.findById(sequenceId);
  if (!sequence) {
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }
  if (!sequence.steps?.length) {
    const error = new Error('Sequence must have at least one step.');
    error.status = 400;
    throw error;
  }

  const deliveryStatus = await getEmailDeliveryStatus();
  if (!deliveryStatus.emailDeliveryReady) {
    const error = new Error('Email sending is not configured. Enable Resend or connect SMTP before launching a sequence.');
    error.status = 503;
    throw error;
  }

  assertEnrollmentConfirmed(options);
  assertLaunchAudience(options);

  const audienceSnapshot = await buildAudienceSnapshot(options);
  if (sequence.campaignId && audienceSnapshot.importedCampaignIds?.length) {
    const linkedCampaignId = String(sequence.campaignId);
    const audienceIds = audienceSnapshot.importedCampaignIds.map(String);
    if (!audienceIds.includes(linkedCampaignId)) {
      const linkedCampaign = await ProjectCampaign.findById(sequence.campaignId).select('projectName').lean();
      const error = new Error(
        `Audience (${(audienceSnapshot.importedCampaignNames || []).join(', ') || 'selected lists'}) `
        + `does not include this sequence's campaign (${linkedCampaign?.projectName || 'linked campaign'}). `
        + 'Import the correct list before launching.',
      );
      error.status = 400;
      throw error;
    }
  }

  const audienceContextId = resolveAudienceContextId(options, audienceSnapshot);
  const resolvedLeadIds = await resolveAudienceLeadIds(audienceContextId, {
    ...options,
    importedCampaignIds: audienceSnapshot.importedCampaignIds,
  });

  let leads = resolvedLeadIds.length
    ? await Lead.find({ _id: { $in: resolvedLeadIds } }).sort({ name: 1 })
    : [];
  leads = leads.filter((lead) => !['Bounced / Invalid', 'Opted Out'].includes(lead.deliveryStatus));

  const canonicalLeads = dedupeLeads(leads);
  if (!canonicalLeads.length) {
    const error = new Error('No eligible contacts found for this audience.');
    error.status = 400;
    throw error;
  }

  const now = new Date();
  const flowGraph = normalizeFlowGraph(sequence.flowGraph);
  const entryNodeId = flowGraph ? resolveEntryNodeId(flowGraph) : null;
  const leadIds = canonicalLeads.map((lead) => lead._id);
  const forceRestart = options.restart === true;

  let leadsToEnroll = canonicalLeads;
  let skippedAlreadySent = 0;
  let skippedInQueue = 0;

  if (!forceRestart) {
    const [sentLeadIds, openLeadIds] = await Promise.all([
      getLeadsWithSentSequenceStep(sequenceId, leadIds, 0),
      getLeadsWithOpenSequenceStepJobs(sequenceId, leadIds, 0),
    ]);

    leadsToEnroll = canonicalLeads.filter((lead) => {
      const key = String(lead._id);
      if (sentLeadIds.has(key)) {
        skippedAlreadySent += 1;
        return false;
      }
      if (openLeadIds.has(key)) {
        skippedInQueue += 1;
        return false;
      }
      return true;
    });
  }

  console.log(
    `[Sequence] Launching sequence ${sequenceId} for ${leadsToEnroll.length} new lead(s)`
    + ` (${skippedAlreadySent} already sent, ${skippedInQueue} already queued, restart=${forceRestart})...`,
  );

  const launchBatch = await SequenceLaunch.create({
    sequenceId,
    audience: audienceSnapshot,
    launchedAt: now,
  });

  let restarted = 0;
  if (forceRestart && leadIds.length) {
    const existingEnrollments = await SequenceEnrollment.find({ sequenceId, leadId: { $in: leadIds } }).select('_id').lean();
    restarted = existingEnrollments.length;
    if (existingEnrollments.length) {
      const enrollmentIds = existingEnrollments.map((row) => row._id);
      await SendJob.deleteMany({ enrollmentId: { $in: enrollmentIds } });
      await SequenceEnrollment.deleteMany({ _id: { $in: enrollmentIds } });
    }
  } else if (leadsToEnroll.length) {
    const enrollLeadIds = leadsToEnroll.map((lead) => lead._id);
    const staleEnrollments = await SequenceEnrollment.find({
      sequenceId,
      leadId: { $in: enrollLeadIds },
    }).select('_id').lean();
    if (staleEnrollments.length) {
      const staleIds = staleEnrollments.map((row) => row._id);
      await SendJob.deleteMany({ enrollmentId: { $in: staleIds } });
      await SequenceEnrollment.deleteMany({ _id: { $in: staleIds } });
      restarted += staleEnrollments.length;
    }
  }

  const enrollments = leadsToEnroll.length
    ? await SequenceEnrollment.insertMany(
      leadsToEnroll.map((lead) => ({
        leadId: lead._id,
        campaignId: lead.campaignId,
        sequenceId,
        launchBatchId: launchBatch._id,
        currentStepIndex: 0,
        currentNodeId: entryNodeId,
        nextSendAt: now,
        frozen: false,
      })),
      { ordered: true },
    )
    : [];

  const jobs = enrollments.length
    ? await SendJob.insertMany(
      enrollments.map((enrollment) => ({
        leadId: enrollment.leadId,
        enrollmentId: enrollment._id,
        stepIndex: enrollment.currentStepIndex,
        status: 'pending',
        scheduledFor: now,
        immediateLaunch: true,
        manualSend: true,
      })),
      { ordered: true },
    )
    : [];

  const enrolled = enrollments.length;
  const merged = Math.max(0, leads.length - canonicalLeads.length);

  launchBatch.enrolledCount = enrolled;
  launchBatch.restartedCount = restarted;
  launchBatch.mergedCount = merged;
  await launchBatch.save();

  sequence.isActive = true;
  await sequence.save();

  const campaignIds = [...new Set(canonicalLeads.map((lead) => String(lead.campaignId)).filter(Boolean))];
  await Promise.all(campaignIds.map((campaignId) => syncAutoCampaignStatus(campaignId)));

  console.log(`[Sequence] Launch batch ${launchBatch._id} enrolled ${enrolled} lead(s) (${restarted} restarted).`);

  return {
    enrolled,
    restarted,
    merged,
    skippedAlreadySent,
    skippedInQueue,
    skippedActive: skippedInQueue,
    sequenceId,
    launchBatchId: launchBatch._id,
    projectId: audienceContextId || null,
    createdJobs: jobs.slice(0, 20).map((job) => ({
      _id: job._id,
      status: job.status,
      recipientEmail: job.recipientEmail,
      renderedSubject: job.renderedSubject,
    })),
  };
}

export async function enrollProjectLeads(projectId, sequenceId, options = {}) {
  const project = await ProjectCampaign.findById(projectId);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  return launchSequence(sequenceId, { ...options, projectId });
}

async function backfillLegacyLaunchBatches() {
  const orphanGroups = await SequenceEnrollment.aggregate([
    { $match: { launchBatchId: null } },
    {
      $group: {
        _id: {
          sequenceId: '$sequenceId',
          launchDay: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        },
        enrollmentIds: { $push: '$_id' },
        leadIds: { $push: '$leadId' },
        launchedAt: { $min: '$createdAt' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (!orphanGroups.length) return 0;

  let created = 0;
  for (const group of orphanGroups) {
    const uniqueLeadIds = [...new Set(group.leadIds.map((id) => String(id)))];
    const leads = await Lead.find({ _id: { $in: uniqueLeadIds } }).select('campaignId').lean();
    const campaignIds = normalizeObjectIdList(leads.map((lead) => lead.campaignId));
    const campaigns = campaignIds.length
      ? await ProjectCampaign.find({ _id: { $in: campaignIds } }).select('projectName').lean()
      : [];

    const launchBatch = await SequenceLaunch.create({
      sequenceId: group._id.sequenceId,
      audience: {
        importedCampaignIds: campaignIds,
        importedCampaignNames: campaigns.map((row) => row.projectName),
      },
      launchedAt: group.launchedAt,
      enrolledCount: group.count,
      restartedCount: 0,
      mergedCount: 0,
    });

    await SequenceEnrollment.updateMany(
      { _id: { $in: group.enrollmentIds } },
      { $set: { launchBatchId: launchBatch._id } },
    );
    created += 1;
  }

  if (created > 0) {
    console.log(`[Sequence] Backfilled ${created} legacy launch batch(es) for orphan enrollments.`);
  }

  return created;
}

export async function listLaunchBatches(options = {}) {
  await backfillLegacyLaunchBatches();

  const query = {};
  if (options.sequenceId) query.sequenceId = options.sequenceId;
  if (options.launchBatchId) query._id = options.launchBatchId;

  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const page = Math.max(Number(options.page) || 1, 1);
  const skip = (page - 1) * limit;

  const [total, batches] = await Promise.all([
    SequenceLaunch.countDocuments(query),
    SequenceLaunch.find(query).sort({ launchedAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  if (!batches.length) {
    return { items: [], total, page, pages: 0 };
  }

  const batchIds = batches.map((row) => row._id);
  const sequenceIds = [...new Set(batches.map((row) => String(row.sequenceId)))];

  const [sequences, statusRows] = await Promise.all([
    Sequence.find({ _id: { $in: sequenceIds } }).select('name').lean(),
    SequenceEnrollment.aggregate([
      { $match: { launchBatchId: { $in: batchIds } } },
      {
        $lookup: {
          from: 'sendjobs',
          localField: '_id',
          foreignField: 'enrollmentId',
          as: 'jobs',
        },
      },
      { $unwind: '$jobs' },
      {
        $group: {
          _id: { batchId: '$launchBatchId', status: '$jobs.status' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const sequenceMap = new Map(sequences.map((row) => [String(row._id), row]));
  const statusMap = new Map();
  for (const row of statusRows) {
    const batchKey = String(row._id.batchId);
    const current = statusMap.get(batchKey) || {
      pending: 0, processing: 0, sent: 0, failed: 0, cancelled: 0,
    };
    const status = row._id.status;
    if (current[status] != null) current[status] = row.count;
    statusMap.set(batchKey, current);
  }

  const items = batches.map((batch) => {
    const stats = statusMap.get(String(batch._id)) || {
      pending: 0, processing: 0, sent: 0, failed: 0, cancelled: 0,
    };
    const sequence = sequenceMap.get(String(batch.sequenceId));
    const audienceLists = batch.audience?.importedCampaignNames?.length
      ? batch.audience.importedCampaignNames
      : ['Custom audience'];

    return {
      _id: batch._id,
      sequenceId: batch.sequenceId,
      sequenceName: sequence?.name || 'Sequence',
      launchedAt: batch.launchedAt,
      enrolledCount: batch.enrolledCount || 0,
      restartedCount: batch.restartedCount || 0,
      audienceLists,
      importedCampaignIds: batch.audience?.importedCampaignIds || [],
      stats: {
        ...stats,
        queued: stats.pending + stats.processing,
      },
    };
  });

  return {
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function listLaunchBatchJobs(launchBatchId, options = {}) {
  const batch = await SequenceLaunch.findById(launchBatchId).lean();
  if (!batch) {
    const error = new Error('Launch batch not found.');
    error.status = 404;
    throw error;
  }

  const statusMatch = options.status
    ? { status: options.status }
    : { status: { $in: ['pending', 'processing', 'failed', 'sent', 'cancelled'] } };

  const rows = await SendJob.aggregate([
    {
      $lookup: {
        from: 'sequenceenrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: '$enrollment' },
    { $match: { 'enrollment.launchBatchId': new mongoose.Types.ObjectId(String(launchBatchId)), ...statusMatch } },
    { $sort: { scheduledFor: 1 } },
    {
      $lookup: {
        from: 'leads',
        localField: 'leadId',
        foreignField: '_id',
        as: 'leadDoc',
      },
    },
    { $unwind: { path: '$leadDoc', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'sequences',
        localField: 'enrollment.sequenceId',
        foreignField: '_id',
        as: 'sequenceDoc',
      },
    },
    { $unwind: { path: '$sequenceDoc', preserveNullAndEmptyArrays: true } },
  ]);

  return {
    batch,
    items: rows.map((row) => ({
      _id: row._id,
      leadId: row.leadDoc
        ? {
            _id: row.leadDoc._id,
            name: row.leadDoc.name,
            email: row.leadDoc.email,
            campaignId: row.leadDoc.campaignId,
          }
        : row.leadId,
      sequenceId: row.enrollment?.sequenceId,
      sequenceName: row.sequenceDoc?.name || '',
      enrollmentId: row.enrollmentId,
      stepIndex: row.stepIndex,
      status: row.status,
      scheduledFor: row.scheduledFor,
      sentAt: row.sentAt,
      recipientEmail: row.recipientEmail,
      renderedSubject: row.renderedSubject,
      errorMessage: row.errorMessage,
      manualSend: row.manualSend,
    })),
    total: rows.length,
  };
}

async function getLaunchBatchJobIdSet(launchBatchId) {
  const rows = await SequenceEnrollment.find({ launchBatchId }).select('_id').lean();
  if (!rows.length) return new Set();
  const jobs = await SendJob.find({
    enrollmentId: { $in: rows.map((row) => row._id) },
    status: { $in: REMOVABLE_QUEUE_STATUSES },
  }).select('_id').lean();
  return new Set(jobs.map((job) => String(job._id)));
}

export async function removeLaunchBatchJobs(launchBatchId, { jobIds = [], all = false } = {}) {
  const batch = await SequenceLaunch.findById(launchBatchId);
  if (!batch) {
    const error = new Error('Launch batch not found.');
    error.status = 404;
    throw error;
  }

  const allowed = await getLaunchBatchJobIdSet(launchBatchId);
  let idsToRemove = [];

  if (all) {
    idsToRemove = [...allowed];
  } else if (Array.isArray(jobIds) && jobIds.length) {
    idsToRemove = jobIds.map(String).filter((id) => allowed.has(id));
  } else {
    return { removed: 0, jobIds: [] };
  }

  if (!idsToRemove.length) {
    return { removed: 0, jobIds: [] };
  }

  const result = await SendJob.deleteMany({
    _id: { $in: idsToRemove },
    status: { $in: REMOVABLE_QUEUE_STATUSES },
  });

  return { removed: result.deletedCount || 0, jobIds: idsToRemove };
}

async function countPendingSendJobsForEnrollments(enrollmentIds = []) {
  if (!enrollmentIds.length) return 0;
  return SendJob.countDocuments({
    enrollmentId: { $in: enrollmentIds },
    status: { $in: ['pending', 'processing', 'failed'] },
  });
}

async function countLaunchBatchJobStats(launchBatchId) {
  const enrollments = await SequenceEnrollment.find({ launchBatchId }).select('_id').lean();
  const enrollmentIds = enrollments.map((row) => row._id);
  if (!enrollmentIds.length) {
    return { pending: 0, sent: 0, failed: 0, processing: 0, enrollmentIds };
  }

  const rows = await SendJob.aggregate([
    { $match: { enrollmentId: { $in: enrollmentIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const stats = { pending: 0, sent: 0, failed: 0, processing: 0 };
  for (const row of rows) {
    if (stats[row._id] != null) stats[row._id] = row.count;
  }

  return { ...stats, enrollmentIds };
}

const launchBatchSendRuns = new Map();

async function sendLaunchBatchChunk(launchBatchId, options = {}) {
  const batch = await SequenceLaunch.findById(launchBatchId);
  if (!batch) {
    const error = new Error('Launch batch not found.');
    error.status = 404;
    throw error;
  }

  const maxCount = capResendBatchSize(options.maxCount);
  const enrollments = await SequenceEnrollment.find({ launchBatchId }).select('_id').lean();
  const enrollmentIds = enrollments.map((row) => row._id);
  const pendingBefore = await countPendingSendJobsForEnrollments(enrollmentIds);

  const jobs = await SendJob.find({
    enrollmentId: { $in: enrollmentIds },
    status: { $in: ['pending', 'failed'] },
  })
    .sort({ scheduledFor: 1 })
    .limit(maxCount)
    .select('_id')
    .lean();

  const sendResult = await sendPendingJobsBatch(jobs.map((row) => row._id), { maxCount });
  const remaining = await countPendingSendJobsForEnrollments(enrollmentIds);

  return {
    launchBatchId: String(launchBatchId),
    ...sendResult,
    remaining,
    queuedBefore: pendingBefore,
    cappedAt: RESEND_MAX_EMAILS_PER_REQUEST,
  };
}

async function runLaunchBatchSendLoop(launchBatchId, state) {
  try {
    let iterations = 0;
    while (iterations < 200) {
      iterations += 1;
      state.iteration = iterations;
      const result = await sendLaunchBatchChunk(launchBatchId);
      state.totalSent += result.sent || 0;
      state.totalFailed += result.failed || 0;
      state.remaining = result.remaining;
      if (result.remaining <= 0) break;
      if ((result.sent || 0) === 0 && (result.failed || 0) === 0) break;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  } catch (error) {
    state.lastError = error.message || 'Launch batch send failed.';
    console.error(`[Sequence] Launch batch ${launchBatchId} background send error:`, error);
  } finally {
    state.running = false;
    state.finishedAt = new Date();
  }
}

export async function getLaunchBatchSendProgress(launchBatchId) {
  const key = String(launchBatchId);
  const batch = await SequenceLaunch.findById(launchBatchId).select('_id').lean();
  if (!batch) {
    const error = new Error('Launch batch not found.');
    error.status = 404;
    throw error;
  }

  const stats = await countLaunchBatchJobStats(launchBatchId);
  const run = launchBatchSendRuns.get(key);

  return {
    launchBatchId: key,
    running: Boolean(run?.running),
    pending: stats.pending + stats.processing,
    sent: stats.sent,
    failed: stats.failed,
    totalSentThisRun: run?.totalSent || 0,
    totalFailedThisRun: run?.totalFailed || 0,
    iteration: run?.iteration || 0,
    startedAt: run?.startedAt || null,
    finishedAt: run?.finishedAt || null,
    lastError: run?.lastError || null,
  };
}

export async function sendLaunchBatchJobs(launchBatchId, options = {}) {
  const background = options.background !== false;
  const batch = await SequenceLaunch.findById(launchBatchId);
  if (!batch) {
    const error = new Error('Launch batch not found.');
    error.status = 404;
    throw error;
  }

  const stats = await countLaunchBatchJobStats(launchBatchId);
  const pendingBefore = stats.pending + stats.processing;

  if (pendingBefore === 0) {
    return {
      launchBatchId: String(launchBatchId),
      started: false,
      running: false,
      remaining: 0,
      queuedBefore: 0,
      sent: stats.sent,
      message: 'Nothing left to send.',
    };
  }

  const key = String(launchBatchId);
  if (background) {
    const existing = launchBatchSendRuns.get(key);
    if (existing?.running) {
      return {
        launchBatchId: key,
        started: false,
        alreadyRunning: true,
        running: true,
        background: true,
        remaining: existing.remaining ?? pendingBefore,
        queuedBefore: pendingBefore,
        sent: stats.sent,
        message: 'Send already running on the server.',
      };
    }

    const state = {
      running: true,
      totalSent: 0,
      totalFailed: 0,
      remaining: pendingBefore,
      queuedBefore: pendingBefore,
      startedAt: new Date(),
      iteration: 0,
      lastError: null,
      finishedAt: null,
    };
    launchBatchSendRuns.set(key, state);
    void runLaunchBatchSendLoop(launchBatchId, state);

    return {
      launchBatchId: key,
      started: true,
      running: true,
      background: true,
      remaining: pendingBefore,
      queuedBefore: pendingBefore,
      sent: stats.sent,
      message: 'Sending on the server — you can leave this page. Already-sent contacts are skipped.',
    };
  }

  return sendLaunchBatchChunk(launchBatchId, options);
}

export async function sendCampaignQueueJobs(projectId, options = {}) {
  const project = await ProjectCampaign.findById(projectId);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  const maxCount = capResendBatchSize(options.maxCount);
  const queueJobs = await listCampaignQueueJobs(projectId, { status: 'pending' });
  const failedJobs = await listCampaignQueueJobs(projectId, { status: 'failed' });
  const combined = [...queueJobs, ...failedJobs]
    .sort((a, b) => new Date(a.scheduledFor || 0) - new Date(b.scheduledFor || 0))
    .slice(0, maxCount);

  const queuedBefore = queueJobs.length + failedJobs.length;
  const sendResult = await sendPendingJobsBatch(combined.map((row) => row._id), { maxCount });
  const remainingJobs = await listCampaignQueueJobs(projectId);

  return {
    projectId: String(projectId),
    ...sendResult,
    remaining: remainingJobs.length,
    queuedBefore,
    cappedAt: RESEND_MAX_EMAILS_PER_REQUEST,
  };
}

export async function listCampaignQueueJobs(projectId, options = {}) {
  const campaignObjectId = new mongoose.Types.ObjectId(String(projectId));
  const statusMatch = options.status
    ? { status: options.status }
    : { status: { $in: ['pending', 'processing', 'failed'] } };

  const rows = await SendJob.aggregate([
    {
      $lookup: {
        from: 'sequenceenrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: '$enrollment' },
    {
      $lookup: {
        from: 'leads',
        localField: 'leadId',
        foreignField: '_id',
        as: 'leadDoc',
      },
    },
    { $unwind: { path: '$leadDoc', preserveNullAndEmptyArrays: true } },
    {
      $match: {
        'leadDoc.campaignId': campaignObjectId,
        ...statusMatch,
      },
    },
    { $sort: { scheduledFor: 1 } },
  ]);

  return rows.map((row) => ({
    _id: row._id,
    leadId: row.leadDoc
      ? {
          _id: row.leadDoc._id,
          name: row.leadDoc.name,
          email: row.leadDoc.email,
          deliveryStatus: row.leadDoc.deliveryStatus,
          emailApollo: row.leadDoc.emailApollo,
          emailHunter: row.leadDoc.emailHunter,
          emailLusha: row.leadDoc.emailLusha,
        }
      : row.leadId,
    enrollmentId: row.enrollmentId,
    stepIndex: row.stepIndex,
    status: row.status,
    scheduledFor: row.scheduledFor,
    sentAt: row.sentAt,
    recipientEmail: row.recipientEmail,
    providerMessageId: row.providerMessageId,
    renderedSubject: row.renderedSubject,
    renderedBody: row.renderedBody,
    errorMessage: row.errorMessage,
    immediateLaunch: row.immediateLaunch,
    manualSend: row.manualSend,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

async function getCampaignQueueJobIdSet(projectId) {
  const jobs = await listCampaignQueueJobs(projectId);
  return new Set(jobs.map((job) => String(job._id)));
}

export async function removeSendJob(jobId, { projectId } = {}) {
  const job = await SendJob.findById(jobId).lean();
  if (!job) {
    const error = new Error('Send job not found.');
    error.status = 404;
    throw error;
  }
  if (!REMOVABLE_QUEUE_STATUSES.includes(job.status)) {
    const error = new Error('Only queued or failed sends can be removed.');
    error.status = 400;
    throw error;
  }
  if (projectId) {
    const allowed = await getCampaignQueueJobIdSet(projectId);
    if (!allowed.has(String(jobId))) {
      const error = new Error('Send job does not belong to this campaign queue.');
      error.status = 403;
      throw error;
    }
  }
  await SendJob.deleteOne({ _id: jobId, status: { $in: REMOVABLE_QUEUE_STATUSES } });
  return { removed: 1, jobId: String(jobId) };
}

export async function removeCampaignQueueJobs(projectId, { jobIds = [], all = false } = {}) {
  const allowed = await getCampaignQueueJobIdSet(projectId);
  let idsToRemove = [];

  if (all) {
    idsToRemove = [...allowed];
  } else if (Array.isArray(jobIds) && jobIds.length) {
    idsToRemove = jobIds.map(String).filter((id) => allowed.has(id));
  } else {
    return { removed: 0, jobIds: [] };
  }

  if (!idsToRemove.length) {
    return { removed: 0, jobIds: [] };
  }

  const result = await SendJob.deleteMany({
    _id: { $in: idsToRemove },
    status: { $in: REMOVABLE_QUEUE_STATUSES },
  });

  return {
    removed: result.deletedCount || 0,
    jobIds: idsToRemove,
  };
}

export async function resetSequenceEnrollments(sequenceId, leadIds = []) {
  const seq = await Sequence.findById(sequenceId);
  if (!seq) {
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }

  const query = { sequenceId };
  if (Array.isArray(leadIds) && leadIds.length) {
    query.leadId = { $in: leadIds };
  }

  const enrollments = await SequenceEnrollment.find(query).select('_id leadId');
  if (!enrollments.length) {
    return { reset: 0 };
  }

  const enrollmentIds = enrollments.map((row) => row._id);
  await SendJob.deleteMany({ enrollmentId: { $in: enrollmentIds } });
  await SequenceEnrollment.deleteMany({ _id: { $in: enrollmentIds } });

  return { reset: enrollments.length, sequenceId };
}

export async function freezeLeadSequence(leadId, reason = 'reply') {
  const enrollments = await SequenceEnrollment.find({ leadId, frozen: false });
  for (const enrollment of enrollments) {
    enrollment.frozen = true;
    enrollment.completedAt = new Date();
    await enrollment.save();
    await cancelLeadJobs(leadId);
  }

  const lead = await Lead.findById(leadId);
  if (!lead) return null;

  if (reason === 'reply') {
    lead.deliveryStatus = 'Replied';
    lead.repliedAt = new Date();
    await lead.save();
    if (lead.campaignId) {
      await syncCampaignResponseCounts(lead.campaignId);
    }
    return lead.toObject();
  } else if (reason === 'bounce') {
    lead.deliveryStatus = 'Bounced / Invalid';
  } else if (reason === 'opt_out') {
    lead.deliveryStatus = 'Opted Out';
  }

  await lead.save();
  return lead.toObject();
}

export async function purgeLeadFromQueue(leadId) {
  await cancelLeadJobs(leadId);
  await SequenceEnrollment.updateMany({ leadId }, { $set: { frozen: true, completedAt: new Date() } });
}
