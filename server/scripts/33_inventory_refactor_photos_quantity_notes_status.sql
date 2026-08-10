-- Migration 33: Inventory items refactor for multi-photos, quantity, notes, and discarded status.

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Drop existing check constraints on current_status
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'inventory_items' AND column_name = 'current_status'
  ) LOOP
    EXECUTE 'ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_current_status_check
  CHECK (current_status IN ('warehouse', 'job', 'discarded'));

-- Backfill photo_urls from photo_url if photo_urls array is empty
UPDATE inventory_items
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR cardinality(photo_urls) = 0);
