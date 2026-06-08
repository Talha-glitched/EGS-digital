import hctGraduationCard from '../assets/Graduation/ADGRAD1.jpg';
import hctFitout from '../assets/hct-fitout.jpeg';
import roastRetail from '../assets/roast-retail.jpeg';
import microlink from '../assets/Exhibition Stands/Microlink1.jpeg';
import phillips2 from '../assets/Exhibition Stands/Phillips_2.jpeg';
import philipsMri from '../assets/Exhibition Stands/Philips_MRI.jpg';
import fitoutVelocityInterior from '../assets/Existing Website Shortlist/5Showroom & Office Branding/Velocity (6).jpg';
import fitoutReceptionArea from '../assets/Uniestate/Uniestate Retail_1_8.jpeg';
import fitoutOfficeGraphics from '../assets/Existing Website Shortlist/5Showroom & Office Branding/BIG FM Printing (25).jpg';
import fitoutInteriorSignage from '../assets/Existing Website Shortlist/4Signage Indoor & Outdoor/ Indoor/20140807_103538.jpg';
import fitoutKiosk from '../assets/Galadari Motor Driving Centre Mall_1_2 (1).jpeg';
import retailHypermarketDisplay from '../assets/Existing Website Shortlist/10BTL Supermarket Hypermarket/2015-09-02 03.26.06.jpg';
import retailSadiaChiller from '../assets/Existing Website Shortlist/10BTL Supermarket Hypermarket/20160915_021559.jpg';
import retailSadiaBusDisplay from '../assets/Existing Website Shortlist/3Retail Branding & Displays/20160810_080238.jpg';
import retailMallActivation from '../assets/Existing Website Shortlist/9BTL Mall Installation/20210104_112707.jpg';
import retailCampaignGraphics from '../assets/Existing Website Shortlist/3Retail Branding & Displays/20170301_071537.jpg';

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
  fitoutVelocityInterior,
  fitoutReceptionArea,
  fitoutOfficeGraphics,
  fitoutInteriorSignage,
  fitoutKiosk,
  retailHypermarketDisplay,
  retailSadiaChiller,
  retailSadiaBusDisplay,
  retailMallActivation,
  retailCampaignGraphics,
  activation: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Velocity-3.jpg',
  microlink,
  phillips2,
  philipsMri,
};

export const services = [
  {
    href: '/exhibitions',
    label: '01',
    title: 'Exhibitions',
    copy: 'Custom exhibition stands for opening-day pressure, product changes, and venue realities.',
    image: images.microlink,
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
    copy: 'Full graduation ceremony production across the UAE for 4,500 graduates and 13,500 guests in 2025.',
  },
  {
    href: '/case-studies#hct-fujairah-stage-extension',
    tag: 'Urgent stage work',
    title: 'HCT Fujairah Stage Extension',
    stat: '10 hours',
    copy: 'Full Fujairah ceremony production plus a 5-6 metre stage extension requested 10 hours before showtime.',
  },
  {
    href: '/case-studies#sadia-carrefour-rollout',
    tag: 'Retail rollout',
    title: 'Sadia / Carrefour UAE',
    stat: '33 locations',
    copy: 'Full 33-location Carrefour rollout moved forward last minute and completed between midnight and before 6am.',
  },
  {
    href: '/case-studies#philips-global-health-riyadh',
    tag: 'Exhibitions',
    title: 'Philips / Global Health Riyadh',
    stat: '200 sqm',
    copy: 'Full 200 sqm healthcare stand delivery plus a 10-12 hour adaptation for an ultrasound display.',
  },
  {
    href: '/case-studies#kazakhstan-pavilion-gulfood',
    tag: 'Pavilion',
    title: 'Kazakhstan Pavilion / Gulfood',
    stat: '168 sqm',
    copy: 'Full 168 sqm pavilion production plus 5-6 branded product display chillers added before opening.',
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
