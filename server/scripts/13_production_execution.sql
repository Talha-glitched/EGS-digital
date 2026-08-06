-- EGS ERP: exact production basis, operational activities, and append-only execution updates.

CREATE TABLE IF NOT EXISTS production_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    quote_version_id UUID REFERENCES quote_versions(id) ON DELETE SET NULL,
    release_basis VARCHAR(30) NOT NULL DEFAULT 'approved' CHECK (release_basis IN ('approved', 'authorized_exception')),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'revoked')),
    po_pending BOOLEAN NOT NULL DEFAULT FALSE,
    deposit_pending BOOLEAN NOT NULL DEFAULT FALSE,
    release_note TEXT,
    released_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    released_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    superseded_by_release_id UUID REFERENCES production_releases(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    revocation_reason TEXT
);

CREATE TABLE IF NOT EXISTS production_release_design_versions (
    production_release_id UUID NOT NULL REFERENCES production_releases(id) ON DELETE CASCADE,
    design_version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE RESTRICT,
    PRIMARY KEY (production_release_id, design_version_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_production_release_per_job
    ON production_releases(ongoing_job_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_production_releases_job ON production_releases(ongoing_job_id, released_at DESC);

CREATE TABLE IF NOT EXISTS job_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    phase_id UUID REFERENCES job_phases(id) ON DELETE SET NULL,
    location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'ready', 'completed', 'cancelled')),
    blocker TEXT,
    completion_note TEXT,
    completed_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ,
    CONSTRAINT job_activity_date_order CHECK (planned_end IS NULL OR planned_start IS NULL OR planned_end >= planned_start)
);

CREATE TABLE IF NOT EXISTS job_activity_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_activity_id UUID NOT NULL REFERENCES job_activities(id) ON DELETE CASCADE,
    update_type VARCHAR(30) NOT NULL CHECK (update_type IN ('progress', 'blocker', 'resolution', 'completion', 'evidence')),
    note TEXT,
    file_name VARCHAR(255),
    file_path TEXT,
    public_url TEXT,
    mime_type VARCHAR(150),
    size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT activity_update_has_content CHECK (NULLIF(BTRIM(note), '') IS NOT NULL OR file_path IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_job_activities_job ON job_activities(ongoing_job_id, planned_start, planned_end) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_activities_owner ON job_activities(owner_user_id, planned_start) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_activities_calendar ON job_activities(planned_start, planned_end) WHERE archived_at IS NULL AND status <> 'cancelled';
CREATE INDEX IF NOT EXISTS idx_job_activity_updates_activity ON job_activity_updates(job_activity_id, created_at DESC);
