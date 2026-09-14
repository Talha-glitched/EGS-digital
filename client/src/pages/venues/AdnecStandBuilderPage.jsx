import pageStyles from '../../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../../hooks/usePageLifecycle.js';
import { Navbar } from '../../components/Navbar.jsx';
import { FAQSection, Footer } from '../SiteChrome.jsx';
import InquiryCtaButton from '../../components/inquiry/InquiryCtaButton.jsx';
import { images } from '../siteData.js';
import { buildPageSchemaBundle } from '../../utils/schemaGenerator.js';

const adnecFaqs = [
  [
    'Does EGS operate as an approved stand contractor at ADNEC Abu Dhabi?',
    'Yes. EGS has delivered large-scale institutional and commercial builds at Abu Dhabi National Exhibition Centre (ADNEC) for years, including annual multi-hall convocation stages for Higher Colleges of Technology (HCT) accommodating over 5,000 guests, as well as commercial pavilions at ADIPEC.',
  ],
  [
    'How does EGS handle logistics from Dubai to ADNEC Abu Dhabi?',
    'We fabricate and pre-assemble all stand joinery, metal framing, and graphics in our UAE workshops. For ADNEC deliveries, we deploy dedicated covered transport fleets with pre-scheduled venue marshaling passes, ensuring materials arrive on site on schedule without transit damage.',
  ],
  [
    'What are ADNEC’s height limitations and structural permit requirements?',
    'ADNEC permits standard single-storey exhibition stands up to 4.0 metres in most halls, with higher architectural elements and double-decker structures requiring certified structural engineer calculations, ADNEC Health, Safety & Environment (HSE) approval, and Abu Dhabi Civil Defence certification.',
  ],
  [
    'What shows at ADNEC do you build stands for?',
    'We build stands and pavilions for ADNEC’s headline exhibitions, including ADIPEC (Energy & Petroleum), IDEX & NAVDEX (Defense), Abu Dhabi International Boat Show, UMEX, and World Future Energy Summit (WFES), as well as government and institutional ceremonies.',
  ],
  [
    'Are your installation teams available on site throughout the show in Abu Dhabi?',
    'Yes. Every ADNEC project is managed by a dedicated on-site project supervisor and technical team stationed in Abu Dhabi throughout move-in, exhibition show days, and post-event breakdown.',
  ],
];

