# EGS CRM Logical Entity–Relationship Diagram

Status: Target logical model for implementation review  
Business authority: [CRM Foundation Specification](./CRM_FOUNDATION_SPEC.md)  
Live source evidence: [Live Mongo Data Audit](./CRM_LIVE_MONGO_DATA_AUDIT.md)  
Companion execution guide: [Mongo-to-SQL AI Agent Migration Guide](./MONGO_TO_SQL_AI_AGENT_GUIDE.md)

## How to read this document

- This is the logical destination, not a copy of the current Mongo collections.
- Names describe business concepts. Talha may adapt physical table and column naming, but not the boundaries or meaning without recording a foundation decision.
- `one` means exactly one; `zero or one` means optional; `many` includes zero unless the relationship notes say otherwise.
- Historical/version records are preserved. Issued documents, decisions, messages, audit evidence, and migration provenance are not overwritten.
- The final 12 Service Offerings, their UOM choices, and inquiry questions can be loaded later. Their empty configurable structure is part of the model now.

## Whole system at a glance

```mermaid
flowchart LR
    subgraph Identity["1. Identity and relationships"]
        P["Person"]
        PCM["Personal Contact Method"]
        POR["Person–Organization Role"]
        O["Organization"]
        OCM["Organization Endpoint / Identifier"]
        L["Location / Site"]
        POC["POC Suitability"]
        KR["Key Relationship Profile"]
        P --> PCM
        P --> POR
        POR --> O
        O --> OCM
        O --> L
        POR --> POC
        POR --> KR
    end

    subgraph Catalogue["2. Services and inquiry configuration"]
        SF["Service Family"]
        SO["Service Offering"]
        U["UOM"]
        FT["Inquiry Template Version"]
        FD["Service Field Definition"]
        SA["Service Specification Answer"]
        SF --> SO
        SO --> U
        SO --> FT
        FT --> FD
        FD --> SA
    end

    subgraph Events["3. Events and participation"]
        E["Event"]
        EE["Event Edition"]
        EP["Event Participation"]
        E --> EE
        EE --> EP
        O --> EP
        L --> EE
    end

    subgraph Outreach["4. Campaigns and outreach"]
        C["Campaign"]
        CA["Campaign Account"]
        CC["Campaign Contact"]
        SQ["Sequence"]
        SV["Sequence Version"]
        SS["Sequence Step"]
        EN["Sequence Enrollment"]
        SO --> C
        EE --> C
        C --> CA
        O --> CA
        CA --> CC
        POR --> CC
        OCM --> CC
        SQ --> SV
        SV --> SS
        CC --> EN
        SV --> EN
    end

    subgraph Communication["5. Communication, review, and work"]
        CV["Conversation"]
        CP["Conversation Participant"]
        M["Message"]
        RI["Review Item"]
        RD["Review Decision"]
        I["Interaction"]
        T["Task"]
        CV --> CP
        CV --> M
        M --> RI
        RI --> RD
        RI --> T
        P --> I
        O --> I
    end

    subgraph Commercial["6. Continuous commercial and delivery record"]
        J["Ongoing Job"]
        ST["Customer Stakeholder"]
        PH["Job Phase"]
        JL["Job Location"]
        SL["Job Scope Line"]
        DV["Design Version"]
        Q["Quote"]
        QV["Quote Version"]
        QL["Quote Line"]
        AU["Customer Authorization"]
        PA["Pre-PO Internal Approval"]
        FM["Financial Milestone + Zoho Reference"]
        JE["Job Outcome / Reopen / Rework Event"]
        O --> J
        CA --> J
        J --> ST
        POR --> ST
        J --> PH
        J --> JL
        L --> JL
        J --> SL
        SO --> SL
        J --> DV
        J --> Q
        Q --> QV
        QV --> QL
        DV --> QV
        J --> AU
        AU --> PA
        J --> FM
        J --> JE
        J --> T
        J --> I
        FD --> SA
        J --> SA
    end

    subgraph Governance["7. Shared governance and evidence"]
        N["Note + Revisions"]
        F["File + Context Links"]
        AS["Assignment History"]
        PR["Progress History"]
        AE["Audit Event"]
        MR["Merge Record"]
        SR["Source Record / Provenance"]
    end
```

The arrows above show navigation, not ownership of copied data. For example, a Person screen may show Jobs and Messages, but Person does not store copies of them.

## A. Identity, organization, and relationship ERD

