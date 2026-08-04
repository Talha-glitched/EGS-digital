# EGS CRM Foundation Specification

Status: Working target-system foundation draft  
Purpose: Business and logical design contract for Talha; it defines the destination without prescribing migration or physical implementation  
Owner: EGS  

Companion implementation artifacts:

- [EGS CRM Logical ERD](./CRM_LOGICAL_ERD.md)
- [Live Mongo Data Audit for SQL Migration](./CRM_LIVE_MONGO_DATA_AUDIT.md)
- [Mongo-to-SQL AI Agent Migration Guide](./MONGO_TO_SQL_AI_AGENT_GUIDE.md)

## Decision legend

- **Recommended** — best current decision based on EGS's business model and the existing CRM.
- **Needs confirmation** — requires a genuine EGS business decision or real-data validation.
- **Deferred** — deliberately outside the six foundation decisions.
- **Rejected** — creates avoidable duplication, ambiguity, or long-term system cost.

## Foundation objective

Build one system that can manage EGS's full commercial cycle across all service categories:

1. Identify organizations and people.
2. Understand how they are related and what they may need.
3. Pursue them through events, campaigns, relationships, and direct enquiries.
4. Convert demand into priced commercial work.
5. Deliver one or more services under deadlines, locations, and operational constraints.
6. Preserve communication, decisions, tasks, history, revenue, cost, and learning.

The frontend should become a set of views over shared, trustworthy facts—not a collection of screens maintaining separate copies of the same data.

## Audit and readiness status — 4 August 2026

**Verdict:** the service-independent target foundation is clear enough for Talha to begin moving forward. The final 12 Service Offering records and their inquiry questions are deferred catalogue/template content, not missing core entities.

Confirmed for immediate use:

- Canonical boundaries and terminology.
- Relationship directions and practical cardinalities.
- Sources of truth and derived-view rules.
- Identity, duplicate review, merge, archive, audit, and permissions rules.
- Campaign, communications, review, Task, and contextual Lead boundaries.
- One continuous Ongoing Job with phases, locations, scope lines, versions, approvals, milestones, outcomes, and aftercare.
- Zoho/CRM financial boundary.
- Configurable Service/UOM/Inquiry Form Template extension point.

Deferred until EGS supplies the information:

- The actual 12 Service Offering catalogue records and aliases.
- Allowed/default UOMs for each offering.
- Service-specific inquiry questions, options, requirements, and workflow applicability.

Those deferred items complete the service-based inquiry experience; they do not alter the stable core boundaries above. This document defines the target and does not prescribe the migration method.

A read-only live Mongo audit was completed on 4 August 2026. Its findings support these boundaries and are documented separately in `CRM_LIVE_MONGO_DATA_AUDIT.md`; they introduce migration reconciliation work, not changes to the confirmed business foundation.

## Current-state findings

The existing CRM contains several structural conflicts that must not be carried into the target foundation:

- `Lead` currently combines person identity, employer, campaign membership, contact methods, enrichment sources, outreach state, reply state, relationship state, POC qualification, service interest, and channel activity.
- The same person may exist in multiple campaign-specific `Lead` documents; global canonical identity is not currently guaranteed.
- `Company.domain` is required and globally unique, although organizations may have no domain, multiple domains, or shared group domains.
- Generic inboxes can be represented like people, which corrupts person and relationship reporting.
- `boothNumber` is stored on Company even though it belongs to a particular event edition or participation.
- Service categories are inconsistent: the relationship UI has 9 values, completed jobs have 17 differently named values, and EGS has identified 12 intended business categories.
- The current Ongoing Job stages mix sales, design, production, installation, payment, completion, and loss.
- Current campaign counters and financial totals include values that should normally be calculated from underlying facts.
- Reply, Email, embedded thread history, and ContactInteraction overlap and need one communications ownership model.

## Non-negotiable design principles

1. Identity is global; pursuit and qualification are contextual.
2. A person, their employer role, and their campaign participation are separate facts.
3. A generic inbox or switchboard belongs to an organization, not to a fictional person.
4. Internal immutable IDs—not names, emails, or domains—are permanent identity.
5. A domain is matching evidence, not the identity of an organization.
6. The service catalogue is governed data, not hard-coded text, fixed enums, or twelve boolean columns.
7. One Ongoing Job may contain several services.
8. Sales, delivery, task, communication, and payment lifecycles remain separate.
9. A completed job remains the same job; completion should not create a duplicate copy of the work.
10. Operational completion and financial settlement are independent.
11. One fact has one authoritative owner. Frontend convenience is provided through queries/views, not competing write fields.
12. Historical commercial facts and status changes remain traceable.
13. Derived totals are calculated or explicitly cached; users do not maintain them independently.
14. Uncertain duplicates are reviewed; they are not silently merged.
15. Frontend labels may differ from canonical domain terminology without controlling the database design.

---

# Gate 1 — Canonical vocabulary and boundaries

## Options

### Option A — Preserve the current CRM vocabulary

Keep Company, Lead, Campaign, Ongoing Job, and Completed Job as the central objects.

**Rejected:** it carries current ambiguity into the future system and makes later correction more expensive.

### Option B — Build a full enterprise model immediately

Define every possible finance, production, procurement, inventory, HR, and automation entity now.

**Rejected:** future-looking but unnecessarily theoretical. It delays the stable core and creates concepts EGS may not use consistently.

### Option C — Stable domain core with expandable modules

Define stable identity, service, campaign, communication, commercial, delivery, and work concepts now. Add detailed finance, production, procurement, and inventory modules later at those clean boundaries.

**Recommended.**

## Recommended canonical vocabulary

### Identity

| Term | Definition | Not this |
|---|---|---|
| Person | One real human, independent of employer, campaign, and lifecycle stage | A campaign lead record or generic inbox |
| Organization | A durable company, institution, government body, brand, branch, or legal entity | An event-specific exhibitor record |
| Contact Method | One reachable endpoint such as personal email, phone, WhatsApp, or LinkedIn | The person themselves |
| Organization Contact Method | A generic inbox, switchboard, website, or organization-owned endpoint | A fictional person named “Info” |
| Person–Organization Role | A dated relationship between a person and organization, including title, department, and role | A permanent field on Person |
| Organization Relationship | EGS's business relationship to an organization, including owner and relationship context | Campaign status or Ongoing Job stage |
| Location / Site | A physical place relevant to an organization, event, installation, delivery, campus, branch, or billing context | The organization itself |

The core does not require a corporate hierarchy. Branches, campuses, venues, and delivery points are Locations unless they receive their own quotation/customer responsibility, in which case they use a separate Organization and Ongoing Job. Possible related or duplicate Organizations remain separate until human review.

### Services

| Term | Definition |
|---|---|
| Service Family | A broad commercial grouping used for navigation and high-level reporting |
| Service Offering | One governed sellable EGS service from the approved catalogue |
| Capability / Deliverable Type | An optional lower-level production capability or output used to describe scope |
| Service Specification | Structured service-specific requirements, such as stand area, venue, vehicle count, material, or installation date |
| Unit of Measure (UOM) | A governed unit such as sqm, linear metre, piece, vehicle, location, event, or lump sum |
| Inquiry Form Template | The configurable questions used when creating an Ongoing Job for a Service Offering |
| Inquiry Form Template Version | An immutable published version of a Service Offering's inquiry questions |
| Service Field Definition | One governed typed question, including label, data type, UOM/allowed values, help text, and requirement metadata |
| Service Specification Answer | The answer captured against the exact template version used for the Ongoing Job |

**Recommendation:** treat the 12 categories as `Service Offering` records. Use broad families only where they improve navigation/reporting. Do not assume that website navigation, production capabilities, and financial reporting categories are identical.

### Events and campaigns

| Term | Definition |
|---|---|
| Event | The durable event brand or series, such as GITEX |
| Event Edition | A dated occurrence of an event at a location |
| Event Participation | An organization's participation in an edition, including hall, booth, stand number, and source evidence |
| Campaign | A bounded EGS outreach initiative with objective, audience, ownership, timing, and attribution |
| Campaign Account | An organization being pursued in one campaign |
| Campaign Contact | A person–organization role selected for that campaign account |
| Lead | A contextual UI classification of a Campaign Contact after a relevant reply; it is not a durable Person entity or global stage |
| Sequence | A reusable outreach plan |
| Sequence Enrollment | One campaign contact's execution in one sequence |

