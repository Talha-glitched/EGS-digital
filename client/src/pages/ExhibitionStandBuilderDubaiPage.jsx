import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import healthtechStand from '../assets/Exhibition Stands/healthtech.jpg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const builderFaqs = [
  [
    'What types of exhibition stands does EGS build in Dubai?',
    'We build custom timber stands, double-decker two-storey booths, hybrid modular systems, country pavilions, and bespoke product showcase booths for international trade shows across Dubai and Abu Dhabi.',
  ],
  [
    'How do you guarantee quality control during booth construction?',
    'We pre-fabricate and dry-assemble complex stand components in our workshop prior to transporting them to the exhibition hall. This eliminates on-site alignment errors, ensures accurate electrical channel routing, and speeds up venue installation.',
  ],
  [
    'What safety and structural standards do you adhere to?',
    'All stands are engineered to comply with Dubai Municipality, Civil Defence, and venue regulations (DWTC / ADNEC). We provide certified structural calculations for elevated platforms, heavy equipment display bases, and overhead suspended rigging.',
  ],
  [
    'Can you build stands for international exhibitors who already have 3D designs?',
    'Yes. We frequently partner with international design agencies and corporate marketing teams who provide ready 3D models and CAD drawings. We translate their digital concepts into exact physical builds using local materials and venue-compliant methods.',
  ],
];

export default function ExhibitionStandBuilderDubaiPage() {
  usePageLifecycle('Exhibition Stand Builder Dubai | Custom Booth Construction | EGS', {
    revealSelector: '.builder-page .reveal',
    description: 'Expert exhibition stand builder in Dubai. Custom booth construction, joinery craftsmanship, DWTC pre-assembly, and on-time trade show handover.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Exhibition Stand Builder Dubai',
        description: 'Bespoke trade show booth construction and stand building services in Dubai, featuring in-house joinery, metalwork, electrical setup, and structural engineering.',
        serviceType: 'Exhibition Stand Builder',
        url: '/exhibition-stand-builder-dubai',
      },
      faqs: builderFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Exhibition Stand Builder Dubai', url: '/exhibition-stand-builder-dubai' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page exhibitions-page builder-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        {/* Hero */}
        <section className="exhibitions-hero" aria-label="Exhibition Stand Builder Dubai Hero">
          <img
            className="exhibitions-hero-media"
            src={healthtechStand}
            alt="Exhibition booth construction in Dubai by EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Master Joinery &amp; Booth Construction UAE</span>
            <h1>Exhibition Stand Builder in Dubai — Custom Booth Construction &amp; Joinery</h1>
            <p>
              Engineering precision, premium surface finishes, and rigorous pre-assembly. We build high-impact trade show booths that elevate your brand presence and perform flawlessly under heavy event footfall.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Build Your Stand With EGS →
              </InquiryCtaButton>
              <a href="/exhibition-stand-contractor-dubai" className="btn btn-ghost">
                View Contractor Services
              </a>
            </div>
          </div>
        </section>

        {/* Construction Capabilities */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Craftsmanship</span>
              <h2>Comprehensive In-House Booth Building Disciplines</h2>
              <p>
                Every component of your stand is built by certified craftsmen using high-grade materials specified for trade show durability.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Build Scope 01</small>
                <h3>Custom Wooden Joinery</h3>
                <p>Curved walls, cantilevered canopies, branded reception counters, and secure storage rooms built to millimeter tolerances.</p>
              </article>
              <article className="cap-card">
                <small>Build Scope 02</small>
                <h3>Integrated Lighting &amp; Electrics</h3>
                <p>Concealed wiring, high-CRI LED spotlights, glowing toe-kicks, and illuminated 3D logos wired to DWTC load specifications.</p>
              </article>
              <article className="cap-card">
                <small>Build Scope 03</small>
                <h3>Flooring &amp; Raised Platforms</h3>
                <p>Reinforced raised floors with beveled safety edging, recessed LED lighting strips, and durable laminate or vinyl finishes.</p>
              </article>
              <article className="cap-card">
                <small>Build Scope 04</small>
                <h3>AV &amp; Hardware Mounting</h3>
                <p>Flush-mounted LED video walls, interactive touch displays, and heavy product display pedestals with hidden cable tracks.</p>
              </article>
            </div>
          </div>
        </section>

        {/* Comparison: Custom vs Shell Scheme */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Building for Impact: Custom Builds vs. Standard Shell Schemes</h2>
              <p>
                How a custom-built exhibition stand fundamentally alters buyer perception on the trade show floor.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Standard Shell Scheme</small>
                <h3>Limited Generic Booth</h3>
                <p>Constrained by aluminum pole frames, low visibility, standard fascia text, and minimal visitor dwell time.</p>
              </article>
              <article className="cap-card">
                <small>EGS Custom Build</small>
                <h3>Architectural Brand Showcase</h3>
                <p>360-degree overhead brand visibility, dedicated private VIP meeting zones, integrated interactive demo counters, and maximum footfall attraction.</p>
              </article>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Exhibition Booth Building FAQs</h2>
            </div>
            <FAQSection faqs={builderFaqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="section-band">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Ready to Build an Exceptional Trade Show Stand in Dubai?</h2>
              <p>Contact our technical team for production advice, material options, and a transparent construction timeline.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get Construction Estimate →
              </InquiryCtaButton>
              <a href="/guides/exhibition-stand-cost-dubai" className="btn btn-ghost">
                Read Stand Cost Guide
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
