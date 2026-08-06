# EGS ERP Product Audit and Implementation Roadmap

Status: Current product and live PostgreSQL audit  
Audit date: 6 August 2026  
Business scope: EGS exhibition stands, graduation ceremonies, corporate events, retail branding, signage, printing, vehicle branding, displays, BTL installations, kiosks, fabrication and site installation

## Executive verdict

EGS already has a valuable commercial CRM. It should be evolved, not replaced.

The missing link is the operational delivery spine inside the continuous Ongoing Job. Inventory, resource planning, barcode movements, mobile time and operational employee records should attach to a trusted Job, work package, phase, location and activity. Building those modules before the Job workspace is consistently used would create disconnected ledgers and more data entry.

The product direction is:

```text
Campaign and direct enquiry
  → Person, organization and relationship
  → Reply and human qualification
  → Continuous Ongoing Job
  → Brief, scope and work packages
  → Designs, quotes and exact approvals
  → Tasks, suppliers, production and installation
  → Resource time and material movements
  → Physical delivery and payment settlement
  → Final evidence, costs and reusable learning
```

## Evidence from the live system

The initial PostgreSQL audit ran inside a read-only transaction and found 63 tables with no audit-query errors. After the additive Job Memory implementation, the verification audit found 65 tables: `note_versions` and `note_attachments` are the two new records.

### Working and populated commercial core

| Area | Representative live records | Assessment |
|---|---:|---|
| Campaigns | 12 | Working core |
| Campaign accounts | 1,326 | Working core |
| Campaign contacts | 4,040 | Working core |
| People | 4,022 | Working core |
| Organizations | 1,172 | Working core |
| Person contact methods | 7,955 | Working core |
| Conversations | 3,755 | Working core |
| Messages | 1,963 | Working core |
| Sequence enrollments | 1,756 | Working core |
| Send jobs | 1,787 | Working core |
| Ongoing Jobs | 245, including deferred historical records | Canonical work identity exists |
| Tasks | 213 | Preserved and served through the unified CRM/ERP task model |
| Review items | 104 | Working human-review queue |
| Users | 6 | Working authentication and ownership core |
| Audit events | 81 | Working but coverage must expand |

### ERP scaffolding status at the start of this tranche

The following live tables contained zero records at audit time:

- Service families, service offerings, UOMs and service templates.
- Job phases, Job locations and Job scope lines.
- Design versions, quotes, quote versions and quote lines.
- Customer authorizations and financial milestones.
- Notes, files and Job events.
- Customer stakeholders.
- Completed Jobs.
- Event editions and event participations.

Job Memory is now live, and work packages, phases, locations, the service catalogue and UOM catalogue have now been productized. The remaining empty areas are an implementation queue, not separate systems to populate prematurely.

## EGS-specific optimization target

EGS is not a predictable catalogue retailer and not a conventional software-services company. Most work is custom physical delivery with overlapping capabilities, hard venue dates, design and quote revisions, external suppliers, workshop production, access restrictions, installation crews, reusable equipment and materials that may return damaged or not return.

The system must therefore optimize for:

- One Job containing several services, sites, phases and deliverables.
- Fast capture of client instructions and last-minute changes.
- Exact preservation of designs, quotations and approvals.
- Production and installation readiness.
- People, subcontractors, vehicles, equipment and materials scheduled together.
- Reusable assets, quantity stock and consumables behaving differently.
- Site photographs, damage evidence, snag lists and final delivery proof.
- Planned-versus-actual labor, material, supplier cost and margin.
- Learning from previous fabrication and installation problems.

## Product rules

1. One Ongoing Job identity survives from Inquiry to Job Done or Job Lost.
2. Jobs Done is a view/state of the same Job, never a copied business record.
3. A Job can contain many work packages and service classifications.
4. Service labels are configurable records; they do not create twelve schemas.
5. A structured field is justified only when EGS must assign, schedule, filter, approve, calculate, enforce or report it.
6. Narrative explains context; it does not replace tasks, approvals, costs, time entries or stock movements.
7. Files, designs and quotations are immutable revisions, not overwritten attachments.
8. Approvals identify the exact revision approved.
9. Inventory balance is derived from movements; it is never directly edited.
10. Timeline and dashboards are read models over authoritative records, not additional write stores.
11. Every important change retains actor, timestamp and provenance.
12. Ordinary updates should require one or two user-entered inputs.

## Redundancy and source-of-truth register

