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

export const INTERACTION_TYPE_HINTS = {
  phone_call: 'Log a call attempt, conversation, or callback.',
  email: 'Manual email touch outside the sequence (or a reply summary).',
  meeting: 'In-person meeting, video call, or presentation.',
  whatsapp: 'WhatsApp thread summary or voice note follow-up.',
  linkedin: 'Connection request, InMail, or DM exchange.',
  site_visit: 'Booth visit, factory tour, or site inspection.',
  event: 'Conversation at GITEX, Arab Health, or another event.',
  referral: 'They pointed you to someone else on their team.',
  note: 'Internal summary, context, or next-step reminder.',
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

export const OUTCOMES_BY_TYPE = {
  phone_call: ['connected', 'no_answer', 'voicemail', 'left_message', 'scheduled_followup', 'interested', 'not_interested', 'other'],
  email: ['connected', 'interested', 'not_interested', 'scheduled_followup', 'other'],
  meeting: ['completed', 'scheduled_followup', 'interested', 'not_interested', 'cancelled', 'other'],
  whatsapp: ['connected', 'interested', 'not_interested', 'scheduled_followup', 'other'],
  linkedin: ['connected', 'interested', 'not_interested', 'scheduled_followup', 'other'],
  site_visit: ['completed', 'interested', 'scheduled_followup', 'other'],
  event: ['connected', 'interested', 'scheduled_followup', 'other'],
  referral: ['connected', 'other'],
  note: ['other'],
};

export function defaultTitleForType(type, direction = 'outbound') {
  const label = INTERACTION_TYPE_LABELS[type] || 'Interaction';
  if (direction === 'inbound') return `Inbound ${label.toLowerCase()}`;
  if (direction === 'internal') return label;
  return label;
}

export function emptyInteractionForm() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return {
    type: 'phone_call',
    direction: 'outbound',
    title: '',
    summary: '',
    occurredAt: now.toISOString().slice(0, 16),
    durationMinutes: '',
    outcome: '',
    location: '',
    attendees: '',
  };
}

export function interactionFormFromEvent(event) {
  const meta = event?.meta || {};
  const date = new Date(event.timestamp);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return {
    type: event.type || 'note',
    direction: meta.direction || 'outbound',
    title: event.title || '',
    summary: meta.summary || event.detail || '',
    occurredAt: date.toISOString().slice(0, 16),
    durationMinutes: meta.durationMinutes ?? '',
    outcome: meta.outcome || '',
    location: meta.location || '',
    attendees: meta.attendees || '',
  };
}
