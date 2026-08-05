BEGIN;

ALTER TABLE organization_contact_methods
  ADD COLUMN IF NOT EXISTS source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_contact_endpoint
  ON organization_contact_methods(organization_id, type, normalized_value);

ALTER TABLE campaign_accounts
  ADD COLUMN IF NOT EXISTS provenance JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE campaign_contacts
  ADD COLUMN IF NOT EXISTS source_lead_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_campaign_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivery_state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS outcome VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_contact_source_context
  ON campaign_contacts(source_lead_mongo_id, source_campaign_mongo_id)
  WHERE source_lead_mongo_id IS NOT NULL AND source_campaign_mongo_id IS NOT NULL;

COMMIT;
