import db from '../src/db/index.js';
import {
  coordinateReplyFocus,
  applyReferralFocus,
  releaseWrongPocFocus,
  selectCampaignContactFocus,
} from '../src/services/campaignContactCoordinationService.js';
import { getLeadById } from '../src/services/projectService.js';

const client = await db.getClient();
try {
  const context = await client.query(
    `SELECT cc.id AS campaign_contact_id,ca.campaign_id,por.person_id,cc.outreach_focus_state
     FROM campaign_contacts cc JOIN campaign_accounts ca ON ca.id=cc.campaign_account_id
     JOIN person_organization_roles por ON por.id=cc.role_id
     ORDER BY cc.created_at LIMIT 1`,
  );
  if (!context.rows.length) throw new Error('No campaign contact is available for rollback verification.');
  const row = context.rows[0];
  const beforeEvents = await client.query(`SELECT COUNT(*)::int AS count FROM campaign_contact_focus_events`);

  const reply = await coordinateReplyFocus({ campaignContactId: row.campaign_contact_id, transactionOptions: { rollbackOnly: true } });
  if (!reply.coordinated || !reply.dryRun) throw new Error('Reply coordination rollback contract failed.');
  const manual = await selectCampaignContactFocus({ campaignId: row.campaign_id, personId: row.person_id, transactionOptions: { rollbackOnly: true } });
  if (!manual.ok || !manual.dryRun || manual.sendingResumed) throw new Error('Manual focus rollback contract failed.');

  await client.query('BEGIN');
  const released = await releaseWrongPocFocus(client, { campaignContactId: row.campaign_contact_id });
  if (!released.coordinated) throw new Error('Wrong POC release contract failed.');
  await client.query('ROLLBACK');

  const pair = await client.query(
    `SELECT ARRAY_AGG(cc.id ORDER BY cc.created_at) AS ids FROM campaign_contacts cc
     GROUP BY cc.campaign_account_id HAVING COUNT(*)>=2 LIMIT 1`,
  );
  let referralTransfer = 'not_applicable';
  if (pair.rows[0]?.ids?.length >= 2) {
    await client.query('BEGIN');
    const transferred = await applyReferralFocus(client, {
      sourceCampaignContactId: pair.rows[0].ids[0],
      referredCampaignContactId: pair.rows[0].ids[1],
    });
    if (!transferred.coordinated) throw new Error('Referral focus transfer contract failed.');
    await client.query('ROLLBACK');
    referralTransfer = 'rolled back';
  }

  const after = await client.query(`SELECT outreach_focus_state FROM campaign_contacts WHERE id=$1::uuid`, [row.campaign_contact_id]);
  const afterEvents = await client.query(`SELECT COUNT(*)::int AS count FROM campaign_contact_focus_events`);
  if (after.rows[0].outreach_focus_state !== row.outreach_focus_state || afterEvents.rows[0].count !== beforeEvents.rows[0].count) {
    throw new Error('Rollback verification left campaign coordination changes behind.');
  }
  const lead = await getLeadById(row.person_id);
  if (!Object.hasOwn(lead, 'campaignFocusState')) throw new Error('Contact read model is missing campaignFocusState.');
  console.log(JSON.stringify({ ok: true, replyHold: 'rolled back', manualSelection: 'rolled back', wrongPocRelease: 'rolled back', referralTransfer, readModel: 'valid' }));
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await db.getPool().end();
}
