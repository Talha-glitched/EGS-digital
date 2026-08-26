import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import { images } from './siteData.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const contractorFaqs = [
  [
    'Does EGS fabricate exhibition stands in-house in Dubai?',
    'Yes. All structural joinery, CNC cutting, painting, acrylic displays, metal framing, and large-format graphics are produced directly in our UAE workshops in Al Qusais and Sharjah. Having our own facility gives us direct control over quality and allows us to execute urgent, late-stage adaptations without subcontractor delays.',
  ],
  [
    'How do you manage Dubai World Trade Centre (DWTC) regulations and approvals?',
    'EGS handles all mandatory venue submissions including architectural 3D drawings, structural stability calculations, Civil Defence compliance, electrical load schematics, and contractor access badges. We ensure your stand is certified before move-in begins.',
  ],
  [
    'What is included in a turnkey exhibition stand contract?',
    'Our turnkey scope includes 3D concept design, venue permits, structural fabrication, logistics, after-hours installation, electrical wiring and lighting, AV screen integration, furniture, graphics printing, on-site stand management throughout show days, and post-event dismantling and storage.',
  ],
  [
    'Can EGS accommodate late brief changes before the exhibition opens?',
    'Yes, when the change is physically feasible and safe within the venue schedule. Our local fabrication team has proven this repeatedly—such as reconfiguring the Philips Riyadh healthcare stand joinery with 10 hours notice and adding overnight display pedestals for Kazakhstan Pavilion at Gulfood.',
  ],
  [
    'What information is needed to receive an accurate stand quote?',
    'Please share your show name, stand dimensions (e.g., 6x6m, 12x8m), open sides (island, corner, peninsula, or shell scheme), floorplan, target budget, and core functional needs (meeting rooms, demo counters, LED screens, storage).',
  ],
];