```mermaid
erDiagram
    PERSON ||--o{ PERSON_CONTACT_METHOD : has
    PERSON ||--o{ PERSON_ORGANIZATION_ROLE : holds
    ORGANIZATION ||--o{ PERSON_ORGANIZATION_ROLE : engages
    ORGANIZATION ||--o{ ORGANIZATION_IDENTIFIER : has
    ORGANIZATION ||--o{ ORGANIZATION_CONTACT_METHOD : has
    ORGANIZATION ||--o{ LOCATION : has
    PERSON_ORGANIZATION_ROLE ||--o{ POC_SUITABILITY : assessed_for
    PERSON_ORGANIZATION_ROLE ||--o| KEY_RELATIONSHIP_PROFILE : may_have
    KEY_RELATIONSHIP_PROFILE ||--o{ KEY_RELATIONSHIP_ROLE : describes
    KEY_RELATIONSHIP_PROFILE ||--o{ RELATIONSHIP_ASSIGNMENT : owned_by
    SERVICE_OFFERING o|--o{ POC_SUITABILITY : may_scope

    PERSON {
        uuid id PK
        string display_name
        string identity_notes
        datetime archived_at
    }
    PERSON_CONTACT_METHOD {
        uuid id PK
        uuid person_id FK
        string type
        string original_value
        string normalized_value
        boolean preferred
        string validity
        string source
    }
    ORGANIZATION {
        uuid id PK
        string canonical_name
        string trading_name
        string organization_type
        datetime archived_at
    }
    ORGANIZATION_IDENTIFIER {
        uuid id PK
        uuid organization_id FK
        string type
        string original_value
        string normalized_value
        string validity
    }
    ORGANIZATION_CONTACT_METHOD {
        uuid id PK
        uuid organization_id FK
        string type
        string original_value
        string normalized_value
        string validity
    }
    PERSON_ORGANIZATION_ROLE {
        uuid id PK
        uuid person_id FK
        uuid organization_id FK
        string title
        string department
        string responsibility
        date effective_from
        date effective_to
    }
    LOCATION {
        uuid id PK
        uuid organization_id FK
        string name
        string type
        string address
        string geography
    }
    POC_SUITABILITY {
        uuid id PK
        uuid role_id FK
        uuid service_offering_id FK
        string responsibility_context
        string assessment
        string reason
        datetime assessed_at
    }
    KEY_RELATIONSHIP_PROFILE {
        uuid id PK
        uuid role_id FK
        string standing
        boolean manually_confirmed
        datetime confirmed_at
    }
```

Identity constraints:

- Names are never unique keys.
- Personal email and LinkedIn repetitions create duplicate-review cases; they do not cause automatic merges.
- Organization names and domains are matching evidence; neither is a guaranteed unique identity key.
- A generic inbox or switchboard is an Organization Contact Method, not a Person.
- A Person changing employer creates or closes Role records; it does not replace the Person.
- Merges are administrator-confirmed, audited, reversible operations.

## B. Services and configurable inquiry ERD

```mermaid
erDiagram
    SERVICE_FAMILY o|--o{ SERVICE_OFFERING : groups
    SERVICE_OFFERING ||--o{ SERVICE_ALLOWED_UOM : allows
    UOM ||--o{ SERVICE_ALLOWED_UOM : selected_by
    SERVICE_OFFERING ||--o{ INQUIRY_TEMPLATE_VERSION : configures
    INQUIRY_TEMPLATE_VERSION ||--|{ SERVICE_FIELD_DEFINITION : contains
    ONGOING_JOB ||--o{ SERVICE_SPECIFICATION_ANSWER : records
    SERVICE_FIELD_DEFINITION ||--o{ SERVICE_SPECIFICATION_ANSWER : answered_as

    SERVICE_OFFERING {
        uuid id PK
        string stable_code
        string canonical_label
        string definition
        date active_from
        date active_to
    }
    UOM {
        uuid id PK
        string stable_code
        string label
        string unit_family
    }
    SERVICE_ALLOWED_UOM {
        uuid service_offering_id FK
        uuid uom_id FK
        boolean is_default
    }
    INQUIRY_TEMPLATE_VERSION {
        uuid id PK
        uuid service_offering_id FK
        integer version_number
        string publication_state
        datetime published_at
    }
    SERVICE_FIELD_DEFINITION {
        uuid id PK
        uuid template_version_id FK
        string stable_field_code
        string label
        string data_type
        integer display_order
        string requirement_stage
    }
    SERVICE_SPECIFICATION_ANSWER {
        uuid id PK
        uuid ongoing_job_id FK
        uuid field_definition_id FK
        string typed_value
        datetime recorded_at
    }
```

