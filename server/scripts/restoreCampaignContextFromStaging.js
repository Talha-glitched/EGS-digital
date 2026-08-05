#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { unwrapBson } from '../src/utils/bsonUnwrap.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });
dotenv.config();

const apply = process.argv.includes('--apply');
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
if (!connectionString) throw new Error('PostgreSQL connection string is required.');

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 1,
  application_name: 'egs_campaign_context_repair',
});
const client = await pool.connect();

const oid = (value) => value == null ? null : String(unwrapBson(value));
const clean = (value) => String(value || '').trim();
const endpointType = (email) => email ? 'email' : 'phone';

try {
  await client.query('BEGIN');
  await client.query("SET LOCAL idle_in_transaction_session_timeout = '60s'");
  await client.query("SET LOCAL lock_timeout = '10s'");
  if (process.argv.includes('--schema')) {
    const ddl = await fs.readFile(path.join(scriptDir, '06_restore_campaign_context.sql'), 'utf8');
    await client.query(ddl.replace(/^BEGIN;\s*/i, '').replace(/\s*COMMIT;\s*$/i, ''));
  }

  const mapResult = await client.query(`
      SELECT source_collection, source_mongo_id, target_table, target_entity_id
      FROM migration_entity_map
      WHERE (source_collection = 'projectcampaigns' AND target_table = 'campaigns')
         OR (source_collection = 'companies' AND target_table = 'organizations')
         OR (source_collection = 'leads' AND target_table = 'people')
    `);
  const companyResult = await client.query(`SELECT mongo_id, payload FROM migration_source_document WHERE collection_name = 'companies'`);
  const leadResult = await client.query(`SELECT mongo_id, payload FROM migration_source_document WHERE collection_name = 'leads'`);
  const enrollmentResult = await client.query(`SELECT mongo_id, payload FROM migration_source_document WHERE collection_name = 'sequenceenrollments'`);

  const campaignIds = new Map();
  const organizationIds = new Map();
  const personIds = new Map();
  for (const row of mapResult.rows) {
    if (row.target_table === 'campaigns') campaignIds.set(String(row.source_mongo_id), row.target_entity_id);
    else if (row.target_table === 'organizations') organizationIds.set(String(row.source_mongo_id), row.target_entity_id);
    else if (row.target_table === 'people') personIds.set(String(row.source_mongo_id), row.target_entity_id);
  }

  const roleRows = (await client.query(`SELECT id, person_id, organization_id FROM person_organization_roles`)).rows;
  const roleByPersonOrganization = new Map(roleRows.map((row) => [`${row.person_id}|${row.organization_id}`, row.id]));

  const accountEvidence = new Map();
  const ensureAccountEvidence = (campaignMongoId, companyMongoId, source) => {
    const campaignId = campaignIds.get(campaignMongoId);
    const organizationId = organizationIds.get(companyMongoId);
    if (!campaignId || !organizationId) return false;
    const key = `${campaignMongoId}|${companyMongoId}`;
    const evidence = accountEvidence.get(key) || {
      campaignMongoId, companyMongoId, campaignId, organizationId,
      companyAssociation: false, leadContext: false, sequenceEnrollment: false,
    };
    evidence[source] = true;
    accountEvidence.set(key, evidence);
    return true;
  };

  for (const row of companyResult.rows) {
    const company = unwrapBson(row.payload || {});
    for (const campaignValue of company.projectsAssociated || []) {
      ensureAccountEvidence(oid(campaignValue), String(row.mongo_id), 'companyAssociation');
    }
  }

  const leadContexts = [];
  const leadContextKeys = new Set();
  const leadByMongoId = new Map();
  const peopleToArchive = [];
  let genericInboxCount = 0;
  let archivedSourceLeads = 0;
  for (const row of leadResult.rows) {
    const lead = unwrapBson(row.payload || {});
    const leadMongoId = String(row.mongo_id);
    const companyMongoId = oid(lead.companyId);
    leadByMongoId.set(leadMongoId, { lead, companyMongoId });
    const primaryCampaignId = oid(lead.campaignId);
    const contextByCampaign = new Map();
    if (primaryCampaignId) contextByCampaign.set(primaryCampaignId, null);
    for (const enrollment of lead.enrollments || []) {
      const campaignMongoId = oid(enrollment.campaignId);
      if (campaignMongoId) contextByCampaign.set(campaignMongoId, enrollment);
    }
    for (const [campaignMongoId, enrollment] of contextByCampaign) {
      ensureAccountEvidence(campaignMongoId, companyMongoId, 'leadContext');
      leadContexts.push({ leadMongoId, companyMongoId, campaignMongoId, lead, enrollment });
      leadContextKeys.add(`${leadMongoId}|${campaignMongoId}`);
    }

    const personId = personIds.get(leadMongoId);
    if (lead.deletedAt) archivedSourceLeads += 1;
    if (personId && (lead.deletedAt || lead.contactKind === 'genericInbox')) {
      const archivedAt = lead.deletedAt || lead.updatedAt || lead.createdAt || new Date().toISOString();
      peopleToArchive.push([personId, archivedAt]);
    }
    if (lead.contactKind === 'genericInbox') genericInboxCount += 1;
  }

  let standaloneEnrollmentContextsAdded = 0;
  for (const row of enrollmentResult.rows) {
    const enrollment = unwrapBson(row.payload || {});
    const leadMongoId = oid(enrollment.leadId);
    const campaignMongoId = oid(enrollment.campaignId);
    const sourceLead = leadByMongoId.get(leadMongoId);
    if (!sourceLead || !campaignMongoId || leadContextKeys.has(`${leadMongoId}|${campaignMongoId}`)) continue;
    ensureAccountEvidence(campaignMongoId, sourceLead.companyMongoId, 'sequenceEnrollment');
    leadContexts.push({
      leadMongoId,
      companyMongoId: sourceLead.companyMongoId,
      campaignMongoId,
      lead: sourceLead.lead,
      enrollment,
    });
    leadContextKeys.add(`${leadMongoId}|${campaignMongoId}`);
    standaloneEnrollmentContextsAdded += 1;
  }

  for (let offset = 0; offset < peopleToArchive.length; offset += 500) {
    const chunk = peopleToArchive.slice(offset, offset + 500);
    const params = chunk.flat();
    const values = chunk.map((_, index) => `($${index * 2 + 1}::uuid, $${index * 2 + 2}::timestamptz)`).join(',');
    await client.query(`
      UPDATE people p SET archived_at = COALESCE(p.archived_at, source.archived_at)
      FROM (VALUES ${values}) AS source(id, archived_at)
      WHERE p.id = source.id
    `, params);
  }

  const accountRows = [...accountEvidence.values()].map((evidence) => [
    evidence.campaignId,
    evidence.organizationId,
    JSON.stringify({
      companyAssociation: evidence.companyAssociation,
      leadContext: evidence.leadContext,
      sequenceEnrollment: evidence.sequenceEnrollment,
      campaignMongoId: evidence.campaignMongoId,
      companyMongoId: evidence.companyMongoId,
    }),
  ]);
  for (let offset = 0; offset < accountRows.length; offset += 500) {
    const chunk = accountRows.slice(offset, offset + 500);
    const params = chunk.flat();
    const values = chunk.map((_, index) => {
      const base = index * 3;
      return `($${base + 1}::uuid, $${base + 2}::uuid, 'identified', $${base + 3}::jsonb)`;
    }).join(',');
    await client.query(`
      INSERT INTO campaign_accounts (campaign_id, organization_id, pursuit_state, provenance)
      VALUES ${values}
      ON CONFLICT (campaign_id, organization_id)
      DO UPDATE SET provenance = EXCLUDED.provenance
    `, params);
  }

  const accountIdByContext = new Map();
  const persistedAccounts = await client.query(`SELECT id, campaign_id, organization_id FROM campaign_accounts`);
  const accountIdBySqlPair = new Map(persistedAccounts.rows.map((row) => [`${row.campaign_id}|${row.organization_id}`, row.id]));
  for (const evidence of accountEvidence.values()) {
    accountIdByContext.set(
      `${evidence.campaignMongoId}|${evidence.companyMongoId}`,
      accountIdBySqlPair.get(`${evidence.campaignId}|${evidence.organizationId}`),
    );
  }

  const endpointRowsByKey = new Map();
  for (const context of leadContexts) {
    if (context.lead.contactKind !== 'genericInbox') continue;
    const organizationId = organizationIds.get(context.companyMongoId);
    const email = clean(context.lead.email).toLowerCase();
    const phone = clean(context.lead.phone);
    const value = email || phone;
    if (!organizationId || !value) continue;
    const type = endpointType(email);
    const normalizedValue = value.toLowerCase();
    endpointRowsByKey.set(`${organizationId}|${type}|${normalizedValue}`, [
      organizationId, type, value, normalizedValue,
      JSON.stringify({ sourceLeadMongoId: context.leadMongoId }),
    ]);
  }
  const endpointRows = [...endpointRowsByKey.values()];
  for (let offset = 0; offset < endpointRows.length; offset += 500) {
    const chunk = endpointRows.slice(offset, offset + 500);
    const params = chunk.flat();
    const values = chunk.map((_, index) => {
      const base = index * 5;
      return `($${base + 1}::uuid, $${base + 2}, $${base + 3}, $${base + 4}, 'valid', 'Legacy Lead genericInbox', $${base + 5}::jsonb)`;
    }).join(',');
    await client.query(`
      INSERT INTO organization_contact_methods (
        organization_id, type, original_value, normalized_value, validity, source, payload
      ) VALUES ${values}
      ON CONFLICT (organization_id, type, normalized_value)
      DO UPDATE SET payload = COALESCE(organization_contact_methods.payload, EXCLUDED.payload)
    `, params);
  }
  const persistedEndpoints = await client.query(`SELECT id, organization_id, type, normalized_value FROM organization_contact_methods`);
  const endpointIdByKey = new Map(persistedEndpoints.rows.map((row) => [
    `${row.organization_id}|${row.type}|${row.normalized_value}`,
    row.id,
  ]));

  let personContacts = 0;
  let organizationEndpointContacts = 0;
  let unresolvedContacts = 0;
  const campaignContactRows = [];
  for (const context of leadContexts) {
    const campaignAccountId = accountIdByContext.get(`${context.campaignMongoId}|${context.companyMongoId}`);
    const organizationId = organizationIds.get(context.companyMongoId);
    const personId = personIds.get(context.leadMongoId);
    if (!campaignAccountId || !organizationId) {
      unresolvedContacts += 1;
      continue;
    }

    let roleId = null;
    let organizationContactMethodId = null;
    if (context.lead.contactKind === 'genericInbox') {
      const email = clean(context.lead.email).toLowerCase();
      const phone = clean(context.lead.phone);
      const value = email || phone;
      if (value) {
        organizationContactMethodId = endpointIdByKey.get(`${organizationId}|${endpointType(email)}|${value.toLowerCase()}`) || null;
        if (organizationContactMethodId) organizationEndpointContacts += 1;
      }
    } else {
      roleId = roleByPersonOrganization.get(`${personId}|${organizationId}`) || null;
      if (roleId) personContacts += 1;
    }

    if (!roleId && !organizationContactMethodId) {
      unresolvedContacts += 1;
      continue;
    }

    const contextual = context.enrollment || {};
    const deliveryState = contextual.deliveryStatus || context.lead.deliveryStatus || 'Pending Inqueue';
    const outcome = contextual.outcome || context.lead.outcome || 'Pending';
    campaignContactRows.push([
      campaignAccountId,
      roleId,
      organizationContactMethodId,
      deliveryState,
      deliveryState === 'Replied' ? 'responded' : 'pending',
      outcome,
      context.leadMongoId,
      context.campaignMongoId,
      JSON.stringify({ enrollment: contextual, sourceContactKind: context.lead.contactKind || 'person' }),
    ]);
  }

  for (let offset = 0; offset < campaignContactRows.length; offset += 300) {
    const chunk = campaignContactRows.slice(offset, offset + 300);
    const params = chunk.flat();
    const values = chunk.map((_, index) => {
      const base = index * 9;
      return `($${base + 1}::uuid, $${base + 2}::uuid, $${base + 3}::uuid, $${base + 4}, $${base + 5}, $${base + 4}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}::jsonb)`;
    }).join(',');
    await client.query(`
      INSERT INTO campaign_contacts (
        campaign_account_id, role_id, organization_contact_method_id,
        lead_state, outreach_focus_state, delivery_state, outcome,
        source_lead_mongo_id, source_campaign_mongo_id, payload
      ) VALUES ${values}
      ON CONFLICT (source_lead_mongo_id, source_campaign_mongo_id)
        WHERE source_lead_mongo_id IS NOT NULL AND source_campaign_mongo_id IS NOT NULL
      DO UPDATE SET
        campaign_account_id = EXCLUDED.campaign_account_id,
        role_id = EXCLUDED.role_id,
        organization_contact_method_id = EXCLUDED.organization_contact_method_id,
        lead_state = EXCLUDED.lead_state,
        outreach_focus_state = EXCLUDED.outreach_focus_state,
        delivery_state = EXCLUDED.delivery_state,
        outcome = EXCLUDED.outcome,
        payload = EXCLUDED.payload
    `, params);
  }

  await client.query(`
    INSERT INTO migration_entity_map (
      source_collection, source_mongo_id, source_path, target_table,
      target_entity_id, mapping_kind, confidence, rule_version
    )
    SELECT
      'leads', cc.source_lead_mongo_id, 'campaign:' || cc.source_campaign_mongo_id,
      'campaign_contacts', cc.id, 'split', 1.00, 'campaign-context-v1'
    FROM campaign_contacts cc
    WHERE cc.source_lead_mongo_id IS NOT NULL
      AND cc.source_campaign_mongo_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM migration_entity_map mem
        WHERE mem.source_collection = 'leads'
          AND mem.source_mongo_id = cc.source_lead_mongo_id
          AND mem.source_path = 'campaign:' || cc.source_campaign_mongo_id
          AND mem.target_table = 'campaign_contacts'
      )
  `);

  await client.query(`
    UPDATE campaigns c SET lifecycle = 'archived'
    FROM migration_entity_map mem
    JOIN migration_source_document msd
      ON msd.collection_name = 'projectcampaigns' AND msd.mongo_id = mem.source_mongo_id
    WHERE mem.target_table = 'campaigns' AND mem.target_entity_id = c.id
      AND (msd.payload->'deletedAt') IS NOT NULL
      AND (msd.payload->'deletedAt')::text <> 'null'
  `);

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    campaignsMapped: campaignIds.size,
    organizationsMapped: organizationIds.size,
    peopleMapped: personIds.size,
    campaignAccounts: accountEvidence.size,
    leadCampaignContexts: leadContexts.length,
    personContacts,
    organizationEndpointContacts,
    unresolvedContacts,
    genericInboxSources: genericInboxCount,
    archivedSourceLeads,
    standaloneEnrollmentContextsAdded,
  };
  if (apply) await client.query('COMMIT');
  else await client.query('ROLLBACK');
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  throw error;
} finally {
  client.release();
  await pool.end();
}
