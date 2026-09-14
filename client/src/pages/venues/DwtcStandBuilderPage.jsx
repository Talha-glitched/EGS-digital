import pageStyles from '../../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../../hooks/usePageLifecycle.js';
import { Navbar } from '../../components/Navbar.jsx';
import { FAQSection, Footer } from '../SiteChrome.jsx';
import InquiryCtaButton from '../../components/inquiry/InquiryCtaButton.jsx';
import { images } from '../siteData.js';
import { buildPageSchemaBundle } from '../../utils/schemaGenerator.js';

const dwtcFaqs = [
  [
    'What are the maximum stand build heights permitted at Dubai World Trade Centre (DWTC)?',
    'Standard single-storey exhibition stands at DWTC are generally permitted up to a height of 4.0 metres. For island or peninsula booths in select main halls, structures may be engineered up to 6.0 metres subject to DWTC approval. Double-decker structures require structural engineer calculations, civil defence verification, and venue approval fees before move-in.',
  ],
  [
    'How far in advance must stand drawings be submitted for DWTC approval?',
    'All custom stand designs, architectural layouts, and electrical distribution plans must be submitted to DWTC Operations and Civil Defence at least 3 to 4 weeks prior to build-up. Late submissions can incur venue penalty surcharges and move-in delays. EGS handles all engineering documentation and permit submissions directly.',
  ],
  [
    'Where is EGS located relative to DWTC for emergency adaptations?',
    'Our primary carpentry, metal fabrication, and large-format printing workshop is in Al Qusais Industrial Area, approximately 15 to 20 minutes from DWTC. This immediate geographic proximity allows us to fabricate additional counters, adjust joinery, and reprint graphics overnight during tight setup windows.',
  ],
  [
    'What safety documentation does DWTC require from exhibition stand builders?',
    'DWTC mandates comprehensive Third-Party Contractor Insurance, structural stability certificates from registered UAE structural engineers, Civil Defence flame-retardant certificates for all timber, paints, and fabrics, risk assessments, and valid contractor access passes for every crew member on site.',
  ],
  [
    'Can EGS store our stand components before or between consecutive DWTC shows?',
    'Yes. We provide secure warehouse storage in Dubai between exhibitions. If you participate in multiple DWTC shows throughout the season (e.g., GITEX, Arab Health, Gulfood, or The Big 5), we refurbish, reconfigure, and store modular components to minimize your annual exhibition capital expenditure.',
  ],
];