The `typed_value` label represents a logical typed answer. The physical SQL design should preserve validation and queryability using type-appropriate columns or another constrained design; it must not become an uncontrolled JSON dump.

## C. Events, campaigns, and outreach ERD

```mermaid
erDiagram
    EVENT ||--o{ EVENT_EDITION : has
    LOCATION o|--o{ EVENT_EDITION : hosts
    EVENT_EDITION ||--o{ EVENT_PARTICIPATION : records
    ORGANIZATION ||--o{ EVENT_PARTICIPATION : participates
    SERVICE_OFFERING ||--o{ CAMPAIGN : targeted_by
    EVENT_EDITION o|--o{ CAMPAIGN : may_contextualize
    CAMPAIGN ||--o{ CAMPAIGN_ACCOUNT : pursues
    ORGANIZATION ||--o{ CAMPAIGN_ACCOUNT : targeted_as
    CAMPAIGN_ACCOUNT ||--o{ CAMPAIGN_CONTACT : uses
    PERSON_ORGANIZATION_ROLE o|--o{ CAMPAIGN_CONTACT : selects_person
    ORGANIZATION_CONTACT_METHOD o|--o{ CAMPAIGN_CONTACT : selects_endpoint
    SEQUENCE ||--|{ SEQUENCE_VERSION : versions
    SEQUENCE_VERSION ||--|{ SEQUENCE_STEP : orders
    CAMPAIGN_CONTACT ||--o{ SEQUENCE_ENROLLMENT : enters
    SEQUENCE_VERSION ||--o{ SEQUENCE_ENROLLMENT : executes

    EVENT_EDITION {
        uuid id PK
        uuid event_id FK
        uuid venue_location_id FK
        string edition_label
        date starts_on
        date ends_on
    }
    EVENT_PARTICIPATION {
        uuid id PK
        uuid event_edition_id FK
        uuid organization_id FK
        string hall
        string booth
        string source
    }
    CAMPAIGN {
        uuid id PK
        uuid service_offering_id FK
        uuid event_edition_id FK
        string name
        string objective
        string lifecycle
        date starts_on
        date ends_on
    }
    CAMPAIGN_ACCOUNT {
        uuid id PK
        uuid campaign_id FK
        uuid organization_id FK
        string pursuit_state
    }
    CAMPAIGN_CONTACT {
        uuid id PK
        uuid campaign_account_id FK
        uuid role_id FK
        uuid organization_contact_method_id FK
        string lead_state
        string outreach_focus_state
    }
    SEQUENCE_ENROLLMENT {
        uuid id PK
        uuid campaign_contact_id FK
        uuid sequence_version_id FK
        string execution_state
        string stop_reason
    }
```

Campaign constraints:

- One Campaign targets exactly one Service Offering and may optionally relate to one Event Edition.
- One Campaign Account exists per Campaign + Organization pair.
- A Campaign Contact selects either a real Person–Organization Role or an Organization endpoint. It must not invent a Person for a generic inbox.
- Lead state belongs to Campaign Contact context, not Person.
- Outreach execution, message evidence, reply review, and suppression remain separate facts.

## D. Communication, review, interaction, and task ERD

