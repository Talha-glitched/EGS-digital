BEGIN;

ALTER TABLE poc_suitabilities
  ADD COLUMN IF NOT EXISTS legacy_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS assessed_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS referral JSONB,
  ADD COLUMN IF NOT EXISTS referred_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_lead_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_poc_source_lead
  ON poc_suitabilities(source_lead_mongo_id)
  WHERE source_lead_mongo_id IS NOT NULL;

ALTER TABLE key_relationship_profiles
  ADD COLUMN IF NOT EXISTS legacy_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS service_categories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_notes TEXT,
  ADD COLUMN IF NOT EXISTS source_lead_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_relationship_source_lead
  ON key_relationship_profiles(source_lead_mongo_id)
  WHERE source_lead_mongo_id IS NOT NULL;

COMMIT;
