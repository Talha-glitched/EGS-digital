/**
 * Comprehensive READ-ONLY MongoDB profiler for the EGS SQL migration.
 *
 * It never writes to MongoDB and does not export message bodies, credentials,
 * personal contact values, or other raw document payloads. The JSON output is
 * aggregate migration evidence: collection counts, shapes/types, indexes,
 * controlled-value distributions, reference integrity, and collision counts.
 *
 * Usage:
 *   node scripts/profileDatabaseForSqlMigration.js <output-json-path>
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config();

const outputArg = process.argv[2];
if (!outputArg) {
  throw new Error('Provide an output JSON path.');
}

const OUTPUT_PATH = path.resolve(outputArg);
const MAX_DEPTH = 10;
const DISTINCT_LIMIT = 250;

const CONTROLLED_VALUE_PATHS = [
  /(^|\.)(status|stage|state|outcome|type|kind|direction|priority|provider|source|primarySource)$/i,
  /(^|\.)(taskType|currentStatus|typeOfJob|serviceCategories|services|currency|reason)$/i,
  /(^|\.)(deliveryStatus|leadStage|milestone|channel|contactKind)$/i,
];

const SENSITIVE_PATH = /(^|\.)(body|html|text|notes?|summary|description|password|secret|token|email|phone|whatsapp|linkedin|name|address|attendees|userAgent|ip)(\.|$)/i;

function bsonType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (Buffer.isBuffer(value)) return 'binary';
  if (value?._bsontype === 'ObjectId') return 'objectId';
  if (value?._bsontype === 'Decimal128') return 'decimal128';
  if (value?._bsontype === 'Long') return 'long';
  if (value?._bsontype === 'Binary') return 'binary';
  return typeof value;
}

function shouldCollectValues(fieldPath) {
  return !SENSITIVE_PATH.test(fieldPath) && CONTROLLED_VALUE_PATHS.some((pattern) => pattern.test(fieldPath));
}

function getFieldStat(fieldMap, fieldPath) {
  if (!fieldMap.has(fieldPath)) {
    fieldMap.set(fieldPath, {
      documentsPresent: 0,
      occurrences: 0,
      types: {},
      nullCount: 0,
      emptyStringCount: 0,
      minStringLength: null,
      maxStringLength: null,
      minNumber: null,
      maxNumber: null,
      numericSum: 0,
      numericCount: 0,
      earliestDate: null,
      latestDate: null,
      minArrayLength: null,
      maxArrayLength: null,
      controlledValues: new Map(),
      controlledValuesTruncated: false,
    });
  }
  return fieldMap.get(fieldPath);
}

function collectValue(fieldMap, fieldPath, value, presentPaths, depth = 0) {
  if (!fieldPath || depth > MAX_DEPTH) return;
  const stat = getFieldStat(fieldMap, fieldPath);
  presentPaths.add(fieldPath);
  stat.occurrences += 1;
  const type = bsonType(value);
  stat.types[type] = (stat.types[type] || 0) + 1;

  if (value === null) {
    stat.nullCount += 1;
    return;
  }

  if (typeof value === 'string') {
    const length = value.length;
    stat.emptyStringCount += value.trim() === '' ? 1 : 0;
    stat.minStringLength = stat.minStringLength === null ? length : Math.min(stat.minStringLength, length);
    stat.maxStringLength = stat.maxStringLength === null ? length : Math.max(stat.maxStringLength, length);
    if (shouldCollectValues(fieldPath)) {
      if (stat.controlledValues.has(value)) {
        stat.controlledValues.set(value, stat.controlledValues.get(value) + 1);
      } else if (stat.controlledValues.size < DISTINCT_LIMIT) {
        stat.controlledValues.set(value, 1);
      } else {
        stat.controlledValuesTruncated = true;
      }
    }
    return;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    stat.minNumber = stat.minNumber === null ? value : Math.min(stat.minNumber, value);
    stat.maxNumber = stat.maxNumber === null ? value : Math.max(stat.maxNumber, value);
    stat.numericSum += value;
    stat.numericCount += 1;
    return;
  }

  if (value instanceof Date) {
    const iso = value.toISOString();
    stat.earliestDate = stat.earliestDate === null || iso < stat.earliestDate ? iso : stat.earliestDate;
    stat.latestDate = stat.latestDate === null || iso > stat.latestDate ? iso : stat.latestDate;
    return;
  }

  if (Array.isArray(value)) {
    stat.minArrayLength = stat.minArrayLength === null ? value.length : Math.min(stat.minArrayLength, value.length);
    stat.maxArrayLength = stat.maxArrayLength === null ? value.length : Math.max(stat.maxArrayLength, value.length);
    for (const item of value) {
      collectValue(fieldMap, `${fieldPath}[]`, item, presentPaths, depth + 1);
    }
    return;
  }

  if (type === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectValue(fieldMap, `${fieldPath}.${key}`, child, presentPaths, depth + 1);
    }
  }
}

function serialiseFieldStats(fieldMap, documentCount) {
  return Object.fromEntries(
    [...fieldMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fieldPath, stat]) => {
        const clean = { ...stat };
        clean.missingDocuments = Math.max(0, documentCount - stat.documentsPresent);
        clean.presencePercent = documentCount ? Number(((stat.documentsPresent / documentCount) * 100).toFixed(2)) : 0;
        clean.controlledValues = Object.fromEntries(
          [...stat.controlledValues.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
        );
        if (!clean.numericCount) {
          delete clean.numericSum;
          delete clean.numericCount;
        }
        return [fieldPath, clean];
      })
  );
}

async function profileCollection(db, collectionName) {
  const collection = db.collection(collectionName);
  const fieldMap = new Map();
  let documentCount = 0;
  let archivedCount = 0;
  let deletedCount = 0;

  const cursor = collection.find({}, { batchSize: 500 });
  for await (const doc of cursor) {
    documentCount += 1;
    const presentPaths = new Set();
    for (const [key, value] of Object.entries(doc)) {
      collectValue(fieldMap, key, value, presentPaths, 0);
    }
    for (const fieldPath of presentPaths) {
      getFieldStat(fieldMap, fieldPath).documentsPresent += 1;
    }
    if (doc.archivedAt || doc.archived_at) archivedCount += 1;
    if (doc.deletedAt || doc.deleted_at) deletedCount += 1;
  }

  let stats = null;
  try {
    const raw = await db.command({ collStats: collectionName, scale: 1 });
    stats = {
      sizeBytes: raw.size,
      storageSizeBytes: raw.storageSize,
      totalIndexSizeBytes: raw.totalIndexSize,
      averageObjectSizeBytes: raw.avgObjSize,
    };
  } catch (error) {
    stats = { unavailable: true, reason: error.message };
  }

  let indexes = [];
  try {
    indexes = (await collection.indexes()).map((index) => ({
      name: index.name,
      key: index.key,
      unique: Boolean(index.unique),
      sparse: Boolean(index.sparse),
      partialFilterExpression: index.partialFilterExpression || null,
    }));
  } catch (error) {
    indexes = [{ unavailable: true, reason: error.message }];
  }

  return {
    documentCount,
    archivedCount,
    deletedCount,
    stats,
    indexes,
    fields: serialiseFieldStats(fieldMap, documentCount),
  };
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLinkedIn(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?linkedin\.com\//, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function addCandidate(map, key, id) {
  if (!key) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(String(id));
}

function summarizeCollisionMap(map) {
  const duplicateGroups = [...map.values()].filter((ids) => ids.size > 1);
  const affected = new Set();
  for (const ids of duplicateGroups) for (const id of ids) affected.add(id);
  return {
    distinctNormalizedValues: map.size,
    duplicateValueGroups: duplicateGroups.length,
    affectedSourceRecords: affected.size,
    largestGroupSize: duplicateGroups.length ? Math.max(...duplicateGroups.map((ids) => ids.size)) : 0,
  };
}

async function profileIdentityCollisions(db, names) {
  const result = {};
  if (names.has('companies')) {
    const domains = new Map();
    const namesMap = new Map();
    for await (const doc of db.collection('companies').find({}, { projection: { domain: 1, companyName: 1 } })) {
      addCandidate(domains, normalizeEmail(doc.domain), doc._id);
      addCandidate(namesMap, normalizeName(doc.companyName), doc._id);
    }
    result.organizations = {
      exactNormalizedDomain: summarizeCollisionMap(domains),
      exactNormalizedName: summarizeCollisionMap(namesMap),
      note: 'These are duplicate-review triggers, not automatic merge instructions.',
    };
  }

  if (names.has('leads')) {
    const emails = new Map();
    const linkedIn = new Map();
    let personLeads = 0;
    let genericInboxLeads = 0;
    let unknownKindLeads = 0;
    const projection = {
      contactKind: 1,
      email: 1,
      emailApollo: 1,
      emailHunter: 1,
      emailLusha: 1,
      emailPersonal: 1,
      outreachEmail: 1,
      confirmedEmails: 1,
      linkedinUrl: 1,
    };
    for await (const doc of db.collection('leads').find({}, { projection })) {
      if (doc.contactKind === 'person' || !doc.contactKind) personLeads += 1;
      else if (doc.contactKind === 'genericInbox') genericInboxLeads += 1;
      else unknownKindLeads += 1;
      const emailValues = [doc.email, doc.emailApollo, doc.emailHunter, doc.emailLusha, doc.outreachEmail];
      if (doc.emailPersonal) emailValues.push(...String(doc.emailPersonal).split(/[;,]/));
      for (const confirmed of doc.confirmedEmails || []) emailValues.push(confirmed?.email);
      for (const value of emailValues) addCandidate(emails, normalizeEmail(value), doc._id);
      addCandidate(linkedIn, normalizeLinkedIn(doc.linkedinUrl), doc._id);
    }
    result.peopleCandidates = {
      sourceLeadKinds: { personLeads, genericInboxLeads, unknownKindLeads },
      repeatedEmailAcrossLeadDocuments: summarizeCollisionMap(emails),
      repeatedLinkedInAcrossLeadDocuments: summarizeCollisionMap(linkedIn),
      note: 'Every repeated personal email or LinkedIn identifier requires human duplicate review; no merge is implied.',
    };
  }
  return result;
}

async function countOrphans(db, child, localField, parent, names) {
  if (!names.has(child) || !names.has(parent)) return null;
  const pipeline = [
    { $match: { [localField]: { $exists: true, $nin: [null, '', []] } } },
    { $lookup: { from: parent, localField, foreignField: '_id', as: '__matched' } },
    { $match: { '__matched.0': { $exists: false } } },
    { $count: 'count' },
  ];
  const [row] = await db.collection(child).aggregate(pipeline, { allowDiskUse: true }).toArray();
  return row?.count || 0;
}

async function profileReferences(db, names) {
  const mappings = [
    ['companies', 'projectsAssociated', 'projectcampaigns'],
    ['leads', 'companyId', 'companies'],
    ['leads', 'campaignId', 'projectcampaigns'],
    ['leads', 'pocQualification.referredLeadId', 'leads'],
    ['leads', 'enrollments.campaignId', 'projectcampaigns'],
    ['emails', 'leadId', 'leads'],
    ['emails', 'companyId', 'companies'],
    ['emails', 'campaignId', 'projectcampaigns'],
    ['replies', 'leadId', 'leads'],
    ['replies', 'campaignId', 'projectcampaigns'],
    ['contactinteractions', 'leadId', 'leads'],
    ['contactinteractions', 'relatedLeadIds', 'leads'],
    ['contactinteractions', 'companyId', 'companies'],
    ['contactinteractions', 'loggedByUserId', 'users'],
    ['contactinteractions', 'sourceTaskId', 'tasks'],
    ['tasks', 'ownerUserId', 'users'],
    ['tasks', 'campaignId', 'projectcampaigns'],
    ['tasks', 'companyId', 'companies'],
    ['tasks', 'leadId', 'leads'],
    ['tasks', 'opportunityId', 'opportunities'],
    ['tasks', 'replyId', 'replies'],
    ['tasks', 'interactionId', 'contactinteractions'],
    ['opportunities', 'companyId', 'companies'],
    ['opportunities', 'primaryLeadId', 'leads'],
    ['opportunities', 'stakeholderLeadIds', 'leads'],
    ['opportunities', 'campaignId', 'projectcampaigns'],
    ['opportunities', 'ownerUserId', 'users'],
    ['opportunities', 'collaboratorUserIds', 'users'],
    ['jobs', 'companyId', 'companies'],
    ['jobs', 'opportunityId', 'opportunities'],
    ['sequences', 'campaignId', 'projectcampaigns'],
    ['sequenceenrollments', 'leadId', 'leads'],
    ['sequenceenrollments', 'campaignId', 'projectcampaigns'],
    ['sequenceenrollments', 'sequenceId', 'sequences'],
    ['sequenceenrollments', 'launchBatchId', 'sequencelaunches'],
    ['sendjobs', 'leadId', 'leads'],
    ['sendjobs', 'enrollmentId', 'sequenceenrollments'],
    ['revenueentries', 'campaignId', 'projectcampaigns'],
    ['revenueentries', 'companyId', 'companies'],
    ['revenueentries', 'leadId', 'leads'],
    ['suppressions', 'campaignId', 'projectcampaigns'],
    ['suppressions', 'leadId', 'leads'],
    ['auditlogs', 'userId', 'users'],
    ['recordrevisions', 'userId', 'users'],
    ['recordrevisions', 'rollbackOfRevisionId', 'recordrevisions'],
  ];

  const rows = [];
  for (const [child, field, parent] of mappings) {
    if (!names.has(child) || !names.has(parent)) continue;
    rows.push({ child, field, parent, orphanDocuments: await countOrphans(db, child, field, parent, names) });
  }
  return rows;
}

async function profileMessageOverlap(db, names) {
  const result = {};
  const emailIds = new Map();
  const replyIds = new Map();
  const threadIds = new Map();

  if (names.has('emails')) {
    for await (const doc of db.collection('emails').find({}, { projection: { messageId: 1 } })) {
      addCandidate(emailIds, String(doc.messageId || '').trim(), doc._id);
    }
  }
  if (names.has('replies')) {
    for await (const doc of db.collection('replies').find({}, { projection: { messageId: 1, 'threadHistory.messageId': 1 } })) {
      addCandidate(replyIds, String(doc.messageId || '').trim(), doc._id);
      for (const item of doc.threadHistory || []) addCandidate(threadIds, String(item?.messageId || '').trim(), doc._id);
    }
  }

  const intersection = (a, b) => [...a.keys()].filter((key) => b.has(key));
  result.emailCollection = summarizeCollisionMap(emailIds);
  result.replyCollection = summarizeCollisionMap(replyIds);
  result.embeddedThreadHistory = summarizeCollisionMap(threadIds);
  result.externalIdsInBothEmailAndReply = intersection(emailIds, replyIds).length;
  result.externalIdsInEmailAndThreadHistory = intersection(emailIds, threadIds).length;
  result.externalIdsInReplyAndThreadHistory = intersection(replyIds, threadIds).length;
  return result;
}

async function profileJobOverlap(db, names) {
  if (!names.has('jobs')) return {};
  const result = {
    totalLegacyJobs: await db.collection('jobs').countDocuments({}),
    withOpportunityId: await db.collection('jobs').countDocuments({ opportunityId: { $exists: true, $ne: null } }),
    withoutOpportunityId: await db.collection('jobs').countDocuments({ $or: [{ opportunityId: null }, { opportunityId: { $exists: false } }] }),
  };
  if (names.has('opportunities')) {
    result.orphanOpportunityId = await countOrphans(db, 'jobs', 'opportunityId', 'opportunities', names);
    const linked = await db.collection('jobs').aggregate([
      { $match: { opportunityId: { $exists: true, $ne: null } } },
      { $group: { _id: '$opportunityId', jobs: { $sum: 1 } } },
      { $group: {
        _id: null,
        distinctLinkedOpportunities: { $sum: 1 },
        opportunitiesWithMultipleJobRows: { $sum: { $cond: [{ $gt: ['$jobs', 1] }, 1, 0] } },
        maximumJobRowsPerOpportunity: { $max: '$jobs' },
      } },
    ]).toArray();
    Object.assign(result, linked[0] || {
      distinctLinkedOpportunities: 0,
      opportunitiesWithMultipleJobRows: 0,
      maximumJobRowsPerOpportunity: 0,
    });
    delete result._id;
  }
  return result;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set in server/.env');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  const collectionInfos = await db.listCollections({}, { nameOnly: true }).toArray();
  const collectionNames = collectionInfos.map((item) => item.name).sort();
  const nameSet = new Set(collectionNames);
  const buildInfo = await db.command({ buildInfo: 1 }).catch((error) => ({ version: 'unavailable', error: error.message }));

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    database: {
      name: db.databaseName,
      mongoVersion: buildInfo.version,
      collectionCount: collectionNames.length,
    },
    privacy: {
      rawDocumentsExported: false,
      credentialValuesExported: false,
      messageBodiesExported: false,
      personalContactValuesExported: false,
    },
    collections: {},
  };

  for (const name of collectionNames) {
    console.log(`Profiling ${name}...`);
    report.collections[name] = await profileCollection(db, name);
  }

  report.identityCollisionIndicators = await profileIdentityCollisions(db, nameSet);
  report.referenceIntegrity = await profileReferences(db, nameSet);
  report.messageOverlap = await profileMessageOverlap(db, nameSet);
  report.jobOverlap = await profileJobOverlap(db, nameSet);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  await mongoose.disconnect();
  console.log(`Read-only profile written to ${OUTPUT_PATH}`);
}

main().catch(async (error) => {
  console.error(`Profiler failed: ${error.message}`);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
