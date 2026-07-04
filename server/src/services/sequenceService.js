import mongoose from 'mongoose';
import { Sequence } from '../models/Sequence.js';
import { SequenceEnrollment } from '../models/SequenceEnrollment.js';
import { SendJob } from '../models/SendJob.js';
import { Lead } from '../models/Lead.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { scheduleEnrollmentJob, cancelLeadJobs } from './sendWorker.js';
import { getMailConfigStatus } from './mailTransport.js';
import { syncAutoCampaignStatus } from './projectService.js';
import { getGstDayBounds } from '../utils/uaeBusinessHours.js';
import { normalizeFlowGraph, resolveEntryNodeId } from '../utils/sequenceFlowExecutor.js';
import { Company } from '../models/Company.js';
import {
  softDeleteRecord,
  restoreRecord,
  registerRevisionModel,
} from './revisionService.js';

export function assertEnrollmentConfirmed(options = {}) {
  if (options.confirmEnrollment !== true) {
    const error = new Error('Explicit launch confirmation is required.');
    error.status = 400;
    throw error;
  }
}

export function buildEnrollmentLeadQuery(projectId, options = {}) {
  const query = { campaignId: projectId, deliveryStatus: 'Pending Inqueue' };
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

  for (const cid of importedCampaignIds) {
    const ids = await Lead.find({ campaignId: cid, deliveryStatus: 'Pending Inqueue' }).distinct('_id');
    ids.forEach((id) => leadIdSet.add(String(id)));
  }

  if (includeCompanyIds.length) {
    const ids = await Lead.find({
      companyId: { $in: includeCompanyIds },
      deliveryStatus: 'Pending Inqueue',
    }).distinct('_id');
    ids.forEach((id) => leadIdSet.add(String(id)));
  }

  if (includeLeadIds.length) {
    const ids = await Lead.find({
      _id: { $in: includeLeadIds },
      deliveryStatus: { $nin: ['Bounced / Invalid', 'Opted Out'] },
    }).distinct('_id');
    ids.forEach((id) => leadIdSet.add(String(id)));
  }

  if (excludeCompanyIds.length) {
    const excludeIds = await Lead.find({
      campaignId: projectId,
      companyId: { $in: excludeCompanyIds },
    }).distinct('_id');
    excludeIds.forEach((id) => leadIdSet.delete(String(id)));
  }

  excludeLeadIds.forEach((id) => leadIdSet.delete(String(id)));

  return [...leadIdSet];
}

async function ensureLeadAssignedToCampaign(lead, projectId) {
  if (String(lead.campaignId) === String(projectId)) return true;

  const duplicate = await Lead.findOne({
    campaignId: projectId,
    email: lead.email,
    _id: { $ne: lead._id },
  });
  if (duplicate) return false;

  lead.campaignId = projectId;
  await lead.save();

  const company = await Company.findById(lead.companyId);
  if (company && !company.projectsAssociated.some((pid) => String(pid) === String(projectId))) {
    company.projectsAssociated.push(projectId);
    await company.save();
  }

  return true;
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

  const pendingJobs = await SendJob.aggregate([
    {
      $lookup: {
        from: 'sequenceenrollments',
        localField: 'enrollmentId',
        foreignField: '_id',
        as: 'enrollment',
      },
    },
    { $unwind: '$enrollment' },
    { $match: { 'enrollment.sequenceId': { $in: ids }, status: 'pending' } },
    { $group: { _id: '$enrollment.sequenceId', queued: { $sum: 1 } } },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), {
      enrolled: row.enrolled,
      active: row.active,
      completed: row.completed,
      queued: 0,
    });
  }
  for (const row of pendingJobs) {
    const key = String(row._id);
    const current = map.get(key) || { enrolled: 0, active: 0, completed: 0, queued: 0 };
    current.queued = row.queued;
    map.set(key, current);
  }
  return map;
}

export async function listAllSequences() {
  const sequences = await Sequence.find({ deletedAt: null }).sort({ updatedAt: -1 }).lean();
  if (!sequences.length) return [];

  const campaignIds = [...new Set(sequences.map((seq) => String(seq.campaignId)))];
  const campaigns = await ProjectCampaign.find({ _id: { $in: campaignIds } })
    .select('projectName milestone status fromEmail fromName')
    .lean();
  const campaignMap = Object.fromEntries(campaigns.map((campaign) => [String(campaign._id), campaign]));
  const statsMap = await buildEnrollmentStats(sequences.map((seq) => seq._id));

  return sequences.map((seq) => {
    const campaign = campaignMap[String(seq.campaignId)] || null;
    const stats = statsMap.get(String(seq._id)) || { enrolled: 0, active: 0, completed: 0, queued: 0 };
    return {
      ...seq,
      campaign,
      stats,
    };
  });
}

