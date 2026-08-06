-- EGS ERP: immutable design and quotation series with exact customer decisions.

CREATE TABLE IF NOT EXISTS design_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

ALTER TABLE design_versions ADD COLUMN IF NOT EXISTS design_set_id UUID REFERENCES design_sets(id) ON DELETE CASCADE;
ALTER TABLE design_versions ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255);
ALTER TABLE design_versions ADD COLUMN IF NOT EXISTS public_url TEXT;
ALTER TABLE design_versions ADD COLUMN IF NOT EXISTS mime_type VARCHAR(150);
ALTER TABLE design_versions ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE design_versions ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(64);
ALTER TABLE design_versions ADD COLUMN IF NOT EXISTS revision_note TEXT;
ALTER TABLE design_versions ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE design_versions ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255);
ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS public_url TEXT;
ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS mime_type VARCHAR(150);
ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(64);
ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS revision_note TEXT;
ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_design_versions_set_version
    ON design_versions(design_set_id, version_number) WHERE design_set_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_versions_quote_version
    ON quote_versions(quote_id, version_number);
CREATE INDEX IF NOT EXISTS idx_design_sets_job_active
    ON design_sets(ongoing_job_id, created_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_job_active
    ON quotes(ongoing_job_id, created_at) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS artifact_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    artifact_type VARCHAR(30) NOT NULL CHECK (artifact_type IN ('design', 'quotation')),
    design_version_id UUID REFERENCES design_versions(id) ON DELETE CASCADE,
    quote_version_id UUID REFERENCES quote_versions(id) ON DELETE CASCADE,
    decision VARCHAR(30) NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested', 'withdrawn')),
    decided_by_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    decision_note TEXT,
    evidence_reference TEXT,
    recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT artifact_decision_exact_target CHECK (
        (artifact_type = 'design' AND design_version_id IS NOT NULL AND quote_version_id IS NULL)
        OR
        (artifact_type = 'quotation' AND quote_version_id IS NOT NULL AND design_version_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_artifact_decisions_job ON artifact_decisions(ongoing_job_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifact_decisions_design ON artifact_decisions(design_version_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifact_decisions_quote ON artifact_decisions(quote_version_id, decided_at DESC);
