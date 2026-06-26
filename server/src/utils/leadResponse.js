const INBOUND_RESPONSE_OUTCOMES = new Set([
  'connected',
  'interested',
  'scheduled_followup',
  'completed',
]);

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

  const li = lead?.linkedinOutreach || {};
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
    const key = String(record.leadId);
    const at = record.occurredAt;
    const existing = map.get(key);
    if (!existing || new Date(at) < new Date(existing)) {
      map.set(key, at);
    }
  });
  return map;
}

export function enrichLeadWithResponse(lead, inboundByLead = new Map()) {
  const manualInboundAt = inboundByLead.get(String(lead._id)) || null;
  const response = getLeadResponseMeta(lead, { manualInboundAt });
  return { ...lead, ...response };
}

export function enrichLeadsWithResponse(leads, interactions = []) {
  const inboundByLead = buildEarliestInboundByLead(interactions);
  return leads.map((lead) => enrichLeadWithResponse(lead, inboundByLead));
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
    return { ...company, ...response };
  });
}
