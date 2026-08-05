# EGS CRM Repair Completion Report

Date: 5 August 2026  
Scope: CRM migration repair only; ERP expansion deliberately deferred

## Outcome

The migration defects identified in the second audit have been repaired in the live PostgreSQL database and application code. Repairs were executed with dry runs, transaction rollback conditions, before-state backups, audit events, and final read-only reconciliation.

## Final reconciled state

| Area | Final result |
|---|---:|
| Mongo Contacts preserved | 4,022 |
| Source-deleted Contacts correctly archived | 820 |
| Generic endpoints correctly represented as Organization endpoints, not People | 123 |
| Active Person Contacts | 3,079 |
| Historical backup reply-derived Leads | 70 |
| Legitimate post-backup responders recovered | 19 |
| Current response-derived Leads | 89 |
| Leads without response evidence | 0 |
| Leads without reply date | 0 |
| Active inbound Messages | 104 |
| Fully unlinked active inbound Messages | 0 |
| Runtime reply Review Items linked | 23 of 23 |
| Runtime reply Tasks linked to Person and Campaign | 23 of 23 |
| Operational Ongoing Jobs | 14 |
| Source-deleted test Opportunities hidden | 2 |
| Deferred historical Mongo Jobs excluded from operations | 229 |
| Non-zero operational Job values | 14 |
| Operational Job value total | AED 1,257,730 |
| Job value mismatches | 0 |
| Active Jobs with source-recorded primary Contacts | 4 of 14 |

The source contained six primary Job contacts; two belonged to the two source-deleted test Opportunities. Therefore four visible Jobs with primary Contacts is the correct active result. The remaining ten source Opportunities did not record a primary Contact and were not guessed.

## Application repairs

### Contacts and Leads

- Added canonical server-side derivation of `hasResponded`, first and latest response date, response channels, `leadStage`, delivery status, and outcome.
- A Lead now means a Contact with canonical inbound Message/Interaction evidence.
- The Contacts page identifies reply-derived Leads separately from Contacts with no reply.
- The Relationships page now shows the 13 confirmed Right POCs; it no longer treats all 89 reply-derived Leads as Key Relationships.
- Right POC suitability and optional relationship-management metadata remain separate fields on the same Key Relationship record.
- The canonical email is displayed directly. All 4,022 SQL email values passed non-identifying shape checks; vendor provenance was not present in SQL and is not fabricated in the UI.
- Contact details return the same response semantics as Contact lists.

### Campaigns

- Campaign Contact lists are now genuinely scoped through Campaign Accounts and Contacts.
- Campaign Company lists are now genuinely campaign-scoped.
- Campaign company, POC, response, and responding-company metrics are calculated from canonical SQL relationships instead of payload zeros.
- Deleted/archived People no longer inflate visible POC counts.
- All eight active campaign counters were recalculated and stored.

### Email and reply handling

- IMAP replies now reuse referenced threads where possible.
- New inbound Conversations save Campaign Contact and Campaign context.
- Sender participants and immutable endpoint snapshots are saved.
- Duplicate IMAP messages now repair missing context instead of being silently skipped.
- Resend inbound sync now saves Person, Campaign, participant, Review Item, and review Task context.
- Inbox views fall back to Conversation Participants when no Campaign Contact exists.
- Inbox lists and full threads now show Campaign context, Lead/response status, and Right POC status separately.
- Full inbox history now uses the field expected by the thread viewer and loads the complete Conversation on selection.
- All 23 previously orphaned runtime replies were recovered through the configured IMAP mailboxes.

Eight migrated historical emails have valid Person Participants but no recoverable campaign mapping in their source records. They are fully visible on Person/inbox timelines and are not assigned to a campaign by guesswork.

### Ongoing Jobs

- Restored 14 monetary values from immutable migration staging.
- Restored Opportunity context including lifecycle, ownership, six source primary contacts, two campaign links, source deletion state, dates, notes, events, and activity history.
- Operational lists now exclude the 229 historical Mongo Jobs and two source-deleted test Opportunities.
- Job lists calculate real Task, stakeholder, and collaborator counts.
- Job detail returns its primary and additional Contacts.
- Job editing now persists Contacts, collaborators, next action, and event name.
- Job timelines now include creation, activity history, Tasks, and Job Events instead of returning an empty array.
- PostgreSQL numeric values are converted to JavaScript numbers at the API boundary, and UI totals defensively coerce them before summing. Job totals no longer concatenate numeric strings.

