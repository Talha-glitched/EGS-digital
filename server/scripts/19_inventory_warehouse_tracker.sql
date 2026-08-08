-- Simple warehouse tracker: photo + name + QR-taggable item, current location is Warehouse or a Job.
-- Additive only. Existing inventory_* tables (movements, reservations, packing, assets, locations) are
-- left untouched — job costing, operational reporting and field execution still read them directly.

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS slug VARCHAR(16) UNIQUE,
  ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) NOT NULL DEFAULT 'warehouse' CHECK (current_status IN ('warehouse', 'job')),
  ADD COLUMN IF NOT EXISTS current_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_slug ON inventory_items(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_current_job ON inventory_items(current_job_id) WHERE current_job_id IS NOT NULL;