| Existing element | Decision | Canonical replacement or reason |
|---|---|---|
| Editable `ongoing_jobs.notes` | Remove from all new entry and editing | A pinned `brief` in versioned Job Memory. Existing values are copied idempotently and retained in the old column for rollback only. |
| `ongoing_jobs.next_action` text | Retire from ordinary UI | The next action is the earliest relevant open Task; free text cannot be assigned, completed or audited reliably. |
| Separate `completed_jobs` create/edit workflow | Remove from product workflow | Jobs Done is a filtered view of the same Ongoing Job at stage `Job Done`. Historical imports remain deferred until the live workflow is stable. |
| Opportunity terminology and frontend wrappers | Remove from visible product | Ongoing Job is EGS's business term and durable entity. Backend aliases remain temporarily for compatibility. |
| Separate Flow Mind Map page | Remove | Sequence Studio is the maintained sequence editor. |
| Separate Sent Emails page | Remove | Sent is a tab/read model within the Email hub. |
| Resend top-level navigation | Hide from ordinary work | Provider diagnostics belong in Email settings/delivery exceptions; provider evidence remains stored. |
| Job Tasks tab and global Tasks page | Keep both | They are contextual and cross-Job views over the same Task records—not competing stores. |
| Inbox and Email hub | Keep both for now | Inbox is reply/action triage; Email is outbound queue/delivery operations. They may share a Communications shell later without merging data. |
| Companies, Contacts and Key Relationships | Keep distinct | Organization, person and confirmed right-POC relationship are different business facts. A future Account workspace can compose them. |
| Campaigns and Sequences | Keep distinct | Campaign defines commercial context/audience; sequence defines reusable outreach execution. |
| Task notes | Keep | Task-specific execution detail belongs to the Task; it should not be used as general Job history. |
| Qualification/relationship notes | Keep | They document the evidence for a person-specific classification, not the Job brief. |
| Job Memory attachments and generic files | Keep with clear boundaries | Memory attachments prove a particular statement/version; the future artifact register owns designs, quotations and production files. |
| Summary stage | Keep as a navigation aid | It does not replace separate design, quotation, production, installation, delivery and payment facts. |
| Job value and finance records | Keep separately | Job value is the current commercial amount; invoices, receipts, costs and payment milestones are accounting/financial facts. |
| Board and table views | Keep both | Alternate views of the same Jobs improve planning and lookup without duplicating data. |
| JSON activity log | Freeze, then retire | Structured audit events and domain events become the history source; do not expand the embedded log. |

### Removal rule

Remove an element when it independently writes the same business fact. Keep an element when it is a useful alternate view of the same record, or when it represents a genuinely different fact with a different owner and lifecycle.

## Module-by-module audit

### 1. Today and dashboard

**Keep**

- Leads requiring action.
- Key relationships requiring follow-up.
- Active Ongoing Jobs.
- Daily review discipline.

**Change**

- Replace broad summary cards with an exception-first Today view: overdue work, replies needing review, pending client approvals, production blockers, installations in the next seven days, missing materials and unpaid delivered Jobs.
- Derive counts from canonical records and display completeness warnings where data is unclassified or unlinked.
- Show only information the current user can act on.

**Do not add yet**

- Predictive dashboards based on empty operational data.
- Manually maintained KPI totals.

### 2. Campaigns, leads and qualification

**Keep**

- Campaign, account and campaign-contact separation.
- A Lead as a contact with a recorded relevant reply in context.
- Human reply review.
- Right-POC qualification distinct from Key Relationship.
- Sequence enrollment and delivery evidence.

**Change**

- Keep technical enrollment and launch concepts inside the campaign workspace rather than exposing them as equal top-level business modules.
- Provide one fast action from a qualified reply to create or link an Ongoing Job without re-entering organization, contact, campaign or email history.
- Show campaign attribution on the Job while allowing direct Jobs with no campaign.

**Retire gradually**

- Mongo-shaped API naming and aliases after the frontend no longer depends on them.
- Any duplicated lead/contact facts stored only for frontend convenience.

### 3. People, organizations and relationships

**Keep**

- Canonical people and organizations.
- Multiple contact methods.
- Person–organization role history.
- Manual duplicate review.
- POC qualification and Key Relationship as separate facts.

**Change**

- Present these through a shared Account workspace: organization summary, people, relationship state, campaign history, communications, Jobs and tasks.
- Use one timeline read model rather than separately maintained histories.
- Keep LinkedIn and email as duplicate evidence, with human confirmation.

**Unified Account workspace implemented**

