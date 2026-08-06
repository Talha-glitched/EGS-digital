-- EGS ERP: versioned Job Memory notes and attachments.
-- Additive and safe to rerun.

ALTER TABLE notes ADD COLUMN IF NOT EXISTS note_type VARCHAR(50) NOT NULL DEFAULT 'update';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS current_version_number INT NOT NULL DEFAULT 1;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS source_key VARCHAR(255);

CREATE TABLE IF NOT EXISTS note_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    content TEXT NOT NULL,
    change_reason TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(note_id, version_number)
);

CREATE TABLE IF NOT EXISTS note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_version_id UUID NOT NULL REFERENCES note_versions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    mime_type VARCHAR(150),
    size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO note_versions (note_id, version_number, content, created_by_user_id, created_at)
SELECT n.id, 1, n.content, n.author_user_id, n.created_at
FROM notes n
WHERE NOT EXISTS (
    SELECT 1 FROM note_versions nv WHERE nv.note_id = n.id
);

UPDATE notes
SET updated_at = COALESCE(updated_at, created_at),
    current_version_number = GREATEST(COALESCE(current_version_number, 1), 1)
WHERE updated_at IS NULL OR current_version_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_notes_target_current
    ON notes(target_entity_type, target_entity_id, is_pinned DESC, updated_at DESC)
    WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_note_versions_note
    ON note_versions(note_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_note_attachments_version
    ON note_attachments(note_version_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_source_key
    ON notes(source_key)
    WHERE source_key IS NOT NULL;

-- Preserve the old single Job notes field as a pinned, versioned Brief. The old
-- column remains untouched for rollback/audit, but new product code no longer
-- reads or writes it.
WITH inserted AS (
    INSERT INTO notes (
        target_entity_type, target_entity_id, note_type, content,
        current_version_number, is_pinned, source_key, created_at, updated_at
    )
    SELECT
        'ongoing_job', oj.id, 'brief', BTRIM(oj.notes),
        1, TRUE, 'legacy-ongoing-job-notes:' || oj.id::text,
        COALESCE(oj.created_at, CURRENT_TIMESTAMP),
        COALESCE(oj.updated_at, oj.created_at, CURRENT_TIMESTAMP)
    FROM ongoing_jobs oj
    WHERE NULLIF(BTRIM(oj.notes), '') IS NOT NULL
    ON CONFLICT DO NOTHING
    RETURNING id, content, created_at
)
INSERT INTO note_versions (note_id, version_number, content, change_reason, created_at)
SELECT id, 1, content, 'Migrated from the former Job notes field', created_at
FROM inserted
ON CONFLICT (note_id, version_number) DO NOTHING;
