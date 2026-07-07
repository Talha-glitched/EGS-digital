import mongoose from 'mongoose';

const INBOUND_RESPONSE_OUTCOMES = new Set([
  'connected',
  'interested',
  'scheduled_followup',
  'completed',
]);

/** Campaign outcome values that mean the contact engaged (manual CRM updates). */
const POSITIVE_LEAD_OUTCOMES = new Set(['Call Scheduled', 'Won']);

function earliestDate(current, candidate) {
  if (!candidate) return current;
  const next = new Date(candidate);
  if (Number.isNaN(next.getTime())) return current;
  if (!current || next < current) return next;
  return current;
}

function hasText(value) {
  return Boolean(String(value || '').trim());
}

/**
 * Unified response detection for a lead — email replies, multi-channel outreach,
 * and inbound manual interactions all count.
 */
export function getLeadResponseMeta(lead, { manualInboundAt = null } = {}) {
  const channels = [];
  let respondedAt = null;

  const note = (channel, at) => {
    channels.push(channel);
    respondedAt = earliestDate(respondedAt, at);
  };

  if (lead?.deliveryStatus === 'Replied') {
    note('email', lead.repliedAt || lead.updatedAt);
  }

  if (POSITIVE_LEAD_OUTCOMES.has(lead?.outcome)) {
    note('email', lead.repliedAt || lead.updatedAt);
  }

  const li = lead?.linkedinOutreach || {};
  if (li.accepted) {
    note('linkedin', li.acceptDate || lead.updatedAt);
  }
  if (li.inmailResponded) {
    note('linkedin', li.inmailDate || lead.updatedAt);
  }
  if (li.dmResponded) {
    note('linkedin', li.dmDate || lead.updatedAt);
  }

  const cc = lead?.coldCall || {};
  if (hasText(cc.response)) {
    note('phone', cc.date || lead.updatedAt);
  }

  const wa = lead?.whatsapp || {};
  if (hasText(wa.response)) {
    note('whatsapp', wa.date || lead.updatedAt);
  }

  if (manualInboundAt) {
    note('manual', manualInboundAt);
  }

  return {
    hasResponded: channels.length > 0,
    respondedAt: respondedAt ? respondedAt.toISOString() : null,
    responseChannels: [...new Set(channels)],
  };
}

export function interactionCountsAsResponse(record) {
  if (!record) return false;
  if (record.direction === 'inbound') return true;
  return record.outcome ? INBOUND_RESPONSE_OUTCOMES.has(record.outcome) : false;
}

export function buildEarliestInboundByLead(interactions = []) {
  const map = new Map();
  interactions.forEach((record) => {
    if (!interactionCountsAsResponse(record)) return;
    const at = record.occurredAt;
    const keys = [record.leadId, ...(record.relatedLeadIds || [])]
      .map((id) => String(id))
      .filter(Boolean);
    keys.forEach((key) => {
      const existing = map.get(key);
      if (!existing || new Date(at) < new Date(existing)) {
        map.set(key, at);
      }
    });
  });
  return map;
}

export function buildLatestInteractionByLead(interactions = []) {
  const map = new Map();
  interactions.forEach((record) => {
    if (!record?.occurredAt) return;
    const at = new Date(record.occurredAt);
    if (Number.isNaN(at.getTime())) return;
    const leadIds = [
      record.leadId,
      ...(record.relatedLeadIds || []),
    ].map((id) => String(id)).filter(Boolean);
    leadIds.forEach((key) => {
      const existing = map.get(key);
      if (!existing || at > existing) map.set(key, at);
    });
  });
  return map;
}

export function interactionQueryForLeadIds(leadIds = []) {
  if (!leadIds.length) return null;
  const objectIds = leadIds
    .map((id) => String(id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (!objectIds.length) return null;
  return {
    deletedAt: null,
    $or: [
      { leadId: { $in: objectIds } },
      { relatedLeadIds: { $in: objectIds } },
    ],
  };
}

export function buildLatestDateByLead(records = [], leadIdField = 'leadId', dateField) {
  const map = new Map();
  records.forEach((record) => {
    const key = String(record?.[leadIdField]);
    const at = new Date(record?.[dateField]);
    if (!key || Number.isNaN(at.getTime())) return;
    const existing = map.get(key);
    if (!existing || at > existing) map.set(key, at);
  });
  return map;
}

export function mergeLatestDateMaps(...maps) {
  const result = new Map();
  maps.forEach((map) => {
    map.forEach((at, key) => {
      const existing = result.get(key);
      if (!existing || at > existing) result.set(key, at);
    });
  });
  return result;
}

export function getLeadLastInteractionAt(lead, { latestManualAt = null } = {}) {
  let latest = null;
  const consider = (date) => {
    if (!date) return;
    const at = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(at.getTime())) return;
    if (!latest || at > latest) latest = at;
  };

  consider(latestManualAt);
  consider(lead?.repliedAt);

  const li = lead?.linkedinOutreach || {};
  consider(li.connDate);
  consider(li.acceptDate);
  consider(li.inmailDate);
  consider(li.dmDate);

  consider(lead?.coldCall?.date);
  consider(lead?.whatsapp?.date);

  return latest ? latest.toISOString() : null;
}

export function enrichLeadWithResponse(lead, inboundByLead = new Map(), latestByLead = new Map()) {
  const manualInboundAt = inboundByLead.get(String(lead._id)) || null;
  const latestManualAt = latestByLead.get(String(lead._id)) || null;
  const response = getLeadResponseMeta(lead, { manualInboundAt });
  const lastInteractionAt = getLeadLastInteractionAt(lead, { latestManualAt });
  return { ...lead, ...response, lastInteractionAt };
}

export function enrichLeadsWithResponse(leads, interactions = [], latestByLead = null) {
  const inboundByLead = buildEarliestInboundByLead(interactions);
  const manualLatestByLead = latestByLead || buildLatestInteractionByLead(interactions);
  return leads.map((lead) => enrichLeadWithResponse(lead, inboundByLead, manualLatestByLead));
}

export function getCompanyResponseMeta(leads = [], inboundByLead = new Map()) {
  const channels = new Set();
  let respondedAt = null;
  let respondingContactCount = 0;

  leads.forEach((lead) => {
    const meta = getLeadResponseMeta(lead, {
      manualInboundAt: inboundByLead.get(String(lead._id)) || null,
    });
    if (!meta.hasResponded) return;
    respondingContactCount += 1;
    meta.responseChannels.forEach((channel) => channels.add(channel));
    respondedAt = earliestDate(respondedAt, meta.respondedAt);
  });

  return {
    hasResponded: respondingContactCount > 0,
    respondedAt: respondedAt ? respondedAt.toISOString() : null,
    responseChannels: [...channels],
    respondingContactCount,
  };
}

export function enrichCompaniesWithResponse(companies, leads = [], interactions = []) {
  const inboundByLead = buildEarliestInboundByLead(interactions);
  const leadsByCompany = new Map();
  leads.forEach((lead) => {
    const key = String(lead.companyId);
    if (!leadsByCompany.has(key)) leadsByCompany.set(key, []);
    leadsByCompany.get(key).push(lead);
  });

  return companies.map((company) => {
    const companyLeads = leadsByCompany.get(String(company._id)) || [];
    const response = getCompanyResponseMeta(companyLeads, inboundByLead);
    return { ...company, ...response, pocCount: companyLeads.length };
  });
}
