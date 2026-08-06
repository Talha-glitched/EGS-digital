-- ==============================================================================
-- EGS CRM PostgreSQL Migration & Target Relational Schema DDL
-- Specification: CRM_FOUNDATION_SPEC.md & CRM_LOGICAL_ERD.md
-- Engine: PostgreSQL 14+ (Coolify compatible)
-- ==============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. MIGRATION CONTROL & EVIDENCE SCHEMA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS migration_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type VARCHAR(50) NOT NULL, -- e.g. 'rehearsal', 'cutover', 'dry_run'
    source_database VARCHAR(100) NOT NULL DEFAULT 'egs-web',
    source_watermark TIMESTAMPTZ,
    importer_version VARCHAR(50) DEFAULT '1.0.0',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
    operator VARCHAR(100),
    manifest_checksum VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS migration_source_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES migration_run(id) ON DELETE SET NULL,
    collection_name VARCHAR(100) NOT NULL,
    mongo_id VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL, -- Canonical Extended JSON
    payload_sha256 VARCHAR(64) NOT NULL,
    source_created_at TIMESTAMPTZ,
    source_updated_at TIMESTAMPTZ,
    extracted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    terminal_disposition VARCHAR(50) NOT NULL DEFAULT 'pending', 
    -- 'normalized', 'consolidated', 'legacy_archive_only', 'exception_pending', 'failed'
    CONSTRAINT idx_mongo_doc UNIQUE (collection_name, mongo_id)
);

CREATE INDEX IF NOT EXISTS idx_migration_source_disposition ON migration_source_document(terminal_disposition);

CREATE TABLE IF NOT EXISTS migration_entity_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_collection VARCHAR(100) NOT NULL,
    source_mongo_id VARCHAR(50) NOT NULL,
    source_path VARCHAR(255),
    target_table VARCHAR(100) NOT NULL,
    target_entity_id UUID NOT NULL,
    mapping_kind VARCHAR(50) NOT NULL, -- 'direct', 'split', 'merged', 'derived'
    confidence DECIMAL(3,2) DEFAULT 1.00,
    rule_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entity_map_lookup ON migration_entity_map(source_collection, source_mongo_id);
CREATE INDEX IF NOT EXISTS idx_entity_map_target ON migration_entity_map(target_table, target_entity_id);

CREATE TABLE IF NOT EXISTS migration_exception (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL, -- e.g. 'unmapped_service', 'ambiguous_organization'
    severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- 'warning', 'error', 'blocker'
    source_collection VARCHAR(100),
    source_mongo_id VARCHAR(50),
    evidence JSONB,
    proposed_options JSONB,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'resolved', 'ignored'
    decision TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS duplicate_review_case (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'person', 'organization'
    candidate_sql_ids UUID[] NOT NULL,
    match_reason VARCHAR(100) NOT NULL, -- 'normalized_name', 'shared_email', 'shared_linkedin'
    evidence JSONB,
    reviewer_user_id UUID,
    decision VARCHAR(50) DEFAULT 'pending', -- 'pending', 'merged', 'kept_separate'
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. TARGET EGS CRM CORE & GOVERNANCE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    mongo_user_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name VARCHAR(100) NOT NULL,
    stages JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. SERVICES & CATALOGUE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS service_families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES service_families(id) ON DELETE SET NULL,
    stable_code VARCHAR(50) UNIQUE NOT NULL,
    canonical_label VARCHAR(255) NOT NULL,
    definition TEXT,
    active_from DATE DEFAULT CURRENT_DATE,
    active_to DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    unit_family VARCHAR(50) NOT NULL -- 'length', 'area', 'weight', 'count', etc.
);

CREATE TABLE IF NOT EXISTS service_allowed_uoms (
    service_offering_id UUID REFERENCES service_offerings(id) ON DELETE CASCADE,
    uom_id UUID REFERENCES uoms(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (service_offering_id, uom_id)
);

CREATE TABLE IF NOT EXISTS inquiry_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_offering_id UUID REFERENCES service_offerings(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    publication_state VARCHAR(50) DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT idx_service_version UNIQUE(service_offering_id, version_number)
);

CREATE TABLE IF NOT EXISTS service_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_version_id UUID REFERENCES inquiry_template_versions(id) ON DELETE CASCADE,
    stable_field_code VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'select', 'date'
    display_order INT DEFAULT 0,
    requirement_stage VARCHAR(50) DEFAULT 'inquiry'
);

-- ==============================================================================
-- 4. IDENTITY & ORGANIZATIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    organization_type VARCHAR(50) DEFAULT 'prospect',
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_canonical_name ON organizations(lower(canonical_name));

CREATE TABLE IF NOT EXISTS organization_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'domain', 'registration_no', 'tax_id'
    original_value VARCHAR(255) NOT NULL,
    normalized_value VARCHAR(255) NOT NULL,
    validity VARCHAR(50) DEFAULT 'valid',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_identifier_value ON organization_identifiers(normalized_value);

CREATE TABLE IF NOT EXISTS organization_contact_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'switchboard'
    original_value VARCHAR(255) NOT NULL,
    normalized_value VARCHAR(255) NOT NULL,
    validity VARCHAR(50) DEFAULT 'valid',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255),
    type VARCHAR(50) DEFAULT 'office', -- 'headquarters', 'branch', 'venue'
    address TEXT,
    geography VARCHAR(100), -- City, Country
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(255) NOT NULL,
    identity_notes TEXT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS person_contact_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'linkedin'
    original_value VARCHAR(255) NOT NULL,
    normalized_value VARCHAR(255) NOT NULL,
    preferred BOOLEAN DEFAULT FALSE,
    validity VARCHAR(50) DEFAULT 'valid',
    source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_person_contact_norm ON person_contact_methods(normalized_value);

