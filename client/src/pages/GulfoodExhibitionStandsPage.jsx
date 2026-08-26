import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import kazakhstanPavilion from '../assets/Exhibition Stands/Kazakhstan_Pavillion.jpeg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const gulfoodFaqs = [
  [
    'What specialized requirements do F&B exhibition stands have at Gulfood?',
    'Gulfood stands require live food preparation counters, commercial refrigeration and chiller integration, grease-trap plumbing coordination, dedicated food sampling stations, and high-capacity storage for trade inventory.',
  ],
  [
    'Do you build national country pavilions at Gulfood?',
    'Yes. EGS has built multi-brand national country pavilions—such as the 168 sqm Kazakhstan National Pavilion at Gulfood DWTC, hosting multiple national exporters with unified overhead architectural branding.',
  ],
  [
    'How do you manage late exporter product additions before Gulfood opens?',
    'Our 24-hour Dubai workshop capacity enables us to produce additional display pedestals and sample shelving overnight, ensuring all participating brands are showcased seamlessly on opening morning.',
  ],
];

export default function GulfoodExhibitionStandsPage() {
  usePageLifecycle('Gulfood Exhibition Stand Design & Build Dubai | DWTC Booths | EGS', {
    revealSelector: '.gulfood-page .reveal',
    description: 'Custom F&B exhibition stand builder for Gulfood at Dubai World Trade Centre (DWTC). National country pavilions, sampling counters, and turnkey booth delivery.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Gulfood Exhibition Stand Contractor Dubai',
        description: 'F&B custom exhibition booth design, commercial sampling counters, refrigerated displays, and national pavilion construction for Gulfood at DWTC.',
        serviceType: 'Exhibition Stand Contractor Gulfood',
        url: '/events/gulfood-exhibition-stands',
      },
      faqs: gulfoodFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Gulfood Exhibition Stands', url: '/events/gulfood-exhibition-stands' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page exhibitions-page gulfood-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        <section className="exhibitions-hero" aria-label="Gulfood Exhibition Stand Contractor Hero">
          <img
            className="exhibitions-hero-media"
            src={kazakhstanPavilion}
            alt="Kazakhstan Pavilion at Gulfood DWTC Dubai built by EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Gulfood &amp; Gulfood Manufacturing (DWTC)</span>
            <h1>Gulfood Exhibition Stand Design &amp; Build Dubai — F&amp;B Booths &amp; Country Pavilions</h1>
            <p>
              Showcasing global food and beverage excellence. We design and fabricate custom Gulfood booths, tasting counters, refrigerated display islands, and massive multi-brand country pavilions at DWTC.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Inquire for Gulfood Stand →
              </InquiryCtaButton>
              <a href="/case-studies#kazakhstan-pavilion-gulfood" className="btn btn-ghost">
                Read Kazakhstan Pavilion Proof
              </a>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />F&amp;B Engineering</span>
              <h2>Purpose-Built Features for Food &amp; Beverage Exhibitors</h2>
              <p>
                Engineered to handle live food prep, sanitary hygiene standards, and rapid sample distribution under heavy visitor flow.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>F&amp;B Feature 01</small>
                <h3>Live Cooking &amp; Barista Counters</h3>
                <p>Stainless steel preparation surfaces, integrated induction cooktops, concealed water supply/drainage, and sneeze guards.</p>
              </article>
              <article className="cap-card">
                <small>F&amp;B Feature 02</small>
                <h3>Chilled &amp; Frozen Display Integration</h3>
                <p>Seamlessly integrated commercial display chillers with custom branded vinyl cladding and dedicated electrical lines.</p>
              </article>
              <article className="cap-card">
                <small>F&amp;B Feature 03</small>
                <h3>Country Pavilion Architecture</h3>
                <p>Unified overhead identity towers and individual exporter kiosks designed for national trade promotion agencies.</p>
              </article>
              <article className="cap-card">
                <small>F&amp;B Feature 04</small>
                <h3>High-Capacity Trade Stock Storage</h3>
                <p>Reinforced back-of-house storage rooms with heavy shelving designed for continuous replenishment during 5-day expos.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Gulfood Stand Contractor FAQs</h2>
            </div>
            <FAQSection faqs={gulfoodFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Planning Your Presence at Gulfood at DWTC?</h2>
              <p>Send your hall allocation and product requirements. Our F&amp;B exhibition architects will prepare 3D concept proposals.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get Gulfood Proposal →
              </InquiryCtaButton>
              <a href="/exhibitions" className="btn btn-ghost">
                View All Exhibition Stands
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