```mermaid
erDiagram
    CONVERSATION ||--|{ CONVERSATION_PARTICIPANT : includes
    CONVERSATION ||--|{ MESSAGE : contains
    PERSON_CONTACT_METHOD o|--o{ CONVERSATION_PARTICIPANT : may_identify
    ORGANIZATION_CONTACT_METHOD o|--o{ CONVERSATION_PARTICIPANT : may_identify
    CONVERSATION ||--o{ REVIEW_ITEM : creates
    REVIEW_ITEM ||--|{ REVIEW_ITEM_MESSAGE : groups
    MESSAGE ||--o{ REVIEW_ITEM_MESSAGE : included_in
    REVIEW_ITEM ||--o| REVIEW_DECISION : resolved_by
    REVIEW_ITEM o|--o{ TASK : may_require
    PERSON o|--o{ INTERACTION : involves
    ORGANIZATION o|--o{ INTERACTION : involves
    ONGOING_JOB o|--o{ INTERACTION : concerns
    CAMPAIGN_CONTACT o|--o{ MESSAGE : contextualizes
    ONGOING_JOB o|--o{ MESSAGE : may_concern
    USER ||--o{ TASK : owns
    USER ||--o{ REVIEW_DECISION : makes
    USER ||--o{ INTERACTION : records

    CONVERSATION {
        uuid id PK
        string channel
        string external_thread_id
        string subject
    }
    CONVERSATION_PARTICIPANT {
        uuid id PK
        uuid conversation_id FK
        uuid person_contact_method_id FK
        uuid organization_contact_method_id FK
        string participant_role
        string endpoint_type_snapshot
        string endpoint_value_snapshot
    }
    MESSAGE {
        uuid id PK
        uuid conversation_id FK
        string direction
        string channel
        string external_message_id
        string subject
        text body
        datetime occurred_at
        string delivery_state
    }
    REVIEW_ITEM {
        uuid id PK
        uuid conversation_id FK
        string status
        datetime opened_at
        datetime closed_at
    }
    REVIEW_DECISION {
        uuid id PK
        uuid review_item_id FK
        uuid reviewer_user_id FK
        string outcome
        string reason
        datetime decided_at
    }
    INTERACTION {
        uuid id PK
        string channel
        string direction
        datetime occurred_at
        string outcome
        text notes
    }
    TASK {
        uuid id PK
        uuid owner_user_id FK
        string type
        string status
        string priority
        datetime due_at
        datetime completed_at
    }
```

Communication constraints:

- A Message is immutable evidence. Review results do not overwrite it.
- Several inbound Messages arriving before review may share one Review Item; a later reply after completion creates another Review Item.
- Classification is human-only for now.
- An internal Task is not an Interaction. A real call, email, WhatsApp exchange, meeting, or site visit is an Interaction or Message.
- Participant rows retain the exact endpoint used at the time.
- A Participant retains an endpoint snapshot even when its canonical Person/Organization link is missing or disputed. At most one canonical contact-method link is used; neither may be present for unresolved legacy evidence. This prevents orphaned historical communications from being lost or assigned to an invented identity.

## E. Ongoing Job, commercial, and delivery ERD

