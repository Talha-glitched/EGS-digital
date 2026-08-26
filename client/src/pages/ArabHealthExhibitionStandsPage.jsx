import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
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
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
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
      <div className="content-page exhibitions-page arabhealth-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        <section className="exhibitions-hero" aria-label="Arab Health Exhibition Stand Contractor Hero">
          <img
            className="exhibitions-hero-media"
            src={images.phillips1}
            alt="Arab Health custom medical exhibition booth by EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Arab Health &amp; Medlab Middle East (DWTC)</span>
            <h1>Arab Health Exhibition Stand Contractor in Dubai — Healthcare &amp; Medical Booths</h1>
            <p>
              Architectural excellence for the region’s premier healthcare gathering. We engineer clinical-grade medical exhibition stands, heavy diagnostic equipment platforms, and confidential hospital consultation suites.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Inquire for Arab Health Stand →
              </InquiryCtaButton>
              <a href="/case-studies#philips-global-health-riyadh" className="btn btn-ghost">
                Read Philips Healthcare Proof
              </a>
            </div>
          </div>
        </section>

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
