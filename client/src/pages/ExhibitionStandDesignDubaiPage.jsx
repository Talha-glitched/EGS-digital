import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import ausCaaStand from '../assets/Exhibition Stands/AUS-CAA.jpeg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const designFaqs = [
  [
    'What is your 3D exhibition stand design process?',
    'We start with your brand brief, target trade show, stand dimensions, and commercial objectives. Our 3D spatial designers generate conceptual layouts, lighting studies, high-resolution renders, and detailed 360-degree walkthroughs.',
  ],
  [
    'Do your designs take into account actual fabrication costs and venue rules?',
    'Yes. Because EGS is a direct fabricator and not just a digital design agency, every render is designed to be buildable within your real-world budget, structural engineering codes, and DWTC height restrictions.',
  ],
  [
    'How do you design for lead capture and visitor traffic flow?',
    'We position high-impact overhead visual anchors to draw visitors from main aisles, design open reception counters for immediate qualification, create semi-private meeting lounges for deal closing, and integrate dedicated product demonstration zones.',
  ],
];

export default function ExhibitionStandDesignDubaiPage() {
  usePageLifecycle('Exhibition Stand Design Dubai | 3D Booth Concepts & Renders | EGS', {
    revealSelector: '.design-page .reveal',
    description: 'Bespoke exhibition stand design in Dubai. High-impact 3D booth concepts, spatial ergonomics, lead-generation layouts, and build-ready engineering.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Exhibition Stand Design Dubai',
        description: 'Commercial 3D exhibition stand design, spatial planning, architectural booth concepts, and ergonomic visitor flow modeling in Dubai.',
        serviceType: 'Exhibition Stand Design',
        url: '/exhibition-stand-design-dubai',
      },
      faqs: designFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Exhibition Stand Design Dubai', url: '/exhibition-stand-design-dubai' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page exhibitions-page design-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        {/* Hero */}
        <section className="exhibitions-hero" aria-label="Exhibition Stand Design Dubai Hero">
          <img
            className="exhibitions-hero-media"
            src={ausCaaStand}
            alt="3D exhibition stand design concept in Dubai"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Spatial Architecture &amp; Brand Immersion</span>
            <h1>Exhibition Stand Design in Dubai — High-Impact 3D Concepts &amp; Space Planning</h1>
            <p>
              Turning brand identity into compelling physical architecture. We design exhibition stands that capture aisle attention, optimize visitor circulation, and convert trade show footfall into qualified commercial leads.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Request Custom 3D Concept →
              </InquiryCtaButton>
              <a href="/exhibitions" className="btn btn-ghost">
                View All Exhibition Services
              </a>
            </div>
          </div>
        </section>

        {/* Strategic Design Principles */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Design Strategy</span>
              <h2>Ergonomic Booth Architecture Designed to Sell</h2>
              <p>
                A great exhibition stand is not just visually striking—it is an optimized sales engine engineered around visitor psychology.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Principle 01</small>
                <h3>Aisle Attraction &amp; Sightlines</h3>
                <p>Overhead branded fascias, dynamic halo lighting, and 360-degree brand visibility visible from 20+ metres down exhibition aisles.</p>
              </article>
              <article className="cap-card">
                <small>Principle 02</small>
                <h3>Qualifying Reception Zones</h3>
                <p>Strategically placed front counters that welcome visitors without blocking internal footfall or creating choke points.</p>
              </article>
              <article className="cap-card">
                <small>Principle 03</small>
                <h3>Dedicated Demo Stations</h3>
                <p>Ergonomic product display counters with integrated touchscreen tablets, power drops, and secure storage for live demos.</p>
              </article>
              <article className="cap-card">
                <small>Principle 04</small>
                <h3>Private VIP &amp; Meeting Lounges</h3>
                <p>Acoustically softened semi-private or enclosed meeting rooms designed for high-value contract negotiations.</p>
              </article>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Exhibition Stand Design FAQs</h2>
            </div>
            <FAQSection faqs={designFaqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Transform Your Brand Presence for Your Next Dubai Expo</h2>
              <p>Send us your brand guidelines and booth dimensions. Our design team will prepare a tailored 3D concept.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Book 3D Design Consultation →
              </InquiryCtaButton>
              <a href="/custom-exhibition-stands-dubai" className="btn btn-ghost">
                Explore Custom Stands
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