```mermaid
erDiagram
    ORGANIZATION ||--o{ ONGOING_JOB : commissions
    CAMPAIGN_ACCOUNT o|--o{ ONGOING_JOB : may_attribute
    ONGOING_JOB ||--o{ CUSTOMER_STAKEHOLDER : involves
    PERSON_ORGANIZATION_ROLE ||--o{ CUSTOMER_STAKEHOLDER : serves_as
    ONGOING_JOB ||--o{ JOB_PHASE : divides_into
    ONGOING_JOB ||--o{ JOB_LOCATION : covers
    LOCATION ||--o{ JOB_LOCATION : selected_as
    ONGOING_JOB ||--o{ JOB_SCOPE_LINE : contains
    SERVICE_OFFERING ||--o{ JOB_SCOPE_LINE : describes
    UOM ||--o{ JOB_SCOPE_LINE : measures
    JOB_SCOPE_LINE ||--o{ SCOPE_LINE_PHASE : scheduled_in
    JOB_PHASE ||--o{ SCOPE_LINE_PHASE : contains
    JOB_SCOPE_LINE ||--o{ SCOPE_LINE_LOCATION : delivered_at
    JOB_LOCATION ||--o{ SCOPE_LINE_LOCATION : receives
    ONGOING_JOB ||--o| QUOTE : owns
    QUOTE ||--o{ QUOTE_VERSION : versions
    QUOTE_VERSION ||--|{ QUOTE_LINE : snapshots
    SERVICE_OFFERING ||--o{ QUOTE_LINE : prices
    UOM ||--o{ QUOTE_LINE : measures
    ONGOING_JOB ||--o{ DESIGN_VERSION : preserves
    DESIGN_VERSION ||--o{ DESIGN_QUOTE_LINK : supports
    QUOTE_VERSION ||--o{ DESIGN_QUOTE_LINK : supported_by
    DESIGN_VERSION ||--o{ DESIGN_DECISION : decided_by
    QUOTE_VERSION ||--o{ QUOTE_DECISION : decided_by
    ONGOING_JOB ||--o{ CUSTOMER_AUTHORIZATION : authorized_by
    CUSTOMER_AUTHORIZATION ||--o{ PRE_PO_INTERNAL_APPROVAL : risk_approved_by
    ONGOING_JOB ||--o{ FINANCIAL_MILESTONE : summarized_by
    ONGOING_JOB ||--o{ JOB_EVENT : records

    ONGOING_JOB {
        uuid id PK
        uuid customer_organization_id FK
        uuid campaign_account_id FK
        string job_number
        string title
        string inquiry_source
        datetime received_at
        string summary_stage
        string outcome
    }
    CUSTOMER_STAKEHOLDER {
        uuid id PK
        uuid ongoing_job_id FK
        uuid role_id FK
        string responsibility
        boolean is_primary
        date effective_from
        date effective_to
    }
    JOB_PHASE {
        uuid id PK
        uuid ongoing_job_id FK
        string name
        integer display_order
        date deadline
        string current_progress
    }
    JOB_LOCATION {
        uuid id PK
        uuid ongoing_job_id FK
        uuid location_id FK
        string role
        date deadline
        string current_progress
    }
    JOB_SCOPE_LINE {
        uuid id PK
        uuid ongoing_job_id FK
        uuid service_offering_id FK
        uuid uom_id FK
        decimal quantity
        text description
        string current_scope_state
        string current_progress
    }
    QUOTE {
        uuid id PK
        uuid ongoing_job_id FK
        string quote_family_number
    }
    QUOTE_VERSION {
        uuid id PK
        uuid quote_id FK
        integer version_number
        string status
        datetime issued_at
        date valid_until
        decimal total_amount
        string currency
    }
    QUOTE_LINE {
        uuid id PK
        uuid quote_version_id FK
        uuid service_offering_id FK
        uuid uom_id FK
        decimal quantity
        decimal unit_price
        decimal line_total
        text description_snapshot
    }
    DESIGN_VERSION {
        uuid id PK
        uuid ongoing_job_id FK
        integer version_number
        string status
        datetime created_at
    }
    CUSTOMER_AUTHORIZATION {
        uuid id PK
        uuid ongoing_job_id FK
        string authorization_type
        uuid customer_role_id FK
        datetime authorized_at
        boolean po_pending
        string evidence_reference
    }
    FINANCIAL_MILESTONE {
        uuid id PK
        uuid ongoing_job_id FK
        string milestone
        datetime confirmed_at
        string zoho_reference
    }
    JOB_EVENT {
        uuid id PK
        uuid ongoing_job_id FK
        string event_type
        string reason
        datetime occurred_at
        uuid actor_user_id FK
    }
```

Job constraints:

- There is one continuous Ongoing Job from Inquiry through Job Done or Job Lost. Jobs Done is a view, not another table containing copied jobs.
- One quotation family and its revisions belong to one Ongoing Job. A separate quotation creates a separate Ongoing Job.
- One Ongoing Job has exactly one customer Organization, but may contain several stakeholders, services, phases, and locations.
- Current Job Scope Lines are editable working scope. Issued Quote Version and Quote Line content is an immutable commercial snapshot.
- Design approval and Quote approval are independent and point to exact versions.
- Physical delivery and financial settlement are separate. Job Done requires both delivered and fully paid according to Zoho-authoritative information.
- Production before formal PO requires recorded Customer Authorization plus authorized internal risk approval.
- Job Lost, reopen, warranty, correction, and rework remain events on the same Job unless a new/separate quotation is created.

## F. Shared ownership, evidence, and governance

The following apply across the domains without becoming duplicate business stores:

| Shared concept | Relationship rule |
|---|---|
| User | Owns or performs Assignments, Tasks, Reviews, Interactions, approvals, merges, and audited changes. |
| Assignment History | Records one accountable owner and optional collaborators for a Job or its component; effective dates preserve ownership changes. |
| Progress History | Append-only transition history for Job, phase, location, or scope-line progress. Current progress may be cached on its canonical component. |
| Note + Note Revision | A Note belongs to an explicit context. Edits retain author, timestamp, prior content, and reason where required. |
| File + File Link | One stored File can be linked to several explicit contexts. Issued or approved document versions are never overwritten. |
| Audit Event | Records actor, time, action, target, reason, and changed facts. It is not the business record itself. |
| Merge Record | Records survivor, duplicate, evidence, actor, moved relationships, and reversal history. |
| Source Record | Preserves original collection, Mongo `_id`, source payload/checksum or immutable archive reference, import run, and migration result. |
| Duplicate Review Case | Links candidate People or Organizations, matching evidence, reviewer decision, and resolution. It never automatically merges records. |
| Suppression | Applies to the exact contact endpoint by default; broader suppression requires explicit evidence and scope. |

