# EGS Mongo-to-SQL AI Agent Migration Guide

Status: Execution control document for Talha and any coding AI agent  
Business authority: [CRM Foundation Specification](./CRM_FOUNDATION_SPEC.md)  
Logical target: [EGS CRM Logical ERD](./CRM_LOGICAL_ERD.md)  
Live source evidence: [Live Mongo Data Audit](./CRM_LIVE_MONGO_DATA_AUDIT.md)

## Mission

Move the EGS CRM from its current Mongo/Mongoose shape to a relational SQL foundation without carrying forward the current entity conflations, losing historical evidence, inventing facts, or making the frontend the owner of business truth.

This is not a one-command data conversion. It is a controlled translation from legacy documents into the target business model.

## What can begin before the 12-service catalogue arrives

Talha can begin source protection/profiling, physical schema design, migration control tables, identity/organization mapping, communication reconciliation design, and the configurable Service/UOM/Inquiry Template shell immediately.

The missing catalogue content blocks only the final approved mapping of legacy service strings, the service-specific form questions, and any target record that requires a real Service Offering reference such as a Campaign or Job Scope Line. Such records may remain in staging or use an explicitly approved temporary unmapped reference; the agent must not guess a service merely to make an import pass.

## Authority order

When instructions conflict, use this order:

1. Confirmed decisions in `CRM_FOUNDATION_SPEC.md`.
2. Relationships and constraints in `CRM_LOGICAL_ERD.md`.
3. Observed source facts in `CRM_LIVE_MONGO_DATA_AUDIT.md` and the fresh audit for the current migration run.
4. Approved migration mapping and exception decisions recorded during execution.
5. Existing application behavior and Mongo/Mongoose models as evidence of the current state—not as the target design.
6. AI assumptions only for reversible implementation details that do not change business meaning.

The agent must stop and record an issue when a choice would change entity boundaries, source of truth, identity resolution, historical meaning, or user-visible workflow meaning.

## Non-negotiable agent rules

1. Never translate each Mongo collection into one same-named SQL table by default.
2. Never use a name, email, LinkedIn URL, company domain, or Mongo `_id` as the permanent business identity key. Preserve Mongo IDs in the migration crosswalk.
3. Never auto-merge People or Organizations. Repeated personal email/LinkedIn and repeated/similar organization evidence create human review cases.
4. Never create a fictional Person for a generic inbox or switchboard.
5. Never overwrite or discard an issued message, quote/design version, approval, audit record, or source record.
6. Never copy `CompletedJob` into a separate target completed-jobs entity. The target uses one continuous Ongoing Job.
7. Never treat Mongo `Lead` as target Person. One Lead document may contain Person, contact endpoint, employer Role, Campaign Contact, POC, relationship, outreach, and review facts.
8. Never treat CRM finance as an invoice/payment ledger. Zoho remains authoritative for detailed finance.
9. Never invent the 12 services, UOM mappings, service questions, approvals, dates, owners, or missing relationships.
10. Never silently drop an unknown enum/string. Preserve the original value and put ambiguous mappings in an exception queue.
11. Never run destructive cleanup or source deletion as part of transformation. Source Mongo remains unchanged until a separately approved retirement step.
12. Every import operation must be repeatable or safely resumable, observable, and reconciled.
13. Every target row must be traceable to source record(s), an approved manual decision, or a documented system derivation.
14. Use UTC timestamps in storage and preserve the original timezone/offset when present. EGS display defaults can use Asia/Dubai.
15. Store monetary values using fixed-precision decimal and an explicit currency; never binary floating point.
16. Preserve every source Mongo document in a restricted, immutable SQL migration-evidence record using canonical Extended JSON plus a checksum. Normalization does not authorize discarding the original representation.
17. Give every source document exactly one terminal disposition: normalized, consolidated, legacy-archive-only, exception-pending, empty-collection exclusion, or failed. `failed` must be zero or explicitly accepted before cutover.

## Required migration artifacts

The AI agent must create and maintain these artifacts in the repository before production cutover:

| Artifact | Required content |
|---|---|
| Schema proposal | Tables, columns, PKs, FKs, nullability, checks, unique rules, indexes, archive behavior, and history strategy mapped to the ERD. |
| Source inventory | Every Mongo collection, document count, relevant indexes, reference fields, embedded arrays, enum values, null/missing rates, and orphan references. |
| Field mapping register | Source path → transform → target table/column → confidence → fallback/review rule. |
| ID crosswalk | Source system, collection, Mongo `_id`, target entity/table, SQL ID, import run, status, and resolution notes. Supports one source to several targets and several sources to one approved survivor. |
| Source-record ledger | Immutable canonical Extended JSON payload, source collection/ID, SHA-256 checksum, extraction time, importer version, result, error, disposition, and replay status. |
| Duplicate-review queue | Candidate records, evidence, reason triggered, proposed action, human reviewer, decision, and time. |
| Exception register | Unknown values, missing references, contradictory facts, ambiguous job matches, and disposition. |
| Reconciliation report | Source/target counts, totals, orphan counts, status/value distributions, sample checks, invariant results, and accepted differences. |
| Runbook | Commands, environment requirements, backup/restore procedure, dry run, execution order, verification, cutover, rollback, and ownership. |
| Decision log | Any approved implementation interpretation that is not already explicit in the Foundation Specification. |

