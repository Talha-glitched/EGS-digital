import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import healthtechStand from '../assets/Exhibition Stands/healthtech.jpg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const dwtcFaqs = [
  [
    'What is the maximum allowed stand height at Dubai World Trade Centre (DWTC)?',
    'At DWTC, standard single-storey custom exhibition stands are typically permitted up to 4.0 or 6.0 metres depending on the hall, while double-decker two-storey structures can reach up to 6.0 to 7.5 metres with formal structural engineering and Civil Defence approvals.',
  ],
  [
    'When must stand drawings be submitted for DWTC approval?',
    'Complex custom builds and double-decker stands must be submitted for DWTC structural and health & safety approval at least 4 to 6 weeks before move-in. Late submissions incur organizer penalty surcharges.',
  ],
  [
    'What fire safety requirements apply to stands at DWTC?',
    'All timber, fabrics, and plastics used in stand construction must be certified Class 1 fire-retardant. Stand contractors must provide valid material test certificates to DWTC Civil Defence inspectors on site.',
  ],
];

export default function DwtcStandGuidelinesPage() {
  usePageLifecycle('DWTC Exhibition Stand Guidelines & Regulations | Builder Guide | EGS', {
    revealSelector: '.dwtc-guide-page .reveal',
    description: 'Dubai World Trade Centre (DWTC) exhibition stand regulations guide. Maximum build heights, double-decker structural approvals, rigging permits, and safety rules.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'DWTC Exhibition Stand Guidelines and Regulations Guide',
        description: 'Comprehensive compliance and architectural regulatory manual for designing and building exhibition stands at Dubai World Trade Centre (DWTC).',
        serviceType: 'DWTC Guidelines Guide',
        url: '/guides/dwtc-stand-guidelines',
      },
      faqs: dwtcFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Guides', url: '/guides/exhibition-stand-cost-dubai' },
        { name: 'DWTC Stand Guidelines', url: '/guides/dwtc-stand-guidelines' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page exhibitions-page dwtc-guide-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        <section className="exhibitions-hero" aria-label="DWTC Stand Guidelines Hero">
          <img
            className="exhibitions-hero-media"
            src={healthtechStand}
            alt="Exhibition stand compliance and regulations at DWTC Dubai"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Venue Compliance &amp; Engineering Rules</span>
            <h1>DWTC Exhibition Stand Guidelines &amp; Height Regulations — The Builder’s Manual</h1>
            <p>
              Navigating Dubai World Trade Centre (DWTC) technical regulations. Learn critical height restrictions, double-decker certification steps, and Civil Defence requirements to ensure hassle-free venue approval.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Inquire for DWTC Approved Build →
              </InquiryCtaButton>
              <a href="/exhibition-stand-contractor-dubai" className="btn btn-ghost">
                DWTC Stand Contractor
              </a>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Compliance Checklist</span>
              <h2>Critical DWTC Stand Building Rules &amp; Deadlines</h2>
              <p>
                Ensure your stand passes technical inspection on first review with these vital regulatory standards.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Rule 01</small>
                <h3>Maximum Build Heights</h3>
                <p>Standard custom stands: up to 4m–6m (hall dependent). Perimeter walls facing adjacent exhibitors must be cleanly finished in plain neutral color with no exposed timber framing.</p>
              </article>
              <article className="cap-card">
                <small>Rule 02</small>
                <h3>Double-Decker Requirements</h3>
                <p>Mandatory stamped structural calculations from an approved UAE structural engineering consultant, dual staircases for upper decks over 50 sqm, and smoke detector placement.</p>
              </article>
              <article className="cap-card">
                <small>Rule 03</small>
                <h3>Ceiling Rigging &amp; Banners</h3>
                <p>All overhead hanging structures must be rigged exclusively by DWTC-approved rigging contractors with certified load-bearing hardware and rated steel wire ropes.</p>
              </article>
              <article className="cap-card">
                <small>Rule 04</small>
                <h3>Electrical Safety &amp; Earth Bonding</h3>
                <p>All metallic structures, trusses, and high-load AV installations must be properly earth-bonded with certified RCD circuit protection.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>DWTC Guidelines FAQs</h2>
            </div>
            <FAQSection faqs={dwtcFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Need a DWTC-Approved Stand Contractor to Manage Your Approvals?</h2>
              <p>EGS manages complete DWTC architectural submissions, Civil Defence filings, and on-site handovers.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Book DWTC Stand Consultation →
              </InquiryCtaButton>
              <a href="/exhibition-stand-builder-dubai" className="btn btn-ghost">
                Explore Stand Building
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
