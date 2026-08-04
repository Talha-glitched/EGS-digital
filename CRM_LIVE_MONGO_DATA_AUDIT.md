# EGS CRM Live Mongo Data Audit for SQL Migration

Status: Read-only evidence snapshot  
Database audited: `egs-web` on MongoDB 8.0.28  
Audit time: 4 August 2026  
Business model: [CRM Foundation Specification](./CRM_FOUNDATION_SPEC.md)  
Logical target: [CRM Logical ERD](./CRM_LOGICAL_ERD.md)  
Execution plan: [Mongo-to-SQL AI Agent Migration Guide](./MONGO_TO_SQL_AI_AGENT_GUIDE.md)

## Executive verdict

The database can be migrated safely to the approved SQL foundation, but it must be treated as a translation and reconciliation project—not a collection-for-table copy.

The live audit found 33 Mongo collections, of which 24 contain data. The important legacy records are small enough to preserve completely, but several sources overlap or contradict one another:

- `Lead` documents combine several target entities and contain extensive duplicate identity evidence.
- Campaign membership exists both through `Company.projectsAssociated` and Lead campaign context; neither source alone contains the complete population.
- Outreach history exists in embedded Lead enrollments, separate Sequence Enrollments, Send Jobs, Emails, Replies, and embedded reply thread history.
- `opportunities` and `jobs` overlap, but only four Job records have an explicit Opportunity link.
- Most historical Jobs have text-only customer identity.
- The legacy meaning of `Job Done` does not consistently satisfy EGS's newly confirmed delivered-and-fully-paid rule.
- Some stored counters are stale and must be recalculated from underlying evidence.

No production data was changed. The audit exported aggregate statistics only: no credentials, password hashes, personal contact values, or message bodies were written to the audit reports.

## Audit method

Two reusable read-only scripts inspected the live database:

- `EGS/EGS-digital/server/scripts/profileDatabaseForSqlMigration.js`
- `EGS/EGS-digital/server/scripts/auditDatabaseMigrationRisks.js`

They examined:

- Every live collection, including collections not represented by active Mongoose models.
- Document counts, stored field paths, BSON types, missing/null/empty patterns, array shapes, dates, numeric ranges, controlled values, and indexes.
- Known Mongo references and orphan conditions.
- Person and Organization duplicate indicators without exporting the identifying values.
- Overlap between Emails, Replies, embedded thread history, Send Jobs, and enrollments.
- Overlap between `jobs` and `opportunities`.
- Historical Job/customer matching coverage and financial consistency.
- Task ownership/context coverage.
- Campaign counter reconciliation.

The full aggregate machine-readable reports were written locally under `tmp/` for engineering analysis. A fresh version must be generated immediately before rehearsal and final cutover because the live database can change after this snapshot.

## Complete collection inventory

### Collections containing data

| Mongo collection | Documents | Archived/deleted | Migration classification |
|---|---:|---:|---|
| `leads` | 4,022 | 820 | Split into Person/endpoint/Role/Campaign Contact/POC/relationship/outreach facts; preserve archive state. |
| `analyticssnapshots` | 3,003 | 0 | Derived/cache history. Preserve in immutable legacy archive if required; recalculate current analytics from SQL facts. |
| `emails` | 1,859 | 0 | Canonical Message evidence after reconciliation with Reply and Send Job. |
| `sendjobs` | 1,787 | 0 | Outbound execution evidence; link to Messages/Enrollments, retain unmatched or differing variants. |
| `sequenceenrollments` | 1,756 | 0 | Sequence execution source; reconcile with Lead embedded enrollments. |
| `companies` | 1,172 | 0 | Organization, Identifier, Organization Contact Method, Location/Event evidence. |
| `recordrevisions` | 291 | 0 | Append-only legacy revision evidence; retain raw snapshots securely. |
| `jobs` | 229 | 2 | Historical/current Ongoing Job facts; consolidate with explicit Opportunities and preserve unresolved customer/service/finance evidence. |
| `tasks` | 122 | 14 | Task plus owner/context/history; normalize legacy statuses/types without erasing originals. |
| `auditlogs` | 112 | 0 | Append-only legacy audit evidence with restricted sensitive metadata. |
| `replies` | 81 | 0 | Inbound Message and review evidence; reconcile with Email/thread sources. |
| `opportunities` | 16 | 2 | Continuous Ongoing Job source. |
| `projectcampaigns` | 11 | 4 | Campaign source; stored counters are not authoritative. |
| `contactinteractions` | 7 | 0 | Real external Interactions. |
| `sequencelaunches` | 6 | 0 | Outreach launch/audience snapshot evidence. |
| `sequences` | 6 | 3 | Versioned Sequence/Step definitions and legacy graph/audience snapshots. |
| `users` | 6 | 0 | Users, access roles, and credential migration decision. |
| `blendjobs` | 1 | 0 | Legacy import/blending execution evidence; archive/provenance rather than CRM business entity. |
| `dailyreviewrecords` | 1 | 0 | Internal operational review-completion evidence. |
| `globalsettings` | 1 | 0 | Legacy cost/configuration evidence; validate before mapping to target settings. |
| `leadcampaigns` | 1 | 0 | Older draft campaign structure; preserve and review before mapping or archive-only disposition. |
| `pipelineconfigs` | 1 | 0 | Current governed stage configuration evidence. |
| `suppressions` | 1 | 0 | Endpoint suppression evidence. |
| `systemsettings` | 1 | 0 | Email-system setting; migrate only the non-secret setting needed by the new application. |