### Explicit operational context links

The physical model must enforce the following links with named foreign keys or named bridge tables. They are shown as a table to keep the main diagrams readable.

| Record | Permitted explicit contexts | Rule |
|---|---|---|
| Task | Person, Organization, Campaign, Campaign Contact, Ongoing Job, Job Phase, Job Location, Job Scope Line, Review Item | One owner is required. A Task may have several relevant contexts, but every link must resolve to a real row. |
| Interaction | Person, Organization, Campaign Contact, Ongoing Job, and participating customer Roles | Record only real external contact. Retain channel, occurrence time, outcome, and recorder. |
| Note | Person, Organization, Campaign, Ongoing Job, Job Phase, Job Location, Job Scope Line, Task | Preserve revisions for important edits. |
| File | Message, Interaction, Note, Design Version, Quote Version, Customer Authorization, Ongoing Job, or component | Store the binary/object once; preserve the role of each context link. |
| Assignment History | Key Relationship Profile, Ongoing Job, Job Phase, Job Location, Job Scope Line | One accountable lead where required; collaborators and effective dates remain separate. |
| Progress History | Ongoing Job, Job Phase, Job Location, Job Scope Line | Append-only transitions; current progress belongs to the exact canonical component. |
| Source Record | Any imported target record through its migration crosswalk | A target may have several sources and one source may produce several target rows. |
| Audit Event | Any governed record changed by the new system | Append-only; the target ID must be resolvable and the changed facts preserved. |

For SQL referential integrity, context links should use named, foreign-key-backed relations for the supported core contexts. Do not rely on an unchecked `entity_type + entity_id` pair for canonical business relationships.

## Authoritative relationship and uniqueness checklist

| Relationship | Required database/business constraint |
|---|---|
| Campaign → Service Offering | Exactly one active reference on every Campaign. |
| Campaign Account | Unique Campaign + Organization pair. |
| Campaign Contact | Exactly one target kind: Person–Organization Role or Organization Contact Method. |
| Ongoing Job → Organization | Exactly one customer Organization. |
| Ongoing Job → Campaign Account | Optional, never required for direct/repeat work. |
| Ongoing Job → Quote | At most one logical Quote family. |
| Quote Version | Version number unique within Quote; issued content immutable. |
| Design Version | Version number unique within Ongoing Job; preserved rather than overwritten. |
| Customer Stakeholder | At most one active primary stakeholder per Ongoing Job. |
| Service Allowed UOM | Offering + UOM pair unique; at most one active default UOM per Offering. |
| Inquiry Template Version | Version number unique within Offering; published version immutable. |
| Sequence Step | Step order unique within Sequence Version. |
| Message | Provider/channel + external message identifier unique where supplied; collisions enter review. |
| Review Decision | At most one current final Decision per Review Item; corrections create audit/history rather than silent overwrite. |
| Task | Exactly one accountable owner; collaborators are separate assignments. |
| Contact methods | Normalized values indexed for duplicate detection, not globally forced to identify one Person/Organization. |
| Archive | Archived records retain IDs, relationships, provenance, and history. |

## Derived views, not new sources of truth

- `Jobs Done`: Ongoing Jobs with completed physical delivery and authoritative fully-paid confirmation.
- `Person Timeline`, `Organization Timeline`, and `Ongoing Job Timeline`: ordered union/read model over Messages, Interactions, Tasks, Reviews, Notes, versions, transitions, assignments, and approvals.
- Campaign counts and conversion metrics: derived from Campaign Accounts, Contacts, Enrollments, Messages, Reviews, and attributed Ongoing Jobs.
- Ongoing Job headline stage: controlled summary derived from commercial authorization, delivery progress, financial milestone, and outcome.
- Current balance, invoice detail, payment transactions, and credits: read/reference from Zoho, not a second CRM ledger.

## Acceptance scenarios

The logical/physical design is acceptable only if it can represent every scenario in the Foundation Specification, including duplicate names, concurrent employers, generic inboxes, multiple campaign contacts, direct Jobs, multiple services/phases/locations, independent design and quote approvals, pre-PO production, delivery before final payment, Job Lost after production, reopening, and post-completion warranty/rework without duplicating durable facts.
