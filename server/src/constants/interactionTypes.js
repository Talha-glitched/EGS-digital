export const INTERACTION_TYPES = [
  'phone_call',
  'email',
  'meeting',
  'whatsapp',
  'linkedin',
  'site_visit',
  'event',
  'referral',
  'note',
];

export const INTERACTION_DIRECTIONS = ['outbound', 'inbound', 'internal'];

export const INTERACTION_OUTCOMES = [
  'connected',
  'no_answer',
  'voicemail',
  'left_message',
  'scheduled_followup',
  'interested',
  'not_interested',
  'completed',
  'cancelled',
  'other',
];

export const INTERACTION_TYPE_LABELS = {
  phone_call: 'Phone call',
  email: 'Email',
  meeting: 'Meeting',
  whatsapp: 'WhatsApp / text',
  linkedin: 'LinkedIn',
  site_visit: 'Site visit',
  event: 'Event / trade show',
  referral: 'Referral handoff',
  note: 'Note / summary',
};

export const INTERACTION_DIRECTION_LABELS = {
  outbound: 'We reached out',
  inbound: 'They reached out',
  internal: 'Internal note',
};

export const INTERACTION_OUTCOME_LABELS = {
  connected: 'Connected',
  no_answer: 'No answer',
  voicemail: 'Voicemail',
  left_message: 'Left message',
  scheduled_followup: 'Follow-up scheduled',
  interested: 'Interested',
  not_interested: 'Not interested',
  completed: 'Completed',
  cancelled: 'Cancelled / no-show',
  other: 'Other',
};

export function defaultTitleForType(type, direction = 'outbound') {
  const label = INTERACTION_TYPE_LABELS[type] || 'Interaction';
  if (direction === 'inbound') return `Inbound ${label.toLowerCase()}`;
  if (direction === 'internal') return label;
  return label;
}
