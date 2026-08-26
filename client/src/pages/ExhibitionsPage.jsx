import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import stickyShowcaseResponsiveStyles from '../styles/pages/sticky-showcase-responsive.css?raw';
import StickyProcessShowcase from '../components/StickyProcessShowcase.jsx';
import { Navbar } from '../components/Navbar.jsx';
import ExhibitionsAdaptationSection from '../components/exhibitions/ExhibitionsAdaptationSection.jsx';
import ExhibitionsCTASection from '../components/exhibitions/ExhibitionsCTASection.jsx';
import ExhibitionsFAQSection from '../components/exhibitions/ExhibitionsFAQSection.jsx';
import ExhibitionsHeroSection from '../components/exhibitions/ExhibitionsHeroSection.jsx';
import ExhibitionsProcessSection from '../components/exhibitions/ExhibitionsProcessSection.jsx';
import ExhibitionsScopeSection from '../components/exhibitions/ExhibitionsScopeSection.jsx';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Footer } from './SiteChrome.jsx';
import ausCaaStand from '../assets/Exhibition Stands/AUS-CAA.jpeg';
import hctStand from '../assets/Exhibition Stands/HCT1.jpeg';
import healthtechStand from '../assets/Exhibition Stands/healthtech.jpg';
import kazakhstanPavilion from '../assets/Exhibition Stands/Kazakhstan_Pavillion.jpeg';
import { getProjectCta } from '../utils/contactInquiry.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const exhibitionsCta = getProjectCta('exhibitions');

const exhibitionsShowcaseSteps = [
  {
    label: 'Global Health Exhibition',
    image: healthtechStand,
    alt: 'Healthcare exhibition stand with illuminated branded walls and product displays',
  },
  {
    label: 'HCT Exhibition Stand',
    image: hctStand,
    alt: 'HCT exhibition stand with digital screens and branded counters',
  },
  {
    label: 'Gulfood Kazakhstan',
    image: kazakhstanPavilion,
    alt: 'Kazakhstan pavilion exhibition stand with curved overhead signage',
  },
  {
    label: 'AUS-CAAD Exhibition',
    image: ausCaaStand,
    alt: 'AUS and CAA exhibition stand with branded meeting counters',
  },
];

const exhibitionsRevealSelector = [
  '.exhibitions-page .exhibitions-kicker',
  '.exhibitions-page .exhibitions-hero-copy h1',
  '.exhibitions-page .exhibitions-hero-copy p',
  '.exhibitions-page .exhibitions-hero-actions .btn',
  '.exhibitions-page .egs-sticky-showcase-label',
  '.exhibitions-page .section-head h2',
  '.exhibitions-page .section-head p',
  '.exhibitions-page .cap-card',
  '.exhibitions-page .step',
  '.exhibitions-page .exhibitions-adaptation-copy > *',
  '.exhibitions-page .exhibitions-adaptation-image',
  '.exhibitions-page .faq-item',
  '.exhibitions-page .section-band > .container > .btn',
  '.exhibitions-page .footer-grid > *',
  '.exhibitions-page .footer-big',
  '.exhibitions-page .footer-bottom',
].join(', ');

const exhibitionsFaqs = [
  [
    'What should an exhibition manager send first?',
    'Send the show name, stand size, hall, open sides, floorplan, deadline, product list, storage needs, brand files, and any organiser rules. EGS can then price the real scope instead of guessing.',
  ],
  [
    'How does EGS keep exhibition stand pricing transparent?',
    'We separate the stand scope, materials, production requirements, installation windows, and change requests clearly, so marketing and procurement teams know what is included and what may affect cost.',
  ],
  [
    'Can EGS advise us if the design or budget is unrealistic?',
    'Yes. Ethical delivery means saying what will work, what needs adjustment, and what could create risk on site before the team commits to production.',
  ],
  [
    'Can EGS handle last-minute changes before opening day?',
    'Yes, when the change is physically possible, safe, and allowed by the venue schedule. Philips Global Health Riyadh and Kazakhstan Pavilion are examples of late adaptation under pressure.',
  ],
  [
    'How does EGS coordinate the stand before and during the exhibition?',
    'Design, approvals, fabrication, transport, installation, on-site fixes, and handover stay connected through one team, so the stand is ready for visitors and the client is not chasing disconnected suppliers.',
  ],
];

export default function ExhibitionsPage() {
  usePageLifecycle('Custom Exhibition Stand Contractor Dubai | Design & Build | EGS', {
    revealSelector: exhibitionsRevealSelector,
    description: 'Premier exhibition stand contractor in Dubai & Riyadh. In-house custom booth design, CNC joinery fabrication, and turnkey installation at DWTC & ADNEC.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Custom Exhibition Stand Design and Fabrication Contractor',
        description: 'Turnkey custom exhibition stands, booth fabrication, joinery, and on-site management at DWTC, ADNEC, and Riyadh.',
        serviceType: 'Exhibition Stand Contractor',
        url: '/exhibitions',
      },
      faqs: exhibitionsFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibition Stands', url: '/exhibitions' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <style>{stickyShowcaseResponsiveStyles}</style>
      <div className="content-page exhibitions-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" cta={exhibitionsCta.label} ctaInquiryType={exhibitionsCta.inquiryType} overlay />
        <ExhibitionsHeroSection />
        <StickyProcessShowcase
          steps={exhibitionsShowcaseSteps}
          showPortfolio={false}
          ariaLabel="Exhibition stand proof and process"
        />
        <ExhibitionsScopeSection />
        <ExhibitionsProcessSection />
        <ExhibitionsAdaptationSection />
        <ExhibitionsFAQSection />
        <ExhibitionsCTASection />
        <Footer />
      </div>
    </>
  );
}
