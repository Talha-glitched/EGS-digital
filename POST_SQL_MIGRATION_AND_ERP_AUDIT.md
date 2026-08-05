# EGS Post-SQL Migration and ERP Readiness Audit

Date: 5 August 2026  
Audit mode: read-only database reconciliation plus application-code inspection  
Purpose: establish what is intact, what is broken, how to repair it, and how the existing model becomes an EGS ERP without discarding the foundation.

## Executive conclusion

The SQL migration preserved most raw records and migration evidence, but the operational application is not yet reading those records according to EGS's agreed business definitions. There are four separate problems:

1. **A direct value-migration defect:** 14 current Ongoing Jobs have AED 1,257,730 in the preserved Mongo source and AED 0 in `ongoing_jobs.value_aed`.
2. **Missing derived business states:** the API does not calculate or return whether a Contact has replied, the reply date, response channels, or whether the Contact qualifies as a Lead.
3. **A definition mismatch:** the Relationships screen filters on the single manually-confirmed relationship profile. EGS's historical Lead population is instead the 70 Contacts with recorded inbound replies.
4. **Incomplete operational services:** campaign scoping, campaign statistics, job stakeholders, job execution summaries, several timelines, and some sequence operations are still placeholders or partial implementations.

This is repairable without replacing PostgreSQL, remodelling everything, or conforming good data to the old frontend. The correct direction is:

- keep the normalized SQL identity and relationship foundation;
- repair canonical links and values from preserved migration evidence;
- implement server-side derived read models;
- adapt the frontend to those contracts;
- then activate ERP modules around the existing `ongoing_jobs` aggregate.

## 1. Agreed business definitions

These definitions must become executable server-side rules, not frontend assumptions.

| Concept | Canonical meaning | Source of truth |
|---|---|---|
| Contact | A durable Person, with contact methods and one or more Organization Roles | `people`, `person_contact_methods`, `person_organization_roles` |
| Lead | A Contact for whom EGS has a saved, recorded inbound response | Canonical inbound `messages` linked to the Person; not a manually edited flag |
| Right POC | A role manually assessed as suitable for the relevant responsibility/service context | `poc_suitabilities` |
| Key Relationship Profile | Optional stewardship data such as standing, owner, service relevance, and follow-up | `key_relationship_profiles` |
| Campaign Contact | A Person–Organization Role or Organization endpoint pursued in one campaign | `campaign_contacts` |
| Ongoing Job | One continuous commercial and delivery record from Inquiry to Job Done or Job Lost | `ongoing_jobs` and its child records |

A Contact can therefore be a Lead without yet being confirmed as the Right POC. A Contact can also have a Key Relationship Profile, but that profile is not what makes the Contact a Lead.

## 2. Reconciliation results

### 2.1 Contacts, replies, and Leads

Mongo source evidence:

- Contacts: **4,022**
- distinct Contacts with a saved reply: **70**
- `leadStage = lead`: **70**
- the `leadStage = lead` set exactly equals the saved-reply Contact set
- POC assessments: **13 Confirmed**, **7 Redirected with Referral**, **2 Redirected without Referral**, and the remainder Unverified/unknown
- source relationship profiles: **3**, of which only **1** has Active/manual-confirmed meaning

SQL reconciliation:

- all **4,022** People exist in SQL and have valid migration mappings
- all **70** source reply-derived Leads map to People
- all **70** can be reached through canonical migrated inbound-message links
- active inbound messages after excluding migration duplicates: **104**
- those 104 messages resolve to **70** distinct historical reply-derived People
- **23** newer/runtime inbound messages have neither a Campaign Contact nor a Person participant

Conclusion: the 70 Leads were not lost. Their classification is absent from the API/read model, and 23 newer emails are unlinked.

### 2.2 Why the screens are wrong

`listAllLeads` returns identity, organization, POC assessment, and relationship-profile fields. It does not return:

- `hasResponded`
- `respondedAt` / `repliedAt`
- `responseChannels`
- `deliveryStatus`
- `outcome`
- `leadStage`

