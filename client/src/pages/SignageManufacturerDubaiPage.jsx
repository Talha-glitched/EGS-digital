import pageStyles from '../styles/pages/content-first.css?raw';
import minimalServiceResponsiveStyles from '../styles/pages/minimal-service-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import { images } from './siteData.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const signageFaqs = [
  [
    'What types of signage does EGS fabricate in Dubai?',
    'We manufacture 3D LED illuminated channel letters, reception logo signs, outdoor building roof signs, wayfinding directional systems, stainless steel plaques, and neon LED feature signs.',
  ],
  [
    'Do you handle Dubai Municipality and Civil Defence signage permits?',
    'Yes. We prepare the complete engineering drawings, structural stability certificates, and electrical compliance packages required for Dubai Municipality approvals for exterior commercial signage.',
  ],
  [
    'How do you ensure longevity in the UAE climate?',
    'For exterior signage, we use marine-grade stainless steel (316), UV-stabilized acrylics, weather-sealed IP67 LED modules, and electrostatic powder coating formulated to withstand extreme heat and sand exposure.',
  ],
];

export default function SignageManufacturerDubaiPage() {
  usePageLifecycle('Signage Manufacturer Dubai | Corporate Signage & 3D Letters | EGS', {
    revealSelector: '.signage-page .reveal',
    description: 'Premier signage manufacturer in Dubai. 3D illuminated letters, corporate reception signs, building wayfinding, and outdoor commercial signs across the UAE.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/FAK-Properties1.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Signage Manufacturer Dubai',
        description: 'Design, in-house fabrication, municipal permitting, and installation of corporate interior and exterior commercial signage in Dubai and the UAE.',
        serviceType: 'Signage Manufacturer',
        url: '/signage-manufacturer-dubai',
      },
      faqs: signageFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Commercial Fitouts', url: '/fitouts' },
        { name: 'Signage Manufacturer Dubai', url: '/signage-manufacturer-dubai' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{minimalServiceResponsiveStyles}</style>
      <div className="content-page minimal-service-page signage-page" style={{ '--accent': 'var(--clay)' }}>
        <Navbar active="fitouts" overlay />

        <section className="minimal-service-hero" aria-label="Signage Manufacturer Dubai Hero">
          <img
            className="minimal-service-hero-media"
            src={images.fitoutInteriorSignage}
            alt="Corporate reception signage and 3D letters fabricated in Dubai"
          />
          <div className="minimal-service-hero-shade" aria-hidden="true" />
          <div className="minimal-service-hero-copy">
            <span className="minimal-service-kicker">Direct Signage Fabrication &amp; Permitting</span>
            <h1>Signage Manufacturer in Dubai — 3D Illuminated Letters &amp; Corporate Signage</h1>
            <p>
              Elevate your corporate headquarters, showroom, or retail store with precision-engineered architectural signage. In-house metalwork, laser-cut acrylics, and full Dubai Municipality permit handling.
            </p>
            <div className="minimal-service-actions">
              <InquiryCtaButton inquiryType="fitouts" className="btn btn-primary">
                Request Signage Estimate →
              </InquiryCtaButton>
              <a href="/fitouts" className="btn btn-ghost">
                View Fitout Services
              </a>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--clay)' }} />Fabrication Quality</span>
              <h2>Architectural Signage Capabilities Across Dubai &amp; Sharjah</h2>
              <p>
                Engineered for indoor luxury presentation and extreme outdoor weather resistance.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Signage Type 01</small>
                <h3>3D LED Illuminated Channel Letters</h3>
                <p>Front-lit, halo-backlit, and edge-lit dimensional lettering using IP67 Samsung LEDs with high luminosity and 50,000+ hour operational lifespan.</p>
              </article>
              <article className="cap-card">
                <small>Signage Type 02</small>
                <h3>Corporate Reception &amp; Lobby Signs</h3>
                <p>Brushed stainless steel, bronze PVD finishes, frosted acrylic backer panels, and floating dimensional corporate logos.</p>
              </article>
              <article className="cap-card">
                <small>Signage Type 03</small>
                <h3>Wayfinding &amp; Directional Systems</h3>
                <p>ADA-compliant architectural directory boards, suspended ceiling indicators, and modular office door signage.</p>
              </article>
              <article className="cap-card">
                <small>Signage Type 04</small>
                <h3>Building Fascias &amp; Rooftop Pylons</h3>
                <p>Heavy-duty structural aluminum pylons and outdoor building signs engineered with certified wind-load calculations.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Signage Manufacturing FAQs</h2>
            </div>
            <FAQSection faqs={signageFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Need Professional Corporate Signage in the UAE?</h2>
              <p>Send your vector logo and site dimensions. Our technical team will provide material samples and visual photomontages.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="fitouts" className="btn btn-primary">
                Get Signage Quote →
              </InquiryCtaButton>
              <a href="https://wa.me/971524587992" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                WhatsApp Our Signage Team
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
