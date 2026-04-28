import pageStyles from '../styles/pages/events.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';

export default function EventsPage() {
  usePageLifecycle(
    'Events & Brand Activations \u2014 EGS \u00b7 Graduations \u00b7 Product Launches'
  );

  return (
    <>
      <style>{pageStyles}</style>
      <div className="egs-page egs-events">
        <nav className="nav">
          <div className="nav-inner">
            <a href="/" className="logo"><span className="mark"><em>Exhibit</em>Graphic&nbsp;Sign</span><span className="tag">Est. 2010 · Dubai</span></a>
            <div className="nav-links">
              <a href="/">Home</a>
              <a href="/exhibitions">Exhibitions</a>
              <a href="/events" className="active">Events</a>
              <a href="/fitouts">Fitouts</a>
              <a href="/retail">Retail</a>
              <a href="/hct-case-study">Case Study</a>
            </div>
            <a href="#cta" className="nav-cta">Brief us on your event <span>→</span></a>
          </div>
        </nav>

        <div className="subnav">
          <div className="container">
            <div className="subnav-inner">
              <div className="breadcrumb"><a href="/">Home</a><span className="sep">/</span><strong>Events &amp; Brand Activations</strong></div>
              <div className="aud-switcher">
                <a href="/exhibitions">Exhibitions</a>
                <a href="/events" className="active">Events</a>
                <a href="/fitouts">Fitouts</a>
                <a href="/retail">Retail</a>
              </div>
            </div>
          </div>
        </div>

        {/* HERO */}
        <section className="ev-hero">
          <div className="container">
            <div className="ev-hero-grid">
              <div className="ev-hero-left">
                <div>
                  <span className="chip"><span className="chip-dot" style={{ background: 'var(--terracotta)' }}></span>Audience 02 · Events &amp; Brand Activations</span>
                  <h1 className="reveal">A room full of <span className="ital">feeling</span>.<br />A <span className="accent ital">crew</span> in black.<br />Zero missed cues.</h1>
                  <p className="lede reveal">
                    Graduations where families cry. Product launches where the reveal lands on the frame. Activations where a shopper stops mid-stride. <em>We build these for a living</em> — and then we write down what made them work.
                  </p>
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '32px' }}>
                    <a href="#cta" className="btn btn-primary" style={{ background: 'var(--terracotta)', borderColor: 'var(--terracotta)', color: 'var(--paper)' }}>Brief us on your event <span className="arrow">→</span></a>
                    <a href="/hct-case-study" className="btn btn-ghost">Read HCT case study</a>
                  </div>
                  <div className="nums">
                    <div><div className="n">4,500</div><div className="l">graduates cued &amp; named</div></div>
                    <div><div className="n">13,500</div><div className="l">guests in the room</div></div>
                    <div><div className="n">0</div><div className="l">cues missed ·&nbsp;ever</div></div>
                    <div><div className="n">14 yrs</div><div className="l">of show-running</div></div>
                  </div>
                </div>
              </div>
              <div className="ev-hero-img">
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg" alt="HCT Graduation Ceremony" />
                <div className="tag-overlay">
                  HCT Graduation · one of seven in a single season, across five emirates.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT WE DO */}
        <section className="kinds">
          <div className="container">
            <div className="kinds-head reveal">
              <h2>Four kinds of <span className="ital">room</span>.<br />One quiet crew behind them.</h2>
              <p style={{ alignSelf: 'end' }}>We started in graduations. That discipline — <em>the one thing you cannot re-shoot</em> — is now the spine of how we run every other kind of event. Corporate galas, brand reveals, roadshows, on-stage activations. Same clipboard.</p>
            </div>
            <div className="kind-rows">
              <div className="kind-row reveal">
                <div className="kn">— 01 —</div>
                <div>
                  <h3>Graduation <span className="ital">ceremonies</span></h3>
                </div>
                <div className="desc">
                  <p>The flagship discipline. 4,500 graduates called in name, in order, in front of 13,500 family members. Tears, lasers, kabuki drops. Nothing improvised.</p>
                  <div className="feat">
                    <span>— Stage design &amp; 3D render</span>
                    <span>— LED walls · Sound · Laser · Kabuki</span>
                    <span>— Student registration &amp; seating</span>
                    <span>— Live streaming</span>
                  </div>
                </div>
                <div className="kimg"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg" alt="" /></div>
              </div>
              <div className="kind-row reveal">
                <div className="kn">— 02 —</div>
                <div>
                  <h3>Brand <span className="ital">activations</span></h3>
                </div>
                <div className="desc">
                  <p>Pop-up experiences that turn foot-traffic into a crowd. Product reveals, influencer nights, road shows. We build the shell, you bring the story — or we help write it.</p>
                  <div className="feat">
                    <span>— Concept design &amp; spatial</span>
                    <span>— Stage &amp; set build</span>
                    <span>— AV, MC, ushers</span>
                    <span>— Crew + hostess management</span>
                  </div>
                </div>
                <div className="kimg"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Velocity-3.jpg" alt="" /></div>
              </div>
              <div className="kind-row reveal">
                <div className="kn">— 03 —</div>
                <div>
                  <h3>Corporate <span className="ital">galas &amp; launches</span></h3>
                </div>
                <div className="desc">
                  <p>The annual dinner. The product unveiling. The 500-seat town hall. Rooms where the lights going down at the wrong cue kills a quarter of marketing work.</p>
                  <div className="feat">
                    <span>— LED, sound, lighting</span>
                    <span>— Photography &amp; videography</span>
                    <span>— Backdrop &amp; venue branding</span>
                    <span>— On-site event management</span>
                  </div>
                </div>
                <div className="kimg"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Meydan13.jpg" alt="" /></div>
              </div>
              <div className="kind-row reveal">
                <div className="kn">— 04 —</div>
                <div>
                  <h3>Roadshows &amp; <span className="ital">tours</span></h3>
                </div>
                <div className="desc">
                  <p>One concept, multiple cities, rarely the same venue twice. Modular design that packs flat, unpacks identically, and lets your regional team present the same brand everywhere.</p>
                  <div className="feat">
                    <span>— Modular stage system</span>
                    <span>— Transport &amp; logistics</span>
                    <span>— Travelling crew</span>
                    <span>— Local hostess coordination</span>
                  </div>
                </div>
                <div className="kimg"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Cares.jpg" alt="" /></div>
              </div>
            </div>
          </div>
        </section>

        {/* HCT FLAGSHIP */}
        <section className="flagship">
          <div className="container">
            <div className="flagship-head reveal">
              <div>
                <span className="chip"><span className="chip-dot"></span>Flagship · Case No. 001</span>
                <h2>The graduation standard<br />we <span className="ital">hold ourselves to</span>.</h2>
              </div>
              <p>Seven ceremonies. Five emirates. A single season. Every graduate named, every family seated, every cue landed. It's the project that taught us what "production memory" actually means — and it's why universities and schools keep coming back.</p>
            </div>

            <div className="flagship-img reveal">
              <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg" alt="HCT Graduation hall" />
              <div className="corner">HCT · Grand Ceremony</div>
            </div>

            <div className="flagship-figs reveal">
              <div className="fsfig">
                <div className="n">7</div>
                <div className="l">Grand ceremonies across the UAE</div>
              </div>
              <div className="fsfig">
                <div className="n">4,500</div>
                <div className="l">Graduates, each named &amp; cued</div>
              </div>
              <div className="fsfig">
                <div className="n">13,500</div>
                <div className="l">Families &amp; friends in the rooms</div>
              </div>
              <div className="fsfig">
                <div className="n">0</div>
                <div className="l">Cues missed, across every show</div>
              </div>
            </div>

            <div className="quote-block reveal">
              <div className="q">A graduation is the loudest photograph a family ever takes. Ours get it right on the first try, because we've already gotten it wrong in our rehearsals.</div>
              <aside>
                <strong>What we handle end-to-end</strong>
                Concept &amp; 3D rendering · stage design · LED, sound &amp; lighting · laser show &amp; kabuki drop · student registration &amp; seating · venue branding · backdrop &amp; stage graphics · videography, photography &amp; live streaming.
              </aside>
            </div>

            <div style={{ marginTop: '56px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a href="/hct-case-study" className="btn" style={{ borderColor: 'var(--paper)', color: 'var(--paper)' }}>Read the full case study <span className="arrow">→</span></a>
            </div>
          </div>
        </section>

        {/* CUE SHEET */}
        <section className="cuesheet">
          <div className="container">
            <div className="cuesheet-inner">
              <div className="cuesheet-copy reveal">
                <span className="eyebrow"><span className="dot"></span>The quiet document</span>
                <h2 style={{ marginTop: '16px' }}>Our cue sheets are <span className="ital">minute-by-minute</span>.</h2>
                <p>Every ceremony, gala and launch we run has a master cue sheet. A single source of truth that the lighting desk, the sound engineer, the MC, the video director and the student registration desk are all reading from.</p>
                <p>It looks ordinary. It is extraordinary. It's why the laser fires on the third chord and not the fourth. It's why the kabuki lands as the VP says the word "future."</p>
                <p>After the show, this document gets one more column — <em>"what we'd change"</em>. That's the page we re-read when you call us for the next one.</p>
              </div>

              <div className="cue-doc reveal" aria-hidden="true">
                <div className="cue-doc-hd">
                  <span className="t">Cue Sheet · HCT Grad <span style={{ fontFamily: 'var(--sans)', fontSize: '11px', fontStyle: 'normal', letterSpacing: '0.14em', color: 'rgba(245,241,234,0.6)' }}>DXB &middot; '24</span></span>
                  <span className="s">REV 04 · FINAL</span>
                </div>
                <div className="cue-row">
                  <div className="tm">T −05:00</div>
                  <div className="what">House lights down</div>
                  <div className="dept">Lx</div>
                  <div className="note">0.5s slower '23</div>
                </div>
                <div className="cue-row">
                  <div className="tm">T −00:30</div>
                  <div className="what">Processional music · up</div>
                  <div className="dept">Audio</div>
                  <div className="note">bed from '21 cue</div>
                </div>
                <div className="cue-row">
                  <div className="tm">T +00:00</div>
                  <div className="what">Chancellor enters · spot 1</div>
                  <div className="dept">Lx · FOH</div>
                  <div className="note">stage left per '23</div>
                </div>
                <div className="cue-row highlight">
                  <div className="tm">T +04:12</div>
                  <div className="what">LED wall · montage in</div>
                  <div className="dept">Video</div>
                  <div className="note">family reaction test · PASS</div>
                </div>
                <div className="cue-row">
                  <div className="tm">T +28:00</div>
                  <div className="what">First name called · Abu Dhabi block</div>
                  <div className="dept">MC · Reg</div>
                  <div className="note">alpha A-H seated block 1</div>
                </div>
                <div className="cue-row highlight">
                  <div className="tm">T +92:14</div>
                  <div className="what">Kabuki drop · stage right</div>
                  <div className="dept">Rig · Lx</div>
                  <div className="note">aligned to "future" keyword</div>
                </div>
                <div className="cue-row">
                  <div className="tm">T +92:16</div>
                  <div className="what">Laser burst · warm white</div>
                  <div className="dept">FX</div>
                  <div className="note">beam count: 18 · '23 count: 12</div>
                </div>
                <div className="cue-row">
                  <div className="tm">T +94:00</div>
                  <div className="what">Confetti · full stage</div>
                  <div className="dept">FX</div>
                  <div className="note">eco-confetti · new '24</div>
                </div>
                <div className="cue-row">
                  <div className="tm">T +95:30</div>
                  <div className="what">Live stream caps</div>
                  <div className="dept">Video</div>
                  <div className="note">42k concurrent peak</div>
                </div>
                <div className="cue-doc-ft">
                  <span>Illustrative format · 147 cues total in full sheet</span>
                  <span className="pulse"><span className="pulse-dot"></span>Logged to dossier</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section className="evgallery">
          <div className="container">
            <div className="evgallery-head reveal">
              <div>
                <span className="eyebrow"><span className="dot"></span>Selected moments</span>
                <h2 style={{ marginTop: '12px' }}>Rooms we've <span className="ital">quietly run</span>.</h2>
              </div>
              <span className="body-sm">HCT · RAK American Academy · Velocity · Philips · Landmark Group</span>
            </div>
            <div className="eg-grid reveal">
              <div className="eg eg-a"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg" alt="" /><span className="lbl">HCT · Grand Ceremony</span></div>
              <div className="eg eg-b"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/3-HCT-Fujeirah1.jpg" alt="" /><span className="lbl">HCT · Fujairah</span></div>
              <div className="eg eg-c"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Meydan6.jpg" alt="" /><span className="lbl">Philips · Meydan launch</span></div>
              <div className="eg eg-d"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Velocity-4.jpg" alt="" /><span className="lbl">Velocity</span></div>
              <div className="eg eg-e"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Velocity-12.jpg" alt="" /><span className="lbl">Velocity · stage</span></div>
              <div className="eg eg-f"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Cares.jpg" alt="" /><span className="lbl">Corporate event</span></div>
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section className="caps">
          <div className="container">
            <div className="caps-grid">
              <div className="reveal">
                <span className="eyebrow"><span className="dot"></span>What's under the hood</span>
                <h2 style={{ marginTop: '14px' }}>Everything you'd expect,<br />nothing <span className="ital">subcontracted</span> that shouldn't be.</h2>
              </div>
              <div className="cap-tabs reveal">
                <div className="cap-cell"><span className="n">— 01 —</span><h3>LED walls &amp; <span className="ital">video</span></h3><p>Indoor, outdoor, curved, transparent. 42k concurrent live stream peak handled in-house.</p></div>
                <div className="cap-cell"><span className="n">— 02 —</span><h3>Sound, <span className="ital">lighting</span>, rig</h3><p>Line-array, moving head, followspot. FOH and monitor engineers on our payroll.</p></div>
                <div className="cap-cell"><span className="n">— 03 —</span><h3>Laser show &amp; <span className="ital">kabuki</span></h3><p>The moments people film on their phones. Every cue pre-choreographed to music and script.</p></div>
                <div className="cap-cell"><span className="n">— 04 —</span><h3>Stage &amp; <span className="ital">set build</span></h3><p>In-house carpentry and joinery in Sharjah. We build, we transport, we install, we strike.</p></div>
                <div className="cap-cell"><span className="n">— 05 —</span><h3>Registration &amp; <span className="ital">seating</span></h3><p>The operational choreography — the thousand people you need in the right seats before the chancellor walks in.</p></div>
                <div className="cap-cell"><span className="n">— 06 —</span><h3>Photo, video, <span className="ital">stream</span></h3><p>Full-crew coverage. Multi-cam livestream, post-edit highlight reel, family photo distribution.</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* WHO FOR */}
        <section className="ev-who">
          <div className="container">
            <div className="ev-who-head reveal">
              <h2>Who this <span className="ital">is for</span>.</h2>
              <span className="body-sm">Three audiences we speak to differently</span>
            </div>
            <div className="ev-who-grid reveal">
              <div className="who-card">
                <div>
                  <div className="ic">01</div>
                  <h3>Universities &amp; <span className="ital">schools</span></h3>
                  <p>Chancellors, registrars, marketing heads with a graduation looming. You know the stakes; you just want a partner who's held graduation day more than once.</p>
                </div>
                <ul>
                  <li>Graduation ceremonies</li>
                  <li>Open days &amp; orientation</li>
                  <li>Campus branding</li>
                  <li>Convocations</li>
                </ul>
              </div>
              <div className="who-card">
                <div>
                  <div className="ic">02</div>
                  <h3>CMOs &amp; brand <span className="ital">marketing teams</span></h3>
                  <p>You're launching, activating, celebrating. You need the stage to match what you're paying the press to attend for. And you need it quietly, without 4am vendor chaos.</p>
                </div>
                <ul>
                  <li>Product launches</li>
                  <li>Brand activations</li>
                  <li>Influencer nights</li>
                  <li>Press events</li>
                </ul>
              </div>
              <div className="who-card">
                <div>
                  <div className="ic">03</div>
                  <h3>Corporate <span className="ital">event organisers</span></h3>
                  <p>Annual dinners, town halls, awards evenings. The rooms where the internal audience matters more than the external one — and where things going wrong becomes a management problem.</p>
                </div>
                <ul>
                  <li>Annual galas</li>
                  <li>Internal town halls</li>
                  <li>Awards evenings</li>
                  <li>Client appreciation nights</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* QUOTE */}
        <section className="ev-quote">
          <div className="container">
            <div className="reveal">
              <p className="q">The things that matter in an event are the things you don't notice.</p>
              <div className="by">— The house view at EGS<span>a note on how we work</span></div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ev-cta" id="cta">
          <div className="container">
            <span className="chip" style={{ background: 'transparent', borderColor: 'rgba(245,241,234,0.3)', color: 'rgba(245,241,234,0.7)', marginBottom: '32px' }}>
              <span className="chip-dot" style={{ background: 'var(--terracotta)' }}></span>A brief, a walk-through, a run-sheet
            </span>
            <h2 className="reveal">Tell us the <span className="ital">moment</span>.<br />We'll show you the <span className="ital">run-sheet</span>.</h2>
            <p>Send us a paragraph about what the night needs to feel like and who's in the room. We'll reply with stage options, a headline cost range, and the names of the team who'd run it. No forms. No gated downloads.</p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a href="mailto:info@exhibitgraphicsign.com?subject=Event%20Brief" className="btn btn-primary">Brief us on your event <span className="arrow">→</span></a>
              <a href="/hct-case-study" className="btn">Read HCT case study</a>
            </div>

            <div className="pledges">
              <div><h4>No missed cues</h4><p>Fourteen years of ceremonies. We've never had to restart one.</p></div>
              <div><h4>Same crew, each time</h4><p>The foreman you meet at kickoff is there on show night.</p></div>
              <div><h4>A debrief, every time</h4><p>One page, seven days after load-out. What worked. What we'd change.</p></div>
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
              <div><h4>Services</h4><ul><li>Indoor &amp; Outdoor Signage</li><li>Large-Format Printing</li><li>Product Display Stands</li><li>Mall Kiosks</li><li>Vehicle Branding</li></ul></div>
              <div><h4>Contact</h4><ul><li>info@exhibitgraphicsign.com</li><li>+971 4 238 3278</li><li>Al Qusais, Dubai</li><li>Industrial Area 11, Sharjah</li></ul></div>
            </div>
            <div className="footer-big"><em>We remember</em> every project.</div>
            <div className="footer-bottom">
              <span>© 2026 Exhibit Graphic Sign · Est. 2010</span>
              <span>File No. 003 / Events</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
