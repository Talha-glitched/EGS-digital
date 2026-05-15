import pageStyles from '../styles/pages/content-first.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import InquiryBriefCard from '../components/inquiry/InquiryBriefCard.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import { FAQSection, Footer, SiteNav, Stepper } from './SiteChrome.jsx';
import { images } from './siteData.js';

const briefPaths = [
  {
    title: 'Email about a stand',
    copy: 'Send show name, stand size, location, deadline, and product/display needs.',
    type: 'exhibitions',
  },
  {
    title: 'Email about a ceremony',
    copy: 'Send event date, venue, guest/graduation scale, stage needs, and what must be ready.',
    type: 'events',
  },
  {
    title: 'Email about a rollout',
    copy: 'Send number of locations, access windows, launch date, asset types, and installation scope.',
    type: 'retail',
  },
  {
    title: 'Email about a fitout',
    copy: 'Send space type, location, handover target, brand/signage needs, and photos or drawings.',
    type: 'fitouts',
  },
];

const nextSteps = [
  ['Review', 'EGS reviews the brief, date, location, and physical scope.'],
  ['Check', 'The team checks deadline, access, materials, and missing information.'],
  ['Clarify', 'If needed, EGS asks for drawings, photos, location lists, or brand files.'],
  ['Read', 'You get a practical feasibility read or next questions.'],
  ['Move', 'The conversation moves into quote, site visit, design, or production planning.'],
  ['Build', 'Once approved, production and installation planning begins.'],
];

const contactFaqs = [
  ['What should I send first?', 'Send the service type, deadline, venue or location, and the main outcome. If something has changed late, say that first.'],
  ['Can EGS respond to urgent requests?', 'Yes, when the work is physically possible and the standard can be protected. Send the deadline and scope so EGS can assess feasibility.'],
  ['Do I need a full brief?', 'No. A location, deadline, photos or drawings, and what needs to be ready are enough to start the conversation.'],
  ['Which services can I ask about?', 'Exhibition stands, graduation ceremonies, event production, retail branding, signage, and branded interiors.'],
  ['Will EGS tell me if the deadline is not realistic?', 'Yes. EGS checks feasibility first: deadline, access, material availability, scope, and what needs to move before production starts.'],
];

const contactRevealSelector = [
  '.content-page .chip',
  '.content-page .hero-copy h1',
  '.content-page .hero-copy .lede',
  '.content-page .hero-actions .btn',
  '.content-page .section-head h2',
  '.content-page .section-head p',
  '.content-page .brief-card',
  '.content-page .faq-item',
  '.content-page .section-band > .container > .btn',
  '.content-page .footer-grid > *',
  '.content-page .footer-big',
  '.content-page .footer-bottom',
].join(', ');