### Empty collections

The following collections contain zero documents: `campaigns`, `communicationhistories`, `dripsequences`, `emaillogs`, `mailboxdailyquotas`, `pages`, `recipients`, `revenueentries`, and `sendevents`.

They require a recorded zero-count disposition but no data transformation. Their existence must not be mistaken for evidence that they are the current canonical sources.

## Finding 1 — Identity cannot be deduplicated automatically

### Organizations

- 1,172 Company documents.
- No blank Company names or domains.
- Ten exact normalized-name duplicate groups affect 21 active Company documents; the largest group contains three records.
- Domains are currently unique because of the Mongo constraint, but the target must treat domains as identifiers/matching evidence rather than Organization identity.
- 437 Organizations contain at least one generic email.
- One Company contains a booth number that belongs in Event Participation, not Organization.

Required treatment:

- Initially create one Organization candidate per Company source record so nothing is lost.
- Create duplicate-review cases for the ten normalized-name groups; do not merge them automatically.
- Split domains and generic endpoints into their target child entities.
- Move the one booth value only if its Event Edition/Participation can be proven; otherwise preserve it as unresolved source evidence.

### People/contact candidates

- 4,022 Lead documents: 3,899 marked `person` and 123 marked `genericInbox`.
- 820 Leads are archived/deleted and must retain archive state/history.
- 190 person Leads have blank names; their endpoints and contextual evidence must not be discarded or filled with invented names.
- All 4,022 Leads resolve to a current Company.
- Nine Leads have no Campaign value; none contain an invalid non-null Campaign reference.
- No generic-inbox Lead contains LinkedIn evidence.

Duplicate indicators across all Lead documents:

| Evidence | Duplicate groups | Source Leads affected | Groups within one Company | Groups across Companies | More than one active record in group |
|---|---:|---:|---:|---:|---:|
| Repeated email | 840 | 1,644 | 830 | 10 | 2 groups |
| Repeated LinkedIn | 781 | 1,566 | 773 | 8 | 2 groups |

Many duplicate groups contain one active and one archived Lead, which strongly suggests campaign/import duplication. That is useful evidence but does not authorize an automatic Person merge because EGS explicitly requires human intervention for repeated email or LinkedIn identity.

Required treatment:

- A `person` Lead creates a Person candidate, its personal endpoints, a Person–Organization Role, and contextual campaign/relationship facts.
- A `genericInbox` Lead creates an Organization Contact Method and campaign context, never a Person.
- Preserve active and archived contextual records separately even when a later human merge confirms that they share one Person.
- Generate a review queue that shows supporting company, name, endpoint source, active/archive state, and campaign contexts without applying a merge.

## Finding 2 — Campaign Accounts require a union of two sources

Campaign–Organization membership is represented in two different ways:

- 1,181 unique pairs from `Company.projectsAssociated`.
- 769 unique pairs from Lead `campaignId + companyId` context.
- 624 pairs appear in both.
- 557 appear only in Company association.
- 145 appear only in Lead context.
- A lossless union contains 1,326 Campaign Account pairs.

The stored `targetCompaniesCount` matches `Company.projectsAssociated` exactly for every Campaign, proving that Company association—not the number of Companies with Leads—was the current counter source. However, excluding the 145 Lead-only pairs would orphan real Campaign Contacts and outreach history.

Required treatment:

- Create Campaign Accounts from the union of both sources.
- Record provenance per Campaign Account: `company_association`, `lead_context`, or both.
- Flag the 145 Lead-only pairs for review, but preserve them so their contacts/messages/enrollments remain connected.
- Keep the 557 association-only pairs even though no Lead was found; Campaign Accounts are allowed to exist before a contact is found.
- Recalculate campaign counts from Campaign Accounts and underlying response evidence. Do not migrate stored counters as editable truth.

Three Campaigns have stored `companiesRespondedCount` values that do not match the distinct Companies with response evidence. The target response count must be derived.

Every target Campaign requires one Service Offering. Current Campaign documents have no service field, so final Campaign activation/mapping must wait for an approved service assignment or remain explicitly unmapped in migration staging.

## Finding 3 — Outreach execution is spread across overlapping sources

### Enrollment overlap

- 3,220 distinct Lead + Campaign pairs occur in embedded `Lead.enrollments`.
- 1,756 occur in `sequenceenrollments`.
- 1,731 occur in both.
- 1,489 occur only in embedded Lead data.
- 25 occur only in separate Sequence Enrollment data.

The two representations must not become duplicate Enrollments. The separate collection contains Sequence/launch execution detail; embedded Lead enrollment often preserves older campaign-level status without a Sequence identity.

Required treatment:

- Build one reconciliation key from source Lead, Campaign, Sequence where present, and execution evidence.
- Use the separate Sequence Enrollment as the executable Sequence source when valid.
- Attach the overlapping embedded status as a source variant/history record rather than another Enrollment.
- Preserve embedded-only rows as legacy campaign outreach attempts with unknown/unavailable Sequence where necessary.

### Orphan/mismatched enrollments

- 25 Sequence Enrollment records point to Lead IDs no longer present in `leads`.
- All 25 have sent Send Jobs.
- Those Send Jobs point to valid but different Lead IDs from their Enrollment.

This is a known identity-link conflict, not disposable orphan data.

Required treatment:

- Preserve the Enrollment, Send Job, endpoint snapshot, Campaign, Sequence, and original missing Lead ID.
- Create an exception for each mismatch.
- Use the valid Send Job Lead only as matching evidence; do not silently replace the Enrollment Lead.
- Messages may be migrated with an unresolved endpoint participant while the identity link remains under review.

### Send Job and Email overlap

- 1,787 Send Jobs exist.
- 1,765 match Email records through provider ID → `Email.resendEmailId`.
- 22 Send Jobs have no Email match.
- 1,666 matched pairs have identical rendered subject/body.
- 99 matched pairs retain a different subject/body representation.

Required treatment:

- One outbound Message should link to both sources when the provider ID is shared.
- Preserve both source payloads/checksums for the 99 differing representations.
- Create Message candidates from the 22 unmatched Send Jobs when their sent/execution evidence supports it; never discard them because an Email row is absent.

## Finding 4 — Email, Reply, and thread data overlap

- 1,859 Email documents: 1,787 outbound and 72 inbound.
- 81 Reply documents.
- All 72 inbound Emails share an external message ID with a Reply.
- Nine Replies have no Email counterpart.
- Ten embedded thread-history messages share IDs with Reply records; one also overlaps an Email.
- Of the 72 Email/Reply overlaps, direction, subject, and timestamp agree for all. Body representations differ for 38.
- No Reply is currently marked `Reviewed`, and no stored human outcome is non-null.
- Eight Reply documents have no `humanReview` object.

Required treatment:

- Match primarily by provider/channel + external message ID.
- Create one canonical Message for the 72 proven overlaps and link both source documents.
- Preserve both raw/content variants for the 38 body differences; do not decide that one source never existed.
- Import the nine Reply-only items as Messages.
- Do not create duplicate Messages from the ten embedded thread items that share the Reply ID.
- Do not import vendor/AI intent as a human Review Decision.
- Existing unreviewed state remains unreviewed. Historical Tasks can be linked, but they do not prove a completed Review Decision.

## Finding 5 — Historical Jobs require controlled identity creation and matching

### Job/Opportunity overlap

- 16 Opportunity documents, including two archived.
- 229 Job documents, including two archived.
- Four Jobs have a valid explicit `opportunityId`, each pointing to a different Opportunity.
- 225 Jobs have no Opportunity link.

Required treatment:

- The four explicit pairs become the same target Ongoing Job and retain both source records.
- The other 12 Opportunities become Ongoing Jobs.
- The 225 unlinked Jobs become separate historical Ongoing Job candidates because EGS defines a separate quotation as a separate Job, unless later evidence explicitly proves a same-quotation relationship.
- Do not fuzzy-merge a historical Job into an Opportunity automatically.

### Customer Organization coverage

- Only four Jobs have `companyId`.
- Of the remaining 225 text-only Jobs:
  - 18 have a unique exact normalized Company-name match.
  - One has a unique Lead-email-to-Company match.
  - 14 have a unique job-email-domain-to-Company-domain match.
  - 194 have no exact automated Organization evidence from these methods.
  - None has blank customer text.

The evidence groups may overlap; a resolver must compare all signals and detect disagreement.

Required treatment:

- Accept an explicit valid `companyId` as the strongest link.
- Propose exact-name, exact known-contact-email, and exact domain links for review; automatically apply only an approved deterministic policy and only when all available evidence agrees.
- For the 194 without evidence, create a new Organization candidate from the preserved customer text rather than dropping or assigning the Job to an invented generic customer.
- Run duplicate-Organization review against existing and other newly created candidates before merge.
- Preserve the Job's original customer/contact text and endpoint snapshot even after a canonical link is confirmed.

### Services

- All 16 Opportunities currently have empty `services` arrays.
- Three historical Jobs have blank `typeOfJob`.
- Job types include the expected legacy service values plus apparent job/project descriptions stored as types: `DECCA Event`, `Bulwark Exhibition`, `Majestic Mountain Banner Installation`, and `FRF Ramada Branding`.
- `Constuction Site Items` and `Off Set printing` also require alias/spelling reconciliation.

Required treatment:

- Preserve every original type string.
- Map only approved service aliases to the final catalogue.
- Put blank, descriptive, or ambiguous values into the service-mapping queue.
- Do not delay core schema work while the 12 final Service records are being prepared.

### Financial and completion meaning

Across 229 Job records, legacy totals are:

- Amount: AED 1,245,373.10.
- Received: AED 116,659.00.
- Balance: AED 1,129,374.10.
- Two records fail `amount = received + balance` by more than AED 0.01.
- No negative values were found.

For 153 records labelled `Job Done`:

- 105 have zero legacy balance.
- 48 still have positive legacy balance.

Thirty-one non-Done Jobs have zero balance, demonstrating that delivery status and financial position cannot be derived from each other.

Required treatment:

- Preserve original amount/received/balance as a labelled legacy financial snapshot, not as a new SQL invoice/payment ledger.
- Reconcile completion/payment with Zoho before asserting the target fully-paid milestone.
- Preserve `legacy_status = Job Done`; do not silently force the 48 positive-balance records into target Job Done.
- The two equation failures require record-level exception handling.
- Job Done in the target remains derived from physical delivery plus Zoho-authoritative fully-paid confirmation.

## Finding 6 — Ongoing Jobs and Tasks are structurally sparse

### Opportunities

- 14 of 16 have no Campaign, which correctly supports direct/repeat work.
- Ten have no primary Lead.
- None has stakeholder Lead IDs.
- All have empty Service arrays.
- Stages: ten Quotation Sent, two Inquiry, two Job Done, one In Production, and one Design.
- Total legacy `valueAed` is AED 1,257,730, but this is a commercial estimate/snapshot, not a Zoho ledger.

Required treatment:

- Customer Organization is available for all 16.
- Stakeholder, service, phase, location, design, quote, authorization, and payment records must be created only from reliable evidence; empty future-ready relationships are preferable to invented facts.
- Preserve `activityLog` transitions as legacy progress evidence after field/value validation.

### Tasks

- 122 Tasks, including 14 archived.
- 110 lack `ownerUserId`; only 14 of those have a unique text match to a current User and 96 have no text match.
- 37 lack a due date.
- Three lack all typed business contexts.
- Nineteen lack `taskType`: ten relate to Ongoing Job + Company, seven to Ongoing Job + Campaign + Company, and two have no context.
- One uses legacy status `pending` rather than the current governed values.
- All 71 explicitly typed reply-review Tasks have a Reply reference.

Required treatment:

- Preserve the original owner label and do not assign one of the six Users without evidence.
- A confirmed unique text match may be proposed for human approval.
- Preserve null due dates rather than inventing deadlines.
- Map `pending` and missing Task types only through an approved deterministic rule; retain the original value.
- Keep all explicit contexts through named SQL links. Multiple contexts are expected and not duplication.

## Finding 7 — Most foreign-key-like references are intact