- One company workspace composes canonical identity, contacts, replied Leads, confirmed Key Relationships, campaign history, original email conversations, Ongoing Jobs, open tasks and the combined timeline.
- Lead and Key Relationship remain separate earned classifications: a reply creates Lead status; Key Relationship requires suitable/right-POC assessment plus manual relationship confirmation.
- Account summary counts are derived from the authoritative communication, suitability, relationship, Job and task records rather than stored as competing company flags.
- Email conversations open from their immutable source, while Jobs and tasks deep-link to their existing operational workspaces.
- Fast Account actions create a company-linked task, company/contact/campaign-attributed Ongoing Job, or new contact without duplicate entry.
- The former generic company notes area is removed from the Account workflow. Communication remains in Email, action remains in Tasks and delivery knowledge remains in versioned Job Memory.

**POC, referral and Key Relationship workflow implemented**

- POC assessments are dated append-only records. Screens and filters use only the latest assessment, so corrections do not destroy history or leave stale Right POC results visible.
- A referral is created or linked in the same SQL transaction as the referring contact's assessment, including the new person's contact methods, company role and campaign context. A failed save cannot leave an orphaned Person.
- Exact email or LinkedIn matches stop for human duplicate resolution; they are never silently merged.
- A reply still creates Lead meaning only. Right POC remains a separate human suitability assessment, and Key Relationship requires a second explicit manual confirmation.
- Key Relationship confirmation and removal are audited. Changing a contact away from Right POC revokes the active confirmation while preserving the assessment trail.
- Referral details and the referred Person link are returned consistently in contact lists, drawers and the Account workspace.
- “Wrong POC” is contextual and does not close the Organization or prevent future outreach.

### 4. Email, inbox and sequences

**Keep**

- Canonical conversations, participants and immutable messages.
- Provider delivery identifiers and status.
- Inbox review and outbound sequence controls.
- Separate sender/account configuration.

**Communications-to-Job action layer implemented**

- Inbox replies, sent-email threads and email detail drawers expose one consistent Send to Job action.
- A conversation can link to one or more Ongoing Jobs without copying or changing its immutable messages.
- Users can link only, create a Task, record a requirement, client change or decision, report a linked issue/blocker, or record an approval/rejection/change request against one exact design or quotation version.
- A new Job can be created directly from a conversation with company, contact and campaign attribution inherited from the source.
- Task and issue actions can retain work-package, phase, location and activity context; an activity-specific issue also blocks that canonical activity.
- Every action identifies the exact source message when selected and is recorded in a separate append-only action ledger.
- Job Memory entries, timeline tasks/issues, linked messages and design/quotation decisions created from communication expose a View source email action. It opens the original immutable conversation and highlights the exact source message when one was selected.
- Linked messages appear in the Ongoing Job timeline directly from the communication source, while contact and company timelines display the linked Job reference.
- The operational Job picker excludes deferred historical imports and prioritizes Jobs belonging to the conversation's company.

**Unified Communications workspace implemented**

- Inbox, outbound launch batches, sent messages, delivery exceptions, cross-message search and Job-linked communication now share one Communications area.
- The default Needs attention view derives pending reply reviews, delivery exceptions, queue volume, today’s sends, linked conversations and unlinked reply conversations from canonical SQL records.
- Search spans sent and received immutable message evidence by subject, body, contact, company and campaign, and opens the complete original conversation.
- Linked Work shows the Jobs supported by each conversation without copying email bodies into Jobs or Job Memory.
- Legacy Inbox, Email and Sent routes redirect into the relevant Communications tab so bookmarks keep working without maintaining competing pages.
- Resend/provider diagnostics remain available from Communications for troubleshooting, but are removed from ordinary top-level navigation.

**Human reply review queue implemented**

- Every pending reply can be assigned to an active ERP/CRM user; assignment creates or updates the canonical reply-review Task instead of storing a second owner field.
- A human records one explicit outcome and optional decision note. The decision is appended to `review_decisions`, the `review_item` is resolved and its source message is marked human-reviewed.
- Interested, ambiguous, referral and out-of-office outcomes require an owned, dated follow-up Task before the review can leave the queue.
- Wrong POC and Not Interested Now do not delete the Lead, close the company or prevent future outreach to a different contact.
- Unsubscribe and Bounce are the only outcomes here that add endpoint suppression and stop active sequence enrollment for that campaign contact.
- POC suitability and Key Relationship confirmation remain separate manual decisions; reply review does not promote either automatically.
- Legacy contact-level reply review now uses the same SQL decision transaction, fixing the former path that completed only a Task without resolving the review ledger.

**Campaign contact coordination implemented**

