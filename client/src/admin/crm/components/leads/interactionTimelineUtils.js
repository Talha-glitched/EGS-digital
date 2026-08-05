import {
  INTERACTION_DIRECTION_LABELS,
  INTERACTION_TYPE_LABELS,
  INTERACTION_OUTCOME_LABELS,
} from '../../constants/interactionTypes.js';

const TEAM_ACTORS = new Set(['Sequence', 'System', 'Team']);

function isTeamActor(actor) {
  if (!actor) return true;
  if (TEAM_ACTORS.has(actor)) return true;
  return actor.toLowerCase() === 'admin' || actor.toLowerCase().includes('egs');
}

export function resolveInteractionDirection(event) {
  const meta = event?.meta || {};
  if (meta.direction) return meta.direction;
  if (event.type === 'email_outbound') return 'outbound';
  if (event.type === 'email_inbound') return 'inbound';
  if (event.type === 'note' || event.channel === 'crm' && event.type === 'status') return 'internal';
  if (event.contactName && event.actor === event.contactName) return 'inbound';
  if (event.actor && !isTeamActor(event.actor) && event.actor !== event.contactName) return 'outbound';
  if (['Sequence', 'System'].includes(event.actor)) return 'outbound';
  return 'outbound';
}

export function resolveInteractionParties(event, direction) {
  const contact = event.contactName?.trim() || 'Contact';
  const meta = event?.meta || {};
  const targetEmail = meta.to || meta.recipientEmail || meta.confirmedEmail || '';
  const fromEmail = meta.from || '';

  const contactWithEmail = targetEmail ? `${contact} <${targetEmail}>` : contact;
  const fromContactWithEmail = fromEmail ? `${contact} <${fromEmail}>` : contact;

  const actor = event.actor?.trim() || 'EGS Team';
  const teamLabel = isTeamActor(actor) ? (actor === 'admin' ? 'EGS Team' : actor) : actor;

  if (direction === 'inbound') {
    return { from: fromContactWithEmail, to: teamLabel };
  }
  if (direction === 'internal') {
    return { from: teamLabel, to: contactWithEmail, internal: true };
  }
  return { from: teamLabel, to: contactWithEmail };
}

export function resolveInteractionTypeLabel(event) {
  const meta = event?.meta || {};
  if (meta.typeLabel) return meta.typeLabel;
  if (INTERACTION_TYPE_LABELS[event.type]) return INTERACTION_TYPE_LABELS[event.type];
  if (event.type === 'email_outbound' || event.type === 'email_inbound') return 'Email';
  if (event.type === 'call' || event.type === 'phone_call') return 'Phone call';
  if (event.channel === 'email') return 'Email';
  return event.title || 'Interaction';
}

export function resolveDirectionLabel(direction, event) {
  const meta = event?.meta || {};
  if (meta.directionLabel) return meta.directionLabel;
  return INTERACTION_DIRECTION_LABELS[direction] || 'Logged';
}

export function resolveOutcomeLabel(event) {
  const meta = event?.meta || {};
  if (meta.outcomeLabel) return meta.outcomeLabel;
  if (meta.outcome) return INTERACTION_OUTCOME_LABELS[meta.outcome] || meta.outcome;
  return '';
}

export function resolveInteractionBody(event) {
  const meta = event?.meta || {};
  if (meta.summary) return meta.summary;
  if ((event?.channel === 'email' || event?.type?.startsWith('email')) && meta.body) return meta.body;
  return event.detail || '';
}

export function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return '';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return '';
}

export function directionTone(direction) {
  if (direction === 'inbound') return 'inbound';
  if (direction === 'internal') return 'internal';
  return 'outbound';
}
