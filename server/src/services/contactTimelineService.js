import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { Reply } from '../models/Reply.js';
import { SendJob } from '../models/SendJob.js';
import { Task } from '../models/Task.js';
import { Opportunity } from '../models/Opportunity.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { POC_QUALIFICATION_LABELS } from '../constants/pocQualification.js';
import {
  listInteractionsForLead,
  listInteractionsForCompany,
  manualInteractionToEvent,
  buildRelatedContacts,
} from './interactionService.js';
import mongoose from 'mongoose';

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

function event(id, payload) {
  if (!payload.timestamp) return null;
  const ts = new Date(payload.timestamp);
  if (Number.isNaN(ts.getTime())) return null;

  const direction = payload.direction
    || payload.meta?.direction
    || (payload.type === 'email_outbound' ? 'outbound' : null)
    || (payload.type === 'email_inbound' ? 'inbound' : null);

  return {
    id,
    type: payload.type,
    title: payload.title,
    detail: payload.detail || '',
    timestamp: ts.toISOString(),
    actor: payload.actor || 'Team',
    channel: payload.channel || 'crm',
    contactName: payload.contactName || '',
    contactId: payload.contactId || null,
    source: payload.source || 'automated',
    meta: {
      ...(payload.meta || {}),
      ...(direction ? { direction } : {}),
    },
  };
}

function normalizeObjectIdList(values = []) {
  return [...new Set(
    values
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter((value) => mongoose.isValidObjectId(value)),
  )];
}

