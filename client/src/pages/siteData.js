import hctGraduationCard from '../assets/Graduation/ADGRAD1.jpg';
import hctFitout from '../assets/hct-fitout.jpeg';
import roastRetail from '../assets/roast-retail.jpeg';

const grayClientLogoModules = import.meta.glob('../assets/client_logos_gray/done/*.png', {
  eager: true,
  import: 'default',
});

export const clientLogos = Object.entries(grayClientLogoModules)
  .sort(([a], [b]) => Number(a.match(/\/(\d+)\.png$/)?.[1] ?? 0) - Number(b.match(/\/(\d+)\.png$/)?.[1] ?? 0))
  .map(([path, logo]) => {
    const id = path.match(/\/(\d+)\.png$/)?.[1];
    return { name: `Client logo ${id}`, logo };
  });

export const clientNames = clientLogos.map((client) => client.name);

export const images = {
  hctProfile: '/assets/egs-profile/hct-graduation-stats.jpg',
  graduationProfile: '/assets/egs-profile/event-management-01.jpg',
  graduationWide: '/assets/egs-profile/event-management-03.jpg',
  graduationStage: '/assets/egs-profile/event-management-04.jpg',
  hctGraduationCard,
  eventProfile: '/assets/egs-profile/event-management-02.jpg',
  hct: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg',
  philips: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
  philipsArab: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Arab-Health.jpg',
  fitout: hctFitout,
  retail: roastRetail,
  activation: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Velocity-3.jpg',
};

export const services = [
  {
    href: '/exhibitions',
    label: '01',
    title: 'Exhibitions',
    copy: 'Custom exhibition stands for opening-day pressure, product changes, and venue realities.',
    image: images.philips,
    accent: 'var(--ochre)',
  },
  {
    href: '/events',
    label: '02',
    title: 'Events / Graduations',
    copy: 'Ceremony and event production where the room has to be ready before people walk in.',
    image: images.hctProfile,
    accent: 'var(--terracotta)',
  },
  {
    href: '/retail',
    label: '03',
    title: 'Retail',
    copy: 'Retail branding rollouts across locations, access windows, and launch dates.',
    image: images.retail,
    accent: 'var(--claret)',
  },
  {
    href: '/fitouts',
    label: '04',
    title: 'Fitouts',
    copy: 'Branded interiors, signage, joinery, and spaces that still work after handover.',
    image: images.fitout,
    accent: 'var(--olive)',
  },
];

export const proofCards = [
  {
    href: '/case-studies#hct-graduation-program',
    tag: 'Graduations',
    title: 'HCT Graduation Program',
    stat: '7 ceremonies',
    copy: '4,500 graduates and 13,500 guests across the UAE in 2025.',
  },
  {
    href: '/case-studies#hct-fujairah-stage-extension',
    tag: 'Urgent stage work',
    title: 'HCT Fujairah Stage Extension',
    stat: '10 hours',
    copy: 'A 5-6 metre stage extension requested before ceremony at Zayed Sports Complex.',
  },
  {
    href: '/case-studies#sadia-carrefour-rollout',
    tag: 'Retail rollout',
    title: 'Sadia / Carrefour UAE',
    stat: '33 locations',
    copy: 'Carrefour hypermarket locations completed between midnight and before 6am.',
  },
  {
    href: '/case-studies#philips-global-health-riyadh',
    tag: 'Exhibitions',
    title: 'Philips / Global Health Riyadh',
    stat: '200 sqm',
    copy: 'Healthcare stand adapted in 10-12 hours for an ultrasound display.',
  },
  {
    href: '/case-studies#kazakhstan-pavilion-gulfood',
    tag: 'Pavilion',
    title: 'Kazakhstan Pavilion / Gulfood',
    stat: '168 sqm',
    copy: 'Pavilion adapted for 5-6 added branded product display chillers before opening.',
  },
  {
    href: '/case-studies#money-kicks-activation',
    tag: 'Mall activation',
    title: 'Money Kicks / Money Kickz',
    stat: 'Activation',
    copy: 'Mall activation work for the Dubai sneaker/lifestyle brand associated with Rashed Belhasa.',
  },
];

export const processSteps = [
  ['Brief', 'Send the service, deadline, venue or location, drawings/photos, and what needs to happen.'],
  ['Feasibility', 'EGS checks timing, access, materials, production risk, and what must move first.'],
  ['Plan', 'Agree the build direction, installation window, deliverables, and approvals needed.'],
  ['Produce', 'Fabrication, print, branding, sourcing, and crew planning move together.'],
  ['Install', 'Teams work around venue, mall, show, or handover constraints.'],
  ['Handover', 'The physical work is checked before opening, launch, or showtime.'],
];