### Communications and decisions

| Term | Definition |
|---|---|
| Conversation | A logical communication thread across one or more participants |
| Message | One immutable inbound or outbound communication |
| Conversation Participant | A person/contact method or organization endpoint participating in a conversation |
| Interaction | A business interaction such as call, meeting, WhatsApp exchange, or site visit |
| Review Item | A unit of internal work requiring human review |
| Review Decision | The human decision, reason, actor, and timestamp produced by a review |

### Commercial and delivery

| Term | Definition | Recommendation |
|---|---|---|
| Ongoing Job | One continuous EGS commercial and operational record from Inquiry through Job Done or Job Lost | Canonical work entity; one quotation family per Ongoing Job |
| Ongoing Job Scope Line | A service, quantity/UOM, phase, location, and scope component within an Ongoing Job | Required for multi-service, multi-phase, and multi-location work |
| Quote | A commercial offer made to the customer | Support versions rather than overwriting issued quotes |
| Scope Line | The agreed or delivered grain connecting a service to quantity/unit, site, price/cost, revision, and scope notes | Used within Ongoing Job and Quote lines; prevents one vague service tag per job |
| Design Version | One preserved version of the pre-sale concept/design | Links to the Quote Version(s) it supports |
| Customer Authorization | Evidence that the customer instructed EGS to proceed, including type, person, date, and reference |
| Financial Milestone | The CRM's operational payment position and Zoho reference | Zoho remains authoritative for detailed finance |
| Jobs Done | A user-facing view of the same Ongoing Jobs whose physical delivery is complete and balance is fully paid | Never a copied record |

### Work, ownership, and history

| Term | Definition |
|---|---|
| Task | A unit of internal work with owner, due date, type, and completion state |
| Assignment | Responsibility allocated to an internal user or team, with dates where ownership history matters |
| Note | Human-authored context attached to a defined business object |
| Source Record | The raw external/imported record from which a claim originated |
| Audit Event | An append-only record of a meaningful system or user change |
| Merge Record | The survivor, duplicate, reason, actor, timestamp, and reversibility data for an identity merge |

Person, Organization, and Ongoing Job views expose a combined chronological activity timeline. The timeline is a read view over authoritative Messages, Interactions, Notes, Tasks, Review Decisions, Design/Quote Versions, stage transitions, and ownership changes; it is not a second manually maintained activity store.

## Critical terminology decisions

| Decision | Recommendation | Status |
|---|---|---|
| Use `Person`, not `Lead`, as human identity | Yes | Confirmed by EGS |
| Keep “Lead” as a global permanent person stage | No; Lead status belongs to the relevant campaign/service/commercial context, while Person views summarize active and historical contexts | Confirmed by EGS |
| Keep `OngoingJob` as the continuous canonical work entity | Yes; it spans commercial, delivery, and financial milestones without losing their separate meaning | Confirmed by EGS |
| Create a separate CompletedJob copy | No; Jobs Done is the same Ongoing Job after Job Done | Confirmed by EGS |
| Keep the EGS Ongoing Job workflow vocabulary | Yes; use the confirmed stages with precise underlying meanings | Confirmed by EGS |
| Treat all 12 categories as hard-coded enum values | No; governed service records | Confirmed by EGS |
| Final canonical list of 12 offerings and families | Requires EGS catalogue reconciliation | Deferred until EGS supplies catalogue content |

## Boundary summary

| Boundary | Rule |
|---|---|
| Person vs Person–Organization Role | Person is the human; employer, title, department, and responsibility belong to dated Roles |
| Person Contact Method vs Organization Contact Method | Personal endpoints belong to Person; generic inboxes/switchboards belong to Organization |
| Organization vs Location | Organization is the quoted customer identity; branches, campuses, venues, and delivery points are Locations unless separately quoted/responsible |
| Person vs Campaign Contact | Person is durable identity; Campaign Contact is that Role/endpoint used in one Campaign |
| Person vs Lead | Lead is contextual Campaign Contact state/view, never a global Person identity |
| POC suitability vs Key Relationship | POC suitability is service/responsibility-specific; Key Relationship is a separate manual EGS judgment |
| Campaign vs Ongoing Job | Campaign pursues one service; Ongoing Job is actual commercial/operational work and may exist without a Campaign |
| Ongoing Job vs Quote | One Ongoing Job owns zero or one logical Quote family; Quote Versions preserve every revision |
| Working scope vs issued commercial scope | Ongoing Job Scope Lines own current working scope; issued Quote Version/Lines are immutable snapshots |
| Design approval vs commercial approval | Independent decisions linked to their exact Design/Quote Versions |
| Customer authorization vs formal PO | Customer Authorization records any valid instruction; PO status remains independently visible |
| Ongoing Job vs Jobs Done | Same record; Jobs Done is a derived view when physically delivered and fully paid |
| CRM finance vs Zoho finance | CRM owns operational milestones/references; Zoho owns invoices, credits, payments, and balance |
| Message vs Interaction vs Task | Message is immutable communication; Interaction is real customer activity; Task is internal work and does not automatically imply contact |
| Timeline vs source records | Timeline combines authoritative records for reading; it is not another write store |
| Service Offering vs Inquiry Form Template | Offering identifies what EGS sells; a versioned Template defines the additional questions for that service |
| Common inquiry fields vs service-specific answers | Common facts remain strongly typed on canonical entities; only variable service details live in versioned answers |

---

# Gate 2 — Relationships and cardinality

## Options

### Option A — Simplified one-to-many only

Easy to understand but fails for people changing employer, multi-contact accounts, multi-service jobs, and multi-source attribution.

**Rejected.**

### Option B — Generic many-to-many links everywhere

Flexible but weakens meaning and database constraints.

**Rejected for the core.** Use named bridge entities rather than generic `entity_type/entity_id` links where business meaning matters.

### Option C — Real-world cardinality using explicit bridge records

**Recommended.** Each bridge has its own context, dates, status, provenance, and uniqueness rules.

## Recommended relationship matrix

