/** Central nav: add entries here to extend the admin shell. */
export const ADMIN_EMAIL_NAV = [
  { id: 'overview', label: 'Overview', blurb: 'System health and totals' },
  { id: 'inbox', label: 'Inbox', blurb: 'Synced replies' },
  { id: 'campaigns', label: 'Campaigns', blurb: 'Lists, delivery, imports' },
  { id: 'template', label: 'Template', blurb: 'Copy, preview, test send' },
  { id: 'suppressions', label: 'Suppressions', blurb: 'Unsubscribes and blocks' },
];

export const MERGE_FIELDS = [
  { token: '{{name}}', label: 'Name' },
  { token: '{{company}}', label: 'Company' },
  { token: '{{email}}', label: 'Email' },
];

export const PRESETS_STORAGE_KEY = 'egs_admin_email_presets_v1';
export const NAV_STORAGE_KEY = 'egs_admin_email_active_nav_v1';

export const DEFAULT_SUBJECT = 'Event and exhibition production support for {{company}}';
export const DEFAULT_BODY = `Hi {{name}},

I wanted to introduce Exhibit Graphic Sign. We support teams with exhibition stands, event and graduation production, retail branding, signage, and branded interiors across the UAE.

If {{company}} has an upcoming deadline, show, launch, or installation window, we can review the scope and help you understand what is practical to produce on time.

Best regards,
Exhibit Graphic Sign`;
