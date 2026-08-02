import mongoose from 'mongoose';
import { OngoingJob, Opportunity } from '../models/OngoingJob.js';
import { PipelineConfig, DEFAULT_PIPELINE_STAGES } from '../models/PipelineConfig.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { ContactInteraction } from '../models/ContactInteraction.js';
import {
  softDeleteRecord,
  restoreRecord,
  registerRevisionModel,
} from './revisionService.js';

const CHANNEL_TO_INTERACTION_TYPE = {
  phone: 'phone_call',
  email: 'email',
  whatsapp: 'whatsapp',
  meeting: 'meeting',
  linkedin: 'linkedin',
  other: 'note',
};
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { Reply } from '../models/Reply.js';
import { SendJob } from '../models/SendJob.js';
import {
  CLOSED_LOST_STAGE,
  CLOSED_WON_STAGE,
  isClosedStage,
  probabilityForStage,
  stageNames,
} from '../constants/ongoingJobPipeline.js';
import { getLeadTimeline, getCompanyTimeline } from './contactTimelineService.js';
import { createCompletedJobFromOngoingJob } from './completedJobService.js';

function assertDb() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('MongoDB is required for CRM.');
    error.status = 503;
    throw error;
  }
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeObjectIdList(values = []) {
  return [...new Set(
    values
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter((value) => mongoose.isValidObjectId(value)),
  )];
}

function normalizeTextList(values = []) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

async function resolveOwnerAssignment(payload = {}, fallbackOwner = 'admin') {
  const ownerUserId = payload.ownerUserId && mongoose.isValidObjectId(String(payload.ownerUserId))
    ? String(payload.ownerUserId)
    : null;
  const requestedOwner = String(payload.owner || '').trim();
  if (ownerUserId) {
    const user = await User.findById(ownerUserId).select('displayName').lean();
    if (!user) {
      const error = new Error('Assigned owner user not found.');
      error.status = 400;
      throw error;
    }
    return { owner: user.displayName || requestedOwner || fallbackOwner, ownerUserId };
  }
  if (requestedOwner) {
    const user = await User.findOne({ displayName: requestedOwner, isActive: true }).select('_id displayName').lean();
    if (user) return { owner: user.displayName || requestedOwner, ownerUserId: String(user._id) };
  }
  return { owner: String(fallbackOwner || 'admin').trim() || 'admin', ownerUserId: null };
}

async function validateOpportunityContacts(companyId, primaryLeadId, stakeholderLeadIds = []) {
  const allLeadIds = normalizeObjectIdList([
    primaryLeadId,
    ...stakeholderLeadIds,
  ]);
  if (!allLeadIds.length) return { primaryLeadId: primaryLeadId || null, stakeholderLeadIds: [] };
  const leads = await Lead.find({ _id: { $in: allLeadIds }, companyId, deletedAt: null }).select('_id').lean();
  if (leads.length !== allLeadIds.length) {
    const error = new Error('All selected client contacts must belong to the selected company.');
    error.status = 400;
    throw error;
  }
  const normalizedPrimary = primaryLeadId && mongoose.isValidObjectId(String(primaryLeadId))
    ? String(primaryLeadId)
    : null;
  return {
    primaryLeadId: normalizedPrimary,
    stakeholderLeadIds: allLeadIds.filter((id) => id !== normalizedPrimary),
  };
}

function normalizeStages(stages = []) {
  return stages
    .map((stage) => ({
      name: String(stage.name || '').trim(),
      probability: Math.min(100, Math.max(0, cleanNumber(stage.probability, 10))),
    }))
    .filter((stage) => stage.name);
}

function appendActivity(ongoingJob, entry, actor = 'admin') {
  if (!Array.isArray(ongoingJob.activityLog)) ongoingJob.activityLog = [];
  ongoingJob.activityLog.unshift({
    action: entry.action,
    field: entry.field || '',
    from: entry.from ?? null,
    to: entry.to ?? null,
    by: actor || 'admin',
    at: new Date(),
  });
  if (ongoingJob.activityLog.length > 100) {
    ongoingJob.activityLog = ongoingJob.activityLog.slice(0, 100);
  }
}

function trackChanges(ongoingJob, payload, actor) {
  const tracked = {
    name: 'name',
    companyId: 'companyId',
    primaryLeadId: 'primaryLeadId',
    stakeholderLeadIds: 'client contacts',
    campaignId: 'campaignId',
    owner: 'owner',
    collaborators: 'internal collaborators',
    stage: 'stage',
    nextAction: 'next action',
    eventName: 'event',
    notes: 'notes',
    valueAed: 'value',
  };

  Object.entries(tracked).forEach(([field, label]) => {
    if (payload[field] === undefined) return;
    const current = ongoingJob[field];
    const next = payload[field] || null;
    const currentValue = current == null ? '' : String(current);
    const nextValue = next == null ? '' : String(next);
    if (currentValue !== nextValue) {
      appendActivity(ongoingJob, {
        action: `Updated ${label}`,
        field,
        from: currentValue || null,
        to: nextValue || null,
      }, actor);
    }
  });
}