Do not consider the work complete if only SQL DDL and import scripts exist.

## Audited live Mongo source surface

The planning audit connected read-only to the live `egs-web` database on 4 August 2026. It found 33 collections: 24 non-empty and nine empty. The active models are under `EGS/EGS-digital/server/src/models/`, but the database also contains legacy structures not represented by current models.

- Core source volumes: 1,172 Companies, 4,022 Leads, 11 Project Campaigns, 1,859 Emails, 81 Replies, 1,787 Send Jobs, 1,756 separate Sequence Enrollments, 16 Opportunities, 229 Jobs, 122 Tasks, seven Interactions, 112 Audit Logs, and 291 Record Revisions.
- Identity evidence: 3,899 person Leads, 123 generic-inbox Leads, 820 archived Leads, ten duplicate Organization-name groups, 840 repeated-email Lead groups, and 781 repeated-LinkedIn Lead groups.
- Outreach overlap: 1,326 Campaign + Organization pairs in the lossless union; 3,220 embedded enrollment pairs, 1,756 separate pairs, 1,731 overlaps, and 25 identity conflicts.
- Communication overlap: 72 Email/Reply message-ID overlaps, nine Reply-only messages, 38 overlapping body variants, 22 Send Jobs without Email matches, and 99 matched Send Job/Email content variants.
- Work overlap: four explicit Job → Opportunity links; 225 historical Jobs without an Opportunity link; 225 Jobs without `companyId`; 194 with no exact automated Organization evidence.
- Completion/finance conflict: 153 legacy Job Done values, of which 48 have positive legacy balance; two records fail the legacy amount/received/balance equation.
- Derived/legacy sources: 3,003 Analytics Snapshots plus one Blend Job, one older Lead Campaign, configuration/settings records, and nine empty collections.

See `CRM_LIVE_MONGO_DATA_AUDIT.md` for the complete evidence and required treatment. Re-run both read-only audit scripts at rehearsal and cutover; this snapshot is not a substitute for the final source watermark.

## Source-to-target translation map