| Parent | Relationship | Child/bridge | Cardinality | Core rule |
|---|---|---|---|---|
| Person | has | Contact Method | 1 to 0..many | A person may have no verified endpoint yet; repeated values trigger review rather than forced uniqueness |
| Organization | has | Organization Contact Method | 1 to 0..many | Generic endpoints live here; shared/repeated values trigger review |
| Person | works/acts for | Organization through Role | many to many over time | Preserve role history; do not overwrite employer |
| Organization | has | Domain/Identifier | 1 to 0..many | Domain may be absent, shared, or historical |
| Event | has | Event Edition | 1 to 0..many | Edition owns dates and venue |
| Organization | participates in | Event Edition through Event Participation | many to many, optional on both sides | Booth belongs to participation |
| Campaign | targets | Organization through Campaign Account | many to many | Exactly one Campaign Account per Campaign + Organization pair |
| Campaign | optionally relates to | Event Edition | each Campaign 0..1 Edition; each Edition 0..many Campaigns | Campaigns may be event-based or independent service/relationship outreach |
| Campaign | targets | Service Offering | each Campaign exactly 1 Offering | Keeps messaging, Lead context, and performance reporting clear |
| Campaign Account | uses | Campaign Contact | 1 to 0..many | Account may exist before a contact is found; Contact references a Role or Organization endpoint |
| Campaign Contact | enters | Sequence Enrollment | 1 to 0..many | Preserve multiple attempts over time |
| Campaign Contact | has | Contextual lead/qualification state | exactly 1 current state plus history | Lead/Qualified Lead is contextual and human-review-driven, never a Person identity |
| Sequence | has | Sequence Step | 1 to many, ordered | Version published sequences |
| Conversation | has | Message | 1 to many | Message is immutable communication evidence |
| Conversation | has | Participant | many to many | Participant retains endpoint used at the time |
| Organization | has | Ongoing Job | 1 to 0..many | An Ongoing Job can be created directly without a campaign |
| Ongoing Job | belongs to | Customer Organization | many to 1 | Exactly one external customer organization per Ongoing Job; other independently responsible organizations use separate jobs |
| Ongoing Job | is optionally attributed to | Campaign/Campaign Account | each Job 0..1 Campaign Account; each Account 0..many Jobs | Direct and repeat work may have no Campaign |
| Ongoing Job | involves | Person/Role through Customer Stakeholder | each Job 0..many Stakeholders | Contact may be unknown at Inquiry; at most one active primary contact |
| Ongoing Job | includes | Ongoing Job Scope Line | 0..many at Inquiry; 1..many before issuing a Quote | Support multi-service scope without inventing unknown data |
| Ongoing Job | contains | Phase | 0..many | Multiple phases remain within one permanent Ongoing Job |
| Ongoing Job | covers | Location / Site through Ongoing Job Location | each Job 0..many Locations | Multi-site work remains one Ongoing Job; location may be unknown initially |
| Ongoing Job Phase / Location / Scope Line | has | Progress and Assignment | each component 0..many history/assignment records | Each component may progress independently; the Job exposes an overall summary |
| Organization | has | Location / Site | 1 to many | Keep branches/campuses/sites distinct from Organization identity |
| Scope Line / Quote Line | references | Phase and/or Location | many to many where needed | Supports multi-phase and multi-site commercial scope |
| Ongoing Job | has | Quote | 0..1 | One logical Quote family per Job; versions do not create new Jobs |
| Quote | has | Quote Version | 0..many | Draft/issued revisions remain separate; issued versions become immutable |
| Quote Version | has | Quote Line | 0..many in draft; 1..many when issued | Lines reference Service Offerings and preserve commercial snapshots |
| Ongoing Job | has | Design Version | 0..many | Preserve every pre-sale concept/design revision rather than overwriting files |
| Design Version | supports/is supported by | Quote Version | many to many where needed | Both sides expose the link between commercial scope and the design evidence used |
| Ongoing Job | has | Customer Authorization | 0 to many | Preserve verbal/email/WhatsApp/signed quote/award/PO evidence and current PO-pending state |
| Person–Organization Role | has | Service/Responsibility POC Suitability | 0 to many | Right/Wrong POC is contextual, dated, and reasoned |
| Person–Organization Role | may have | Key Relationship Profile | 0 or 1 | Manual EGS confirmation, relationship roles, one owner, collaborators, and ownership history |
| Ongoing Job | has | Task | 0..many | Tasks may also link to phase, location, scope line, Person, or Campaign context |
| Service Offering | allows | UOM | many to many | One default UOM may be identified per offering |
| Service Offering | has | Inquiry Form Template Version | 0..many | Published versions remain immutable for historical answers |
| Inquiry Form Template Version | contains | Service Field Definition | 1 to many, ordered | Common core fields remain strongly typed outside the dynamic template |
| Ongoing Job | records | Service Specification Answer | 0 to many | Answers reference the exact template/field version used |
| Ongoing Job | has | Financial Milestone / Zoho Reference | 0 to many over time | CRM records operational position; Zoho owns detailed transactions and balance |

## Relationship rules Talha must receive

Each relationship must eventually include:

- Minimum and maximum on both sides.
- Required versus optional.
- Business uniqueness rule.
- Effective start/end dates where facts change over time.
- Delete/archive behavior.
- What happens during an identity merge.
- Whether history must be append-only.

## Scenario acceptance tests

The model must represent all of these without duplicating durable facts:

1. One organization has several decision-makers.
2. One person works for two organizations concurrently.
3. One person changes employer.
4. A generic `info@` address receives outreach and later refers a real person.
5. One organization appears at several annual editions of an exhibition.
6. One organization is targeted by several campaigns.
7. One Ongoing Job includes several EGS services.
8. One quotation family, including its revisions, belongs to one Ongoing Job that may contain multiple phases and locations; a separate quotation creates a separate Ongoing Job.
9. A repeat client creates a direct job without an outreach campaign.
10. A quote is revised after scope changes.
11. A job is delivered while payment remains outstanding.
12. An organization is simultaneously a client, prospect, supplier, or partner in different contexts.
13. A customer has multiple branches/campuses represented as Locations, while a separately quoted customer entity remains a separate Organization and Ongoing Job.
14. A multi-service quote is revised twice and then delivered across several sites while preserving the accepted version and actual delivered scope.

---

# Gate 3 — Field dictionary

## Options

### Option A — Put every possible field into core tables

**Rejected:** produces wide tables, many nulls, and service-specific coupling.

### Option B — Store most fields in JSON

**Rejected for authoritative core facts:** flexible initially but weak for validation, reporting, referential integrity, and historical clarity.

### Option C — Strongly typed universal fields plus controlled service-specific specifications

**Recommended.**

## Field classification

Every proposed field must be classified as one of:

- Identity fact.
- Relationship/context fact.
- Transaction fact.
- Workflow state.
- Historical snapshot.
- Derived value.
- External evidence/provenance.
- Service-specific specification.

## Required dictionary columns

| Dictionary property | Purpose |
|---|---|
| Entity and field | Unambiguous owner |
| Business definition | Meaning independent of UI label |
| Data type | Unambiguous logical type |
| Unit/currency/timezone | Prevent ambiguous numbers and dates |
| Required/optional | Business nullability |
| Default | Must represent truth; no invented owner/date/status |
| Unique rule | Business uniqueness, including scoped uniqueness |
| Allowed values/reference | Governed vocabulary |
| Editable by | Ownership and permissions |
| Source/provenance | Manual, imported, provider, system-derived |
| Stored or derived | Prevent duplicate sources of truth |
| History requirement | Current-only, effective-dated, or append-only |
| Sensitivity/retention | Protect personal and commercial data |
| Example and non-example | Remove interpretation gaps |

## Service-specific fields

Universal transactional facts—customer, service, price, quantity, deadline, location, owner—should be strongly typed.

Service-specific requirements may use versioned specification templates where appropriate. Examples include:

- Exhibition stand: area, open sides, height, hall, stand number.
- Signage: dimensions, material, illumination, mounting method.
- Vehicle branding: vehicle type, fleet count, coverage type.
- Event/graduation: venue, audience, ceremony date, stage/AV requirements.
- Retail rollout: branch count, location schedule, fixture types.

These specifications must be governed and versioned; they must not become unstructured dumping grounds.

## Inquiry form boundary

Creating an Inquiry creates the same continuous Ongoing Job in `Inquiry` stage; it does not create a separate temporary Lead/Inquiry database.

The inquiry form has two layers:

### Common fields for every service

- Customer Organization.
- Primary customer contact, when known.
- Inquiry source/channel and received date.
- Service Offering, when known.
- Brief title and description.
- Requested date/deadline.
- Location(s), when known.
- Quantity and UOM, when known.
- Attachments/source evidence.
- Ongoing Job leader/initial owner.
- Optional Campaign/Event attribution.
- Next Task or required follow-up.

### Configurable service-specific questions

- The selected Service Offering determines the published Inquiry Form Template Version.
- Questions have controlled types such as text, number, date, yes/no, option, measurement/UOM, money, file, Person, Organization, or Location reference.
- Answers reference the exact Field Definition and Template Version used.
- Publishing a new template version never rewrites older Inquiry answers.
- Shared core facts remain in their canonical entities; a template must not create duplicate fields for customer, contact, location, deadline, owner, or service.

The 12 Service Offerings and their questions can therefore be added later as governed catalogue/template data without changing the stable identity, campaign, communication, Task, or Ongoing Job boundaries.

## Core logical field inventory

This inventory defines business ownership, not physical table/column design. Every durable record also needs immutable ID, created/updated metadata, archive state where applicable, and audit history according to this specification.