export default function DwtcStandBuilderPage() {
  usePageLifecycle('DWTC Exhibition Stand Builder Dubai | Custom Booths & DWTC Approvals | EGS', {
    revealSelector: '.venue-page .reveal',
    description: 'Premier exhibition stand builder for Dubai World Trade Centre (DWTC). In-house joinery, structural permits, DWTC approvals, and guaranteed opening-day handover.',
    ogImage: images.phillips2,
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'DWTC Exhibition Stand Builder Dubai',
        description: 'Turnkey exhibition stand contractor specializing in custom booth design, structural fabrication, DWTC venue submissions, and on-site snagging at Dubai World Trade Centre.',
        serviceType: 'Exhibition Stand Contractor',
        url: '/venues/dwtc-exhibition-stand-builder',
      },
      faqs: dwtcFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Venues', url: '/venues/dwtc-exhibition-stand-builder' },
        { name: 'DWTC Stand Builder', url: '/venues/dwtc-exhibition-stand-builder' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page venue-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        {/* Hero Section */}
        <section className="exhibitions-hero" aria-label="DWTC Exhibition Stand Builder Hero">
          <img
            className="exhibitions-hero-media"
            src={images.phillips2}
            alt="Custom exhibition stand built at Dubai World Trade Centre by contractor EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Dubai World Trade Centre (DWTC) Specialist Contractor</span>
            <h1>Exhibition Stand Builder at DWTC Dubai — In-House Fabrication &amp; Direct Venue Approvals</h1>
            <p>
              15 minutes from DWTC halls. We engineer custom exhibition booths, manage Civil Defence and structural permits, pre-assemble in our Al Qusais workshop, and guarantee defect-free delivery before the trade show doors open.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Request DWTC Stand Quote →
              </InquiryCtaButton>
              <a href="/guides/dwtc-stand-guidelines" className="btn btn-ghost">
                Read DWTC Regulations Guide
              </a>
            </div>
          </div>
        </section>

        {/* Venue Mastery */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Venue Authority</span>
              <h2>Navigating Dubai World Trade Centre’s Exacting Build Standards</h2>
              <p>
                DWTC is the GCC’s highest-density exhibition venue. With tight move-in schedules, strict logistical marshalling yards, and rigorous Civil Defence compliance, building at DWTC requires a local contractor who knows the venue inside out.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Permits &amp; Approvals</small>
                <h3>Full Engineering Compliance</h3>
                <p>
                  We coordinate all mandatory DWTC submissions: 3D elevations, electrical load schematics, fire-retardant paint certifications, and third-party structural stability sign-offs for high or double-decker stands.
                </p>
              </article>
              <article className="cap-card">
                <small>Logistical Proximity</small>
                <h3>15 Minutes from DWTC Halls</h3>
                <p>
                  Our dedicated joinery workshop in Al Qusais is minutes from the venue. When unexpected product dimensions or layout changes arise on the hall floor, our fabrication team can adapt parts overnight.
                </p>
              </article>
              <article className="cap-card">
                <small>Quality Assurance</small>
                <h3>Pre-Assembly Trial Fit</h3>
                <p>
                  Every complex timber structure, LED screen frame, and curved counter is test-assembled in our facility before venue load-in, preventing on-site delays and ensuring flawless finishes.
                </p>
              </article>
              <article className="cap-card">
                <small>Turnkey Scope</small>
                <h3>Show-Day Stand Management</h3>
                <p>
                  Our commitment does not end at ribbon-cutting. An on-site EGS project manager remains on standby across all show days for rapid maintenance, daily touch-ups, and smooth post-show dismantling.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Major DWTC Shows We Build For */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Major Annual Shows at Dubai World Trade Centre</h2>
              <p>
                From global tech summits to healthcare and food expos, EGS delivers verified custom stands across DWTC’s headline calendar.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>October | DWTC</small>
                <h3>GITEX Global</h3>
                <p>High-tech custom booths with seamless LED video walls, interactive software demo counters, and high-impact overhead rigging.</p>
                <a href="/events/gitex-exhibition-stands" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>GITEX Stand Solutions →</a>
              </article>
              <article className="cap-card">
                <small>January | DWTC</small>
                <h3>Arab Health &amp; Medlab</h3>
                <p>Clinical-grade healthcare pavilions, heavy diagnostic equipment floor reinforcements, and VIP acoustic consultation suites.</p>
                <a href="/events/arab-health-exhibition-stands" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Arab Health Stand Solutions →</a>
              </article>
              <article className="cap-card">
                <small>February | DWTC</small>
                <h3>Gulfood</h3>
                <p>Multi-brand food &amp; beverage pavilions, commercial sampling counters, chilled display integration, and hospitality seating.</p>
                <a href="/events/gulfood-exhibition-stands" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Gulfood Stand Solutions →</a>
              </article>
              <article className="cap-card">
                <small>November | DWTC</small>
                <h3>The Big 5 Global</h3>
                <p>Heavy building materials exhibits, architectural joinery showcases, and multi-tier product display structures.</p>
                <a href="/exhibition-stand-contractor-dubai" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Big 5 Stand Solutions →</a>
              </article>
            </div>
          </div>
        </section>

        {/* Real Production Proof at DWTC */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Production Proof</span>
              <h2>Proven On-Site Performance Under DWTC Opening Pressure</h2>
              <p>Real-world evidence of adapting and delivering large-scale exhibition stands on the DWTC floor.</p>
            </div>
            <div className="capability-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
              <article className="cap-card">
                <small>Gulfood Showcase</small>
                <h3>Kazakhstan National Pavilion</h3>
                <p>
                  At Gulfood, EGS delivered the 168 sqm Kazakhstan National Pavilion. When late-stage requirements demanded immediate cold-chain product accommodation, our team adapted the structure and installed 5–6 branded display chillers before hall inspection.
                </p>
                <a href="/case-studies#kazakhstan-pavilion-gulfood" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>View Case Study →</a>
              </article>
              <article className="cap-card">
                <small>Healthcare Engineering</small>
                <h3>Philips Healthcare Booth</h3>
                <p>
                  Delivered high-spec clinical exhibition spaces featuring integrated MRI display models, medical-grade lighting, and precision joinery built to multinational corporate brand standards.
                </p>
                <a href="/case-studies#philips-global-health-riyadh" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>View Case Study →</a>
              </article>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Frequently Asked Questions — DWTC Stand Construction</h2>
              <p>Everything you need to know about building, permitting, and delivering stands at Dubai World Trade Centre.</p>
            </div>
            <FAQSection faqs={dwtcFaqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Planning Your Stand at Dubai World Trade Centre?</h2>
              <p>Send us your stand dimensions, hall number, and event dates for an itemized turnkey proposal within 24 hours.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get DWTC Stand Proposal →
              </InquiryCtaButton>
              <a href="https://wa.me/971524587992" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                WhatsApp Project Manager
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
