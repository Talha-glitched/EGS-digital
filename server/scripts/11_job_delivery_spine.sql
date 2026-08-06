-- EGS ERP: shared delivery spine for every physical Job.
-- Work packages are deliberately flexible: service classification is optional,
-- while phases and locations can be attached as the Job becomes clearer.

INSERT INTO service_families (code, name, description)
VALUES ('egs-services', 'EGS Services', 'Custom exhibition, event branding, signage, print, fabrication, and installation services.')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO service_offerings (family_id, stable_code, canonical_label, definition)
SELECT sf.id, seed.stable_code, seed.canonical_label, seed.definition
FROM service_families sf
CROSS JOIN (VALUES
    ('graduation-ceremonies', 'Graduation Ceremonies', 'Graduation production, staging, branding, guest flow, and related deliverables.'),
    ('exhibition-stands', 'Exhibition Stands', 'Design, fabrication, build, and dismantling of exhibition stands.'),
    ('corporate-events-branding', 'Corporate Events Branding', 'Event staging, branding, signage, decor, and supporting production.'),
    ('retail-branding-displays', 'Retail Branding & Displays', 'In-store product promotion, branded fixtures, gondolas, freezers, and displays.'),
    ('signage-indoor-outdoor', 'Signage Indoor & Outdoor', 'Internal and external illuminated or non-illuminated signage.'),
    ('showroom-office-branding', 'Showroom & Office Branding', 'Wall, glass, reception, and environmental workplace branding.'),
    ('large-format-printing', 'Large Format Printing', 'Large-format printed graphics, mounting, lamination, and finishing.'),
    ('vehicle-branding', 'Vehicle Branding', 'Vehicle graphics, wraps, branding, and installation.'),
    ('product-display-stands', 'Product Display Stands', 'Custom product stands, plinths, pack shots, and promotional displays.'),
    ('btl-mall-installations', 'BTL Mall Installations', 'Below-the-line campaign fabrication and installation in malls.'),
    ('btl-supermarket-hypermarket', 'BTL Supermarket & Hypermarket', 'Below-the-line campaign fabrication and installation in grocery retail.'),
    ('mall-kiosks', 'Mall Kiosks', 'Design coordination, joinery, fabrication, approvals, and installation of mall kiosks.')
) AS seed(stable_code, canonical_label, definition)
WHERE sf.code = 'egs-services'
ON CONFLICT (stable_code) DO UPDATE
SET canonical_label = EXCLUDED.canonical_label,
    definition = EXCLUDED.definition,
    family_id = EXCLUDED.family_id;

INSERT INTO uoms (stable_code, label, unit_family) VALUES
    ('lump-sum', 'Lump sum', 'commercial'),
    ('sqm', 'Square metre', 'area'),
    ('linear-metre', 'Linear metre', 'length'),
    ('piece', 'Piece', 'count'),
    ('set', 'Set', 'count'),
    ('vehicle', 'Vehicle', 'count'),
    ('location', 'Location', 'count'),
    ('event', 'Event', 'count'),
    ('day', 'Day', 'time')
ON CONFLICT (stable_code) DO UPDATE SET label = EXCLUDED.label, unit_family = EXCLUDED.unit_family;

ALTER TABLE job_phases ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE job_phases ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE job_phases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_phases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_phases ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE job_locations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE job_locations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE job_locations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE job_locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_locations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS job_phase_id UUID REFERENCES job_phases(id) ON DELETE SET NULL;
ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS job_location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL;
ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 1;
ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS capability_codes TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_scope_lines ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE job_scope_lines
SET title = COALESCE(NULLIF(BTRIM(title), ''), NULLIF(BTRIM(description), ''), 'Work package')
WHERE title IS NULL OR BTRIM(title) = '';

CREATE INDEX IF NOT EXISTS idx_job_phases_active
    ON job_phases(ongoing_job_id, display_order, deadline) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_locations_active
    ON job_locations(ongoing_job_id, deadline) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_scope_lines_active
    ON job_scope_lines(ongoing_job_id, display_order, target_date) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_scope_lines_phase ON job_scope_lines(job_phase_id);
CREATE INDEX IF NOT EXISTS idx_job_scope_lines_location ON job_scope_lines(job_location_id);
