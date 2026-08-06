-- EGS ERP: immutable structured quotation-line snapshots.

ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL;
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS job_phase_id UUID REFERENCES job_phases(id) ON DELETE SET NULL;
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS job_location_id UUID REFERENCES job_locations(id) ON DELETE SET NULL;
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 1;
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS service_label_snapshot VARCHAR(255);
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS uom_label_snapshot VARCHAR(150);
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS work_package_title_snapshot VARCHAR(255);
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS phase_name_snapshot VARCHAR(255);
ALTER TABLE quote_lines ADD COLUMN IF NOT EXISTS location_name_snapshot VARCHAR(255);

ALTER TABLE quote_lines DROP CONSTRAINT IF EXISTS quote_lines_quantity_positive;
ALTER TABLE quote_lines ADD CONSTRAINT quote_lines_quantity_positive CHECK (quantity IS NULL OR quantity > 0);
ALTER TABLE quote_lines DROP CONSTRAINT IF EXISTS quote_lines_unit_price_nonnegative;
ALTER TABLE quote_lines ADD CONSTRAINT quote_lines_unit_price_nonnegative CHECK (unit_price IS NULL OR unit_price >= 0);
ALTER TABLE quote_lines DROP CONSTRAINT IF EXISTS quote_lines_total_nonnegative;
ALTER TABLE quote_lines ADD CONSTRAINT quote_lines_total_nonnegative CHECK (line_total IS NULL OR line_total >= 0);

CREATE INDEX IF NOT EXISTS idx_quote_lines_version_order ON quote_lines(quote_version_id, display_order, id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_work_package ON quote_lines(work_package_id) WHERE work_package_id IS NOT NULL;
