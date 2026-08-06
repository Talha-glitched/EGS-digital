import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

const clean = (value) => String(value ?? '').trim();

async function loadContactContext(client, campaignContactId) {
  const result = await client.query(
    `SELECT cc.id,cc.campaign_account_id,cc.outreach_focus_state,ca.campaign_id,ca.organization_id,
            por.person_id,p.display_name
     FROM campaign_contacts cc
     JOIN campaign_accounts ca ON ca.id=cc.campaign_account_id
     LEFT JOIN person_organization_roles por ON por.id=cc.role_id
     LEFT JOIN people p ON p.id=por.person_id
     WHERE cc.id=$1::uuid FOR UPDATE OF cc,ca`,
    [campaignContactId],
  );
  if (!result.rows.length) throw Object.assign(new Error('Campaign contact not found.'), { status: 404 });
  return result.rows[0];
}

async function recordFocusChanges(client, contacts, nextStateFor, { eventType, reason, sourceMessageId, sourcePocSuitabilityId, actorUserId, metadata = {} }) {
  for (const contact of contacts) {
    const nextState = nextStateFor(contact);
    if (!nextState || nextState === contact.outreach_focus_state) continue;
    await client.query(
      `UPDATE campaign_contacts SET outreach_focus_state=$2,focus_reason=$3,focus_updated_at=NOW(),
         focus_source_message_id=$4::uuid,focus_source_poc_suitability_id=$5::uuid,focus_selected_by_user_id=$6::uuid
       WHERE id=$1::uuid`,
      [contact.id, nextState, reason, sourceMessageId || null, sourcePocSuitabilityId || null, actorUserId || null],
    );
    await client.query(
      `INSERT INTO campaign_contact_focus_events(campaign_account_id,campaign_contact_id,event_type,previous_state,new_state,reason,
         source_message_id,source_poc_suitability_id,actor_user_id,metadata)
       VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7::uuid,$8::uuid,$9::uuid,$10::jsonb)`,
      [contact.campaign_account_id, contact.id, eventType, contact.outreach_focus_state || null, nextState, reason,
        sourceMessageId || null, sourcePocSuitabilityId || null, actorUserId || null, JSON.stringify(metadata)],
    );
  }
}

async function holdAccountSending(client, campaignAccountId, focusedContactId, reason) {
  await client.query(
    `UPDATE sequence_enrollments se SET execution_state='frozen',
       stop_reason=CASE WHEN se.campaign_contact_id=$2::uuid THEN $3 ELSE 'account_reply:'||$2::text END
     WHERE se.campaign_contact_id IN(SELECT id FROM campaign_contacts WHERE campaign_account_id=$1::uuid)
       AND se.execution_state NOT IN('completed','stopped','cancelled','frozen')`,
    [campaignAccountId, focusedContactId, reason],
  );
  await client.query(
    `UPDATE send_jobs SET status='cancelled',error_message=COALESCE(error_message,$2)
     WHERE enrollment_id IN(
       SELECT se.id FROM sequence_enrollments se JOIN campaign_contacts cc ON cc.id=se.campaign_contact_id
       WHERE cc.campaign_account_id=$1::uuid
     ) AND status IN('pending','queued','scheduled','processing')`,
    [campaignAccountId, 'Held because a contact at this campaign account replied'],
  );
}

