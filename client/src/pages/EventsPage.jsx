import pageStyles from '../styles/pages/content-first.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { AnnotatedImage, FAQSection, Footer, InfoGrid, SiteNav, Stepper } from './SiteChrome.jsx';
import { images } from './siteData.js';

const eventSteps = [
  ['Facts', 'Send date, venue, audience size, ceremony type, stage needs, branding, and what must be ready.'],
  ['Room', 'EGS reviews access, stage position, guest flow, production constraints, and deadline risk.'],
  ['Scope', 'Agree stage, branding, display areas, production environment, install timing, and handover responsibilities.'],
  ['Source', 'Materials, graphics, carpentry, production items, and crew planning are lined up before site work.'],
  ['Install', 'The room is built around venue access and any late physical changes.'],
  ['Doors', 'Final checks happen before guests, graduates, VIPs, or leadership enter.'],
];

const eventScope = [
  ['Stage environment', 'Physical stage, ceremony environment, display areas, and visible production surfaces.'],
  ['Production flow', 'The room has to support the sequence before graduates, guests, VIPs, or leadership enter.'],
  ['Event branding', 'Branded backdrops, screens, graphics, and details that make the public moment feel controlled.'],
  ['Guest experience', 'Movement, seating context, photo areas, and visible order for families and guests.'],
  ['On-site adaptation', 'Physical changes handled around material, access, venue, and showtime pressure.'],
  ['Before doors', 'Final checks before guests enter and the ceremony becomes public.'],
];

const eventReassurance = [
  ['Ceremony leads', 'The stage and room need to be ready before arrivals, not almost ready.'],
  ['Leadership offices', 'The event has to feel dignified, controlled, and public-safe.'],
  ['Event managers', 'Changes need to be handled without visible confusion in the room.'],
  ['Procurement', 'The vendor must understand fixed-showtime pressure and physical feasibility.'],
];

const eventAudience = [
  ['Universities and colleges', 'Need graduation environments ready across campuses, guests, graduates, and leadership moments.'],
  ['Schools', 'Need ceremony setups that feel organised, dignified, and ready before families arrive.'],
  ['Institutional teams', 'Need public events that feel controlled and appropriate for leadership and VIPs.'],
  ['Event managers', 'Need one accountable production team when the showtime cannot move.'],
];

const eventFaqs = [
  ['What does EGS handle for graduation ceremonies?', 'EGS handles the physical ceremony production environment: stage setting, event branding, room readiness, on-site adaptation, and delivery pressure around the event flow.'],
  ['What should we send before discussing a ceremony?', 'Send the date, venue, expected audience size, ceremony type, stage needs, branding needs, guest or VIP considerations, and anything that has changed.'],
  ['Can EGS handle urgent changes before an event?', 'Yes, when physically possible. The HCT Fujairah stage extension was requested 10 hours before the ceremony and delivered on time.'],
  ['Does EGS work across the UAE?', 'Yes. HCT proof covers Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah, Fujairah, and Baniyas across the 2024-2025 proof set.'],
  ['Is this only for graduations?', 'Graduations are the strongest proof, but the same production discipline applies to corporate ceremonies, launches, and institutional events.'],
];

