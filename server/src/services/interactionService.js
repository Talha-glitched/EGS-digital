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
import db from '../db/index.js';

function toInteractionEvent(record, contactName = '', relatedContacts = []) {
  const typeLabel = INTERACTION_TYPE_LABELS[record.type] || 'Interaction';
  const directionLabel = INTERACTION_DIRECTION_LABELS[record.direction] || '';
  const outcomeLabel = record.outcome ? INTERACTION_OUTCOME_LABELS[record.outcome] : '';

  const detailParts = [record.summary || record.notes];
  if (record.location) detailParts.push(`Location: ${record.location}`);
  if (record.attendees) detailParts.push(`With: ${record.attendees}`);
  if (record.durationMinutes) detailParts.push(`${record.durationMinutes} min`);
  if (outcomeLabel) detailParts.push(outcomeLabel);

  const contacts = relatedContacts.length
    ? relatedContacts
    : [{ id: String(record.leadId || record.personId), name: contactName }].filter((entry) => entry.name);

  return {
    id: `manual-${record.id || record._id}`,
    type: record.type || record.channel,
    title: record.title || defaultTitleForType(record.type || record.channel, record.direction),
    detail: detailParts.filter(Boolean).join(' · '),
    timestamp: new Date(record.occurredAt || record.occurred_at).toISOString(),
    actor: record.loggedBy || 'Team',
    channel: record.type || record.channel,
    contactName,
    contactId: String(record.leadId || record.personId || ''),
    source: 'manual',
    editable: true,
    meta: {
      interactionId: String(record.id || record._id),
      direction: record.direction,
      directionLabel,
      typeLabel,
      outcome: record.outcome,
      outcomeLabel,
      durationMinutes: record.durationMinutes,
      location: record.location,
      attendees: record.attendees,
      summary: record.summary || record.notes,
      updatedAt: record.updatedAt || record.created_at,
      primaryLeadId: String(record.leadId || record.personId || ''),
      relatedLeadIds: (record.relatedLeadIds || []).map((id) => String(id)),
      relatedContacts: contacts,
    },
  };
}

export function manualInteractionToEvent(record, contactName = '', relatedContacts = []) {
  return toInteractionEvent(record, contactName, relatedContacts);
}

