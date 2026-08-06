-- ==============================================================================
-- 31. QUOTE REVISION PROVENANCE AND APPEND-ONLY HISTORY
-- ==============================================================================
-- Context: quotations are authored in Zoho Books and recorded here. Zoho keeps
-- only the current document; EGS is the revision archive. That archive is the
-- thing Zoho structurally cannot provide, so it must be protected.
--
-- Confirmed workflow (unchanged by this migration):
--   A version is recorded when a quotation is SENT to the client. That is done
--   manually today, per Job. Draft edits in Zoho are not versions.
--
-- This migration makes the manual path safe now and the synced path a drop-in
-- later. Both write the same rows; only `provenance` differs. No rebuild, no
-- second model, no migration when Zoho integration is switched on.
--
-- Additive and idempotent.
-- ==============================================================================

BEGIN;

ALTER TABLE quote_versions
    ADD COLUMN IF NOT EXISTS provenance VARCHAR(20) NOT NULL DEFAULT 'manual',
    -- Set when the version was sent to the client. This is the event that
    -- defines a revision; it is recorded by a human today.
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sent_recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Populated only by a future Zoho sync. Null for every manual record.
    ADD COLUMN IF NOT EXISTS source_content_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS source_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS superseded_by_version_id UUID REFERENCES quote_versions(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quote_versions_provenance_check') THEN
        ALTER TABLE quote_versions
            ADD CONSTRAINT quote_versions_provenance_check
            CHECK (provenance IN ('manual', 'zoho_sync'));
    END IF;
END $$;

-- A revision number must be unique within its quote family. Without this, a
-- retry or a concurrent save can silently create two "version 2" rows and the
-- approval record becomes ambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_version_number
    ON quote_versions(quote_id, version_number);

CREATE INDEX IF NOT EXISTS idx_quote_versions_current
    ON quote_versions(quote_id, version_number DESC)
    WHERE superseded_at IS NULL;

-- ------------------------------------------------------- append-only history
-- The archive is the product. A sync that UPDATEs a version's content instead
-- of inserting a new one destroys exactly the history Zoho already lost, and it
-- would do so silently. Content is therefore immutable once written.
--
-- Mutable by design: supersession pointers, and the sent/approval bookkeeping
-- that is recorded after the fact.
CREATE OR REPLACE FUNCTION assert_quote_version_content_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quote_id           IS DISTINCT FROM OLD.quote_id
    OR NEW.version_number     IS DISTINCT FROM OLD.version_number
    OR NEW.total_amount       IS DISTINCT FROM OLD.total_amount
    OR NEW.currency           IS DISTINCT FROM OLD.currency
    OR NEW.checksum_sha256    IS DISTINCT FROM OLD.checksum_sha256
    OR NEW.file_path          IS DISTINCT FROM OLD.file_path
    OR NEW.original_file_name IS DISTINCT FROM OLD.original_file_name
    OR NEW.provenance         IS DISTINCT FROM OLD.provenance
    THEN
        RAISE EXCEPTION
            'Quote version content is immutable. Record a new version instead of editing version % of this quote.', OLD.version_number
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quote_version_immutable ON quote_versions;
CREATE TRIGGER trg_quote_version_immutable
    BEFORE UPDATE ON quote_versions
    FOR EACH ROW EXECUTE FUNCTION assert_quote_version_content_immutable();

-- Quote lines belong to their version's frozen snapshot and inherit the same rule.
CREATE OR REPLACE FUNCTION assert_quote_lines_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'Quote lines are an immutable snapshot of a sent revision. Record a new quote version instead.'
        USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quote_lines_append_only ON quote_lines;
CREATE TRIGGER trg_quote_lines_append_only
    BEFORE UPDATE OR DELETE ON quote_lines
    FOR EACH ROW EXECUTE FUNCTION assert_quote_lines_append_only();

COMMENT ON COLUMN quote_versions.provenance IS
    'manual = recorded by a person when the quotation was sent. zoho_sync = captured from Zoho Books. Same table, same shape; only the origin differs.';

COMMIT;
