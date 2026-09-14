import { useParams, Link } from 'react-router-dom';
import standardStyles from '../styles/pages/standard-content.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import { images } from './siteData.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const YEAR_DATA = {
  '2025': {
    year: '2025',
    title: 'UAE Graduation Ceremonies 2025 Production Record | HCT & Institutional Staging | EGS',
    h1: 'UAE Graduation Ceremonies 2025 — Full Production Across 7 Grand Convocations',
    description: 'Verified record of 7 grand UAE graduation ceremonies produced by EGS in 2025 for 4,500 graduates and 13,500 guests across ADNEC Abu Dhabi, Grand Hyatt Dubai, Zayed Sports Complex, and Sharjah.',
    stats: [
      { label: 'Graduates Honored', val: '4,500+' },
      { label: 'Guests & Dignitaries', val: '13,500+' },
      { label: 'Ceremonies Delivered', val: '7 Grand Shows' },
      { label: 'Emirates Covered', val: '5 Emirates' },
    ],
    venues: [
      {
        campus: 'HCT Abu Dhabi',
        venue: 'ADNEC Halls, Abu Dhabi',
        grads: '1,668 Graduates',
        guests: '5,000 Guests',
        scope: 'Full arena staging, massive curved LED backdrop, royal VIP protocol seating, live broadcast feeds, and acoustic audio distribution.',
      },
      {
        campus: 'HCT Dubai',
        venue: 'Grand Hyatt Dubai',
        grads: '602 Graduates',
        guests: '2,200 Guests',
        scope: 'Ballroom staging, bespoke graduate processional ramps, multi-tier dignitary dais, and integrated media display columns.',
      },
      {
        campus: 'HCT Fujairah',
        venue: 'Zayed Sports Complex, Fujairah',
        grads: '535 Graduates',
        guests: '1,800 Guests',
        scope: 'Sports arena stage transformation, plus an overnight 5-6 metre stage extension delivered within a 10-hour window before showtime.',
      },
      {
        campus: 'HCT Sharjah',
        venue: 'University City Hall, Sharjah',
        grads: '937 Graduates (2 Sessions)',
        guests: '3,000 Guests',
        scope: 'Heritage auditorium staging, dual convocation session timing, LED presentation synchronisation, and graduate marshaling signage.',
      },
      {
        campus: 'HCT Ras Al Khaimah',
        venue: 'RAK Campus Sports Hall',
        grads: '576 Graduates',
        guests: '1,800 Guests',
        scope: 'Complete gymnasium acoustics treatment, raised ceremonial stage, carpeted subfloor, and ambient architectural lighting.',
      },
      {
        campus: 'RAK American Academy',
        venue: 'RAK American Academy Auditorium',
        grads: '60 Graduates',
        guests: '1,200 Guests',
        scope: 'Intimate school convocation setup, floral stage decor, high-definition projection, and graduation diploma distribution staging.',
      },
    ],
    faqs: [
      [
        'How many ceremonies did EGS deliver across the UAE in the 2025 graduation season?',
        'EGS delivered seven grand convocation ceremonies in 2025 across five Emirates (Abu Dhabi, Dubai, Sharjah, Fujairah, and Ras Al Khaimah) serving over 4,500 graduates and 13,500 guests for Higher Colleges of Technology (HCT) and institutional partners.',
      ],
      [
        'What production elements does EGS handle for major graduations?',
        'Our turnkey scope encompasses ceremonial stage design and joinery, high-lumen curved LED video backdrops, professional line-array sound distribution, theatrical lighting rigs, royal/VIP protocol hospitality seating, security clearances, and graduate queue flow management.',
      ],
      [
        'How did EGS handle the Fujairah emergency stage extension in 2025?',
        'Ten hours prior to the Fujairah convocation at Zayed Sports Complex, the client required an additional 5-6 metre stage extension. EGS sourced materials, transported them to Fujairah, constructed the custom wooden stage extension, and handed over on schedule before doors opened.',
      ],
    ],
  },
  '2024': {
    year: '2024',
    title: 'UAE Graduation Ceremonies 2024 Production Record | Arena Staging & AV | EGS',
    h1: 'UAE Graduation Ceremonies 2024 — 8 Grand Convocations Across the UAE',
    description: 'Verified production record of 8 institutional graduation ceremonies delivered by EGS in 2024 for 3,500 graduates and 10,000 guests, including Coca-Cola Arena Dubai and ADNEC Abu Dhabi.',
    stats: [
      { label: 'Graduates Honored', val: '3,500+' },
      { label: 'Guests & Families', val: '10,000+' },
      { label: 'Grand Ceremonies', val: '8 Convocations' },
      { label: 'Key Mega-Venue', val: 'Coca-Cola Arena' },
    ],
    venues: [
      {
        campus: 'HCT Dubai Arena Show',
        venue: 'Coca-Cola Arena, Dubai',
        grads: '580 Graduates',
        guests: '2,000 Guests',
        scope: 'World-class arena staging, high-elevation rigging, massive LED backdrop wall, VIP dignitary seating, and arena-grade acoustic tuning.',
      },
      {
        campus: 'HCT Abu Dhabi Convocation',
        venue: 'ADNEC Halls, Abu Dhabi',
        grads: '1,500 Graduates',
        guests: '4,500 Guests',
        scope: 'Multi-hall convention staging, extended processional runway, royal protocol seating, and multi-camera live broadcast feeds.',
      },
      {
        campus: 'HCT Sharjah Convocation',
        venue: 'University City Hall, Sharjah',
        grads: '820 Graduates',
        guests: '2,500 Guests',
        scope: 'Symphonic hall staging, laser projection, custom podium craftsmanship, and synchronized stage lighting for graduate walkouts.',
      },
      {
        campus: 'HCT Northern Emirates',
        venue: 'Ras Al Khaimah & Fujairah, UAE',
        grads: '930 Graduates',
        guests: '3,100 Guests',
        scope: 'Simultaneous multi-campus event delivery across Northern Emirates with complete stage, sound, lighting, and guest coordination.',
      },
    ],
    faqs: [
      [
        'What was the highlight of the 2024 graduation production season?',
        'A key milestone was delivering the HCT Dubai graduation ceremony inside Coca-Cola Arena, utilizing the arena’s massive rigging grid and staging infrastructure to provide a world-class commencement experience.',
      ],
      [
        'How many total attendees were hosted during the 2024 season?',
        'Over 3,500 graduates crossed the stage before an aggregate audience exceeding 10,000 guests, family members, ministers, and institutional leadership across 8 grand ceremonies.',
      ],
    ],
  },
  '2023': {
    year: '2023',
    title: 'UAE Graduation Ceremonies 2023 Production Showcase | EGS UAE',
    h1: 'UAE Graduation Ceremonies 2023 — Multi-Campus Institutional Commencement Staging',
    description: 'Production record of institutional graduation ceremony staging delivered across Dubai, Abu Dhabi, and Northern Emirates by EGS in 2023.',
    stats: [
      { label: 'Graduates Honored', val: '3,000+' },
      { label: 'Guests Attending', val: '8,500+' },
      { label: 'Campuses United', val: '7 Campuses' },
      { label: 'Client Relationship', val: '7+ Years' },
    ],
    venues: [
      {
        campus: 'HCT UAE Multi-Campus Season',
        venue: 'Abu Dhabi, Dubai, Sharjah & Northern Emirates',
        grads: '3,000+ Graduates',
        guests: '8,500+ Guests',
        scope: 'Multi-campus convocation staging, turnkey AV production, LED backdrops, royal protocol coordination, and bespoke ceremony branding.',
      },
    ],
    faqs: [
      [
        'Why do UAE universities choose EGS for commencement production year after year?',
        'Graduations have zero tolerance for failure—timelines cannot slip and dignitaries cannot be kept waiting. EGS provides dependable in-house staging fabrication, dedicated audio-visual engineering, and experienced protocol management.',
      ],
    ],
  },
};