- A human reply focuses follow-up on that responder within the specific Campaign Account and pauses competing contacts only in that company/campaign context.
- The responder's enrollment and competing enrollments are held without deleting enrollment or send evidence; queued future sends for that Campaign Account are cancelled with an explicit operational reason.
- The send worker independently enforces focus holds, so an accidentally active enrollment cannot bypass campaign-contact coordination.
- A detailed referral transfers focus to the referred Person atomically with POC assessment and campaign linkage. The referrer becomes redirected and other contacts remain paused.
- Wrong POC without a referral releases that contact and marks the remaining company contacts available for a new manual selection. It never closes the Organization.
- Users can explicitly make an available contact the campaign follow-up focus from the contact drawer. This action is audited and deliberately does not restart automated sending.
- Every focus transition is retained in an append-only event history with previous/new state, reason, source reply or POC assessment and acting user where applicable.

**Sequence execution engine implemented**

- Sequence drafts now publish immutable SQL versions and exact ordered email steps instead of storing only a frontend-shaped payload.
- Audience Preview calculates real Contacts, companies and Campaign contexts with explicit counts for eligible, net-new, already enrolled, already sent, queued and safety-blocked recipients.
- Eligibility excludes missing/invalid email endpoints, suppression, bounce/opt-out states and Campaign Account focus holds before enrollment.
- Launch requires explicit confirmation and creates one auditable Launch Batch, canonical Enrollments and idempotent first-step Send Jobs in a set-based transaction.
- Newly launched jobs are staged in Outbox with `manual_send` protection. Launching never transmits email by itself.
- Releasing an Outbox batch hands only its remaining jobs to the safe worker. Already-sent jobs and immutable Message evidence are never resent silently.
- The worker locks and processes one exact Send Job, rechecks enrollment, suppression and Campaign Contact focus immediately before delivery, records the resulting Conversation/Message and advances to the next versioned step using its configured delay.
- Worker interruption changes uncertain `processing` jobs to visible failures for review; it does not assume an unknown provider result is safe to resend.
- Reset Enrollment is a deliberate resend authorization marker. It preserves historical enrollments, Send Jobs and Messages while allowing a later launch to create a new execution.
- Outbox launch lists, job rows, status progress, queue removal and campaign queue controls now read and mutate canonical SQL records rather than returning placeholder zeros.

**Do not remove**

- The underlying provider-specific evidence required for troubleshooting and audit.

### 5. Continuous Ongoing Job

**Keep**

- The existing Ongoing Job as EGS's continuous commercial and operational container.
- Existing familiar workflow labels as a derived navigation aid.
- Owner, collaborators, customer and stakeholders.

**Implemented in the current tranche**

- Replace Current Brief with a pinned, versioned Brief in Job Memory.
- Add multiple work packages/scope lines with optional service and UOM classification.
- Add phases and locations; dates and ownership are supported by the shared schema.
- Keep design, production, installation, physical delivery and payment as separately auditable dimensions even when the UI presents a simple summary stage.
- Surface current approved design, current accepted quotation, open blockers, pending approvals, next actions and latest customer communication on one screen.

### 6. Job Memory, notes, files and learning

**Implement now**

- Typed Job Memory entries: brief, requirement, update, client comment, decision, approval, issue, site update, production update, installation update, photo, resolution and learning.
- Routine capture requires type plus text or file; Job, user and time are inferred.
- Edits create immutable note versions.
- Attachments belong to the exact note version and retain checksums.
- Important entries can be pinned.
- A pinned Brief entry is the current narrative truth; its versions explain how that truth changed.
- New events create new entries; corrections to the same fact create a new version.

### 7. Tasks

**Unified Tasks and My Work foundation implemented**

- One task system for lead, relationship, Job and general work.
- Real ERP/CRM user ownership, due date, priority and explicit Pending, Blocked, Waiting, Completed and Cancelled states.
- Optional links to the exact Ongoing Job, work package, phase, location and production activity, with PostgreSQL protection against cross-Job links.
- Directed task dependencies with self-reference and dependency-cycle protection.
- Optional completion evidence using notes or files; a task can require evidence before completion.
- My Work and Team Work views with overdue, today, next-seven-days, blocked, waiting and later/unscheduled counts.
- Task due dates appear in the Plan Calendar and List from the same task rows; dragging reschedules the original task.
- Scheduled activities remain resource/time commitments. Tasks remain accountable actions and may point to an activity without becoming a second planning record.
- Existing migrated tasks remain unchanged; no operational context has been fabricated for legacy records.

