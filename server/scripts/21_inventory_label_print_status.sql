-- Tracks whether an item's QR label has actually been printed, so "Print labels" can
-- default to only the new/unprinted ones while still allowing manual reprints.

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS label_printed_at TIMESTAMPTZ;
