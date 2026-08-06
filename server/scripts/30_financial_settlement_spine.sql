-- ==============================================================================
-- 30. FINANCIAL SETTLEMENT SPINE (Phase A - Zoho-integrated, no double entry)
-- ==============================================================================
-- Governing decision: CRM_FOUNDATION_SPEC.md D-040 (Confirmed by EGS)
--
--   "Zoho is authoritative. CRM stores operational payment milestones/summary
--    and Zoho reference, not a competing detailed ledger."
--   "The CRM does not become a second manually maintained invoice ledger."
--   "Zoho owns finance: CRM stores only operational milestones and references,
--    preventing double entry and reconciliation drift."
--
-- Therefore this migration deliberately does NOT create invoice, credit-note,
-- payment or allocation tables that a human would fill in by hand. Amounts and
-- balances are MIRRORED from Zoho Books and are read-only inside EGS.
--
-- What EGS owns (typed once, here):
--   * The operational payment milestone/summary per Ongoing Job.
--   * Physical delivery state.
--   * The intent to invoice, raised from an approved quote.
-- What Zoho owns (never typed here):
--   * Invoices, credit notes, payments, tax, balance, general ledger.
--
-- Mechanism is the one named in the roadmap mindmap: External Reference,
-- Sync status / Reconciliation, and a Transactional Outbox with idempotency key.
--
-- Additive and idempotent.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------- external identity map
-- "External Reference: Internal UUID, External system, External ID".
-- One generic map so every entity can carry Zoho/Apollo/legacy identity without
-- each table growing its own vendor columns.
CREATE TABLE IF NOT EXISTS external_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(60) NOT NULL,
    entity_id UUID NOT NULL,
    system VARCHAR(40) NOT NULL,          -- 'zoho_books', 'zoho_payroll', ...
    external_id VARCHAR(150) NOT NULL,
    external_number VARCHAR(150),
    sync_status VARCHAR(30) NOT NULL DEFAULT 'linked'
        CHECK (sync_status IN ('linked', 'pending', 'failed', 'stale', 'detached')),
    last_synced_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_external_reference UNIQUE (system, entity_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_references_entity
    ON external_references(entity_type, entity_id);

-- ------------------------------------------- Zoho finance mirror (read-only)
-- A projection of Zoho Books documents so EGS can SHOW settlement without
-- re-entering it. Every row originates from the Zoho API. No EGS user screen
-- may create or edit these rows - enforced by trigger below, not just by
-- convention, because this is the exact boundary that drifts in practice.
CREATE TABLE IF NOT EXISTS zoho_finance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(30) NOT NULL
        CHECK (document_type IN ('invoice', 'credit_note', 'customer_payment', 'bill', 'vendor_payment')),
    zoho_id VARCHAR(150) NOT NULL,
    zoho_number VARCHAR(150),
    zoho_status VARCHAR(50),              -- Zoho's own status string, unaltered
    -- Contextual links, resolved by the sync job where a confident match exists.
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE SET NULL,
    -- Authoritative figures as reported by Zoho. Never computed by EGS.
    total NUMERIC(14,2),
    balance NUMERIC(14,2),
    currency VARCHAR(3) DEFAULT 'AED',
    document_date DATE,
    due_date DATE,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_zoho_finance_document UNIQUE (document_type, zoho_id)
);

CREATE INDEX IF NOT EXISTS idx_zoho_finance_job
    ON zoho_finance_documents(ongoing_job_id, document_type);

CREATE INDEX IF NOT EXISTS idx_zoho_finance_open_invoices
    ON zoho_finance_documents(due_date)
    WHERE document_type = 'invoice' AND balance > 0;

-- The mirror is writable only by the sync process, which sets this flag for the
-- duration of its transaction. Any ordinary service or manual UPDATE is refused,
-- so EGS cannot quietly become the second ledger the spec forbids.
CREATE OR REPLACE FUNCTION assert_zoho_mirror_is_synced_only()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(current_setting('egs.zoho_sync', TRUE), 'off') <> 'on' THEN
        RAISE EXCEPTION
            'zoho_finance_documents is a read-only mirror of Zoho Books. Records may only be written by the Zoho sync process (set egs.zoho_sync).'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_zoho_mirror_readonly ON zoho_finance_documents;
CREATE TRIGGER trg_zoho_mirror_readonly
    BEFORE INSERT OR UPDATE OR DELETE ON zoho_finance_documents
    FOR EACH ROW EXECUTE FUNCTION assert_zoho_mirror_is_synced_only();