| Entity | Canonical business facts | Explicitly not owned here |
|---|---|---|
| Person | Names, preferred/display name, identity notes | Employer, title, email, phone, Lead state |
| Person Contact Method | Person, type, original/normalized value, label, primary/preferred flag, verification/validity, source/provenance | Person identity or campaign outcome |
| Organization | Canonical/trading name, organization type, identity notes | Required domain, booth, campaign status, location-specific details |
| Organization Identifier / Contact Method | Organization, type, original/normalized value, validity, source/provenance | Organization identity itself |
| Person–Organization Role | Person, Organization, title, department, responsibility, start/end/current state, source | Permanent Person fields |
| Location / Site | Related Organization when applicable, name/type, address/geography, access/context notes, active state | Customer identity or quotation identity |
| POC Suitability | Person–Organization Role, Service/Responsibility context, assessment, reason, assessor/time, referral context | Global Person value or Key Relationship |
| Key Relationship Profile | Person–Organization Role, manual confirmation, standing, relationship roles, owner/collaborators, ownership history | Automatic Lead or POC result |
| Service Offering | Stable code/name, definition, aliases, active dates, display/reporting metadata | Hard-coded service questions |
| UOM / Allowed Service UOM | Stable unit, unit family, display label; Offering relationship and optional default | Service identity |
| Inquiry Form Template Version | Service Offering, version, publication state/date, ordered Fields | Answers or shared core inquiry facts |
| Service Field Definition | Template Version, stable field code, label/help, type, options/UOM, requirement/applicability metadata, order | Person/Organization/Job duplicate fields |
| Service Specification Answer | Ongoing Job, exact Template/Field Version, typed answer/evidence, answer history | Question definition |
| Event | Durable event/series name and identity | Edition dates, venue, booth |
| Event Edition | Event, edition label/year, dates, venue/location | Organization participation |
| Event Participation | Event Edition, Organization, hall/booth/stand, source evidence | Permanent Organization facts |
| Campaign | Name/objective, one Service Offering, optional Event Edition, owner, dates, lifecycle | Organization/contact-specific pursuit state |
| Campaign Account | Campaign, Organization, pursuit state/outcome history | Permanent Organization relationship state |
| Campaign Contact | Campaign Account, Person–Organization Role or Organization endpoint, POC/lead context, outreach focus/outcome history | Person identity or global Lead stage |
| Sequence / Version / Step | Campaign/reusable sequence identity, published version, ordered steps and timing | Per-contact execution |
| Sequence Enrollment | Campaign Contact, Sequence Version, execution state, stop/pause reason and history | Message evidence |
| Conversation | Conversation identity/context and subject where applicable | Copied message bodies |
| Conversation Participant | Conversation, exact Person/Organization endpoint, participation role/time | Current contact method value only |
| Message | Conversation, direction/channel, exact endpoint/sender/recipients, external identifiers, subject/body, sent/received time, delivery evidence | Human classification or Task status |
| Review Decision | Included Message cutoff/set, human outcome, reviewer/time, reason/notes | AI outcome or duplicate Task outcome |
| Interaction | Person/Organization/Job context, real channel, occurred time, outcome, notes, actor/source | Internal Task completion |
| Task | Type, title/notes, one owner, collaborators/watchers, due time, status, priority, completion actor/time, explicit business context links | Customer interaction unless real contact occurred |
| Ongoing Job | One Customer Organization, optional Campaign attribution, title/brief, received source/date, main summary, underlying commercial/delivery/payment/outcome positions | Copied customer/contact/service/financial ledger data |
| Customer Stakeholder | Ongoing Job, Person–Organization Role, stakeholder responsibility, primary flag, active dates | Person identity |
| Ongoing Job Phase | Ongoing Job, name/order, dates/deadlines, progress and owner assignments | Separate Job identity |
| Ongoing Job Location | Ongoing Job, Location, role/order, dates/deadlines, progress and assignments | Separate Job identity |
| Ongoing Job Scope Line | Ongoing Job, Service Offering, description, quantity/UOM, phase/location links, current scope state, progress and assignments | Issued quotation history |
| Progress History | Component context, previous/new position, actor/time, reason | Separate competing current status fields |
| Assignment History | Context, responsibility type, owner/collaborator, start/end, assigned by/time | Text owner names copied into every record |
| Design Version | Ongoing Job, version/label, files, status, creator/time, approval link(s) | Overwritten latest-only design |
| Quote | Ongoing Job, logical quotation identity | Issued version content |
| Quote Version / Line | Quote, version/status, issue/validity/recipient, immutable customer/scope/price snapshots, line services/UOM/locations, supporting Design Versions | Current working Job scope or Zoho payment ledger |
| Approval / Decision | Exact Design/Quote Version or business context, decision type/outcome, person, time, evidence/notes | Generic boolean without history |
| Customer Authorization | Ongoing Job, authorization type, customer contact, time, evidence/reference, PO-pending state | Formal PO assumption |
| Pre-PO Internal Approval | Ongoing Job/Authorization, approver, time, reason, estimated exposure | Customer authorization itself |
| Financial Milestone | Ongoing Job, operational milestone, confirmation time/source, Zoho reference | Invoice/payment/credit transaction ledger |
| Job Outcome / Reopen / Rework Event | Ongoing Job, event type, reason, time, actor, last progress/cost/payment/material context | New Job unless separately quoted |
| Note / Note Revision | Context, content, author/time, edit history | Activity timeline copy |
| File / File Link | One stored file identity/metadata plus links to relevant contexts and document/version role | Duplicate uploaded copies |
| Audit Event | Actor/time, action, target, reason, before/after or changed facts | Mutable business record field |
| Merge Record | Entity type, survivor/duplicate IDs, evidence, actor/time, moved relationships, reversal history | Silent destructive merge |

---

# Gate 4 — Source of truth

## Options

### Option A — Copy values wherever screens need them

**Rejected:** efficient for one screen but creates silent divergence.

### Option B — Fully normalize and calculate everything live

**Rejected as an absolute rule:** correct in theory but can make operational screens slow and historical documents inaccurate.

### Option C — One canonical owner, deliberate immutable snapshots, and explicit read models

**Recommended.**

## Initial ownership matrix

| Fact | Canonical owner | May be snapshotted? |
|---|---|---|
| Current human name | Person | Yes, on issued quote/invoice if legally useful |
| Personal email/phone/LinkedIn | Person Contact Method | Endpoint used on a message is retained historically |
| Generic email/phone/domain | Organization Contact Method/Identifier | Yes on issued documents/messages |
| Employer, title, department | Person–Organization Role | Yes on conversation/quote/job stakeholder context |
| Right/Wrong POC suitability | Person–Organization Role + Service/Responsibility POC Suitability | Never a global Person label |
| Key Relationship confirmation, roles, and standing | Key Relationship Profile on Person–Organization Role | Manual EGS decision with owner/collaborator history |
| Booth/hall for an event | Event Participation | Yes on Ongoing Job scope |
| Campaign-specific account state | Campaign Account | No competing copy on Organization |
| Campaign-specific contact state | Campaign Contact | No competing copy on Person |
| Contextual Lead/Qualified Lead state | Campaign Contact state/history | Person view derives active/historical Lead contexts |
| Sequence progress | Sequence Enrollment and send/message facts | Campaign metrics are derived |
| Human reply classification | Review Decision linked to reviewed messages | Do not independently store on Task and Message |
| Relationship owner | Organization/Role assignment history | Current owner can be exposed through a view |
| Ongoing Job customer | Ongoing Job → Customer Organization relationship | Issued Quote Version snapshots customer details where required |
| Ongoing Job leader and component owners | Assignment history | Current owners are derived/read from active Assignments |
| Current working service scope | Ongoing Job Scope Line | Do not store permanently on Person or only as free-text service tags |
| Quoted service, quantity, and price | Issued Quote Version/Line | Immutable after issue |
| Committed/delivered scope and progress | Ongoing Job Scope Line, Phase, and Location progress | Remains on the same Ongoing Job throughout its life |
| Physical delivery position | Ongoing Job/Phase/Location/Scope Line progress | History is append-only transition records |
| Main Ongoing Job stage | Derived operational summary of canonical milestones/statuses, or updated only through actions that also record those facts | Must not diverge from underlying authorization, delivery, payment, or outcome |
| Design content/version | Design Version | Previous versions are immutable history |
| Design approval | Approval/decision linked to Design Version | Separate from Quote/customer authorization |
| Quotation content/version | Quote Version and Quote Lines | Issued versions are immutable |
| Quote acceptance/commercial decision | Decision linked to Quote Version | Separate from Design approval and formal PO |
| Customer instruction to proceed | Customer Authorization | Preserve type, customer contact, time, evidence, and recorder |
| Pre-PO internal risk approval | Internal approval linked to Ongoing Job/Customer Authorization | Preserve approver, reason, time, and estimated exposure |
| Detailed invoices, credits, payments, and balance | Zoho | CRM does not maintain a competing transaction ledger |
| Operational payment milestone | Ongoing Job Financial Milestone with Zoho reference | May be refreshed/confirmed from authoritative Zoho information |
| Job Done eligibility | Physical-delivery fact plus authoritative fully-paid confirmation | The Jobs Done view is derived; no copied Completed Job record |
| Job Lost outcome and reason | Ongoing Job outcome event/history | Never erases prior progress, cost, or payment context |
| Campaign counts and ROI | Derived read model/refreshable aggregate | Cache only with recalculation metadata |
| Next follow-up | Earliest qualifying open Task | Do not maintain a separate manual date |
| Last interaction | Latest qualifying Message/Interaction | Derived, optionally cached with repair rule |
| Service-specific inquiry questions | Published Inquiry Form Template Version/Field Definitions | Administrator-governed and versioned |
| Service-specific inquiry answers | Service Specification Answers on the Ongoing Job | Always tied to the exact template/field version used |
| Note content/history | Note and Note Revision history | Combined timeline is a read view only |
| File identity/metadata | File plus contextual File Links | Issued/approved document versions are protected |

