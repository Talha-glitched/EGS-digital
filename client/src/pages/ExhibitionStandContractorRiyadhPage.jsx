import pageStyles from '../styles/pages/content-first.css?raw';
import exhibitionsResponsiveStyles from '../styles/pages/exhibitions-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import { images } from './siteData.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const riyadhFaqs = [
  [
    'Does EGS deliver exhibition stands in Riyadh and across Saudi Arabia?',
    'Yes. EGS has extensive cross-border experience delivering turnkey custom exhibition stands at major venues in Saudi Arabia, including Riyadh Exhibition and Convention Center (RICEC), Riyadh Front Exhibition & Conference Center, and Dhahran Expo.',
  ],
  [
    'How do you manage cross-border fabrication and logistics to Saudi Arabia?',
    'We pre-fabricate modular timber and metal elements in our UAE production hub, manage all Saudi customs clearance and overland freight logistics, and deploy our experienced on-site installation and supervisor teams in Riyadh.',
  ],
  [
    'What proof do you have of delivering under pressure in Riyadh?',
    'At Global Health Exhibition in Riyadh, we adapted Philips’ 200 sqm healthcare stand with only 10-12 hours notice, building an ultrasound display unit and concealed power routing before opening day inspections.',
  ],
];

export default function ExhibitionStandContractorRiyadhPage() {
  usePageLifecycle('Exhibition Stand Contractor Riyadh | Stand Builder Saudi Arabia | EGS', {
    revealSelector: '.riyadh-page .reveal',
    description: 'Premier exhibition stand contractor in Riyadh, Saudi Arabia. Custom booth design, cross-border fabrication, RICEC & Riyadh Front delivery.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Exhibition Stand Contractor Riyadh Saudi Arabia',
        description: 'Cross-border and local exhibition stand fabrication, custom booth construction, and turnkey project management in Riyadh, Saudi Arabia.',
        serviceType: 'Exhibition Stand Contractor Riyadh',
        url: '/exhibition-stand-contractor-riyadh',
        areaServed: ['SA'],
      },
      faqs: riyadhFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Exhibitions', url: '/exhibitions' },
        { name: 'Riyadh Contractor', url: '/exhibition-stand-contractor-riyadh' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{exhibitionsResponsiveStyles}</style>
      <div className="content-page exhibitions-page riyadh-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" overlay />

        <section className="exhibitions-hero" aria-label="Exhibition Stand Contractor Riyadh Hero">
          <img
            className="exhibitions-hero-media"
            src={images.phillips1}
            alt="Philips healthcare exhibition stand in Riyadh by EGS"
          />
          <div className="exhibitions-hero-shade" aria-hidden="true" />
          <div className="exhibitions-hero-copy">
            <span className="exhibitions-kicker">Saudi Arabia &amp; GCC Turnkey Delivery</span>
            <h1>Exhibition Stand Contractor in Riyadh — Custom Booths for Saudi Arabia</h1>
            <p>
              Supporting Saudi Vision 2030 expos with high-standard stand fabrication, overland logistics, and agile on-site delivery at RICEC, Riyadh Front, and Jeddah.
            </p>
            <div className="exhibitions-hero-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Inquire for Riyadh Expo →
              </InquiryCtaButton>
              <a href="/case-studies#philips-global-health-riyadh" className="btn btn-ghost">
                Read Riyadh Case Study
              </a>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--ochre)' }} />GCC Capability</span>
              <h2>Cross-Border Exhibition Logistics &amp; Build Expertise</h2>
              <p>
                How EGS delivers UAE-grade fabrication quality into Saudi Arabia’s expanding trade show ecosystem.
              </p>
            </div>
            <div className="capability-grid">
              <article className="cap-card">
                <small>KSA Service 01</small>
                <h3>Riyadh Front &amp; RICEC Delivery</h3>
                <p>Full familiarity with venue access schedules, local safety clearances, and hall logistics across Riyadh exhibition hubs.</p>
              </article>
              <article className="cap-card">
                <small>KSA Service 02</small>
                <h3>Precision Pre-Fabrication</h3>
                <p>Stands are manufactured and dry-fitted in our workshop, then flat-packed for direct overland transport across the UAE-Saudi border.</p>
              </article>
              <article className="cap-card">
                <small>KSA Service 03</small>
                <h3>On-Site Project Managers</h3>
                <p>Our senior installation leads travel on site to supervise construction, client snagging, and opening day support.</p>
              </article>
              <article className="cap-card">
                <small>KSA Service 04</small>
                <h3>Fast Adaptation on the Floor</h3>
                <p>Equipped to handle late equipment deliveries and venue adaptations without panic or delays.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Saudi Arabia Exhibition FAQs</h2>
            </div>
            <FAQSection faqs={riyadhFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-head">
              <h2>Exhibiting at an Upcoming Trade Show in Saudi Arabia?</h2>
              <p>Connect with our GCC project director for cross-border logistics planning, 3D renderings, and turnkey quotes.</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                Request Riyadh Stand Estimate →
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
