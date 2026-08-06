BEGIN;

CREATE TEMP TABLE latest_campaign_responders ON COMMIT DROP AS
SELECT DISTINCT ON (cc.campaign_account_id)
       cc.campaign_account_id,cc.id AS responder_contact_id,m.id AS source_message_id,m.occurred_at
FROM messages m JOIN conversations c ON c.id=m.conversation_id
JOIN campaign_contacts cc ON cc.id=c.campaign_contact_id
WHERE m.direction='inbound' AND COALESCE(m.is_migration_duplicate,FALSE)=FALSE
ORDER BY cc.campaign_account_id,m.occurred_at DESC,m.id DESC;

INSERT INTO campaign_contact_focus_events(
  campaign_account_id,campaign_contact_id,event_type,previous_state,new_state,reason,source_message_id,metadata,occurred_at
)
SELECT latest.campaign_account_id,contact.id,'migration_reply_backfill',contact.outreach_focus_state,'active_reply',
       'Backfilled from the latest canonical inbound reply for this Campaign Account.',latest.source_message_id,
       jsonb_build_object('backfill','campaign_contact_coordination_v1'),NOW()
FROM latest_campaign_responders latest JOIN campaign_contacts contact ON contact.id=latest.responder_contact_id
WHERE contact.outreach_focus_state NOT IN('active_reply','active_referral','active_manual')
  AND NOT EXISTS(
    SELECT 1 FROM campaign_contact_focus_events event
    WHERE event.campaign_contact_id=contact.id AND event.event_type='migration_reply_backfill'
      AND event.source_message_id=latest.source_message_id
  );

UPDATE campaign_contacts contact SET
  outreach_focus_state='active_reply',
  focus_reason='Backfilled from the latest canonical inbound reply for this Campaign Account.',
  focus_updated_at=latest.occurred_at,
  focus_source_message_id=latest.source_message_id
FROM latest_campaign_responders latest
WHERE contact.id=latest.responder_contact_id
  AND contact.outreach_focus_state NOT IN('active_reply','active_referral','active_manual');

INSERT INTO campaign_contact_focus_events(
  campaign_account_id,campaign_contact_id,event_type,previous_state,new_state,reason,source_message_id,metadata,occurred_at
)
SELECT latest.campaign_account_id,contact.id,'migration_reply_backfill',contact.outreach_focus_state,'paused_after_reply',
       'Backfilled hold because another contact at this Campaign Account supplied the latest reply.',latest.source_message_id,
       jsonb_build_object('backfill','campaign_contact_coordination_v1','responderCampaignContactId',latest.responder_contact_id),NOW()
FROM latest_campaign_responders latest JOIN campaign_contacts contact ON contact.campaign_account_id=latest.campaign_account_id
WHERE contact.id<>latest.responder_contact_id AND contact.outreach_focus_state IN('pending','responded')
  AND NOT EXISTS(
    SELECT 1 FROM campaign_contact_focus_events event
    WHERE event.campaign_contact_id=contact.id AND event.event_type='migration_reply_backfill'
      AND event.source_message_id=latest.source_message_id
  );

UPDATE campaign_contacts contact SET
  outreach_focus_state='paused_after_reply',
  focus_reason='Another contact at this Campaign Account supplied the latest reply.',
  focus_updated_at=latest.occurred_at,
  focus_source_message_id=latest.source_message_id
FROM latest_campaign_responders latest
WHERE contact.campaign_account_id=latest.campaign_account_id
  AND contact.id<>latest.responder_contact_id
  AND contact.outreach_focus_state IN('pending','responded');

COMMIT;
