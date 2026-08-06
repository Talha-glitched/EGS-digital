-- EGS ERP: one accountable task system across CRM, Jobs, and production.
-- Additive only: legacy task rows remain valid and retain their original meaning.

BEGIN;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_phase_id UUID REFERENCES job_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_activity_id UUID REFERENCES job_activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS waiting_on TEXT,
  ADD COLUMN IF NOT EXISTS completion_note TEXT,
  ADD COLUMN IF NOT EXISTS completion_evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_id UUID;

-- Exact, unique identity bridge only. Ambiguous and unmatched legacy names stay unassigned.
UPDATE tasks t
SET owner_user_id = (
  SELECT u.id FROM users u
  WHERE u.is_active = TRUE
    AND (LOWER(BTRIM(u.name)) = LOWER(BTRIM(t.owner)) OR LOWER(BTRIM(u.email)) = LOWER(BTRIM(t.owner)))
  LIMIT 1
)
WHERE t.owner_user_id IS NULL
  AND NULLIF(BTRIM(t.owner), '') IS NOT NULL
  AND (
    SELECT COUNT(*) FROM users u
    WHERE u.is_active = TRUE
      AND (LOWER(BTRIM(u.name)) = LOWER(BTRIM(t.owner)) OR LOWER(BTRIM(u.email)) = LOWER(BTRIM(t.owner)))
  ) = 1;

CREATE INDEX IF NOT EXISTS idx_tasks_owner_work
  ON tasks(owner_user_id, status, due_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_job_context
  ON tasks(opportunity_id, work_package_id, job_phase_id, job_location_id, job_activity_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, depends_on_task_id),
  CONSTRAINT task_dependency_not_self CHECK (task_id <> depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor
  ON task_dependencies(depends_on_task_id);

CREATE OR REPLACE FUNCTION prevent_task_dependency_cycle()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE predecessors(id) AS (
      SELECT NEW.depends_on_task_id
      UNION
      SELECT td.depends_on_task_id
      FROM task_dependencies td JOIN predecessors p ON td.task_id = p.id
    )
    SELECT 1 FROM predecessors WHERE id = NEW.task_id
  ) THEN
    RAISE EXCEPTION 'Task dependency would create a cycle';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_task_dependency_cycle ON task_dependencies;
CREATE TRIGGER trg_prevent_task_dependency_cycle
BEFORE INSERT OR UPDATE ON task_dependencies
FOR EACH ROW EXECUTE FUNCTION prevent_task_dependency_cycle();

CREATE TABLE IF NOT EXISTS task_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  note TEXT,
  file_name VARCHAR(255),
  storage_path TEXT,
  public_url TEXT,
  mime_type VARCHAR(150),
  size_bytes BIGINT,
  checksum_sha256 VARCHAR(64),
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT task_evidence_has_content CHECK (
    NULLIF(BTRIM(note), '') IS NOT NULL OR storage_path IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_task_evidence_task
  ON task_evidence(task_id, created_at DESC);

CREATE OR REPLACE FUNCTION validate_task_job_context()
RETURNS TRIGGER AS $$
DECLARE
  context_job UUID;
  candidate_job UUID;
BEGIN
  context_job := NEW.opportunity_id;

  IF NEW.work_package_id IS NOT NULL THEN
    SELECT ongoing_job_id INTO candidate_job FROM job_scope_lines WHERE id = NEW.work_package_id;
    IF context_job IS NOT NULL AND candidate_job IS DISTINCT FROM context_job THEN
      RAISE EXCEPTION 'Task work package belongs to a different Ongoing Job';
    END IF;
    context_job := COALESCE(context_job, candidate_job);
  END IF;

  IF NEW.job_phase_id IS NOT NULL THEN
    SELECT ongoing_job_id INTO candidate_job FROM job_phases WHERE id = NEW.job_phase_id;
    IF context_job IS NOT NULL AND candidate_job IS DISTINCT FROM context_job THEN
      RAISE EXCEPTION 'Task phase belongs to a different Ongoing Job';
    END IF;
    context_job := COALESCE(context_job, candidate_job);
  END IF;

  IF NEW.job_location_id IS NOT NULL THEN
    SELECT ongoing_job_id INTO candidate_job FROM job_locations WHERE id = NEW.job_location_id;
    IF context_job IS NOT NULL AND candidate_job IS DISTINCT FROM context_job THEN
      RAISE EXCEPTION 'Task location belongs to a different Ongoing Job';
    END IF;
    context_job := COALESCE(context_job, candidate_job);
  END IF;

  IF NEW.job_activity_id IS NOT NULL THEN
    SELECT ongoing_job_id INTO candidate_job FROM job_activities WHERE id = NEW.job_activity_id;
    IF context_job IS NOT NULL AND candidate_job IS DISTINCT FROM context_job THEN
      RAISE EXCEPTION 'Task activity belongs to a different Ongoing Job';
    END IF;
    context_job := COALESCE(context_job, candidate_job);
  END IF;

  NEW.opportunity_id := context_job;
  NEW.updated_at := CURRENT_TIMESTAMP;

  IF NEW.status = 'blocked' AND NULLIF(BTRIM(NEW.blocked_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A blocked task requires a blocker reason';
  END IF;
  IF NEW.status = 'waiting' AND NULLIF(BTRIM(NEW.waiting_on), '') IS NULL THEN
    RAISE EXCEPTION 'A waiting task requires what or whom it is waiting on';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_task_job_context ON tasks;
CREATE TRIGGER trg_validate_task_job_context
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION validate_task_job_context();

COMMIT;
