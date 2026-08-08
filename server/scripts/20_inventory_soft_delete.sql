-- Soft-delete + photo retention for the warehouse tracker.
-- Deleting an item never removes it or its photo immediately: it's marked deleted_at
-- so it shows up in Data Recovery, and the photo file is purged automatically by a
-- daily cron once it has been deleted for 60+ days (see inventoryPhotoRetentionService.js).

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS photo_purged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_inventory_items_deleted_at ON inventory_items(deleted_at) WHERE deleted_at IS NOT NULL;
