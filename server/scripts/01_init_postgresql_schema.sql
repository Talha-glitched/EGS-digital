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
    current_progress VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS job_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    role VARCHAR(100),
    deadline DATE,
    current_progress VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS job_scope_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    service_offering_id UUID REFERENCES service_offerings(id) ON DELETE SET NULL,
    uom_id UUID REFERENCES uoms(id) ON DELETE SET NULL,
    quantity DECIMAL(15,4),
    description TEXT,
    current_scope_state VARCHAR(50) DEFAULT 'draft',
    current_progress VARCHAR(50) DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS service_specification_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES service_field_definitions(id) ON DELETE CASCADE,
    typed_value TEXT,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    quote_family_number VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_version_id UUID REFERENCES quote_versions(id) ON DELETE CASCADE,
    service_offering_id UUID REFERENCES service_offerings(id) ON DELETE SET NULL,
    uom_id UUID REFERENCES uoms(id) ON DELETE SET NULL,
    quantity DECIMAL(15,4),
    unit_price DECIMAL(15,2),
    line_total DECIMAL(15,2),
    description_snapshot TEXT
);

CREATE TABLE IF NOT EXISTS design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

