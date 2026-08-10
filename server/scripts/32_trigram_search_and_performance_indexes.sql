-- ==============================================================================
-- 32. TRIGRAM SEARCH & PERFORMANCE INDEXES
-- ==============================================================================
-- Context: PostgreSQL default B-tree indexes cannot index ILIKE '%term%' wildcard queries.
-- Enabling pg_trgm GIN indexes accelerates substring searches across People,
-- Organizations, Ongoing Jobs, and Tasks from full table scans (400ms+) to <15ms.

-- Reset any previously aborted transaction state in the session
ROLLBACK;

BEGIN;

-- 1. Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN Trigram Indexes for Substring & Wildcard Searching (ILIKE '%query%')
CREATE INDEX IF NOT EXISTS idx_people_display_name_trgm 
    ON people USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_orgs_canonical_name_trgm 
    ON organizations USING gin (canonical_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_orgs_trading_name_trgm 
    ON organizations USING gin (trading_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ongoing_jobs_title_trgm 
    ON ongoing_jobs USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm 
    ON tasks USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_desc_trgm 
    ON tasks USING gin (description gin_trgm_ops);

-- 3. Partial B-Tree Indexes for Active Records (Excludes soft-deleted/archived rows)
CREATE INDEX IF NOT EXISTS idx_ongoing_jobs_active_updated 
    ON ongoing_jobs (updated_at DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_people_active_updated 
    ON people (updated_at DESC) 
    WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orgs_active_updated 
    ON organizations (updated_at DESC) 
    WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_active_created 
    ON tasks (created_at DESC) 
    WHERE deleted_at IS NULL;

-- 4. Foreign Key and Composite Join Indexes
CREATE INDEX IF NOT EXISTS idx_person_contact_methods_person_id 
    ON person_contact_methods (person_id, type);

CREATE INDEX IF NOT EXISTS idx_person_contact_methods_lookup 
    ON person_contact_methods (type, normalized_value);

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_account_id 
    ON campaign_contacts (campaign_account_id, role_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user 
    ON tasks (owner_user_id, status) 
    WHERE deleted_at IS NULL;

COMMIT;