| Mongo source | Target concepts | Required treatment |
|---|---|---|
| `Company` | Organization; Organization Identifier; Organization Contact Method; Location; Note; Source Record | `companyName` becomes identity evidence. `domain` becomes an Identifier and is not globally authoritative. Generic emails/phone become Organization endpoints. `boothNumber` must not remain on Organization; map only when an Event Participation can be proven, otherwise preserve as an exception/source fact. City/country may seed a Location only when meaning is clear. |
| `Lead` with `contactKind=person` | Person; Person Contact Methods; Person–Organization Role; Campaign Contact; POC Suitability; Key Relationship candidate/profile; Interactions; Source Record | Create durable identity and contextual records separately. Preserve every discovered endpoint with source/provenance and validity. Embedded outreach flags become Interactions only where they prove an actual event and timestamp; otherwise preserve as source facts. Duplicate indicators create review, never auto-merge. |
| `Lead` with `contactKind=genericInbox` | Organization Contact Method; Campaign Contact; Source Record | Do not create Person. Link the campaign contact directly to the organization endpoint. Referral to a real human creates a separate Person/Role after review. |
| `Lead.enrollments` and `SequenceEnrollment` | Sequence Enrollment and execution history | Compare overlapping sources, choose the authoritative execution record by approved mapping, retain provenance, and report discrepancies. Do not count both as independent enrollments without proof. |
| `ProjectCampaign` | Campaign; ownership; optional legacy metrics snapshot | A target Campaign requires one Service Offering. Until the catalogue is supplied, use an explicit approved placeholder/unmapped state or hold the Campaign in staging; never guess. Stored counters are validation inputs or snapshots, not authoritative target counters. Validate financial fields before any use. |
| `Sequence.steps` | Sequence; Sequence Version; Sequence Step | Preserve published/executed definitions as immutable versions. Do not let later edits rewrite steps used by historical enrollments/messages. Mixed flow-graph data requires explicit mapping or archived source preservation. |
| `Email` | Conversation; Participant; Message; delivery evidence; possible legacy review evidence | Preserve exact external identifiers, endpoints, bodies, direction, timestamps, and provider metadata. Human review fields do not belong on Message in the target. |
| `Reply` | Message; Conversation; Review Item; Review Decision; Source Record | Reconcile with Email by external `messageId` and evidence. Embedded `threadHistory` must not create duplicate Messages already imported from Email. Retain human outcome separately from Message. AI/vendor intent is non-authoritative provenance only because EGS confirmed human-only classification. |
| `ContactInteraction` | Interaction; participants/context; Task link; Source Record | Map real external contact only. Resolve legacy Lead through crosswalk to Person/Role and Company to Organization. Do not infer an Interaction merely because a Task was completed. |
| `Task` | Task; Task assignments; explicit context links; archive/history | Resolve owner to User where possible while preserving original label. `opportunityId` means legacy Ongoing Job. Expand status to governed target lifecycle without inventing intermediate history. Preserve reply-review grouping rules. |
| `opportunities` (`OngoingJob`) | Ongoing Job; Stakeholders; Assignment History; Scope Lines; Event/Location facts; Progress History; Notes; Source Record | This is the primary legacy active-job source. Services are legacy strings awaiting catalogue mapping. `activityLog` is evidence for history but must be validated. `valueAed` is not a Zoho ledger. Event/booth fields must move to correct context. |
| `jobs` (`CompletedJob`) | Existing Ongoing Job or newly imported historical Ongoing Job; Stakeholder/contact evidence; financial snapshot/reference; Job Event; Source Record | If `opportunityId` reliably resolves, enrich the same target Job—do not create a duplicate. Without a reliable match, create a distinct historical Job candidate and queue ambiguous organization/contact/service resolution. Do not assert target Job Done unless delivery and fully-paid rules are satisfied or the legacy status is explicitly marked as unverified legacy evidence. |
| `RevenueEntry` | Campaign attribution evidence or approved reporting fact | Do not treat as invoice/payment truth. Link only after business meaning and relationship to Jobs/Zoho are validated; otherwise preserve in a legacy evidence table/source ledger. |
| `Suppression` | Endpoint Suppression | Normalize the endpoint; retain reason, date, source, campaign context, and scope. Default scope is the exact endpoint. Do not silently convert it into global Organization closure. |
| `AuditLog`, `RecordRevision` | Legacy Audit Event / revision evidence | Preserve append-only. Link to new IDs through crosswalk where possible. Do not rewrite legacy events as if they were generated by the new system. |
| `AnalyticsSnapshot`, stored counters | Validation snapshot or retired derived cache | Recalculate target analytics from canonical facts. Retain snapshots only if useful for historical comparison; never seed current truth blindly. |
| `SendJob` | Outbound Message execution evidence; Enrollment execution history; Source Record | Reconcile provider ID with Email. Link one Message to both sources when proven. Preserve unmatched Send Jobs as Message candidates and retain all differing rendered-content variants. |
| `SequenceLaunch` | Immutable launch/audience snapshot | Preserve launch time and audience evidence. Stored launch counters are snapshots, not editable canonical totals. |
| `DailyReviewRecord` | Legacy operational review-completion evidence | Preserve as internal workflow/audit evidence; do not fabricate individual Review Decisions from it. |
| `User` | User/access identity and legacy credential evidence | Map roles explicitly. Preserve the legacy password hash only through an approved compatible-authentication plan; otherwise require password reset. Never expose hashes in reports/logs. |
| `PipelineConfig` | Controlled lifecycle configuration evidence | Reconcile with the confirmed workflow. The live list omits the separate `Quotation` preparation stage; legacy configuration does not override the foundation. |
| `SystemSettings`, `GlobalSettings` | Approved target configuration or legacy archive | Migrate only needed non-secret settings after validation. Secrets remain environment-managed. |
| `LeadCampaign`, `BlendJob` | Legacy campaign/import provenance | Preserve raw source. Map to canonical Campaign only after review; otherwise use archive-only disposition. |
| Empty collections | Zero-count disposition | Record the audited zero count. Do not create target facts merely because an unused collection exists. |

## No-loss SQL migration control schema

The physical proposal must include a restricted migration schema equivalent to:

| Logical table | Minimum fields |
|---|---|
| `migration_run` | ID, run type, source database, source watermark, Mongo/application/importer versions, started/completed times, status, operator, manifest checksum. |
| `migration_source_document` | Run ID, collection, Mongo `_id`, canonical Extended JSON payload, payload SHA-256, source created/updated/archive timestamps, extracted time, terminal disposition. |
| `migration_entity_map` | Source document and optional source path, target table/entity ID, mapping kind, confidence, rule version, approval reference. |
| `migration_exception` | Category, severity, source IDs, evidence, proposed options, owner, status, decision, resolved time. |
| `duplicate_review_case` | Entity type, candidate SQL IDs, evidence references, reviewer, decision, merge record, reversal reference. |
| `migration_reconciliation_metric` | Run, metric code, scope, source value, expected target value, actual target value, difference, status, evidence. |