The frontend already expects several of these fields. Missing values therefore render as not replied, blank, or default Contact.

The Relationships page currently requests `keyRelationshipOnly=true`. The SQL implementation interprets that as `key_relationship_profiles.manually_confirmed = TRUE`, which correctly returns one row under that narrow definition but incorrectly represents EGS's reply-derived Lead population.

`listProjectLeads(projectId, options)` currently ignores `projectId` and delegates to the global Contact query. Campaign screens are therefore not reliably campaign-scoped.

Campaign coverage recalculation is not implemented, and campaign list statistics fall back to stored payload values or zeros.

### 2.3 Email linkage

| Inbound source | Active messages | Campaign linked | Person-participant linked | Fully unlinked |
|---|---:|---:|---:|---:|
| Migrated `emails` | 72 | 64 | 72 | 0 |
| Migrated `replies` | 9 canonical rows | 9 | 9 | 0 |
| Runtime/unlabelled | 23 | 0 | 0 | 23 |

The historical repair succeeded for the canonical migrated messages. The live IMAP and Resend sync paths create new Conversations and Messages without saving the matched `campaign_contact_id`, `campaign_id`, or a `conversation_participants` row. This would keep producing orphan email records after any one-time repair.

### 2.4 Ongoing Jobs and value

| Check | Result |
|---|---:|
| Current source Opportunities | 16 |
| Source Opportunities with non-zero value | 14 |
| SQL Ongoing Jobs with non-zero value | 0 |
| Preserved source total | AED 1,257,730 |
| SQL operational total | AED 0 |
| Value mismatches | 14 |

The frontend reads `ongoing_jobs.value_aed` correctly. This is a database projection/migration defect, not a display-format defect.

The database also retains **229** legacy Mongo `jobs` rows. The operational service deliberately excludes them, so only the 16 current Opportunity-derived jobs should appear. Keeping the 229 source-derived rows deferred and invisible is safer than destroying their provenance; they can be archived or moved to a historical schema later.

### 2.5 Implemented versus scaffolded foundation

Working/populated core:

- People, personal contact methods, Organizations, roles, locations
- Campaigns, Campaign Accounts, Campaign Contacts
- Sequences, versions, steps, enrollments, send jobs
- Conversations, participants, messages, review items
- Tasks and a small number of Interactions
- Ongoing Job headline records
- migration source documents, mappings, exceptions, and audit evidence

Present but empty/unactivated:

- Service Families, Service Offerings, UOMs, permitted UOMs
- configurable Inquiry templates, field definitions, specification answers
- Events, Editions, Participations
- Customer Stakeholders, Job Phases, Job Locations, Job Scope Lines
- Design Versions
- Quotes, Quote Versions, Quote Lines
- Customer Authorizations and Financial Milestones
- Job Events
- Files, Notes, Revenue Entries

Missing or incomplete physical relationships from the logical design include several bridge/history concepts, such as design–quote links and decisions, scope-to-phase/location allocation, assignment history, progress history, file/context links, note revisions, and controlled merge history.

## 3. Repair programme

Repairs must be idempotent, transaction-safe, and preceded by a fresh database snapshot. Every data change must produce before/after reconciliation counts.

### Repair 1 — Canonical Contact response read model

Build one server-side query/view that returns for every Person:

- `hasResponded`
- `respondedAt` as the earliest canonical inbound response time
- `lastRespondedAt`
- `responseChannels`
- `leadStage = lead` when canonical inbound evidence exists, otherwise `contact`
- relevant delivery/outcome state in campaign context

Do not copy these values onto `people` as independent editable facts. They are derived from Messages and Interactions. A materialized view may be used later only if measured performance requires it.

Acceptance gate: the global Lead population is 70 for the migrated baseline, and each Lead opens to at least one supporting inbound record.

### Repair 2 — Separate the three relationship views

Expose explicit filters/read models for:

1. Leads/responders
2. Right POCs
3. Managed Key Relationship Profiles