## Frontend rule

If a page needs a convenient combined record, the implementation should expose a derived read model. Convenience reads must not create additional write owners.

## Confirmed efficiency patterns

- **One durable identity:** reuse Person and Organization across every Campaign, Conversation, and Ongoing Job.
- **One continuous work record:** Inquiry, active work, Job Lost, reopened work, Job Done, and aftercare remain on the same Ongoing Job unless a separate quotation creates a new one.
- **Views instead of copies:** Leads, Jobs Done, timelines, next follow-up, last interaction, and dashboard totals are derived views/summaries.
- **One Task system:** reply review, follow-up, design, quotation, phase, location, service, and general work share the same Task foundation and explicit context links.
- **Shared histories:** Assignment and Progress histories avoid separate owner/status mechanisms for every component.
- **Snapshot only when justified:** issued Quote Versions and approved/issued documents preserve history; ordinary current facts are not copied across screens.
- **Store one File once:** contextual links reuse it across Ongoing Job, Design, Quote, phase, and location views.
- **Configurable service intake:** one form engine uses versioned Service templates instead of twelve custom forms or permanent service-specific columns.
- **Zoho owns finance:** CRM stores only operational milestones and references, preventing double entry and reconciliation drift.
- **Derived main stage:** the simple Ongoing Job stage summarizes underlying facts and must not become a second contradictory source of truth.

---

# Gate 5 — Identity, deduplication, and merge rules

## Options

### Option A — Email identifies a person; domain identifies an organization

**Rejected:** aliases, shared inboxes, changing emails, groups, subsidiaries, and multiple domains break this rule.

### Option B — No systematic duplicate detection

**Rejected:** relying on users to notice duplicates is inefficient and unable to scale with campaign imports.

### Option C — Immutable IDs, normalized identifiers, evidence-based matching, and controlled merges

**Recommended.**

## Identity rules

- Every durable entity receives an immutable internal UUID/ULID.
- Emails, phones, LinkedIn URLs, provider IDs, domains, and registration numbers are identifiers/evidence—not primary keys.
- Store normalized value separately from display/original value where useful.
- Preserve source, source record ID, observed time, imported time, verification state, and confidence where external claims matter.
- A person may have several contact methods and one contact method may become invalid without deleting the person.
- A Person may have multiple simultaneous Organization Roles, each with its own title, responsibility, dates, and context.
- An organization may have no domain, one domain, or several domains.
- Repeated domains and similar Organization names create human-review candidates; they never cause an automatic Organization merge.
- Generic endpoints belong to the organization.
- Generic email addresses, reception numbers, and organization-owned WhatsApp numbers must not create fictional Person records. A real responder or referral is linked separately once identified.
- A person changing organizations creates or closes a Role record; it does not rewrite historical employment.
- The same Person retains one permanent identity when changing companies. Previous roles and all related historical context remain preserved.

## Matching levels

1. **Potential duplicate trigger:** any repeated normalized personal email or repeated normalized LinkedIn person identifier creates a human-review item.
2. **Supporting evidence:** name, phone, Organization Role, geography, and source information help the reviewer decide.
3. **No matching identifier:** create or retain the separate identity with provenance unless later review establishes a duplicate.

The system never automatically merges Person records. Names are never unique, including within the same Organization, and never identify a Person on their own. LinkedIn URLs/IDs must be normalized and historical aliases preserved because public profile URLs can change.

## Merge design

A merge must:

- Select a survivor internal ID.
- Preserve duplicate IDs as aliases/redirects.
- Repoint dependent records transactionally.
- Record the reason, actor, timestamp, evidence, and affected relationships.
- Preserve source provenance.
- Support audit and a practical unmerge/recovery process.
- Avoid destroying conflicting values; unresolved conflicts remain reviewable.
- Be performed only by an authorized administrator.

## Suppression and consent

Suppression should normally apply to the specific contact endpoint, with reason, scope, source, and effective dates. Person- or organization-wide suppression may exist when explicitly justified, but should not be inferred blindly from one invalid endpoint.

EGS rules: `Not Interested` stops only the current Campaign follow-up; `Unsubscribe` suppresses the specified email/contact method from future outreach; `Bounce/Invalid` disables that endpoint. Other valid endpoints remain usable unless the Person explicitly requests broader no-contact treatment.

---

# Gate 6 — Lifecycles and statuses

## Options

### Option A — One master CRM status

**Rejected:** cannot represent a delivered-but-unpaid job, a qualified-but-dormant contact, or several simultaneous job realities.

### Option B — Separate free-text status fields

**Rejected:** creates spelling drift and unusable reporting.

### Option C — Separate governed lifecycles with transition history

**Recommended.**

Each lifecycle requires defined states, allowed transitions, terminal/reopen rules, reason codes, actor, effective timestamp, and append-only history.

## Recommended initial lifecycles

### Campaign

`Planning → Ready → Active → Completed → Archived`

### Campaign Account

`Identified → Researching → Ready for Outreach → Outreach Active → Reply Received → Follow-up Active → Completed / Archived`

Outcomes such as Not Interested, no response, referral, wrong POC, converted, or timing are contextual results—not permanent closure of the Organization.

### Campaign Contact / POC suitability

`Candidate → Verified Relevant → Active → Referred / Replaced / Inactive`

“Wrong POC” belongs here as contextual suitability with reason/history. It should not destroy the Person or globally declare them useless.

POC suitability is evaluated for the Person's Organization Role and relevant responsibility/service context. Overall relationship importance is separate, allowing a Person to be valuable generally while not being the correct contact for a particular service.

Relationship value and relationship role are also distinct:

- **Relationship value:** whether EGS considers the relationship important/key, active, developing, nurture, or dormant.
- **Relationship role:** why the Person matters, such as decision-maker, influencer, champion, referrer/connector, procurement, finance, technical, or site contact.
- **Key Relationship:** an explicit EGS user decision; it is never inferred automatically from a reply, Lead context, or Right POC assessment.

Avoid using `Partner` as the only Person label because it may imply a formal organization-level commercial partnership. `Key Relationship` plus a defined relationship role is clearer.

### Sequence Enrollment

`Scheduled → Active → Paused → Completed / Stopped`

Stop reason is separate: replied, opted out, bounced, manually stopped, campaign closed, or invalid endpoint.

