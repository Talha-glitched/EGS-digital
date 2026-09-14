import pageStyles from '../../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../../hooks/usePageLifecycle.js';
import { Navbar } from '../../components/Navbar.jsx';
import { FAQSection, Footer } from '../SiteChrome.jsx';
import InquiryCtaButton from '../../components/inquiry/InquiryCtaButton.jsx';
import { images } from '../siteData.js';
import { buildPageSchemaBundle } from '../../utils/schemaGenerator.js';

const big5Faqs = [
  [
    'What types of stands does EGS construct for The Big 5 Global at DWTC?',
    'We build custom exhibition stands for building material manufacturers, heavy construction equipment suppliers, MEP contractors, architectural glass/aluminum brands, and construction tech startups exhibiting across DWTC halls.',
  ],
  [
    'How do you manage heavy architectural displays and product plinths?',
    'Building products often have substantial physical weight (cladding panels, marble slabs, heavy valves, steel sections). We engineer reinforced structural timber and metal sub-frames that safely distribute weight while complying with DWTC floor load limits.',
  ],
  [
    'Can you incorporate live functional product demonstrations (water, heavy electrical)?',
    'Yes. We coordinate DWTC utility connections for plumbing, compressed air, and three-phase high-voltage power, concealing all service lines beneath raised exhibition floors with easy-access inspection hatches.',
  ],
  [
    'How far in advance should we secure our Big 5 exhibition stand contractor?',
    'With thousands of international exhibitors occupying every DWTC hall, early planning is essential. We recommend securing your contractor 8 to 10 weeks before the show to finalize 3D designs, secure DWTC engineering approvals, and ensure priority workshop scheduling.',
  ],
  [
    'Does EGS provide stand dismantling and material recycling/storage after the show?',
    'Yes. We provide complete post-event dismantling, safe removal, and optional secure storage in our Dubai warehouse for clients participating in future UAE exhibitions.',
  ],
];

export default function Big5ExhibitionStandsPage() {
  usePageLifecycle('The Big 5 Exhibition Stand Builder Dubai | DWTC Booths | EGS', {
    revealSelector: '.big5-page .reveal',
    description: 'Premier exhibition stand builder for The Big 5 Global at Dubai World Trade Centre (DWTC). Heavy product plinths, architectural joinery, DWTC permits, and turnkey build.',
    ogImage: images.phillips2,
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'The Big 5 Global Exhibition Stand Builder Dubai',
        description: 'Bespoke exhibition stand contractor for The Big 5 Global at Dubai World Trade Centre (DWTC), specializing in building material showcases, heavy displays, and turnkey construction.',
        serviceType: 'Exhibition Stand Contractor Big 5',
        url: '/events/big-5-exhibition-stands',
      },
      faqs: big5Faqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'The Big 5 Stand Builder', url: '/events/big-5-exhibition-stands' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page big5-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        {/* Hero Section */}
        <section className="exhibitions-hero" aria-label="The Big 5 Stand Builder Hero">
          <img
            className="exhibitions-hero-media"
            src={images.phillips2}
            alt="The Big 5 Global custom construction exhibition stand at DWTC Dubai by contractor EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">The Big 5 Global (DWTC) Specialist Stand Builder</span>
            <h1>The Big 5 Exhibition Stand Builder in Dubai — Custom Booths for Construction Leaders</h1>
            <p>
              Engineered for heavy-duty impact. From architectural material displays and MEP equipment plinths to double-decker VIP lounges, EGS builds stands at Dubai World Trade Centre that showcase structural craftsmanship at its highest level.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Book Big 5 Stand Builder →
              </InquiryCtaButton>
              <a href="/venues/dwtc-exhibition-stand-builder" className="btn btn-ghost">
                DWTC Venue Capabilities
              </a>
            </div>
          </div>
        </section>

        {/* Construction Capabilities */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Construction Show Engineering</span>
              <h2>Purpose-Built Features for Big 5 Global Exhibitors</h2>
              <p>
                Crafted to display substantial physical products, heavy machinery, and architectural finishes under rigorous DWTC safety guidelines.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Feature 01</small>
                <h3>Reinforced Load-Bearing Plinths</h3>
                <p>Engineered display bases designed to support heavy stone, marble, steel beams, and industrial valves without floor deflection.</p>
              </article>
              <article className="cap-card">
                <small>Feature 02</small>
                <h3>Architectural Material Mockups</h3>
                <p>Custom CNC timber joinery and precision-aligned frames for mounting facade samples, acoustic ceiling panels, and glass systems.</p>
              </article>
              <article className="cap-card">
                <small>Feature 03</small>
                <h3>Raised Utility Flooring</h3>
                <p>Heavy-duty raised modular floors with concealed channels for 380V power feeds, plumbing for live water demos, and data cables.</p>
              </article>
              <article className="cap-card">
                <small>Feature 04</small>
                <h3>Full DWTC Engineering Permits</h3>
                <p>Complete management of DWTC architectural drawings, structural stability certificates, and Civil Defence fire-retardant stamps.</p>
              </article>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Frequently Asked Questions — The Big 5 Stand Building</h2>
              <p>Direct guidance on stand fabrication, weight loads, and DWTC regulations for The Big 5 Global.</p>
            </div>
            <FAQSection faqs={big5Faqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Building Your Stand for The Big 5 Global at DWTC?</h2>
              <p>Send your hall number, booth dimensions, and product display specifications for an itemized turnkey proposal within 24 hours.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get Big 5 Stand Proposal →
              </InquiryCtaButton>
              <a href="https://wa.me/971524587992" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                WhatsApp Project Team
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