The current Relationships page should use the reply-derived Lead definition if its business purpose is the historical Leads/relationship-working list. Relationship profile fields remain optional enrichment on those rows. The UI must not call all Contacts key relationships or equate one manual profile with the full Lead population.

### Repair 3 — Repair live email ingestion

When an inbound sender matches a Person contact method:

- reuse or resolve the correct conversation/thread where possible;
- write `conversations.campaign_contact_id` and `campaign_id` when context is known;
- insert the sender/recipient `conversation_participants` with endpoint snapshots;
- create the Review Item against the canonical Message;
- derive Lead state from the saved inbound evidence;
- freeze only the relevant sequence enrollment(s).

Backfill the 23 runtime inbound messages by normalized sender email and, where unambiguous, campaign/thread evidence. Ambiguous records must enter a manual exception queue; they must not be guessed.

### Repair 4 — Restore current Ongoing Job values

Update only the 16 Opportunity-mapped Ongoing Jobs from their preserved source documents. Restore the 14 non-zero values and retain zero for the two genuinely zero-valued source records.

Acceptance gate:

- 16 source/target rows reconciled
- 14 non-zero target values
- target total AED 1,257,730
- zero mismatches

### Repair 5 — Campaign scoping and metrics

- make `listProjectLeads` join through Campaign Account and Campaign Contact for the requested Campaign;
- implement reply, emailed, POC, company-reached, and queue counts from canonical SQL records;
- remove payload statistics as an operational source of truth;
- test global, campaign, company, and person views against the same events.

### Repair 6 — Replace operational placeholders

Implement or explicitly disable incomplete features. Priority placeholders are:

- Ongoing Job contacts/stakeholders and execution summaries
- Ongoing Job timelines
- campaign coverage recalculation
- sequence audience/enrollment and queue operations that currently return empty or zero responses
- finance dashboard numbers that currently return zeros

No screen should display a fabricated zero, empty list, or count when its service is not implemented. Use an explicit “not available yet” contract until the canonical query exists.

## 4. ERP direction for EGS

### 4.1 Architectural choice

Use the current PostgreSQL model as a modular-monolith core. Do not rebuild the system as one giant generic ERP schema and do not create separate copies of Customers, Contacts, Jobs, or Services for each department.

The central chain remains:

`Organization → Ongoing Job → Scope / Design / Quote → Authorization → Production / Procurement / Installation → Financial settlement → Outcome`

Campaign is optional attribution. A direct or repeat-customer Job remains valid without a Campaign.

Introduce a thin typed SQL layer incrementally. Drizzle is a suitable fit for the current Node/PostgreSQL, SQL-first codebase because it can coexist with purposeful raw SQL. Keep complex reconciliation and reporting SQL where it is clearer; do not perform a risky all-at-once ORM rewrite.

### 4.2 Modules to retain and complete

1. **CRM and relationships:** identity, Organizations, Contacts, roles, POC suitability, relationships, campaigns, communications, reviews, tasks.
2. **Service catalogue and inquiry:** 12 configurable Service Offerings, UOMs, versioned forms, typed answers.
3. **Commercial job control:** one Ongoing Job, stakeholders, scope lines, design versions, quote versions, independent approvals, pre-PO authorization.
4. **Delivery/project control:** phases, locations, dependencies, assignments, progress, deadlines, change events, files and notes.

### 4.3 Modules to add for a full EGS ERP