export function buildRelatedContacts(record, leadMap = new Map()) {
  const ids = [String(record.leadId || record.personId), ...(record.relatedLeadIds || []).map((id) => String(id))];
  const seen = new Set();
  return ids
    .filter((id) => {
      if (!id || id === 'undefined' || seen.has(id)) return false;
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
  try {
    const res = await db.query(
      `SELECT id, person_id AS "leadId", organization_id AS "companyId", channel AS type, direction, occurred_at AS "occurredAt", outcome, notes AS summary
       FROM interactions WHERE person_id = $1::uuid ORDER BY occurred_at DESC`,
      [leadId]
    );
    return res.rows;
  } catch (err) {
    if (mongoose.connection?.readyState) {
      return ContactInteraction.find({
        deletedAt: null,
        $or: [{ leadId }, { relatedLeadIds: leadId }],
      }).sort({ occurredAt: -1 }).lean();
    }
    throw err;
  }
}

export async function listInteractionsForCompany(companyId) {
  try {
    const res = await db.query(
      `SELECT id, person_id AS "leadId", organization_id AS "companyId", channel AS type, direction, occurred_at AS "occurredAt", outcome, notes AS summary
       FROM interactions WHERE organization_id = $1::uuid ORDER BY occurred_at DESC`,
      [companyId]
    );
    return res.rows;
  } catch (err) {
    if (mongoose.connection?.readyState) {
      return ContactInteraction.find({ companyId, deletedAt: null }).sort({ occurredAt: -1 }).lean();
    }
    throw err;
  }
}

export async function createInteraction(leadId, payload, adminUsername = 'admin') {
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

  try {
    const res = await db.query(
      `INSERT INTO interactions (person_id, channel, direction, occurred_at, outcome, notes)
       VALUES ($1::uuid, $2::varchar, $3::varchar, $4::timestamptz, $5::varchar, $6::text)
       RETURNING id, person_id AS "leadId", channel AS type, direction, occurred_at AS "occurredAt", outcome, notes AS summary`,
      [leadId, type, direction, occurredAt, payload.outcome || null, summary]
    );

    return toInteractionEvent(res.rows[0], payload.contactName || 'Contact', []);
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const lead = await Lead.findById(leadId).select('companyId name email').lean();
      const record = await ContactInteraction.create({
        leadId,
        companyId: lead?.companyId,
        type,
        direction,
        title: String(payload.title || '').trim() || defaultTitleForType(type, direction),
        summary,
        occurredAt,
        outcome: payload.outcome || null,
        loggedBy: adminUsername,
      });

      return toInteractionEvent(record.toObject(), lead?.name || lead?.email || 'Contact', []);
    }
    throw err;
  }
}

export async function updateInteraction(interactionId, payload, adminUsername = 'admin') {
  try {
    const res = await db.query(
      `UPDATE interactions 
       SET channel = COALESCE($1::varchar, channel),
           direction = COALESCE($2::varchar, direction),
           outcome = COALESCE($3::varchar, outcome),
           notes = COALESCE($4::text, notes)
       WHERE id = $5::uuid
       RETURNING id, person_id AS "leadId", channel AS type, direction, occurred_at AS "occurredAt", outcome, notes AS summary`,
      [payload.type || null, payload.direction || null, payload.outcome || null, payload.summary || payload.notes || null, interactionId]
    );
    if (res.rows.length > 0) {
      return toInteractionEvent(res.rows[0], payload.contactName || 'Contact', []);
    }
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const record = await ContactInteraction.findById(interactionId);
      if (!record) {
        const error = new Error('Interaction not found.');
        error.status = 404;
        throw error;
      }
      if (payload.type) record.type = payload.type;
      if (payload.direction) record.direction = payload.direction;
      if (payload.summary) record.summary = String(payload.summary).trim();
      await record.save();
      return toInteractionEvent(record.toObject(), 'Contact', []);
    }
    throw err;
  }
}

export async function deleteInteraction(interactionId, actor = {}) {
  try {
    await db.query(`DELETE FROM interactions WHERE id = $1::uuid`, [interactionId]);
    return { ok: true, id: interactionId, resourceType: 'interaction' };
  } catch (err) {
    if (mongoose.connection?.readyState) {
      registerRevisionModel('interaction', ContactInteraction);
      return softDeleteRecord({
        Model: ContactInteraction,
        resourceType: 'interaction',
        id: interactionId,
        actor,
      });
    }
    throw err;
  }
}

export async function restoreInteraction(interactionId, actor = {}) {
  if (mongoose.connection?.readyState) {
    registerRevisionModel('interaction', ContactInteraction);
    return restoreRecord({
      Model: ContactInteraction,
      resourceType: 'interaction',
      id: interactionId,
      actor,
    });
  }
  return { ok: true };
}

export async function buildLatestInteractionDateMap(leadIds = []) {
  if (!leadIds?.length) return new Map();

  try {
    const res = await db.query(
      `SELECT person_id AS "leadId", MAX(occurred_at) AS latest
       FROM interactions
       WHERE person_id = ANY($1::uuid[])
       GROUP BY person_id`,
      [leadIds]
    );

    const map = new Map();
    res.rows.forEach(r => map.set(r.leadId, r.latest));
    return map;
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const objectIds = leadIds
        .map((id) => String(id))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (!objectIds.length) return new Map();

      const rows = await ContactInteraction.aggregate([
        { $match: { deletedAt: null, leadId: { $in: objectIds } } },
        { $group: { _id: '$leadId', latest: { $max: '$occurredAt' } } },
      ]);

      const map = new Map();
      rows.forEach((row) => map.set(String(row._id), row.latest));
      return map;
    }
    return new Map();
  }
}
