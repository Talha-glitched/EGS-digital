export const CAMPAIGN_AUTOMATION = {
  stage:
    'Automatic by default — Active Planning until outreach starts, then Active Campaigning when emails are queued or sent. Pick a stage manually to override; use “Use automatic stage” to resume. Completed and Archived are manual only.',
  companiesFound:
    'Count of target companies linked to this campaign through exhibitor imports, uploads, or manual company adds.',
  companiesReached:
    'Automated — unique companies where at least one contact received outbound email. Updates when the send worker dispatches sequence messages.',
  pocsFound:
    'Automated — total contacts in the campaign database from imports (Apollo, Hunter, Lusha) and manual entry.',
  pocsEmailed:
    'Automated — contacts with at least one outbound email sent via SMTP sequences. Updates when the send worker marks delivery.',
  pocsResponded:
    'Automated — contacts who replied to outreach. Detected via IMAP inbox sync matching inbound replies to sent threads.',
  inQueue:
    'Automated — active sequence enrollments waiting for the next send step. Pulled live from the outreach queue.',
  emailStatus:
    'Automated — tracks outbound sends (SMTP worker) and inbound replies (IMAP inbox listener). Moves from Pending to Emailed to Replied when a match is found.',
  pocFit:
    'Manual — qualification set by your team when verifying whether this person is the right point of contact.',
  companiesReplied:
    'Automated — unique target companies where someone responded. Synced from reply detection across all contacts at that company.',
  discoveryRate:
    'Automated — percentage of target companies with at least one contact discovered. Recalculated when imports complete.',
  replyRate:
    'Automated — share of target companies with a detected reply. Driven by IMAP inbox sync and contact delivery status.',
  pocReplyRate:
    'Automated — share of emailed contacts who replied. Calculated as POCs responded ÷ POCs emailed.',
  responseStatus:
    'Automated — whether this company or contact has responded on any channel: email replies (IMAP inbox sync), LinkedIn, phone, WhatsApp, or inbound interactions your team logs. Company status reflects any contact at that company in this campaign. Synced to contact and company timelines.',
  vendorSources:
    'Automated — performance breakdown by discovery source (Apollo, Hunter, Lusha, Manual). Available immediately for every campaign; metrics update when contacts are imported or outreach activity occurs.',
};

export const TIMELINE_AUTOMATION = {
  hint:
    'Automated — sequence sends, inbound replies (IMAP inbox sync), LinkedIn/phone/WhatsApp responses, deal stage changes, and profile updates appear here automatically. Manual — calls, meetings, and notes your team logs with “Log interaction” (editable). Contact and company timelines stay in sync for the same events. The feed refreshes while this view is open.',
};