| Module | Principal additions | Existing anchor |
|---|---|---|
| Estimating and costing | estimate versions, material/labour/subcontract/equipment cost lines, margin approvals | Job Scope Line + Quote Version |
| Product/BOM and production | reusable assemblies, BOM versions, routing/operations, work orders, production batches, QA holds | Service Offering + Job Scope Line |
| Procurement | Suppliers as Organizations, RFQs, supplier quotations, purchase requisitions, POs, receipts, subcontract work | Organization + Job/Scope/Work Order |
| Inventory and warehouse | items/materials, units and conversions, warehouses/bins, stock movements, reservations, wastage, returns | UOM + BOM + Work Order |
| Resource planning | employees/crews, skills, availability, shift/job assignments, time entries | User/Person + Job Phase/Task |
| Installation and logistics | site access windows, vehicles, load plans, dispatches, installation checklists, handover, snagging | Job Location + Job Phase |
| Quality and HSE | inspection plans, checklists, non-conformances, corrective action, permit/safety evidence | Work Order + Job Location + File |
| Equipment/assets | owned/rented equipment, allocation, maintenance, calibration, utilization | Job/Phase/Location |
| Finance integration | invoices, bills, payments, credit notes and balances referenced/synced from Zoho; internal committed/actual cost | Financial Milestone + external references |
| Management reporting | job margin, WIP, resource load, procurement exposure, on-time delivery, cash status | governed read models across modules |

Zoho should remain the accounting ledger initially. EGS ERP owns operational commitments, scope, estimates, production, delivery, and the external document references; it should not silently duplicate authoritative accounting transactions.

### 4.4 What to remove or retire

- Mongo models and Mongo fallback behavior after reconciliation and retention sign-off
- payload JSON as a source of operational business facts
- frontend-derived business classifications and totals
- duplicate Opportunity/Job service vocabulary where both mean the same Ongoing Job
- the separate `completed_jobs` business store; Jobs Done remains a governed view/state of Ongoing Job
- fabricated placeholder counts and demo task data
- automatic identity merges based on name, email, domain, or LinkedIn; duplicate candidates always require human confirmation

Retire does not mean immediately delete. Preserve migration source documents, crosswalks, checksums, exceptions, and audit evidence according to a retention policy.

## 5. Delivery sequence

### Stage A — Trustworthy CRM baseline

Complete Repairs 1–6. Add automated reconciliation tests and a migration health dashboard. Do not start broad ERP UI work until the baseline gates pass.

### Stage B — Commercial and design control

Activate the 12-service catalogue, inquiry templates, Job Scope, Design Versions, Quote Versions/Lines, decisions, and pre-PO authorization. This is the highest-value ERP expansion because it follows EGS's actual win process.

### Stage C — Delivery control

Activate phases, locations, stakeholders, component owners, tasks, files, progress history, installation/handover, and rework events.

### Stage D — Costing, procurement, and production

Add estimate cost build-up, approved margin, BOM/routing, suppliers, RFQs/POs, inventory movements, work orders, and QA. Begin with the processes shared across most service categories; add service-specific templates rather than separate systems.

### Stage E — Resource, logistics, and financial integration

Add crews, scheduling, vehicles/equipment, time capture, Zoho synchronization, WIP and margin reporting.

### Stage F — Optimization

Add dashboards, forecasting, capacity planning, exception automation, and selective AI only after the underlying human-reviewed facts are reliable. Current EGS direction remains no AI classification of replies.

## 6. Control gates

Every implementation stage must pass:

- row-count and financial-total reconciliation
- foreign-key/orphan checks
- source-to-target traceability
- business scenario acceptance tests
- role/permission checks
- audit-history checks
- restore rehearsal
- UI/API contract tests

The foundation is ready to become an ERP only when one fact has one canonical owner, derived states can be traced to evidence, and each screen reads a governed server-side contract.

## 7. Immediate next work

1. Snapshot PostgreSQL and record the reconciliation baseline.
2. Implement the Contact response/Lead read model and correct the Relationships view.
3. repair both live email-ingestion paths and backfill the 23 unlinked inbound messages.
4. restore the 14 Ongoing Job values from migration staging.
5. implement campaign scoping and canonical statistics.
6. replace or disable the highest-impact placeholder services.
7. rerun the audit and proceed to the service catalogue/commercial ERP stage only after every gate is green.

The accompanying executable audit is `server/scripts/auditBusinessSemanticsReadOnly.js`. It opens a read-only PostgreSQL transaction and reports aggregate business reconciliation data without exposing contact details.