async function getPipelineStages() {
  assertDb();
  const config = await PipelineConfig.findOne({ key: 'sales' }).lean();
  let rawStages = config?.stages;
  if (!rawStages || !rawStages.length) {
    rawStages = DEFAULT_PIPELINE_STAGES;
    await PipelineConfig.findOneAndUpdate(
      { key: 'sales' },
      { stages: DEFAULT_PIPELINE_STAGES, updatedBy: 'system' },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).catch(() => {});
  }
  const stages = normalizeStages(rawStages?.length ? rawStages : DEFAULT_PIPELINE_STAGES);
  return stages.length ? stages : DEFAULT_PIPELINE_STAGES.map((stage) => ({ ...stage }));
}

async function getPopulatedOngoingJob(id) {
  return withOpportunityPopulate(
    OngoingJob.findOne({ _id: id, deletedAt: null }),
  ).lean();
}

export async function getPipelineConfig() {
  const stages = await getPipelineStages();
  const config = await PipelineConfig.findOne({ key: 'sales' }).lean();
  return {
    stages,
    updatedAt: config?.updatedAt || null,
    updatedBy: config?.updatedBy || '',
  };
}

export async function updatePipelineConfig(payload, actor = 'admin') {
  assertDb();
  const stages = normalizeStages(payload.stages);
  if (!stages.length) {
    const error = new Error('At least one pipeline stage is required.');
    error.status = 400;
    throw error;
  }

  const names = new Set();
  for (const stage of stages) {
    if (names.has(stage.name)) {
      const error = new Error(`Duplicate stage name: ${stage.name}`);
      error.status = 400;
      throw error;
    }
    names.add(stage.name);
  }

  const config = await PipelineConfig.findOneAndUpdate(
    { key: 'sales' },
    { stages, updatedBy: String(actor || 'admin').trim() },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return {
    stages: config.stages,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
  };
}

const OPPORTUNITY_POPULATE = [
  { path: 'companyId', select: 'companyName domain globalStatus' },
  { path: 'primaryLeadId', select: 'name email designation pocQualification' },
  { path: 'stakeholderLeadIds', select: 'name email designation pocQualification' },
  { path: 'campaignId', select: 'projectName' },
  { path: 'ownerUserId', select: 'displayName email role' },
  { path: 'collaboratorUserIds', select: 'displayName email role' },
];

function withOpportunityPopulate(query) {
  return OPPORTUNITY_POPULATE.reduce((q, spec) => q.populate(spec), query);
}

export async function listOngoingJobs({ stage, owner, search, campaignId, companyId, _designerName, _designerUser } = {}) {
  assertDb();
  const stages = await getPipelineStages();
  const query = { deletedAt: null };
  if (stage && stage !== 'All') query.stage = stage;
  if (owner && owner !== 'All') query.owner = owner;
  if (campaignId && mongoose.isValidObjectId(String(campaignId))) query.campaignId = campaignId;
  if (companyId && mongoose.isValidObjectId(String(companyId))) query.companyId = companyId;

  const designer = _designerUser || (_designerName ? { displayName: _designerName } : null);
  if (designer) {
    const displayName = designer.displayName || '';
    const username = designer.username || '';
    const userId = designer.id || designer.userId || designer._id;

    const taskOwnerConditions = [
      ...(displayName ? [{ owner: displayName }] : []),
      ...(username ? [{ owner: username }] : []),
      ...(userId && mongoose.isValidObjectId(String(userId)) ? [{ ownerUserId: userId }] : []),
    ];
    const designerTasks = await Task.find({
      deletedAt: null,
      $or: [{ opportunityId: { $ne: null } }, { ongoingJobId: { $ne: null } }],
      $or: taskOwnerConditions,
    }).select('opportunityId').lean();

    const taskOppIds = designerTasks.map((t) => t.opportunityId).filter(Boolean);

    const designerConditions = [
      ...(displayName ? [{ owner: displayName }, { collaborators: displayName }] : []),
      ...(username ? [{ owner: username }, { collaborators: username }] : []),
      ...(userId && mongoose.isValidObjectId(String(userId)) ? [{ ownerUserId: userId }, { collaboratorUserIds: userId }] : []),
      ...(taskOppIds.length ? [{ _id: { $in: taskOppIds } }] : []),
    ];
    if (designerConditions.length) {
      const clause = { $or: designerConditions };
      query.$and = query.$and ? [...query.$and, clause] : [clause];
    }
  }
  if (search) {
    const searchRe = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const searchClause = { $or: [{ name: searchRe }, { eventName: searchRe }] };
    query.$and = query.$and ? [...query.$and, searchClause] : [searchClause];
  }

  const items = await withOpportunityPopulate(OngoingJob.find(query))
    .sort({ updatedAt: -1, expectedCloseDate: 1 })
    .lean();
  const stageNameSet = new Set(stages.map((s) => s.name));
  const fallbackStage = stages[0]?.name || 'Inquiry';
  const opportunityIds = items.map((item) => item._id);
  const taskCounts = opportunityIds.length
    ? await Task.aggregate([
      {
        $match: {
          deletedAt: null,
          $or: [{ opportunityId: { $in: opportunityIds } }, { ongoingJobId: { $in: opportunityIds } }],
        },
      },
      {
        $group: {
          _id: '$opportunityId',
          total: { $sum: 1 },
          open: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Open'] }, 1, 0],
            },
          },
        },
      },
    ])
    : [];
  const taskCountMap = new Map(taskCounts.map((row) => [String(row._id), row]));
  const enrichedItems = items.map((item) => {
    const counts = taskCountMap.get(String(item._id));
    const effectiveStage = stageNameSet.has(item.stage) ? item.stage : fallbackStage;
    return {
      ...item,
      ongoingJobId: item._id,
      stage: effectiveStage,
      executionSummary: {
        totalTasks: counts?.total || 0,
        openTasks: counts?.open || 0,
        clientStakeholders: (item.stakeholderLeadIds || []).length + (item.primaryLeadId ? 1 : 0),
        internalCollaborators: (item.collaborators || []).length + (item.owner ? 1 : 0),
      },
    };
  });

  const owners = [...new Set(enrichedItems.map((item) => item.owner).filter(Boolean))].sort();

  return {
    items: enrichedItems,
    stages: stageNames(stages),
    stageProbabilities: Object.fromEntries(stages.map((s) => [s.name, s.probability])),
    owners,
  };
}

