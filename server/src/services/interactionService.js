import mongoose from 'mongoose';
import { ContactInteraction } from '../models/ContactInteraction.js';
import { Lead } from '../models/Lead.js';
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

function toInteractionEvent(record, contactName = '') {
  const typeLabel = INTERACTION_TYPE_LABELS[record.type] || 'Interaction';
  const directionLabel = INTERACTION_DIRECTION_LABELS[record.direction] || '';
  const outcomeLabel = record.outcome ? INTERACTION_OUTCOME_LABELS[record.outcome] : '';

  const detailParts = [record.summary];
  if (record.location) detailParts.push(`Location: ${record.location}`);
  if (record.attendees) detailParts.push(`With: ${record.attendees}`);
  if (record.durationMinutes) detailParts.push(`${record.durationMinutes} min`);
  if (outcomeLabel) detailParts.push(outcomeLabel);

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
    },
  };
}

export function manualInteractionToEvent(record, contactName = '') {
  return toInteractionEvent(record, contactName);
}

export async function listInteractionsForLead(leadId) {
  assertDb();
  assertValidObjectId(leadId, 'lead ID');
  return ContactInteraction.find({ leadId }).sort({ occurredAt: -1 }).lean();
}

export async function listInteractionsForCompany(companyId) {
  assertDb();
  assertValidObjectId(companyId, 'company ID');
  return ContactInteraction.find({ companyId }).sort({ occurredAt: -1 }).lean();
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

  const record = await ContactInteraction.create({
    leadId,
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

  return toInteractionEvent(record.toObject(), lead.name || lead.email);
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

  record.updatedBy = adminUsername;
  await record.save();

  const lead = await Lead.findById(record.leadId).select('name email').lean();
  return toInteractionEvent(record.toObject(), lead?.name || lead?.email || '');
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
