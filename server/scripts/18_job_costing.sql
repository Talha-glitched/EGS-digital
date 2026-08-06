-- EGS ERP: Job costing without replacing Zoho accounting.

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS default_unit_cost_aed NUMERIC(15,4)
  CHECK (default_unit_cost_aed IS NULL OR default_unit_cost_aed >= 0);

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS unit_cost_aed NUMERIC(15,4)
  CHECK (unit_cost_aed IS NULL OR unit_cost_aed >= 0);

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS cost_source VARCHAR(30) NOT NULL DEFAULT 'unpriced'
  CHECK (cost_source IN ('manual', 'item_default', 'unpriced'));

CREATE TABLE IF NOT EXISTS job_cost_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('material', 'labor', 'supplier', 'transport', 'permit', 'rental', 'other')),
    description TEXT NOT NULL,
    estimated_amount_aed NUMERIC(15,2) NOT NULL CHECK (estimated_amount_aed >= 0),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS job_actual_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('transport', 'permit', 'rental', 'petty_cash', 'other')),
    description TEXT NOT NULL,
    amount_aed NUMERIC(15,2) NOT NULL CHECK (amount_aed >= 0),
    reference VARCHAR(150),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    voided_at TIMESTAMPTZ,
    voided_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    void_reason TEXT
);

CREATE TABLE IF NOT EXISTS job_cost_confirmations (
    ongoing_job_id UUID PRIMARY KEY REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmation_note TEXT,
    reopened_at TIMESTAMPTZ,
    reopened_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reopen_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_cost_estimates_job
  ON job_cost_estimates(ongoing_job_id, category) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_actual_costs_job
  ON job_actual_costs(ongoing_job_id, category, occurred_at DESC) WHERE voided_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_job_cost
  ON inventory_movements(ongoing_job_id, movement_type) WHERE ongoing_job_id IS NOT NULL;

CREATE OR REPLACE FUNCTION invalidate_job_cost_confirmation() RETURNS TRIGGER AS $$
DECLARE affected_job_id UUID;
BEGIN
    affected_job_id := COALESCE(NEW.ongoing_job_id, OLD.ongoing_job_id);
    UPDATE job_cost_confirmations
       SET reopened_at = CURRENT_TIMESTAMP,
           reopened_by_user_id = NULL,
           reopen_reason = 'Automatically reopened because an underlying cost source changed.',
           updated_at = CURRENT_TIMESTAMP
     WHERE ongoing_job_id = affected_job_id AND reopened_at IS NULL;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cost_reopen_supplier ON supplier_commitments;
CREATE TRIGGER trg_cost_reopen_supplier AFTER INSERT OR UPDATE OR DELETE ON supplier_commitments
FOR EACH ROW EXECUTE FUNCTION invalidate_job_cost_confirmation();
DROP TRIGGER IF EXISTS trg_cost_reopen_time ON project_time_entries;
CREATE TRIGGER trg_cost_reopen_time AFTER INSERT OR UPDATE OR DELETE ON project_time_entries
FOR EACH ROW EXECUTE FUNCTION invalidate_job_cost_confirmation();
DROP TRIGGER IF EXISTS trg_cost_reopen_inventory ON inventory_movements;
CREATE TRIGGER trg_cost_reopen_inventory AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION invalidate_job_cost_confirmation();
DROP TRIGGER IF EXISTS trg_cost_reopen_other ON job_actual_costs;
CREATE TRIGGER trg_cost_reopen_other AFTER INSERT OR UPDATE OR DELETE ON job_actual_costs
FOR EACH ROW EXECUTE FUNCTION invalidate_job_cost_confirmation();