export default function GraduationYearPage() {
  const { year = '2025' } = useParams();
  const data = YEAR_DATA[year] || YEAR_DATA['2025'];

  usePageLifecycle(data.title, {
    revealSelector: '.grad-year-page .reveal',
    description: data.description,
    ogImage: images.hctProfile,
    structuredData: buildPageSchemaBundle({
      service: {
        name: `UAE Graduation Ceremony Production ${data.year}`,
        description: data.description,
        serviceType: 'Graduation Ceremony Production',
        url: `/graduation-ceremonies-${data.year}`,
      },
      faqs: data.faqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Events', url: '/events' },
        { name: 'Graduation Portfolio', url: '/graduation-portfolio' },
        { name: `Graduations ${data.year}`, url: `/graduation-ceremonies-${data.year}` },
      ],
    }),
  });

  return (
    <>
      <style>{standardStyles}</style>
      <div className="standard-content-page grad-year-page">
        <Navbar active="events" />

        {/* Editorial Header */}
        <header className="editorial-hero">
          <div className="editorial-hero-inner">
            <nav className="editorial-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to="/events">Events</Link>
              <span>/</span>
              <Link to="/graduation-portfolio">Graduation Portfolio</Link>
              <span>/</span>
              <span>{data.year} Season</span>
            </nav>

            <div className="editorial-badge-row">
              <span className="editorial-badge">Class of {data.year}</span>
              <span className="editorial-meta-info">Institutional Production Record</span>
            </div>

            <h1 className="editorial-title">{data.h1}</h1>
            <p className="editorial-lead">{data.description}</p>

            <div className="editorial-actions">
              <InquiryCtaButton inquiryType="events" className="btn-editorial-primary">
                Plan Your Ceremony Production →
              </InquiryCtaButton>
              <Link to="/graduation-portfolio" className="btn-editorial-ghost">
                View Full Video &amp; Photo Archives
              </Link>
            </div>
          </div>
        </header>

        {/* Season Metrics Banner */}
        <section className="editorial-body-section" style={{ paddingBottom: '32px' }}>
          <div className="editorial-article-container" style={{ maxWidth: '1100px' }}>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--ochre)' }}>
                Scale &amp; Impact
              </span>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0 0' }}>
                {data.year} UAE Convocation Scale at a Glance
              </h2>
            </div>
            <div className="editorial-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {data.stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: '#FFFFFF',
                    padding: '24px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--rule)',
                    textAlign: 'center',
                    boxShadow: '0 2px 10px rgba(26, 23, 21, 0.04)',
                  }}
                >
                  <strong style={{ fontSize: '32px', color: 'var(--ochre)', display: 'block', fontWeight: 800, marginBottom: '6px' }}>
                    {s.val}
                  </strong>
                  <span style={{ fontSize: '13px', color: 'var(--ink-soft)', fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Venue Staging Deliveries */}
        <section className="editorial-body-section" style={{ paddingTop: '16px' }}>
          <div className="editorial-article-container" style={{ maxWidth: '1100px' }}>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--ochre)' }}>
                Campus Coverage
              </span>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0 0' }}>
                Ceremonies Delivered Across the Emirates in {data.year}
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--ink-soft)', marginTop: '6px' }}>
                Individual campus staging, venue adaptation, and audience logistics executed by EGS.
              </p>
            </div>
            <div className="editorial-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {data.venues.map((v) => (
                <article className="editorial-card" key={v.campus}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ochre)' }}>{v.venue}</span>
                    <h3 style={{ fontSize: '20px', margin: '8px 0' }}>{v.campus}</h3>
                    <div style={{ margin: '8px 0 14px', fontSize: '13px', color: 'var(--ink-soft)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <strong>{v.grads}</strong> &bull; <span>{v.guests}</span>
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink-2)', margin: 0 }}>{v.scope}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Season Switcher */}
        <section className="editorial-section-light" style={{ textAlign: 'center' }}>
          <div className="editorial-article-container" style={{ maxWidth: '780px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>
              Explore Other Graduation Seasons
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ink-soft)', marginBottom: '20px' }}>
              Review our year-over-year production track record across UAE institutional partners.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/graduation-ceremonies-2025" className={`btn-editorial-ghost btn-editorial-pill ${data.year === '2025' ? 'is-active' : ''}`}>
                2025 Season
              </Link>
              <Link to="/graduation-ceremonies-2024" className={`btn-editorial-ghost btn-editorial-pill ${data.year === '2024' ? 'is-active' : ''}`}>
                2024 Season
              </Link>
              <Link to="/graduation-ceremonies-2023" className={`btn-editorial-ghost btn-editorial-pill ${data.year === '2023' ? 'is-active' : ''}`}>
                2023 Season
              </Link>
              <Link to="/graduation-stage-setup-uae" className="btn-editorial-ghost btn-editorial-pill">
                Stage Setup Services
              </Link>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section style={{ background: 'var(--paper)', borderTop: '1px solid var(--rule-soft)', padding: 'clamp(40px, 6vw, 68px) 24px' }}>
          <div className="editorial-article-container" style={{ maxWidth: '860px' }}>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--ochre)' }}>FAQ</span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0 0' }}>
                Frequently Asked Questions — {data.year} Convocation Production
              </h2>
            </div>
            <FAQSection faqs={data.faqs} />
          </div>
        </section>

        {/* Consultation CTA */}
        <section style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--rule-soft)', padding: 'clamp(48px, 6vw, 80px) 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: 'var(--ink)', marginBottom: '12px' }}>
              Planning an Institutional Graduation Ceremony in the UAE?
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--ink-soft)', lineHeight: '1.6', marginBottom: '28px' }}>
              From arena staging and curved LED video walls to royal VIP protocol and acoustic distribution, trust a contractor with a 7-year proven track record.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <InquiryCtaButton inquiryType="events" className="btn-editorial-primary">
                Contact Ceremony Production Team →
              </InquiryCtaButton>
              <a href="https://wa.me/971524587992" className="btn-editorial-ghost" target="_blank" rel="noopener noreferrer">
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
