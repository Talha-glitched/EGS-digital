import pageStyles from '../styles/pages/content-first.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { ClientMarquee, FAQSection, Footer, InfoGrid, ProductionHub, ProofCard, SiteNav, Stepper } from './SiteChrome.jsx';
import { images, processSteps, proofCards, services } from './siteData.js';

const pressureItems = [
  ['Move quickly', 'EGS moves when the requirement changes, but keeps the physical work tied to the client need.'],
  ['Protect the standard', 'Fast is only useful when the finish, handover, and public moment still hold.'],
  ['Keep control', 'Late changes should not become public chaos for the visitor, guest, customer, or sales team.'],
  ['Remember the work', 'Repeat-client memory matters because each engagement should make the next one sharper.'],
];

const homeFaqs = [
  ['What does EGS do?', 'EGS builds exhibition stands, graduation ceremonies, event environments, retail branding, signage, and branded interiors across Dubai and the UAE.'],
  ['Can EGS handle urgent changes?', 'Yes, when the change is physically possible and the team can keep the standard intact. The proof includes Sadia, HCT Fujairah, Philips, and Kazakhstan Pavilion.'],
  ['Who should contact EGS?', 'Marketing, events, procurement, retail, and institutional teams who need physical brand work delivered properly under real deadline pressure.'],
  ['What should I send first?', 'Send the service type, deadline, venue or location, and any drawings, photos, location lists, or brand guidelines you already have.'],
];

export default function HomePage() {
  usePageLifecycle('Exhibit Graphic Sign | Exhibition Stands, Events, Retail Branding Dubai');

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page" style={{ '--accent': 'var(--terracotta)' }}>
        <SiteNav active="home" />

        <section className="content-hero">
          <div className="container">
            <div className="hero-board">
              <div className="hero-copy">
                <div>
                  <div className="chip-row">
                    <span className="chip"><span className="chip-dot" />Dubai / UAE production house</span>
                    <span className="chip"><span className="chip-dot" />Built for fixed deadlines</span>
                  </div>
                  <h1 className="wide-title">Every deadline has moving parts. EGS keeps them moving.</h1>
                  <p className="lede">
                    EGS is a Dubai production house for high-stakes physical brand moments across the UAE. When the requirement changes late and the date cannot move, we keep the work moving until it is ready and correct.
                  </p>
                </div>
                <div>
                  <div className="hero-actions">
                    <a href="/contact" className="btn btn-primary">Send us your brief <span className="arrow">→</span></a>
                    <a href="/case-studies" className="btn btn-ghost">See case studies</a>
                  </div>
                  <div className="proof-chip-strip">
                    <div className="proof-chip"><strong>2010</strong><span>Founded in Dubai</span></div>
                    <div className="proof-chip"><strong>25+</strong><span>Big projects/year</span></div>
                    <div className="proof-chip"><strong>UAE</strong><span>Venue and install pressure</span></div>
                  </div>
                </div>
              </div>
              <div className="hero-visual-stack">
                <div className="image-cell hero-feature-image">
                  <img src={images.graduationProfile} alt="HCT graduation ceremony production" />
                  <span className="label">Seven HCT ceremonies · 4,500 graduates · 13,500 guests</span>
                </div>
                <div className="hero-thumb-row">
                  <div className="image-cell">
                    <img src={images.philips} alt="Philips exhibition stand" />
                    <span className="label">200 sqm Philips stand adaptation</span>
                  </div>
                  <div className="image-cell">
                    <img src={images.retail} alt="Retail branding work" />
                    <span className="label">Retail rollout pressure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ClientMarquee />

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Start with the work that has to be ready.</h2>
              <p>Each service has a different pressure: opening day, showtime, mall access, or handover. The site routes buyers by the physical problem they need solved.</p>
            </div>
            <div className="image-mosaic" style={{ marginBottom: '12px' }}>
              <div className="image-cell">
                <img src={images.hctProfile} alt="HCT graduation ceremony production" />
                <span className="label">HCT ceremony production · UAE scale</span>
              </div>
              <div className="stack">
                <div className="image-cell">
                  <img src={images.philips} alt="Philips exhibition stand" />
                  <span className="label">Exhibition stand adaptation</span>
                </div>
                <div className="image-cell">
                  <img src={images.fitout} alt="Branded interior and showroom work" />
                  <span className="label">Branded spaces and fitouts</span>
                </div>
              </div>
            </div>
            <div className="service-grid">
              {services.map((service) => (
                <a className="service-card" href={service.href} key={service.title} style={{ '--accent': service.accent }}>
                  <div className="media">
                    <img src={service.image} alt="" />
                    <span className="caption-note">{service.label}</span>
                  </div>
                  <div className="body">
                    <small>{service.label} / Service</small>
                    <h3>{service.title}</h3>
                    <p>{service.copy}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>What pressure-tested looks like.</h2>
              <p>Proof should be quick to understand: client, deadline pressure, physical work, and result. Open any file to see the full story.</p>
            </div>
          </div>
          <div className="proof-scroll">
            <div className="proof-track">
              {proofCards.map((card) => <ProofCard card={card} key={card.title} />)}
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>From brief to handover, the work stays physical.</h2>
              <p>EGS works backwards from the opening date, showtime, launch window, or handover. The first job is to understand the hard constraint.</p>
            </div>
            <div className="process-with-hub">
              <Stepper steps={processSteps} />
              <ProductionHub
                items={['client', 'venue', 'materials', 'crew', 'fabrication', 'graphics', 'installation', 'handover']}
              />
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Fast is only useful when the standard stays intact.</h2>
              <p>The hard part is not saying yes. The hard part is sourcing material, moving crews, handling access, keeping the finish clean, and still delivering what the client asked for.</p>
            </div>
            <InfoGrid items={pressureItems} eyebrow="How EGS works" />
          </div>
        </section>

        <section className="section-band dark-band">
          <div className="container">
            <div className="section-head">
              <h2>Seven ceremonies. 4,500 graduates. One public moment.</h2>
              <p>In 2025, EGS delivered seven HCT grand ceremonies across the UAE for 4,500 graduates and 13,500 guests.</p>
            </div>
            <div className="image-cell" style={{ aspectRatio: '21 / 9', marginBottom: '34px' }}>
              <img src={images.hct} alt="HCT graduation ceremony production" />
              <span className="label">Higher Colleges of Technology · 2025 graduation season</span>
            </div>
            <div className="stat-poem">
              <div className="proof-chip"><strong>7</strong><span>Grand ceremonies</span></div>
              <div className="proof-chip"><strong>4,500</strong><span>Graduates</span></div>
              <div className="proof-chip"><strong>13,500</strong><span>Guests</span></div>
            </div>
            <a href="/case-studies#hct-graduation-program" className="btn btn-ghost" style={{ marginTop: '28px' }}>Read the HCT case study <span className="arrow">→</span></a>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Questions buyers ask first.</h2>
              <p>Direct answers before a marketing manager, event lead, retail team, or procurement contact sends the first brief.</p>
            </div>
            <FAQSection faqs={homeFaqs} />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Send the deadline, location, and what needs to happen.</h2>
              <p>If the date is fixed or the requirement has changed, send the brief. EGS will look at what can be done and what needs to move first.</p>
            </div>
            <a href="/contact" className="btn btn-primary">Send us your brief <span className="arrow">→</span></a>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
