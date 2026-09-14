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
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Trade Show &amp; Venue Hubs</span>
              <h2>Specialized Hubs for Major UAE Exhibitions</h2>
              <p>Explore dedicated booth specifications, venue regulations, and contractor guidelines tailored for premier trade shows at DWTC, ADNEC, and DEC.</p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Healthcare &amp; Medlab</small>
                <h3><a href="/events/arab-health-exhibition-stands" style={{ color: 'inherit', textDecoration: 'none' }}>Arab Health Exhibition Stands →</a></h3>
                <p>Clinical-grade medical booth fabrication, diagnostic equipment load plates, and VIP consultation suites at DWTC.</p>
              </article>
              <article className="cap-card">
                <small>Technology &amp; SaaS</small>
                <h3><a href="/events/gitex-exhibition-stands" style={{ color: 'inherit', textDecoration: 'none' }}>GITEX Global Exhibition Stands →</a></h3>
                <p>High-resolution curved LED video walls, interactive software demo workstations, and high-footfall tech layouts.</p>
              </article>
              <article className="cap-card">
                <small>Food &amp; Beverage</small>
                <h3><a href="/events/gulfood-exhibition-stands" style={{ color: 'inherit', textDecoration: 'none' }}>Gulfood Stands &amp; Country Pavilions →</a></h3>
                <p>Live cooking stations, commercial refrigerated displays, hygiene-certified surfaces, and national export pavilions.</p>
              </article>
              <article className="cap-card">
                <small>Energy &amp; Industry</small>
                <h3><a href="/events/adipec-stand-contractor" style={{ color: 'inherit', textDecoration: 'none' }}>ADIPEC Stand Contractor Abu Dhabi →</a></h3>
                <p>ADNEC HSE approvals, heavy machinery sub-floor load plates, flame-retardant joinery, and executive meeting lounges.</p>
              </article>
              <article className="cap-card">
                <small>Building &amp; Construction</small>
                <h3><a href="/events/big-5-exhibition-stands" style={{ color: 'inherit', textDecoration: 'none' }}>The Big 5 Stand Builder Dubai →</a></h3>
                <p>Heavy building material display plinths, recessed utility ducting, double-decker VIP spaces, and structural joinery.</p>
              </article>
              <article className="cap-card">
                <small>Venue Authority Hubs</small>
                <h3>Official UAE Venue Builder Guides →</h3>
                <p>
                  Explore official contractor services for{' '}
                  <a href="/venues/dwtc-exhibition-stand-builder" style={{ textDecoration: 'underline' }}>DWTC Dubai</a>,{' '}
                  <a href="/venues/adnec-exhibition-stand-builder" style={{ textDecoration: 'underline' }}>ADNEC Abu Dhabi</a>, and{' '}
                  <a href="/venues/dubai-exhibition-centre-stand-builder" style={{ textDecoration: 'underline' }}>DEC Expo City</a>.
                </p>
              </article>
            </div>
          </div>
        </section>
        <ExhibitionsFAQSection />
        <ExhibitionsCTASection />
        <Footer />
      </div>
    </>
  );
}
