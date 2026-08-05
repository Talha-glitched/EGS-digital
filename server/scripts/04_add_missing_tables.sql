-- ==============================================================================
-- EGS CRM PostgreSQL Phase 0 DDL Additions
-- Script: 04_add_missing_tables.sql
-- ==============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- completed_jobs (migrates from CompletedJob Mongoose model)
CREATE TABLE IF NOT EXISTS completed_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_no INT,
    date TIMESTAMPTZ,
    sales_person VARCHAR(255) DEFAULT '',
    company VARCHAR(255) DEFAULT '',
    company_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    contact_person VARCHAR(255) DEFAULT '',
    contact_number VARCHAR(255) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    type_of_job VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    current_status VARCHAR(100) DEFAULT 'Job Done',
    responsible_person VARCHAR(255) DEFAULT '',
    due_date TIMESTAMPTZ,
    amount DECIMAL(15,2) DEFAULT 0,
    received DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    job_review TEXT DEFAULT '',
    opportunity_id UUID REFERENCES ongoing_jobs(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- daily_review_records (migrates from DailyReviewRecord Mongoose model)
CREATE TABLE IF NOT EXISTS daily_review_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_date VARCHAR(10) NOT NULL,
    section VARCHAR(50) NOT NULL,
    completed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_by_name VARCHAR(255) NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_daily_review UNIQUE (business_date, section)
);

-- analytics_snapshots (migrates from AnalyticsSnapshot Mongoose model)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- revenue_entries (migrates from RevenueEntry Mongoose model)
CREATE TABLE IF NOT EXISTS revenue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'AED',
    description TEXT DEFAULT '',
    closed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    logged_by VARCHAR(255) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Alter campaigns table for additional fields needed by ProjectCampaign model
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status_source VARCHAR(10) DEFAULT 'auto';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_email VARCHAR(255) DEFAULT '';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS from_name VARCHAR(255) DEFAULT 'Exhibit Graphic Sign';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_companies_count INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS companies_with_pocs INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS companies_responded INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS financial_ledger JSONB DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);
