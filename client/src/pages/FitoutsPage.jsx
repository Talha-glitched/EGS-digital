import pageStyles from '../styles/pages/fitouts.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';

export default function FitoutsPage() {
  usePageLifecycle(
    'Interior Fitouts \u2014 EGS \u00b7 Offices, Showrooms, Branded Interiors'
  );

  return (
    <>
      <style>{pageStyles}</style>
      <div className="egs-page egs-fitouts">
        <nav className="nav">
          <div className="nav-inner">
            <a href="/" className="logo"><span className="mark"><em>Exhibit</em>Graphic&nbsp;Sign</span><span className="tag">Est. 2010 · Dubai</span></a>
            <div className="nav-links">
              <a href="/">Home</a>
              <a href="/exhibitions">Exhibitions</a>
              <a href="/events">Events</a>
              <a href="/fitouts" className="active">Fitouts</a>
              <a href="/retail">Retail</a>
              <a href="/hct-case-study">Case Study</a>
            </div>
            <a href="#cta" className="nav-cta">Start a fitout brief <span>→</span></a>
          </div>
        </nav>

        <div className="subnav">
          <div className="container">
            <div className="subnav-inner">
              <div className="breadcrumb">
                <a href="/">Home</a><span className="sep">/</span><strong>Interior Fitouts</strong>
              </div>
              <div className="aud-switcher">
                <a href="/exhibitions">Exhibitions</a>
                <a href="/events">Events</a>
                <a href="/fitouts" className="active">Fitouts</a>
                <a href="/retail">Retail</a>
              </div>
            </div>
          </div>
        </div>

        <section className="fit-hero">
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <span className="chip"><span className="chip-dot" style={{ background: 'var(--olive)' }}></span>Audience 03 · Interior Fitouts</span>
              <span className="tick">For operations heads, brand teams, founders &amp; property stakeholders</span>
            </div>

            <div className="fit-hero-grid reveal">
              <div>
                <h1>A beautiful room is nice.<br />A room that <span className="ital band">still works on Monday</span> is better.</h1>
                <p className="lede">We design and deliver fitouts for offices, showrooms and branded interiors that need more than a good handover photo. <em>Joinery that wears well. Circulation that makes sense. Signage, finishes and details that remember how the space will actually be used.</em></p>
                <div className="fit-hero-cta">
                  <a href="#cta" className="btn btn-primary" style={{ background: 'var(--olive)', borderColor: 'var(--olive)' }}>Start a fitout brief <span className="arrow">→</span></a>
                  <a href="#work" className="btn btn-ghost">See interior work</a>
                </div>
              </div>
              <div className="fit-hero-visual">
                <div className="fit-hero-main">
                  <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/FAK-Properties1.jpg" alt="Fakhruddin Properties showroom interior" />
                  <div className="fit-hero-caption">
                    <em>Fakhruddin Properties · branded showroom</em>
                    <span>Dubai · reception, signage, display &amp; circulation</span>
                  </div>
                </div>
                <div className="fit-hero-side">
                  <div className="cell">
                    <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/800-Pizza.jpg" alt="Restaurant fitout and branded interior" />
                    <span className="fit-mini-cap">Hospitality fitout · service-led layout</span>
                  </div>
                  <div className="cell">
                    <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Meydan13.jpg" alt="Branded event and interior environment" />
                    <span className="fit-mini-cap">Brand environment · material and message alignment</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="fit-specs reveal">
              <div className="fit-specs-inner">
                <div className="fit-spec"><div className="k">Typical scope</div><div className="v">Reception to full floor</div></div>
                <div className="fit-spec"><div className="k">Delivery mode</div><div className="v">Design → site → handover</div></div>
                <div className="fit-spec"><div className="k">Core strength</div><div className="v">Joinery &amp; brand fidelity</div></div>
                <div className="fit-spec"><div className="k">Site memory</div><div className="v">Snag log carried forward</div></div>
                <div className="fit-spec"><div className="k">Finish logic</div><div className="v">Materials chosen to last</div></div>
              </div>
            </div>
          </div>
        </section>

        <div className="marquee">
          <div className="marquee-track">
            <div className="marquee-item">Showrooms</div>
            <div className="marquee-item">Offices</div>
            <div className="marquee-item">Reception Areas</div>
            <div className="marquee-item">Hospitality Spaces</div>
            <div className="marquee-item">Sales Galleries</div>
            <div className="marquee-item">Brand Environments</div>
            <div className="marquee-item">Signage Systems</div>
            <div className="marquee-item">Feature Joinery</div>
          </div>
        </div>

        <section className="principle">
          <div className="container">
            <div className="principle-grid">
              <div className="reveal">
                <span className="eyebrow"><span className="dot"></span>The fitout default · vs. us</span>
                <h2>A fitout shouldn't be finished when the contractor leaves.<br /><span className="ital">It should be ready when your team arrives.</span></h2>
                <p>Too many fitouts are sold as surface. A render, a handover date, a few polished photos. Then the signage lands too late, the storage is wrong, the joinery chips in three months, and your team starts solving problems the build should have solved already.</p>
              </div>
              <div className="principle-list reveal">
                <div className="principle-row">
                  <div className="bad">Design sold in moodboard language</div>
                  <div className="good">Material, circulation and usage tested against the real brief</div>
                </div>
                <div className="principle-row">
                  <div className="bad">Handover ends the relationship</div>
                  <div className="good">Snag log and finish notes carried into the next phase</div>
                </div>
                <div className="principle-row">
                  <div className="bad">Signage treated as an afterthought</div>
                  <div className="good">Brand graphics integrated into the fitout from day one</div>
                </div>
                <div className="principle-row">
                  <div className="bad">Beautiful joinery, awkward workflow</div>
                  <div className="good">Front-of-house elegance with back-of-house practicality</div>
                </div>
                <div className="principle-row">
                  <div className="bad">Snags discovered by your staff</div>
                  <div className="good">A pre-handover walk with punch-list discipline</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="phases">
          <div className="container">
            <div className="phases-head reveal">
              <span className="chip"><span className="chip-dot" style={{ background: 'var(--ink-blue)' }}></span>How we run a fitout</span>
              <h2>The room is designed in <span className="ital">four passes</span>, not one.</h2>
              <p>We treat fitouts like built systems. The visual language matters, but so do sightlines, maintenance, brand touchpoints, joinery tolerances, signage hierarchy and what the room feels like three months after opening.</p>
            </div>
            <div className="phase-grid">
              <div className="phase-card reveal motion-delay-1">
                <div className="n">— 01 —</div>
                <h3>Read the room</h3>
                <p>We start with the building, the team and the purpose. Who enters first. Where they pause. What must be seen, stored, signed, protected or quietly hidden.</p>
                <div className="tagline">Brief · survey · operational read</div>
              </div>
              <div className="phase-card reveal motion-delay-2">
                <div className="n">— 02 —</div>
                <h3>Shape the system</h3>
                <p>Layout, brand integration, finish palette and joinery logic are resolved together. We avoid the common trap of making the space look coherent while functioning badly.</p>
                <div className="tagline">Plans · visuals · finish logic</div>
              </div>
              <div className="phase-card reveal motion-delay-3">
                <div className="n">— 03 —</div>
                <h3>Build cleanly</h3>
                <p>Fabrication, site coordination, installation sequencing and brand graphics are managed as one delivery stream. The goal is a calm site and fewer last-minute decisions.</p>
                <div className="tagline">Joinery · signage · site delivery</div>
              </div>
              <div className="phase-card reveal motion-delay-4">
                <div className="n">— 04 —</div>
                <h3>Hand over with memory</h3>
                <p>We document snags, adjustments, graphics files, finish codes and what to carry into the next branch, floor or refresh. That continuity is part of the service.</p>
                <div className="tagline">Snag log · codes · next-phase notes</div>
              </div>
            </div>
          </div>
        </section>

        <section className="ledger">
          <div className="container">
            <div className="ledger-head reveal">
              <div>
                <span className="chip"><span className="chip-dot" style={{ background: 'var(--sky)' }}></span>Project memory · fitout ledger</span>
                <h2>The quiet pages after handover are where the <span className="ital">next good room</span> begins.</h2>
              </div>
              <p>On a strong fitout, we don't just file drawings and move on. We log finishes, snag patterns, wear points, signage revisions and what the team learned once the space was actually in use. That's how the second space gets sharper.</p>
            </div>

            <div className="ledger-grid">
              <div className="ledger-board reveal">
                <div className="ledger-board-hd">
                  <h3>Showroom fitout · handover ledger</h3>
                  <span>Project file 03 / branded interior</span>
                </div>
                <div className="ledger-row">
                  <div className="k">Reception desk finish</div>
                  <div className="v">Oak veneer, matte seal</div>
                  <div className="delta note">approved</div>
                </div>
                <div className="ledger-row">
                  <div className="k">Feature signage sightline</div>
                  <div className="v">Raised 220 mm</div>
                  <div className="delta up">better entry read</div>
                </div>
                <div className="ledger-row">
                  <div className="k">Storage behind welcome wall</div>
                  <div className="v">+18% capacity</div>
                  <div className="delta up">ops request</div>
                </div>
                <div className="ledger-row">
                  <div className="k">Touch-up callouts first 30 days</div>
                  <div className="v">3</div>
                  <div className="delta note">all resolved</div>
                </div>
                <div className="ledger-row">
                  <div className="k">Branch-ready graphics files</div>
                  <div className="v">Filed &amp; versioned</div>
                  <div className="delta up">rollout ready</div>
                </div>
                <div className="ledger-row">
                  <div className="k">Material codebook</div>
                  <div className="v">12 finish refs</div>
                  <div className="delta note">kept for refresh</div>
                </div>
                <div className="ledger-note">
                  <span>Logged 5 days after handover walk</span>
                  <span>Used again on phase-two brief</span>
                </div>
              </div>

              <div className="ledger-side reveal">
                <div className="memo motion-delay-1">
                  <span className="eyebrow"><span className="dot"></span>What we record</span>
                  <h3>Finish logic</h3>
                  <p>Not just what looks good on opening day. What marks. What cleans well. What catches too much light. What ages with dignity.</p>
                </div>
                <div className="memo motion-delay-2">
                  <span className="eyebrow"><span className="dot"></span>What we carry</span>
                  <h3>Brand continuity</h3>
                  <p>Typography, signage positions, fabrication details and joinery proportions are documented so the next room feels related, not copied badly.</p>
                </div>
                <div className="memo motion-delay-3">
                  <span className="eyebrow"><span className="dot"></span>What we improve</span>
                  <h3>Operational friction</h3>
                  <p>Blind corners, cable paths, reception flow, hidden storage, queue points, service access. These are the notes that make a room feel easy.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gallery" id="work">
          <div className="container">
            <div className="gallery-head reveal">
              <div>
                <span className="eyebrow"><span className="dot"></span>Selected interiors</span>
                <h2>Rooms we've <span className="ital">helped settle properly</span>.</h2>
              </div>
              <span className="body-sm">Showrooms · hospitality spaces · brand environments · reception areas</span>
            </div>

            <div className="gallery-grid reveal">
              <div className="gcard g-a"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/FAK-Properties1.jpg" alt="Property showroom interior" /><div className="meta"><h4>Fakhruddin Properties</h4><span>Showroom</span></div></div>
              <div className="gcard g-b"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/800-Pizza.jpg" alt="Hospitality interior" /><div className="meta"><h4>800 Pizza</h4><span>Hospitality</span></div></div>
              <div className="gcard g-c"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg" alt="Branded consultation environment" /><div className="meta"><h4>Philips Pairs</h4><span>Brand zone</span></div></div>
              <div className="gcard g-d"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Arab-Health.jpg" alt="Reception and display environment" /><div className="meta"><h4>Philips Arab Health</h4><span>Display logic</span></div></div>
              <div className="gcard g-e"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Fosroc-Real-Image-3.jpeg" alt="Construction sector branded environment" /><div className="meta"><h4>Fosroc</h4><span>Branded interior</span></div></div>
              <div className="gcard g-f"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Microlink-3.jpeg" alt="Technology showroom and display" /><div className="meta"><h4>Microlink</h4><span>Showroom</span></div></div>
              <div className="gcard g-g"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Buser.jpg" alt="Modular branded environment" /><div className="meta"><h4>Buser</h4><span>Modular environment</span></div></div>
            </div>
          </div>
        </section>

        <section className="fit-for">
          <div className="container">
            <div className="fit-for-head reveal">
              <div>
                <span className="eyebrow"><span className="dot"></span>Who this is for</span>
                <h2>Fitouts for teams who need the room to <span className="ital">behave well</span>, not just photograph well.</h2>
              </div>
              <span className="body-sm">Three audiences we work especially well with</span>
            </div>

            <div className="fit-for-grid reveal">
              <div className="fit-card motion-delay-1">
                <div className="ic">01</div>
                <h3>Developers &amp; showroom teams</h3>
                <p>You need a room that sells trust before anyone sits down. Reception, display, model areas and signage all need to align without feeling theatrical.</p>
                <ul>
                  <li>Sales galleries</li>
                  <li>Reception spaces</li>
                  <li>Display joinery</li>
                  <li>Wayfinding &amp; branding</li>
                </ul>
              </div>
              <div className="fit-card motion-delay-2">
                <div className="ic">02</div>
                <h3>Office &amp; operations leads</h3>
                <p>You are balancing brand, workflow, staff comfort and handover quality. You want a space that feels considered and keeps working after the first week.</p>
                <ul>
                  <li>Front-of-house zones</li>
                  <li>Client-facing interiors</li>
                  <li>Meeting suites</li>
                  <li>Phased refreshes</li>
                </ul>
              </div>
              <div className="fit-card motion-delay-3">
                <div className="ic">03</div>
                <h3>Hospitality &amp; brand owners</h3>
                <p>You care about mood, yes, but also cleaning, durability, service flow and what your staff deal with when the room is busy. We design with that reality in view.</p>
                <ul>
                  <li>Feature interiors</li>
                  <li>Menu and wall graphics</li>
                  <li>Counter and service zones</li>
                  <li>Brand refresh programs</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="faq">
          <div className="container">
            <div className="faq-inner">
              <div>
                <span className="eyebrow"><span className="dot"></span>Before you ask</span>
                <h2>Questions fitout clients <span className="ital">actually ask us</span>.</h2>
              </div>
              <div className="faq-list">
                <details open>
                  <summary>Can you handle both the interior build and the branded graphics?</summary>
                  <p>Yes. That's one of the advantages of working with us. Joinery, signage, wall graphics, feature elements and wayfinding are resolved together rather than passed between separate suppliers.</p>
                </details>
                <details>
                  <summary>Do you work from our designer's concept or lead the design yourselves?</summary>
                  <p>Either. Some clients arrive with a finished design language and need production rigor. Others need us to shape the layout, finish palette and branded details from scratch. We can fit around the brief either way.</p>
                </details>
                <details>
                  <summary>How do you reduce headaches after handover?</summary>
                  <p>We run a structured pre-handover walk, log snags, file finish references and keep a record of what should change in the next phase. That means fewer small problems becoming your team's daily annoyance.</p>
                </details>
                <details>
                  <summary>Can you deliver phased projects or future branch rollouts?</summary>
                  <p>Yes. That's where our documentation habit matters most. Signage positions, finish codes, joinery details and what worked on site can all be carried into phase two or the next branch.</p>
                </details>
                <details>
                  <summary>What kinds of spaces are the best fit?</summary>
                  <p>Reception areas, offices, showrooms, hospitality spaces, branded customer environments and any interior where design, production and graphics need to speak the same language.</p>
                </details>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-band" id="cta">
          <div className="container">
            <span className="chip"><span className="chip-dot" style={{ background: 'var(--sky)' }}></span>Let's start the room properly</span>
            <h2>Tell us the space, <span className="ital">the use, the pressure points</span>.</h2>
            <p>We'll come back with a layout direction, finish thinking, branded touchpoint logic and an honest view on what the room should solve first. Calmly, and in practical language.</p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a href="mailto:info@exhibitgraphicsign.com?subject=Fitout%20Brief" className="btn btn-primary">Start a fitout brief <span className="arrow">→</span></a>
              <a href="#work" className="btn">See interior examples</a>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="container">
            <div className="footer-grid">
              <div>
                <div className="logo" style={{ color: 'var(--paper)', marginBottom: '20px' }}><span className="mark"><em>Exhibit</em>Graphic&nbsp;Sign</span></div>
                <p style={{ maxWidth: '40ch', fontSize: '14px', opacity: '0.7', lineHeight: '1.5' }}>A Dubai production house for exhibitions, events, fitouts and retail branding. We build the moment — and we remember what worked.</p>
              </div>
              <div><h4>Audiences</h4><ul><li><a href="/exhibitions">Exhibition Stands</a></li><li><a href="/events">Events &amp; Activations</a></li><li><a href="/fitouts">Interior Fitouts</a></li><li><a href="/retail">Retail Branding</a></li></ul></div>
              <div><h4>Services</h4><ul><li>Interior Fitouts</li><li>Reception &amp; Showroom Design</li><li>Wayfinding &amp; Signage</li><li>Feature Joinery</li><li>Brand Graphics</li></ul></div>
              <div><h4>Contact</h4><ul><li>info@exhibitgraphicsign.com</li><li>+971 4 238 3278</li><li>Al Qusais, Dubai</li><li>Industrial Area 11, Sharjah</li></ul></div>
            </div>
            <div className="footer-big"><em>We remember</em> every project.</div>
            <div className="footer-bottom">
              <span>© 2026 Exhibit Graphic Sign · Est. 2010</span>
              <span>File No. 004 / Fitouts</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
