-- EGS ERP: supplier identity, quotation comparison, commitments, delivery and cost history.

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