The application must not use raw migration payloads as its operational store. They exist for traceability, recovery, and proof that normalization did not erase a legacy fact.

## Migration work plan and gates

Each phase ends with a committed report and a human checkpoint. A failed gate blocks dependent phases but does not justify inventing a workaround.

### Phase 0 — Protect and baseline

- Identify development, test, staging, and production environments.
- Record database versions, source connection method, target SQL engine/version, application commit, and importer commit.
- Take and verify a recoverable source backup using the environment's approved process.
- Establish a masked or access-controlled representative migration environment.
- Export baseline document counts, collection/index metadata, storage size, enum distributions, date ranges, and reference coverage.
- Record a source high-water mark or snapshot timestamp so the migration population is explicit.
- Generate canonical Extended JSON for all 33 collections with a manifest containing per-file document count, byte count, and SHA-256.
- Encrypt and access-restrict the backup because it contains PII, messages, password hashes, and commercial data.

Gate: Talha can restore the source backup, reproduce the manifest, and verify every file checksum. A backup that has not been restored in a test environment is not proven.

### Phase 1 — Profile real data

- Enumerate all collections, including collections no longer represented by active model files.
- Profile every relevant field path, including embedded arrays and mixed objects.
- Count null, missing, empty-string, invalid-format, duplicate, and orphan-reference cases separately.
- Extract every observed service string, workflow/status value, reply outcome, task type, contact type, domain, and currency.
- Detect overlap between `Email`, `Reply`, and `Reply.threadHistory` using message identifiers and secondary evidence.
- Detect overlap between `opportunities` and `jobs` using explicit IDs first, then report-only matching evidence; do not auto-link ambiguous records.
- Re-run `profileDatabaseForSqlMigration.js` and `auditDatabaseMigrationRisks.js`; compare with the 4 August audit and explain every changed count.
- Inventory all 33 collections, not only the active Mongoose models.

Gate: Source inventory and exception register explain the actual database, not only Mongoose expectations, and every source document is registered for a terminal disposition.

### Phase 2 — Approve the physical relational design

- Translate the logical ERD into tables with explicit PKs/FKs, nullability, checks, indexes, archive metadata, and history tables.
- Use stable generated SQL IDs. Keep legacy IDs only in crosswalk/provenance fields.
- Implement scoped unique constraints where business rules are confirmed.
- Index foreign keys, normalized lookup values, lifecycle queues, dates used operationally, and external message IDs.
- Prefer reference tables or constrained codes for governed values that administrators manage. Do not hard-code the 12 services into application enums.
- Define how read models expose headline Job stage, Jobs Done, timelines, and campaign metrics.
- Define transaction boundaries and failure/retry behavior for imports.

Gate: Every table maps to a foundation concept; every important foundation concept has an owner; no current Mongo conflation has been copied as a shortcut.

### Phase 3 — Build migration control structures

At minimum create a migration-run record, source-record ledger, ID crosswalk, exception record, and duplicate-review record. These may live in a dedicated migration schema.

Load the immutable source-document layer before normalized transformation. Verify its per-collection counts and checksums against the extraction manifest.

The crosswalk must support:

- One Mongo Lead producing several target rows.
- Several Mongo records pointing to one target row only after an approved resolution.
- A source record being staged, imported, skipped with reason, failed, retried, or superseded.
- Re-running the same import without producing duplicate target rows.

Gate: Every extracted Mongo document exists unchanged in the restricted SQL evidence layer, and a dry-run record can be normalized, traced, replayed, and rolled back without touching unrelated rows.

### Phase 4 — Load independent reference and identity foundations

Recommended dependency order:

1. Users and governed reference values that are already confirmed.
2. Empty/configurable Service Offering, UOM, and Inquiry Template structures; load only approved catalogue content.
3. Organizations, identifiers, organization endpoints, and Locations.
4. People, personal contact methods, and Person–Organization Roles.
5. Duplicate-review cases, Key Relationship data, POC Suitability, assignments, and provenance.

For each legacy Lead:

- Determine `person` versus `genericInbox` from explicit source evidence.
- For a person, create or map a Person candidate, endpoints, and a Role at the source Company.
- For a generic inbox, create/map only the Organization Contact Method.
- If another candidate shares email or LinkedIn, create a Duplicate Review Case. Keep separate target candidates until a human approves a merge.
- Preserve original and normalized endpoint values plus provider/source confidence.
- Preserve all 820 archived Lead contexts and the 190 person Leads with blank names without inventing names.
- Create review cases for observed repeated-identifier groups. Do not batch-approve them merely because most contain an archived record.

