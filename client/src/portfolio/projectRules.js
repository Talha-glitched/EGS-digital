/**
 * Known project overrides — first matching rule wins.
 * Add new entries here instead of extending resolver conditionals.
 */
export const PROJECT_RULES = [
  {
    match: ({ nameLower }) =>
      (nameLower.includes('philips') || nameLower.includes('phillips')) && nameLower.includes('meydan'),
    result: {
      name: 'Philips Meydan Event',
      location: 'Meydan, Dubai',
      groupKey: 'philips-meydan',
    },
  },
  {
    match: ({ nameLower }) =>
      (nameLower.includes('philips') || nameLower.includes('phillips')) && nameLower.includes('pairs'),
    result: {
      name: 'Philips Paris',
      groupKey: 'philips-paris',
    },
  },
  {
    match: ({ nameLower }) =>
      (nameLower.includes('philips') || nameLower.includes('phillips')) && nameLower.includes('arab health'),
    result: {
      name: 'Philips Arab Health',
      location: 'DWTC, Dubai',
      groupKey: 'philips-arab-health',
    },
  },
  {
    match: ({ nameLower }) =>
      (nameLower.includes('philips') || nameLower.includes('phillips')) && nameLower.includes('mri'),
    result: {
      name: 'Philips MRI Room',
      groupKey: 'philips-mri',
    },
  },
  {
    match: ({ nameLower }) => nameLower.includes('philips') || nameLower.includes('phillips'),
    result: {
      name: 'Philips Stand',
      groupKey: 'philips-stand',
    },
  },
  {
    match: ({ nameLower }) => nameLower.includes('velocity'),
    result: { name: 'Velocity Showroom', year: 2025, groupKey: 'velocity-showroom' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('uniestate') || nameLower.includes('uni estate'),
    result: { name: 'Uniestate Office', year: 2024, groupKey: 'uniestate-office' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('big fm') || nameLower.includes('bigfm'),
    result: { name: 'BIG FM Office', year: 2023, groupKey: 'bigfm-office' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('coop') || nameLower.includes('co-op'),
    result: { name: 'Union Coop Supermarket', year: 2016, groupKey: 'union-coop' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('geant') || nameLower.includes('géant'),
    result: { name: 'Géant Hypermarket', year: 2016, groupKey: 'geant-hypermarket' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('carrefour'),
    result: { name: 'Carrefour Rollout', year: 2023, groupKey: 'carrefour-rollout' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('sadia'),
    result: { name: 'Sadia Brand Display', year: 2023, groupKey: 'sadia-display' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('dunkin'),
    result: { name: 'Dunkin\' Kiosk', year: 2024, groupKey: 'dunkin-kiosk' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('bubble tea'),
    result: { name: 'Bubble Tea Kiosk', year: 2023, groupKey: 'bubble-tea-kiosk' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('crepe'),
    result: { name: 'Crepe & Go Kiosk', year: 2023, groupKey: 'crepe-go-kiosk' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('galadari'),
    result: {
      name: 'Galadari Kiosk',
      year: 2025,
      location: 'Dubai Mall, UAE',
      groupKey: 'galadari-kiosk',
    },
  },
  {
    match: ({ nameLower }) => nameLower.includes('vitro'),
    result: { name: 'Vitro Printing', groupKey: 'vitro-printing' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('emi cool') || nameLower.includes('emicool'),
    result: { name: 'Emicool Showroom', groupKey: 'emicool-showroom' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('fosroc'),
    result: { name: 'Fosroc Stand', groupKey: 'fosroc-stand' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('buser'),
    result: { name: 'Buser Stand', groupKey: 'buser-stand' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('cares'),
    result: { name: 'Cares Stand', groupKey: 'cares-stand' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('fakhruddin'),
    result: { name: 'Fakhruddin Office', groupKey: 'fakhruddin-office' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('hum yum'),
    result: {
      name: 'Hum Yum Dubai Mall',
      location: 'Dubai Mall, UAE',
      groupKey: 'hum-yum',
    },
  },
  {
    match: ({ nameLower }) => nameLower.includes('van spark'),
    result: { name: 'Van Spark Branding', groupKey: 'van-spark' },
  },
  {
    match: ({ nameLower, categoryKey }) =>
      (nameLower.includes('hct') || nameLower.includes('helsinki')) &&
      categoryKey === 'corporate-events-branding',
    result: {
      name: 'HCT Annual Conference Branding',
      year: 2018,
      groupKey: 'hct-annual-conference',
    },
  },
  {
    match: ({ nameLower }) => nameLower.includes('hct') || nameLower.includes('helsinki'),
    result: { name: 'HCT Showcase', groupKey: 'hct-showcase' },
  },
  {
    match: ({ nameLower }) =>
      nameLower.includes('abbott') ||
      nameLower.includes('abott') ||
      nameLower.includes('whatsapp image 2020-11-12'),
    result: {
      name: 'Abbott Activation',
      year: 2020,
      groupKey: 'abbott-activation',
      category: 'retail-branding-displays',
    },
  },
  {
    match: ({ nameLower }) => nameLower.includes('20170103'),
    result: { name: 'HCT Faculty Event', year: 2017, groupKey: 'hct-faculty-event' },
  },
  {
    match: ({ nameLower }) => nameLower.includes('20170129') || nameLower.includes('20170131'),
    result: {
      name: 'Philips Connected Care Event',
      year: 2017,
      groupKey: 'philips-connected-care-2017',
    },
  },
];