export async function getOngoingJob(id) {
  assertDb();
  const ongoingJob = await getPopulatedOngoingJob(id);
  if (!ongoingJob) {
    const error = new Error('Ongoing Job not found.');
    error.status = 404;
    throw error;
  }

  const stages = await getPipelineStages();
  const stageNameSet = new Set(stages.map((s) => s.name));
  if (!stageNameSet.has(ongoingJob.stage)) {
    ongoingJob.stage = stages[0]?.name || 'Inquiry';
  }
  let contacts = [];
  if (ongoingJob.companyId?._id) {
    contacts = await Lead.find({ companyId: ongoingJob.companyId._id, deletedAt: null })
      .select('name email designation pocQualification campaignId')
      .sort({ createdAt: -1 })
      .lean();
  }

  return {
    ongoingJob: { ...ongoingJob, ongoingJobId: ongoingJob._id },
    opportunity: { ...ongoingJob, ongoingJobId: ongoingJob._id },
    contacts,
    stages: stageNames(stages),
    stageProbabilities: Object.fromEntries(stages.map((s) => [s.name, s.probability])),
  };
}

export async function createOngoingJob(payload, actor = 'admin') {
  assertDb();
  if (!payload.name?.trim() || !payload.companyId) {
    const error = new Error('Ongoing Job name and company are required.');
    error.status = 400;
    throw error;
  }
  const company = await Company.findById(payload.companyId).select('_id').lean();
  if (!company) {
    const error = new Error('Company not found.');
    error.status = 404;
    throw error;
  }

  const stages = await getPipelineStages();
  const stage = payload.stage || stages[0]?.name || 'Inquiry';
  const now = new Date();
  const assignment = await resolveOwnerAssignment(payload, actor || 'admin');
  const probability = probabilityForStage(stages, stage);
  const validatedContacts = await validateOpportunityContacts(
    payload.companyId,
    payload.primaryLeadId,
    payload.stakeholderLeadIds || [],
  );
  const collaboratorUserIds = normalizeObjectIdList(payload.collaboratorUserIds || []);
  const collaborators = normalizeTextList(payload.collaborators || []);

  const ongoingJob = await OngoingJob.create({
    name: payload.name.trim(),
    companyId: payload.companyId,
    primaryLeadId: validatedContacts.primaryLeadId || null,
    stakeholderLeadIds: validatedContacts.stakeholderLeadIds,
    campaignId: payload.campaignId || null,
    owner: assignment.owner,
    ownerUserId: assignment.ownerUserId,
    collaborators,
    collaboratorUserIds,
    stage,
    valueAed: Math.max(0, cleanNumber(payload.valueAed)),
    probability,
    expectedCloseDate: now,
    nextAction: String(payload.nextAction || '').trim(),
    nextActionDueAt: payload.nextActionDueAt || null,
    eventName: String(payload.eventName || '').trim(),
    proposalDeadline: payload.proposalDeadline || null,
    notes: String(payload.notes || '').trim(),
    lastModifiedBy: assignment.owner,
    activityLog: [{
      action: 'Ongoing Job created',
      field: 'stage',
      from: null,
      to: stage,
      by: assignment.owner,
      at: now,
    }],
  });

  const populated = await getPopulatedOngoingJob(ongoingJob._id);
  if (isClosedStage(stage) || stage === 'Payment Received') {
    await createCompletedJobFromOngoingJob(populated).catch(() => {});
  }
  return { ...populated, ongoingJobId: populated._id };
}