**Context inference to extend at natural entry points**

- Job-created tasks already inherit the Job. New issue, approval and message actions should pass their known source and work context when those action surfaces are added or consolidated.

**Remove from workflow**

- Multiple different buttons creating equivalent follow-ups with inconsistent fields.
- Notes used as action reminders.

### 8. Designs, quotations and approvals

**Implemented foundation**

- Logical design and quotation series inside each Job.
- Immutable file revisions with filename, size, MIME type and SHA-256 checksum.
- Draft versus issued state and revision notes.
- Independent append-only design and commercial decisions tied to exact versions.
- Optional identification of the customer contact who made the decision.
- Structured quotation lines preserved inside each immutable quotation version, including work package, service, UOM, quantity, unit price, phase and location snapshots.
- Issued quotations require at least one structured line; the stored quotation total must reconcile exactly to its lines.

**Controls now enforced**

- Never overwrite an issued revision.
- Approval must reference one exact revision.
- Approved, rejected, changes requested and withdrawn decisions are append-only.
- The newest revision and newest approved revision remain visibly distinct.

**Execution and reconciliation controls implemented**

- A production release identifies the exact approved design and quotation versions used as the execution basis.
- Quotation revenue, estimates, supplier commitments and actual costs reconcile at whole-Job or work-package grain.

### 9. Supplier and procurement operations

**Implemented production foundation**

- Reusable supplier identity backed by the canonical Organization record, with searchable capability labels.
- Optional Job/work-package RFQs and side-by-side supplier quotation comparison.
- A fast direct-commitment path when EGS agrees ordinary purchasing by phone, email or WhatsApp and does not need a formal RFQ.
- Purchase-order/supplier reference, expected and actual delivery, and committed versus actual supplier cost.
- Append-only supplier progress, delivery, issue, resolution, cost-change and cancellation updates.
- Accepting a supplier quote preserves the quotation and links it to the resulting commitment.
- Unified Project Management supplier directory with capability search, contact details, cross-Job usage, open commitments, spend and issue visibility.

Supplier cost must attach to the Job and preferably to a work package. A supplier WhatsApp summary may be a Job Memory entry, but the commercial commitment remains structured.

**Next procurement expansion after real usage**

- Supplier documents and exact quotation-file attachment.
- Approval thresholds only if EGS establishes a real purchasing authority policy.

### 10. Plan calendar and resources

**Implemented production-planning foundation**

- Cross-Job Calendar, Gantt and List views over the same canonical Job activities.
- Drag-across date selection in Calendar and Gantt views opens fast activity creation with the range prefilled.
- Every planner-created activity requires an Ongoing Job; no floating calendar-only records are allowed.
- Existing activities can be dragged to another date while retaining duration and Job identity.
- Job-specific production plan with work package, phase and location context.
- Activity ownership, planned start/end, status and blockers.
- Production release tied to exact design and quotation versions.
- Authorized-exception path for work starting while approval, PO or deposit is pending.
- Append-only progress, blocker, resolution, completion and evidence updates.
- Advisory production-readiness checks that expose missing information without creating an inflexible blocker.

**Implemented resource-planning expansion**

- Resource lanes for employees, teams, subcontractors, vehicles and reusable equipment over the same canonical Job activities.
- Fast activity-level assignment and reservation from the Job production plan or Plan Calendar.
- Assignment-level planned allocation hours kept separate from calendar duration; labor totals include only employee/contractor resources.
- Actual hours derived from project-time entries and compared with planned hours per activity and resource.
- Planned and actual labor cost derived from assignment/time records and the resource planning rate.
- Conflict warnings cover overlapping assignments and typed availability blocks; unassigned activities remain visible in an explicit lane.

The calendar schedules activities such as survey, design, production, packing, transport, installation, event support, dismantling and return—not one vague block for the entire Job.

### 11. Employee and contractor operations

**Implemented operational foundation**

- Existing users, roles and permissions remain the login and authorization identity.
- Separate operational resources for employees, contractors, teams, subcontractors, vehicles and equipment.
- Optional login or supplier linkage, searchable capabilities, identifier and planning-cost metadata.
- Multiple resource assignments on the same canonical Job activity.
- Typed availability blocks and advisory overlap/conflict detection.
- Operational employee/contractor profiles extend the same resource identity rather than creating a second people directory.
- Fast people workspace showing role, skills, current team, availability, compliance exceptions, scheduled activities and monthly project time.
- Formal team membership history with effective dates and overlap protection.
- Site-access, safety, driving, equipment and trade compliance records with expiry warnings.
- Database constraints prevent employee records from being attached to vehicles, equipment or teams, and prevent team membership from using the wrong resource types.
- Controlled ERP/CRM user synchronization: administrators can confirm an existing-user match, create an employee from an unlinked user, or create the user and employee atomically from the employee workflow.
- Login name, email, role, permissions and credentials remain user-owned; operational skills, teams, availability, compliance, assignments and project time remain employee-owned.
- Linked display-name changes synchronize from the user identity to the operational resource without overwriting employee operations data.