export default function ExhibitionStandContractorDubaiPage() {
  usePageLifecycle('Exhibition Stand Contractor Dubai | In-House Turnkey Fabrication | EGS', {
    revealSelector: '.contractor-page .reveal',
    description: 'Premier exhibition stand contractor in Dubai. Direct in-house joinery workshop, turnkey custom booth construction, DWTC approvals, and opening-day delivery.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Exhibition Stand Contractor Dubai',
        description: 'In-house exhibition stand contractor delivering custom booth fabrication, joinery, structural permits, and turnkey show-day management across Dubai and the UAE.',
        serviceType: 'Exhibition Stand Contractor',
        url: '/exhibition-stand-contractor-dubai',
      },
      faqs: contractorFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Exhibition Stand Contractor Dubai', url: '/exhibition-stand-contractor-dubai' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page exhibitions-page contractor-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        {/* Hero Section */}
        <section className="exhibitions-hero" aria-label="Exhibition Stand Contractor Dubai Hero">
          <img
            className="exhibitions-hero-media"
            src={images.phillips2}
            alt="Custom exhibition stand built by Dubai contractor EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">In-House UAE Fabrication &amp; Engineering Since 2010</span>
            <h1>Exhibition Stand Contractor in Dubai — In-House Fabrication &amp; Turnkey Delivery</h1>
            <p>
              Direct workshop capabilities, DWTC safety compliance, and zero middleman markups. We engineer, fabricate, and deliver custom exhibition stands that are fully snagged and ready before the hall opens.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Request Stand Quotation →
              </InquiryCtaButton>
              <a href="/case-studies#philips-global-health-riyadh" className="btn btn-ghost">
                View Production Proof
              </a>
            </div>
          </div>
        </section>

        {/* Core Differentiation: In-House vs Broker */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Production Reality</span>
              <h2>The In-House Contractor Advantage vs. Middleman Brokers</h2>
              <p>
                In Dubai’s exhibition sector, many agencies act as brokers who resell third-party carpenter capacity. When schedules compress or stand specifications change on the floor, brokers lose control. EGS operates our own dedicated facility.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Capability 01</small>
                <h3>Carpentry &amp; CNC Joinery</h3>
                <p>
                  Precision timber structures, custom counters, meeting pods, raised flooring, and curved walls fabricated in our Al Qusais workshop.
                </p>
              </article>
              <article className="cap-card">
                <small>Capability 02</small>
                <h3>Paint &amp; High-End Finishes</h3>
                <p>
                  Automotive-grade spray painting, laminate cladding, metal trimming, and seamless acrylic work built to withstand high visitor traffic.
                </p>
              </article>
              <article className="cap-card">
                <small>Capability 03</small>
                <h3>Large-Format Graphics &amp; 3D Logos</h3>
                <p>
                  High-resolution UV printing, backlit fabric lightboxes, dimensional illuminated signage, and edge-lit branding produced in-house.
                </p>
              </article>
              <article className="cap-card">
                <small>Capability 04</small>
                <h3>Structural Engineering &amp; Permits</h3>
                <p>
                  Complete submission packages for Dubai World Trade Centre (DWTC), ADNEC, and DEC civil defence approvals and structural load calculations.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Turnkey Project Chain */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>End-to-End Turnkey Execution Chain</h2>
              <p>
                From initial 3D conceptualization through to show-day snagging and post-event removal, one accountable team manages your exhibition presence.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Phase 01</small>
                <h3>3D Stand Design &amp; Optimization</h3>
                <p>
                  Detailed 3D architectural renders, visitor journey mapping, product demo placement, and procurement-ready material specifications.
                </p>
              </article>
              <article className="cap-card">
                <small>Phase 02</small>
                <h3>Workshop Pre-Assembly</h3>
                <p>
                  Critical joinery elements are test-fitted in our workshop prior to transport, ensuring zero sizing mismatches during venue move-in windows.
                </p>
              </article>
              <article className="cap-card">
                <small>Phase 03</small>
                <h3>Overnight Venue Installation</h3>
                <p>
                  Dedicated installation crews manage electrical wiring, lighting focus, graphic mounting, and AV screen tuning under strict venue safety standards.
                </p>
              </article>
              <article className="cap-card">
                <small>Phase 04</small>
                <h3>On-Site Support &amp; Handover</h3>
                <p>
                  A dedicated project manager is present on the exhibition floor throughout the event for immediate adjustments, maintenance, and teardown.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Major Trade Shows We Support */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Trade Shows We Build For in Dubai &amp; Abu Dhabi</h2>
              <p>
                Experienced in venue access rules, rigging guidelines, and hall restrictions across the UAE’s primary exhibition centres.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>DWTC Dubai</small>
                <h3>GITEX Global</h3>
                <p>High-tech custom booths with integrated LED walls, live demo kiosks, and high-impact overhead branding.</p>
                <a href="/events/gitex-exhibition-stands" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Explore GITEX Stands →</a>
              </article>
              <article className="cap-card">
                <small>DWTC Dubai</small>
                <h3>Arab Health &amp; Medlab</h3>
                <p>Clinical-grade healthcare pavilions, heavy diagnostic equipment floor-load reinforcement, and VIP consultation suites.</p>
                <a href="/events/arab-health-exhibition-stands" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Explore Arab Health Stands →</a>
              </article>
              <article className="cap-card">
                <small>DWTC Dubai</small>
                <h3>Gulfood</h3>
                <p>Multi-brand food &amp; beverage pavilions, commercial sampling counters, chilled display integration, and hospitality lounges.</p>
                <a href="/events/gulfood-exhibition-stands" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Explore Gulfood Stands →</a>
              </article>
              <article className="cap-card">
                <small>ADNEC Abu Dhabi</small>
                <h3>ADIPEC &amp; IDEX</h3>
                <p>Energy and industrial pavilions built under stringent ADNEC safety and structural engineering protocols.</p>
                <a href="/exhibition-stand-contractor-abu-dhabi" className="nav-card-link" style={{ marginTop: '12px', display: 'inline-block' }}>Explore Abu Dhabi Stands →</a>
              </article>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Frequently Asked Questions — Exhibition Contractor Services</h2>
              <p>Direct answers regarding in-house fabrication, pricing transparency, and move-in timelines.</p>
            </div>
            <FAQSection faqs={contractorFaqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Lock In Your Stand Contractor for Your Next Exhibition</h2>
              <p>Send your booth dimensions, hall number, and brand requirements. EGS will provide an itemized proposal within 24 hours.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Send Your Project Brief →
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