## Data-repair backups

- `server/backups/sql-repair/opportunity-values-before-2026-08-05T13-40-05.493Z.json`
- `server/backups/sql-repair/opportunity-context-before-2026-08-05T13-48-16.358Z.json`
- `server/backups/sql-repair/runtime-reply-tasks-before-2026-08-05T13-55-09.584Z.json`

The immutable migration source documents, entity mappings, and per-record audit events remain available in PostgreSQL.

## Verification

- All modified server files pass `node --check`.
- The Vite production frontend build succeeds.
- The final live service verification returns 3,079 active Contacts, 89 reply-derived Leads, 13 confirmed Right POCs/Key Relationships, 14 operational Jobs, 14 numeric non-zero values, AED 1,257,730 total, working Job contacts, populated Job timelines, and full inbox history with Campaign context where the source relationship exists.
- The server test suite produced 38 passes and 3 intentional skips. One legacy Data Blender test could not connect to live PostgreSQL under the local sandbox; it was not rerun with live write access because that test performs ingestion and could mutate production data.

## Operational acceptance checks

After the repaired server/client are running, verify in the UI:

1. Contacts show canonical emails, Contact/Lead type, response badges, and Right POC status as separate columns.
2. Relationships shows 13 confirmed Right POCs/Key Relationships, subject to any selected filters.
3. A reply makes a Contact a Lead; it does not make that person a Key Relationship unless Right POC is Confirmed.
4. Inbox threads show Contact, company, Campaign, Lead/response, and Right POC context; direct emails are explicitly labelled `Direct / no campaign`.
5. Campaign pages show only their own Companies and Contacts and use calculated counts.
6. Ongoing Jobs shows 14 active records with a numerically summed total value of AED 1,257,730.
7. Opening a Job returns Contacts where the Mongo source recorded them and displays a non-empty timeline.

ERP work should begin only after these UI acceptance checks pass in the deployed/runtime environment.

## Dashboard alignment

The daily working dashboard now uses the same canonical definitions as the repaired CRM:

- `Lead` means a Contact with inbound reply evidence. The dashboard returns all 89 reply-derived Leads and prioritizes unreviewed replies, overdue Tasks, and recent responses.
- `Key Relationship` means a confirmed Right POC. The dashboard returns all 13 confirmed Right POCs, including follow-up urgency, owner, last interaction, and the next linked Task where available.
- The dashboard working queues are mutually exclusive: confirmed Right POCs appear only under Key Relationships. The eight confirmed Right POCs who have replied are therefore excluded from the Leads dashboard queue, while remaining Leads still retain their underlying reply evidence.
- Active Ongoing Jobs use their actual owner, value, deadline, and individually linked next Task. Closed/lost Jobs are excluded from the daily working queue.
- Campaign names come from the reply Conversation. Replies without recoverable Campaign context are labelled `Direct / no campaign` and are not assigned by inference.

## Contact and company timeline text audit

A repeatable read-only audit is available at `server/scripts/auditTimelineTextReadOnly.js`.

- Scanned 1,891 canonical Messages, seven manual Interactions, 199 Tasks, 3,079 active Contacts, and 1,172 active Companies.
- The stored SQL fields contain no BSON/ObjectId wrapper text. Display normalization now leaves zero HTML-tag leakage, object text, or mojibake across 3,988 audited timeline text fields.
- MIME envelope headers and quoted-printable payloads are converted into readable plain text before display.
- Formatted HTML from 1,746 Messages is now supplied to the existing formatted-email viewer; plain-text fallback remains available.
- The 122 Messages whose Mongo source contains neither text nor HTML are explicitly labelled as unrecoverable rather than receiving invented content.
- Reply-review Tasks no longer repeat raw email/MIME bodies in the timeline. They display a concise review instruction and their real due date.
- Contact-created events use the stored Contact creation timestamp. Campaign enrollment events are generated only from actual Campaign Contact relationships.
- Company timelines now resolve Messages through either Campaign Account linkage or the Company’s Contact participants. This restores two Companies missed by the old campaign-only query.
- Sender, recipient, exact Campaign context, delivery state, response intent, and review status are carried as structured Message metadata where present.
