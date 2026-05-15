export const EGS_EMAIL = 'info@exhibitgraphicsign.com';

export const INQUIRY_TYPES = ['general', 'exhibitions', 'events', 'retail', 'fitouts'];

export const SERVICE_OPTIONS = [
  { value: 'general', label: 'General enquiry' },
  { value: 'exhibitions', label: 'Exhibition stand' },
  { value: 'events', label: 'Ceremony / event production' },
  { value: 'retail', label: 'Retail rollout' },
  { value: 'fitouts', label: 'Interior fitout' },
];

export const DEADLINE_OPTIONS = [
  { value: '', label: 'Select deadline…' },
  { value: 'within-2-weeks', label: 'Within 2 weeks' },
  { value: '2-4-weeks', label: '2–4 weeks' },
  { value: '1-2-months', label: '1–2 months' },
  { value: '2-plus-months', label: '2+ months' },
  { value: 'not-sure', label: 'Not sure yet' },
];

export const URGENCY_OPTIONS = [
  { value: '', label: 'Select urgency…' },
  { value: 'standard', label: 'Standard timeline' },
  { value: 'urgent', label: 'Urgent — deadline at risk' },
  { value: 'flexible', label: 'Flexible / exploring options' },
];

export const STAND_SIZE_OPTIONS = [
  { value: '', label: 'Select stand size…' },
  { value: 'under-20', label: 'Under 20 sqm' },
  { value: '20-50', label: '20–50 sqm' },
  { value: '50-100', label: '50–100 sqm' },
  { value: '100-plus', label: '100+ sqm' },
  { value: 'not-sure', label: 'Not sure yet' },
];

export const GUEST_SCALE_OPTIONS = [
  { value: '', label: 'Select scale…' },
  { value: 'under-500', label: 'Under 500 guests' },
  { value: '500-2000', label: '500–2,000' },
  { value: '2000-5000', label: '2,000–5,000' },
  { value: '5000-plus', label: '5,000+' },
  { value: 'not-sure', label: 'Not sure yet' },
];

export const LOCATION_COUNT_OPTIONS = [
  { value: '', label: 'Select count…' },
  { value: '1', label: '1 location' },
  { value: '2-10', label: '2–10 locations' },
  { value: '11-30', label: '11–30 locations' },
  { value: '31-plus', label: '31+ locations' },
  { value: 'not-sure', label: 'Not sure yet' },
];

export const SPACE_TYPE_OPTIONS = [
  { value: '', label: 'Select space type…' },
  { value: 'showroom', label: 'Showroom' },
  { value: 'reception', label: 'Reception' },
  { value: 'office', label: 'Office' },
  { value: 'retail-unit', label: 'Retail unit' },
  { value: 'other', label: 'Other' },
];

const CTA_LABELS = {
  general: 'Email EGS',
  exhibitions: 'Email about your stand',
  events: 'Email about your ceremony',
  retail: 'Email about your rollout',
  fitouts: 'Email about your fitout',
};

const SUBJECTS = {
  general: 'EGS project enquiry',
  exhibitions: 'Exhibition stand enquiry',
  events: 'Ceremony / event production enquiry',
  retail: 'Retail rollout enquiry',
  fitouts: 'Fitout enquiry',
};

function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label || value || '—';
}

function line(label, value) {
  const trimmed = String(value || '').trim();
  return `${label}: ${trimmed || '—'}`;
}

export function getProjectCta(type = 'general') {
  const inquiryType = INQUIRY_TYPES.includes(type) ? type : 'general';
  return {
    inquiryType,
    label: CTA_LABELS[inquiryType] || CTA_LABELS.general,
  };
}

export function createEmptyInquiryForm(service = 'general') {
  return {
    service: INQUIRY_TYPES.includes(service) ? service : 'general',
    name: '',
    company: '',
    email: '',
    phone: '',
    deadline: '',
    location: '',
    urgency: '',
    details: '',
    showName: '',
    standSize: '',
    buildDate: '',
    eventDate: '',
    venue: '',
    guestScale: '',
    locationCount: '',
    launchDate: '',
    spaceType: '',
    handoverDate: '',
  };
}

export function composeInquiryEmail(form) {
  const service = form.service || 'general';
  const subject = SUBJECTS[service] || SUBJECTS.general;

  const lines = [
    'Hi EGS team,',
    '',
    "I'd like to discuss a project. Details below:",
    '',
    line('Name', form.name),
    line('Company', form.company),
    line('Email', form.email),
    line('Phone / WhatsApp', form.phone),
    line('Service', labelFor(SERVICE_OPTIONS, service)),
    line('Deadline', labelFor(DEADLINE_OPTIONS, form.deadline)),
    line('Location / venue', form.location),
    line('Urgency', labelFor(URGENCY_OPTIONS, form.urgency)),
    line('What needs to be ready', form.details),
  ];

  if (service === 'exhibitions') {
    lines.push('', '— Exhibition stand —', line('Show / event', form.showName), line('Stand size', labelFor(STAND_SIZE_OPTIONS, form.standSize)), line('Build / opening date', form.buildDate));
  }

  if (service === 'events') {
    lines.push('', '— Ceremony / event —', line('Event date', form.eventDate), line('Venue', form.venue), line('Guest scale', labelFor(GUEST_SCALE_OPTIONS, form.guestScale)));
  }

  if (service === 'retail') {
    lines.push('', '— Retail rollout —', line('Number of locations', labelFor(LOCATION_COUNT_OPTIONS, form.locationCount)), line('Launch date', form.launchDate));
  }

  if (service === 'fitouts') {
    lines.push('', '— Fitout —', line('Space type', labelFor(SPACE_TYPE_OPTIONS, form.spaceType)), line('Handover target', form.handoverDate));
  }

  lines.push('', 'Attachments: (drawings, photos, plans — attach in your email client)', '', 'Thanks,');

  return { subject, body: lines.join('\n') };
}

/** Uses encodeURIComponent so spaces are %20, not + (which some clients show literally). */
export function buildInquiryMailto({ subject, body }) {
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${EGS_EMAIL}${params.length ? `?${params.join('&')}` : ''}`;
}

export function openInquiryMailto(form) {
  const { subject, body } = composeInquiryEmail(form);
  window.location.href = buildInquiryMailto({ subject, body });
}
