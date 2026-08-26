import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import kazakhstanPavilion from '../assets/Exhibition Stands/Kazakhstan_Pavillion.jpeg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const customFaqs = [
  [
    'What makes a custom exhibition stand different from a modular system?',
    'A custom stand is built entirely from scratch to match your specific architecture, corporate branding, and product presentation needs using custom timber joinery, metal fabrication, curved elements, and specialized lighting, without the constraints of standardized aluminum grids.',
  ],
  [
    'What materials do you use for custom stand builds?',
    'We work with high-density MDF, natural wood veneers, acrylics, powder-coated steel and aluminum, tempered safety glass, high-pressure laminates, stretch fabric graphics, and LED illumination.',
  ],
  [
    'Can custom exhibition stand elements be re-used for future shows?',
    'Yes. We can engineer your custom stand as a modular-custom hybrid, allowing core components (such as reception counters, feature walls, and display towers) to be packed, stored in our Dubai warehouse, and reconfigured for multiple regional events.',
  ],
];

export default function CustomExhibitionStandsDubaiPage() {
  usePageLifecycle('Custom Exhibition Stands Dubai | Bespoke Trade Show Booths | EGS', {
    revealSelector: '.custom-stands-page .reveal',
    description: 'Bespoke custom exhibition stands in Dubai. Architectural joinery, double-decker pavilions, immersive product zones, and premium trade show execution.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Custom Exhibition Stands Dubai',
        description: 'Bespoke custom exhibition stand design, woodworking joinery, pavilion fabrication, and turnkey delivery across the UAE and GCC.',
        serviceType: 'Custom Exhibition Stands',
        url: '/custom-exhibition-stands-dubai',
      },
      faqs: customFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Custom Exhibition Stands Dubai', url: '/custom-exhibition-stands-dubai' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page exhibitions-page custom-stands-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        {/* Hero */}
        <section className="exhibitions-hero" aria-label="Custom Exhibition Stands Dubai Hero">
          <img
            className="exhibitions-hero-media"
            src={kazakhstanPavilion}
            alt="Custom exhibition pavilion stand in Dubai by EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Bespoke Architecture &amp; Custom Fabrication</span>
            <h1>Custom Exhibition Stands in Dubai — Bespoke Trade Show Booths &amp; Pavilions</h1>
            <p>
              Tailored architectural statements crafted for premier international expos. We build bespoke custom exhibition stands that showcase your unique brand identity with uncompromising joinery quality.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Inquire About Custom Stand →
              </InquiryCtaButton>
              <a href="/exhibition-stand-contractor-dubai" className="btn btn-ghost">
                Contractor Details
              </a>
            </div>
          </div>
        </section>

        {/* Features of Custom Builds */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Bespoke Execution</span>
              <h2>Why Leading Brands Choose Custom Exhibition Builds</h2>
              <p>
                When standing out among hundreds of competitors in massive halls like DWTC or ADNEC is non-negotiable.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Bespoke Feature 01</small>
                <h3>Infinite Architectural Freedom</h3>
                <p>Curved cantilevers, double-height proscenium arches, integrated water features, and custom sculptural elements unconstrained by modular limits.</p>
              </article>
              <article className="cap-card">
                <small>Bespoke Feature 02</small>
                <h3>Exact Product Integration</h3>
                <p>Custom-milled pedestals, motorized turntables, and heavy machinery support engineered precisely around your physical products.</p>
              </article>
              <article className="cap-card">
                <small>Bespoke Feature 03</small>
                <h3>VIP Hospitality Suites</h3>
                <p>Private corporate meeting rooms with acoustic wall cladding, refrigerated beverage bars, and luxury custom seating.</p>
              </article>
              <article className="cap-card">
                <small>Bespoke Feature 04</small>
                <h3>Immersive Brand Lighting</h3>
                <p>Programmable DMX lighting, concealed LED edge strips, backlit stretch fabric ceilings, and dimensional illuminated signage.</p>
              </article>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Custom Exhibition Stands FAQs</h2>
            </div>
            <FAQSection faqs={customFaqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Commission Your Custom Exhibition Stand in Dubai</h2>
              <p>Speak directly with our fabrication engineers about bespoke joinery, timeline planning, and turnkey pricing.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Start Your Custom Brief →
              </InquiryCtaButton>
              <a href="/exhibitions" className="btn btn-ghost">
                Back to Exhibitions Hub
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