Gate: The run accounts for 1,172 Companies and 4,022 Leads; it produces 123 Organization-endpoint candidates for generic inboxes, preserves archive state, creates no fake Person, and leaves duplicate candidates reviewable and traceable.

### Phase 5 — Load events, campaigns, and outreach

Recommended dependency order:

1. Events, Event Editions, Event Participations where source evidence exists.
2. Campaigns and their one approved Service Offering reference.
3. Campaign Accounts from the union of Company association and Lead campaign context.
4. Campaign Contacts through a Person Role or Organization endpoint.
5. Sequence, immutable Sequence Versions/Steps, and Enrollments.

Do not manufacture Event Editions from free-text event names without an approved normalization decision. Do not place booth numbers on Organization.

Live-data rules:

- Use the 1,326-pair Campaign Account union: 624 pairs in both sources, 557 Company-association-only, and 145 Lead-context-only.
- Preserve provenance on every pair; review the Lead-only population without discarding it.
- Recalculate response totals. Three live Campaign counters disagree with distinct-Company response evidence.
- Reconcile 3,220 embedded Lead enrollment pairs with 1,756 separate Sequence Enrollment pairs. The 1,731 overlaps become one execution context with multiple source links.
- Preserve 1,489 embedded-only attempts as legacy outreach history where no Sequence identity exists.
- Quarantine the 25 separate-only Enrollment identity conflicts. All have sent Send Jobs whose valid Lead differs from the missing Enrollment Lead.

Gate: All 1,326 Campaign Account pairs are represented once with provenance; every Campaign Contact has exactly one target kind; all enrollment representations are consolidated or preserved as legacy/exception evidence; the 25 conflicts are visible and no sent outreach is lost.

### Phase 6 — Consolidate communication and review evidence

Recommended dependency order:

1. Conversations and exact endpoint Participants.
2. Canonical Messages from `Email`, `Reply`, and embedded thread history.
3. Delivery evidence.
4. Review Items, grouped inbound Message sets, and human Review Decisions.
5. Endpoint Suppressions.
6. Real Interactions.

Message reconciliation algorithm:

1. Match on normalized provider/channel + external message ID where present.
2. Compare direction, sender/recipients, timestamps, subject, and body hashes.
3. If sources agree, create one Message and link every source record to it.
4. If identifiers match but bodies differ, create one Message identity, retain every content/source variant and checksum, and apply only an approved canonical-content rule.
5. If no identifier exists, use secondary matching only to propose review unless the approved mapping defines a deterministic safe case.
6. Treat vendor/AI intent as provenance, never the authoritative Review Decision.

Live-data reconciliation baseline:

- Consolidate 72 proven Email/Reply IDs and preserve 38 differing body representations.
- Import nine Reply-only IDs and avoid recreating the ten thread-history items that already share Reply IDs.
- No current Reply proves a completed human Review Decision; preserve unreviewed state.
- Link 1,765 Send Jobs to Emails through provider ID, retaining 99 differing rendered-content variants.
- Preserve 22 Send Jobs without Email matches as outbound Message candidates when execution evidence supports it.
- Use endpoint snapshots when a canonical participant identity is missing or disputed; never assign an orphaned Message to an invented Person.

Gate: Every Email, Reply, embedded thread item, and Send Job has a disposition and target/source link; proven overlaps create one Message identity; every body variant remains recoverable; no Message or endpoint is silently lost.

### Phase 7 — Build the continuous Ongoing Job history

Recommended dependency order:

1. Import `opportunities` as legacy active/current Ongoing Job sources.
2. Resolve customer Organization and stakeholder Roles through crosswalks.
3. Import ownership, collaborator, stage/progress, note, event/location, and service-string evidence without guessing catalogue mappings.
4. Process `jobs` records. Use explicit `opportunityId` links first to enrich an existing target Ongoing Job.
5. Where no explicit link exists, create a historical Ongoing Job only when the record clearly represents distinct quoted work. Queue ambiguous matches instead of auto-combining.
6. Preserve current scope as Job Scope Lines when reliable. Preserve unknown service text as legacy source value pending catalogue reconciliation.
7. Create Quote/Design structures only from reliable source documents/data. Empty future-ready relationships are preferable to invented versions or approvals.
8. Import financial values as explicitly labelled legacy snapshots/references unless validated against Zoho. Do not create invoice/payment transactions in CRM.
9. Record legacy completion/loss status as evidence. Apply target `Job Done` only when physical delivery and fully-paid requirements are confirmed.

Live-data rules:

- Consolidate the four explicit Job → Opportunity pairs into four Ongoing Jobs with two source links each.
- Import the remaining 12 Opportunities as Ongoing Jobs.
- Treat the 225 unlinked Jobs as distinct historical Job candidates unless explicit quotation evidence proves otherwise.
- Resolve the four explicit Job customer IDs first. For the remaining 225, compare exact normalized Company name, known Lead email, and email domain. Current evidence yields 18 unique exact-name matches, one unique Lead-email Company match, and 14 unique domain matches, with possible overlap.
- Stop records where evidence disagrees. For 194 Jobs with no automated Organization evidence, create Organization candidates from preserved customer text and send them through duplicate review.
- Preserve every legacy service string. Three are blank and several are descriptions/aliases rather than governed services.
- Preserve AED 1,245,373.10 amount, AED 116,659.00 received, and AED 1,129,374.10 balance as legacy snapshots; put two equation failures into exceptions.
- Preserve all 153 legacy Job Done labels, but do not assert target fully-paid completion without Zoho confirmation. At least 48 have positive legacy balance.
- Preserve 31 non-Done/zero-balance cases as proof that financial and delivery lifecycles are independent.

Gate: The run accounts for all 16 Opportunities and 229 Jobs; the four explicit overlaps are consolidated once; all other Jobs remain distinct or have approved evidence-backed consolidation; every customer/service/finance ambiguity is visible; no copied Completed Job table exists.

### Phase 8 — Load Tasks, notes, files, history, and governance

- Resolve Tasks to one accountable User and explicit contexts.
- Preserve original owner text when no User match is certain; queue resolution rather than assigning a guessed user.
- Preserve archive/delete metadata and restore behavior.
- Import source audit/revision evidence append-only and label it as legacy.
- Store each File once and create explicit context/version links.
- Do not create customer Interactions from Task completion alone.
- Build audit hooks for new SQL writes separately from imported legacy history.
- Preserve all 122 Tasks, including 14 archived, 19 without Task type, 37 without due date, and one legacy `pending` status.
- Retain original owner labels. Only 14 of 110 missing owner IDs currently have a unique text match to one of six Users; the other 96 require unresolved/legacy owner treatment.
- Preserve all seven Interactions, 112 Audit Logs, 291 Record Revisions, six Sequence Launches, one Daily Review Record, one Suppression, and relevant configuration/provenance records.

Gate: Every Task has a confirmed User owner or explicit unresolved legacy owner exception; null due dates remain null; every history/configuration source has a normalized or archive-only disposition; current and legacy audit sources are distinguishable.

### Phase 9 — Reconcile and test

Run automated invariants plus business sample reviews. Required minimum checks are listed below.

Gate: Talha and EGS sign off the reconciliation report and explicitly accept or resolve every material difference.

### Phase 10 — Application transition and cutover

- Update backend access around domain services/repositories so frontend screens do not write duplicate truths.
- Validate key screens and workflows against the SQL-backed system using representative EGS scenarios.
- Rehearse the final process with production-shaped data and record duration/failures.
- Choose and document the approved change-capture/cutover approach for records created after the baseline snapshot.
- Run final extraction/import/reconciliation within the approved window.
- Switch application traffic only after the cutover gate passes.
- Keep the source recoverable and read-only for the agreed validation period.
- Use the documented rollback path if any stop condition occurs.

Gate: New SQL data is authoritative, monitored, backed up, and reconcilable; rollback remains possible for the agreed period.

## Required automated invariants

The migration test suite must fail on these conditions unless an explicit exception record exists:

### Referential integrity

- Source-document count or checksum mismatch against the extraction manifest.
- Source document without exactly one terminal migration disposition.
- Source marked normalized/consolidated without at least one target map, unless an approved mapping rule explains it.
- Orphan foreign keys.
- Campaign Account without Campaign or Organization.
- Campaign Contact with neither or both target kinds.
- Ongoing Job without exactly one customer Organization.
- Quote belonging to more than one Ongoing Job or more than one logical Quote per Job.
- Quote Version without Quote; Quote Line without Version, Service, or valid UOM where required.
- Stakeholder without Ongoing Job or Person–Organization Role.
- Enrollment without Campaign Contact or Sequence Version.
- Message without Conversation.
- Historical Message without endpoint snapshot because canonical participant identity was unavailable.

### Business uniqueness

- Duplicate Campaign + Organization pairs in Campaign Account.
- Duplicate version numbers within a Quote, Design family, Sequence, or Inquiry Template.
- More than one active primary stakeholder per Ongoing Job.
- More than one active default UOM per Service Offering.
- Duplicate provider/channel + external message IDs not placed in collision review.

### Boundary protection