Bulk initial outreach may include multiple Campaign Contacts at one Campaign Account. Once a Contact replies, active follow-up focuses on that responder and future sequence follow-ups to the other Contacts at that Campaign Account are paused. A referral transfers/extends focus to the referred Person. A confirmed Wrong POC with no referral allows EGS to select another Contact. This coordination is scoped to the specific Campaign and Service Offering, not every future EGS context.

`Not Interested` records a Person's outcome in the specific Campaign context and stops that current follow-up. It does not close the Organization/Campaign Account globally and does not prevent later outreach through a future Campaign.

### Message delivery

`Queued → Sent → Delivered / Bounced / Failed`

Replies and human decisions are related events, not delivery states.

### Reply Review

`Pending → In Review → Completed / Not Required`

The human outcome is separate from review work state.

Reply classification is human-only. The CRM does not use AI to classify replies or suggest outcomes. An EGS user selects the authoritative outcome before completing the Review Task.

Review outcomes requiring continued work (including Interested, Ambiguous, Referral, Out of Office, or Other where follow-up is needed) require the next follow-up Task before review completion. Closed outcomes (including Not Interested, Unsubscribe, Bounce, Automated, or Wrong POC) may complete without a follow-up Task.

Multiple inbound Messages received in the same Conversation before human review are grouped into one open Review Task showing the complete included context. Completing the review covers those included Messages. A later inbound Message after completion creates a new Review Task.

### EGS continuous Ongoing Job model

**Revised recommendation:** EGS users should work with one continuous Ongoing Job from Inquiry through final closure. The record preserves one identity and history, while commercial progress, delivery progress, financial position, and final outcome remain separately representable underneath.

Confirmed EGS operating facts:

- Pre-sale Design is normally required before a Quotation can be prepared.
- Quotation can have multiple revisions after first issue.
- Production may begin while the formal PO is still pending.
- Installation may finish while payment remains outstanding.
- Job Done means both physically delivered and fully paid.
- Job Lost may occur even after production has started.
- Ready normally does not return to Production, but exceptional rework/correction should remain auditable rather than impossible.

Recommended user-facing workflow vocabulary:

`Inquiry → Design → Quotation → Quotation Sent → Waiting Advice/PO → In Production → Ready → Installation → Waiting Balance Payment → Job Done / Job Lost`

This workflow is useful as the main operational view, but each label must map to explicit underlying facts so concurrent realities are not lost.

Recommended underlying dimensions:

- **Commercial authorization:** unapproved, verbal/written authorization, PO pending, PO received, cancelled/lost.
- **Delivery:** not started, production, ready, installation/execution, physically delivered, cancelled/terminated.
- **Financial:** not invoiced, invoiced, partially paid, fully paid, overdue, disputed, written off where applicable.
- **Overall outcome:** open, Job Done, Job Lost, on hold/cancelled where EGS distinguishes them.

`Job Done` is the final overall closure state reached when physical delivery and full payment are both true. Physical delivery date and full-payment date remain separate facts because they may occur at different times.

When production begins before a PO, preserve the authorization basis, authorization date, customer contact, internal approver, and commercial exposure. This is not a separate job; it is evidence explaining why EGS committed cost before formal authorization.

Starting production before the formal PO requires explicit confirmation by an authorized EGS user. Record the approving user, decision date, reason for proceeding, supporting customer authorization, estimated value/cost exposure, and continuing PO-pending state.

Supported customer-authorization evidence includes verbal instruction, email approval, WhatsApp approval, signed quotation, letter of award, and formal PO. Preserve authorization type, customer contact, date/time, evidence/reference, recorder, and whether a formal PO remains pending.

When a Job is Lost after production begins, preserve the last delivery position, costs/work already incurred, loss reason, loss date, responsible decision, and disposition of produced materials. Loss must not erase the operational history.

A Job Lost decision records the loss reason, loss date, stage reached, work/production completed, costs incurred, amounts invoiced/received, produced-material disposition, and confirming user.

A Job Lost may reopen when the same quotation family and scope resume. Preserve the loss and reopening history. A new or substantially different quotation creates a new Ongoing Job under the confirmed quotation boundary.

After Job Done, warranty, correction, and non-new rework remain connected to the original Ongoing Job. Preserve reason, work performed, cost, responsibility, and dates. Genuinely new or separately quoted work creates a new Ongoing Job.

Quotation revisions should be distinct versions. An issued version is historical evidence and is not overwritten; later versions supersede it. Accepted scope must remain identifiable.

Pre-sale Design revisions are also preserved as distinct versions. Quote Versions and Design Versions link explicitly in both directions: a Quote Version identifies its supporting Design Version(s), and a Design Version identifies the Quote Version(s) that rely on it.

Design approval and commercial/Quotation approval are independent. EGS may have an approved Design while price or PO remains unresolved, or an acceptable price while Design remains unapproved. Subsequent changes create new Design or Quote Versions and update the Ongoing Job's current scope; previous versions and decisions remain preserved.

EGS does not require a separate partial-approval workflow for quotation lines. When the customer changes or accepts only part of the proposed scope, EGS revises the same logical quotation by issuing a new version reflecting the updated scope. The Ongoing Job's current scope follows the latest applicable/accepted version, while all earlier issued versions remain historical evidence.

### Financial milestone in CRM

Recommended operational set:

`Waiting PO/Approval → Awaiting Initial Payment → Initial Payment Received → Awaiting Final Payment → Fully Paid`

This is an Ongoing Job operational summary, not an invoice/payment ledger.

**EGS boundary:** detailed invoices, deposits, partial payments, credit notes, adjustments, and payment transactions are managed in Zoho. Zoho is the authoritative financial ledger. The CRM keeps the Ongoing Job's operational financial milestone/summary—such as waiting for PO/approval, awaiting initial downpayment, initial payment received, awaiting final payment, or fully paid—plus the relevant Zoho reference/link where available. The CRM does not become a second manually maintained invoice ledger.

Job Done still requires physical delivery and confirmation that the Ongoing Job's outstanding balance is zero/fully paid according to the authoritative Zoho information.

### Task

`Open → In Progress → Blocked → Done / Cancelled`

Task type and task status are separate. Completion of an internal review task is not automatically a customer interaction.

Internal Tasks (for example reply review, quotation preparation, or design review) do not create customer Interactions merely by being completed. An external follow-up records its channel, occurrence time, outcome, and notes and may update last-interaction information.

Every Task has one accountable owner, an applicable due date, explicit links to its relevant context (Person, Organization, Ongoing Job, Campaign, Location, Phase, or Service/Scope Line), completion actor/time, and optional collaborators/watchers.

## Meaning of the confirmed Ongoing Job workflow

- `Design` means the initial pre-sale concept normally required before quotation.
- `Quotation` and `Quotation Sent` describe the current Quote Version position.
- `Waiting Advice/PO` preserves commercial authorization details while production may still begin with approved risk acceptance.
- `In Production`, `Ready`, and `Installation` describe operational progress and may also exist by scope line, phase, and location.
- `Waiting Balance Payment` means physical delivery may be complete while Zoho still shows money outstanding.
- `Job Done` means physically delivered and fully paid.
- `Job Lost` is an overall outcome that may occur even after production began; prior operational and financial history remains intact.

---

# Service catalogue workstream

The service catalogue is part of the foundation because it affects vocabulary, cardinality, fields, source of truth, and lifecycle applicability.

## Catalogue options

1. One flat fixed list of 12 strings — rejected.
2. One unlimited generic tree — overly abstract unless governed.
3. Governed catalogue with stable offerings, optional families/capabilities, aliases, and effective dates — recommended.

## Required catalogue columns

- Immutable service ID.
- Stable service code.
- Canonical business label.
- Definition and scope boundary.
- Parent family, if used.
- Historical aliases and legacy spellings.
- Active/inactive dates.
- Display order.
- Default commercial/delivery workflow where useful.
- Reporting category.
- Governance owner and permitted maintainers.
- Change reason and approval metadata for rename, merge, split, deactivate, or remap actions.

## Required reconciliation