**Possible expansion only after usage**

- File attachment to a compliance record only if metadata and expiry tracking prove insufficient.

**Do not build without a proven need**

- Recruitment, performance appraisal, broad payroll, or a general HR suite.

### 12. Mobile time and site capture

**Implemented project-time foundation**

- Responsive Resources & Time workspace available to operational users.
- Start and stop a running timer against an Ongoing Job and optional exact activity.
- Manual start/end capture for missed timers.
- Immutable correction history in the data model.
- Monthly actual hours by operational resource.

**Implemented mobile field-execution workspace**

- Responsive Today workspace showing the signed-in person's overdue, current, next-seven-day and completed assignments from the canonical Job activity plan.
- One activity context exposes the exact Job, site, phase/work package, approved production documents, materials, supplier deliveries, crew, vehicles, equipment and existing evidence.
- Start/pause project time, save progress, record remaining work, report a problem and complete work without navigating through the desktop Job workspace.
- Phone-camera or file capture for progress, installation, final-delivery and problem photographs.
- A field submission is the single capture event; its photographs are referenced from activity evidence and Job Memory, while final photographs also satisfy Job closeout evidence.
- Problems block the activity and create an accountable resolution task linked to the same Job, work package, phase, location and activity.
- Final-photo evidence remains mandatory before the whole Job can move to Job Done, even when individual activities are completed in the field.
- Employee/user linkage determines personal assignments and time ownership; activities owned directly by a user remain visible while an unlinked login is clearly identified.

**Next mobile expansion only after real site use**

- Offline/PWA capture only if field connectivity makes the online workflow unreliable.
- Optional location capture only if EGS proves it is operationally useful and defines the privacy policy.
- Planned-versus-actual labor and labor-cost reporting after time-entry discipline is established.

Attendance time and project time are different. Begin with project time because it improves Job planning and costing directly.

### 13. Inventory and barcode management

**Implemented barcode-pilot foundation**

- Item catalogue using the shared UOM catalogue and explicit serialized, reusable-quantity or consumable tracking.
- Individually tagged serialized assets, quantity balances and warehouse/bin/vehicle/site locations.
- Job/date reservations and packing lists.
- Append-only receipt, transfer, checkout, consumption, return, damage, loss and adjustment movements.
- Camera, hardware-scanner and manual barcode entry with idempotent submissions.
- Location balances reconstructed from movements, with negative-balance protection.
- Exact Job links on relevant movements and audit coverage.

**Next inventory expansion after physical pilot**

- Barcode-label printing templates.
- Cycle-count sessions with variance approval.
- Packing dispatch/return batch actions after EGS validates its preferred scan sequence.
- Supplier receipt links and receipt-document evidence.
- Purchasing automation only after EGS validates the physical receive/issue/return sequence.

Start the physical pilot with valuable reusable items such as AV equipment, furniture, tools and reusable exhibition components. Do not pretend all printing media and workshop consumables are accurately tracked before receiving, issuing and cycle-count discipline exists.

### 14. Finance, costing and reporting

**Keep**

- Operational Job value and payment milestones.
- Zoho references and integration boundary.
- Campaign attribution and revenue reporting.

**Change**

- Separate quoted revenue, estimated cost, committed supplier cost, actual material cost, actual labor, invoice, receipt and outstanding balance.
- Zoho remains authoritative for detailed accounting unless EGS explicitly replaces it.
- Calculate Job/work-package/service margin only after source completeness is trustworthy.

**Reports to earn through reliable data**

- Campaign-to-Job conversion.
- Quote revision and approval turnaround.
- Margin by service and Job type.
- Planned-versus-actual labor/material.
- Supplier delivery and issue performance.
- Installation failure patterns.
- Missing/damaged reusable stock.
- Repeat customer and cross-service work.

**Operational reporting foundation implemented**

