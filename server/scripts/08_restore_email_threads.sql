BEGIN;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS source_thread_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS campaign_contact_id UUID REFERENCES campaign_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_source_thread
  ON conversations(source_thread_key)
  WHERE source_thread_key IS NOT NULL;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS source_collection VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS html_body TEXT,
  ADD COLUMN IF NOT EXISTS from_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS to_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS suggested_intent VARCHAR(100),
  ADD COLUMN IF NOT EXISTS human_review_status VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_migration_duplicate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_of_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_message_source_document
  ON messages(source_collection, source_mongo_id)
  WHERE source_collection IS NOT NULL AND source_mongo_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_participant_endpoint_role
  ON conversation_participants(conversation_id, participant_role, endpoint_value_snapshot);

ALTER TABLE review_items
  ADD COLUMN IF NOT EXISTS source_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS suggested_outcome VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_review_item_source_message
  ON review_items(source_message_id)
  WHERE source_message_id IS NOT NULL;

COMMIT;