Map all of the following into the approved catalogue:

- EGS's intended 12 categories.
- Current relationship-profile values.
- Current ongoing-job free-text service values.
- Current completed-job types.
- Website/marketing service families.
- Historical tracker and spreadsheet values.

No legacy value should be silently discarded. Ambiguous mappings remain in a review list.

## Catalogue governance

- EGS appoints a business owner for the service catalogue; developers do not invent categories while implementing features.
- Renaming changes the display label, not the stable service identity.
- Retired offerings become inactive; historical transactions keep their service ID.
- Merging or splitting a category requires an explicit mapping and effective date so historical reports remain explainable.
- Application users select governed values; only authorized catalogue maintainers may create or restructure them.

## Service-catalogue dependency boundary

The final 12 names, UOM choices, and inquiry questions are not required to define the stable core. The target model can proceed with empty/configurable `Service Offering`, `UOM`, `Inquiry Form Template Version`, `Service Field Definition`, and `Service Specification Answer` concepts.

Information to add later:

- The 12 catalogue records and aliases.
- Allowed/default UOMs for each offering.
- Service-specific question definitions and options.
- Which questions are required at Inquiry, Quotation, Production, or Delivery.
- Template versions and ordering.

No service-specific question should be hard-coded into Person, Organization, Campaign, or Ongoing Job core fields merely because the catalogue content is temporarily unavailable.

## Start-readiness for Talha

The following boundaries are confirmed and can move forward independently of the final 12-service content:

- Person, Contact Method, Organization, Organization Contact Method/Identifier, Person–Organization Role, and Location.
- Duplicate review, administrator-controlled merge, archiving, audit, ownership, permissions, Notes, and Files.
- Event, Event Edition, Event Participation, Campaign, Campaign Account, Campaign Contact, Sequence, Enrollment, and contextual Lead state.
- Conversation, Participant, Message, Interaction, Review Decision, and unified Task concepts.
- One continuous Ongoing Job with one customer Organization, multiple stakeholders, phases, locations, scope lines, component progress, owners, and optional Campaign attribution.
- One logical Quote with immutable Quote Versions/Lines; preserved Design Versions and their links.
- Customer Authorization, pre-PO internal approval, Job Lost history/reopening, warranty/rework, and Zoho-owned finance with CRM milestones.
- The configurable service/UOM/inquiry-template shell.

The service-dependent inquiry form content becomes complete when EGS supplies the catalogue and question definitions; it does not need to block the service-independent foundation.

---

# Decision gates and working order

1. Approve the design principles and canonical boundaries.
2. Approve the vocabulary/glossary and relationship matrix.
3. Approve the source-of-truth, identity, matching, merge, suppression, and lifecycle rules.
4. Confirm the configurable Service/UOM/Inquiry Form Template structure.
5. Talha reviews the stable target boundaries without changing business meaning.
6. Build and review the complete table-by-table field dictionary.
7. Add and reconcile the actual 12 Service Offerings, UOMs, aliases, and inquiry questions when supplied.
8. Validate the completed catalogue/templates against representative EGS jobs.
9. Freeze Foundation Specification v1 as the target-system contract.

## Foundation-complete definition

The foundation is ready for Talha when:

- Every core entity has one definition and clear boundary.
- Every core relationship has min/max cardinality, requiredness, uniqueness, history, merge, and archive rules in the completed logical contract.
- Every field has one canonical owner.
- Service categories can be added, renamed, retired, and grouped without schema changes.
- Multi-service, multi-phase, and multi-location Ongoing Jobs are supported.
- Identity uncertainty does not force destructive merges.
- Generic organization endpoints are not people.
- Commercial authorization, delivery progress, payment milestone, and overall outcome remain independently understandable even when one user-facing stage summarizes them.
- Historical messages, quotes, jobs, and decisions remain explainable after current identity facts change.
- All scenario acceptance tests can be represented without duplicate sources of truth.

## Outside this target-foundation exercise

- Physical storage/table/column design.
- Database vendor-specific implementation choices.
- Existing-data transition and execution planning.
- Frontend and API implementation details.
- Detailed production, procurement, inventory, and vendor modules.
- Accounting integration design.
- Dashboard/query optimization.
- Personal-data retention and privacy implementation.
- Detailed attachment/blob storage implementation.
- Currency, tax, decimal precision, and exchange-rate implementation.
- Timezone storage/display rules beyond the requirement to preserve an unambiguous instant and business timezone.
- Idempotency implementation for external messages, imports, and provider retries.

These are not forgotten; they depend on the foundation decisions above.

---

# Open decision register