export async function updateOngoingJob(id, payload, actor = 'admin') {
  assertDb();
  const ongoingJob = await OngoingJob.findOne({ _id: id, deletedAt: null });
  if (!ongoingJob) {
    const error = new Error('Ongoing Job not found.');
    error.status = 404;
    throw error;
  }

  const stages = await getPipelineStages();
  const modifier = String(actor || payload.owner || ongoingJob.owner || 'admin').trim();
  let ownerPatch = null;
  if (payload.owner !== undefined || payload.ownerUserId !== undefined) {
    ownerPatch = await resolveOwnerAssignment(
      { owner: payload.owner, ownerUserId: payload.ownerUserId },
      ongoingJob.owner || modifier,
    );
  }
  const normalizedStakeholders = payload.stakeholderLeadIds !== undefined
    ? normalizeObjectIdList(payload.stakeholderLeadIds)
    : undefined;
  const contactPatch = (
    payload.companyId !== undefined
    || payload.primaryLeadId !== undefined
    || payload.stakeholderLeadIds !== undefined
  )
    ? await validateOpportunityContacts(
      payload.companyId || ongoingJob.companyId,
      payload.primaryLeadId !== undefined ? payload.primaryLeadId : ongoingJob.primaryLeadId,
      normalizedStakeholders !== undefined ? normalizedStakeholders : ongoingJob.stakeholderLeadIds,
    )
    : null;
  const trackedPayload = {
    ...payload,
    ...(ownerPatch ? ownerPatch : {}),
    ...(contactPatch ? {
      primaryLeadId: contactPatch.primaryLeadId,
      stakeholderLeadIds: contactPatch.stakeholderLeadIds,
    } : {}),
    ...(payload.collaborators !== undefined ? { collaborators: normalizeTextList(payload.collaborators) } : {}),
    ...(payload.collaboratorUserIds !== undefined ? { collaboratorUserIds: normalizeObjectIdList(payload.collaboratorUserIds) } : {}),
  };

  trackChanges(ongoingJob, trackedPayload, modifier);

  const fields = [
    'name', 'companyId', 'primaryLeadId', 'campaignId', 'owner', 'stage',
    'nextAction', 'nextActionDueAt', 'services', 'eventName',
    'eventDate', 'boothNumber', 'budgetBand', 'proposalDeadline', 'lostReason', 'notes',
  ];
  fields.forEach((field) => {
    if (trackedPayload[field] !== undefined) ongoingJob[field] = trackedPayload[field] || null;
  });
  if (contactPatch) {
    ongoingJob.primaryLeadId = contactPatch.primaryLeadId || null;
    ongoingJob.stakeholderLeadIds = contactPatch.stakeholderLeadIds;
  }
  if (ownerPatch) {
    ongoingJob.owner = ownerPatch.owner;
    ongoingJob.ownerUserId = ownerPatch.ownerUserId || null;
  }
  if (payload.collaborators !== undefined) {
    ongoingJob.collaborators = normalizeTextList(payload.collaborators);
  }
  if (payload.collaboratorUserIds !== undefined) {
    ongoingJob.collaboratorUserIds = normalizeObjectIdList(payload.collaboratorUserIds);
  }

  if (payload.valueAed !== undefined) ongoingJob.valueAed = Math.max(0, cleanNumber(payload.valueAed));
  if (payload.standSizeSqm !== undefined) {
    ongoingJob.standSizeSqm = payload.standSizeSqm === '' ? null : Math.max(0, cleanNumber(payload.standSizeSqm));
  }

  if (payload.stage !== undefined) {
    ongoingJob.probability = probabilityForStage(stages, ongoingJob.stage);
    if (ongoingJob.stage === CLOSED_WON_STAGE || ongoingJob.stage === CLOSED_LOST_STAGE) {
      ongoingJob.closedAt = new Date();
    } else if (!isClosedStage(ongoingJob.stage)) {
      ongoingJob.closedAt = null;
    }
  }

  ongoingJob.lastModifiedBy = modifier;
  await ongoingJob.save();

  const populated = await getPopulatedOngoingJob(ongoingJob._id);
  if (isClosedStage(ongoingJob.stage) || ongoingJob.stage === 'Payment Received') {
    await createCompletedJobFromOngoingJob(populated).catch(() => {});
  }
  return { ...populated, ongoingJobId: populated._id };
}