- Generic inbox represented as a Person.
- Domain required as Organization identity.
- Global Lead stage stored on Person.
- Booth stored as a permanent Organization fact.
- Completed Job copied into a second target job entity.
- Issued Quote Version or approved Design Version mutated after issue/approval.
- Task completion creating an Interaction without external-contact evidence.
- AI/vendor intent imported as human Review Decision.
- CRM payment rows created from unvalidated legacy amounts.
- Stored Campaign counters imported as editable authoritative totals.
- Two overlapping source records consolidated without retaining both source links/content variants.

### Lifecycle correctness

- Job Done without confirmed physical delivery and fully-paid milestone.
- Pre-PO production without recorded internal approval when the rule applies.
- Job Lost or reopened without retained event/history.
- Current headline stage contradicting its underlying commercial, delivery, financial, or outcome dimensions.

## Reconciliation report template

For every run, report:

| Area | Source measure | Target measure | Expected difference | Actual difference | Status/evidence |
|---|---:|---:|---:|---:|---|
| Source documents processed |  |  | 0 |  |  |
| Source payload/checksum verification |  |  | 0 mismatches |  |  |
| Terminal source dispositions |  |  | every source document exactly once |  |  |
| Companies → Organizations |  |  | explained splits/reviews |  |  |
| Person Leads → People candidates |  |  | explained duplicate reviews |  |  |
| Generic inbox Leads → Organization endpoints |  |  | 0 lost |  |  |
| Campaigns / Accounts / Contacts |  |  | documented normalization |  |  |
| Emails + Replies → unique Messages |  |  | documented deduplication |  |  |
| Human review outcomes |  |  | 0 unexplained |  |  |
| Interactions |  |  | 0 unexplained |  |  |
| Opportunities + Jobs → Ongoing Jobs |  |  | documented merges/splits |  |  |
| Tasks |  |  | 0 unexplained |  |  |
| Suppressions |  |  | 0 unexplained |  |  |
| Archived records |  |  | 0 unexplained |  |  |
| Exceptions unresolved |  |  | approved threshold |  |  |

Initial planning baselines to reproduce or explain at the next run:

- 33 collections: 24 non-empty and nine empty.
- 1,172 Companies; 4,022 Leads, including 820 archived and 123 generic inboxes.
- 1,326 lossless Campaign Account pairs.
- 1,859 Emails, 81 Replies, 1,787 Send Jobs, and 1,756 separate Sequence Enrollments.
- 16 Opportunities and 229 Jobs with four explicit overlaps.
- 122 Tasks, seven Interactions, 112 Audit Logs, 291 Record Revisions, and one Suppression.
- 25 Enrollment identity conflicts, 22 unmatched Send Jobs, 194 historical Jobs without automated Organization evidence, 48 legacy Job Done records with positive balance, and two legacy financial-equation failures.

Also compare distributions and totals, not only counts:

- Records by lifecycle/status and archive state.
- Messages by direction, delivery state, campaign, and month.
- Jobs by source stage, target headline stage, outcome, owner, and month.
- Legacy AED values, received, and balance totals, clearly labelled non-authoritative until Zoho reconciliation.
- Campaign and service strings before/after mapping.
- Earliest/latest timestamps and null timestamp counts.

## Business acceptance scenarios

Talha should demonstrate these using migrated or representative records:

1. Two people with the same full name at the same Organization remain distinct.
2. One Person holds two simultaneous Organization Roles.
3. A Person changes employer without losing prior Campaign/Job history.
4. A generic `info@` endpoint participates in outreach and refers a real Person without becoming a fake Person.
5. One Organization has several Campaign Contacts; a responder becomes the focus while other contacts pause only in that Campaign Account.
6. Not Interested does not close the Organization for future outreach; unsubscribe suppresses the endpoint.
7. A direct/repeat Ongoing Job exists without a Campaign.
8. One Ongoing Job holds multiple services, phases, locations, stakeholders, and responsible owners.
9. Design and Quote versions remain linked and independently approved.
10. A revised Quote preserves prior issued versions and remains the same Ongoing Job.
11. Production begins before PO only with recorded authorization and internal approval.
12. Installation completes while payment remains outstanding; the Job is not yet Job Done.
13. Job Done appears only after physical delivery and Zoho-authoritative fully-paid confirmation.
14. Job Lost after production preserves work, cost/payment context, materials disposition, and later reopening if applicable.
15. Warranty/rework remains linked to the original Job unless separately quoted.
16. Person, Organization, and Job timelines show the same underlying facts without copied activity records.

## Stop conditions requiring Talha or EGS decision

The AI agent must stop the affected mapping—not the entire safe analysis—when it encounters:

- A requested change to a confirmed foundation boundary.
- Ambiguous Person or Organization merge.
- Ambiguous `jobs` ↔ `opportunities` match.
- Conflicting Messages with the same external identifier.
- Unknown service/status/outcome that cannot be losslessly preserved under an approved mapping.
- A completion/payment assertion that cannot be reconciled with Zoho-authoritative information.
- Missing customer Organization for an Ongoing Job.
- Destructive source or target cleanup not explicitly authorized.
- A production cutover, DNS/connection switch, or source retirement step without an approved runbook and rollback.

Each issue record must include source IDs, evidence, business impact, options, recommendation, owner, and resolution.

## Efficiency rules for the implementation

- Separate extraction, normalization, matching, and loading so each can be tested independently.
- Use bulk reads/writes and set-based SQL operations, but isolate failed records and preserve per-record traceability.
- Normalize values once in a shared library used by profiling, matching, import, and application validation.
- Keep mappings declarative where practical; do not scatter legacy enum translations across scripts.
- Cache derived read models deliberately; do not add editable duplicate totals for frontend convenience.
- Make import scripts idempotent with stable source keys and upsert rules limited to migration control—not fuzzy business identity.
- Resume from checkpoints rather than restarting completed phases.
- Produce machine-readable reports plus a short human summary after each run.
- Test transformations with fixtures covering normal, duplicate, missing, contradictory, and archived records.
- Keep service catalogue loading independent so EGS can supply the 12 categories and questions later without schema redesign.

## Definition of migration complete

Migration is complete only when:

- The approved SQL schema conforms to the Foundation Specification and logical ERD.
- Every in-scope source record is traceable to target rows, an intentional deduplication, a preserved legacy record, or an approved exception.
- Automated invariants and business acceptance scenarios pass.
- Reconciliation differences are explained and signed off.
- Duplicate and ambiguity queues have an agreed disposition.
- The application uses SQL-backed canonical facts and derived views without dual frontend-owned truth.
- Backups, monitoring, permissions, audit, restore, and rollback have been verified.
- The final 12 services can be loaded as governed catalogue/template data without changing core schema boundaries.
- Source retirement is treated as a separate, explicitly approved action.

## Copyable instruction for a coding AI agent

```text
You are assisting Talha with the EGS CRM Mongo-to-SQL migration.

Read CRM_FOUNDATION_SPEC.md completely first. Then read CRM_LOGICAL_ERD.md and MONGO_TO_SQL_AI_AGENT_GUIDE.md completely. Treat them in that authority order. Inspect the real Mongoose models and actual source-data profile; do not assume the models fully describe stored data.

Read CRM_LIVE_MONGO_DATA_AUDIT.md before designing any mapping. Re-run the two read-only audit scripts for the current source watermark and explain every difference from the planning snapshot.

Your job is to translate the legacy Mongo documents into the confirmed relational business model, not to reproduce each collection as a same-shaped SQL table. Preserve source provenance and history. Never auto-merge People or Organizations, never invent service mappings or missing facts, never create a Person for a generic inbox, never copy CompletedJob into a separate completed-job entity, and never treat CRM values as a replacement for Zoho finance.

Before normalized transformation, load every Mongo document into a restricted immutable SQL migration-evidence layer using canonical Extended JSON and SHA-256. Then produce: source inventory, physical schema proposal, source-to-target field mapping, ID crosswalk design, exception/duplicate-review design, phased runbook, automated invariants, and reconciliation report format. Make scripts idempotent and resumable. Every source document needs one terminal disposition, and every target row must trace to source evidence, an approved human decision, or a documented derivation.

Work phase by phase. At each gate, show Talha: files changed, commands run, tests/results, counts, unresolved exceptions, assumptions, and the exact next action. Stop the affected mapping and request a decision whenever identity, job matching, source-of-truth, workflow meaning, or destructive/cutover behavior is ambiguous.
```

## Talha’s compact progress tracker

- [ ] Foundation and ERD reviewed; interpretations logged.
- [ ] Source backup restore-tested and baseline captured.
- [ ] Actual Mongo data profile completed.
- [ ] All source documents loaded into restricted SQL evidence layer with verified counts/checksums.
- [ ] Physical SQL schema and constraints reviewed.
- [ ] Mapping register, crosswalk, source ledger, and exception queues built.
- [ ] Identity and organization dry run reconciled.
- [ ] Campaign/outreach dry run reconciled.
- [ ] Message/review consolidation dry run reconciled.
- [ ] Ongoing Job consolidation dry run reconciled.
- [ ] Tasks/files/audit dry run reconciled.
- [ ] Automated invariants and business scenarios pass.
- [ ] Application SQL integration passes acceptance testing.
- [ ] Final catalogue content loaded or explicitly deferred without core impact.
- [ ] Production rehearsal, cutover, monitoring, and rollback approved.
- [ ] Final reconciliation signed off.
