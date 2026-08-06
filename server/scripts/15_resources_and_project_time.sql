-- EGS ERP: operational resources, activity assignments, availability, and auditable project time.

CREATE TABLE IF NOT EXISTS operational_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(30) NOT NULL CHECK (resource_type IN ('employee', 'contractor', 'team', 'subcontractor', 'vehicle', 'equipment')),
    name VARCHAR(255) NOT NULL,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    supplier_profile_id UUID REFERENCES supplier_profiles(id) ON DELETE SET NULL,
    identifier VARCHAR(100),
    capability_tags TEXT[] NOT NULL DEFAULT '{}',
    hourly_cost_aed NUMERIC(12,2) CHECK (hourly_cost_aed IS NULL OR hourly_cost_aed >= 0),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_activity_resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_activity_id UUID NOT NULL REFERENCES job_activities(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES operational_resources(id) ON DELETE RESTRICT,
    assignment_role VARCHAR(100),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_activity_id, resource_id)
);

CREATE TABLE IF NOT EXISTS resource_availability_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES operational_resources(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT resource_availability_date_order CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS project_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES operational_resources(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    job_activity_id UUID REFERENCES job_activities(id) ON DELETE SET NULL,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
    entry_source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (entry_source IN ('timer', 'manual')),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'voided')),
    note TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_time_date_order CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT running_time_has_no_end CHECK ((status = 'running' AND ended_at IS NULL) OR status <> 'running')
);

CREATE TABLE IF NOT EXISTS project_time_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_time_entry_id UUID NOT NULL REFERENCES project_time_entries(id) ON DELETE CASCADE,
    previous_started_at TIMESTAMPTZ NOT NULL,
    previous_ended_at TIMESTAMPTZ,
    corrected_started_at TIMESTAMPTZ NOT NULL,
    corrected_ended_at TIMESTAMPTZ,
    reason TEXT NOT NULL,
    corrected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    corrected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operational_resources_type ON operational_resources(resource_type, status, name);
CREATE INDEX IF NOT EXISTS idx_activity_resource_assignments_activity ON job_activity_resource_assignments(job_activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_resource_assignments_resource ON job_activity_resource_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_availability_range ON resource_availability_blocks(resource_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_project_time_job ON project_time_entries(ongoing_job_id, started_at DESC) WHERE status <> 'voided';
CREATE INDEX IF NOT EXISTS idx_project_time_resource ON project_time_entries(resource_id, started_at DESC) WHERE status <> 'voided';
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_running_time_per_resource ON project_time_entries(resource_id) WHERE status = 'running';
