-- EGS ERP: preserve immutable communication while linking its operational meaning.
CREATE TABLE IF NOT EXISTS conversation_job_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE, link_reason TEXT,
  linked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, linked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(conversation_id,ongoing_job_id)
);
CREATE TABLE IF NOT EXISTS communication_job_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_job_link_id UUID NOT NULL REFERENCES conversation_job_links(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  action_type VARCHAR(40) NOT NULL CHECK(action_type IN ('link','task','requirement','change','decision','issue','artifact_decision')),
  target_table VARCHAR(80), target_entity_id UUID, summary TEXT NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conversation_job_links_job ON conversation_job_links(ongoing_job_id,linked_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_actions_link ON communication_job_actions(conversation_job_link_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_actions_message ON communication_job_actions(message_id) WHERE message_id IS NOT NULL;