export async function getOngoingJobTimeline(id) {
  assertDb();
  const { ongoingJob } = await getOngoingJob(id);
  const activityEvents = (ongoingJob.activityLog || []).map((entry) => ({
    id: `opp-activity-${entry._id}`,
    type: 'ongoing_job',
    title: entry.action,
    detail: entry.field && entry.to != null
      ? `${entry.from ? `${entry.from} → ` : ''}${entry.to}`
      : '',
    timestamp: new Date(entry.at).toISOString(),
    actor: entry.by || 'Team',
    channel: 'pipeline',
    source: 'ongoing_job',
    meta: { field: entry.field, from: entry.from, to: entry.to },
  }));

  let contactEvents = [];
  if (ongoingJob.primaryLeadId?._id) {
    const timeline = await getLeadTimeline(ongoingJob.primaryLeadId._id);
    contactEvents = (timeline.events || []).filter((event) => event?.type !== 'ongoing_job' && event?.type !== 'opportunity');
  } else if (ongoingJob.companyId?._id) {
    const timeline = await getCompanyTimeline(ongoingJob.companyId._id);
    contactEvents = (timeline.events || []).filter((event) => event?.type !== 'ongoing_job' && event?.type !== 'opportunity');
  }

  const merged = [...activityEvents, ...contactEvents]
    .filter((event) => event?.timestamp)
    .filter((event, index, array) => array.findIndex((candidate) => candidate.id === event.id) === index)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    ongoingJobId: String(ongoingJob._id),
    opportunityId: String(ongoingJob._id),
    events: merged,
  };
}

function enrichReplyTask(task) {
  if (task.taskType !== 'reply_review' && task.taskType !== 'relationship_follow_up') {
    return task;
  }

  const replySubject = task.replyId?.subject?.trim();
  const rawReplyText = (task.replyId?.text || task.replyId?.body || '').trim();
  const cleanReplyText = rawReplyText.replace(/Latest subject: "[^"]*"\s*/gi, '').trim();
  const cleanTaskNotes = (task.notes || '').replace(/Latest subject: "[^"]*"\s*/gi, '').trim();

  const rawTitle = (task.title || '').trim();
  const isGenericTitle = !rawTitle || rawTitle.toLowerCase().startsWith('inbound reply') || rawTitle.toLowerCase().startsWith('review reply');
  const finalTitle = isGenericTitle ? (replySubject || rawTitle) : rawTitle;

  return {
    ...task,
    title: finalTitle || 'Inbound Reply',
    notes: cleanReplyText || cleanTaskNotes || '',
  };
}

