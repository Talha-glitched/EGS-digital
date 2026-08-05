/**
 * Targeted READ-ONLY migration risk audit for the EGS CRM database.
 * Outputs aggregate counts only; no credentials, message bodies, or personal
 * contact values are written to the report.
 *
 * Usage:
 *   node scripts/auditDatabaseMigrationRisks.js <output-json-path>
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config();

const outputArg = process.argv[2];
if (!outputArg) throw new Error('Provide an output JSON path.');
const OUTPUT_PATH = path.resolve(outputArg);

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeEmail = (value) => normalize(value);
const normalizeLinkedIn = (value) => normalize(value)
  .replace(/^https?:\/\/(www\.)?linkedin\.com\//, '')
  .replace(/[?#].*$/, '')
  .replace(/\/+$/, '');
const hash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const closeEnough = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) <= 0.01;

function add(map, key, item) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(item);
}

function collisionBreakdown(map, activeIds) {
  const groups = [...map.values()].filter((rows) => new Set(rows.map((row) => row.id)).size > 1);
  const affectedAll = new Set();
  const affectedActive = new Set();
  let groupsAcrossCompanies = 0;
  let groupsWithinCompany = 0;
  let activeGroups = 0;
  for (const rows of groups) {
    const ids = new Set(rows.map((row) => row.id));
    const companies = new Set(rows.map((row) => row.companyId).filter(Boolean));
    if (companies.size > 1) groupsAcrossCompanies += 1;
    else groupsWithinCompany += 1;
    let hasMultipleActive = 0;
    for (const id of ids) {
      affectedAll.add(id);
      if (activeIds.has(id)) {
        affectedActive.add(id);
        hasMultipleActive += 1;
      }
    }
    if (hasMultipleActive > 1) activeGroups += 1;
  }
  return {
    duplicateGroups: groups.length,
    activeDuplicateGroups: activeGroups,
    affectedLeadDocuments: affectedAll.size,
    affectedActiveLeadDocuments: affectedActive.size,
    groupsWithinOneCompany: groupsWithinCompany,
    groupsAcrossCompanies,
    largestGroupSize: groups.length ? Math.max(...groups.map((rows) => new Set(rows.map((row) => row.id)).size)) : 0,
  };
}

async function auditLeads(db) {
  const emails = new Map();
  const linkedIn = new Map();
  const activeIds = new Set();
  const result = {
    total: 0,
    active: 0,
    archived: 0,
    person: 0,
    genericInbox: 0,
    personWithBlankName: 0,
    genericInboxWithLinkedIn: 0,
    missingCampaignReference: 0,
    missingCampaignFieldOrNull: 0,
    missingCompanyFieldOrNull: 0,
    endpointSourceCounts: {},
  };
  const campaigns = new Set((await db.collection('projectcampaigns').find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)));
  const companies = new Set((await db.collection('companies').find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)));
  for await (const doc of db.collection('leads').find({})) {
    result.total += 1;
    const id = String(doc._id);
    const active = !doc.deletedAt;
    if (active) { result.active += 1; activeIds.add(id); } else result.archived += 1;
    if (doc.contactKind === 'genericInbox') {
      result.genericInbox += 1;
      if (normalizeLinkedIn(doc.linkedinUrl)) result.genericInboxWithLinkedIn += 1;
    } else {
      result.person += 1;
      if (!normalize(doc.name)) result.personWithBlankName += 1;
    }
    if (!doc.campaignId) result.missingCampaignFieldOrNull += 1;
    else if (!campaigns.has(String(doc.campaignId))) result.missingCampaignReference += 1;
    if (!doc.companyId || !companies.has(String(doc.companyId))) result.missingCompanyFieldOrNull += 1;

    const endpointFields = [
      ['email', doc.email],
      ['Apollo', doc.emailApollo],
      ['Hunter', doc.emailHunter],
      ['Lusha', doc.emailLusha],
      ['outreachEmail', doc.outreachEmail],
    ];
    if (doc.emailPersonal) {
      for (const value of String(doc.emailPersonal).split(/[;,]/)) endpointFields.push(['Personal', value]);
    }
    for (const confirmed of doc.confirmedEmails || []) endpointFields.push([`confirmed:${confirmed?.source || 'unknown'}`, confirmed?.email]);
    for (const [source, value] of endpointFields) {
      const key = normalizeEmail(value);
      if (!key) continue;
      result.endpointSourceCounts[source] = (result.endpointSourceCounts[source] || 0) + 1;
      add(emails, key, { id, companyId: String(doc.companyId || '') });
    }
    const linkedInKey = normalizeLinkedIn(doc.linkedinUrl);
    if (linkedInKey) add(linkedIn, linkedInKey, { id, companyId: String(doc.companyId || '') });
  }
  result.repeatedEmail = collisionBreakdown(emails, activeIds);
  result.repeatedLinkedIn = collisionBreakdown(linkedIn, activeIds);
  return result;
}

async function auditCompanies(db) {
  const normalizedNames = new Map();
  const activeIds = new Set();
  let blankName = 0;
  let blankDomain = 0;
  let nonEmptyBooth = 0;
  let nonEmptyGenericEmailArrays = 0;
  for await (const doc of db.collection('companies').find({})) {
    const id = String(doc._id);
    if (!doc.deletedAt) activeIds.add(id);
    if (!normalize(doc.companyName)) blankName += 1;
    if (!normalize(doc.domain)) blankDomain += 1;
    if (normalize(doc.boothNumber)) nonEmptyBooth += 1;
    if ((doc.genericEmails || []).some((value) => normalizeEmail(value))) nonEmptyGenericEmailArrays += 1;
    add(normalizedNames, normalize(doc.companyName), { id, companyId: id });
  }
  return {
    total: await db.collection('companies').countDocuments({}),
    blankName,
    blankDomain,
    organizationsWithLegacyBoothNumber: nonEmptyBooth,
    organizationsWithGenericEmail: nonEmptyGenericEmailArrays,
    repeatedExactNormalizedName: collisionBreakdown(normalizedNames, activeIds),
  };
}

async function auditMessages(db) {
  const emails = new Map();
  const replies = new Map();
  const threadItems = new Map();
  let inboundEmails = 0;
  let replyReviewed = 0;
  let replyWithOutcome = 0;
  let replyWithoutReviewObject = 0;

  for await (const doc of db.collection('emails').find({})) {
    const key = String(doc.messageId || '').trim();
    if (doc.direction === 'inbound') inboundEmails += 1;
    if (key) emails.set(key, {
      direction: doc.direction,
      subjectHash: hash(doc.subject),
      textHash: hash(doc.body),
      htmlHash: hash(doc.htmlBody),
      occurredAt: (doc.receivedAt || doc.sentAt || doc.createdAt)?.toISOString?.() || null,
    });
  }
  for await (const doc of db.collection('replies').find({})) {
    const key = String(doc.messageId || '').trim();
    if (doc.humanReview?.status === 'Reviewed') replyReviewed += 1;
    if (doc.humanReview?.outcome) replyWithOutcome += 1;
    if (!doc.humanReview) replyWithoutReviewObject += 1;
    if (key) replies.set(key, {
      direction: 'inbound',
      subjectHash: hash(doc.subject),
      textHash: hash(doc.text),
      htmlHash: hash(doc.html),
      occurredAt: doc.receivedAt?.toISOString?.() || null,
    });
    for (const item of doc.threadHistory || []) {
      const threadKey = String(item?.messageId || '').trim();
      if (threadKey) threadItems.set(threadKey, {
        direction: item.type,
        subjectHash: hash(item.subject),
        textHash: hash(item.body),
        occurredAt: item.timestamp?.toISOString?.() || null,
      });
    }
  }

  const compare = (left, right) => {
    let overlaps = 0;
    let exactCoreMatch = 0;
    let directionConflict = 0;
    let subjectConflict = 0;
    let bodyConflict = 0;
    let timestampConflict = 0;
    for (const [key, a] of left) {
      const b = right.get(key);
      if (!b) continue;
      overlaps += 1;
      const subjectSame = a.subjectHash === b.subjectHash;
      const bodySame = a.textHash === b.textHash || a.htmlHash === b.htmlHash;
      const directionSame = a.direction === b.direction;
      const timestampSame = a.occurredAt === b.occurredAt;
      if (subjectSame && bodySame && directionSame && timestampSame) exactCoreMatch += 1;
      if (!directionSame) directionConflict += 1;
      if (!subjectSame) subjectConflict += 1;
      if (!bodySame) bodyConflict += 1;
      if (!timestampSame) timestampConflict += 1;
    }
    return { overlaps, exactCoreMatch, directionConflict, subjectConflict, bodyConflict, timestampConflict };
  };

  const replyIds = new Set(replies.keys());
  const emailIds = new Set(emails.keys());
  return {
    emailDocuments: emails.size,
    inboundEmailDocuments: inboundEmails,
    replyDocuments: replies.size,
    embeddedThreadMessagesWithId: threadItems.size,
    repliesWithoutEmailCounterpart: [...replyIds].filter((id) => !emailIds.has(id)).length,
    inboundEmailsWithoutReplyCounterpart: [...emailIds].filter((id) => emails.get(id)?.direction === 'inbound' && !replyIds.has(id)).length,
    replyReviewState: { replyReviewed, replyWithOutcome, replyWithoutReviewObject },
    emailVsReply: compare(emails, replies),
    emailVsThreadHistory: compare(emails, threadItems),
    replyVsThreadHistory: compare(replies, threadItems),
  };
}

async function auditJobs(db) {
  const organizationsByName = new Map();
  const organizationsByDomain = new Map();
  for await (const company of db.collection('companies').find({}, { projection: { companyName: 1, domain: 1 } })) {
    add(organizationsByName, normalize(company.companyName), String(company._id));
    add(organizationsByDomain, normalize(company.domain).replace(/^www\./, ''), String(company._id));
  }
  const organizationsByLeadEmail = new Map();
  for await (const lead of db.collection('leads').find({}, { projection: {
    companyId: 1, email: 1, emailApollo: 1, emailHunter: 1, emailLusha: 1,
    emailPersonal: 1, outreachEmail: 1, confirmedEmails: 1,
  } })) {
    const values = [lead.email, lead.emailApollo, lead.emailHunter, lead.emailLusha, lead.outreachEmail];
    if (lead.emailPersonal) values.push(...String(lead.emailPersonal).split(/[;,]/));
    for (const confirmed of lead.confirmedEmails || []) values.push(confirmed?.email);
    for (const value of values) add(organizationsByLeadEmail, normalizeEmail(value), String(lead.companyId || ''));
  }
  const jobNumbers = new Map();
  const typeValues = new Map();
  const statusValues = new Map();
  const result = {
    total: 0,
    archived: 0,
    withCompanyId: 0,
    withoutCompanyId: 0,
    textCompanyUniqueMatch: 0,
    textCompanyMultipleMatches: 0,
    textCompanyNoMatch: 0,
    blankCompanyText: 0,
    uniqueLeadEmailCompanyMatch: 0,
    multipleLeadEmailCompanyMatches: 0,
    uniqueEmailDomainCompanyMatch: 0,
    multipleEmailDomainCompanyMatches: 0,
    noAutomatedOrganizationEvidence: 0,
    withOpportunityId: 0,
    withoutOpportunityId: 0,
    blankServiceType: 0,
    duplicateJobNumberGroups: 0,
    financial: {
      amountTotal: 0,
      receivedTotal: 0,
      balanceTotal: 0,
      equationMismatch: 0,
      negativeAmount: 0,
      negativeReceived: 0,
      negativeBalance: 0,
      jobDoneCount: 0,
      jobDoneWithZeroBalance: 0,
      jobDoneWithPositiveBalance: 0,
      jobDoneWithNegativeBalance: 0,
      nonDoneWithZeroBalance: 0,
    },
  };
  for await (const doc of db.collection('jobs').find({})) {
    result.total += 1;
    if (doc.deletedAt) result.archived += 1;
    if (doc.companyId) result.withCompanyId += 1;
    else {
      result.withoutCompanyId += 1;
      const companyKey = normalize(doc.company);
      const matches = organizationsByName.get(companyKey) || [];
      if (!companyKey) result.blankCompanyText += 1;
      if (matches.length === 1) result.textCompanyUniqueMatch += 1;
      else if (matches.length > 1) result.textCompanyMultipleMatches += 1;
      else result.textCompanyNoMatch += 1;

      const jobEmail = normalizeEmail(doc.email);
      const emailCompanyIds = [...new Set(organizationsByLeadEmail.get(jobEmail) || [])].filter(Boolean);
      if (emailCompanyIds.length === 1) result.uniqueLeadEmailCompanyMatch += 1;
      else if (emailCompanyIds.length > 1) result.multipleLeadEmailCompanyMatches += 1;

      const emailDomain = jobEmail.includes('@') ? jobEmail.split('@').pop().replace(/^www\./, '') : '';
      const domainCompanyIds = [...new Set(organizationsByDomain.get(emailDomain) || [])].filter(Boolean);
      if (domainCompanyIds.length === 1) result.uniqueEmailDomainCompanyMatch += 1;
      else if (domainCompanyIds.length > 1) result.multipleEmailDomainCompanyMatches += 1;

      const evidenceIds = new Set([...matches, ...emailCompanyIds, ...domainCompanyIds]);
      if (!evidenceIds.size) result.noAutomatedOrganizationEvidence += 1;
    }
    if (doc.opportunityId) result.withOpportunityId += 1;
    else result.withoutOpportunityId += 1;
    const service = String(doc.typeOfJob || '').trim();
    if (!service) result.blankServiceType += 1;
    typeValues.set(service, (typeValues.get(service) || 0) + 1);
    const status = String(doc.currentStatus || '').trim();
    statusValues.set(status, (statusValues.get(status) || 0) + 1);
    add(jobNumbers, String(doc.jobNo ?? ''), String(doc._id));

    const amount = Number(doc.amount || 0);
    const received = Number(doc.received || 0);
    const balance = Number(doc.balance || 0);
    result.financial.amountTotal += amount;
    result.financial.receivedTotal += received;
    result.financial.balanceTotal += balance;
    if (!closeEnough(amount, received + balance)) result.financial.equationMismatch += 1;
    if (amount < 0) result.financial.negativeAmount += 1;
    if (received < 0) result.financial.negativeReceived += 1;
    if (balance < 0) result.financial.negativeBalance += 1;
    if (status === 'Job Done') {
      result.financial.jobDoneCount += 1;
      if (closeEnough(balance, 0)) result.financial.jobDoneWithZeroBalance += 1;
      else if (balance > 0) result.financial.jobDoneWithPositiveBalance += 1;
      else result.financial.jobDoneWithNegativeBalance += 1;
    } else if (closeEnough(balance, 0)) result.financial.nonDoneWithZeroBalance += 1;
  }
  result.duplicateJobNumberGroups = [...jobNumbers.entries()].filter(([key, rows]) => key && rows.length > 1).length;
  result.statusValues = Object.fromEntries([...statusValues.entries()].sort((a, b) => b[1] - a[1]));
  result.serviceTypeValues = Object.fromEntries([...typeValues.entries()].sort((a, b) => b[1] - a[1]));
  for (const key of ['amountTotal', 'receivedTotal', 'balanceTotal']) result.financial[key] = Number(result.financial[key].toFixed(2));
  return result;
}

async function auditOpportunities(db) {
  const result = {
    total: 0,
    archived: 0,
    withoutCampaign: 0,
    withoutPrimaryLead: 0,
    withStakeholders: 0,
    emptyServices: 0,
    serviceValues: {},
    stageValues: {},
    totalValueAed: 0,
  };
  for await (const doc of db.collection('opportunities').find({})) {
    result.total += 1;
    if (doc.deletedAt) result.archived += 1;
    if (!doc.campaignId) result.withoutCampaign += 1;
    if (!doc.primaryLeadId) result.withoutPrimaryLead += 1;
    if ((doc.stakeholderLeadIds || []).length) result.withStakeholders += 1;
    if (!(doc.services || []).filter((value) => String(value || '').trim()).length) result.emptyServices += 1;
    for (const service of doc.services || []) {
      const key = String(service || '').trim();
      result.serviceValues[key] = (result.serviceValues[key] || 0) + 1;
    }
    const stage = String(doc.stage || '').trim();
    result.stageValues[stage] = (result.stageValues[stage] || 0) + 1;
    result.totalValueAed += Number(doc.valueAed || 0);
  }
  result.totalValueAed = Number(result.totalValueAed.toFixed(2));
  return result;
}

async function auditTasks(db) {
  const usersByLabel = new Map();
  for await (const user of db.collection('users').find({}, { projection: { displayName: 1, email: 1 } })) {
    add(usersByLabel, normalize(user.displayName), String(user._id));
    add(usersByLabel, normalize(user.email), String(user._id));
  }
  const result = {
    total: 0,
    archived: 0,
    noOwnerUserId: 0,
    missingOwnerUserWithUniqueTextMatch: 0,
    missingOwnerUserWithNoTextMatch: 0,
    missingOwnerUserWithMultipleTextMatches: 0,
    noDueDate: 0,
    noTypedContext: 0,
    multipleTypedContexts: 0,
    replyReviewTasks: 0,
    replyReviewWithoutReply: 0,
    statusValues: {},
    taskTypeValues: {},
    missingTaskTypeContextBreakdown: {},
  };
  for await (const doc of db.collection('tasks').find({})) {
    result.total += 1;
    if (doc.deletedAt) result.archived += 1;
    if (!doc.ownerUserId) {
      result.noOwnerUserId += 1;
      const matches = [...new Set(usersByLabel.get(normalize(doc.owner)) || [])];
      if (matches.length === 1) result.missingOwnerUserWithUniqueTextMatch += 1;
      else if (matches.length > 1) result.missingOwnerUserWithMultipleTextMatches += 1;
      else result.missingOwnerUserWithNoTextMatch += 1;
    }
    if (!doc.dueAt) result.noDueDate += 1;
    const contexts = [doc.campaignId, doc.companyId, doc.leadId, doc.opportunityId, doc.replyId, doc.interactionId].filter(Boolean).length;
    if (!contexts) result.noTypedContext += 1;
    if (contexts > 1) result.multipleTypedContexts += 1;
    if (doc.taskType === 'reply_review') {
      result.replyReviewTasks += 1;
      if (!doc.replyId) result.replyReviewWithoutReply += 1;
    }
    const status = String(doc.status || '').trim();
    const type = String(doc.taskType || '').trim();
    result.statusValues[status] = (result.statusValues[status] || 0) + 1;
    result.taskTypeValues[type || '(missing)'] = (result.taskTypeValues[type || '(missing)'] || 0) + 1;
    if (!type) {
      const signature = [
        doc.replyId ? 'reply' : null,
        doc.opportunityId ? 'ongoingJob' : null,
        doc.leadId ? 'lead' : null,
        doc.campaignId ? 'campaign' : null,
        doc.companyId ? 'company' : null,
      ].filter(Boolean).join('+') || 'noContext';
      result.missingTaskTypeContextBreakdown[signature] = (result.missingTaskTypeContextBreakdown[signature] || 0) + 1;
    }
  }
  return result;
}

async function auditCampaignCounters(db) {
  const rows = [];
  for await (const campaign of db.collection('projectcampaigns').find({})) {
    const leads = await db.collection('leads').find({ campaignId: campaign._id }, { projection: { companyId: 1, repliedAt: 1, deliveryStatus: 1 } }).toArray();
    const distinctCompanies = new Set(leads.map((lead) => String(lead.companyId || '')).filter(Boolean)).size;
    const associatedCompanies = await db.collection('companies').countDocuments({ projectsAssociated: campaign._id });
    const respondedLeads = leads.filter((lead) => lead.repliedAt || lead.deliveryStatus === 'Replied');
    const respondedCompanies = new Set(respondedLeads.map((lead) => String(lead.companyId || '')).filter(Boolean)).size;
    rows.push({
      campaignId: String(campaign._id),
      archived: Boolean(campaign.deletedAt),
      storedTargetCompanies: Number(campaign.targetCompaniesCount || 0),
      actualDistinctLeadCompanies: distinctCompanies,
      actualAssociatedCompanies: associatedCompanies,
      targetVsLeadCompanyDifference: Number(campaign.targetCompaniesCount || 0) - distinctCompanies,
      targetVsAssociatedCompanyDifference: Number(campaign.targetCompaniesCount || 0) - associatedCompanies,
      storedCompaniesResponded: Number(campaign.companiesRespondedCount || 0),
      actualRespondedLeadCount: respondedLeads.length,
      actualRespondedCompanyCount: respondedCompanies,
      responseDifference: Number(campaign.companiesRespondedCount || 0) - respondedCompanies,
    });
  }
  return {
    campaignCount: rows.length,
    targetVsLeadCounterMismatchCampaigns: rows.filter((r) => r.targetVsLeadCompanyDifference !== 0).length,
    targetVsAssociationCounterMismatchCampaigns: rows.filter((r) => r.targetVsAssociatedCompanyDifference !== 0).length,
    responseCounterMismatchCampaigns: rows.filter((r) => r.responseDifference !== 0).length,
    rows,
  };
}

async function auditSequenceOrphans(db) {
  const leadIds = new Set((await db.collection('leads').find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)));
  const orphanEnrollmentIds = new Set();
  const orphanLeadIds = new Set();
  for await (const enrollment of db.collection('sequenceenrollments').find({}, { projection: { leadId: 1 } })) {
    if (!leadIds.has(String(enrollment.leadId))) {
      orphanEnrollmentIds.add(String(enrollment._id));
      orphanLeadIds.add(String(enrollment.leadId));
    }
  }
  let sendJobsOnOrphanEnrollments = 0;
  let sentSendJobsOnOrphanEnrollments = 0;
  for await (const sendJob of db.collection('sendjobs').find({}, { projection: { enrollmentId: 1, status: 1 } })) {
    if (orphanEnrollmentIds.has(String(sendJob.enrollmentId))) {
      sendJobsOnOrphanEnrollments += 1;
      if (sendJob.status === 'sent') sentSendJobsOnOrphanEnrollments += 1;
    }
  }
  return {
    orphanEnrollmentDocuments: orphanEnrollmentIds.size,
    distinctMissingLeadIds: orphanLeadIds.size,
    sendJobsOnOrphanEnrollments,
    sentSendJobsOnOrphanEnrollments,
  };
}

async function auditOutreachConsistency(db) {
  const associationPairs = new Set();
  for await (const company of db.collection('companies').find({}, { projection: { projectsAssociated: 1 } })) {
    for (const campaignId of company.projectsAssociated || []) {
      associationPairs.add(`${campaignId}|${company._id}`);
    }
  }

  const leadPairs = new Set();
  const embeddedEnrollmentPairs = new Set();
  for await (const lead of db.collection('leads').find({}, { projection: { campaignId: 1, companyId: 1, enrollments: 1 } })) {
    if (lead.campaignId && lead.companyId) leadPairs.add(`${lead.campaignId}|${lead.companyId}`);
    for (const enrollment of lead.enrollments || []) {
      if (enrollment?.campaignId) embeddedEnrollmentPairs.add(`${lead._id}|${enrollment.campaignId}`);
    }
  }

  const separateEnrollmentPairs = new Set();
  const enrollmentById = new Map();
  for await (const enrollment of db.collection('sequenceenrollments').find({}, { projection: { leadId: 1, campaignId: 1 } })) {
    separateEnrollmentPairs.add(`${enrollment.leadId}|${enrollment.campaignId}`);
    enrollmentById.set(String(enrollment._id), enrollment);
  }

  const emailByResendId = new Map();
  const emailByMessageId = new Map();
  for await (const email of db.collection('emails').find({}, { projection: { resendEmailId: 1, messageId: 1, subject: 1, body: 1 } })) {
    if (email.resendEmailId) emailByResendId.set(String(email.resendEmailId), email);
    if (email.messageId) emailByMessageId.set(String(email.messageId), email);
  }

  let sendJobEnrollmentLeadMismatch = 0;
  let sendJobMatchedEmailByProviderId = 0;
  let sendJobMatchedEmailByMessageId = 0;
  let sendJobWithoutEmailMatch = 0;
  let sendJobExactRenderedContentMatch = 0;
  for await (const sendJob of db.collection('sendjobs').find({})) {
    const enrollment = enrollmentById.get(String(sendJob.enrollmentId));
    if (enrollment && String(enrollment.leadId) !== String(sendJob.leadId)) sendJobEnrollmentLeadMismatch += 1;
    const providerId = String(sendJob.providerMessageId || '');
    const byProvider = emailByResendId.get(providerId);
    const byMessage = emailByMessageId.get(providerId);
    const email = byProvider || byMessage;
    if (byProvider) sendJobMatchedEmailByProviderId += 1;
    else if (byMessage) sendJobMatchedEmailByMessageId += 1;
    else sendJobWithoutEmailMatch += 1;
    if (email && hash(sendJob.renderedSubject) === hash(email.subject) && hash(sendJob.renderedBody) === hash(email.body)) {
      sendJobExactRenderedContentMatch += 1;
    }
  }

  const intersectionSize = (a, b) => [...a].filter((key) => b.has(key)).length;
  const onlySize = (a, b) => [...a].filter((key) => !b.has(key)).length;
  return {
    campaignOrganizationPairs: {
      fromCompanyProjectsAssociated: associationPairs.size,
      fromLeadCampaignContext: leadPairs.size,
      inBoth: intersectionSize(associationPairs, leadPairs),
      associationOnly: onlySize(associationPairs, leadPairs),
      leadContextOnly: onlySize(leadPairs, associationPairs),
      requiredLosslessUnion: new Set([...associationPairs, ...leadPairs]).size,
    },
    enrollmentRepresentations: {
      embeddedLeadCampaignPairs: embeddedEnrollmentPairs.size,
      separateEnrollmentLeadCampaignPairs: separateEnrollmentPairs.size,
      inBoth: intersectionSize(embeddedEnrollmentPairs, separateEnrollmentPairs),
      embeddedOnly: onlySize(embeddedEnrollmentPairs, separateEnrollmentPairs),
      separateOnly: onlySize(separateEnrollmentPairs, embeddedEnrollmentPairs),
    },
    sendJobToEnrollment: {
      sendJobCount: await db.collection('sendjobs').countDocuments({}),
      leadIdMismatchAgainstEnrollment: sendJobEnrollmentLeadMismatch,
    },
    sendJobToEmail: {
      matchedByProviderToResendId: sendJobMatchedEmailByProviderId,
      matchedByProviderToMessageId: sendJobMatchedEmailByMessageId,
      withoutEmailMatch: sendJobWithoutEmailMatch,
      exactRenderedSubjectAndBodyMatch: sendJobExactRenderedContentMatch,
    },
  };
}

async function auditPipeline(db) {
  const configs = await db.collection('pipelineconfigs').find({}).toArray();
  return configs.map((config) => ({
    key: config.key,
    stages: (config.stages || []).map((stage) => ({ name: stage.name, probability: stage.probability })),
  }));
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set in server/.env');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  const required = ['companies', 'leads', 'emails', 'replies', 'jobs', 'opportunities', 'tasks', 'projectcampaigns', 'sequenceenrollments', 'sendjobs', 'pipelineconfigs'];
  const missing = required.filter((name) => !names.has(name));
  if (missing.length) throw new Error(`Required collections missing: ${missing.join(', ')}`);

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    privacy: 'Aggregate results only; raw PII, message bodies, password hashes, and credentials are not exported.',
    companies: await auditCompanies(db),
    leads: await auditLeads(db),
    messagesAndReviews: await auditMessages(db),
    jobs: await auditJobs(db),
    opportunities: await auditOpportunities(db),
    tasks: await auditTasks(db),
    campaignCounterReconciliation: await auditCampaignCounters(db),
    sequenceOrphans: await auditSequenceOrphans(db),
    outreachConsistency: await auditOutreachConsistency(db),
    pipelineConfiguration: await auditPipeline(db),
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  await mongoose.disconnect();
  console.log(`Read-only migration risk audit written to ${OUTPUT_PATH}`);
}

main().catch(async (error) => {
  console.error(`Audit failed: ${error.message}`);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
