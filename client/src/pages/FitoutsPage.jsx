import pageStyles from '../styles/pages/content-first.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { FAQSection, Footer, InfoGrid, SiteNav, Stepper } from './SiteChrome.jsx';
import { images } from './siteData.js';

const fitoutSteps = [
  ['Space', 'Send photos, drawings, location, handover target, and brand/signage needs.'],
  ['Use', 'EGS reviews movement, visibility, signage placement, surfaces, storage, and wear points.'],
  ['Scope', 'Agree branded interiors, signage, joinery, graphics, display details, and handover expectations.'],
  ['Produce', 'Fabrication, joinery, printing, signage, and finishing are prepared around the scope.'],
  ['Install', 'The work is installed and adjusted on site.'],
  ['Snag', 'The space is checked and handed over for daily use.'],
];

const fitoutScope = [
  ['Showrooms', 'Branded spaces for visitors, sales teams, and daily presentation.'],
  ['Reception areas', 'First-impression spaces with signage, joinery, and movement considered together.'],
  ['Interior signage', 'Brand graphics built into the room instead of added at the end.'],
  ['Joinery details', 'Surfaces and fixtures that need to survive daily use.'],
  ['Retail-adjacent interiors', 'Hospitality, retail, and showroom environments where brand and operation meet.'],
  ['Handover-ready spaces', 'Spaces checked for visibility, use, finish, and practical daily operation.'],
];

const fitoutReassurance = [
  ['Operations', 'People should move through the room without confusion.'],
  ['Brand teams', 'Signage and brand details should feel built into the space.'],
  ['Property teams', 'Finish quality matters after handover, not only in photos.'],
  ['Procurement', 'Scope should stay practical, inspectable, and easy to understand.'],
];

const fitoutAudience = [
  ['Showroom teams', 'Need spaces that carry the brand clearly for visitors and sales conversations.'],
  ['Office and reception teams', 'Need first-impression areas with signage, movement, and finish considered together.'],
  ['Retail-adjacent spaces', 'Need branded physical environments that feel useful after handover.'],
  ['Brand teams', 'Need the room itself to communicate without relying on explanation.'],
];

const fitoutFaqs = [
  ['What should we send for a fitout or branded interior brief?', 'Send photos or drawings of the space, location, handover target, brand files, signage needs, and any areas that are not working today.'],
  ['Does EGS handle signage inside fitouts?', 'Yes. Signage and brand graphics should be considered early so they feel built into the room, not added after handover.'],
  ['Is this for full interiors or branded upgrades?', 'Both can fit, depending on scope. This page should not claim more than the confirmed project requires.'],
  ['What makes EGS useful for fitouts?', 'EGS combines production, signage, joinery thinking, and brand-detail sensitivity, so the room works after the handover photo.'],
];

export default function FitoutsPage() {
  usePageLifecycle('Interior Fitout Branding Dubai | Branded Interiors And Signage | EGS');

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page" style={{ '--accent': 'var(--olive)' }}>
        <SiteNav active="fitouts" cta="Start a fitout brief" />

        <section className="content-hero">
          <div className="container">
            <div className="hero-board">
              <div className="hero-copy">
                <div>
                  <div className="chip-row">
                    <span className="chip"><span className="chip-dot" />Interior fitout branding Dubai</span>
                    <span className="chip"><span className="chip-dot" />Signage / joinery / handover</span>
                  </div>
                  <h1>The handover photo is not the finish line.</h1>
                  <p className="lede">EGS builds branded interiors, showroom environments, signage, and joinery details that still need to work after the first Monday morning.</p>
                </div>
                <div>
                  <div className="hero-actions">
                    <a href="/contact" className="btn btn-primary">Start a fitout brief <span className="arrow">→</span></a>
                    <a href="/case-studies" className="btn btn-ghost">See relevant work</a>
                  </div>
                  <div className="proof-chip-strip">
                    <div className="proof-chip"><strong>Brand</strong><span>Visibility in the room</span></div>
                    <div className="proof-chip"><strong>Joinery</strong><span>Built for daily use</span></div>
                    <div className="proof-chip"><strong>Signage</strong><span>Not an afterthought</span></div>
                  </div>
                </div>
              </div>
              <div className="material-board">
                <div className="image-cell">
                  <img src={images.fitout} alt="Fakhruddin Properties branded showroom" />
                  <span className="label">Branded showroom and interior environment</span>
                </div>
                <div className="material-grid">
                  {[
                    ['Sightline', 'Can people find the brand and the next point of action?'],
                    ['Surface', 'Will the joinery and finish survive daily use?'],
                    ['Signage', 'Is wayfinding part of the room, not added at the end?'],
                    ['Handover', 'Is the space ready for the people who operate it?'],
                  ].map(([title, copy]) => (
                    <article className="project-file compact" key={title}>
                      <span>{title}</span>
                      <p>{copy}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>A nice render does not fix a difficult room.</h2>
              <p>Fitouts fail when signage is treated as an afterthought, joinery wears badly, storage is missed, or the room looks good but works poorly.</p>
            </div>
            <InfoGrid items={fitoutScope} eyebrow="Fitout capability" />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>The room has to work before it can look finished.</h2>
              <p>The visual language matters, but so do sightlines, signage hierarchy, material behaviour, movement, storage, and handover clarity.</p>
            </div>
            <Stepper steps={fitoutSteps} />
          </div>
        </section>

        <section className="section-band dark-band">
          <div className="container">
            <div className="section-head">
              <h2>The space has to survive normal days.</h2>
              <p>Operations, brand teams, property teams, procurement, and owners all judge the room differently. The work has to satisfy more than one viewer.</p>
            </div>
            <InfoGrid items={fitoutReassurance} eyebrow="Buyer reassurance" />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>How EGS thinks about fitouts.</h2>
              <p>The room needs to guide people, carry the brand, survive daily use, and leave fewer questions after handover.</p>
            </div>
            <ul className="bullet-list">
              <li>Brand visibility should be built into the space, not added at the end.</li>
              <li>Joinery and signage have to survive daily use.</li>
              <li>The room has to guide people without needing explanation.</li>
              <li>Handover should leave fewer questions, not more.</li>
            </ul>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Use fitout proof carefully.</h2>
              <p>Fakhruddin Properties and Schindler can support credibility where approved. If the exact scope is not confirmed, use the client name or image as credibility, not a detailed case claim.</p>
            </div>
            <div className="proof-chip-strip">
              <div className="proof-chip"><strong>Fakhruddin</strong><span>Branded interior reference</span></div>
              <div className="proof-chip"><strong>Schindler</strong><span>Client credibility</span></div>
              <div className="proof-chip"><strong>EGS</strong><span>Signage and joinery thinking</span></div>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Send the room, the deadline, and what has to work.</h2>
              <p>Show EGS the space and the outcome you need. The team will look at brand, signage, joinery, and handover pressure together.</p>
            </div>
            <a href="/contact" className="btn btn-primary">Start a fitout brief <span className="arrow">→</span></a>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Questions fitout teams ask first.</h2>
              <p>Direct answers for showroom, office, reception, hospitality, property, and brand teams.</p>
            </div>
            <FAQSection faqs={fitoutFaqs} />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Who this is for.</h2>
              <p>EGS fits teams who need branded physical spaces to be inspectable, usable, and clear after handover.</p>
            </div>
            <InfoGrid items={fitoutAudience} eyebrow="Audience" />
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