-- ------------------------------------------------------ transactional outbox
-- "Transactional Outbox: Reliable background processing, Idempotency key.
--  WHEN: ERP change must synchronize externally."
-- EGS commits the operational fact and the intent to sync in one transaction;
-- a worker delivers it to Zoho. The idempotency key makes retries safe, so a
-- network failure can never produce two invoices in Zoho.
CREATE TABLE IF NOT EXISTS integration_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system VARCHAR(40) NOT NULL DEFAULT 'zoho_books',
    operation VARCHAR(60) NOT NULL,       -- 'create_draft_invoice', 'fetch_job_settlement', ...
    aggregate_type VARCHAR(60) NOT NULL,
    aggregate_id UUID NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    delivered_at TIMESTAMPTZ,
    external_id VARCHAR(150),             -- what Zoho returned
    requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_outbox_idempotency UNIQUE (system, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_outbox_due
    ON integration_outbox(status, next_attempt_at)
    WHERE status IN ('pending', 'failed');

-- ------------------------------------------- operational milestone (EGS-owned)
-- The spec's vocabulary: "waiting for PO/approval, awaiting initial downpayment,
-- initial payment received, awaiting final payment, or fully paid". This is a
-- coarse operational SUMMARY, deliberately not a partial-payment ledger.
ALTER TABLE financial_milestones
    ADD COLUMN IF NOT EXISTS milestone_state VARCHAR(40),
    ADD COLUMN IF NOT EXISTS due_on DATE,
    ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS confirmed_from VARCHAR(30),   -- 'zoho_sync' | 'human'
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_milestones_state_check') THEN
        ALTER TABLE financial_milestones
            ADD CONSTRAINT financial_milestones_state_check
            CHECK (milestone_state IS NULL OR milestone_state IN (
                'waiting_po_approval', 'awaiting_initial_downpayment', 'initial_payment_received',
                'awaiting_final_payment', 'fully_paid'
            ));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_financial_milestones_job
    ON financial_milestones(ongoing_job_id, display_order);

COMMENT ON COLUMN financial_milestones.is_paid IS
    'Frozen legacy flag. Settlement truth is the Zoho mirror; operational position is milestone_state.';

-- ------------------------------------------- independent operational statuses
-- Job Done requires delivered AND fully paid as SEPARATE facts (spec :750).
-- Physical delivery is EGS-owned; payment comes from Zoho. Neither is inferred
-- from the other.
ALTER TABLE ongoing_jobs
    ADD COLUMN IF NOT EXISTS physical_delivery_state VARCHAR(20) NOT NULL DEFAULT 'not_delivered',
    ADD COLUMN IF NOT EXISTS physically_delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS physical_delivery_updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ongoing_jobs_physical_delivery_state_check') THEN
        ALTER TABLE ongoing_jobs
            ADD CONSTRAINT ongoing_jobs_physical_delivery_state_check
            CHECK (physical_delivery_state IN ('not_delivered', 'delivered'));
    END IF;
END $$;

UPDATE ongoing_jobs
   SET physical_delivery_state = 'delivered',
       physically_delivered_at = COALESCE(physically_delivered_at, closed_at, updated_at)
 WHERE LOWER(COALESCE(summary_stage, '')) = 'job done'
   AND physical_delivery_state = 'not_delivered';

-- ------------------------------------------------------- derived read model
-- Settlement has TWO sources, in strict priority order:
--
--   1. The Zoho mirror, once integration exists. Authoritative amounts.
--   2. The human-maintained operational milestone, used until then. This is
--      exactly what D-040 sanctions the CRM to hold: "operational payment
--      milestones/summary and Zoho reference".
--
-- Both write to the SAME records, so enabling the Zoho sync later changes
-- where the answer comes from without any migration or rebuild. The
-- settlement_source column always states which one answered, so nobody
-- mistakes a hand-set milestone for a reconciled balance.
CREATE OR REPLACE VIEW job_settlement_status AS
WITH zoho_invoices AS (
    SELECT ongoing_job_id,
           COUNT(*)                                              AS invoice_count,
           SUM(total)                                            AS invoiced_total,
           SUM(balance)                                          AS outstanding,
           MAX(synced_at)                                        AS last_synced_at,
           MIN(due_date) FILTER (WHERE COALESCE(balance, 0) > 0) AS earliest_unpaid_due_on
    FROM zoho_finance_documents
    WHERE document_type = 'invoice'
      AND ongoing_job_id IS NOT NULL
      AND COALESCE(zoho_status, '') <> 'void'
    GROUP BY ongoing_job_id
),
milestone AS (
    SELECT DISTINCT ON (fm.ongoing_job_id)
           fm.ongoing_job_id, fm.milestone_state, fm.zoho_reference,
           fm.confirmed_at, fm.confirmed_from
    FROM financial_milestones fm
    WHERE fm.milestone_state IS NOT NULL
    ORDER BY fm.ongoing_job_id, fm.display_order DESC, fm.id DESC
),
resolved AS (
    SELECT j.id AS ongoing_job_id,
           z.invoice_count, z.invoiced_total, z.outstanding,
           z.last_synced_at, z.earliest_unpaid_due_on,
           m.milestone_state, m.zoho_reference, m.confirmed_at, m.confirmed_from,
           CASE WHEN z.invoice_count IS NOT NULL THEN 'zoho_sync'
                WHEN m.milestone_state IS NOT NULL THEN 'manual_milestone'
                ELSE 'unrecorded' END AS settlement_source,
           CASE
               -- Synced truth wins whenever it exists.
               WHEN z.invoice_count IS NOT NULL THEN
                   CASE WHEN COALESCE(z.outstanding, 0) <= 0.005 THEN 'fully_paid'
                        WHEN COALESCE(z.outstanding, 0) < COALESCE(z.invoiced_total, 0) THEN 'partially_paid'
                        ELSE 'outstanding' END
               -- Otherwise fall back to the operational milestone a human set.
               WHEN m.milestone_state = 'fully_paid'                 THEN 'fully_paid'
               WHEN m.milestone_state = 'initial_payment_received'   THEN 'partially_paid'
               WHEN m.milestone_state = 'awaiting_final_payment'     THEN 'partially_paid'
               WHEN m.milestone_state = 'awaiting_initial_downpayment' THEN 'outstanding'
               WHEN m.milestone_state = 'waiting_po_approval'        THEN 'not_invoiced'
               ELSE 'unrecorded'
           END AS payment_status
    FROM ongoing_jobs j
    LEFT JOIN zoho_invoices z ON z.ongoing_job_id = j.id
    LEFT JOIN milestone m ON m.ongoing_job_id = j.id
    WHERE j.deleted_at IS NULL
)
SELECT j.id AS ongoing_job_id,
       j.job_number,
       j.title,
       j.value_aed,
       j.physical_delivery_state,
       j.physically_delivered_at,
       COALESCE(r.invoice_count, 0) AS zoho_invoice_count,
       r.invoiced_total,
       r.outstanding,
       CASE WHEN r.invoiced_total IS NOT NULL
            THEN r.invoiced_total - COALESCE(r.outstanding, 0) END AS received_total,
       r.last_synced_at,
       r.earliest_unpaid_due_on,
       r.milestone_state AS operational_milestone_state,
       r.zoho_reference AS milestone_zoho_reference,
       r.confirmed_at AS milestone_confirmed_at,
       r.confirmed_from AS milestone_confirmed_from,
       -- Always states which source answered, so a hand-set milestone is never
       -- mistaken for a reconciled Zoho balance.
       r.settlement_source,
       r.payment_status,
       -- Due dates only exist once invoices are synced, so overdue stays a
       -- Zoho-derived fact and is never guessed from a milestone.
       (r.earliest_unpaid_due_on IS NOT NULL AND r.earliest_unpaid_due_on < CURRENT_DATE) AS is_overdue,
       CASE WHEN r.earliest_unpaid_due_on IS NOT NULL AND r.earliest_unpaid_due_on < CURRENT_DATE
            THEN (CURRENT_DATE - r.earliest_unpaid_due_on) END AS days_overdue,
       -- Works on either source: delivered, and settlement is not complete.
       (j.physical_delivery_state = 'delivered'
        AND r.payment_status IN ('outstanding', 'partially_paid', 'not_invoiced')) AS is_delivered_but_unpaid,
       -- Advisory only. Job Done stays a human transition with a warning.
       (j.physical_delivery_state = 'delivered'
        AND r.payment_status = 'fully_paid') AS is_ready_for_job_done,
       -- Surfaces Jobs nobody has recorded a settlement position for at all,
       -- so silence is visible instead of looking like "nothing owed".
       (r.settlement_source = 'unrecorded') AS settlement_unrecorded
FROM ongoing_jobs j
JOIN resolved r ON r.ongoing_job_id = j.id
WHERE j.deleted_at IS NULL;

COMMIT;
