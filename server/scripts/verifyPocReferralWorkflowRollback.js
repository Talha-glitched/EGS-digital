import db from '../src/db/index.js';
import { getLeadById, listAllLeads } from '../src/services/projectService.js';

const requiredColumns = {
  poc_suitabilities: ['legacy_status', 'assessed_by', 'referral', 'referred_person_id', 'source_payload'],
  key_relationship_profiles: ['manually_confirmed', 'confirmed_at', 'owner_name', 'service_categories', 'next_follow_up_at', 'reminder_notes'],
};

const client = await db.getClient();
try {
  const schema = await client.query(
    `SELECT table_name,column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=ANY($1::text[])`,
    [Object.keys(requiredColumns)],
  );
  const present = new Set(schema.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const missing = Object.entries(requiredColumns).flatMap(([table, columns]) =>
    columns.filter((column) => !present.has(`${table}.${column}`)).map((column) => `${table}.${column}`),
  );
  if (missing.length) throw new Error(`Missing workflow columns: ${missing.join(', ')}`);

  await client.query('BEGIN');
  const context = await client.query(
    `SELECT ca.organization_id,ca.campaign_id FROM campaign_accounts ca
     JOIN organizations o ON o.id=ca.organization_id AND o.archived_at IS NULL LIMIT 1`,
  );
  if (!context.rows.length) throw new Error('No campaign account is available for rollback verification.');
  const { organization_id: organizationId, campaign_id: campaignId } = context.rows[0];
  const person = await client.query(
    `INSERT INTO people(display_name,identity_notes) VALUES('Rollback POC verification','Will be rolled back') RETURNING id`,
  );
  await client.query(
    `INSERT INTO person_contact_methods(person_id,type,original_value,normalized_value,preferred,source)
     VALUES($1::uuid,'email','rollback-poc-verification@example.invalid','rollback-poc-verification@example.invalid',TRUE,'Verification')`,
    [person.rows[0].id],
  );
  const role = await client.query(
    `INSERT INTO person_organization_roles(person_id,organization_id,title,effective_from)
     VALUES($1::uuid,$2::uuid,'Rollback verifier',CURRENT_DATE) RETURNING id`,
    [person.rows[0].id, organizationId],
  );
  const account = await client.query(
    `INSERT INTO campaign_accounts(campaign_id,organization_id,pursuit_state)
     VALUES($1::uuid,$2::uuid,'identified')
     ON CONFLICT(campaign_id,organization_id) DO UPDATE SET pursuit_state=campaign_accounts.pursuit_state RETURNING id`,
    [campaignId, organizationId],
  );
  await client.query(
    `INSERT INTO campaign_contacts(campaign_account_id,role_id,lead_state,outreach_focus_state)
     VALUES($1::uuid,$2::uuid,'new','pending')`,
    [account.rows[0].id, role.rows[0].id],
  );
  await client.query(
    `INSERT INTO poc_suitabilities(role_id,responsibility_context,assessment,reason,assessed_at,legacy_status,assessed_by,referral,referred_person_id,source_payload)
     VALUES($1::uuid,'general','suitable','Rollback verification',NOW(),'Confirmed','verification','{}'::jsonb,NULL,'{}'::jsonb)`,
    [role.rows[0].id],
  );
  await client.query(
    `INSERT INTO key_relationship_profiles(role_id,standing,manually_confirmed,confirmed_at,legacy_status,owner_name,service_categories)
     VALUES($1::uuid,'New',TRUE,NOW(),'New','verification','{}')`,
    [role.rows[0].id],
  );
  await client.query('ROLLBACK');
  const sample = await client.query(`SELECT id FROM people WHERE archived_at IS NULL ORDER BY created_at LIMIT 1`);
  if (!sample.rows.length) throw new Error('No contact is available for read-model verification.');
  const [detail, rightPocs] = await Promise.all([
    getLeadById(sample.rows[0].id),
    listAllLeads({ rightPocOnly: true, page: 1, limit: 1 }),
  ]);
  if (!detail.pocQualification || !detail.relationshipProfile || !Array.isArray(rightPocs.items)) {
    throw new Error('POC/referral read models returned an invalid contract.');
  }
  console.log(JSON.stringify({
    ok: true,
    requiredColumns: 'present',
    transaction: 'rolled back',
    contactReadModel: 'valid',
    latestRightPocFilter: 'valid',
  }));
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await db.getPool().end();
}