- A separate Operations Reports workspace now reports directly from Job scope, activities, releases, supplier commitments, resource time, inventory movements, closeout evidence and Job Memory.
- Management exceptions expose production blockers, overdue supplier deliveries, overdue snags, upcoming installations, abandoned timers, low stock and missing final photography.
- Job operational coverage makes missing source records visible instead of silently converting them to zero.
- Supplier delivery evidence and service usage are earned from recorded commitments and classified work packages.
- Approved revenue, supplier actual cost and labor actual cost are shown independently. Margin remains withheld until material actual cost and source completeness are trustworthy.

**Job costing and margin-readiness foundation implemented**

- Every Job has a focused Costing workspace, separate from supplier procurement and from Zoho accounting.
- Internal cost estimates can be assigned to the whole Job or a work package across material, labour, supplier, transport, permit, rental and other categories.
- Supplier actuals are derived from commitments; labour actuals from completed project time and resource rates; material actuals from immutable inventory movement cost snapshots.
- Permit, transport, rental, petty-cash and other actual expenses have a small audited capture surface with optional receipt or Zoho reference.
- Inventory items carry a current default unit cost while every movement preserves the exact historical unit-cost snapshot used at that moment.
- A human must explicitly confirm that all Job costs are recorded. Confirmation is blocked by missing supplier actuals, labour rates or material prices, and can be reopened with a reason.
- PostgreSQL automatically reopens a confirmed Job whenever a supplier commitment, project-time entry, inventory movement or other actual cost changes.
- Actual margin appears only for explicitly confirmed Jobs with approved quotation revenue; incomplete Jobs remain excluded.

### 15. Audit, recovery and permissions

**Route authorisation hardening — implemented**

An audit of all 250 admin routes found three defects, each verified before and after the fix:

- Unmapped routes resolved to `dashboard:read`, a permission every role holds. 41 routes fell through this way, so any authenticated user could reach them. The fall-through is now an explicit deny permission held by no role, and all 250 routes resolve to a real permission. A test fails the build if a new route is added without a mapping.
- Financial surfaces sat under `/sales` and therefore inherited `pipeline` permissions. A designer could edit payment positions and record Job costs; a viewer could read outstanding balances and margin. Settlement, costing and reports now resolve through explicit sensitive-route rules to `finance:*` and `reports:read`, regardless of where the route sits.
- Two routes that dispatch real outbound email (`/email/launch-batches/:id/send` and `/send-jobs/:id/send`) were unmapped and therefore reachable by every role including viewer. Both now require `sequences:write`.

Permissions are derived from role at session time and are not stored per user, so the corrected map applies to existing accounts. Sessions issued before the change keep their old permission array until re-login.

The Costing and Settlement tabs are hidden in the Job drawer for users without `finance:read`, and fail closed if the permission check cannot be completed.

**Keep**

- Append-only audit events.
- Soft delete/archive and recovery.
- Role-based permissions.
- Migration provenance.

**Change**

- Extend audit coverage to Job Memory, artifact revisions, approvals, task transitions, resource allocations, time corrections and inventory movements.
- Keep technical rollback and migration controls in Admin, not ordinary navigation.
- Use corrections, reversals and superseding records for financial, time, approval and stock history; do not rewrite history.

## Recommended user-facing navigation

The navigation should evolve only after the Job workspace works:

1. **Today** — replies, tasks, approvals, blockers, installations and missing materials requiring attention.
2. **Accounts** — companies, contacts and Key Relationships.
3. **Sales** — campaigns, outreach and commercial Jobs/quotes.
4. **Delivery** — active Jobs, work packages, calendar, production and installation.
5. **Communications** — inbox, outbound messages and delivery exceptions.
6. **Resources** — people/contractors, vehicles, equipment and project time.
7. **Inventory** — items, locations, reservations, packing and movements.
8. **Reports** — operational and financial reporting.
9. **Admin** — users, services/UOM, imports, email settings, audit and recovery.

## Source-of-truth map

| Business question | Authoritative record |
|---|---|
| Who is the person/company? | Person, Organization, Role and Contact Method |
| Why were they contacted? | Campaign Account and Campaign Contact |
| What was sent or received? | Conversation and Message |
| Did they reply? | Inbound Message linked to the context |
| Are they the Right POC? | Human POC suitability decision |
| Are they a Key Relationship? | Manual Key Relationship profile |
| What work is being pursued/delivered? | Continuous Ongoing Job |
| What does the client currently want? | Current Brief and current scope lines |
| How did it change? | Versioned Job Memory and domain events |
| What must someone do? | Task/activity |
| Which design/quote is current? | Artifact revision state |
| What was approved? | Approval linked to exact revision |
| What did a supplier commit? | Procurement commitment/PO |
| Where is an asset/material? | Append-only stock movements |
| How much project time was spent? | Project time entry and correction history |
| Was the Job physically delivered? | Completion/handover evidence |
| Is it fully paid? | Financial settlement derived from accounting/payment facts |
| What should be learned? | Resolution/learning entry linked to the affected work |