export default function ContactPage() {
  usePageLifecycle('Contact EGS Dubai | Brief Exhibition Stands, Events, Retail Rollouts', {
    revealSelector: contactRevealSelector,
  });

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page" style={{ '--accent': 'var(--ochre)' }}>
        <SiteNav active="contact" cta="Email EGS" />

        <section className="content-hero">
          <div className="container">
            <div className="hero-board">
              <div className="hero-copy">
                <div>
                  <div className="chip-row">
                    <span className="chip"><span className="chip-dot" />Brief intake</span>
                    <span className="chip"><span className="chip-dot" />Dubai / UAE</span>
                  </div>
                  <h1>Send the deadline, location, and what needs to happen.</h1>
                  <p className="lede">The fastest way to start is to tell us the service, venue or location, deadline, and what has changed or needs to be ready. If the job is urgent, say that first.</p>
                </div>
                <div className="hero-actions">
                  <InquiryCtaButton inquiryType="general" className="btn btn-primary" />
                  <a href="tel:+971524587992" className="btn btn-ghost">Call / WhatsApp EGS</a>
                </div>
              </div>
              <div className="intake-dashboard">
                <div className="contact-panel">
                  <h3>Direct contact</h3>
                  <div className="contact-list">
                    <a href="mailto:info@exhibitgraphicsign.com">info@exhibitgraphicsign.com</a>
                    <a href="tel:+97142383278">+971 4 238 3278</a>
                    <a href="tel:+971524587992">+971 52 458 7992</a>
                    <span>Nasiriya Building, Baghdad Street, Al Qusais, Dubai</span>
                    <span>Joinery: Industrial Area 11, Sharjah</span>
                  </div>
                </div>
                <div className="material-grid">
                  {[
                    ['Service', 'Stand, ceremony, retail, or fitout'],
                    ['Deadline', 'Opening date, showtime, launch, or handover'],
                    ['Location', 'Venue, hall, mall, campus, store, or showroom'],
                    ['Change', 'What moved, what is missing, or what has to be ready'],
                  ].map(([title, copy]) => (
                    <article className="project-file compact" key={title}>
                      <span>{title}</span>
                      <p>{copy}</p>
                    </article>
                  ))}
                </div>
                <div className="image-cell contact-proof-image">
                  <img src={images.hctProfile} alt="EGS ceremony production proof" />
                  <span className="label">Lead with the deadline. Then the team can judge what moves first.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Choose your starting point.</h2>
              <p>Pick the closest match. You do not need a full brief — deadline and location are enough to start.</p>
            </div>
            <div className="brief-grid">
              {briefPaths.map(({ title, copy, type }) => (
                <InquiryBriefCard key={type} inquiryType={type} title={title} copy={copy} />
              ))}
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container form-shell">
            <div>
              <span className="chip"><span className="chip-dot" />What to include</span>
              <h2 className="display-lg" style={{ marginTop: '20px' }}>A good first message is practical.</h2>
              <p className="body-lg" style={{ marginTop: '20px' }}>Send what you have. EGS can start with photos, drawings, a location list, or a simple message explaining what has to be ready and by when.</p>
            </div>
            <div className="field-grid">
              {[
                ['Name', 'Your name'],
                ['Company', 'Company or institution'],
                ['Phone / WhatsApp', '+971...'],
                ['Email', 'name@company.com'],
                ['Service type', 'Stand, ceremony, retail, fitout'],
                ['Venue / location', 'Show, mall, campus, showroom'],
                ['Deadline', 'Opening date, event date, launch date'],
                ['Files', 'Brief, photos, drawings, location list'],
              ].map(([label, hint]) => (
                <div className="field" key={label}>
                  <label>{label}</label>
                  <span>{hint}</span>
                </div>
              ))}
              <div className="field wide">
                <label>What needs to happen?</label>
                <span>Tell us the physical outcome, what changed, or what has to be ready.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>What EGS checks first.</h2>
              <p>For urgent work, the first reply should focus on feasibility and the next practical step.</p>
            </div>
            <Stepper steps={nextSteps} />
          </div>
        </section>

        <section className="section-band dark-band">
          <div className="container">
            <div className="section-head">
              <h2>If it is urgent, lead with the deadline.</h2>
              <p>EGS has handled 33-location overnight retail installation, 10-hour ceremony stage changes, 10-12 hour exhibition stand adaptation, and last-minute pavilion product display changes.</p>
            </div>
            <div className="stat-poem">
              <div className="proof-chip"><strong>33</strong><span>Locations overnight</span></div>
              <div className="proof-chip"><strong>10h</strong><span>Stage extension</span></div>
              <div className="proof-chip"><strong>10-12h</strong><span>Stand adaptation</span></div>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Questions before you brief EGS.</h2>
              <p>A perfect brief is not required. The deadline, location, and physical outcome matter first.</p>
            </div>
            <FAQSection faqs={contactFaqs} />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Start with the constraint.</h2>
              <p>Tell EGS what has to be ready, where, and by when. The team will work from there.</p>
            </div>
            <InquiryCtaButton inquiryType="general" className="btn btn-primary" />
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
