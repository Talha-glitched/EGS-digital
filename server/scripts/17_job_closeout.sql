-- EGS ERP: physical handover, mandatory final photography, and snag closeout.

CREATE TABLE IF NOT EXISTS job_closeouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL UNIQUE REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    handover_at TIMESTAMPTZ,
    handover_contact_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    handover_note TEXT,
    completion_summary TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_closeout_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    evidence_type VARCHAR(30) NOT NULL CHECK (evidence_type IN ('final_photo', 'before_photo', 'installation_photo', 'handover_document', 'snag_photo', 'other')),
    title VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    mime_type VARCHAR(150),
    size_bytes BIGINT,
    checksum_sha256 VARCHAR(64) NOT NULL,
    captured_at TIMESTAMPTZ,
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_snags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'accepted')),
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_at TIMESTAMPTZ,
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_closeout_evidence_job ON job_closeout_evidence(ongoing_job_id, evidence_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_snags_job ON job_snags(ongoing_job_id, status, due_at);

CREATE OR REPLACE FUNCTION enforce_job_done_final_photo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.summary_stage = 'Job Done'
       AND OLD.summary_stage IS DISTINCT FROM NEW.summary_stage
       AND NOT EXISTS (
           SELECT 1 FROM job_closeout_evidence
           WHERE ongoing_job_id = NEW.id AND evidence_type = 'final_photo'
       ) THEN
        RAISE EXCEPTION 'Upload at least one Final delivery photo before marking this Job Done.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_job_done_final_photo ON ongoing_jobs;
CREATE TRIGGER trg_enforce_job_done_final_photo
BEFORE UPDATE OF summary_stage ON ongoing_jobs
FOR EACH ROW EXECUTE FUNCTION enforce_job_done_final_photo();