All audited non-null references resolve except the 25 Sequence Enrollment → Lead references described above. Valid reference families include:

- Company → Campaign association.
- Lead → Company, Campaign, referral Lead, and embedded Campaign enrollment.
- Email/Reply → Lead, Company, and Campaign.
- Task → User, Campaign, Company, Lead, Opportunity, Reply, and Interaction where populated.
- Opportunity → Company, Lead, Campaign, and User.
- Job → Company/Opportunity where populated.
- Sequence/Enrollment/Launch/Send Job relationships other than the 25 Enrollment Lead conflicts.
- Suppression, Audit, and Revision references.

This is a strong migration starting point, but SQL foreign keys must be introduced only after exceptions and nullable legacy conditions have explicit handling.

## Lossless preservation architecture

Normalizing into SQL inevitably changes shape. To guarantee that no source fact disappears, use two layers:

### Layer 1 — Canonical relational CRM

Typed SQL tables defined by the Foundation Specification and ERD. These power the application, constraints, reporting, and future forms.

### Layer 2 — Immutable migration evidence in SQL

Keep a restricted migration schema containing at least:

| Table | Purpose |
|---|---|
| `migration_run` | One dry run/rehearsal/final run, source watermark, importer version, start/end, status, and checksums. |
| `migration_source_document` | Original collection, Mongo `_id`, canonical Extended JSON payload, SHA-256 checksum, source timestamps, archive state, and run. |
| `migration_entity_map` | Source document/path → target table/ID/relation, mapping type, confidence, and approval. Supports one-to-many and approved many-to-one mappings. |
| `migration_exception` | Missing, contradictory, ambiguous, orphaned, unknown-enum, or failed records with resolution/status. |
| `duplicate_review_case` | Candidate Person/Organization IDs, matching evidence, reviewer decision, merge record, and reversal history. |
| `migration_reconciliation_metric` | Source measure, target measure, expected difference, actual difference, status, and evidence for every run. |

`migration_source_document.payload` must use canonical Extended JSON semantics so ObjectIds, Dates, and other BSON types remain distinguishable. It is not an application data model and must be access-restricted because it contains personal and commercial information.

Before any transformation, also create an encrypted, restore-tested full Mongo backup with collection manifest and file checksums. SQL raw preservation does not replace the source backup.

## Record disposition requirement

Every source document must end the migration in exactly one documented disposition:

- `normalized` — represented by one or more canonical target records.
- `consolidated` — represented by a canonical target record shared with other source documents; all source links retained.
- `legacy_archive_only` — intentionally not canonical because it is derived/obsolete, but raw evidence is preserved.
- `exception_pending` — preserved but awaiting a human decision.
- `excluded_empty_collection` — collection was audited at zero documents.
- `failed` — must be zero at cutover or explicitly accepted with recovery action.

This disposition ledger—not equal table counts—is the primary no-loss proof.

## Baseline reconciliation numbers

The final dry run and cutover must start by reproducing or explaining changes from these values:

- 33 collections total; 24 non-empty and nine empty.
- 4,022 Leads = 3,899 person candidates + 123 generic-inbox candidates; 820 archived.
- 1,172 Companies.
- 1,326 lossless Campaign + Organization pairs from the union of sources.
- 1,859 Emails + nine Reply-only external IDs, after proven overlap is consolidated and all variants remain linked.
- 1,787 Send Jobs, including 22 without Email match.
- 3,220 embedded enrollment pairs and 1,756 separate enrollment pairs, with 1,731 overlaps and 25 identity conflicts.
- 16 Opportunities + 229 Jobs, with four explicit same-Job pairs.
- 122 Tasks, seven Interactions, 112 Audit Logs, 291 Record Revisions, and one Suppression.
- 153 legacy Job Done labels, including 48 with positive legacy balance.

Because records may be added after this audit, final acceptance compares against the final source watermark rather than demanding that August counts remain unchanged.

## What this audit does not prove

- It does not confirm Zoho invoices, credits, payments, or balances because Zoho was not audited.
- It does not decide the final 12 Service Offerings or mappings.
- It does not authorize Person/Organization merges.
- It does not prove that a text-only historical Job belongs to an existing Organization merely because the names look similar.
- It does not prove the correct content choice where two sources share a message ID but retain different body representations.
- It does not replace a restore-tested backup, dry run, user acceptance test, rehearsal, or final delta/cutover process.

These are migration gates, not reasons to delay the service-independent SQL foundation.
