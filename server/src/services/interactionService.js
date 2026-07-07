import mongoose from 'mongoose';
import { ContactInteraction } from '../models/ContactInteraction.js';
import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { normalizeCompanyName } from '../utils/companyResolver.js';
import {
  softDeleteRecord,
  restoreRecord,
  registerRevisionModel,
} from './revisionService.js';
import {
  INTERACTION_TYPES,
  INTERACTION_DIRECTIONS,
  INTERACTION_OUTCOMES,
  defaultTitleForType,
  INTERACTION_TYPE_LABELS,
  INTERACTION_OUTCOME_LABELS,
  INTERACTION_DIRECTION_LABELS,
} from '../constants/interactionTypes.js';

function assertDb() {
  if (!process.env.MONGODB_URI) {
    const error = new Error('Database not configured.');
    error.status = 503;
    throw error;
  }
}

function assertValidObjectId(id, label = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${label}.`);
    error.status = 400;
    throw error;
  }
}

function toInteractionEvent(record, contactName = '', relatedContacts = []) {
  const typeLabel = INTERACTION_TYPE_LABELS[record.type] || 'Interaction';
  const directionLabel = INTERACTION_DIRECTION_LABELS[record.direction] || '';
  const outcomeLabel = record.outcome ? INTERACTION_OUTCOME_LABELS[record.outcome] : '';

  const detailParts = [record.summary];
  if (record.location) detailParts.push(`Location: ${record.location}`);
  if (record.attendees) detailParts.push(`With: ${record.attendees}`);
  if (record.durationMinutes) detailParts.push(`${record.durationMinutes} min`);
  if (outcomeLabel) detailParts.push(outcomeLabel);

  const contacts = relatedContacts.length
    ? relatedContacts
    : [{ id: String(record.leadId), name: contactName }].filter((entry) => entry.name);

  return {
    id: `manual-${record._id}`,
    type: record.type,
    title: record.title || defaultTitleForType(record.type, record.direction),
    detail: detailParts.filter(Boolean).join(' · '),
    timestamp: new Date(record.occurredAt).toISOString(),
    actor: record.loggedBy || 'Team',
    channel: record.type,
    contactName,
    contactId: String(record.leadId),
    source: 'manual',
    editable: true,
    meta: {
      interactionId: String(record._id),
      direction: record.direction,
      directionLabel,
      typeLabel,
      outcome: record.outcome,
      outcomeLabel,
      durationMinutes: record.durationMinutes,
      location: record.location,
      attendees: record.attendees,
      summary: record.summary,
      updatedAt: record.updatedAt,
      primaryLeadId: String(record.leadId),
      relatedLeadIds: (record.relatedLeadIds || []).map((id) => String(id)),
      relatedContacts: contacts,
    },
  };
}

export function manualInteractionToEvent(record, contactName = '', relatedContacts = []) {
  return toInteractionEvent(record, contactName, relatedContacts);
}

function normalizeLeadIdList(ids = []) {
  const unique = [];
  const seen = new Set();
  ids.forEach((id) => {
    const value = String(id || '').trim();
    if (!value || !mongoose.Types.ObjectId.isValid(value) || seen.has(value)) return;
    seen.add(value);
    unique.push(value);
  });
  return unique.map((id) => new mongoose.Types.ObjectId(id));
}

function leadsShareCompanyContext(primaryCompanyId, relatedCompanyId, companyNameById) {
  if (String(primaryCompanyId) === String(relatedCompanyId)) return true;
  const primaryName = companyNameById.get(String(primaryCompanyId));
  const relatedName = companyNameById.get(String(relatedCompanyId));
  return Boolean(primaryName && relatedName && primaryName === relatedName);
}

async function resolveRelatedLeadIds(primaryLead, payload = {}) {
  const primaryId = String(primaryLead._id);
  const requested = normalizeLeadIdList([
    ...(Array.isArray(payload.leadIds) ? payload.leadIds : []),
    ...(Array.isArray(payload.relatedLeadIds) ? payload.relatedLeadIds : []),
  ]).filter((id) => String(id) !== primaryId);

  if (!requested.length) return [];

  const leads = await Lead.find({ _id: { $in: requested } }).select('companyId').lean();
  if (leads.length !== requested.length) {
    const error = new Error('One or more selected contacts were not found.');
    error.status = 400;
    throw error;
  }

  const companyIds = [
    primaryLead.companyId,
    ...leads.map((lead) => lead.companyId),
  ].map((id) => new mongoose.Types.ObjectId(String(id)));
  const companies = await Company.find({ _id: { $in: companyIds } }).select('companyName').lean();
  const companyNameById = new Map(
    companies.map((company) => [String(company._id), normalizeCompanyName(company.companyName)]),
  );

  const mismatched = leads.find((lead) => !leadsShareCompanyContext(
    primaryLead.companyId,
    lead.companyId,
    companyNameById,
  ));
  if (mismatched) {
    const error = new Error('All selected contacts must belong to the same company.');
    error.status = 400;
    throw error;
  }

  return requested;
}

export function buildRelatedContacts(record, leadMap = new Map()) {
  const ids = [String(record.leadId), ...(record.relatedLeadIds || []).map((id) => String(id))];
  const seen = new Set();
  return ids
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((id) => {
      const lead = leadMap.get(id);
      return {
        id,
        name: lead?.name || lead?.email || 'Contact',
      };
    });
}

export async function listInteractionsForLead(leadId) {
  assertDb();
  assertValidObjectId(leadId, 'lead ID');
  return ContactInteraction.find({
    deletedAt: null,
    $or: [{ leadId }, { relatedLeadIds: leadId }],
  }).sort({ occurredAt: -1 }).lean();
}

export async function listInteractionsForCompany(companyId) {
  assertDb();
  assertValidObjectId(companyId, 'company ID');
  return ContactInteraction.find({ companyId, deletedAt: null }).sort({ occurredAt: -1 }).lean();
}

export async function createInteraction(leadId, payload, adminUsername = 'admin') {
  assertDb();
  assertValidObjectId(leadId, 'lead ID');

  const lead = await Lead.findById(leadId).select('companyId name email').lean();
  if (!lead) {
    const error = new Error('Lead not found.');
    error.status = 404;
    throw error;
  }

  const type = payload.type;
  if (!INTERACTION_TYPES.includes(type)) {
    const error = new Error('Invalid interaction type.');
    error.status = 400;
    throw error;
  }

  const direction = payload.direction || 'outbound';
  if (!INTERACTION_DIRECTIONS.includes(direction)) {
    const error = new Error('Invalid interaction direction.');
    error.status = 400;
    throw error;
  }

  const summary = String(payload.summary || '').trim();
  if (!summary) {
    const error = new Error('Summary is required.');
    error.status = 400;
    throw error;
  }

  const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    const error = new Error('Invalid date.');
    error.status = 400;
    throw error;
  }

  let outcome = payload.outcome || null;
  if (outcome && !INTERACTION_OUTCOMES.includes(outcome)) {
    const error = new Error('Invalid outcome.');
    error.status = 400;
    throw error;
  }

  const durationMinutes = payload.durationMinutes != null && payload.durationMinutes !== ''
    ? Math.max(0, Number(payload.durationMinutes))
    : null;

  const relatedLeadIds = await resolveRelatedLeadIds(lead, payload);

  const record = await ContactInteraction.create({
    leadId,
    relatedLeadIds,
    companyId: lead.companyId,
    type,
    direction,
    title: String(payload.title || '').trim() || defaultTitleForType(type, direction),
    summary,
    occurredAt,
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : null,
    outcome,
    location: String(payload.location || '').trim(),
    attendees: String(payload.attendees || '').trim(),
    loggedBy: adminUsername,
  });

  return toInteractionEvent(
    record.toObject(),
    lead.name || lead.email,
    buildRelatedContacts(record.toObject(), new Map([[String(lead._id), lead]])),
  );
}

export async function updateInteraction(interactionId, payload, adminUsername = 'admin') {
  assertDb();
  assertValidObjectId(interactionId, 'interaction ID');

  const record = await ContactInteraction.findById(interactionId);
  if (!record) {
    const error = new Error('Interaction not found.');
    error.status = 404;
    throw error;
  }

  if (payload.type && INTERACTION_TYPES.includes(payload.type)) {
    record.type = payload.type;
  }
  if (payload.direction && INTERACTION_DIRECTIONS.includes(payload.direction)) {
    record.direction = payload.direction;
  }
  if (payload.title !== undefined) {
    record.title = String(payload.title || '').trim() || defaultTitleForType(record.type, record.direction);
  }
  if (payload.summary !== undefined) {
    const summary = String(payload.summary || '').trim();
    if (!summary) {
      const error = new Error('Summary is required.');
      error.status = 400;
      throw error;
    }
    record.summary = summary;
  }
  if (payload.occurredAt !== undefined) {
    const occurredAt = new Date(payload.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      const error = new Error('Invalid date.');
      error.status = 400;
      throw error;
    }
    record.occurredAt = occurredAt;
  }
  if (payload.durationMinutes !== undefined) {
    const durationMinutes = payload.durationMinutes === '' || payload.durationMinutes == null
      ? null
      : Math.max(0, Number(payload.durationMinutes));
    record.durationMinutes = Number.isFinite(durationMinutes) ? durationMinutes : null;
  }
  if (payload.outcome !== undefined) {
    record.outcome = payload.outcome && INTERACTION_OUTCOMES.includes(payload.outcome) ? payload.outcome : null;
  }
  if (payload.location !== undefined) record.location = String(payload.location || '').trim();
  if (payload.attendees !== undefined) record.attendees = String(payload.attendees || '').trim();

  if (payload.leadId !== undefined) {
    assertValidObjectId(payload.leadId, 'lead ID');
    const nextLead = await Lead.findById(payload.leadId).select('companyId name email').lean();
    if (!nextLead) {
      const error = new Error('Lead not found.');
      error.status = 404;
      throw error;
    }
    if (String(nextLead.companyId) !== String(record.companyId)) {
      const error = new Error('Primary contact must belong to the same company as this interaction.');
      error.status = 400;
      throw error;
    }
    record.leadId = nextLead._id;
  }

  if (payload.relatedLeadIds !== undefined || payload.leadIds !== undefined) {
    const primaryLead = await Lead.findById(record.leadId).select('companyId name email').lean();
    record.relatedLeadIds = await resolveRelatedLeadIds(primaryLead, payload);
  }

  record.updatedBy = adminUsername;
  await record.save();

  const lead = await Lead.findById(record.leadId).select('name email').lean();
  const relatedLeads = record.relatedLeadIds?.length
    ? await Lead.find({ _id: { $in: record.relatedLeadIds } }).select('name email').lean()
    : [];
  const leadMap = new Map([
    [String(record.leadId), lead],
    ...relatedLeads.map((item) => [String(item._id), item]),
  ]);
  return toInteractionEvent(
    record.toObject(),
    lead?.name || lead?.email || '',
    buildRelatedContacts(record.toObject(), leadMap),
  );
}

export async function deleteInteraction(interactionId, actor = {}) {
  assertDb();
  assertValidObjectId(interactionId, 'interaction ID');
  registerRevisionModel('interaction', ContactInteraction);
  return softDeleteRecord({
    Model: ContactInteraction,
    resourceType: 'interaction',
    id: interactionId,
    actor,
  });
}

export async function restoreInteraction(interactionId, actor = {}) {
  assertDb();
  assertValidObjectId(interactionId, 'interaction ID');
  registerRevisionModel('interaction', ContactInteraction);
  return restoreRecord({
    Model: ContactInteraction,
    resourceType: 'interaction',
    id: interactionId,
    actor,
  });
}

export async function buildLatestInteractionDateMap(leadIds = []) {
  assertDb();
  if (!leadIds?.length) return new Map();

  const objectIds = leadIds
    .map((id) => String(id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!objectIds.length) return new Map();

  const rows = await ContactInteraction.aggregate([
    {
      $match: {
        deletedAt: null,
        $or: [
          { leadId: { $in: objectIds } },
          { relatedLeadIds: { $in: objectIds } },
        ],
      },
    },
    {
      $project: {
        occurredAt: 1,
        associations: {
          $concatArrays: [
            [{ $ifNull: ['$leadId', null] }],
            { $ifNull: ['$relatedLeadIds', []] },
          ],
        },
      },
    },
    { $unwind: '$associations' },
    { $match: { associations: { $in: objectIds } } },
    {
      $group: {
        _id: '$associations',
        latest: { $max: '$occurredAt' },
      },
    },
  ]);

  const map = new Map();
  rows.forEach((row) => {
    map.set(String(row._id), row.latest);
  });
  return map;
}
