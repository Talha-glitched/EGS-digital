export const RELATIONSHIP_STATUS_OPTIONS = [
  {
    value: 'New',
    label: 'Newly qualified',
    description: 'Recently identified as a relevant POC and still being understood.',
    tone: 'neutral',
  },
  {
    value: 'Active',
    label: 'Active relationship',
    description: 'There is current momentum, regular interaction, or an active commercial thread.',
    tone: 'success',
  },
  {
    value: 'Nurture',
    label: 'Warm nurture',
    description: 'Good contact, but timing is not immediate. Keep the relationship warm.',
    tone: 'info',
  },
  {
    value: 'Later',
    label: 'Follow up later',
    description: 'The contact is relevant, but the next meaningful touch should happen later.',
    tone: 'warning',
  },
  {
    value: 'Dormant',
    label: 'Dormant',
    description: 'Still relevant historically, but not worth active effort right now.',
    tone: 'danger',
  },
];

export const SERVICE_CATEGORY_OPTIONS = [
  'Exhibition Stands',
  'Event Production',
  'Graduation Ceremonies',
  'Retail Branding',
  'Mall Activations',
  'Kiosks & Pop-ups',
  'Office Fit-outs',
  'Signage & Wayfinding',
  'POSM & Displays',
];

export function getRelationshipOption(status) {
  return RELATIONSHIP_STATUS_OPTIONS.find((item) => item.value === status) || RELATIONSHIP_STATUS_OPTIONS[0];
}
