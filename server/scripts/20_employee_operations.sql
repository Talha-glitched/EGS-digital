-- EGS ERP: operational employee context, team history, compliance and typed availability.
-- This intentionally excludes payroll, attendance, recruitment and performance management.

CREATE TABLE IF NOT EXISTS employee_operational_profiles (
    resource_id UUID PRIMARY KEY REFERENCES operational_resources(id) ON DELETE CASCADE,
    job_title VARCHAR(150),
    employment_type VARCHAR(30) NOT NULL DEFAULT 'permanent'
        CHECK (employment_type IN ('permanent', 'temporary', 'contract', 'freelance')),
    joined_on DATE,
    ended_on DATE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employee_profile_date_order CHECK (ended_on IS NULL OR joined_on IS NULL OR ended_on >= joined_on)
);

CREATE TABLE IF NOT EXISTS employee_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES operational_resources(id) ON DELETE CASCADE,
    certification_type VARCHAR(30) NOT NULL
        CHECK (certification_type IN ('site_access', 'safety', 'driving', 'equipment', 'trade', 'other')),
    title VARCHAR(200) NOT NULL,
    issuer VARCHAR(200),
    reference_number VARCHAR(120),
    issued_on DATE,
    expires_on DATE,
    notes TEXT,
    archived_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employee_certification_date_order CHECK (expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on)
);

CREATE TABLE IF NOT EXISTS resource_team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_resource_id UUID NOT NULL REFERENCES operational_resources(id) ON DELETE CASCADE,
    member_resource_id UUID NOT NULL REFERENCES operational_resources(id) ON DELETE CASCADE,
    membership_role VARCHAR(120),
    starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
    ends_on DATE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_membership_distinct_resources CHECK (team_resource_id <> member_resource_id),
    CONSTRAINT team_membership_date_order CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

-- Existing employee/contractor resources remain the identity source; this only gives them the new operational context.
INSERT INTO employee_operational_profiles (resource_id, employment_type)
SELECT id, CASE WHEN resource_type = 'contractor' THEN 'contract' ELSE 'permanent' END
FROM operational_resources
WHERE resource_type IN ('employee', 'contractor')
ON CONFLICT (resource_id) DO NOTHING;

CREATE OR REPLACE FUNCTION validate_employee_operations_resource_types()
RETURNS TRIGGER AS $$
DECLARE resource_kind VARCHAR(30); team_kind VARCHAR(30);
BEGIN
    IF TG_TABLE_NAME = 'resource_team_memberships' THEN
        SELECT resource_type INTO team_kind FROM operational_resources WHERE id = NEW.team_resource_id;
        SELECT resource_type INTO resource_kind FROM operational_resources WHERE id = NEW.member_resource_id;
        IF team_kind IS DISTINCT FROM 'team' OR resource_kind NOT IN ('employee', 'contractor') THEN
            RAISE EXCEPTION 'Team memberships require a team and an employee/contractor member';
        END IF;
    ELSE
        SELECT resource_type INTO resource_kind FROM operational_resources WHERE id = NEW.resource_id;
        IF resource_kind NOT IN ('employee', 'contractor') THEN
            RAISE EXCEPTION 'Employee operations records require an employee or contractor resource';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION initialize_employee_operational_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.resource_type IN ('employee', 'contractor') THEN
        INSERT INTO employee_operational_profiles (resource_id, employment_type, created_by_user_id, updated_by_user_id)
        VALUES (NEW.id, CASE WHEN NEW.resource_type = 'contractor' THEN 'contract' ELSE 'permanent' END, NEW.created_by_user_id, NEW.created_by_user_id)
        ON CONFLICT (resource_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION protect_employee_resource_kind()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.resource_type IN ('employee', 'contractor') AND NEW.resource_type NOT IN ('employee', 'contractor') THEN
        RAISE EXCEPTION 'Employee/contractor resources cannot be converted into non-people resources';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS initialize_employee_profile_from_resource ON operational_resources;
CREATE TRIGGER initialize_employee_profile_from_resource
AFTER INSERT OR UPDATE OF resource_type ON operational_resources
FOR EACH ROW EXECUTE FUNCTION initialize_employee_operational_profile();
DROP TRIGGER IF EXISTS protect_employee_resource_kind_change ON operational_resources;
CREATE TRIGGER protect_employee_resource_kind_change
BEFORE UPDATE OF resource_type ON operational_resources
FOR EACH ROW EXECUTE FUNCTION protect_employee_resource_kind();

DROP TRIGGER IF EXISTS validate_employee_profile_resource_type ON employee_operational_profiles;
CREATE TRIGGER validate_employee_profile_resource_type BEFORE INSERT OR UPDATE ON employee_operational_profiles
FOR EACH ROW EXECUTE FUNCTION validate_employee_operations_resource_types();
DROP TRIGGER IF EXISTS validate_employee_certification_resource_type ON employee_certifications;
CREATE TRIGGER validate_employee_certification_resource_type BEFORE INSERT OR UPDATE ON employee_certifications
FOR EACH ROW EXECUTE FUNCTION validate_employee_operations_resource_types();
DROP TRIGGER IF EXISTS validate_team_membership_resource_types ON resource_team_memberships;
CREATE TRIGGER validate_team_membership_resource_types BEFORE INSERT OR UPDATE ON resource_team_memberships
FOR EACH ROW EXECUTE FUNCTION validate_employee_operations_resource_types();

ALTER TABLE resource_availability_blocks
    ADD COLUMN IF NOT EXISTS block_type VARCHAR(30) NOT NULL DEFAULT 'other';

DO $$ BEGIN
    ALTER TABLE resource_availability_blocks
        ADD CONSTRAINT resource_availability_block_type_check
        CHECK (block_type IN ('leave', 'sick', 'training', 'external_booking', 'maintenance', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_profiles_employment ON employee_operational_profiles(employment_type, joined_on);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_expiry ON employee_certifications(expires_on) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employee_certifications_resource ON employee_certifications(resource_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_memberships_member_dates ON resource_team_memberships(member_resource_id, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_dates ON resource_team_memberships(team_resource_id, starts_on, ends_on);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_memberships_unique_start ON resource_team_memberships(team_resource_id, member_resource_id, starts_on);
