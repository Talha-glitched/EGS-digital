import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import healthtechStand from '../assets/Exhibition Stands/healthtech.jpg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const abuDhabiFaqs = [
  [
    'Do you provide exhibition stand services at ADNEC Abu Dhabi?',
    'Yes. EGS regularly fabricates, transports, installs, and manages custom exhibition stands at the Abu Dhabi National Exhibition Centre (ADNEC), supporting major international shows including ADIPEC, IDEX, NAVDEX, and World Future Energy Summit.',
  ],
  [
    'How do you manage logistics between Dubai/Sharjah workshops and Abu Dhabi?',
    'We run a dedicated fleet of transport vehicles equipped for oversize structural joinery and delicate graphic panels. Move-in crews deploy with supervisor oversight to meet ADNEC access slots with zero transport delays.',
  ],
  [
    'Are you familiar with Abu Dhabi Civil Defence and ADNEC safety regulations?',
    'Yes. Our technical team prepares all required structural stability calculations, fire-retardant material certificates, electrical schematics, and rigging approvals mandated by ADNEC and Abu Dhabi authorities.',
  ],
];

export default function ExhibitionStandContractorAbuDhabiPage() {
  usePageLifecycle('Exhibition Stand Contractor Abu Dhabi | ADNEC Stand Builder | EGS', {
    revealSelector: '.ad-contractor-page .reveal',
    description: 'Trusted exhibition stand contractor in Abu Dhabi. Custom booth construction, joinery fabrication, and turnkey delivery at ADNEC for ADIPEC, IDEX, and major expos.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Exhibition Stand Contractor Abu Dhabi',
        description: 'Turnkey exhibition stand design, fabrication, and on-site stand management at ADNEC Abu Dhabi and across the capital.',
        serviceType: 'Exhibition Stand Contractor Abu Dhabi',
        url: '/exhibition-stand-contractor-abu-dhabi',
      },
      faqs: abuDhabiFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Abu Dhabi Contractor', url: '/exhibition-stand-contractor-abu-dhabi' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page exhibitions-page ad-contractor-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        <section className="exhibitions-hero" aria-label="Exhibition Stand Contractor Abu Dhabi Hero">
          <img
            className="exhibitions-hero-media"
            src={healthtechStand}
            alt="Exhibition stand contractor at ADNEC Abu Dhabi"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">ADNEC Accredited Delivery &amp; Fabrication</span>
            <h1>Exhibition Stand Contractor in Abu Dhabi — Turnkey ADNEC Stand Builder</h1>
            <p>
              Dedicated exhibition stand design, in-house fabrication, and seamless on-site execution at ADNEC. Built for major international exhibitions including ADIPEC, IDEX, and WFES.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Request Abu Dhabi Stand Quote →
              </InquiryCtaButton>
              <a href="/exhibitions" className="btn btn-ghost">
                View All Exhibition Work
              </a>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />Capital City Expertise</span>
              <h2>Comprehensive Exhibition Services at ADNEC Abu Dhabi</h2>
              <p>
                From custom oil &amp; gas pavilions to defense industry showcases, we deliver turnkey reliability in Abu Dhabi.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>ADNEC Service 01</small>
                <h3>ADIPEC Oil &amp; Gas Pavilions</h3>
                <p>Heavy-duty engineering, scale model displays, interactive touchscreen pipelines, and private executive meeting suites.</p>
              </article>
              <article className="cap-card">
                <small>ADNEC Service 02</small>
                <h3>Defense &amp; Security Stands (IDEX)</h3>
                <p>Secure VIP holding rooms, reinforced floor loading for defense systems, and high-security conference pods.</p>
              </article>
              <article className="cap-card">
                <small>ADNEC Service 03</small>
                <h3>Turnkey Move-In &amp; Logistics</h3>
                <p>Scheduled freight coordination from our UAE workshops directly into ADNEC hall loading bays with dedicated rigging crews.</p>
              </article>
              <article className="cap-card">
                <small>ADNEC Service 04</small>
                <h3>Regulatory Permits &amp; Civil Defence</h3>
                <p>Complete documentation packages handling Abu Dhabi civil defence approvals, electrical certifications, and stand approvals.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Abu Dhabi Exhibition Contractor FAQs</h2>
            </div>
            <FAQSection faqs={abuDhabiFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Planning Your Stand for an Upcoming Abu Dhabi Exhibition?</h2>
              <p>Contact our Abu Dhabi project team for direct consultation, 3D proposals, and transparent pricing.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Get ADNEC Stand Quote →
              </InquiryCtaButton>
              <a href="/exhibition-stand-contractor-dubai" className="btn btn-ghost">
                Dubai Contractor Services
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