export async function listTasks({ status = 'Open', owner, opportunityId, ongoingJobId, campaignId, companyId, leadId, taskType, isRelationshipFollowUp, _designerUser } = {}) {
  assertDb();
  const targetJobId = ongoingJobId || opportunityId;
  const query = { deletedAt: null };
  if (status && status !== 'All') query.status = status;
  if (owner && owner !== 'All') query.owner = owner;
  if (targetJobId) query.opportunityId = targetJobId;
  if (companyId && mongoose.isValidObjectId(String(companyId))) query.companyId = companyId;
  if (leadId && mongoose.isValidObjectId(String(leadId))) query.leadId = leadId;
  if (taskType) {
    query.taskType = taskType;
  } else if (isRelationshipFollowUp) {
    query.taskType = 'relationship_follow_up';
  }
  if (campaignId && mongoose.isValidObjectId(String(campaignId))) {
    const ongoingJobIds = await OngoingJob.find({
      deletedAt: null,
      campaignId,
    }).distinct('_id');
    query.opportunityId = { $in: ongoingJobIds };
  }

  if (_designerUser) {
    const displayName = _designerUser.displayName || '';
    const username = _designerUser.username || '';
    const userId = _designerUser.id || _designerUser.userId || _designerUser._id;

    const oppQuery = {
      deletedAt: null,
      $or: [
        ...(displayName ? [{ owner: displayName }, { collaborators: displayName }] : []),
        ...(username ? [{ owner: username }, { collaborators: username }] : []),
        ...(userId && mongoose.isValidObjectId(String(userId)) ? [{ ownerUserId: userId }, { collaboratorUserIds: userId }] : []),
      ],
    };
    const designerOpps = await OngoingJob.find(oppQuery).select('_id campaignId').lean();
    const designerOppIds = designerOpps.map((o) => o._id);
    const designerCampaignIds = designerOpps.map((o) => o.campaignId).filter(Boolean);

    const designerConditions = [
      ...(displayName ? [{ owner: displayName }] : []),
      ...(username ? [{ owner: username }] : []),
      ...(userId && mongoose.isValidObjectId(String(userId)) ? [{ ownerUserId: userId }] : []),
      ...(designerOppIds.length ? [{ opportunityId: { $in: designerOppIds } }] : []),
      ...(designerCampaignIds.length ? [{ campaignId: { $in: designerCampaignIds } }] : []),
    ];

    if (designerConditions.length) {
      const clause = { $or: designerConditions };
      query.$and = query.$and ? [...query.$and, clause] : [clause];
    }
  }

  const rawItems = await Task.find(query)
    .sort({ status: 1, dueAt: 1, priority: -1, createdAt: -1 })
    .populate('campaignId', 'projectName')
    .populate('companyId', 'companyName')
    .populate('leadId', 'name email')
    .populate('opportunityId', 'name stage valueAed')
    .populate('ownerUserId', 'displayName email role')
    .populate('replyId', 'subject text html body receivedAt messageId')
    .lean();

  const items = rawItems.map(enrichReplyTask);
  return { items };
}

export async function getTask(id) {
  assertDb();
  const rawTask = await Task.findOne({ _id: id, deletedAt: null })
    .populate('campaignId', 'projectName')
    .populate('companyId', 'companyName')
    .populate('leadId', 'name email')
    .populate('opportunityId', 'name stage valueAed')
    .populate('ownerUserId', 'displayName email role')
    .populate('replyId', 'subject text html body receivedAt messageId')
    .lean();
  if (!rawTask) {
    const error = new Error('Task not found.');
    error.status = 404;
    throw error;
  }
  return enrichReplyTask(rawTask);
}

export async function createTask(payload, actor = 'admin') {
  assertDb();
  if (!payload.title?.trim()) {
    const error = new Error('Task title is required.');
    error.status = 400;
    throw error;
  }
  const targetJobId = payload.ongoingJobId || payload.opportunityId;
  const isRelationship = Boolean(payload.isRelationshipFollowUp);
  const taskType = payload.taskType
    || (isRelationship ? 'relationship_follow_up' : targetJobId ? 'ongoing_job' : 'general');

  let leadId = payload.leadId || null;
  if (taskType === 'relationship_follow_up' || taskType === 'lead_follow_up' || taskType === 'reply_review') {
    if (leadId && mongoose.isValidObjectId(String(leadId))) {
      const lead = await Lead.findById(leadId).select('companyId campaignId').lean();
      if (lead) {
        payload.companyId = lead.companyId || payload.companyId || null;
        payload.campaignId = lead.campaignId || payload.campaignId || null;
      }
    }
  }

  if (taskType === 'relationship_follow_up') {
    if (!leadId || !mongoose.isValidObjectId(String(leadId))) {
      const error = new Error('Relationship follow-up task requires a valid leadId.');
      error.status = 400;
      throw error;
    }
  }

  let companyId = payload.companyId || null;
  let campaignId = payload.campaignId || null;
  if (targetJobId) {
    const ongoingJob = await OngoingJob.findById(targetJobId).select('companyId campaignId').lean();
    companyId = ongoingJob?.companyId || companyId || null;
    campaignId = ongoingJob?.campaignId || campaignId || null;
  }
  const assignment = payload.owner === ''
    ? { owner: '', ownerUserId: null }
    : await resolveOwnerAssignment(payload, actor || 'admin');

  return Task.create({
    title: payload.title.trim(),
    dueAt: payload.dueAt || null,
    priority: payload.priority || 'Normal',
    owner: assignment.owner,
    ownerUserId: assignment.ownerUserId,
    campaignId,
    companyId,
    leadId,
    taskType,
    replyId: payload.replyId || null,
    channel: payload.channel || '',
    opportunityId: targetJobId || null,
    notes: String(payload.notes || '').trim(),
  });
}

