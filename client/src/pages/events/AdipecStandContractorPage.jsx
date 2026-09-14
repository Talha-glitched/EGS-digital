import pageStyles from '../../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../../hooks/usePageLifecycle.js';
import { Navbar } from '../../components/Navbar.jsx';
import { FAQSection, Footer } from '../SiteChrome.jsx';
import InquiryCtaButton from '../../components/inquiry/InquiryCtaButton.jsx';
import EventHero from '../../components/events/EventHero.jsx';
import { images } from '../siteData.js';
import { buildPageSchemaBundle } from '../../utils/schemaGenerator.js';

const adipecFaqs = [
  [
    'What types of stands does EGS build for ADIPEC at ADNEC Abu Dhabi?',
    'We design and fabricate custom corporate pavilions, double-decker VIP executive lounges, high-tech industrial demonstration booths, and national oil company pavilions tailored to energy, clean tech, and heavy engineering exhibitors.',
  ],
  [
    'How do you manage ADNEC HSE and Civil Defence approvals for ADIPEC?',
    'EGS handles all mandatory ADNEC engineering and Health, Safety & Environment (HSE) submissions, including flame-retardant paint certifications, structural stability reports for elevated structures, electrical distribution schematics, and contractor marshaling passes.',
  ],
  [
    'Can EGS accommodate heavy equipment displays and reinforced flooring at ADIPEC?',
    'Yes. Energy and industrial exhibitors frequently require heavy valve, pump, or robotic equipment staging. We calculate floor point loads, construct reinforced steel-and-timber plinths, and provide concealed high-voltage cable routing.',
  ],
  [
    'How early should an international exhibitor book their ADIPEC stand contractor?',
    'ADIPEC is one of the world’s largest energy conferences. We strongly advise confirming your contractor 8 to 12 weeks in advance to ensure preferred fabrication schedules, ADNEC engineering sign-offs, and seamless cross-Emirate logistics.',
  ],
  [
    'Do you provide on-site technical support during the 4 days of ADIPEC?',
    'Yes. Our Abu Dhabi dedicated project crew and supervisor remain on site throughout the exhibition for daily touch-ups, audio-visual monitoring, and rapid post-event dismantling.',
  ],
];

export default function AdipecStandContractorPage() {
  usePageLifecycle('ADIPEC Stand Contractor Abu Dhabi | Custom Booths at ADNEC | EGS', {
    revealSelector: '.adipec-page .reveal',
    description: 'Custom exhibition stand contractor for ADIPEC at ADNEC Abu Dhabi. Energy pavilions, double-decker VIP lounges, ADNEC HSE permits, and turnkey build.',
    ogImage: images.phillips2,
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'ADIPEC Exhibition Stand Contractor Abu Dhabi',
        description: 'Turnkey exhibition stand design and build contractor for ADIPEC at ADNEC Abu Dhabi, specializing in energy pavilions, executive suites, and reinforced industrial displays.',
        serviceType: 'Exhibition Stand Contractor ADIPEC',
        url: '/events/adipec-stand-contractor',
      },
      faqs: adipecFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'ADIPEC Stand Contractor', url: '/events/adipec-stand-contractor' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page adipec-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        {/* Hero Section */}
        <EventHero
          kicker="ADIPEC Abu Dhabi • ADNEC Specialist Contractor"
          title="ADIPEC Exhibition Stand Contractor at ADNEC Abu Dhabi"
          subline="Built for the world’s premier energy conference. From ministerial VIP suites to heavy equipment staging and HSE certifications, we deliver turnkey exhibition stands at ADNEC with zero middleman delays."
          bgImage={images.phillips2}
          bgAlt="ADIPEC custom energy exhibition stand at ADNEC Abu Dhabi by contractor EGS"
          primaryCtaText="Book ADIPEC Stand Contractor →"
          secondaryCtaLink="/venues/adnec-exhibition-stand-builder"
          secondaryCtaText="Explore ADNEC Venue Services"
          trustItems={[
            'Full ADNEC HSE & Civil Defence Permits',
            'Heavy Equipment Load Distribution',
            'Dedicated Abu Dhabi Standby Crew',
          ]}
          showcase={{
            badge: 'Energy Sector Build',
            image: images.phillips2,
            imageAlt: 'Custom energy corporate pavilion at ADNEC Abu Dhabi',
            title: 'Energy Innovation Pavilion',
            description: 'Turnkey exhibition stand built to rigorous ADNEC HSE standards featuring structural meeting mezzanines, flame-retardant joinery, and heavy valve staging.',
            specs: [
              { value: 'Turnkey', label: 'Build Scope' },
              { value: 'ADNEC', label: 'Venue' },
              { value: 'HSE Permitted', label: 'Compliance' },
            ],
          }}
        />

        {/* Core Capabilities */}
        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Energy Sector Engineering</span>
              <h2>Purpose-Built Features for ADIPEC Exhibitors</h2>
              <p>
                Engineered to meet the stringent technical, security, and hospitality demands of international energy leaders.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Feature 01</small>
                <h3>Acoustic VIP &amp; Ministerial Lounges</h3>
                <p>Private, sound-insulated meeting rooms engineered for high-level bilateral commercial negotiations and executive briefings.</p>
              </article>
              <article className="cap-card">
                <small>Feature 02</small>
                <h3>Reinforced Equipment Display Floors</h3>
                <p>Heavy point-load engineering for valves, drilling equipment, robotics, and industrial scale models with concealed 380V power feeds.</p>
              </article>
              <article className="cap-card">
                <small>Feature 03</small>
                <h3>Interactive Energy Media &amp; LED Walls</h3>
                <p>Curved high-brightness LED walls, touch tables, and 3D hologram enclosures for presenting exploration and transition data.</p>
              </article>
              <article className="cap-card">
                <small>Feature 04</small>
                <h3>Full ADNEC HSE &amp; Civil Defence Permits</h3>
                <p>Complete handling of ADNEC Health, Safety &amp; Environment approvals, structural load stamps, and flame-retardant certifications.</p>
              </article>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Frequently Asked Questions — ADIPEC Stand Building</h2>
              <p>Expert answers regarding stand construction, timelines, and permits at ADNEC Abu Dhabi.</p>
            </div>
            <FAQSection faqs={adipecFaqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Lock In Your Stand Contractor for ADIPEC Abu Dhabi</h2>
              <p>Share your hall location, stand footprint, and functional requirements for a comprehensive proposal within 24 hours.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get ADIPEC Stand Proposal →
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