CREATE TABLE IF NOT EXISTS person_organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255),
    department VARCHAR(255),
    responsibility TEXT,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poc_suitabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES person_organization_roles(id) ON DELETE CASCADE,
    service_offering_id UUID REFERENCES service_offerings(id) ON DELETE CASCADE,
    responsibility_context TEXT,
    assessment VARCHAR(50), -- 'suitable', 'unsuitable', 'unknown'
    reason TEXT,
    assessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS key_relationship_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES person_organization_roles(id) ON DELETE CASCADE,
    standing VARCHAR(50),
    manually_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. EVENTS, CAMPAIGNS & OUTREACH
-- ==============================================================================

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    venue_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    edition_label VARCHAR(100) NOT NULL, -- e.g. 'GISEC 2026'
    starts_on DATE,
    ends_on DATE
);

CREATE TABLE IF NOT EXISTS event_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_edition_id UUID REFERENCES event_editions(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    hall VARCHAR(50),
    booth VARCHAR(50),
    source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_offering_id UUID REFERENCES service_offerings(id) ON DELETE SET NULL,
    event_edition_id UUID REFERENCES event_editions(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    objective TEXT,
    lifecycle VARCHAR(50) DEFAULT 'active',
    starts_on DATE,
    ends_on DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    pursuit_state VARCHAR(50) DEFAULT 'identified',
    CONSTRAINT idx_campaign_org_uniq UNIQUE (campaign_id, organization_id)
);

CREATE TABLE IF NOT EXISTS campaign_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_account_id UUID REFERENCES campaign_accounts(id) ON DELETE CASCADE,
    role_id UUID REFERENCES person_organization_roles(id) ON DELETE SET NULL,
    organization_contact_method_id UUID REFERENCES organization_contact_methods(id) ON DELETE SET NULL,
    lead_state VARCHAR(50) DEFAULT 'new',
    outreach_focus_state VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sequence_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_version_id UUID REFERENCES sequence_versions(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'email', 'wait', 'task'
    delay_days INT DEFAULT 0,
    template_subject VARCHAR(255),
    template_body TEXT
);

CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_contact_id UUID REFERENCES campaign_contacts(id) ON DELETE CASCADE,
    sequence_version_id UUID REFERENCES sequence_versions(id) ON DELETE SET NULL,
    execution_state VARCHAR(50) DEFAULT 'active',
    stop_reason VARCHAR(100),
    enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. COMMUNICATION, REVIEWS & TASKS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel VARCHAR(50) DEFAULT 'email',
    external_thread_id VARCHAR(255),
    subject VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    person_contact_method_id UUID REFERENCES person_contact_methods(id) ON DELETE SET NULL,
    organization_contact_method_id UUID REFERENCES organization_contact_methods(id) ON DELETE SET NULL,
    participant_role VARCHAR(50), -- 'sender', 'recipient', 'cc'
    endpoint_type_snapshot VARCHAR(50),
    endpoint_value_snapshot VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    channel VARCHAR(50) DEFAULT 'email',
    external_message_id VARCHAR(255),
    subject VARCHAR(255),
    body TEXT,
    occurred_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    delivery_state VARCHAR(50) DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS idx_message_ext_id ON messages(external_message_id);

CREATE TABLE IF NOT EXISTS review_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved'
    opened_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS review_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_item_id UUID REFERENCES review_items(id) ON DELETE CASCADE,
    reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    outcome VARCHAR(50) NOT NULL, -- 'interested', 'not_interested', 'wrong_person', etc.
    reason TEXT,
    decided_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    channel VARCHAR(50) NOT NULL, -- 'call', 'meeting', 'whatsapp', 'email'
    direction VARCHAR(20) DEFAULT 'outbound',
    occurred_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    outcome VARCHAR(100),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    review_item_id UUID REFERENCES review_items(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS endpoint_suppressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(255) NOT NULL,
    reason VARCHAR(100),
    source VARCHAR(100),
    suppressed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. CONTINUOUS COMMERCIAL & ONGOING JOBS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS ongoing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    campaign_account_id UUID REFERENCES campaign_accounts(id) ON DELETE SET NULL,
    job_number VARCHAR(100) UNIQUE,
    title VARCHAR(255) NOT NULL,
    inquiry_source VARCHAR(100),
    received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    summary_stage VARCHAR(100) DEFAULT 'inquiry',
    outcome VARCHAR(50), -- 'ongoing', 'completed', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    role_id UUID REFERENCES person_organization_roles(id) ON DELETE CASCADE,
    responsibility VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE
);

CREATE TABLE IF NOT EXISTS job_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 1,
    deadline DATE,
    current_progress VARCHAR(50) DEFAULT 'pending',
    start_date DATE,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS job_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    role VARCHAR(100),
    deadline DATE,
    current_progress VARCHAR(50) DEFAULT 'pending',
    name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS job_scope_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    service_offering_id UUID REFERENCES service_offerings(id) ON DELETE SET NULL,
    uom_id UUID REFERENCES uoms(id) ON DELETE SET NULL,
    quantity DECIMAL(15,4),
    description TEXT,
    current_scope_state VARCHAR(50) DEFAULT 'draft',
    current_progress VARCHAR(50) DEFAULT 'in_progress',
    title VARCHAR(255),
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_phase_id UUID REFERENCES job_phases(id) ON DELETE SET NULL,
    job_location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL,
    target_date DATE,
    display_order INT DEFAULT 1,
    capability_codes TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS service_specification_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES service_field_definitions(id) ON DELETE CASCADE,
    typed_value TEXT,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    quote_family_number VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quote_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    issued_at TIMESTAMPTZ,
    valid_until DATE,
    total_amount DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'AED',
    original_file_name VARCHAR(255),
    file_path TEXT,
    public_url TEXT,
    mime_type VARCHAR(150),
    size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    revision_note TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_version_id UUID REFERENCES quote_versions(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    job_phase_id UUID REFERENCES job_phases(id) ON DELETE SET NULL,
    job_location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL,
    service_offering_id UUID REFERENCES service_offerings(id) ON DELETE SET NULL,
    uom_id UUID REFERENCES uoms(id) ON DELETE SET NULL,
    quantity DECIMAL(15,4) CHECK (quantity IS NULL OR quantity > 0),
    unit_price DECIMAL(15,2) CHECK (unit_price IS NULL OR unit_price >= 0),
    line_total DECIMAL(15,2) CHECK (line_total IS NULL OR line_total >= 0),
    description_snapshot TEXT,
    service_label_snapshot VARCHAR(255),
    uom_label_snapshot VARCHAR(150),
    work_package_title_snapshot VARCHAR(255),
    phase_name_snapshot VARCHAR(255),
    location_name_snapshot VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_quote_lines_version_order ON quote_lines(quote_version_id, display_order, id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_work_package ON quote_lines(work_package_id) WHERE work_package_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    design_set_id UUID REFERENCES design_sets(id) ON DELETE CASCADE,
    file_path TEXT,
    original_file_name VARCHAR(255),
    public_url TEXT,
    mime_type VARCHAR(150),
    size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    revision_note TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
        OR (artifact_type = 'quotation' AND quote_version_id IS NOT NULL AND design_version_id IS NULL)
    )
);

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

CREATE TABLE IF NOT EXISTS customer_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    authorization_type VARCHAR(50) NOT NULL, -- 'po', 'email_confirm', 'deposit'
    customer_role_id UUID REFERENCES person_organization_roles(id) ON DELETE SET NULL,
    authorized_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    po_pending BOOLEAN DEFAULT FALSE,
    evidence_reference TEXT
);

