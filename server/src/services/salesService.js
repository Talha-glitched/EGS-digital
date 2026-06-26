import mongoose from 'mongoose';
import { Opportunity } from '../models/Opportunity.js';
import { PipelineConfig, DEFAULT_PIPELINE_STAGES } from '../models/PipelineConfig.js';
import { Task } from '../models/Task.js';
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
    campaignId: 'campaignId',
    owner: 'owner',
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
  const stages = normalizeStages(config?.stages?.length ? config.stages : DEFAULT_PIPELINE_STAGES);
  return stages.length ? stages : DEFAULT_PIPELINE_STAGES.map((stage) => ({ ...stage }));
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
  { path: 'campaignId', select: 'projectName' },
];

function withOpportunityPopulate(query) {
  return OPPORTUNITY_POPULATE.reduce((q, spec) => q.populate(spec), query);
}

export async function listOpportunities({ stage, owner, search } = {}) {
  assertDb();
  const stages = await getPipelineStages();
  const query = { deletedAt: null };
  if (stage && stage !== 'All') query.stage = stage;
  if (owner && owner !== 'All') query.owner = owner;
  if (search) {
    query.$or = [
      { name: new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { eventName: new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  }

  const items = await withOpportunityPopulate(Opportunity.find(query))
    .sort({ updatedAt: -1, expectedCloseDate: 1 })
    .lean();

  const owners = [...new Set(items.map((item) => item.owner).filter(Boolean))].sort();

  return {
    items,
    stages: stageNames(stages),
    stageProbabilities: Object.fromEntries(stages.map((s) => [s.name, s.probability])),
    owners,
  };
}

export async function getOpportunity(id) {
  assertDb();
  const opportunity = await withOpportunityPopulate(Opportunity.findById(id)).lean();
  if (!opportunity) {
    const error = new Error('Opportunity not found.');
    error.status = 404;
    throw error;
  }

  const stages = await getPipelineStages();
  let contacts = [];
  if (opportunity.companyId?._id) {
    contacts = await Lead.find({ companyId: opportunity.companyId._id })
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
  const stage = payload.stage || stages[0]?.name || 'New Lead';
  const now = new Date();
  const owner = String(payload.owner || actor || 'admin').trim();
  const probability = probabilityForStage(stages, stage);

  const opportunity = await Opportunity.create({
    name: payload.name.trim(),
    companyId: payload.companyId,
    primaryLeadId: payload.primaryLeadId || null,
    campaignId: payload.campaignId || null,
    owner,
    stage,
    valueAed: Math.max(0, cleanNumber(payload.valueAed)),
    probability,
    expectedCloseDate: now,
    nextAction: String(payload.nextAction || '').trim(),
    nextActionDueAt: payload.nextActionDueAt || null,
    eventName: String(payload.eventName || '').trim(),
    proposalDeadline: payload.proposalDeadline || null,
    notes: String(payload.notes || '').trim(),
    lastModifiedBy: owner,
    activityLog: [{
      action: 'Opportunity created',
      field: 'stage',
      from: null,
      to: stage,
      by: owner,
      at: now,
    }],
  });

  return opportunity.toObject();
}

export async function updateOpportunity(id, payload, actor = 'admin') {
  assertDb();
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) {
    const error = new Error('Opportunity not found.');
    error.status = 404;
    throw error;
  }

  const stages = await getPipelineStages();
  const modifier = String(actor || payload.owner || opportunity.owner || 'admin').trim();

  trackChanges(opportunity, payload, modifier);

  const fields = [
    'name', 'companyId', 'primaryLeadId', 'campaignId', 'owner', 'stage',
    'nextAction', 'nextActionDueAt', 'services', 'eventName',
    'eventDate', 'boothNumber', 'budgetBand', 'proposalDeadline', 'lostReason', 'notes',
  ];
  fields.forEach((field) => {
    if (payload[field] !== undefined) opportunity[field] = payload[field] || null;
  });

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
  return opportunity.toObject();
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
    contactEvents = timeline.events || [];
  } else if (opportunity.companyId?._id) {
    const timeline = await getCompanyTimeline(opportunity.companyId._id);
    contactEvents = timeline.events || [];
  }

  const merged = [...activityEvents, ...contactEvents]
    .filter((event) => event?.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    opportunityId: String(opportunity._id),
    events: merged,
  };
}

export async function listTasks({ status = 'Open', owner, opportunityId } = {}) {
  assertDb();
  const query = { deletedAt: null };
  if (status && status !== 'All') query.status = status;
  if (owner && owner !== 'All') query.owner = owner;
  if (opportunityId) query.opportunityId = opportunityId;
  const items = await Task.find(query)
    .sort({ status: 1, dueAt: 1, priority: -1, createdAt: -1 })
    .populate('companyId', 'companyName')
    .populate('leadId', 'name email')
    .populate('opportunityId', 'name stage valueAed')
    .lean();
  return { items };
}

export async function createTask(payload, actor = 'admin') {
  assertDb();
  if (!payload.title?.trim()) {
    const error = new Error('Task title is required.');
    error.status = 400;
    throw error;
  }
  let companyId = payload.companyId || null;
  if (payload.opportunityId) {
    const opportunity = await Opportunity.findById(payload.opportunityId).select('companyId').lean();
    companyId = opportunity?.companyId || companyId || null;
  }
  return Task.create({
    title: payload.title.trim(),
    dueAt: payload.dueAt || null,
    priority: payload.priority || 'Normal',
    owner: String(payload.owner || actor || 'admin').trim(),
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
  ['title', 'dueAt', 'priority', 'owner', 'companyId', 'leadId', 'opportunityId', 'notes'].forEach((field) => {
    if (payload[field] !== undefined) task[field] = payload[field] || null;
  });
  if (payload.opportunityId !== undefined) {
    if (payload.opportunityId) {
      const opportunity = await Opportunity.findById(payload.opportunityId).select('companyId').lean();
      task.companyId = opportunity?.companyId || null;
    } else if (payload.companyId === undefined) {
      task.companyId = null;
    }
  }
  if (payload.status !== undefined) {
    task.status = payload.status;
    task.completedAt = payload.status === 'Done' ? new Date() : null;
  }
  await task.save();
  return Task.findById(id)
    .populate('companyId', 'companyName')
    .populate('leadId', 'name email')
    .populate('opportunityId', 'name stage valueAed')
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
  return softDeleteRecord({ Model: Opportunity, resourceType: 'opportunity', id, actor });
}

export async function restoreOpportunity(id, actor = {}) {
  assertDb();
  registerRevisionModel('opportunity', Opportunity);
  return restoreRecord({ Model: Opportunity, resourceType: 'opportunity', id, actor });
}

export async function getWorkspaceSummary() {
  assertDb();
  const now = new Date();
  const next30Days = new Date(now.getTime() + 30 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const [opportunities, openTasks, overdueTasks, newReplies, failedJobs, pendingContacts] = await Promise.all([
    Opportunity.find({ stage: { $nin: [CLOSED_LOST_STAGE] } }).sort({ updatedAt: -1 }).populate('companyId', 'companyName').lean(),
    Task.find({ status: 'Open', deletedAt: null }).sort({ dueAt: 1 }).limit(8).populate('companyId', 'companyName').populate('opportunityId', 'name').lean(),
    Task.countDocuments({ status: 'Open', dueAt: { $lt: now } }),
    Reply.countDocuments({ receivedAt: { $gte: sevenDaysAgo }, intent: 'Interested' }),
    SendJob.countDocuments({ status: 'failed' }),
    Lead.countDocuments({ deliveryStatus: 'Pending Inqueue' }),
  ]);
  const active = opportunities.filter((item) => item.stage !== CLOSED_WON_STAGE);
  const pipelineValue = active.reduce((sum, item) => sum + (item.valueAed || 0), 0);
  const weightedPipeline = active.reduce((sum, item) => sum + ((item.valueAed || 0) * (item.probability || 0) / 100), 0);
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
