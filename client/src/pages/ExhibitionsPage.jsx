import pageStyles from '../styles/pages/exhibitions.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';

export default function ExhibitionsPage() {
  usePageLifecycle('Exhibition Stands \u2014 EGS \u00b7 Arab Health, GITEX, ADIPEC');

  return (
    <>
      <style>{pageStyles}</style>
      <div className="egs-page egs-exhibitions">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-inner">
            <a href="/" className="logo"><span className="mark"><em>Exhibit</em>Graphic&nbsp;Sign</span><span className="tag">Est. 2010 · Dubai</span></a>
            <div className="nav-links">
              <a href="/">Home</a>
              <a href="/exhibitions" className="active">Exhibitions</a>
              <a href="/events">Events</a>
              <a href="/fitouts">Fitouts</a>
              <a href="/retail">Retail</a>
              <a href="/hct-case-study">Case Study</a>
            </div>
            <a href="#cta" className="nav-cta">Request a stand brief <span>→</span></a>
          </div>
        </nav>

        {/* SUBNAV */}
        <div className="subnav">
          <div className="container">
            <div className="subnav-inner">
              <div className="breadcrumb">
                <a href="/">Home</a><span className="sep">/</span><strong>Exhibition Stands</strong>
              </div>
              <div className="aud-switcher">
                <a href="/exhibitions" className="active">Exhibitions</a>
                <a href="/events">Events</a>
                <a href="/fitouts">Fitouts</a>
                <a href="/retail">Retail</a>
              </div>
            </div>
          </div>
        </div>

        {/* HERO */}
        <section className="land-hero">
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <span className="chip"><span className="chip-dot"></span>Audience 01 · Exhibition Stands</span>
              <span className="tick">For heads of marketing, trade, exhibitions &amp; medical affairs</span>
            </div>

            <div className="land-hero-grid reveal">
              <div>
                <h1>Your Arab Health stand doesn't start in <span className="ital">January</span>.<br />It starts in <span className="highlight ital">last year's debrief</span>.</h1>
                <p className="lede">We design and build stands for Arab Health, GITEX, ADIPEC, Gulfood — and we treat each one as <em>episode two</em> of a longer show. Same carpenters. Same dossier. Lower cost per square metre, higher cost per lead, every year.</p>
                <div className="land-cta-row">
                  <a href="#cta" className="btn btn-primary" style={{ background: 'var(--ochre)', borderColor: 'var(--ochre)', color: 'var(--ink)' }}>Request a stand brief <span className="arrow">→</span></a>
                  <a href="#work" className="btn btn-ghost">See our stands</a>
                </div>
              </div>
              <div className="land-hero-img">
                <img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg" alt="Philips Pairs stand at Arab Health" />
                <div className="caption">
                  <em>Philips Pairs · Arab Health '24</em>
                  <span>240 sqm · 3 storey</span>
                </div>
              </div>
            </div>

            <div className="spec-bar">
              <div className="spec-bar-inner">
                <div className="spec"><span className="k">Largest stand</span><span className="v">240 sqm</span></div>
                <div className="spec"><span className="k">Shows covered</span><span className="v">Arab Health · GITEX</span></div>
                <div className="spec"><span className="k">Turnaround</span><span className="v">Design → build · 6 wks</span></div>
                <div className="spec"><span className="k">On-site crew</span><span className="v">In-house, uniformed</span></div>
                <div className="spec"><span className="k">Re-use rate</span><span className="v">60%+ year 2</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="marquee">
          <div className="marquee-track">
            <div className="marquee-item">Philips Healthcare</div>
            <div className="marquee-item">Abbott Nutrition</div>
            <div className="marquee-item">GSK</div>
            <div className="marquee-item">Fosroc</div>
            <div className="marquee-item">Higher Colleges of Technology</div>
            <div className="marquee-item">Microlink</div>
            <div className="marquee-item">Serco</div>
            <div className="marquee-item">Freshy</div>
            <div className="marquee-item">Buser</div>
            <div className="marquee-item">Velocity</div>
          </div>
        </div>

        {/* PROMISE */}
        <section className="promise">
          <div className="container">
            <div className="promise-grid">
              <div className="promise-head reveal">
                <span className="eyebrow"><span className="dot"></span>The industry default · vs. us</span>
                <h2 style={{ marginTop: '14px' }}>Stand builders forget you the day the show ends.<br /><span className="ital">We don't.</span></h2>
                <p>The default in Dubai is simple: a new contractor every year, a new design from scratch, a fresh set of mistakes, and a re-build cost that doesn't go down. We think that's a waste — of your budget and our craft.</p>
              </div>
              <div className="compare-table reveal">
                <div className="compare-row">
                  <div className="bad">Fresh-start quote each January</div>
                  <div className="good">Quote referenced against last year's actuals</div>
                </div>
                <div className="compare-row">
                  <div className="bad">Hardware thrown after load-out</div>
                  <div className="good">Modular shell archived in our Sharjah joinery</div>
                </div>
                <div className="compare-row">
                  <div className="bad">Unknown crew on show day</div>
                  <div className="good">Same foreman you worked with last year</div>
                </div>
                <div className="compare-row">
                  <div className="bad">Post-show silence</div>
                  <div className="good">One-page debrief within 7 days of load-out</div>
                </div>
                <div className="compare-row">
                  <div className="bad">Lead count guessed</div>
                  <div className="good">Tagged traffic zones on the floor plan</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TIMELINE: PHILIPS STORY */}
        <section className="timeline">
          <div className="container">
            <div className="timeline-head reveal">
              <span className="chip"><span className="chip-dot"></span>Philips Healthcare · Engagement across six years</span>
              <h2 style={{ marginTop: '20px' }}>The same stand. <span className="ital">Quietly, every year, better.</span></h2>
              <p>This is what "we remember" looks like in the pharma-medtech world. A single client. Six Arab Healths. Not a new stand each time — an evolving one.</p>
            </div>
            <div className="timeline-rail reveal">
              <div className="timeline-years">
                <div className="tyear">
                  <span className="ylabel">'19</span>
                  <h4>120 sqm</h4>
                  <span className="size">Ground-up · first build</span>
                  <p>New relationship. We learned how they work, what the medical affairs team actually needs on the floor.</p>
                  <div className="metric">→ benchmark set</div>
                </div>
                <div className="tyear">
                  <span className="ylabel">'20</span>
                  <h4>120 sqm <span style={{ color: 'var(--olive)', fontStyle: 'italic', fontSize: '0.7em' }}>v2</span></h4>
                  <span className="size">Re-skinned · 60% hardware re-used</span>
                  <p>Same footprint, new graphics, new pair-zone. Stand cost down 18%. We kept the meeting pods — the MA team loved them.</p>
                  <div className="metric">→ +34% qualified leads</div>
                </div>
                <div className="tyear">
                  <span className="ylabel">'21</span>
                  <h4>180 sqm</h4>
                  <span className="size">First expansion</span>
                  <p>Bigger slot, new VR demo zone. We reused the meeting pods again. The dead corner from '20 was redesigned into a live-stream booth.</p>
                  <div className="metric">→ NPS 72 · repeat visits up</div>
                </div>
                <div className="tyear" data-big>
                  <span className="ylabel">'22</span>
                  <h4>180 sqm <span style={{ color: 'var(--terracotta)', fontStyle: 'italic', fontSize: '0.7em' }}>v3</span></h4>
                  <span className="size">Peak-year configuration</span>
                  <p>Our most-referenced design. Same carpenters as '19–'21, no onboarding cost. Post-show debrief handed to client 5 days after load-out.</p>
                  <div className="metric">→ +41% leads · 240 demos</div>
                </div>
                <div className="tyear">
                  <span className="ylabel">'23</span>
                  <h4>Roadshow</h4>
                  <span className="size">6 cities · modular shell</span>
                  <p>Modular stand toured 6 GCC cities in 10 weeks. No re-design per stop. Same crew flying with the hardware.</p>
                  <div className="metric">→ on plan · 3 emirates</div>
                </div>
                <div className="tyear" data-big>
                  <span className="ylabel">'24</span>
                  <h4>240 sqm</h4>
                  <span className="size">3-storey · 62% re-used</span>
                  <p>Biggest footprint yet. Because the hardware bank compounded, cost-per-sqm dropped 27% against '19.</p>
                  <div className="metric">→ +22% leads · booked '25</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PORTFOLIO STRIP */}
        <section className="strip" id="work">
          <div className="container">
            <div className="strip-head reveal">
              <div>
                <span className="eyebrow"><span className="dot"></span>Recent work</span>
                <h2 style={{ marginTop: '12px' }}>Stands we've <span className="ital">been proud of</span>.</h2>
              </div>
              <span className="body-sm">Arab Health · GITEX · Gulfood · ADIPEC</span>
            </div>
          </div>
          <div className="container">
            <div className="strip-scroll">
              <div className="strip-card">
                <div className="imgwr"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Arab-Health.jpg" alt="" /></div>
                <div className="meta"><h4>Philips · Arab Health</h4><span className="y">2024</span></div>
                <span className="tag">240 sqm</span>
              </div>
              <div className="strip-card">
                <div className="imgwr"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg" alt="" /></div>
                <div className="meta"><h4>Philips Pairs</h4><span className="y">2023</span></div>
                <span className="tag">Pair-zone concept</span>
              </div>
              <div className="strip-card">
                <div className="imgwr"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Radiology.jpg" alt="" /></div>
                <div className="meta"><h4>Philips Radiology</h4><span className="y">2023</span></div>
                <span className="tag">Live demo zone</span>
              </div>
              <div className="strip-card">
                <div className="imgwr"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Fosroc-Real-Image-3.jpeg" alt="" /></div>
                <div className="meta"><h4>Fosroc</h4><span className="y">2022</span></div>
                <span className="tag">Construction sector</span>
              </div>
              <div className="strip-card">
                <div className="imgwr"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Freshy-Exhi-Stand-2.jpg" alt="" /></div>
                <div className="meta"><h4>Freshy</h4><span className="y">2022</span></div>
                <span className="tag">Gulfood</span>
              </div>
              <div className="strip-card">
                <div className="imgwr"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Microlink-3.jpeg" alt="" /></div>
                <div className="meta"><h4>Microlink</h4><span className="y">2021</span></div>
                <span className="tag">GITEX</span>
              </div>
              <div className="strip-card">
                <div className="imgwr"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/2B-Stand-2.jpeg" alt="" /></div>
                <div className="meta"><h4>2B</h4><span className="y">2020</span></div>
                <span className="tag">Double-deck</span>
              </div>
              <div className="strip-card">
                <div className="imgwr"><img src="https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Buser.jpg" alt="" /></div>
                <div className="meta"><h4>Buser</h4><span className="y">2019</span></div>
                <span className="tag">Modular</span>
              </div>
            </div>
          </div>
        </section>

        {/* ECON */}
        <section className="econ">
          <div className="container">
            <div className="econ-head reveal">
              <span className="eyebrow"><span className="dot"></span>What a second year with us looks like</span>
              <h2 style={{ marginTop: '16px' }}>Second engagements <span className="ital">cost less, work harder</span>.</h2>
            </div>
            <div className="econ-grid reveal">
              <div className="econ-col">
                <div className="fig">−27<span className="dec">%</span></div>
                <div className="label">Cost per sqm, year 2</div>
                <p>Typical drop once we re-use the modular shell, hardware bank and carpenter familiarity. Numbers from the Philips engagement, '19 vs '24.</p>
              </div>
              <div className="econ-col">
                <div className="fig">+34<span className="dec">%</span></div>
                <div className="label">Qualified leads, year 2</div>
                <p>What a debriefed stand looks like. Traffic zones tweaked, meeting pods re-placed, demo flow redesigned around last year's actuals.</p>
              </div>
              <div className="econ-col">
                <div className="fig">7<span style={{ color: 'rgba(245,241,234,0.4)', fontStyle: 'italic', fontSize: '0.5em' }}>&nbsp;days</span></div>
                <div className="label">To post-show dossier</div>
                <p>A single-page debrief, landed in your inbox within a week of load-out. Photos, footfall notes, what we'd change next year, what you paid vs. what we budgeted.</p>
              </div>
            </div>
          </div>
        </section>

        {/* TRACKING DATASHEET */}
        <section className="tracking">
          <div className="container">
            <div className="tracking-grid">
              <div className="tracking-copy reveal">
                <span className="eyebrow"><span className="dot"></span>What we actually track</span>
                <h2 style={{ marginTop: '16px' }}>Numbers under the <span className="ital">beautiful things</span>.</h2>
                <p>A stand is a mood and a machine. We obsess over the mood, but we also count. Not a CRM — more like an atelier's sketchbook. Enough data to learn from, never so much that it gets in the way.</p>
                <p>Shown opposite: the kind of page you'd receive the week after your show.</p>
              </div>

              <div className="datasheet reveal">
                <div className="ds-hd">
                  <h3>Philips · Arab Health <span className="ital">'24</span></h3>
                  <div className="sub">Dossier page 6 / 12</div>
                </div>
                <div className="ds-row">
                  <div className="mk">Stand footprint</div>
                  <div className="mv">240 sqm</div>
                  <div className="mdelta up">+33%</div>
                </div>
                <div className="ds-row">
                  <div className="mk">Hardware re-used from '22–'23</div>
                  <div className="mv">62%</div>
                  <div className="mdelta up">best yet</div>
                </div>
                <div className="ds-row">
                  <div className="mk">Design iterations to sign-off</div>
                  <div className="mv">3</div>
                  <div className="mdelta flat">flat</div>
                </div>
                <div className="ds-row">
                  <div className="mk">Qualified leads captured</div>
                  <div className="mv">418</div>
                  <div className="mdelta up">+22%</div>
                </div>
                <div className="ds-row">
                  <div className="mk">Meeting-pod utilisation</div>
                  <div className="mv">84%</div>
                  <div className="mdelta up">+9 pts</div>
                </div>
                <div className="ds-row">
                  <div className="mk">Dead corners flagged</div>
                  <div className="mv">1 (SE)</div>
                  <div className="mdelta flat">note for '25</div>
                </div>
                <div className="ds-row">
                  <div className="mk">Crew carried from prior year</div>
                  <div className="mv">6 of 8</div>
                  <div className="mdelta up">continuity</div>
                </div>
                <div className="ds-footnote">
                  <span>Filed 4 days post-load-out</span>
                  <span className="pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="pulse-dot"></span>Live · carried into '25 brief
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* IDEAL FIT */}
        <section className="ideal">
          <div className="container">
            <span className="eyebrow"><span className="dot"></span>Who this is for</span>
            <h2 style={{ marginTop: '14px' }}>We're built for <span className="ital">repeat exhibitors</span>.</h2>
            <div className="ideal-grid">
              <div className="ideal-col">
                <span className="mark">① Heads of Marketing</span>
                <h3>Multinationals who exhibit 2–6 times a year.</h3>
                <p>You don't want a new agency conversation every January. You want a production partner who already knows the brand book, the MA team's preferences, and what your CFO cares about.</p>
              </div>
              <div className="ideal-col">
                <span className="mark">② Trade &amp; Exhibition Leads</span>
                <h3>Running Arab Health, GITEX, ADIPEC, Gulfood.</h3>
                <p>You're the one on site at 2am when the LED wall flickers. You need a foreman you can trust, a fabrication shop 20 minutes from the hall, and a stand that's been through this before.</p>
              </div>
              <div className="ideal-col">
                <span className="mark">③ Regional HQs of Global Brands</span>
                <h3>EMEA ops with UAE as the anchor.</h3>
                <p>Your HQ brand guidelines won't bend. Your regional budget can't grow. We're good at turning both of those truths into something your GM can stand in front of proudly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq">
          <div className="container">
            <div className="faq-inner">
              <div>
                <span className="eyebrow"><span className="dot"></span>Before you ask</span>
                <h2 style={{ marginTop: '14px' }}>Questions exhibition teams actually <span className="ital">ask us</span>.</h2>
              </div>
              <div className="faq-list">
                <details open>
                  <summary>How early do we need to start?</summary>
                  <p>Six weeks from brief to floor works for a mid-sized stand. Eight is comfortable. For Arab Health and GITEX we start our biggest clients' briefs in July — that's when we debrief the previous year and seed the next one.</p>
                </details>
                <details>
                  <summary>Can you work with our global agency's concept?</summary>
                  <p>Yes, often. Many of our pharma and tech clients bring a master concept from their HQ team. Our job is production engineering, local build, and on-site reliability — we fit around the creative lead, or we lead it, depending on the scope.</p>
                </details>
                <details>
                  <summary>Do you handle freight, rigging and on-site crew?</summary>
                  <p>Yes — all in-house or through long-standing partners we've co-installed with for a decade. The foreman you meet on day one is the one who'll be there at load-out.</p>
                </details>
                <details>
                  <summary>What happens to our stand after the show?</summary>
                  <p>If you're a repeat exhibitor, we archive the modular parts in our Sharjah joinery. Re-use rates land between 40–65% for second-year builds. For one-off shows, we dismantle, recycle what we can, and keep the drawings on file for three years.</p>
                </details>
                <details>
                  <summary>Can you produce renders for our internal sign-off?</summary>
                  <p>Always. 3D renders with materials, walk-through animations, and construction drawings are part of our standard scope — not a bolt-on.</p>
                </details>
                <details>
                  <summary>What shows have you delivered at?</summary>
                  <p>Arab Health (every year since 2016), GITEX, Gulfood, ADIPEC, Middle East Energy, BIG 5, The Big 5 Solar, The Hotel Show, Gulf Traffic, and several niche medical congresses.</p>
                </details>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-band" id="cta">
          <div className="container">
            <span className="chip" style={{ background: 'transparent', borderColor: 'rgba(245,241,234,0.3)', color: 'rgba(245,241,234,0.7)', marginBottom: '32px' }}>
              <span className="chip-dot"></span>Let's start your dossier
            </span>
            <h2>Tell us your show, <span className="ital">your goals, your last year</span>.</h2>
            <p>We'll come back with three render directions, a construction-phase cost breakdown, and an honest read on where your last stand under- or over-delivered. All before you commit.</p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a href="mailto:info@exhibitgraphicsign.com?subject=Stand%20Brief" className="btn btn-primary">Request a stand brief <span className="arrow">→</span></a>
              <a href="/hct-case-study" className="btn">Read a case study</a>
            </div>
          </div>
        </section>

        {/* FOOTER (shared) */}
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
              <span>File No. 002 / Exhibitions</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