CREATE TABLE IF NOT EXISTS financial_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    milestone VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'AED',
    zoho_reference VARCHAR(100),
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS job_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 8. SHARED EVIDENCE & HISTORY
-- ==============================================================================

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_entity_type VARCHAR(100) NOT NULL, -- 'ongoing_job', 'organization', 'person'
    target_entity_id UUID NOT NULL,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note_type VARCHAR(50) NOT NULL DEFAULT 'update',
    content TEXT NOT NULL,
    current_version_number INT NOT NULL DEFAULT 1,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ,
    source_key VARCHAR(255)
);

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

-- Supplier procurement and Job costing
CREATE TABLE IF NOT EXISTS supplier_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    capability_tags TEXT[] NOT NULL DEFAULT '{}',
    capability_notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_rfqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    requirement TEXT,
    required_by DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'closed', 'cancelled')),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_rfq_id UUID NOT NULL REFERENCES supplier_rfqs(id) ON DELETE CASCADE,
    supplier_profile_id UUID NOT NULL REFERENCES supplier_profiles(id) ON DELETE RESTRICT,
    reference VARCHAR(100),
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'AED',
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_until DATE,
    lead_time_days INTEGER CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
    note TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (supplier_rfq_id, supplier_profile_id, reference)
);

CREATE TABLE IF NOT EXISTS supplier_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    supplier_profile_id UUID NOT NULL REFERENCES supplier_profiles(id) ON DELETE RESTRICT,
    supplier_quote_id UUID REFERENCES supplier_quotes(id) ON DELETE SET NULL,
    reference VARCHAR(100),
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'committed' CHECK (status IN ('draft', 'committed', 'partially_delivered', 'delivered', 'cancelled')),
    committed_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (committed_amount >= 0),
    actual_amount NUMERIC(15,2) CHECK (actual_amount IS NULL OR actual_amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'AED',
    expected_delivery_at TIMESTAMPTZ,
    actual_delivery_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_commitment_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_commitment_id UUID NOT NULL REFERENCES supplier_commitments(id) ON DELETE CASCADE,
    update_type VARCHAR(30) NOT NULL CHECK (update_type IN ('progress', 'delivery', 'issue', 'resolution', 'cost_adjustment', 'cancellation')),
    note TEXT NOT NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_status ON supplier_profiles(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_rfqs_job ON supplier_rfqs(ongoing_job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_rfq ON supplier_quotes(supplier_rfq_id, amount);
CREATE INDEX IF NOT EXISTS idx_supplier_commitments_job ON supplier_commitments(ongoing_job_id, status, expected_delivery_at);
CREATE INDEX IF NOT EXISTS idx_supplier_commitment_updates ON supplier_commitment_updates(supplier_commitment_id, created_at DESC);

-- Operational resources and actual project time
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

-- Inventory and barcode movement ledger
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sku VARCHAR(100) NOT NULL UNIQUE, barcode VARCHAR(150) UNIQUE,
    name VARCHAR(255) NOT NULL, tracking_mode VARCHAR(30) NOT NULL CHECK (tracking_mode IN ('serialized', 'quantity_reusable', 'consumable')),
    uom_id UUID REFERENCES uoms(id) ON DELETE SET NULL, reorder_level NUMERIC(15,4) CHECK (reorder_level IS NULL OR reorder_level >= 0),
    default_unit_cost_aed NUMERIC(15,4) CHECK (default_unit_cost_aed IS NULL OR default_unit_cost_aed >= 0),
    notes TEXT, status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), parent_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    code VARCHAR(100) NOT NULL UNIQUE, barcode VARCHAR(150) UNIQUE, name VARCHAR(255) NOT NULL,
    location_type VARCHAR(30) NOT NULL CHECK (location_type IN ('warehouse', 'bin', 'vehicle', 'site', 'temporary')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inventory_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    asset_tag VARCHAR(100) NOT NULL UNIQUE, barcode VARCHAR(150) NOT NULL UNIQUE, serial_number VARCHAR(150), purchase_date DATE, notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')), created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    inventory_asset_id UUID REFERENCES inventory_assets(id) ON DELETE RESTRICT, ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL, quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
    starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
    note TEXT, created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_reservation_date_order CHECK (ends_at >= starts_at), CONSTRAINT serialized_reservation_quantity CHECK (inventory_asset_id IS NULL OR quantity = 1)
);
CREATE TABLE IF NOT EXISTS inventory_packing_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    reference VARCHAR(100) NOT NULL, origin_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    destination_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'packed', 'dispatched', 'returned', 'cancelled')),
    note TEXT, created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(ongoing_job_id, reference)
);
CREATE TABLE IF NOT EXISTS inventory_packing_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), packing_list_id UUID NOT NULL REFERENCES inventory_packing_lists(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT, inventory_asset_id UUID REFERENCES inventory_assets(id) ON DELETE RESTRICT,
    quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0), note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT serialized_packing_quantity CHECK (inventory_asset_id IS NULL OR quantity = 1)
);
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    inventory_asset_id UUID REFERENCES inventory_assets(id) ON DELETE RESTRICT,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('receipt', 'transfer', 'checkout', 'consumption', 'return', 'damage', 'loss', 'adjustment')),
    quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0), unit_cost_aed NUMERIC(15,4) CHECK (unit_cost_aed IS NULL OR unit_cost_aed >= 0),
    cost_source VARCHAR(30) NOT NULL DEFAULT 'unpriced' CHECK (cost_source IN ('manual', 'item_default', 'unpriced')),
    from_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    to_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL, ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE SET NULL,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL, job_activity_id UUID REFERENCES job_activities(id) ON DELETE SET NULL,
    packing_list_id UUID REFERENCES inventory_packing_lists(id) ON DELETE SET NULL, idempotency_key VARCHAR(150) NOT NULL UNIQUE,
    note TEXT, occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT serialized_movement_quantity CHECK (inventory_asset_id IS NULL OR quantity = 1),
    CONSTRAINT inventory_movement_has_location CHECK (from_location_id IS NOT NULL OR to_location_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(status, tracking_mode, name);
CREATE INDEX IF NOT EXISTS idx_inventory_assets_item ON inventory_assets(inventory_item_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_job ON inventory_reservations(ongoing_job_id, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_inventory_packing_job ON inventory_packing_lists(ongoing_job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(inventory_item_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_asset ON inventory_movements(inventory_asset_id, occurred_at DESC) WHERE inventory_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_job ON inventory_movements(ongoing_job_id, occurred_at DESC) WHERE ongoing_job_id IS NOT NULL;

-- Job costing and explicit completeness confirmation
CREATE TABLE IF NOT EXISTS job_cost_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('material', 'labor', 'supplier', 'transport', 'permit', 'rental', 'other')),
    description TEXT NOT NULL, estimated_amount_aed NUMERIC(15,2) NOT NULL CHECK (estimated_amount_aed >= 0),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS job_actual_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('transport', 'permit', 'rental', 'petty_cash', 'other')),
    description TEXT NOT NULL, amount_aed NUMERIC(15,2) NOT NULL CHECK (amount_aed >= 0), reference VARCHAR(150),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, voided_at TIMESTAMPTZ,
    voided_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, void_reason TEXT
);
CREATE TABLE IF NOT EXISTS job_cost_confirmations (
    ongoing_job_id UUID PRIMARY KEY REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, confirmed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmation_note TEXT, reopened_at TIMESTAMPTZ, reopened_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reopen_reason TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_job_cost_estimates_job ON job_cost_estimates(ongoing_job_id, category) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_actual_costs_job ON job_actual_costs(ongoing_job_id, category, occurred_at DESC) WHERE voided_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_job_cost ON inventory_movements(ongoing_job_id, movement_type) WHERE ongoing_job_id IS NOT NULL;
CREATE OR REPLACE FUNCTION invalidate_job_cost_confirmation() RETURNS TRIGGER AS $$
DECLARE affected_job_id UUID;
BEGIN
    affected_job_id := COALESCE(NEW.ongoing_job_id, OLD.ongoing_job_id);
    UPDATE job_cost_confirmations SET reopened_at=CURRENT_TIMESTAMP, reopened_by_user_id=NULL,
      reopen_reason='Automatically reopened because an underlying cost source changed.', updated_at=CURRENT_TIMESTAMP
    WHERE ongoing_job_id=affected_job_id AND reopened_at IS NULL;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_cost_reopen_supplier ON supplier_commitments;
CREATE TRIGGER trg_cost_reopen_supplier AFTER INSERT OR UPDATE OR DELETE ON supplier_commitments FOR EACH ROW EXECUTE FUNCTION invalidate_job_cost_confirmation();
DROP TRIGGER IF EXISTS trg_cost_reopen_time ON project_time_entries;
CREATE TRIGGER trg_cost_reopen_time AFTER INSERT OR UPDATE OR DELETE ON project_time_entries FOR EACH ROW EXECUTE FUNCTION invalidate_job_cost_confirmation();
DROP TRIGGER IF EXISTS trg_cost_reopen_inventory ON inventory_movements;
CREATE TRIGGER trg_cost_reopen_inventory AFTER INSERT OR UPDATE OR DELETE ON inventory_movements FOR EACH ROW EXECUTE FUNCTION invalidate_job_cost_confirmation();
DROP TRIGGER IF EXISTS trg_cost_reopen_other ON job_actual_costs;
CREATE TRIGGER trg_cost_reopen_other AFTER INSERT OR UPDATE OR DELETE ON job_actual_costs FOR EACH ROW EXECUTE FUNCTION invalidate_job_cost_confirmation();

-- Job closeout, final evidence and snag resolution
CREATE TABLE IF NOT EXISTS job_closeouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ongoing_job_id UUID NOT NULL UNIQUE REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    handover_at TIMESTAMPTZ, handover_contact_person_id UUID REFERENCES people(id) ON DELETE SET NULL, handover_note TEXT, completion_summary TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS job_closeout_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    evidence_type VARCHAR(30) NOT NULL CHECK (evidence_type IN ('final_photo', 'before_photo', 'installation_photo', 'handover_document', 'snag_photo', 'other')),
    title VARCHAR(255), file_name VARCHAR(255) NOT NULL, storage_path TEXT NOT NULL, public_url TEXT NOT NULL, mime_type VARCHAR(150),
    size_bytes BIGINT, checksum_sha256 VARCHAR(64) NOT NULL, captured_at TIMESTAMPTZ,
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS job_snags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL, location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL, description TEXT, severity VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'accepted')),
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL, due_at TIMESTAMPTZ, resolution TEXT, resolved_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_job_closeout_evidence_job ON job_closeout_evidence(ongoing_job_id, evidence_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_snags_job ON job_snags(ongoing_job_id, status, due_at);
CREATE OR REPLACE FUNCTION enforce_job_done_final_photo() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.summary_stage = 'Job Done' AND OLD.summary_stage IS DISTINCT FROM NEW.summary_stage
       AND NOT EXISTS (SELECT 1 FROM job_closeout_evidence WHERE ongoing_job_id = NEW.id AND evidence_type = 'final_photo') THEN
        RAISE EXCEPTION 'Upload at least one Final delivery photo before marking this Job Done.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_enforce_job_done_final_photo ON ongoing_jobs;
CREATE TRIGGER trg_enforce_job_done_final_photo BEFORE UPDATE OF summary_stage ON ongoing_jobs FOR EACH ROW EXECUTE FUNCTION enforce_job_done_final_photo();

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_entity_type VARCHAR(100) NOT NULL,
    target_entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    payload JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for audit performance
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);

-- ==============================================================================
-- UNIFIED CRM + ERP TASKS
-- ==============================================================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS owner VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES ongoing_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS reply_id UUID,
  ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS deleted_via_opportunity_id UUID REFERENCES ongoing_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_task_mongo_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_collection VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payload JSONB,
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
UPDATE tasks t SET owner_user_id=(SELECT u.id FROM users u WHERE u.is_active=TRUE AND (LOWER(BTRIM(u.name))=LOWER(BTRIM(t.owner)) OR LOWER(BTRIM(u.email))=LOWER(BTRIM(t.owner))) LIMIT 1)
WHERE t.owner_user_id IS NULL AND NULLIF(BTRIM(t.owner),'') IS NOT NULL
AND (SELECT COUNT(*) FROM users u WHERE u.is_active=TRUE AND (LOWER(BTRIM(u.name))=LOWER(BTRIM(t.owner)) OR LOWER(BTRIM(u.email))=LOWER(BTRIM(t.owner))))=1;
CREATE INDEX IF NOT EXISTS idx_tasks_owner_work ON tasks(owner_user_id, status, due_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_job_context ON tasks(opportunity_id, work_package_id, job_phase_id, job_location_id, job_activity_id) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, depends_on_task_id),
    CONSTRAINT task_dependency_not_self CHECK (task_id <> depends_on_task_id)
);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor ON task_dependencies(depends_on_task_id);
CREATE TABLE IF NOT EXISTS task_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    note TEXT, file_name VARCHAR(255), storage_path TEXT, public_url TEXT, mime_type VARCHAR(150), size_bytes BIGINT,
    checksum_sha256 VARCHAR(64), uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT task_evidence_has_content CHECK (NULLIF(BTRIM(note), '') IS NOT NULL OR storage_path IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_task_evidence_task ON task_evidence(task_id, created_at DESC);
CREATE OR REPLACE FUNCTION prevent_task_dependency_cycle() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (WITH RECURSIVE predecessors(id) AS (SELECT NEW.depends_on_task_id UNION SELECT td.depends_on_task_id FROM task_dependencies td JOIN predecessors p ON td.task_id=p.id) SELECT 1 FROM predecessors WHERE id=NEW.task_id) THEN
        RAISE EXCEPTION 'Task dependency would create a cycle';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prevent_task_dependency_cycle ON task_dependencies;
CREATE TRIGGER trg_prevent_task_dependency_cycle BEFORE INSERT OR UPDATE ON task_dependencies FOR EACH ROW EXECUTE FUNCTION prevent_task_dependency_cycle();
CREATE OR REPLACE FUNCTION validate_task_job_context() RETURNS TRIGGER AS $$
DECLARE context_job UUID; candidate_job UUID;
BEGIN
    context_job := NEW.opportunity_id;
    IF NEW.work_package_id IS NOT NULL THEN SELECT ongoing_job_id INTO candidate_job FROM job_scope_lines WHERE id=NEW.work_package_id; IF context_job IS NOT NULL AND candidate_job IS DISTINCT FROM context_job THEN RAISE EXCEPTION 'Task work package belongs to a different Ongoing Job'; END IF; context_job:=COALESCE(context_job,candidate_job); END IF;
    IF NEW.job_phase_id IS NOT NULL THEN SELECT ongoing_job_id INTO candidate_job FROM job_phases WHERE id=NEW.job_phase_id; IF context_job IS NOT NULL AND candidate_job IS DISTINCT FROM context_job THEN RAISE EXCEPTION 'Task phase belongs to a different Ongoing Job'; END IF; context_job:=COALESCE(context_job,candidate_job); END IF;
    IF NEW.job_location_id IS NOT NULL THEN SELECT ongoing_job_id INTO candidate_job FROM job_locations WHERE id=NEW.job_location_id; IF context_job IS NOT NULL AND candidate_job IS DISTINCT FROM context_job THEN RAISE EXCEPTION 'Task location belongs to a different Ongoing Job'; END IF; context_job:=COALESCE(context_job,candidate_job); END IF;
    IF NEW.job_activity_id IS NOT NULL THEN SELECT ongoing_job_id INTO candidate_job FROM job_activities WHERE id=NEW.job_activity_id; IF context_job IS NOT NULL AND candidate_job IS DISTINCT FROM context_job THEN RAISE EXCEPTION 'Task activity belongs to a different Ongoing Job'; END IF; context_job:=COALESCE(context_job,candidate_job); END IF;
    NEW.opportunity_id:=context_job; NEW.updated_at:=CURRENT_TIMESTAMP;
    IF NEW.status='blocked' AND NULLIF(BTRIM(NEW.blocked_reason),'') IS NULL THEN RAISE EXCEPTION 'A blocked task requires a blocker reason'; END IF;
    IF NEW.status='waiting' AND NULLIF(BTRIM(NEW.waiting_on),'') IS NULL THEN RAISE EXCEPTION 'A waiting task requires what or whom it is waiting on'; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_validate_task_job_context ON tasks;
CREATE TRIGGER trg_validate_task_job_context BEFORE INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION validate_task_job_context();

-- ==============================================================================
-- MOBILE FIELD EXECUTION
-- ==============================================================================
CREATE TABLE IF NOT EXISTS field_execution_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    job_activity_id UUID NOT NULL REFERENCES job_activities(id) ON DELETE CASCADE, resource_id UUID REFERENCES operational_resources(id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL CHECK (action IN ('start','pause','progress','problem','complete')), note TEXT, remaining_work TEXT,
    created_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, project_time_entry_id UUID REFERENCES project_time_entries(id) ON DELETE SET NULL,
    submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS field_execution_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), submission_id UUID NOT NULL REFERENCES field_execution_submissions(id) ON DELETE CASCADE,
    photo_type VARCHAR(30) NOT NULL DEFAULT 'progress_photo' CHECK (photo_type IN ('progress_photo','installation_photo','final_photo','problem_photo')),
    file_name VARCHAR(255) NOT NULL, storage_path TEXT NOT NULL, public_url TEXT NOT NULL, mime_type VARCHAR(150), size_bytes BIGINT,
    checksum_sha256 VARCHAR(64) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_field_submissions_user_day ON field_execution_submissions(submitted_by_user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_submissions_activity ON field_execution_submissions(job_activity_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_files_submission ON field_execution_files(submission_id, created_at);

-- ==============================================================================
-- JOB ACTIVATION AND DELIVERY PLAN BUILDING BLOCKS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS delivery_activity_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), stable_code VARCHAR(80) UNIQUE NOT NULL, title VARCHAR(255) NOT NULL,
    description TEXT, activity_type VARCHAR(50) NOT NULL, days_from_target INTEGER NOT NULL DEFAULT 0,
    duration_hours NUMERIC(8,2) NOT NULL DEFAULT 8 CHECK (duration_hours > 0), applicable_service_codes TEXT[] NOT NULL DEFAULT '{}',
    requires_location BOOLEAN NOT NULL DEFAULT FALSE, requires_work_package BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE, display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS job_delivery_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL, phase_id UUID REFERENCES job_phases(id) ON DELETE SET NULL,
    location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL, target_date DATE NOT NULL,
    activity_count INTEGER NOT NULL CHECK (activity_count > 0), activated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE job_activities ADD COLUMN IF NOT EXISTS delivery_activation_id UUID REFERENCES job_delivery_activations(id) ON DELETE SET NULL;
ALTER TABLE job_activities ADD COLUMN IF NOT EXISTS activity_template_id UUID REFERENCES delivery_activity_templates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_activity_templates_active ON delivery_activity_templates(active, display_order);
CREATE INDEX IF NOT EXISTS idx_job_delivery_activations_job ON job_delivery_activations(ongoing_job_id, activated_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_activities_activation ON job_activities(delivery_activation_id) WHERE delivery_activation_id IS NOT NULL;
INSERT INTO delivery_activity_templates(stable_code,title,description,activity_type,days_from_target,duration_hours,applicable_service_codes,requires_location,requires_work_package,display_order) VALUES
('site-survey','Site survey','Confirm dimensions, access, fixing surfaces, services and site restrictions.','site_survey',-14,4,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],TRUE,FALSE,10),
('production-design','Production design / artwork','Prepare the exact technical design, artwork or shop drawing used for delivery.','design',-12,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,20),
('client-approval','Client approval','Obtain approval for the exact design, artwork or production basis.','client_approval',-9,2,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,30),
('procurement','Procurement and supplier coordination','Confirm bought-out materials, outsourced work and supplier delivery dates.','procurement',-8,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,40),
('fabrication','Fabrication / production','Manufacture the approved physical deliverables.','fabrication',-7,24,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,50),
('printing','Printing and finishing','Print, laminate, mount and finish the approved graphics.','printing',-6,16,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket'],FALSE,TRUE,60),
('packing','Packing and dispatch readiness','Check, label and pack everything required for dispatch.','packing',-2,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],FALSE,TRUE,70),
('transport','Transport to site','Load and deliver materials, equipment and finished work to site.','transport',-1,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],TRUE,TRUE,80),
('installation','Installation / build','Install or build the approved work at the confirmed location.','installation',0,12,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],TRUE,TRUE,90),
('event-support','Live event support','Provide on-site operational or technical support during the event.','event_support',0,12,ARRAY['graduation-ceremonies','corporate-events-branding','exhibition-stands'],TRUE,FALSE,100),
('dismantling','Dismantling','Safely dismantle temporary work after the event or campaign.','dismantling',1,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','btl-mall-installations','btl-supermarket-hypermarket'],TRUE,TRUE,110),
('return','Return and reconciliation','Return reusable assets, record loss or damage, and reconcile remaining materials.','return',2,8,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','btl-mall-installations','btl-supermarket-hypermarket'],FALSE,FALSE,120),
('handover','Handover and final photographs','Confirm physical delivery and capture final photographic evidence.','other',1,2,ARRAY['exhibition-stands','graduation-ceremonies','corporate-events-branding','retail-branding-displays','signage-indoor-outdoor','showroom-office-branding','large-format-printing','vehicle-branding','product-display-stands','btl-mall-installations','btl-supermarket-hypermarket','mall-kiosks'],TRUE,FALSE,130)
ON CONFLICT(stable_code) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,activity_type=EXCLUDED.activity_type,days_from_target=EXCLUDED.days_from_target,duration_hours=EXCLUDED.duration_hours,applicable_service_codes=EXCLUDED.applicable_service_codes,requires_location=EXCLUDED.requires_location,requires_work_package=EXCLUDED.requires_work_package,display_order=EXCLUDED.display_order,updated_at=NOW();

-- ==============================================================================
-- COMMUNICATION TO JOB ACTIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS conversation_job_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE, link_reason TEXT,
    linked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, linked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id,ongoing_job_id)
);
CREATE TABLE IF NOT EXISTS communication_job_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_job_link_id UUID NOT NULL REFERENCES conversation_job_links(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    action_type VARCHAR(40) NOT NULL CHECK(action_type IN('link','task','requirement','change','decision','issue','artifact_decision')),
    target_table VARCHAR(80), target_entity_id UUID, summary TEXT NOT NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conversation_job_links_job ON conversation_job_links(ongoing_job_id,linked_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_actions_link ON communication_job_actions(conversation_job_link_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_actions_message ON communication_job_actions(message_id) WHERE message_id IS NOT NULL;

-- ==============================================================================
-- CAMPAIGN CONTACT COORDINATION
-- ==============================================================================
ALTER TABLE campaign_contacts
  ADD COLUMN IF NOT EXISTS focus_reason TEXT,
  ADD COLUMN IF NOT EXISTS focus_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS focus_source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS focus_source_poc_suitability_id UUID REFERENCES poc_suitabilities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS focus_selected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS campaign_contact_focus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), campaign_account_id UUID NOT NULL REFERENCES campaign_accounts(id) ON DELETE CASCADE,
  campaign_contact_id UUID NOT NULL REFERENCES campaign_contacts(id) ON DELETE CASCADE, event_type VARCHAR(60) NOT NULL,
  previous_state VARCHAR(50), new_state VARCHAR(50) NOT NULL, reason TEXT,
  source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  source_poc_suitability_id UUID REFERENCES poc_suitabilities(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL, metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaign_focus_events_account_time ON campaign_contact_focus_events(campaign_account_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_focus ON campaign_contacts(campaign_account_id,outreach_focus_state);

-- ==============================================================================
-- SEQUENCE EXECUTION ENGINE
-- ==============================================================================
ALTER TABLE sequence_launches ADD COLUMN IF NOT EXISTS launched_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sequence_launches ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ;
ALTER TABLE send_jobs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE send_jobs ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE send_jobs ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_send_jobs_idempotency_key ON send_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_send_jobs_runtime_queue ON send_jobs(status,manual_send,scheduled_for,created_at);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_runtime_context ON sequence_enrollments(sequence_id,campaign_contact_id,reset_at);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_launch_batch ON sequence_enrollments(launch_batch_id);
CREATE INDEX IF NOT EXISTS idx_send_jobs_enrollment_status ON send_jobs(enrollment_id,status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_role_account ON campaign_contacts(role_id,campaign_account_id);
