BEGIN;

ALTER TABLE interactions
  ADD COLUMN IF NOT EXISTS source_interaction_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS attendees TEXT,
  ADD COLUMN IF NOT EXISTS logged_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS related_person_ids UUID[],
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_interaction_source
  ON interactions(source_interaction_mongo_id)
  WHERE source_interaction_mongo_id IS NOT NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_task_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_collection VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_task_source
  ON tasks(source_collection, source_task_mongo_id)
  WHERE source_collection IS NOT NULL AND source_task_mongo_id IS NOT NULL;

COMMIT;