## Delivery sequence and gates

### Stage 1 — Job Memory and current brief

- Versioned notes with attachments.
- Typed quick entry.
- Pinned entries and version history.
- Combined Job timeline.
- Audit events.

Gate: routine update under 20 seconds; a change and its prior wording are both retrievable.

### Stage 2 — Work packages, phases, locations and unified tasks

- Productize existing scope/phase/location scaffolding.
- Contextual tasks and completion evidence.
- Multi-service Job without duplicate Job counts.

Gate: a coordinator can see what must be delivered, where, by whom and by when from one workspace.

### Stage 3 — Artifact revisions, structured quotation scope and exact approvals — foundation implemented

- Designs, quotations, production files and photo sets.
- Immutable revisions and approval decisions.
- Structured quotation lines tied to work packages, service/UOM, phase and location snapshots.
- Quotation revenue and cost reconciliation at the same work-package grain.

Gate: current approved design and quotation are found in under 15 seconds.

### Stage 4 — Supplier commitments and Job costing — foundation implemented

- Supplier directory, RFQ, PO/commitment and actual cost.

Gate: estimated, committed and actual cost can be reconciled per Job/work package.

### Stage 5 — Plan calendar and project-time capture — foundation implemented

- Resource activities, assignments, conflicts and mobile time.
- Prepare for Delivery activation converts one Job work package/location into a suggested, removable activity plan instead of requiring coordinators to construct every operational record manually.
- Thirteen configurable activity building blocks cover survey, production design, approval, procurement, fabrication, printing, packing, transport, installation, event support, dismantling, returns and handover photography.
- Service classifications suggest relevant building blocks but never impose twelve rigid workflows; users can add or remove steps before activation.
- One target delivery date generates an editable schedule, while the Job retains one main leader and individual activities may have different accountable owners.
- Optional employee, contractor, vehicle and equipment reservations flow into resource planning, with advisory overlap warnings rather than inflexible blocking.
- Each activation preserves its batch provenance and writes normal activities plus one Job Memory summary, so Calendar, Today, Production, time and reporting require no duplicate data entry.

Gate: planned-versus-actual labor is available without duplicate time entry.

### Stage 6 — Inventory and barcode pilot — foundation implemented

- Locations, reusable assets, reservations, packing, checkout and return.

Gate: the balance of each pilot item/location reconstructs exactly from immutable movements.

### Stage 7 — Closeout, learning and earned analytics

**Closeout foundation implemented**

- Mobile-friendly multi-photo and handover-evidence upload inside every Job.
- At least one image classified as Final delivery photo is enforced by both the application and PostgreSQL before a Job can transition to Job Done.
- Physical handover record and completion summary.
- Structured snag ownership, severity, due date, resolution and acceptance.
- Closeout evidence and snag changes appear in the combined Job timeline.
- Lessons are captured through the existing versioned Job Memory `learning` type rather than a duplicate closeout notes store.

**Operational reporting foundation implemented**

- Read-only operational control reporting and exception queues are live.
- Final-photo completeness is visible by Job, including a clearly labelled historical backlog.
- Current data coverage is measured so EGS can improve usage before relying on derived profitability.

**Remaining Stage 7 expansion**

- Trend reporting after sufficient reliable operational history accumulates.
- Service- and work-package margin trends after enough Jobs are cost-confirmed.

Gate: someone unfamiliar with a completed Job reconstructs its scope, revisions, decisions, problems, delivery, cost and learning in under ten minutes.

## Implemented in the first slice

The first implementation adds:

- Versioned typed Job Memory entries on Ongoing Jobs.
- Multiple file attachments tied to exact note versions.
- SHA-256 attachment checksums.
- Pinned important entries.
- Visible version history, author, time and change reason.
- Job Memory entries included in the Ongoing Job timeline.
- Current Job notes relabelled as Current Brief / Summary to distinguish present truth from history.
- Audit events for creation and revision.

The additive production migration has been applied and verified read-only against an active Ongoing Job. No Job data was changed during verification.

This is intentionally the first operational product slice. It makes the empty notes/files scaffolding useful while establishing the interaction pattern later used by issues, site updates, artifact revisions, approvals and final evidence.
