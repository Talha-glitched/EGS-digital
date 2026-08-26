import pageStyles from '../styles/pages/content-first.css?raw';
import minimalServiceResponsiveStyles from '../styles/pages/minimal-service-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import { images } from './siteData.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const posFaqs = [
  [
    'What types of POS display stands does EGS manufacture?',
    'We design and fabricate custom free-standing display units (FSDUs), counter-top units (CDUs), end-cap supermarket gondolas, refrigerated display wraps, illuminated acrylic showcases, and multi-tier metal retail display racks.',
  ],
  [
    'Can you handle nationwide rollouts across hypermarket chains like Carrefour and LuLu?',
    'Yes. We have proven nationwide rollout capacity—for example, deploying Sadia chiller displays across 33 Carrefour hypermarkets in the UAE overnight between midnight and 6 AM using 13 vehicles with dedicated supervisor QA/QC teams.',
  ],
  [
    'What materials are best suited for high-traffic retail POS units?',
    'We select materials based on campaign duration: high-density acrylic, powder-coated steel framing, and durable laminated wood for permanent or semi-permanent units, and reinforced corrugated board or forex for short-term promotional campaigns.',
  ],
];

export default function PosDisplayStandsDubaiPage() {
  usePageLifecycle('POS Display Stands Dubai | Retail POSM Manufacturer UAE | EGS', {
    revealSelector: '.pos-page .reveal',
    description: 'Custom POS display stands and POSM manufacturer in Dubai. Supermarket gondolas, FSDUs, chiller branding, and overnight hypermarket rollouts across the UAE.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'POS Display Stands and Retail POSM Manufacturer Dubai',
        description: 'Design, fabrication, and multi-store rollout of custom point-of-sale display stands, FSDUs, and hypermarket retail branding in Dubai and the UAE.',
        serviceType: 'POS Display Manufacturer',
        url: '/pos-display-stands-dubai',
      },
      faqs: posFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Retail Rollouts', url: '/retail' },
        { name: 'POS Display Stands Dubai', url: '/pos-display-stands-dubai' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{minimalServiceResponsiveStyles}</style>
      <div className="content-page minimal-service-page pos-page" style={{ '--accent': 'var(--claret)' }}>
        <Navbar active="retail" overlay />

        <section className="minimal-service-hero" aria-label="POS Display Stands Dubai Hero">
          <img
            className="minimal-service-hero-media"
            src={images.retailSadiaBusDisplay}
            alt="Custom POSM product display stand fabricated in Dubai by EGS"
          />
          <div className="minimal-service-hero-shade" aria-hidden="true" />
          <div className="minimal-service-hero-copy">
            <span className="minimal-service-kicker">In-House POSM Fabrication &amp; Rollouts</span>
            <h1>POS Display Stands in Dubai — Custom Retail POSM &amp; Hypermarket Units</h1>
            <p>
              Engineered for shopper conversion and retail floor durability. We manufacture custom POSM displays, supermarket end-caps, and chiller wraps delivered with overnight multi-store rollout precision.
            </p>
            <div className="minimal-service-actions">
              <InquiryCtaButton inquiryType="retail" className="btn btn-primary">
                Inquire for POSM Production →
              </InquiryCtaButton>
              <a href="/case-studies#sadia-carrefour-rollout" className="btn btn-ghost">
                Read Carrefour Rollout Proof
              </a>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--claret)' }} />Retail Solutions</span>
              <h2>Custom Retail POS Units Engineered for FMCG Brands</h2>
              <p>
                Combining striking visual branding with robust structural engineering to maximize in-store product pickup.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Unit Type 01</small>
                <h3>Free-Standing Display Units (FSDUs)</h3>
                <p>High-capacity floor stands designed for heavy FMCG loading, easy shelf restocking, and vibrant 360-degree brand visibility.</p>
              </article>
              <article className="cap-card">
                <small>Unit Type 02</small>
                <h3>Supermarket Chiller Branding</h3>
                <p>Moisture-resistant wraps, magnetic perimeter graphics, and illuminated header trims for commercial refrigeration aisles.</p>
              </article>
              <article className="cap-card">
                <small>Unit Type 03</small>
                <h3>Counter-Top Units (CDUs)</h3>
                <p>High-conversion impulse checkout displays crafted from precision laser-cut acrylic, molded plastics, and branded metal.</p>
              </article>
              <article className="cap-card">
                <small>Unit Type 04</small>
                <h3>Overnight Nationwide Installation</h3>
                <p>Full logistics fleet deploying after-hours into mall hypermarkets to ensure 100% opening-morning campaign compliance.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>POS Display Stands FAQs</h2>
            </div>
            <FAQSection faqs={posFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Planning an FMCG Retail Campaign or Store Rollout?</h2>
              <p>Send your unit quantities and store list. EGS will provide sample prototypes and rollout schedules.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="retail" className="btn btn-primary">
                Request POSM Quote →
              </InquiryCtaButton>
              <a href="/retail" className="btn btn-ghost">
                Explore Retail Services
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