export async function getSequenceWithStats(id) {
  const seq = await getSequence(id);
  const campaign = await ProjectCampaign.findById(seq.campaignId)
    .select('projectName milestone status fromEmail fromName')
    .lean();
  const statsMap = await buildEnrollmentStats([seq._id]);
  const stats = statsMap.get(String(seq._id)) || { enrolled: 0, active: 0, completed: 0, queued: 0 };
  return { ...seq, campaign, stats };
}

export async function previewAudience(projectId, options = {}) {
  const project = await ProjectCampaign.findById(projectId).select('_id projectName').lean();
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  const leadIds = await resolveAudienceLeadIds(projectId, options);
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
  let blockingContacts = [];
  if (options.sequenceId && eligible) {
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

  return {
    projectId,
    eligible,
    alreadyEnrolled,
    alreadyCompleted,
    previouslyEnrolled,
    blockingContacts,
    netNew: Math.max(0, eligible - alreadyEnrolled),
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
    lead: row.lead
      ? {
          _id: row.lead._id,
          name: row.lead.name || '',
          email: row.lead.email || '',
          deliveryStatus: row.lead.deliveryStatus || '',
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

export async function listSentEmails(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const page = Math.max(Number(options.page) || 1, 1);
  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: { status: 'sent', sentAt: { $ne: null } } },
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
    { $unwind: { path: '$campaign', preserveNullAndEmptyArrays: true } },
  ];

  if (options.campaignId && mongoose.isValidObjectId(String(options.campaignId))) {
    pipeline.push({
      $match: { 'enrollment.campaignId': new mongoose.Types.ObjectId(String(options.campaignId)) },
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

  pipeline.push(
    { $sort: { sentAt: -1 } },
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

export async function createSequence(projectId, payload) {
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

export async function enrollProjectLeads(projectId, sequenceId, options = {}) {
  const [project, sequence] = await Promise.all([
    ProjectCampaign.findById(projectId),
    Sequence.findById(sequenceId),
  ]);

  if (!project || !sequence) {
    const error = new Error('Project or sequence not found.');
    error.status = 404;
    throw error;
  }
  if (String(sequence.campaignId) !== String(projectId)) {
    const error = new Error('Sequence does not belong to this project.');
    error.status = 400;
    throw error;
  }

  if (!sequence.steps?.length) {
    const error = new Error('Sequence must have at least one step.');
    error.status = 400;
    throw error;
  }
  if (!getMailConfigStatus().smtpReady) {
    const error = new Error('Email sending is not configured. Connect SMTP before launching a sequence.');
    error.status = 503;
    throw error;
  }

  assertEnrollmentConfirmed(options);
  const resolvedLeadIds = await resolveAudienceLeadIds(projectId, options);
  let leads = resolvedLeadIds.length
    ? await Lead.find({ _id: { $in: resolvedLeadIds } })
    : [];
  leads = leads.filter((lead) => !['Bounced / Invalid', 'Opted Out'].includes(lead.deliveryStatus));
  const enrollLimit = Number(options.enrollLimit);
  if (Number.isFinite(enrollLimit) && enrollLimit > 0) {
    leads = leads.slice(0, enrollLimit);
  }

  let enrolled = 0;
  let restarted = 0;
  let skippedActive = 0;
  const now = new Date();
  const flowGraph = normalizeFlowGraph(sequence.flowGraph);
  const entryNodeId = flowGraph ? resolveEntryNodeId(flowGraph) : null;

  for (const lead of leads) {
    const assigned = await ensureLeadAssignedToCampaign(lead, projectId);
    if (!assigned) continue;

    const existing = await SequenceEnrollment.findOne({ leadId: lead._id, sequenceId });
    if (existing) {
      const isActive = !existing.frozen && !existing.completedAt;
      if (isActive) {
        skippedActive += 1;
        continue;
      }
      await SendJob.deleteMany({ enrollmentId: existing._id });
      await SequenceEnrollment.deleteOne({ _id: existing._id });
      restarted += 1;
    }

    const enrollment = await SequenceEnrollment.create({
      leadId: lead._id,
      campaignId: projectId,
      sequenceId,
      currentStepIndex: 0,
      currentNodeId: entryNodeId,
      nextSendAt: now,
      frozen: false,
    });

    await scheduleEnrollmentJob(enrollment, 0, { immediate: true });
    enrolled += 1;
  }

  sequence.isActive = true;
  await sequence.save();
  await syncAutoCampaignStatus(projectId);

  return { enrolled, restarted, skippedActive, sequenceId, projectId };
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

    const project = await ProjectCampaign.findById(lead.campaignId);
    if (project) {
      const respondedCompanies = await Lead.distinct('companyId', {
        campaignId: lead.campaignId,
        deliveryStatus: 'Replied',
      });
      project.companiesRespondedCount = respondedCompanies.length;
      await project.save();
    }
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