export default function AdnecStandBuilderPage() {
  usePageLifecycle('ADNEC Exhibition Stand Builder Abu Dhabi | Stand Contractor | EGS', {
    revealSelector: '.venue-page .reveal',
    description: 'Premier exhibition stand builder for ADNEC Abu Dhabi. In-house fabrication, Abu Dhabi venue permits, ADIPEC booths, and turnkey delivery at ADNEC halls.',
    ogImage: images.hctProfile,
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'ADNEC Exhibition Stand Builder Abu Dhabi',
        description: 'Turnkey exhibition stand contractor specializing in custom booth design, structural fabrication, ADNEC HSE permits, and turnkey show-day delivery at Abu Dhabi National Exhibition Centre.',
        serviceType: 'Exhibition Stand Contractor',
        url: '/venues/adnec-exhibition-stand-builder',
      },
      faqs: adnecFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Venues', url: '/venues/adnec-exhibition-stand-builder' },
        { name: 'ADNEC Stand Builder', url: '/venues/adnec-exhibition-stand-builder' },
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
        <section className="exhibitions-hero" aria-label="ADNEC Exhibition Stand Builder Hero">
          <img
            className="exhibitions-hero-media"
            src={images.hctProfile}
            alt="Custom stage and exhibition structure built at ADNEC Abu Dhabi by contractor EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Abu Dhabi National Exhibition Centre (ADNEC) Specialist</span>
            <h1>Exhibition Stand Builder at ADNEC Abu Dhabi — Turnkey Fabrication &amp; Engineering</h1>
            <p>
              Proven capital-venue delivery. From energy pavilions at ADIPEC to grand institutional staging across ADNEC’s largest halls, EGS delivers bespoke exhibition stands with full venue safety approvals and zero subcontractor delays.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Request ADNEC Stand Quote →
              </InquiryCtaButton>
              <a href="/exhibition-stand-contractor-abu-dhabi" className="btn btn-ghost">
                Explore Abu Dhabi Services
              </a>
            </div>
          </div>
        </section>

        {/* Venue Mastery */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Capital Venue Authority</span>
              <h2>Delivering at Abu Dhabi National Exhibition Centre (ADNEC)</h2>
              <p>
                ADNEC enforces strict Health, Safety, and Environment (HSE) standards and detailed structural submission protocols. EGS manages every phase from initial 3D renders to final venue handover.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Permits &amp; Approvals</small>
                <h3>ADNEC HSE &amp; Civil Defence Compliance</h3>
                <p>
                  We manage all required venue paperwork: third-party structural calculations, flame-retardant material certificates, electrical schematics, and contractor access accreditations.
                </p>
              </article>
              <article className="cap-card">
                <small>Cross-Emirate Logistics</small>
                <h3>Dedicated Abu Dhabi Transport</h3>
                <p>
                  Our workshop pre-assembles and packs all booth joinery in Al Qusais before dispatching via dedicated transport fleets directly to ADNEC marshaling yards, ensuring zero transit surprises.
                </p>
              </article>
              <article className="cap-card">
                <small>Heavy Engineering</small>
                <h3>Double-Decker &amp; Large Pavilions</h3>
                <p>
                  Experienced in fabricating multi-level corporate lounges, heavy machinery demo floors, and large national country pavilions designed to maximize visibility across ADNEC’s soaring halls.
                </p>
              </article>
              <article className="cap-card">
                <small>Continuous Presence</small>
                <h3>On-Site Abu Dhabi Project Crew</h3>
                <p>
                  Our technical crews and project supervisors remain on site in Abu Dhabi throughout build-up, show days, and breakdown for instant technical support, cleaning, and maintenance.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Major ADNEC Expos */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Major Annual Shows at ADNEC Abu Dhabi</h2>
              <p>
                Trusted contractor experience across the capital’s highest-profile business and government exhibitions.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>November | ADNEC</small>
                <h3>ADIPEC (Energy &amp; Petroleum)</h3>
                <p>Global energy pavilions, industrial equipment staging, corporate executive lounges, and interactive engineering displays.</p>
                <a href="/exhibition-stand-contractor-abu-dhabi" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>ADIPEC Stand Details →</a>
              </article>
              <article className="cap-card">
                <small>February | ADNEC</small>
                <h3>IDEX &amp; NAVDEX</h3>
                <p>High-security defense exhibits, heavy tactical vehicle display platforms, and secure bilateral meeting suites.</p>
                <a href="/exhibition-stand-contractor-abu-dhabi" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Defense Pavilions →</a>
              </article>
              <article className="cap-card">
                <small>January | ADNEC</small>
                <h3>World Future Energy Summit (WFES)</h3>
                <p>Clean energy, sustainability, and green technology booths built with modern architectural finishes and LED integrations.</p>
                <a href="/custom-exhibition-stands-dubai" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Sustainable Booths →</a>
              </article>
              <article className="cap-card">
                <small>Annual | ADNEC</small>
                <h3>Institutional Convocations</h3>
                <p>Grand multi-hall institutional graduation staging, curved LED backdrop walls, and VIP protocol seating for over 5,000 guests.</p>
                <a href="/case-studies#hct-graduation-program" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Explore HCT Staging →</a>
              </article>
            </div>
          </div>
        </section>

        {/* Verified ADNEC Proof */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Production Proof</span>
              <h2>Verified Scale at ADNEC Abu Dhabi</h2>
              <p>Real-world delivery records across ADNEC’s main exhibition and convention halls.</p>
            </div>
            <div className="capability-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
              <article className="cap-card">
                <small>Institutional Production</small>
                <h3>HCT Abu Dhabi Convocation at ADNEC</h3>
                <p>
                  In 2025, EGS delivered the flagship HCT Abu Dhabi ceremony across ADNEC Halls for 1,668 graduates and 5,000 guests. In 2024, EGS delivered the ceremony for 1,500 graduates and 4,500 guests, managing full arena staging, acoustic screens, and royal protocol seating.
                </p>
                <a href="/case-studies#hct-graduation-program" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>View Case Study →</a>
              </article>
              <article className="cap-card">
                <small>Cross-Border Exhibition</small>
                <h3>Philips Healthcare &amp; GCC Projects</h3>
                <p>
                  Proven capability mobilizing large custom joinery components across borders and Emirates, delivering turnkey defect-free booths that open on time under strict venue supervision.
                </p>
                <a href="/case-studies#philips-global-health-riyadh" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>View Production Proof →</a>
              </article>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Frequently Asked Questions — ADNEC Stand Building</h2>
              <p>Everything you need to know about contractor permits, logistics, and builds at Abu Dhabi National Exhibition Centre.</p>
            </div>
            <FAQSection faqs={adnecFaqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Exhibiting at ADNEC Abu Dhabi?</h2>
              <p>Partner with an experienced UAE contractor. Share your hall details and stand specs for an itemized proposal within 24 hours.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get ADNEC Stand Proposal →
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