export default function EventsPage() {
  usePageLifecycle('Graduation Ceremony Setup UAE | Event Production Company Dubai | EGS');

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page" style={{ '--accent': 'var(--terracotta)' }}>
        <SiteNav active="events" cta="Brief us on your ceremony" />

        <section className="content-hero">
          <div className="container">
            <div className="hero-board">
              <div className="hero-copy">
                <div>
                  <div className="chip-row">
                    <span className="chip"><span className="chip-dot" />Graduation ceremony setup UAE</span>
                    <span className="chip"><span className="chip-dot" />Fixed showtime</span>
                  </div>
                  <h1>A ceremony has no second take.</h1>
                  <p className="lede">EGS builds ceremony and event environments where the stage, branding, guest movement, production flow, and timing all have to hold before families, VIPs, graduates, guests, or leadership walk in.</p>
                </div>
                <div>
                  <div className="hero-actions">
                    <a href="/contact" className="btn btn-primary">Brief us on your ceremony <span className="arrow">→</span></a>
                    <a href="/case-studies#hct-graduation-program" className="btn btn-ghost">Read HCT proof</a>
                  </div>
                  <div className="proof-chip-strip">
                    <div className="proof-chip"><strong>7</strong><span>Grand ceremonies in 2025</span></div>
                    <div className="proof-chip"><strong>4,500</strong><span>Graduates</span></div>
                    <div className="proof-chip"><strong>13,500</strong><span>Guests</span></div>
                  </div>
                </div>
              </div>
              <div className="image-mosaic ceremony-mosaic">
                <div className="image-cell">
                  <img src={images.hctProfile} alt="HCT graduation ceremony audience and stage production" />
                  <span className="label">HCT graduation season · UAE scale</span>
                </div>
                <div className="stack">
                  <div className="image-cell">
                    <img src={images.graduationProfile} alt="Graduation ceremony stage and confetti moment" />
                    <span className="label">Stage, screen, and cue pressure</span>
                  </div>
                  <div className="image-cell">
                    <img src={images.eventProfile} alt="Graduation event production environment" />
                    <span className="label">Room ready before doors</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-band dark-band">
          <div className="container">
            <div className="section-head">
              <h2>HCT is the proof of scale.</h2>
              <p>In 2025, EGS delivered seven HCT grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah, and Fujairah for 4,500 graduates and 13,500 guests. In 2024, EGS delivered eight grand ceremonies for 3,500 graduates and 10,000 guests.</p>
            </div>
            <div className="stat-poem">
              <div className="proof-chip"><strong>2025</strong><span>7 grand ceremonies</span></div>
              <div className="proof-chip"><strong>2024</strong><span>8 grand ceremonies</span></div>
              <div className="proof-chip"><strong>7 yrs</strong><span>Almost with HCT</span></div>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Ten hours before showtime, the stage changed.</h2>
              <p>At the 2025 HCT Fujairah ceremony at Zayed Sports Complex, the stage needed a 5-6 metre extension for a photo display area 10 hours before the event.</p>
            </div>
            <AnnotatedImage
              src={images.graduationWide}
              alt="HCT graduation ceremony stage production"
              labels={['stage line', 'photo area', 'guest sightlines', 'showtime check']}
            />
            <div className="capability-grid">
              {[
                ['Material', 'EGS sourced material under deadline pressure.'],
                ['Logistics', 'The team moved material to Fujairah.'],
                ['Carpentry', 'The wooden/carpentered stage was extended.'],
                ['Showtime', 'The ceremony was delivered on time.'],
              ].map(([title, copy]) => (
                <article className="cap-card" key={title}>
                  <small>Fujairah stage extension</small>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>What EGS handles.</h2>
              <p>EGS handles the physical ceremony production environment: the parts of the room that need to be built, branded, arranged, adapted, checked, and ready before showtime.</p>
            </div>
            <InfoGrid items={eventScope} eyebrow="Ceremony scope" />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>The plan works backwards from showtime.</h2>
              <p>The work has to be physically ready before guests enter. The process is practical: room, access, stage, branding, production constraints, and final handover.</p>
            </div>
            <Stepper steps={eventSteps} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Guests should feel the ceremony, not the production pressure.</h2>
              <p>The buyer needs confidence that the public moment will feel dignified, ready, and controlled even if the work behind it was under pressure.</p>
            </div>
            <InfoGrid items={eventReassurance} eyebrow="Buyer reassurance" />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Graduations are the proof. The discipline applies wider.</h2>
              <p>HCT is the strongest confirmed proof, but the same production discipline applies to corporate ceremonies, product launches, institutional events, and leadership moments.</p>
            </div>
            <a href="/contact" className="btn btn-primary">Brief us on your ceremony <span className="arrow">→</span></a>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Public context, project proof.</h2>
              <p>HCT's 2025 graduation season was publicly reported across official HCT channels. Those sources confirm the ceremony context; EGS project proof confirms the production work behind it.</p>
            </div>
            <a href="/case-studies#hct-graduation-program" className="btn btn-ghost">Open HCT proof <span className="arrow">→</span></a>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Questions ceremony teams ask first.</h2>
              <p>Direct answers for universities, institutions, event managers, leadership offices, and procurement teams.</p>
            </div>
            <FAQSection faqs={eventFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Who this is for.</h2>
              <p>Graduations are the strongest proof, but the same fixed-showtime discipline helps other public institutional and corporate moments.</p>
            </div>
            <InfoGrid items={eventAudience} eyebrow="Audience" />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Send the date, venue, and what has to be ready.</h2>
              <p>If the ceremony has a fixed showtime, send the event details. EGS will look at the room, the deadline, and what needs to happen first.</p>
            </div>
            <a href="/contact" className="btn btn-primary">Brief us on your ceremony <span className="arrow">→</span></a>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