export async function updateTask(id, payload, actor = 'admin') {
  assertDb();
  const task = await Task.findById(id);
  if (!task) {
    const error = new Error('Task not found.');
    error.status = 404;
    throw error;
  }

  if (payload.taskType !== undefined) {
    task.taskType = payload.taskType;
  } else if (payload.isRelationshipFollowUp !== undefined) {
    task.taskType = payload.isRelationshipFollowUp ? 'relationship_follow_up' : 'general';
  }
  if (payload.channel !== undefined) {
    task.channel = String(payload.channel || '').trim();
  }

  ['title', 'dueAt', 'priority', 'campaignId', 'companyId', 'leadId', 'replyId', 'notes'].forEach((field) => {
    if (payload[field] !== undefined) task[field] = payload[field] || null;
  });
  if (payload.ongoingJobId !== undefined || payload.opportunityId !== undefined) {
    task.opportunityId = payload.ongoingJobId || payload.opportunityId || null;
  }
  if (payload.owner !== undefined || payload.ownerUserId !== undefined) {
    if (payload.owner === '') {
      task.owner = '';
      task.ownerUserId = null;
    } else {
      const assignment = await resolveOwnerAssignment(
        { owner: payload.owner, ownerUserId: payload.ownerUserId },
        task.owner || 'admin',
      );
      task.owner = assignment.owner;
      task.ownerUserId = assignment.ownerUserId || null;
    }
  }

  const targetJobId = payload.ongoingJobId || payload.opportunityId;
  if (targetJobId !== undefined) {
    if (targetJobId) {
      const ongoingJob = await OngoingJob.findById(targetJobId).select('companyId campaignId').lean();
      task.companyId = ongoingJob?.companyId || null;
      task.campaignId = ongoingJob?.campaignId || null;
    } else if (payload.companyId === undefined) {
      task.companyId = null;
      if (payload.campaignId === undefined) task.campaignId = null;
    }
  }

  if (payload.status === 'Done') {
    const isRel = task.taskType === 'relationship_follow_up';
    const isLeadFollowUp = task.taskType === 'lead_follow_up';
    const channelToUse = payload.channel !== undefined ? payload.channel : task.channel;
    if (isRel && !channelToUse) {
      const error = new Error('Follow-up channel required to complete relationship task.');
      error.status = 400;
      throw error;
    }
    const createInteraction = isRel || (isLeadFollowUp && Boolean(channelToUse));
    if (createInteraction) {
      task.channel = channelToUse;
      const mappedType = CHANNEL_TO_INTERACTION_TYPE[channelToUse] || 'note';
      const completionTime = new Date();
      const loggedByActor = typeof actor === 'string' ? actor : (actor.username || actor.displayName || 'admin');

      let session = null;
      let useTransaction = true;
      try {
        session = await mongoose.startSession();
      } catch {
        useTransaction = false;
      }

      if (session && useTransaction) {
        try {
          await session.withTransaction(async () => {
            const existingInteractions = await ContactInteraction.find({ sourceTaskId: task._id }).session(session);
            let targetInteraction = existingInteractions[0];
            if (!targetInteraction) {
              const created = await ContactInteraction.create([
                {
                  leadId: task.leadId,
                  companyId: task.companyId,
                  direction: 'outbound',
                  type: mappedType,
                  title: task.title,
                  summary: task.notes || task.title,
                  occurredAt: completionTime,
                  loggedBy: loggedByActor,
                  sourceTaskId: task._id,
                },
              ], { session });
              targetInteraction = created[0];
            }
            task.status = 'Done';
            task.completedAt = completionTime;
            task.interactionId = targetInteraction._id;
            await task.save({ session });
          });
        } catch (err) {
          throw err;
        } finally {
          session.endSession();
        }
      } else {
        let interaction = await ContactInteraction.findOne({ sourceTaskId: task._id });
        if (!interaction) {
          interaction = await ContactInteraction.create({
            leadId: task.leadId,
            companyId: task.companyId,
            direction: 'outbound',
            type: mappedType,
            title: task.title,
            summary: task.notes || task.title,
            occurredAt: completionTime,
            loggedBy: loggedByActor,
            sourceTaskId: task._id,
          });
        }
        task.status = 'Done';
        task.completedAt = completionTime;
        task.interactionId = interaction._id;
        await task.save();
      }
    } else {
      task.status = 'Done';
      task.completedAt = new Date();
      await task.save();
    }
  } else if (payload.status === 'Open') {
    task.status = 'Open';
    task.completedAt = null;
    await task.save();
  } else {
    await task.save();
  }

  return Task.findById(id)
    .populate('campaignId', 'projectName')
    .populate('companyId', 'companyName')
    .populate('leadId', 'name email')
    .populate('opportunityId', 'name stage valueAed')
    .populate('ownerUserId', 'displayName email role')
    .lean();
}

export async function deleteTask(id, actor = {}) {
  assertDb();
  registerRevisionModel('task', Task);
  return softDeleteRecord({ Model: Task, resourceType: 'task', id, actor });
}

