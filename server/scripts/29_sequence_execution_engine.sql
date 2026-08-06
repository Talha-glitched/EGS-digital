BEGIN;

ALTER TABLE sequence_launches
  ADD COLUMN IF NOT EXISTS launched_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE sequence_enrollments
  ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ;

ALTER TABLE send_jobs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_send_jobs_idempotency_key
  ON send_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_send_jobs_runtime_queue
  ON send_jobs(status,manual_send,scheduled_for,created_at);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_runtime_context
  ON sequence_enrollments(sequence_id,campaign_contact_id,reset_at);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_launch_batch
  ON sequence_enrollments(launch_batch_id);
CREATE INDEX IF NOT EXISTS idx_send_jobs_enrollment_status
  ON send_jobs(enrollment_id,status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_role_account
  ON campaign_contacts(role_id,campaign_account_id);

COMMIT;