export async function coordinateReplyFocus({ campaignContactId, sourceMessageId = null, actor = {}, transactionOptions = {} }) {
  if (!campaignContactId) return { coordinated: false, reason: 'no_campaign_contact' };
  const client = await db.getClient();
  let context;
  try {
    await client.query('BEGIN');
    context = await loadContactContext(client, campaignContactId);
    const contacts = (await client.query(
      `SELECT id,campaign_account_id,outreach_focus_state FROM campaign_contacts WHERE campaign_account_id=$1::uuid FOR UPDATE`,
      [context.campaign_account_id],
    )).rows;
    await recordFocusChanges(client, contacts, (contact) => contact.id === context.id ? 'active_reply' : 'paused_after_reply', {
      eventType: 'reply_received', reason: 'A person at this company replied; follow-up is focused on the responder.',
      sourceMessageId, actorUserId: actor.userId, metadata: { responderPersonId: context.person_id },
    });
    await holdAccountSending(client, context.campaign_account_id, context.id, 'reply_received');
    if (transactionOptions.rollbackOnly) await client.query('ROLLBACK'); else await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
  if (!transactionOptions.rollbackOnly) await writeAuditLog({
    userId: actor.userId || null, userDisplayName: actor.displayName || 'System', action: 'campaign.focus_reply',
    resource: 'campaign_contact', resourceId: context.id,
    summary: `Campaign follow-up focused on ${context.display_name || 'the replying contact'}`,
    metadata: { campaignId: context.campaign_id, organizationId: context.organization_id, sourceMessageId },
  });
  return { coordinated: true, campaignContactId: context.id, campaignAccountId: context.campaign_account_id, dryRun: Boolean(transactionOptions.rollbackOnly) };
}

export async function applyReferralFocus(client, { sourceCampaignContactId, referredCampaignContactId, sourcePocSuitabilityId = null, actor = {} }) {
  if (!sourceCampaignContactId || !referredCampaignContactId) return { coordinated: false };
  const source = await loadContactContext(client, sourceCampaignContactId);
  const referred = await loadContactContext(client, referredCampaignContactId);
  if (source.campaign_account_id !== referred.campaign_account_id) throw Object.assign(new Error('Referral contact is not in the same campaign account.'), { status: 409 });
  const contacts = (await client.query(
    `SELECT id,campaign_account_id,outreach_focus_state FROM campaign_contacts WHERE campaign_account_id=$1::uuid FOR UPDATE`,
    [source.campaign_account_id],
  )).rows;
  await recordFocusChanges(client, contacts, (contact) => {
    if (contact.id === referred.id) return 'active_referral';
    if (contact.id === source.id) return 'redirected';
    return 'paused_after_referral';
  }, {
    eventType: 'referral_transferred', reason: 'The responder referred EGS to this contact.', sourcePocSuitabilityId,
    actorUserId: actor.userId, metadata: { sourceCampaignContactId: source.id, referredCampaignContactId: referred.id },
  });
  await holdAccountSending(client, source.campaign_account_id, referred.id, 'referral_focus_selected');
  return { coordinated: true, campaignContactId: referred.id };
}

export async function releaseWrongPocFocus(client, { campaignContactId, sourcePocSuitabilityId = null, sourceReviewItemId = null, actor = {} }) {
  if (!campaignContactId) return { coordinated: false };
  const context = await loadContactContext(client, campaignContactId);
  const contacts = (await client.query(
    `SELECT id,campaign_account_id,outreach_focus_state FROM campaign_contacts WHERE campaign_account_id=$1::uuid FOR UPDATE`,
    [context.campaign_account_id],
  )).rows;
  await recordFocusChanges(client, contacts, (contact) => contact.id === context.id ? 'released_wrong_poc' : 'available', {
    eventType: 'wrong_poc_released', reason: 'Wrong POC recorded; another contact may now be selected manually.',
    sourcePocSuitabilityId, actorUserId: actor.userId, metadata: { sourceReviewItemId },
  });
  return { coordinated: true, campaignAccountId: context.campaign_account_id };
}

export async function selectCampaignContactFocus({ campaignId, personId, actor = {}, transactionOptions = {} }) {
  const client = await db.getClient();
  let selected;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT cc.id FROM campaign_contacts cc JOIN campaign_accounts ca ON ca.id=cc.campaign_account_id
       JOIN person_organization_roles por ON por.id=cc.role_id
       WHERE ca.campaign_id=$1::uuid AND por.person_id=$2::uuid LIMIT 1`, [campaignId, personId],
    );
    if (!result.rows.length) throw Object.assign(new Error('This person is not linked to that campaign.'), { status: 404 });
    selected = await loadContactContext(client, result.rows[0].id);
    const contacts = (await client.query(
      `SELECT id,campaign_account_id,outreach_focus_state FROM campaign_contacts WHERE campaign_account_id=$1::uuid FOR UPDATE`,
      [selected.campaign_account_id],
    )).rows;
    await recordFocusChanges(client, contacts, (contact) => contact.id === selected.id ? 'active_manual' : 'paused_manual', {
      eventType: 'manual_focus_selected', reason: 'An EGS user selected the campaign follow-up contact.', actorUserId: actor.userId,
      metadata: { personId },
    });
    if (transactionOptions.rollbackOnly) await client.query('ROLLBACK'); else await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
  if (!transactionOptions.rollbackOnly) await writeAuditLog({
    userId: actor.userId || null, userDisplayName: actor.displayName || 'EGS Team', action: 'campaign.focus_manual',
    resource: 'campaign_contact', resourceId: selected.id, summary: `Selected ${selected.display_name || 'contact'} as campaign follow-up focus`,
    metadata: { campaignId, personId, organizationId: selected.organization_id },
  });
  return { ok: true, campaignContactId: selected.id, outreachFocusState: 'active_manual', sendingResumed: false, dryRun: Boolean(transactionOptions.rollbackOnly) };
}
