BEGIN;

ALTER TABLE campaign_contacts
  ADD COLUMN IF NOT EXISTS focus_reason TEXT,
  ADD COLUMN IF NOT EXISTS focus_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS focus_source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS focus_source_poc_suitability_id UUID REFERENCES poc_suitabilities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS focus_selected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS campaign_contact_focus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_account_id UUID NOT NULL REFERENCES campaign_accounts(id) ON DELETE CASCADE,
  campaign_contact_id UUID NOT NULL REFERENCES campaign_contacts(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  previous_state VARCHAR(50),
  new_state VARCHAR(50) NOT NULL,
  reason TEXT,
  source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  source_poc_suitability_id UUID REFERENCES poc_suitabilities(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_focus_events_account_time
  ON campaign_contact_focus_events(campaign_account_id,occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_focus
  ON campaign_contacts(campaign_account_id,outreach_focus_state);

COMMIT;
