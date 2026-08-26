import pageStyles from '../styles/pages/content-first.css?raw';
import minimalServiceResponsiveStyles from '../styles/pages/minimal-service-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import graduationCeremonialStaging from '../assets/Graduation/SHJ1.jpg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const graduationFaqs = [
  [
    'What scale of graduation ceremonies does EGS manage in the UAE?',
    'We manage grand institutional convocations ranging from 500 to over 5,000 graduates and up to 15,000 guests, providing multi-tier stages, grand LED backdrop walls, acoustic sound tuning, and VIP royal protocol seating across sports complexes, auditoriums, and convention halls.',
  ],
  [
    'What institutional experience does EGS have?',
    'EGS has been the trusted production partner for the Higher Colleges of Technology (HCT) for over 7 consecutive years, delivering simultaneous and back-to-back grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah, and Fujairah.',
  ],
  [
    'How do you handle urgent, late-stage changes on ceremony day?',
    'We maintain active on-site carpentry, rigging, and AV crews throughout rehearsals. At the HCT Fujairah ceremony, we sourced materials, transported them overnight, and completed a 5-6 metre stage extension with 10 hours notice before VIP doors opened.',
  ],
];

export default function GraduationStageSetupUaePage() {
  usePageLifecycle('Graduation Ceremony Setup UAE | Institutional Stage Staging | EGS', {
    revealSelector: '.graduation-page .reveal',
    description: 'Premier graduation ceremony setup and institutional stage staging in UAE. 7+ years delivering for HCT across 5 Emirates with staging, LED backdrops, and VIP protocol.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Graduation Ceremony Setup and Institutional Stage Staging UAE',
        description: 'Large-scale graduation stage setup, audio-visual technical production, VIP seating, and event logistics across the UAE.',
        serviceType: 'Graduation Ceremony Organizer',
        url: '/graduation-stage-setup-uae',
      },
      faqs: graduationFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Events & Graduations', url: '/events' },
        { name: 'Graduation Stage Setup UAE', url: '/graduation-stage-setup-uae' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{minimalServiceResponsiveStyles}</style>
      <div className="content-page minimal-service-page graduation-page" style={{ '--accent': '#482683' }}>
        <Navbar active="events" overlay />

        <section className="minimal-service-hero" aria-label="Graduation Stage Setup UAE Hero">
          <img
            className="minimal-service-hero-media"
            src={graduationCeremonialStaging}
            alt="Graduation ceremony stage setup in UAE by EGS"
          />
          <div className="minimal-service-hero-shade" aria-hidden="true" />
          <div className="minimal-service-hero-copy">
            <span className="minimal-service-kicker">UAE Grand-Scale Institutional Staging</span>
            <h1>Graduation Ceremony Stage Setup UAE — Staging, AV &amp; Protocol Execution</h1>
            <p>
              Zero-fail stage production for high-stakes university convocations and institutional ceremonies. Backed by 7 consecutive years delivering grand multi-campus ceremonies for the Higher Colleges of Technology (HCT).
            </p>
            <div className="minimal-service-actions">
              <InquiryCtaButton inquiryType="events" className="btn btn-primary">
                Inquire for Ceremony Production →
              </InquiryCtaButton>
              <a href="/case-studies#hct-graduation-program" className="btn btn-ghost">
                Read HCT 7-Year Proof
              </a>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: '#482683' }} />Institutional Scale</span>
              <h2>Full-Scope Ceremony Staging Infrastructure</h2>
              <p>
                From structural stage certification to flawless VIP delegation seating and live broadcast-grade AV.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>Ceremony Discipline 01</small>
                <h3>Certified Heavy-Duty Staging</h3>
                <p>Multi-tier stages, wide graduate procession ramps, ADA wheelchair access ramps, and non-slip carpeted ceremonial finishes.</p>
              </article>
              <article className="cap-card">
                <small>Ceremony Discipline 02</small>
                <h3>Giant LED Backdrops &amp; Visuals</h3>
                <p>Ultra-high-definition curved LED walls displaying custom graduate name callout sequences, live camera feeds, and national anthems.</p>
              </article>
              <article className="cap-card">
                <small>Ceremony Discipline 03</small>
                <h3>VIP &amp; Royal Protocol Seating</h3>
                <p>Custom upholstered royal protocol seating, luxury holding majlis fitouts, presidential lecterns, and floral stage styling.</p>
              </article>
              <article className="cap-card">
                <small>Ceremony Discipline 04</small>
                <h3>Acoustic Tuning &amp; Lighting</h3>
                <p>Line-array speech-intelligibility audio systems and broadcast-temperature stage wash lighting designed for crisp photography.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Graduation Ceremony FAQs</h2>
            </div>
            <FAQSection faqs={graduationFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Planning an Institutional Convocation or Ceremony?</h2>
              <p>Connect with our senior ceremony production director to review seating capacity, stage dimensions, and venue logistics.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="events" className="btn btn-primary">
                Request Ceremony Staging Proposal →
              </InquiryCtaButton>
              <a href="/graduation-portfolio" className="btn btn-ghost">
                View Graduation Archives
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
