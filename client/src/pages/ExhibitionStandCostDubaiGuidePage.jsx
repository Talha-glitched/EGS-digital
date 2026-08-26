import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import ausCaaStand from '../assets/Exhibition Stands/AUS-CAA.jpeg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const costFaqs = [
  [
    'How much does a custom exhibition stand cost in Dubai on average?',
    'In Dubai, standard custom exhibition stands generally range from AED 750 to AED 1,800 per square metre (approx. $200–$500/sqm), while premium custom builds with double-deckers, high-end laminates, suspended rigging, and large LED walls can range from AED 1,800 to AED 3,500+ per square metre.',
  ],
  [
    'What factors influence exhibition stand pricing the most in the UAE?',
    'The key cost drivers are stand footprint (sqm), height and double-decker structural engineering, material choices (basic painted MDF vs high-pressure laminates and acrylics), integrated AV/LED screen sizes, suspended overhead rigging, and the move-in installation schedule.',
  ],
  [
    'Are venue fees (rigging, electrical power, waste management) included in contractor quotes?',
    'Standard contractor fabrication quotes cover stand design, materials, build, lighting fixtures, and on-site labor. Venue utility charges (such as DWTC electrical supply connection fees, rigging point rental, and official badge fees) are billed directly by the venue organizer, though EGS handles the technical submissions.',
  ],
];

export default function ExhibitionStandCostDubaiGuidePage() {
  usePageLifecycle('Exhibition Stand Cost in Dubai | 2026 Pricing Guide | EGS', {
    revealSelector: '.cost-guide-page .reveal',
    description: 'Comprehensive 2026 guide to exhibition stand costs in Dubai. Cost per sqm breakdowns, custom vs shell scheme pricing, hidden venue fees, and procurement tips.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Exhibition Stand Cost in Dubai Guide',
        description: 'Detailed commercial breakdown of exhibition stand design and build costs per square metre across Dubai and UAE trade show venues.',
        serviceType: 'Exhibition Stand Cost Guide',
        url: '/guides/exhibition-stand-cost-dubai',
      },
      faqs: costFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Guides', url: '/guides/exhibition-stand-cost-dubai' },
        { name: 'Exhibition Stand Cost Dubai', url: '/guides/exhibition-stand-cost-dubai' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page exhibitions-page cost-guide-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        <section className="exhibitions-hero" aria-label="Exhibition Stand Cost Dubai Hero">
          <img
            className="exhibitions-hero-media"
            src={ausCaaStand}
            alt="Exhibition stand cost calculation guide in Dubai"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">2026 Exhibitor Pricing Breakdown</span>
            <h1>Exhibition Stand Cost in Dubai — The Complete Pricing Guide for Exhibitors</h1>
            <p>
              Transparent, realistic cost benchmarks for marketing and procurement teams. Understand cost-per-sqm tiers, custom joinery variables, and hidden venue costs before issuing your RFP.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get an Itemized Quote →
              </InquiryCtaButton>
              <a href="/exhibition-stand-contractor-dubai" className="btn btn-ghost">
                Contractor Services
              </a>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Cost Breakdown</span>
              <h2>Exhibition Stand Cost Tiers in Dubai (Per Square Metre)</h2>
              <p>
                Based on actual UAE workshop fabrication and venue move-in requirements.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Tier 01: Economy / Shell Upgrade</small>
                <h3>AED 600 – AED 950 / sqm</h3>
                <p>Upgraded shell scheme, vinyl graphics, basic raised carpeted flooring, standard lockable counter, and LED spotlighting. Ideal for 9–18 sqm stands.</p>
              </article>
              <article className="cap-card">
                <small>Tier 02: Standard Custom Build</small>
                <h3>AED 1,000 – AED 1,750 / sqm</h3>
                <p>Full bespoke wooden joinery, custom reception counter, 3D backlit acrylic logo, semi-private meeting lounge, and display niches. Ideal for 24–60 sqm booths.</p>
              </article>
              <article className="cap-card">
                <small>Tier 03: Premium Flagship Stand</small>
                <h3>AED 1,800 – AED 2,800 / sqm</h3>
                <p>High-end architectural laminates, suspended overhead fabric banners, curved LED video wall integration, luxury VIP suite, and interactive demo pods.</p>
              </article>
              <article className="cap-card">
                <small>Tier 04: Double-Decker Pavilion</small>
                <h3>AED 2,800 – AED 4,500+ / sqm</h3>
                <p>Certified steel-frame two-storey construction, internal staircase, upper VIP lounge, civil defence calculations, and maximum hall presence.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Hidden Venue Charges Exhibitors Often Overlook</h2>
              <p>
                Ensure your event budget accounts for direct venue charges billed by exhibition organizers (e.g. DWTC / ADNEC).
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Venue Cost 01</small>
                <h3>Electrical Main Connection</h3>
                <p>Venues charge for the main power feed (single-phase or 3-phase KW supply) brought to your booth location.</p>
              </article>
              <article className="cap-card">
                <small>Venue Cost 02</small>
                <h3>Overhead Rigging Point Rental</h3>
                <p>Rental fees per ceiling suspension point for hanging overhead circular banners or lighting trusses.</p>
              </article>
              <article className="cap-card">
                <small>Venue Cost 03</small>
                <h3>Water, Waste &amp; Compressed Air</h3>
                <p>Mandatory utility plumbing connections for live food preparation or heavy dental/machinery stands.</p>
              </article>
              <article className="cap-card">
                <small>Venue Cost 04</small>
                <h3>Contractor Performance Bond</h3>
                <p>Refundable security deposits and permit administration fees required by the venue during move-in and strike.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Frequently Asked Questions — Stand Costs &amp; Budgets</h2>
            </div>
            <FAQSection faqs={costFaqs} />
          </div>
        </section>

        <section className="section-band">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Want a Transparent, Itemized Cost Breakdown for Your Stand?</h2>
              <p>Send your floorplan, show dates, and target budget. EGS will provide an exact, itemized fabrication quotation.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Request Detailed Stand Quote →
              </InquiryCtaButton>
              <a href="/exhibitions" className="btn btn-ghost">
                Explore Exhibition Portfolio
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
