/**
 * Known project overrides — first matching rule wins.
 * Add new entries here instead of extending resolver conditionals.
 */
export const PROJECT_RULES = [
  {
    // Rename Corporate event - January 2024 to Philips Arab Health
    match: ({ filename }) => filename.includes('20240128_081000'),
    result: {
      name: 'Philips Arab Health',
      year: 2024,
      groupKey: 'philips-arab-health',
      category: 'corporate-events-branding',
    },
  },
  {
    // Move the pictures from Philips Stand to Philips Meydan Event
    match: ({ filename }) => filename.includes('Philips (1)') || filename.includes('Philips (5)'),
    result: {
      name: 'Philips Meydan Event',
      location: 'Meydan, Dubai',
      groupKey: 'philips-meydan',
      category: 'corporate-events-branding',
      year: 2024,
    },
  },
  {
    // Rename Corporate event January 2023 to Philips KSA Branding,
    // and move the second image of Corporate event January 2020 (20200129_161955.jpg) to it.
    match: ({ filename }) =>
      filename.includes('20230130_000758') ||
      filename.includes('20230130_002807') ||
      filename.includes('20230130_002845') ||
      filename.includes('20200129_161955'),
    result: {
      name: 'Philips KSA Branding',
      year: 2023,
      groupKey: 'philips-ksa-branding',
      category: 'corporate-events-branding',
    },
  },
  {
    // Rename Corporate event January 2020 to Philips Live!,
    // and move pictures from corporate event 2018 (20180131_084228.jpg and IMG-20180129-WA0107.jpg) to it.
    match: ({ filename }) =>
      filename.includes('20200128_033520') ||
      filename.includes('20180131_084228') ||
      filename.includes('IMG-20180129-WA0107'),
    result: {
      name: 'Philips Live!',
      year: 2020,
      groupKey: 'philips-live',
      category: 'corporate-events-branding',
    },
  },
  {
    // Rename Corporate Event 2017 to Philips Avent
    match: ({ filename }) => filename.includes('20171005_022118') || filename.includes('20171005_033230'),
    result: {
      name: 'Philips Avent',
      year: 2017,
      groupKey: 'philips-avent',
      category: 'corporate-events-branding',
    },
  },
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
    match: ({ filename }) =>
      filename.includes('20170103') ||
      filename.includes('20180422_030925') ||
      filename.includes('20180508_130641'),
    result: {
      name: 'HCT Faculty Event',
      year: 2017,
      groupKey: 'hct-faculty-event',
      category: 'corporate-events-branding',
    },
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
