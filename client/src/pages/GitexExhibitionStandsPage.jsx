import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import EventHero from '../components/events/EventHero.jsx';
import healthtechStand from '../assets/Exhibition Stands/healthtech.jpg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const gitexFaqs = [
  [
    'When should we book our GITEX Global exhibition stand contractor?',
    'Due to massive demand across Dubai World Trade Centre (DWTC) and Dubai Harbour, we recommend booking your stand contractor at least 8 to 12 weeks prior to GITEX to secure early DWTC engineering permits, rigging slots, and optimal fabrication schedules.',
  ],
  [
    'What technology elements do you integrate for GITEX booths?',
    'We integrate curved high-lumen LED video walls, interactive touchscreen product kiosks, live software demo workstations, VR demonstration enclosures, and concealed server rack housing.',
  ],
  [
    'Do you handle fast-track builds and late-stage hardware setups?',
    'Yes. Our Dubai workshop is 15 minutes from DWTC, allowing our technical teams to provide rapid on-site carpentry adjustments and hardware integration throughout the move-in window.',
  ],
];

export default function GitexExhibitionStandsPage() {
  usePageLifecycle('GITEX Global Exhibition Stand Builder Dubai | DWTC Booths | EGS', {
    revealSelector: '.gitex-page .reveal',
    description: 'Custom exhibition stand contractor for GITEX Global at Dubai World Trade Centre (DWTC). Tech-focused 3D booth design, LED integration, and turnkey delivery.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'GITEX Global Exhibition Stand Contractor Dubai',
        description: 'Bespoke tech exhibition stand design, LED integration, hardware demo counters, and DWTC booth construction for GITEX Global.',
        serviceType: 'Exhibition Stand Contractor GITEX',
        url: '/events/gitex-exhibition-stands',
      },
      faqs: gitexFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'GITEX Exhibition Stands', url: '/events/gitex-exhibition-stands' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page gitex-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        <EventHero
          kicker="GITEX Global & Expand North Star • DWTC Dubai"
          title="GITEX Global Exhibition Stand Builder in Dubai"
          subline="Command attention at the world’s largest tech showcase. We engineer high-impact, LED-integrated custom exhibition booths designed for SaaS demos, investor meetings, and brand dominance at DWTC."
          bgImage={healthtechStand}
          bgAlt="GITEX Global custom tech exhibition stand at DWTC Dubai"
          primaryCtaText="Book GITEX Stand Contractor →"
          secondaryCtaLink="/exhibition-stand-contractor-dubai"
          secondaryCtaText="Dubai Contractor Capabilities"
          trustItems={[
            '15 Min from DWTC Halls',
            'LED Walls & AV Rigging Approvals',
            'Dedicated Move-In Standby Crew',
          ]}
          showcase={{
            badge: 'Tech Showcase Build',
            image: healthtechStand,
            imageAlt: 'GITEX custom tech exhibition stand with LED integration',
            title: 'High-Tech Showcase Pavilion',
            description: 'Bespoke tech exhibition booth featuring curved video walls, live software demonstration pods, and executive discussion lounges.',
            specs: [
              { value: '180 SQM', label: 'Stand Area' },
              { value: 'DWTC', label: 'Venue' },
              { value: '4K LED', label: 'AV Rigging' },
            ],
          }}
        />

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Tech Showcase Engineering</span>
              <h2>Purpose-Built Features for GITEX Exhibitors</h2>
              <p>
                Engineered to handle complex AV hardware, heavy tech footfall, and high-stakes B2B lead capture.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>GITEX Feature 01</small>
                <h3>Integrated High-Resolution LED Walls</h3>
                <p>Flush-fitted LED display walls and hanging video cubes designed to showcase software dashboards and corporate brand reels.</p>
              </article>
              <article className="cap-card">
                <small>GITEX Feature 02</small>
                <h3>Live Product &amp; SaaS Demo Pods</h3>
                <p>Interactive demo stations with integrated cabling, lockable hardware enclosures, and tablet mounting for live client testing.</p>
              </article>
              <article className="cap-card">
                <small>GITEX Feature 03</small>
                <h3>Private Executive Lounges</h3>
                <p>Enclosed meeting rooms with acoustic dampening, custom executive joinery, and private catering stations for partnership meetings.</p>
              </article>
              <article className="cap-card">
                <small>GITEX Feature 04</small>
                <h3>DWTC Rigging &amp; Overhead Banners</h3>
                <p>Structural calculations and certified rigging installations maximizing overhead brand visibility across massive DWTC halls.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>GITEX Stand Contractor FAQs</h2>
            </div>
            <FAQSection faqs={gitexFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Secure Your GITEX Global Exhibition Stand with EGS</h2>
              <p>Send your hall number and booth size. Our DWTC-specialist team will provide 3D concept options.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get GITEX Proposal →
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
