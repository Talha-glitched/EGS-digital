-- EGS ERP: assignment-level labor planning for calendar resource lanes and planned-vs-actual reporting.

ALTER TABLE job_activity_resource_assignments
    ADD COLUMN IF NOT EXISTS planned_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
    ALTER TABLE job_activity_resource_assignments
        ADD CONSTRAINT resource_assignment_planned_minutes_check
        CHECK (planned_minutes IS NULL OR planned_minutes >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_resource_assignments_planning
    ON job_activity_resource_assignments(resource_id, job_activity_id, planned_minutes);

