import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import EventHero from '../components/events/EventHero.jsx';
import { images } from './siteData.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const arabHealthFaqs = [
  [
    'What specialized requirements do healthcare exhibition stands have?',
    'Healthcare stands at Arab Health and Medlab often feature heavy medical diagnostic machinery requiring certified floor-loading reinforcement, clinical-grade lighting temperatures, sterile surface finishes, and confidential physician consultation rooms.',
  ],
  [
    'What experience does EGS have in medical exhibition stands?',
    'We regularly build custom healthcare stands for international medical leaders—including fabricating and adapting the 200 sqm Philips Healthcare stand at Global Health Exhibition with late-stage ultrasound equipment integration.',
  ],
];

export default function ArabHealthExhibitionStandsPage() {
  usePageLifecycle('Arab Health Exhibition Stand Contractor Dubai | DWTC Booths | EGS', {
    revealSelector: '.arabhealth-page .reveal',
    description: 'Custom healthcare exhibition stand contractor for Arab Health & Medlab at DWTC. Clinical-grade booth design, medical equipment displays, and turnkey build.',
    ogImage: images.phillips2,
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Arab Health Exhibition Stand Contractor Dubai',
        description: 'Healthcare and medical device custom exhibition booth design, heavy machinery reinforcement, and turnkey DWTC stand building for Arab Health & Medlab.',
        serviceType: 'Exhibition Stand Contractor Arab Health',
        url: '/events/arab-health-exhibition-stands',
      },
      faqs: arabHealthFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Arab Health Exhibition Stands', url: '/events/arab-health-exhibition-stands' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page arabhealth-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        <EventHero
          kicker="Arab Health & Medlab Middle East • DWTC Dubai"
          title="Arab Health Exhibition Stand Contractor in Dubai"
          subline="Architectural precision for the region’s premier healthcare summit. We engineer clinical-grade medical exhibition booths, heavy diagnostic machinery load plates, and confidential physician consultation suites."
          bgImage={images.phillips2}
          bgAlt="Arab Health custom medical exhibition booth by EGS"
          primaryCtaText="Inquire for Arab Health Stand →"
          secondaryCtaLink="/case-studies/philips-global-health-riyadh-healthcare-booth"
          secondaryCtaText="Read Philips Healthcare Proof"
          trustItems={[
            '15 Min from DWTC Halls',
            'Civil Defence & Venue Approvals',
            'Direct In-House Joinery & AV',
          ]}
          showcase={{
            badge: 'Featured Healthcare Build',
            image: images.philipsMri || images.phillips2,
            imageAlt: 'Philips Healthcare MRI exhibition stand at DWTC',
            title: 'Philips Healthcare Exhibition Pavilion',
            description: '200 sqm clinical booth featuring heavy MRI floor reinforcements, edge-lit display joinery, and private hospital director meeting suites.',
            specs: [
              { value: '200 SQM', label: 'Stand Area' },
              { value: 'DWTC', label: 'Venue' },
              { value: 'MRI & AV', label: 'Equipment' },
            ],
          }}
        />

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Healthcare Standards</span>
              <h2>Specialized Capabilities for Medical Exhibitors</h2>
              <p>
                Built to elevate medical innovation while satisfying strict venue floor-loading and clinical presentation standards.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Medical Feature 01</small>
                <h3>Diagnostic Equipment Reinforcement</h3>
                <p>Engineered sub-floor load distribution plates and recessed 3-phase electrical channels for MRI, CT, and ultrasound machines.</p>
              </article>
              <article className="cap-card">
                <small>Medical Feature 02</small>
                <h3>Physician &amp; Hospital Meeting Suites</h3>
                <p>Soundproofed VIP meeting rooms designed for confidential procurement discussions with hospital directors and health ministries.</p>
              </article>
              <article className="cap-card">
                <small>Medical Feature 03</small>
                <h3>Clinical-Grade Surface Finishes</h3>
                <p>Seamless satin-white laminates, edge-lit glass display cases, and medical-temperature lighting that highlights device precision.</p>
              </article>
              <article className="cap-card">
                <small>Medical Feature 04</small>
                <h3>Fast On-Site Adaptation</h3>
                <p>Proven agility to adapt joinery and electrical routing when medical demonstration units arrive late at the venue.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Arab Health Stand FAQs</h2>
            </div>
            <FAQSection faqs={arabHealthFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Exhibiting at Arab Health or Medlab at DWTC?</h2>
              <p>Contact our healthcare exhibition specialist team for 3D renderings and comprehensive turnkey proposals.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Request Arab Health Quote →
              </InquiryCtaButton>
              <a href="/exhibitions" className="btn btn-ghost">
                Back to Exhibitions
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
