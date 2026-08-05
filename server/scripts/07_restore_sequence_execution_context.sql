BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sequences_mongo_id
  ON sequences(mongo_sequence_id)
  WHERE mongo_sequence_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sequence_version_number
  ON sequence_versions(sequence_id, version_number);

ALTER TABLE sequence_steps
  ADD COLUMN IF NOT EXISTS source_step_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delay_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delay_unit VARCHAR(20) DEFAULT 'days',
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sequence_step_source
  ON sequence_steps(sequence_version_id, source_step_mongo_id)
  WHERE source_step_mongo_id IS NOT NULL;

ALTER TABLE sequence_launches
  ADD COLUMN IF NOT EXISTS source_launch_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'historical',
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sequence_launch_source
  ON sequence_launches(source_launch_mongo_id)
  WHERE source_launch_mongo_id IS NOT NULL;

ALTER TABLE sequence_enrollments
  ADD COLUMN IF NOT EXISTS source_execution_state VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sequence_enrollment_mongo_id
  ON sequence_enrollments(mongo_enrollment_id)
  WHERE mongo_enrollment_id IS NOT NULL;

ALTER TABLE send_jobs
  ADD COLUMN IF NOT EXISTS source_send_job_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mongo_lead_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_send_job_source
  ON send_jobs(source_send_job_mongo_id)
  WHERE source_send_job_mongo_id IS NOT NULL;

COMMIT;