| ID | Decision | Recommended default | Status |
|---|---|---|---|
| D-001 | Canonical list and definitions of EGS's 12 service offerings | Governed records grouped into stable families | Deferred until EGS supplies catalogue content |
| D-002 | What defines the Ongoing Job boundary? | One quotation family and all its revisions = one Ongoing Job. Separate quotation = separate Ongoing Job. One job may contain multiple phases and locations | Confirmed by EGS |
| D-003 | Can direct/repeat jobs exist without a campaign? | Yes; campaign attribution is optional | Confirmed by EGS |
| D-004 | Is Ongoing Job the continuous canonical work concept? | Yes; one record from Inquiry through Job Done/Job Lost with separate underlying dimensions | Confirmed by EGS |
| D-005 | How are branches/campuses distinguished? | Treat as Locations unless they have their own quotation/customer responsibility; separate quotation creates separate Ongoing Job | Confirmed by EGS |
| D-006 | Which service-specific specifications need structured fields? | Only high-value shared reporting/operational fields; configure through versioned templates | Deferred until EGS supplies service details |
| D-007 | What is the main Ongoing Job workflow? | Inquiry, Design, Quotation, Quotation Sent, Waiting Advice/PO, In Production, Ready, Installation, Waiting Balance Payment, Job Done/Job Lost | Confirmed by EGS |
| D-008 | How does service-specific workflow variation work? | Shared Ongoing Job workflow with service template applicability and service/scope-line progress | Structure confirmed; service content deferred |
| D-009 | Ongoing Job-to-Campaign attribution | Optional; direct and repeat Ongoing Jobs may have none | Confirmed by EGS |
| D-011 | Is a complex Organization hierarchy required in the core? | No. Use one quoted customer per Ongoing Job, Locations for branches/sites, and human review for possible related/duplicate Organizations | Confirmed by EGS |
| D-012 | Who governs catalogues and lifecycle vocabulary? | Administrators; all changes audited and historical references preserved | Confirmed by EGS |
| D-013 | What is the Ongoing Job scope-line grain? | Service + quantity/UOM + phase + location + commercial/current scope context | Confirmed by EGS |
| D-015 | Can one Ongoing Job have multiple customer-side contacts? | Yes; assign stakeholder roles and allow one optional primary contact | Confirmed by EGS |
| D-016 | Can one Ongoing Job involve multiple external customer organizations? | No; one customer organization per Ongoing Job. Venues/sites remain location context | Confirmed by EGS |
| D-017 | How are branches, campuses, and venues treated? | Locations within the Ongoing Job unless they have their own quotation; then create a separate Ongoing Job | Confirmed by EGS |
| D-018 | What happens when a Person changes companies? | Retain the same Person, end/preserve the old Role, add the new Role, and keep historical records in their original context | Confirmed by EGS |
| D-019 | Can a Person hold roles at multiple Organizations simultaneously? | Yes; preserve each relationship as a separate dated Role | Confirmed by EGS |
| D-020 | Where do generic company contact methods belong? | Directly to Organization; create/link a Person only when a real individual is identified | Confirmed by EGS |
| D-021 | How are duplicate People handled? | Any repeated personal email or LinkedIn identifier triggers human review. Names and other evidence support the decision. Never auto-merge Person records | Confirmed by EGS |
| D-022 | How are duplicate Organizations handled? | Repeated domains or sufficiently similar names trigger human review. Keep records separate and never auto-merge | Confirmed by EGS |
| D-023 | Who can merge Person or Organization records? | Administrators only; every merge records actor, time, survivor, moved information, and supports correction/reversal | Confirmed by EGS |
| D-024 | Is Lead status global to a Person? | No; it belongs to the specific campaign, service pursuit, or commercial context. Person views summarize those contexts | Confirmed by EGS |
| D-025 | Is Right/Wrong POC a global Person label? | No; assess it by Organization Role and responsibility/service context. Track overall relationship importance separately | Confirmed by EGS |
| D-026 | Are POC suitability and relationship value separate? | Yes. Track relationship value independently and record why the Person matters through roles such as referrer, connector, champion, decision-maker, procurement, or finance | Confirmed by EGS |
| D-027 | How is Key Relationship status assigned? | Manual confirmation by an EGS user only; never automatic from reply, Lead, or Right POC state | Confirmed by EGS |
| D-028 | How is a Key Relationship owned internally? | One accountable EGS owner, optional collaborators, and dated ownership history when responsibility changes | Confirmed by EGS |
| D-029 | How is an Ongoing Job owned internally? | One overall Job Leader plus separate responsible owners for design, production, installation, accounts, and other defined parts | Confirmed by EGS |
| D-030 | Can phases/locations progress independently? | Yes; each has its own progress, deadlines, and responsible owners while the Ongoing Job provides the overall summary | Confirmed by EGS |
| D-031 | Can services/scope lines progress independently? | Yes; track progress and responsible owners by service/scope line as well as by phase/location and overall Job | Confirmed by EGS |
| D-032 | How is partial quotation acceptance handled? | Revise the same logical quotation and Ongoing Job scope; issue a new quotation version. Do not add a separate partial-approval workflow; preserve prior versions | Confirmed by EGS |
| D-033 | How are Design and Quotation revisions related? | Preserve every Design Version and Quote Version; link them explicitly in both directions, allowing one or more supporting versions where needed | Confirmed by EGS |
| D-034 | Are Design approval and Quotation/commercial approval the same decision? | No; track them independently. Either may be accepted first, and later revisions update current scope without erasing history | Confirmed by EGS |
| D-035 | Which customer-authorization forms are supported? | Verbal, email, WhatsApp, signed quotation, letter of award, and formal PO; preserve type, contact, date, evidence, recorder, and PO-pending state | Confirmed by EGS |
| D-036 | Who authorizes production before a formal PO? | An authorized EGS user must explicitly approve it; preserve approver, date, reason, evidence, estimated exposure, and PO-pending state | Confirmed by EGS |
| D-037 | What must be recorded for Job Lost? | Reason, date, last stage, completed work, incurred cost, invoiced/received amounts, material disposition, and confirming user | Confirmed by EGS |
| D-038 | Can a Job Lost reopen? | Yes when the same quotation family/scope resumes; preserve loss/reopen history. A new or substantially different quotation creates a new Ongoing Job | Confirmed by EGS |
| D-039 | How is work after Job Done handled? | Warranty/correction/non-new rework stays linked to the original Job with full history; new or separately quoted work creates a new Job | Confirmed by EGS |
| D-040 | Where are detailed invoices and payments managed? | Zoho is authoritative. CRM stores operational payment milestones/summary and Zoho reference, not a competing detailed ledger. Job Done requires delivered + fully paid | Confirmed by EGS |
| D-041 | How are Tasks owned and contextualized? | One accountable owner, applicable due date, contextual links, completion actor/time, and optional collaborators/watchers | Confirmed by EGS |
| D-042 | Does every completed Task count as a customer Interaction? | No. Internal Task completion is internal history; only real external contact records channel, time, outcome, notes, and last-interaction effect | Confirmed by EGS |
| D-043 | How is activity presented? | One combined chronological timeline per relevant Person, Organization, and Ongoing Job, composed from distinct authoritative records | Confirmed by EGS |
| D-044 | How are multiple inbound Messages grouped for review? | One combined Review Task per Conversation for Messages received before review; a later reply after completion creates a new Review Task | Confirmed by EGS |
| D-045 | Is AI used for reply classification? | No. Classification is entirely human; the reviewer selects the authoritative outcome | Confirmed by EGS |
| D-046 | When is a follow-up required after reply review? | Active outcomes require the next follow-up Task before completion; closed outcomes may complete without one | Confirmed by EGS |
| D-047 | Must every Campaign relate to an Event? | No; Event/Event Edition is optional. Campaigns may support services, seasons, re-engagement, or other objectives | Confirmed by EGS |
| D-048 | How many services can one Campaign target? | Exactly one Service Offering per Campaign | Confirmed by EGS |
| D-049 | Can a Campaign Account contain multiple Contacts? | Yes; one Organization per Campaign Account with multiple Campaign Contacts, each retaining independent outreach and response history | Confirmed by EGS |
| D-050 | What happens to other Campaign Contacts after one Person replies? | Focus follow-up on the responder and pause future follow-ups to others in that Campaign Account. Referral activates the referred Person; Wrong POC without referral allows another Contact. Scope is campaign/service-specific | Confirmed by EGS |
| D-051 | Does Not Interested close an Organization account? | No; record it only for that Person/current Campaign and stop the current follow-up. Future campaigns remain possible | Confirmed by EGS |
| D-052 | What is the scope of unsubscribe and bounce? | Apply to the specific contact method by default. Broader Person/Organization suppression requires an explicit request or justification | Confirmed by EGS |
| D-053 | How are important records removed? | Use recoverable archiving by default. Admin-only permanent deletion for narrowly justified cases; stronger protection for evidence and audit records | Confirmed by EGS |
| D-054 | How is CRM access controlled? | Shared viewing for authorized users; assignment-based editing; manager oversight; admin controls; restrict sensitive finance/settings to authorized roles | Confirmed by EGS |
| D-055 | How are Notes and Files handled? | Contextual links, uploader/editor history, protected issued/approved documents, explicit Design/Quote versions, and reusable file links without duplicate uploads | Confirmed by EGS |
| D-056 | Who governs controlled lists and statuses? | Administrators only; audit add/rename/reorder/deactivate/remap actions and preserve historical references | Confirmed by EGS |

## Change control

Every unresolved decision should record:

- Decision ID.
- Options considered.
- Recommendation.
- Business reason.
- Technical consequence.
- Owner.
- Decision date.
- Status.
- Entities/fields affected.

Once Foundation Specification v1 is frozen, changes should be added as explicit decisions rather than silently changing meanings in code.

## Archiving and deletion

- Normal users archive important business records rather than permanently deleting them.
- Archived records leave normal active views but retain relationships and history.
- Administrators can restore archived records.
- Permanent deletion is administrator-restricted and limited to genuine mistakes, test data, or justified/legal removal.
- Messages, issued Quote Versions, approvals, financial references, Merge Records, and audit history receive stronger deletion protection.
- Every archive, restore, or permitted deletion records actor, time, reason, and affected record.


## Access and permissions

- Authorized CRM users can view shared People, Organizations, Campaigns, Ongoing Jobs, Tasks, and activity history.
- Users can update records they own, lead, or are assigned to.
- Managers can oversee and reassign their team's records.
- Administrators manage users, merges, restoration, permitted permanent deletion, controlled catalogues, and system settings.
- Sensitive financial summaries, costs, margins, and administrative settings are limited to explicitly authorized roles.

## Notes, files, and documents

- Notes may attach to People, Organizations, Campaigns, Ongoing Jobs, phases, locations, service/scope lines, and Tasks.
- Important Note edits preserve previous content, editor, timestamp, and reason where applicable.
- Files preserve type, uploader, upload time, source, and relevant context.
- Design and Quote documents follow their confirmed versioning rules.
- Issued and approved documents are never silently overwritten.
- One stored File may link to several relevant contexts without uploading duplicate copies.

## Controlled vocabulary governance

- Only administrators may add, rename, reorder, deactivate, or remap governed Service Offerings, UOMs, relationship roles, loss reasons, Task types, reply outcomes, and workflow statuses.
- Values referenced by historical records are normally deactivated rather than deleted.
- Every catalogue or lifecycle change records actor, time, change type, previous/new value, and reason.
- Historical records retain stable references so later label changes do not alter their original meaning.
