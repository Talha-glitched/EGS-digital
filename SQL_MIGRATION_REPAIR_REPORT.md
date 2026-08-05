# SQL Migration Repair Report

Date: 5 August 2026

## Outcome

The active CRM now reads its repaired operational data from PostgreSQL. The Mongo backup and `migration_source_document` remain the immutable evidence layer used to reconcile the migration.

## Reconciled areas

| Area | Result |
|---|---:|
| Active ongoing jobs visible in CRM | 16 |
| Deferred historical Job-source rows | 225 |
| Right POCs restored from source evidence | 13 |
| Manually confirmed Key Relationships | 1 |
| Campaign Accounts | 1,326 |
| Campaign Contacts | 4,040 |
| Company inbox contact methods | 123 |
| Sequence versions / steps | 6 / 7 |
| Sequence launches / enrollments | 6 / 1,756 |
| Send jobs | 1,787 |
| Canonical Mongo email messages | 1,868 |
| Preserved legacy email duplicates | 72 |
| Valid email source mappings | 1,940 |
| Conversation participants | 3,584 |
| Reply review items | 104 |
| Mongo tasks matched without duplication | 122 of 122 |
| Reply-review tasks linked to replies | 91 of 91 |
| Manual interactions restored | 7 of 7 |

## Intentional exception

Twenty-five historical sequence enrollments reference Lead IDs that are absent from the Mongo backup. Their enrollment, campaign, sequence, launch, and send-job evidence is retained. No Person or Campaign Contact was fabricated. They are held safely and recorded in `migration_exception` under `orphan_sequence_enrollment_identity` for optional human reconciliation.

## Safety decisions

- The 225 historical Job-source rows were not physically deleted. They are excluded from active CRM queries so the current operational count is 16 and the evidence remains recoverable.
- Migrated unfinished enrollments are frozen under a migration safety hold. Historical data cannot accidentally trigger outreach.
- The 72 email overlaps between `emails` and `replies` are retained as duplicate evidence but excluded from operational views.
- Existing SQL-only inbound messages were preserved.
- Empty legacy conversation shells were left in place; operational queries only use conversations containing visible messages.

## Repair scripts

Each JavaScript repair defaults to a rollback-only rehearsal. Add `--apply` only after its totals reconcile. Add `--schema` when its matching additive SQL file has not already been applied.

1. `server/scripts/restoreContactContextFromStaging.js`
2. `server/scripts/restoreCampaignContextFromStaging.js`
3. `server/scripts/restoreSequenceExecutionContextFromStaging.js`
4. `server/scripts/restoreEmailThreadsFromStaging.js`
5. `server/scripts/restoreWorkContextFromStaging.js`

The matching additive schema files are numbered `05` through `09` in `server/scripts`.

## Verification completed

- JavaScript syntax checks passed for all modified server files and repair scripts.
- Frontend production build passed.
- CRM safety unit tests passed: 10 of 10.
- Final PostgreSQL audit completed with no audit execution errors.
- Live read-only smoke tests passed for ongoing jobs, contacts, key relationships, sent email pagination, inbox threads, sequences, launches, tasks, and integrity counts.
- PostgreSQL reported zero idle-in-transaction sessions after repair.

## Next controlled step

Deploy the code changes to the application environment, then perform a browser acceptance pass using the checklist below:

- Open two active ongoing jobs.
- Open a Right POC and confirm contact details and POC status.
- Confirm Key Relationships shows only manually confirmed relationships.
- Open Sent Emails, filter by campaign, and open a conversation thread.
- Open Inbox and confirm contact, company, campaign, intent, and full history.
- Open Sequences and confirm enrollment totals and launch history.
- Open Tasks from an ongoing job, a contact, and a reply review.