export async function restoreTask(id, actor = {}) {
  assertDb();
  registerRevisionModel('task', Task);
  return restoreRecord({ Model: Task, resourceType: 'task', id, actor });
}

export async function deleteOngoingJob(id, actor = {}) {
  assertDb();
  registerRevisionModel('ongoing_job', OngoingJob);
  registerRevisionModel('opportunity', OngoingJob);
  const result = await softDeleteRecord({ Model: OngoingJob, resourceType: 'ongoing_job', id, actor });
  await Task.updateMany(
    { $or: [{ opportunityId: id }, { ongoingJobId: id }], deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: actor.displayName || 'admin', deletedViaOpportunityId: id } },
  );
  return result;
}

export async function restoreOngoingJob(id, actor = {}) {
  assertDb();
  registerRevisionModel('ongoing_job', OngoingJob);
  registerRevisionModel('opportunity', OngoingJob);
  const result = await restoreRecord({ Model: OngoingJob, resourceType: 'ongoing_job', id, actor });
  await Task.updateMany(
    { $or: [{ opportunityId: id }, { ongoingJobId: id }], deletedViaOpportunityId: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null, deletedBy: null, deletedViaOpportunityId: null } },
  );
  return result;
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

export async function deleteTasks(ids = [], actor = {}) {
  return bulkSoftDelete(ids, deleteTask, actor);
}

export async function deleteOngoingJobs(ids = [], actor = {}) {
  return bulkSoftDelete(ids, deleteOngoingJob, actor);
}

export async function getWorkspaceSummary() {
  assertDb();
  const now = new Date();
  const next30Days = new Date(now.getTime() + 30 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const stages = await getPipelineStages();

  // Fetch only the fields needed for metrics + recent-card display
  const [ongoingJobs, openTasks, overdueTasks, newReplies, failedJobs, pendingContacts] = await Promise.all([
    OngoingJob.aggregate([
      { $match: { deletedAt: null, stage: { $nin: [CLOSED_LOST_STAGE] } } },
      {
        $lookup: {
          from: 'companies',
          localField: 'companyId',
          foreignField: '_id',
          as: '_company',
          pipeline: [{ $project: { companyName: 1 } }],
        },
      },
      {
        $project: {
          name: 1,
          stage: 1,
          valueAed: 1,
          probability: 1,
          expectedCloseDate: 1,
          owner: 1,
          updatedAt: 1,
          companyId: { $arrayElemAt: ['$_company', 0] },
        },
      },
      { $sort: { updatedAt: -1 } },
    ]),
    Task.find({ status: 'Open', deletedAt: null })
      .sort({ dueAt: 1 })
      .limit(8)
      .select('title dueAt status owner notes companyId opportunityId ownerUserId')
      .populate('companyId', 'companyName')
      .populate('opportunityId', 'name')
      .populate('ownerUserId', 'displayName')
      .lean(),
    Task.countDocuments({ status: 'Open', deletedAt: null, dueAt: { $lt: now } }),
    Reply.countDocuments({ receivedAt: { $gte: sevenDaysAgo }, intent: 'Interested' }),
    SendJob.countDocuments({ status: 'failed' }),
    Lead.countDocuments({ deliveryStatus: 'Pending Inqueue' }),
  ]);

  const active = ongoingJobs.filter((item) => item.stage !== CLOSED_WON_STAGE);
  const pipelineValue = active.reduce((sum, item) => sum + (item.valueAed || 0), 0);
  const weightedPipeline = active.reduce((sum, item) => sum + ((item.valueAed || 0) * probabilityForStage(stages, item.stage) / 100), 0);
  const closingSoon = active.filter((item) => item.expectedCloseDate && new Date(item.expectedCloseDate) <= next30Days).length;

  return {
    metrics: {
      activeOpportunities: active.length,
      activeOngoingJobs: active.length,
      pipelineValue,
      weightedPipeline,
      closingSoon,
      overdueTasks,
      interestedReplies7d: newReplies,
      failedSendJobs: failedJobs,
      pendingContacts,
    },
    openTasks,
    recentOpportunities: ongoingJobs.slice(0, 6),
    recentOngoingJobs: ongoingJobs.slice(0, 6),
    computedAt: now,
  };
}

// Aliases for backward compatibility
export const listOpportunities = listOngoingJobs;
export const getOpportunity = getOngoingJob;
export const createOpportunity = createOngoingJob;
export const updateOpportunity = updateOngoingJob;
export const getOpportunityTimeline = getOngoingJobTimeline;
export const deleteOpportunity = deleteOngoingJob;
export const restoreOpportunity = restoreOngoingJob;
export const deleteOpportunities = deleteOngoingJobs;
