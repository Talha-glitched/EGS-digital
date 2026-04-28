import pageStyles from '../styles/pages/home.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { useStandPreview } from '../hooks/useStandPreview.js';

export default function HomePage() {
  usePageLifecycle('Exhibit Graphic Sign \u00b7 A creative partner that remembers');
  useStandPreview();

  return (
    <>
      <style>{pageStyles}</style>
      <div className="egs-page egs-home">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-inner">
            <a href="/" className="logo" aria-label="Exhibit Graphic Sign home">
              <img className="logo-img" src="https://exhibitgraphicsign.com/wp-content/uploads/2024/02/EGS-Logo-300x126.png" alt="EGS" />
            </a>
            <div className="nav-links">
              <a href="/" className="active">Home</a>
              <a href="/exhibitions">Exhibitions</a>
              <a href="/events">Events</a>
              <a href="/fitouts">Fitouts</a>
              <a href="/retail">Retail</a>
              <a href="/hct-case-study">Case Study</a>
            </div>
            <a href="#contact" className="nav-cta">Start a file <span>→</span></a>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="container">
            <div className="hero-grid">
              <div className="hero-l">
                <div>
                  <div className="hero-chip-row">
                    <span className="chip"><span className="chip-dot"></span>Dubai production house · since 2010</span>
                    <span className="chip c-a"><span className="chip-dot"></span>We remember every project</span>
                  </div>
                  <h1>
                    We build the <span className="ital c1">moment</span>.<br />
                    We remember <span className="underlined ital">what&nbsp;worked</span>.<br />
                    Next one&nbsp;is <span className="ital c2">better</span>.
                  </h1>
                  <p className="lede">Exhibition stands, events, fitouts, retail. A creative partner <em>who keeps a file on you</em>.</p>
                </div>
                <div>
                  <div className="hero-footer">
                    <a href="#audiences" className="btn btn-primary">See our work <span className="arrow">→</span></a>
                    <a href="#contact" className="btn btn-ghost">Start a project</a>
                  </div>
                  <div className="hero-stats">
                    <div className="hero-stat"><div className="n a1">14<span style={{ fontSize: '.55em', fontStyle: 'italic' }}>&nbsp;yrs</span></div><div className="l">making rooms</div></div>
                    <div className="hero-stat"><div className="n a2">300+</div><div className="l">engagements</div></div>
                    <div className="hero-stat"><div className="n a3">40+</div><div className="l">returning clients</div></div>
                    <div className="hero-stat"><div className="n">8,000<span style={{ fontSize: '.55em', fontStyle: 'italic' }}>&nbsp;sqft</span></div><div className="l">joinery, Sharjah</div></div>
                  </div>
                </div>
              </div>
              <div className="hero-img-stack">
                <div className="cell">
                  <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg" alt="HCT Grand Graduation" />
                  <span className="lbl">HCT Grand Graduation &middot; '24</span>
                </div>
                <div className="row">
                  <div className="cell">
                    <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg" alt="Philips Pairs Arab Health" />
                    <span className="lbl">Philips &middot; 240 sqm</span>
                  </div>
                  <div className="cell">
                    <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/FAK-Properties1.jpg" alt="Fakhruddin Properties showroom" />
                    <span className="lbl">Fakhruddin &middot; showroom</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CLIENT MARQUEE */}
        <div className="mq-wrap">
          <div className="marquee">
            <div className="marquee-track">
              <div className="marquee-item">Philips</div>
              <div className="marquee-item">Schindler</div>
              <div className="marquee-item">Landmark Group</div>
              <div className="marquee-item">Higher Colleges of Technology</div>
              <div className="marquee-item">800 Pizza</div>
              <div className="marquee-item">Serco</div>
              <div className="marquee-item">ENH Media</div>
              <div className="marquee-item">Fakhruddin Properties</div>
              <div className="marquee-item">Abbott Nutrition</div>
              <div className="marquee-item">GSK</div>
              <div className="marquee-item">RAK American Academy</div>
            </div>
          </div>
        </div>

        {/* WHAT WE DO (image-led explainer) */}
        <section className="quick">
          <div className="container">
            <div className="quick-head">
              <h2>We do four <span className="ital cc1">kinds of work</span>. Each one <span className="ital cc2">remembered</span>, year after year.</h2>
              <span className="chip c-a"><span className="chip-dot"></span>Plain English, no pitch</span>
            </div>
            <div className="quick-grid">
              <a className="qcard" href="/exhibitions">
                <div className="ci">
                  <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg" alt="" />
                  <span className="swatch" style={{ background: 'var(--accent-a)', color: 'var(--ink)' }}>01 · STANDS</span>
                </div>
                <div className="body">
                  <h3>Exhibition <span className="ital">stands</span></h3>
                  <p>Arab Health. GITEX. ADIPEC. Stands that get re-skinned and re-used.</p>
                  <span className="go"><span>For exhibitors</span><span className="arrow">→</span></span>
                </div>
              </a>
              <a className="qcard" href="/events">
                <div className="ci">
                  <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg" alt="" />
                  <span className="swatch" style={{ background: 'var(--accent-b)' }}>02 · EVENTS</span>
                </div>
                <div className="body">
                  <h3>Events &amp; <span className="ital">activations</span></h3>
                  <p>Graduations, galas, product launches. Lasers, kabuki, quiet crew.</p>
                  <span className="go"><span>For CMOs &amp; registrars</span><span className="arrow">→</span></span>
                </div>
              </a>
              <a className="qcard" href="/fitouts">
                <div className="ci">
                  <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/FAK-Properties1.jpg" alt="" />
                  <span className="swatch" style={{ background: 'var(--accent-c)' }}>03 · FITOUTS</span>
                </div>
                <div className="body">
                  <h3>Interior <span className="ital">fitouts</span></h3>
                  <p>Showrooms and offices. Built once. Looked at for the next decade.</p>
                  <span className="go"><span>For property &amp; HR</span><span className="arrow">→</span></span>
                </div>
              </a>
              <a className="qcard" href="/retail">
                <div className="ci">
                  <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/800-Pizza.jpg" alt="" />
                  <span className="swatch" style={{ background: 'var(--accent-d)' }}>04 · RETAIL</span>
                </div>
                <div className="body">
                  <h3>Retail <span className="ital">branding</span></h3>
                  <p>End-caps, kiosks, in-store theatre. 30+ mall locations, one week.</p>
                  <span className="go"><span>For merchandisers</span><span className="arrow">→</span></span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* 3D STAND */}
        <section className="stand3d">
          <div className="container">
            <div className="stand3d-head reveal">
              <div>
                <span className="chip"><span className="chip-dot"></span>Live · From the drawing board</span>
                <h2 style={{ marginTop: '18px' }}>Every stand <span className="ital cc1">starts</span> as<br />a <span className="ital cc2">wireframe</span>.</h2>
              </div>
              <p>A rotating 3D sketch of a typical double-deck stand. Rendered every project before the first plywood gets cut. Meeting pods, LED wall, demo zone, pair zones.</p>
            </div>

            <div className="stand3d-stage reveal" id="stand3d-stage">
              <div className="stand3d-overlay">Stand preview · wireframe</div>
              <div className="stand3d-meta">
                <span>Ref</span>
                <em>Philips Pairs · 240 sqm</em>
              </div>

              <svg id="stand3d-svg" viewBox="-400 -260 800 520" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(212,160,23,0.18)"/>
                    <stop offset="100%" stopColor="rgba(212,160,23,0)"/>
                  </linearGradient>
                </defs>
                <g id="stand-root">
                  {/* Floor grid (rendered via JS for rotation) */}
                </g>
              </svg>

              <div className="stand3d-ctrl">
                <button data-spd="slow">Slow</button>
                <button data-spd="med" className="on">Rotate</button>
                <button data-spd="fast">Fast</button>
                <button data-spd="pause">Pause</button>
              </div>
            </div>

            <div className="stand3d-legend reveal">
              <div className="lg"><strong><span className="c-dot" style={{ background: 'var(--accent-a)' }}></span>LED wall</strong>6m &middot; 4k</div>
              <div className="lg"><strong><span className="c-dot" style={{ background: 'var(--accent-b)' }}></span>Meeting pods</strong>4 &times; semi-private</div>
              <div className="lg"><strong><span className="c-dot" style={{ background: 'var(--accent-c)' }}></span>Demo zones</strong>2 &middot; pair-zone concept</div>
              <div className="lg"><strong><span className="c-dot" style={{ background: '#b8c7cc' }}></span>Modular shell</strong>62% re-usable</div>
            </div>
          </div>
        </section>

        {/* AUDIENCE BLOCK (image-led) */}
        <section className="aud-block" id="audiences">
          <div className="container">
            <div className="head">
              <div>
                <span className="chip"><span className="chip-dot"></span>Who are you building for</span>
                <h2 style={{ marginTop: '14px' }}>Pick your <span className="ital c1">room</span>. We'll speak <span className="ital c2">your language</span>.</h2>
              </div>
              <span className="body-sm" style={{ maxWidth: '40ch' }}>A trade-show director and a retail merchandiser don't hear the same pitch. Click in.</span>
            </div>
            <div className="aud-grid">
              <a className="au" href="/exhibitions" data-c="a">
                <span className="stripe"></span>
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Arab-Health.jpg" alt="" />
                <div className="body">
                  <div className="n">01 &middot; Stands</div>
                  <h3><span className="ital">Exhibitions</span></h3>
                  <div className="hook">Philips, Abbott, GSK. 240 sqm builds. 62% re-use.</div>
                  <span className="go">Enter <span>→</span></span>
                </div>
              </a>
              <a className="au" href="/events" data-c="b">
                <span className="stripe"></span>
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg" alt="" />
                <div className="body">
                  <div className="n">02 &middot; Events</div>
                  <h3>Brand <span className="ital">activations</span></h3>
                  <div className="hook">HCT, RAK American. 4,500 graduates. Zero missed cues.</div>
                  <span className="go">Enter <span>→</span></span>
                </div>
              </a>
              <a className="au" href="/fitouts" data-c="c">
                <span className="stripe"></span>
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/FAK-Properties1.jpg" alt="" />
                <div className="body">
                  <div className="n">03 &middot; Fitouts</div>
                  <h3>Showroom <span className="ital">fitouts</span></h3>
                  <div className="hook">Fakhruddin, Schindler. Built once. Ten-year surface.</div>
                  <span className="go">Enter <span>→</span></span>
                </div>
              </a>
              <a className="au" href="/retail" data-c="d">
                <span className="stripe"></span>
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/800-Pizza.jpg" alt="" />
                <div className="body">
                  <div className="n">04 &middot; Retail</div>
                  <h3>Retail <span className="ital">branding</span></h3>
                  <div className="hook">Landmark, 800 Pizza. 30+ sites. One-week rollout.</div>
                  <span className="go">Enter <span>→</span></span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* MEMORY / LEDGER */}
        <section className="memory">
          <div className="container">
            <div className="memory-grid">
              <div className="reveal">
                <span className="eyebrow"><span className="dot"></span>The difference</span>
                <h2 style={{ marginTop: '14px' }}>Most vendors <span className="ital c1">forget</span>.<br />We keep a <span className="ital c2">file</span>.</h2>
                <p className="lede-m">Every show, we write down: what moved the room, what flopped, what to fix next year.</p>
                <p className="sub-m">When you come back, we don't start from zero. Colours, hardware, traffic patterns, last year's mistakes, already in the room.</p>
                <div className="chiprow">
                  <span className="chip c-a"><span className="chip-dot"></span>Project memory</span>
                  <span className="chip c-b"><span className="chip-dot"></span>Post-event notes</span>
                  <span className="chip c-c"><span className="chip-dot"></span>Lead tracking</span>
                  <span className="chip c-d"><span className="chip-dot"></span>Hardware re-use</span>
                </div>
              </div>

              <div className="ledger reveal" aria-hidden="true">
                <div className="ledger-hd">
                  <div className="t">Client dossier <strong>Philips Healthcare</strong></div>
                  <div className="sub">Engagement 06</div>
                </div>
                <div>
                  <div className="ledger-row">
                    <div className="year">'19</div>
                    <div className="proj">Arab Health &middot; 120 sqm</div>
                    <div className="what">Double-deck, pairs zone</div>
                    <div className="note">first engagement</div>
                    <div><span className="result mid">benchmark</span></div>
                  </div>
                  <div className="ledger-row">
                    <div className="year">'20</div>
                    <div className="proj">Arab Health &middot; 120 sqm</div>
                    <div className="what">Re-skinned hardware, 18% less</div>
                    <div className="note">kept meeting pods</div>
                    <div><span className="result up">+34% leads</span></div>
                  </div>
                  <div className="ledger-row">
                    <div className="year">'21</div>
                    <div className="proj">Meydan Launch Event</div>
                    <div className="what">Radiology reveal &middot; 380 guests</div>
                    <div className="note">LED spec from '19</div>
                    <div><span className="result up">NPS 72</span></div>
                  </div>
                  <div className="ledger-row">
                    <div className="year">'22</div>
                    <div className="proj">Arab Health &middot; 180 sqm</div>
                    <div className="what">Pair-zone v2 &middot; VR demo</div>
                    <div className="note">dead corner noted</div>
                    <div><span className="result up">+41% leads</span></div>
                  </div>
                  <div className="ledger-row">
                    <div className="year">'23</div>
                    <div className="proj">Radiology roadshow</div>
                    <div className="what">6 cities &middot; modular shell</div>
                    <div className="note">same carpenters</div>
                    <div><span className="result flat">on plan</span></div>
                  </div>
                  <div className="ledger-row">
                    <div className="year">'24</div>
                    <div className="proj">Arab Health &middot; 240 sqm</div>
                    <div className="what">3-storey &middot; 62% re-used</div>
                    <div className="note">booked '25</div>
                    <div><span className="result best">+22% leads</span></div>
                  </div>
                </div>
                <div className="ledger-ft">
                  <span>Confidential &middot; illustrative format</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><span className="pulse-dot"></span>Still tracking</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HCT FEATURE */}
        <section className="hct">
          <div className="container">
            <div className="hct-head reveal">
              <div>
                <span className="chip" style={{ marginBottom: '20px' }}><span className="chip-dot" style={{ background: 'var(--accent-a)' }}></span>Case No. 001 &middot; Anchor project</span>
                <h2>Seven nights, <span className="ital">five emirates</span>, 4,500 graduates.</h2>
              </div>
              <a href="/hct-case-study" className="btn" style={{ borderColor: 'rgba(245,241,234,0.5)', color: 'var(--paper)' }}>Read the full story <span className="arrow">→</span></a>
            </div>

            <div className="hct-hero reveal">
              <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg" alt="HCT Graduation Ceremony" />
              <div className="overlay-meta">
                <span>Higher Colleges of Technology</span>
                <span>Dubai &middot; Abu Dhabi &middot; Sharjah &middot; RAK &middot; Fujairah</span>
                <span>Since 2018</span>
              </div>
            </div>

            <div className="hct-stats">
              <div className="hct-numbers reveal">
                <div className="hct-num" data-c="a">
                  <div className="fig">7</div>
                  <div className="cap">Grand ceremonies, UAE</div>
                </div>
                <div className="hct-num">
                  <div className="fig">4,500</div>
                  <div className="cap">Graduates, each cued by name</div>
                </div>
                <div className="hct-num" data-c="b">
                  <div className="fig">13,500</div>
                  <div className="cap">Families in the rooms</div>
                </div>
                <div className="hct-num">
                  <div className="fig">5</div>
                  <div className="cap">Emirates, single season</div>
                </div>
                <div className="hct-num" data-c="a">
                  <div className="fig">0</div>
                  <div className="cap">Cues missed, ever</div>
                </div>
              </div>
              <div className="hct-story reveal">
                <h3>A graduation is the loudest photograph a family ever takes.</h3>
                <p>HCT trusted us with seven, across five emirates, one season. Stage &amp; 3D render. LED walls, sound, laser, kabuki. Student registration, seating, live streaming. The unseen hundred things that make a four-second name-reading feel like a lifetime.</p>
                <p>Year after year for HCT. The run-of-show template lives in our drive. We know which hall in RAK has tricky acoustics, which campus loves a big laser finish. Seventh ceremony is not like the first.</p>
                <div style={{ marginTop: '24px' }}>
                  <span className="chip c-a"><span className="chip-dot"></span>Concept &amp; 3D</span>
                  <span className="chip c-b" style={{ marginLeft: '6px' }}><span className="chip-dot"></span>LED &middot; Sound &middot; Lighting</span>
                  <span className="chip c-c" style={{ marginLeft: '6px' }}><span className="chip-dot"></span>Laser &middot; Kabuki</span>
                  <span className="chip c-d" style={{ marginLeft: '6px' }}><span className="chip-dot"></span>Live stream</span>
                </div>
              </div>
            </div>

            <div className="hct-footer reveal">
              <a href="/hct-case-study" className="btn">Open the HCT dossier <span className="arrow">→</span></a>
              <div className="scroll-strip">
                <div className="hct-thumb"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/3-HCT-Fujeirah1.jpg" alt="" /></div>
                <div className="hct-thumb"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-2-1-1.jpg" alt="" /></div>
                <div className="hct-thumb"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-2-2.jpg" alt="" /></div>
              </div>
            </div>
          </div>
        </section>

        {/* GALLERY WALL */}
        <section className="gallery bg-paper-2">
          <div className="container">
            <div className="gallery-head reveal">
              <div>
                <span className="eyebrow"><span className="dot"></span>Selected works</span>
                <h2 style={{ marginTop: '12px' }}>A wall of <span className="ital c1">what we've made</span>.</h2>
              </div>
              <span className="body-sm">Philips &middot; Schindler &middot; Landmark &middot; HCT &middot; 800 Pizza &middot; Fakhruddin</span>
            </div>
            <div className="gallery-grid reveal">
              <div className="gm g-a" data-c="b">
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg" alt="" />
                <span className="yr">'24</span>
                <span className="cap">Philips Pairs &middot; Arab Health</span>
              </div>
              <div className="gm g-b" data-c="c">
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/FAK-Properties1.jpg" alt="" />
                <span className="yr">'23</span>
                <span className="cap">Fakhruddin showroom</span>
              </div>
              <div className="gm g-c" data-c="a">
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Meydan13.jpg" alt="" />
                <span className="yr">'21</span>
                <span className="cap">Meydan launch</span>
              </div>
              <div className="gm g-d" data-c="d">
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/800-Pizza.jpg" alt="" />
                <span className="yr">'22</span>
                <span className="cap">800 Pizza &middot; retail</span>
              </div>
              <div className="gm g-e" data-c="b">
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Velocity-3.jpg" alt="" />
                <span className="yr">'23</span>
                <span className="cap">Velocity &middot; brand event</span>
              </div>
              <div className="gm g-f" data-c="e">
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg" alt="" />
                <span className="yr">'24</span>
                <span className="cap">HCT &middot; grand ceremony</span>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="testimonials">
          <div className="container">
            <div style={{ marginBottom: '40px' }}>
              <span className="eyebrow"><span className="dot"></span>In clients' own words</span>
            </div>
            <div className="testi c-a reveal">
              <div className="quote">EGS came up with a clean and elegant design. Our client was impressed. We used these boards at every backlog site.</div>
              <div className="byline"><strong>Seby Cyriac</strong>Director &middot; Cube Innovators</div>
            </div>
            <div className="testi c-b reveal">
              <div className="quote">Prompt response, quick turnaround, friendly service, fair pricing. That is how I recognize EGS.</div>
              <div className="byline"><strong>K. Bala</strong>Director &middot; ENH Media</div>
            </div>
            <div className="testi c-c reveal">
              <div className="quote">One company I can recommend with confidence. I have called at the most ungodly hour. The job got executed.</div>
              <div className="byline"><strong>Amrita Kalra</strong>Director &middot; Media Mind</div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="contact-band" id="contact">
          <div className="container">
            <div className="reveal">
              <span className="chip" style={{ background: 'transparent', borderColor: 'rgba(245,241,234,0.3)', color: 'rgba(245,241,234,0.7)', marginBottom: '28px' }}>
                <span className="chip-dot" style={{ background: 'var(--accent-a)' }}></span>Let's open a file
              </span>
              <div className="lead">A <span className="ital c1">brief</span>, a <span className="ital c2">coffee</span>,<br />or a late-night <span className="ital c3">call</span>.</div>
            </div>
            <div className="contact-grid">
              <div className="contact-col">
                <h4>Say hello</h4>
                <p className="big">info@exhibitgraphicsign.com</p>
                <p style={{ marginTop: '10px' }}>+971 4 238 3278 &middot; +971 52 458 7992</p>
                <p style={{ marginTop: '20px' }}><a href="#" style={{ borderBottom: '1px solid currentColor', paddingBottom: '2px' }}>WhatsApp →</a></p>
              </div>
              <div className="contact-col">
                <h4>Showroom</h4>
                <p>Nasiriya Building<br />Baghdad Street<br />Al Qusais, Dubai</p>
              </div>
              <div className="contact-col">
                <h4>Joinery</h4>
                <p>Industrial Area 11<br />Sharjah<br />8,000 sqft under one roof</p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="container">
            <div className="footer-grid">
              <div>
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/02/EGS-Logo-300x126.png" alt="EGS" style={{ height: '44px', filter: 'brightness(0) invert(1)', marginBottom: '20px' }} />
                <p style={{ maxWidth: '40ch', fontSize: '14px', opacity: '0.7', lineHeight: '1.5' }}>A Dubai production house for exhibitions, events, fitouts and retail branding. We build the moment. We remember what worked.</p>
              </div>
              <div><h4>Audiences</h4><ul><li><a href="/exhibitions">Exhibition Stands</a></li><li><a href="/events">Events &amp; Activations</a></li><li><a href="/fitouts">Interior Fitouts</a></li><li><a href="/retail">Retail Branding</a></li></ul></div>
              <div><h4>Services</h4><ul><li>Signage</li><li>Large-Format Printing</li><li>Product Display Stands</li><li>Mall Kiosks</li><li>Vehicle Branding</li></ul></div>
              <div><h4>Contact</h4><ul><li>info@exhibitgraphicsign.com</li><li>+971 4 238 3278</li><li>Al Qusais, Dubai</li><li>Industrial Area 11, Sharjah</li></ul></div>
            </div>
            <div className="footer-big"><em>We remember</em> every project.</div>
            <div className="footer-bottom">
              <span>© 2026 Exhibit Graphic Sign &middot; Est. 2010</span>
              <span>File No. 001 / Home</span>
            </div>
          </div>
        </footer>





        {/* 3D WIREFRAME */}


        {/* TWEAKS WIRING */}
      </div>
    </>
  );
}
