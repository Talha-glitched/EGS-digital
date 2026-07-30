import mongoose from 'mongoose';
import { Opportunity } from '../models/Opportunity.js';
import { PipelineConfig, DEFAULT_PIPELINE_STAGES } from '../models/PipelineConfig.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import {
  softDeleteRecord,
  restoreRecord,
  registerRevisionModel,
} from './revisionService.js';
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
} from '../constants/opportunityPipeline.js';
import { getLeadTimeline, getCompanyTimeline } from './contactTimelineService.js';
import { createJobFromOpportunity } from './jobService.js';

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

function appendActivity(opportunity, entry, actor = 'admin') {
  if (!Array.isArray(opportunity.activityLog)) opportunity.activityLog = [];
  opportunity.activityLog.unshift({
    action: entry.action,
    field: entry.field || '',
    from: entry.from ?? null,
    to: entry.to ?? null,
    by: actor || 'admin',
    at: new Date(),
  });
  if (opportunity.activityLog.length > 100) {
    opportunity.activityLog = opportunity.activityLog.slice(0, 100);
  }
}

function trackChanges(opportunity, payload, actor) {
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
    const current = opportunity[field];
    const next = payload[field] || null;
    const currentValue = current == null ? '' : String(current);
    const nextValue = next == null ? '' : String(next);
    if (currentValue !== nextValue) {
      appendActivity(opportunity, {
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

function mergeStagesWithOpportunityData(stages, items = []) {
  const merged = [...stages];
  const known = new Set(stages.map((stage) => stage.name));
  items.forEach((item) => {
    const name = String(item?.stage || '').trim();
    if (!name || known.has(name)) return;
    known.add(name);
    merged.push({
      name,
      probability: cleanNumber(item?.probability, 0),
    });
  });
  return merged;
}

async function getPopulatedOpportunity(id) {
  return withOpportunityPopulate(
    Opportunity.findOne({ _id: id, deletedAt: null }),
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

export async function listOpportunities({ stage, owner, search, campaignId, companyId, _designerName, _designerUser } = {}) {
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

    // 1. Find opportunity IDs where this designer has assigned tasks
    const taskOwnerConditions = [
      ...(displayName ? [{ owner: displayName }] : []),
      ...(username ? [{ owner: username }] : []),
      ...(userId && mongoose.isValidObjectId(String(userId)) ? [{ ownerUserId: userId }] : []),
    ];
    const designerTasks = await Task.find({
      deletedAt: null,
      opportunityId: { $ne: null },
      $or: taskOwnerConditions,
    }).select('opportunityId').lean();

    const taskOppIds = designerTasks.map((t) => t.opportunityId).filter(Boolean);

    // 2. An opportunity is visible to the designer if they are owner, collaborator, or assigned a task under it
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

  const items = await withOpportunityPopulate(Opportunity.find(query))
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
          opportunityId: { $in: opportunityIds },
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

export async function getOpportunity(id) {
  assertDb();
  const opportunity = await getPopulatedOpportunity(id);
  if (!opportunity) {
    const error = new Error('Opportunity not found.');
    error.status = 404;
    throw error;
  }

  const stages = await getPipelineStages();
  const stageNameSet = new Set(stages.map((s) => s.name));
  if (!stageNameSet.has(opportunity.stage)) {
    opportunity.stage = stages[0]?.name || 'Inquiry';
  }
  let contacts = [];
  if (opportunity.companyId?._id) {
    contacts = await Lead.find({ companyId: opportunity.companyId._id, deletedAt: null })
      .select('name email designation pocQualification campaignId')
      .sort({ createdAt: -1 })
      .lean();
  }

  return {
    opportunity,
    contacts,
    stages: stageNames(stages),
    stageProbabilities: Object.fromEntries(stages.map((s) => [s.name, s.probability])),
  };
}

export async function createOpportunity(payload, actor = 'admin') {
  assertDb();
  if (!payload.name?.trim() || !payload.companyId) {
    const error = new Error('Opportunity name and company are required.');
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

  const opportunity = await Opportunity.create({
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
      action: 'Opportunity created',
      field: 'stage',
      from: null,
      to: stage,
      by: assignment.owner,
      at: now,
    }],
  });

  const populated = await getPopulatedOpportunity(opportunity._id);
  if (isClosedStage(stage) || stage === 'Payment Received') {
    await createJobFromOpportunity(populated).catch(() => {});
  }
  return populated;
}

export async function updateOpportunity(id, payload, actor = 'admin') {
  assertDb();
  const opportunity = await Opportunity.findOne({ _id: id, deletedAt: null });
  if (!opportunity) {
    const error = new Error('Opportunity not found.');
    error.status = 404;
    throw error;
  }

  const stages = await getPipelineStages();
  const modifier = String(actor || payload.owner || opportunity.owner || 'admin').trim();
  let ownerPatch = null;
  if (payload.owner !== undefined || payload.ownerUserId !== undefined) {
    ownerPatch = await resolveOwnerAssignment(
      { owner: payload.owner, ownerUserId: payload.ownerUserId },
      opportunity.owner || modifier,
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
      payload.companyId || opportunity.companyId,
      payload.primaryLeadId !== undefined ? payload.primaryLeadId : opportunity.primaryLeadId,
      normalizedStakeholders !== undefined ? normalizedStakeholders : opportunity.stakeholderLeadIds,
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

  trackChanges(opportunity, trackedPayload, modifier);

  const fields = [
    'name', 'companyId', 'primaryLeadId', 'campaignId', 'owner', 'stage',
    'nextAction', 'nextActionDueAt', 'services', 'eventName',
    'eventDate', 'boothNumber', 'budgetBand', 'proposalDeadline', 'lostReason', 'notes',
  ];
  fields.forEach((field) => {
    if (trackedPayload[field] !== undefined) opportunity[field] = trackedPayload[field] || null;
  });
  if (contactPatch) {
    opportunity.primaryLeadId = contactPatch.primaryLeadId || null;
    opportunity.stakeholderLeadIds = contactPatch.stakeholderLeadIds;
  }
  if (ownerPatch) {
    opportunity.owner = ownerPatch.owner;
    opportunity.ownerUserId = ownerPatch.ownerUserId || null;
  }
  if (payload.collaborators !== undefined) {
    opportunity.collaborators = normalizeTextList(payload.collaborators);
  }
  if (payload.collaboratorUserIds !== undefined) {
    opportunity.collaboratorUserIds = normalizeObjectIdList(payload.collaboratorUserIds);
  }

  if (payload.valueAed !== undefined) opportunity.valueAed = Math.max(0, cleanNumber(payload.valueAed));
  if (payload.standSizeSqm !== undefined) {
    opportunity.standSizeSqm = payload.standSizeSqm === '' ? null : Math.max(0, cleanNumber(payload.standSizeSqm));
  }

  if (payload.stage !== undefined) {
    opportunity.probability = probabilityForStage(stages, opportunity.stage);
    if (opportunity.stage === CLOSED_WON_STAGE || opportunity.stage === CLOSED_LOST_STAGE) {
      opportunity.closedAt = new Date();
    } else if (!isClosedStage(opportunity.stage)) {
      opportunity.closedAt = null;
    }
  }

  opportunity.lastModifiedBy = modifier;
  await opportunity.save();

  const populated = await getPopulatedOpportunity(opportunity._id);
  if (isClosedStage(opportunity.stage) || opportunity.stage === 'Payment Received') {
    await createJobFromOpportunity(populated).catch(() => {});
  }
  return populated;
}

export async function getOpportunityTimeline(id) {
  assertDb();
  const { opportunity } = await getOpportunity(id);
  const activityEvents = (opportunity.activityLog || []).map((entry) => ({
    id: `opp-activity-${entry._id}`,
    type: 'opportunity',
    title: entry.action,
    detail: entry.field && entry.to != null
      ? `${entry.from ? `${entry.from} → ` : ''}${entry.to}`
      : '',
    timestamp: new Date(entry.at).toISOString(),
    actor: entry.by || 'Team',
    channel: 'pipeline',
    source: 'opportunity',
    meta: { field: entry.field, from: entry.from, to: entry.to },
  }));

  let contactEvents = [];
  if (opportunity.primaryLeadId?._id) {
    const timeline = await getLeadTimeline(opportunity.primaryLeadId._id);
    contactEvents = (timeline.events || []).filter((event) => event?.type !== 'opportunity');
  } else if (opportunity.companyId?._id) {
    const timeline = await getCompanyTimeline(opportunity.companyId._id);
    contactEvents = (timeline.events || []).filter((event) => event?.type !== 'opportunity');
  }

  const merged = [...activityEvents, ...contactEvents]
    .filter((event) => event?.timestamp)
    .filter((event, index, array) => array.findIndex((candidate) => candidate.id === event.id) === index)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    opportunityId: String(opportunity._id),
    events: merged,
  };
}

export async function listTasks({ status = 'Open', owner, opportunityId, campaignId, companyId, _designerUser } = {}) {
  assertDb();
  const query = { deletedAt: null };
  if (status && status !== 'All') query.status = status;
  if (owner && owner !== 'All') query.owner = owner;
  if (opportunityId) query.opportunityId = opportunityId;
  if (companyId && mongoose.isValidObjectId(String(companyId))) query.companyId = companyId;
  if (campaignId && mongoose.isValidObjectId(String(campaignId))) {
    const opportunityIds = await Opportunity.find({
      deletedAt: null,
      campaignId,
    }).distinct('_id');
    query.opportunityId = { $in: opportunityIds };
  }

  if (_designerUser) {
    const displayName = _designerUser.displayName || '';
    const username = _designerUser.username || '';
    const userId = _designerUser.id || _designerUser.userId || _designerUser._id;

    // 1. Find all opportunities assigned to or collaborated on by this designer
    const oppQuery = {
      deletedAt: null,
      $or: [
        ...(displayName ? [{ owner: displayName }, { collaborators: displayName }] : []),
        ...(username ? [{ owner: username }, { collaborators: username }] : []),
        ...(userId && mongoose.isValidObjectId(String(userId)) ? [{ ownerUserId: userId }, { collaboratorUserIds: userId }] : []),
      ],
    };
    const designerOpps = await Opportunity.find(oppQuery).select('_id campaignId').lean();
    const designerOppIds = designerOpps.map((o) => o._id);
    const designerCampaignIds = designerOpps.map((o) => o.campaignId).filter(Boolean);

    // 2. A task is visible to the designer if:
    //    - Task owner is designer (by displayName, username, or userId)
    //    - OR task is linked to one of the designer's assigned/collaborated opportunities
    //    - OR task is linked to one of the designer's assigned/collaborated campaigns
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

  const items = await Task.find(query)
    .sort({ status: 1, dueAt: 1, priority: -1, createdAt: -1 })
    .populate('campaignId', 'projectName')
    .populate('companyId', 'companyName')
    .populate('leadId', 'name email')
    .populate('opportunityId', 'name stage valueAed')
    .populate('ownerUserId', 'displayName email role')
    .lean();
  return { items };
}

export async function getTask(id) {
  assertDb();
  const task = await Task.findOne({ _id: id, deletedAt: null })
    .populate('campaignId', 'projectName')
    .populate('companyId', 'companyName')
    .populate('leadId', 'name email')
    .populate('opportunityId', 'name stage valueAed')
    .populate('ownerUserId', 'displayName email role')
    .lean();
  if (!task) {
    const error = new Error('Task not found.');
    error.status = 404;
    throw error;
  }
  return task;
}

export async function createTask(payload, actor = 'admin') {
  assertDb();
  if (!payload.title?.trim()) {
    const error = new Error('Task title is required.');
    error.status = 400;
    throw error;
  }
  let companyId = payload.companyId || null;
  let campaignId = payload.campaignId || null;
  if (payload.opportunityId) {
    const opportunity = await Opportunity.findById(payload.opportunityId).select('companyId campaignId').lean();
    companyId = opportunity?.companyId || companyId || null;
    campaignId = opportunity?.campaignId || campaignId || null;
  }
  const assignment = await resolveOwnerAssignment(payload, actor || 'admin');
  return Task.create({
    title: payload.title.trim(),
    dueAt: payload.dueAt || null,
    priority: payload.priority || 'Normal',
    owner: assignment.owner,
    ownerUserId: assignment.ownerUserId,
    campaignId,
    companyId,
    leadId: payload.leadId || null,
    opportunityId: payload.opportunityId || null,
    notes: String(payload.notes || '').trim(),
  });
}

export async function updateTask(id, payload) {
  assertDb();
  const task = await Task.findById(id);
  if (!task) {
    const error = new Error('Task not found.');
    error.status = 404;
    throw error;
  }
  ['title', 'dueAt', 'priority', 'campaignId', 'companyId', 'leadId', 'opportunityId', 'notes'].forEach((field) => {
    if (payload[field] !== undefined) task[field] = payload[field] || null;
  });
  if (payload.owner !== undefined || payload.ownerUserId !== undefined) {
    const assignment = await resolveOwnerAssignment(
      { owner: payload.owner, ownerUserId: payload.ownerUserId },
      task.owner || 'admin',
    );
    task.owner = assignment.owner;
    task.ownerUserId = assignment.ownerUserId || null;
  }
  if (payload.opportunityId !== undefined) {
    if (payload.opportunityId) {
      const opportunity = await Opportunity.findById(payload.opportunityId).select('companyId campaignId').lean();
      task.companyId = opportunity?.companyId || null;
      task.campaignId = opportunity?.campaignId || null;
    } else if (payload.companyId === undefined) {
      task.companyId = null;
      if (payload.campaignId === undefined) task.campaignId = null;
    }
  }
  if (payload.status !== undefined) {
    task.status = payload.status;
    task.completedAt = payload.status === 'Done' ? new Date() : null;
  }
  await task.save();
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

export async function deleteOpportunity(id, actor = {}) {
  assertDb();
  registerRevisionModel('opportunity', Opportunity);
  const result = await softDeleteRecord({ Model: Opportunity, resourceType: 'opportunity', id, actor });
  await Task.updateMany(
    { opportunityId: id, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: actor.displayName || 'admin', deletedViaOpportunityId: id } },
  );
  return result;
}

export async function restoreOpportunity(id, actor = {}) {
  assertDb();
  registerRevisionModel('opportunity', Opportunity);
  const result = await restoreRecord({ Model: Opportunity, resourceType: 'opportunity', id, actor });
  await Task.updateMany(
    { opportunityId: id, deletedViaOpportunityId: id, deletedAt: { $ne: null } },
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

export async function deleteOpportunities(ids = [], actor = {}) {
  return bulkSoftDelete(ids, deleteOpportunity, actor);
}

export async function getWorkspaceSummary() {
  assertDb();
  const now = new Date();
  const next30Days = new Date(now.getTime() + 30 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const stages = await getPipelineStages();
  const [opportunities, openTasks, overdueTasks, newReplies, failedJobs, pendingContacts] = await Promise.all([
    Opportunity.find({ deletedAt: null, stage: { $nin: [CLOSED_LOST_STAGE] } }).sort({ updatedAt: -1 }).populate('companyId', 'companyName').lean(),
    Task.find({ status: 'Open', deletedAt: null }).sort({ dueAt: 1 }).limit(8).populate('companyId', 'companyName').populate('opportunityId', 'name').populate('ownerUserId', 'displayName').lean(),
    Task.countDocuments({ status: 'Open', deletedAt: null, dueAt: { $lt: now } }),
    Reply.countDocuments({ receivedAt: { $gte: sevenDaysAgo }, intent: 'Interested' }),
    SendJob.countDocuments({ status: 'failed' }),
    Lead.countDocuments({ deliveryStatus: 'Pending Inqueue' }),
  ]);
  const active = opportunities.filter((item) => item.stage !== CLOSED_WON_STAGE);
  const pipelineValue = active.reduce((sum, item) => sum + (item.valueAed || 0), 0);
  const weightedPipeline = active.reduce((sum, item) => sum + ((item.valueAed || 0) * probabilityForStage(stages, item.stage) / 100), 0);
  const closingSoon = active.filter((item) => item.expectedCloseDate && new Date(item.expectedCloseDate) <= next30Days).length;

  return {
    metrics: {
      activeOpportunities: active.length,
      pipelineValue,
      weightedPipeline,
      closingSoon,
      overdueTasks,
      interestedReplies7d: newReplies,
      failedSendJobs: failedJobs,
      pendingContacts,
    },
    openTasks,
    recentOpportunities: opportunities.slice(0, 6),
    computedAt: now,
  };
}
