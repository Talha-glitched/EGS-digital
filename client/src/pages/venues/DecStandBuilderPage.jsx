import pageStyles from '../../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../../hooks/usePageLifecycle.js';
import { Navbar } from '../../components/Navbar.jsx';
import { FAQSection, Footer } from '../SiteChrome.jsx';
import InquiryCtaButton from '../../components/inquiry/InquiryCtaButton.jsx';
import { images } from '../siteData.js';
import kazakhstanPavilion from '../../assets/Exhibition Stands/Kazakhstan_Pavillion.jpeg';
import { buildPageSchemaBundle } from '../../utils/schemaGenerator.js';

const decFaqs = [
  [
    'Does EGS build exhibition stands at Dubai Exhibition Centre (DEC) in Expo City?',
    'Yes. EGS has delivered large-scale country pavilions and institutional event staging at Dubai Exhibition Centre (DEC) in Expo City Dubai, including the 168 sqm Kazakhstan National Pavilion and major educational convocations.',
  ],
  [
    'What makes DEC / Expo City unique from other UAE venues?',
    'DEC features expansive, modern hall layouts with immense ceiling heights, wide loading bays, and state-of-the-art power grids. It is engineered for mega-pavilions, heavy industrial equipment, and large multinational delegations in Dubai South near Al Maktoum International Airport.',
  ],
  [
    'How does EGS manage late-stage changes during setup at DEC?',
    'Our direct UAE fabrication capacity in Al Qusais allows us to produce additional components, display chillers, or structural extensions overnight. For example, at Gulfood at Expo City, we rapidly adapted the Kazakhstan stand with 5–6 product display chillers within hours before doors opened.',
  ],
  [
    'What approvals are required for building at Dubai Exhibition Centre?',
    'DEC enforces rigorous Expo City Dubai Health & Safety regulations, Civil Defence fire-retardant compliance for all timbers and fabrics, structural engineering calculations for elevated structures, and pre-approved logistical vehicular access passes.',
  ],
  [
    'Can EGS accommodate double-decker stands at DEC?',
    'Yes. DEC’s substantial ceiling clearance makes it ideal for double-decker exhibition stands and elevated VIP lounges. EGS handles complete structural engineering calculations, staircase design, load-bearing verification, and venue approvals.',
  ],
];

export default function DecStandBuilderPage() {
  usePageLifecycle('Dubai Exhibition Centre (DEC) Stand Builder | Expo City Booths | EGS', {
    revealSelector: '.venue-page .reveal',
    description: 'Premier exhibition stand builder for Dubai Exhibition Centre (DEC) in Expo City Dubai. Custom country pavilions, high-impact booth design, DEC permits, and turnkey build.',
    ogImage: kazakhstanPavilion,
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Dubai Exhibition Centre Stand Builder',
        description: 'Turnkey exhibition stand contractor specializing in custom booth design, large country pavilions, DEC venue submissions, and turnkey show-day delivery at Dubai Exhibition Centre (DEC), Expo City Dubai.',
        serviceType: 'Exhibition Stand Contractor',
        url: '/venues/dubai-exhibition-centre-stand-builder',
      },
      faqs: decFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Venues', url: '/venues/dubai-exhibition-centre-stand-builder' },
        { name: 'DEC Expo City Stand Builder', url: '/venues/dubai-exhibition-centre-stand-builder' },
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
        <section className="exhibitions-hero" aria-label="Dubai Exhibition Centre Stand Builder Hero">
          <img
            className="exhibitions-hero-media"
            src={kazakhstanPavilion}
            alt="Kazakhstan Pavilion built at Dubai Exhibition Centre Expo City by contractor EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Dubai Exhibition Centre (DEC) &amp; Expo City Specialist</span>
            <h1>Exhibition Stand Builder at Dubai Exhibition Centre (DEC) — Expo City Pavilions</h1>
            <p>
              Engineered for scale. From sprawling multi-brand national country pavilions to high-tech corporate exhibition spaces at DEC Dubai South, EGS delivers precision joinery, full venue compliance, and guaranteed opening-day readiness.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Request DEC Stand Quote →
              </InquiryCtaButton>
              <a href="/case-studies#kazakhstan-pavilion-gulfood" className="btn btn-ghost">
                View Expo City Pavilion Proof
              </a>
            </div>
          </div>
        </section>

        {/* Venue Authority */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Dubai South Mega-Venue</span>
              <h2>Building at Dubai Exhibition Centre (DEC) in Expo City</h2>
              <p>
                As Dubai’s next-generation mega-exhibition hub adjacent to Al Maktoum International Airport, DEC hosts world-class trade shows, summits, and large-format country pavilions requiring deep engineering and logistical rigor.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Permits &amp; Approvals</small>
                <h3>Expo City Dubai HSE Compliance</h3>
                <p>
                  We coordinate all mandatory DEC venue documentation: architectural 3D elevations, structural calculations for high elements, Civil Defence approvals, and vehicle access passes.
                </p>
              </article>
              <article className="cap-card">
                <small>Scale &amp; Height</small>
                <h3>Double-Decker &amp; High-Bay Builds</h3>
                <p>
                  Leveraging DEC’s generous ceiling clearances, we engineer multi-tier VIP lounges, soaring overhead branded fascias, and heavy product display platforms.
                </p>
              </article>
              <article className="cap-card">
                <small>Workshop Precision</small>
                <h3>Trial Pre-Assembly in UAE Facility</h3>
                <p>
                  Every curved counter, modular joinery element, and illuminated lightbox is test-assembled in our Al Qusais facility before transport, guaranteeing zero fitting delays on the DEC floor.
                </p>
              </article>
              <article className="cap-card">
                <small>Rapid Adaptation</small>
                <h3>Fast Turnarounds Under Pressure</h3>
                <p>
                  When exhibitor scopes expand close to opening, our local in-house manufacturing capacity allows us to build and install additional display components overnight.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Verified DEC Proof */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Production Proof</span>
              <h2>Proven Delivery at Expo City Dubai</h2>
              <p>Real-world evidence of delivering complex exhibition stands under fixed event deadlines.</p>
            </div>
            <div className="capability-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
              <article className="cap-card">
                <small>National Pavilion</small>
                <h3>Kazakhstan National Pavilion (168 sqm)</h3>
                <p>
                  Delivered the 28m x 6m country pavilion at Gulfood at Expo City. When participating exhibitors confirmed last-minute chilled meat and dairy display requirements, EGS re-engineered the layout and installed 5–6 branded chillers before hall opening.
                </p>
                <a href="/case-studies#kazakhstan-pavilion-gulfood" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>View Case Study →</a>
              </article>
              <article className="cap-card">
                <small>Institutional Production</small>
                <h3>HCT ExpoCity Convocations</h3>
                <p>
                  Executed large-format staging, VIP protocol hospitality setups, and high-definition AV backdrop walls at Dubai ExpoCity Exhibition Center for institutional convocation ceremonies.
                </p>
                <a href="/graduation-portfolio" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>View Staging Portfolio →</a>
              </article>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Frequently Asked Questions — DEC Stand Construction</h2>
              <p>Essential guidance on stand fabrication, permits, and build timelines at Dubai Exhibition Centre.</p>
            </div>
            <FAQSection faqs={decFaqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="section-band">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Exhibiting at Dubai Exhibition Centre in Expo City?</h2>
              <p>Send us your stand dimensions, hall allocation, and design brief for a prompt, itemized turnkey proposal.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get DEC Stand Proposal →
              </InquiryCtaButton>
              <a href="https://wa.me/971524587992" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                WhatsApp Us Directly
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