function leadOutreachEvents(lead, campaignName) {
  const events = [];
  const name = lead.name || lead.email;
  const base = { contactName: name, contactId: String(lead._id) };

  events.push(event(`lead-created-${lead._id}`, {
    ...base,
    type: 'profile',
    title: 'Contact enrolled',
    detail: `Added to ${campaignName || 'campaign'} as ${lead.designation || 'point of contact'}.`,
    timestamp: lead.createdAt,
    actor: 'System',
    channel: 'crm',
  }));

  if (lead.deliveryStatus === 'Emailed Outbound') {
    events.push(event(`lead-emailed-${lead._id}`, {
      ...base,
      type: 'email_outbound',
      title: 'Sequence email sent',
      detail: `Outbound email marked as delivered to ${lead.email}.`,
      timestamp: lead.updatedAt,
      channel: 'email',
    }));
  }

  if (lead.deliveryStatus === 'Replied' && lead.repliedAt) {
    events.push(event(`lead-replied-${lead._id}`, {
      ...base,
      type: 'email_inbound',
      title: 'Email reply received',
      detail: `Contact replied during ${campaignName || 'campaign'} outreach.`,
      timestamp: lead.repliedAt,
      channel: 'email',
    }));
  }

  const li = lead.linkedinOutreach || {};
  if (li.connSent) {
    events.push(event(`li-conn-${lead._id}`, {
      ...base,
      type: 'linkedin',
      title: 'LinkedIn connection sent',
      detail: li.notes || 'Connection request logged.',
      timestamp: li.connDate || lead.updatedAt,
      channel: 'linkedin',
    }));
  }
  if (li.accepted) {
    events.push(event(`li-accept-${lead._id}`, {
      ...base,
      type: 'linkedin',
      title: 'LinkedIn connection accepted',
      detail: 'Connection accepted on LinkedIn.',
      timestamp: li.acceptDate || lead.updatedAt,
      channel: 'linkedin',
    }));
  }
  if (li.inmailSent) {
    events.push(event(`li-inmail-${lead._id}`, {
      ...base,
      type: 'linkedin',
      title: 'LinkedIn InMail sent',
      detail: li.notes || 'InMail outreach logged.',
      timestamp: li.inmailDate || lead.updatedAt,
      channel: 'linkedin',
    }));
  }
  if (li.inmailResponded) {
    events.push(event(`li-inmail-resp-${lead._id}`, {
      ...base,
      type: 'email_inbound',
      title: 'LinkedIn InMail response',
      detail: li.notes || 'Contact responded to InMail.',
      timestamp: li.inmailDate || lead.updatedAt,
      channel: 'linkedin',
    }));
  }
  if (li.dmSent) {
    events.push(event(`li-dm-${lead._id}`, {
      ...base,
      type: 'linkedin',
      title: 'LinkedIn direct message sent',
      detail: li.notes || 'DM outreach logged.',
      timestamp: li.dmDate || lead.updatedAt,
      channel: 'linkedin',
    }));
  }
  if (li.dmResponded) {
    events.push(event(`li-dm-resp-${lead._id}`, {
      ...base,
      type: 'email_inbound',
      title: 'LinkedIn DM response',
      detail: li.notes || 'Contact responded to direct message.',
      timestamp: li.dmDate || lead.updatedAt,
      channel: 'linkedin',
    }));
  }

  const cc = lead.coldCall || {};
  if (cc.made) {
    events.push(event(`cc-${lead._id}`, {
      ...base,
      type: 'call',
      title: 'Cold call logged',
      detail: [cc.response, cc.notes].filter(Boolean).join(' · ') || 'Call attempt recorded.',
      timestamp: cc.date || lead.updatedAt,
      channel: 'phone',
    }));
  }
  if (String(cc.response || '').trim()) {
    events.push(event(`cc-resp-${lead._id}`, {
      ...base,
      type: 'email_inbound',
      title: 'Cold call response',
      detail: String(cc.response).trim(),
      timestamp: cc.date || lead.updatedAt,
      channel: 'phone',
    }));
  }

  const wa = lead.whatsapp || {};
  if (wa.sent) {
    events.push(event(`wa-${lead._id}`, {
      ...base,
      type: 'whatsapp',
      title: 'WhatsApp message sent',
      detail: wa.response || 'WhatsApp follow-up logged.',
      timestamp: wa.date || lead.updatedAt,
      channel: 'whatsapp',
    }));
  }
  if (String(wa.response || '').trim()) {
    events.push(event(`wa-resp-${lead._id}`, {
      ...base,
      type: 'email_inbound',
      title: 'WhatsApp response',
      detail: String(wa.response).trim(),
      timestamp: wa.date || lead.updatedAt,
      channel: 'whatsapp',
    }));
  }

  if (lead.outcome && lead.outcome !== 'Pending') {
    events.push(event(`outcome-${lead._id}`, {
      ...base,
      type: 'status',
      title: `Outcome: ${lead.outcome}`,
      detail: `Campaign outcome updated for ${name}.`,
      timestamp: lead.updatedAt,
      channel: 'crm',
    }));
  }

  const poc = lead.pocQualification || {};
  if (poc.status && poc.status !== 'Unverified') {
    const label = POC_QUALIFICATION_LABELS[poc.status] || poc.status;
    let detail = poc.notes || '';
    if (poc.status === 'RedirectedWithReferral' && poc.referral?.name) {
      const ref = poc.referral;
      detail = [detail, `Referred to ${ref.name}${ref.email ? ` (${ref.email})` : ''}`].filter(Boolean).join(' · ');
    }
    events.push(event(`poc-${lead._id}-${poc.status}`, {
      ...base,
      type: 'poc_qualification',
      title: `POC: ${label}`,
      detail: detail || `Assessed by ${poc.assessedBy || 'team'}.`,
      timestamp: poc.assessedAt || lead.updatedAt,
      actor: poc.assessedBy || 'Team',
      channel: 'crm',
      meta: { pocStatus: poc.status },
    }));
  }

  return events.filter(Boolean);
}

async function enrichCampaignMap(campaignIds) {
  const ids = normalizeObjectIdList(campaignIds);
  if (!ids.length) return new Map();
  const campaigns = await ProjectCampaign.find({ _id: { $in: ids } }).select('projectName').lean();
  return new Map(campaigns.map((c) => [String(c._id), c.projectName]));
}

