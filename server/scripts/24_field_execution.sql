-- EGS ERP: traceable mobile field submissions over existing operational records.

BEGIN;

CREATE TABLE IF NOT EXISTS field_execution_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
  job_activity_id UUID NOT NULL REFERENCES job_activities(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES operational_resources(id) ON DELETE SET NULL,
  action VARCHAR(30) NOT NULL CHECK (action IN ('start', 'pause', 'progress', 'problem', 'complete')),
  note TEXT,
  remaining_work TEXT,
  created_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  project_time_entry_id UUID REFERENCES project_time_entries(id) ON DELETE SET NULL,
  submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS field_execution_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES field_execution_submissions(id) ON DELETE CASCADE,
  photo_type VARCHAR(30) NOT NULL DEFAULT 'progress_photo' CHECK (photo_type IN ('progress_photo', 'installation_photo', 'final_photo', 'problem_photo')),
  file_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type VARCHAR(150),
  size_bytes BIGINT,
  checksum_sha256 VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_field_submissions_user_day
  ON field_execution_submissions(submitted_by_user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_submissions_activity
  ON field_execution_submissions(job_activity_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_files_submission
  ON field_execution_files(submission_id, created_at);

COMMIT;