export async function getLeadTimeline(leadId) {
  assertDb();
  assertValidObjectId(leadId, 'lead ID');
  const lead = await Lead.findById(leadId).lean();
  if (!lead) {
    const error = new Error('Lead not found.');
    error.status = 404;
    throw error;
  }

  const [company, campaign, sendJobs, replies, tasks, opportunities, manualInteractions] = await Promise.all([
    Company.findById(lead.companyId).select('companyName').lean(),
    ProjectCampaign.findById(lead.campaignId).select('projectName').lean(),
    SendJob.find({ leadId, status: 'sent' }).sort({ sentAt: 1 }).lean(),
    Reply.find({ leadId }).sort({ receivedAt: 1 }).lean(),
    Task.find({ leadId }).sort({ createdAt: -1 }).lean(),
    Opportunity.find({ $or: [{ primaryLeadId: leadId }, { companyId: lead.companyId }] }).sort({ updatedAt: -1 }).lean(),
    listInteractionsForLead(leadId),
  ]);

  const campaignName = campaign?.projectName || 'Campaign';
  const contactName = lead.name || lead.email;
  const events = leadOutreachEvents(lead, campaignName);

  sendJobs.forEach((job) => {
    const evt = event(`send-${job._id}`, {
      contactName,
      contactId: String(leadId),
      type: 'email_outbound',
      title: `Sequence step ${job.stepIndex + 1} sent`,
      detail: job.renderedSubject || job.renderedBody?.slice(0, 140) || 'Automated sequence email delivered.',
      timestamp: job.sentAt,
      actor: 'Sequence',
      channel: 'email',
      meta: { step: job.stepIndex + 1 },
    });
    if (evt) events.push(evt);
  });

  replies.forEach((reply) => {
    const evt = event(`reply-${reply._id}`, {
      contactName,
      contactId: String(leadId),
      type: 'email_inbound',
      title: `Reply: ${reply.intent || 'Inbound'}`,
      detail: reply.text?.slice(0, 180) || reply.subject || 'Inbound email received.',
      timestamp: reply.receivedAt,
      actor: contactName,
      channel: 'email',
      meta: { intent: reply.intent },
    });
    if (evt) events.push(evt);
  });

  tasks.forEach((task) => {
    const evt = event(`task-${task._id}`, {
      contactName,
      contactId: String(leadId),
      type: 'task',
      title: task.status === 'Done' ? `Task completed: ${task.title}` : `Follow-up: ${task.title}`,
      detail: task.notes || (task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString('en-AE')}` : ''),
      timestamp: task.status === 'Done' && task.completedAt ? task.completedAt : (task.dueAt || task.createdAt),
      actor: task.owner || 'Team',
      channel: 'task',
      meta: { priority: task.priority, status: task.status },
    });
    if (evt) events.push(evt);
  });

  opportunities.forEach((opp) => {
    const evt = event(`opp-${opp._id}`, {
      contactName,
      contactId: String(leadId),
      type: 'opportunity',
      title: opp.name,
      detail: `${opp.stage} · AED ${(opp.valueAed || 0).toLocaleString('en-AE')} · ${opp.owner || 'admin'}`,
      timestamp: opp.updatedAt || opp.createdAt,
      actor: opp.owner || 'Team',
      channel: 'pipeline',
      meta: { stage: opp.stage, valueAed: opp.valueAed },
    });
    if (evt) events.push(evt);
  });

  const relatedIds = manualInteractions.flatMap((record) => record.relatedLeadIds || []);
  const relatedLeads = relatedIds.length
    ? await Lead.find({ _id: { $in: relatedIds } }).select('name email').lean()
    : [];
  const interactionLeadMap = new Map([
    [String(leadId), lead],
    ...relatedLeads.map((item) => [String(item._id), item]),
  ]);

  manualInteractions.forEach((record) => {
    const primaryLead = interactionLeadMap.get(String(record.leadId));
    events.push(manualInteractionToEvent(
      record,
      primaryLead?.name || primaryLead?.email || contactName,
      buildRelatedContacts(record, interactionLeadMap),
    ));
  });

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    subject: {
      type: 'contact',
      id: String(lead._id),
      name: contactName,
      designation: lead.designation || '',
      companyName: company?.companyName || '',
      campaignName,
      email: lead.email,
    },
    events,
  };
}

export async function getCompanyTimeline(companyId) {
  assertDb();
  assertValidObjectId(companyId, 'company ID');
  const company = await Company.findById(companyId).lean();
  if (!company) {
    const error = new Error('Company not found.');
    error.status = 404;
    throw error;
  }

  const leads = await Lead.find({ companyId }).lean();
  const leadIds = leads.map((l) => l._id);
  const campaignIds = normalizeObjectIdList(leads.map((l) => l.campaignId));
  const campaignMap = await enrichCampaignMap(campaignIds);

  const [sendJobs, replies, tasks, opportunities, manualInteractions] = await Promise.all([
    SendJob.find({ leadId: { $in: leadIds }, status: 'sent' }).sort({ sentAt: -1 }).lean(),
    Reply.find({ leadId: { $in: leadIds } }).sort({ receivedAt: -1 }).lean(),
    Task.find({ companyId }).sort({ createdAt: -1 }).lean(),
    Opportunity.find({ companyId }).sort({ updatedAt: -1 }).lean(),
    listInteractionsForCompany(companyId),
  ]);

  const leadMap = new Map(leads.map((l) => [String(l._id), l]));
  const events = [];

  leads.forEach((lead) => {
    const campaignName = campaignMap.get(String(lead.campaignId));
    events.push(...leadOutreachEvents(lead, campaignName));
  });

  sendJobs.forEach((job) => {
    const lead = leadMap.get(String(job.leadId));
    const contactName = lead?.name || lead?.email || 'Contact';
    const evt = event(`send-${job._id}`, {
      contactName,
      contactId: String(job.leadId),
      type: 'email_outbound',
      title: `Email step ${job.stepIndex + 1} · ${contactName}`,
      detail: job.renderedSubject || 'Sequence email delivered.',
      timestamp: job.sentAt,
      actor: 'Sequence',
      channel: 'email',
    });
    if (evt) events.push(evt);
  });

  replies.forEach((reply) => {
    const lead = leadMap.get(String(reply.leadId));
    const contactName = lead?.name || lead?.email || 'Contact';
    const evt = event(`reply-${reply._id}`, {
      contactName,
      contactId: String(reply.leadId),
      type: 'email_inbound',
      title: `Reply from ${contactName}`,
      detail: reply.text?.slice(0, 180) || reply.subject || 'Inbound email.',
      timestamp: reply.receivedAt,
      actor: contactName,
      channel: 'email',
    });
    if (evt) events.push(evt);
  });

  tasks.forEach((task) => {
    const lead = task.leadId ? leadMap.get(String(task.leadId)) : null;
    const evt = event(`task-${task._id}`, {
      contactName: lead?.name || '',
      contactId: lead ? String(lead._id) : null,
      type: 'task',
      title: task.title,
      detail: task.notes || `Owner: ${task.owner || 'admin'}`,
      timestamp: task.dueAt || task.createdAt,
      actor: task.owner || 'Team',
      channel: 'task',
    });
    if (evt) events.push(evt);
  });

  opportunities.forEach((opp) => {
    const lead = opp.primaryLeadId ? leadMap.get(String(opp.primaryLeadId)) : null;
    const evt = event(`opp-${opp._id}`, {
      contactName: lead?.name || '',
      contactId: lead ? String(lead._id) : null,
      type: 'opportunity',
      title: opp.name,
      detail: `${opp.stage} · owned by ${opp.owner || 'admin'}`,
      timestamp: opp.updatedAt || opp.createdAt,
      actor: opp.owner || 'Team',
      channel: 'pipeline',
    });
    if (evt) events.push(evt);
  });

  manualInteractions.forEach((record) => {
    const lead = leadMap.get(String(record.leadId));
    events.push(manualInteractionToEvent(
      record,
      lead?.name || lead?.email || '',
      buildRelatedContacts(record, leadMap),
    ));
  });

  const seen = new Set();
  const unique = events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    subject: {
      type: 'company',
      id: String(company._id),
      name: company.companyName,
      domain: company.domain || '',
      status: company.globalStatus || 'Lead',
      contactCount: leads.length,
    },
    events: unique,
  };
}
