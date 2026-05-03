import pageStyles from '../styles/pages/content-first.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { AnnotatedImage, FAQSection, Footer, InfoGrid, SiteNav, Stepper } from './SiteChrome.jsx';
import { images } from './siteData.js';

const standSteps = [
  ['Details', 'Send show name, hall, stand size, open sides, deadline, floorplan, products, and brand files.'],
  ['Feasibility', 'EGS reviews timing, venue access, materials, displays, and late risks.'],
  ['Direction', 'Agree design intent, production scope, graphics, counters, demo areas, and install plan.'],
  ['Produce', 'Fabrication, printing, sourcing, and crew planning move before build-up.'],
  ['Install', 'The stand is built and adapted around venue realities.'],
  ['Finish', 'The stand is checked and handed over before opening.'],
];

const buildItems = [
  ['Custom stands', 'Designed and built around brand finish, product display, visitor movement, and opening-day readiness.'],
  ['Pavilions', 'Larger exhibition environments where exhibitor needs, product displays, and stand flexibility matter.'],
  ['Display zones', 'Healthcare, product, demo, and counter areas that help the sales team show the right thing.'],
  ['Graphics and signage', 'Brand walls, printed graphics, labels, wayfinding, and last-mile visual finishing.'],
  ['Stand adaptations', 'Physical changes when products, exhibitors, displays, or layouts change close to opening.'],
  ['Installation', 'Venue access, on-site finishing, checks, and handover before the hall opens.'],
];

const reassuranceItems = [
  ['Marketing', 'The stand should match the brand, photograph well, and look right under show-floor pressure.'],
  ['Sales teams', 'Demos, counters, displays, storage, and movement need to make sense on the floor.'],
  ['Procurement', 'Scope, deadline, and changes need clear handling, not vague promises.'],
  ['Regional teams', 'Brand standards have to survive local production, venue rules, and build-up pressure.'],
];

const exhibitionAudience = [
  ['Marketing teams', 'Need brand finish, strong photos, and a stand that carries the product story clearly.'],
  ['Exhibition leads', 'Need opening-day readiness, build-up clarity, and fewer surprises on site.'],
  ['Procurement teams', 'Need a contractor that can defend the deadline and communicate scope clearly.'],
  ['Regional teams', 'Need brand standards protected through local production and venue pressure.'],
];

const exhibitionFaqs = [
  ['How early should we brief EGS for an exhibition stand in Dubai?', 'Earlier is better, especially for larger stands. EGS is also useful when product or layout requirements change close to opening and the stand still has to work.'],
  ['What should we send for an exhibition stand quote?', 'Send the show name, stand size, hall or location, open sides, deadline, floorplan, product display needs, brand files, and any render or reference direction you already have.'],
  ['Can EGS handle last-minute exhibition stand changes?', 'If the change is physically possible and the schedule allows safe work, yes. Philips and Kazakhstan Pavilion are the proof examples for this page.'],
  ['Does EGS build healthcare exhibition stands?', 'Yes. Philips at Global Health Exhibition 2024 in Riyadh is the primary healthcare proof story.'],
  ['Can EGS work on pavilion stands?', 'Yes. Kazakhstan Pavilion at Gulfood 2026 is the key proof example.'],
];

export default function ExhibitionsPage() {
  usePageLifecycle('Exhibition Stand Contractor Dubai | Custom Exhibition Stands UAE | EGS');

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page" style={{ '--accent': 'var(--ochre)' }}>
        <SiteNav active="exhibitions" cta="Brief us on your stand" />

        <section className="content-hero">
          <div className="container">
            <div className="hero-board">
              <div className="hero-copy">
                <div>
                  <div className="chip-row">
                    <span className="chip"><span className="chip-dot" />Exhibition stand contractor Dubai</span>
                    <span className="chip"><span className="chip-dot" />Opening-day readiness</span>
                  </div>
                  <h1>Stands built for opening day, not just the render.</h1>
                  <p className="lede">EGS builds custom exhibition stands in Dubai, the UAE, and the region for brands that need the booth to look right, open on time, and support the sales team on the floor.</p>
                </div>
                <div>
                  <div className="hero-actions">
                    <a href="/contact" className="btn btn-primary">Brief us on your stand <span className="arrow">→</span></a>
                    <a href="/case-studies#philips-global-health-riyadh" className="btn btn-ghost">See exhibition proof</a>
                  </div>
                  <div className="proof-chip-strip">
                    <div className="proof-chip"><strong>200 sqm</strong><span>Philips Riyadh stand</span></div>
                    <div className="proof-chip"><strong>10-12h</strong><span>Ultrasound display change</span></div>
                    <div className="proof-chip"><strong>168 sqm</strong><span>Kazakhstan Pavilion</span></div>
                  </div>
                </div>
              </div>
              <AnnotatedImage
                src={images.philips}
                alt="Philips exhibition stand"
                labels={['product display', 'demo counter', 'brand wall', 'handover check']}
              />
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>The stand is approved in a render. It is tested on site.</h2>
              <p>Build-up is where weak contractors get exposed: venue rules, access windows, product changes, missing display needs, and HQ feedback that arrives late.</p>
            </div>
            <div className="project-file-grid">
              <article className="project-file wide">
                <span>Stand file</span>
                <h3>What has to work before opening?</h3>
                <p>Visitors need to understand the brand quickly. Sales teams need counters, demos, storage, and product displays in the right place. Procurement needs scope and changes to stay visible.</p>
              </article>
              <article className="project-file">
                <span>On-site pressure</span>
                <h3>Venue access</h3>
                <p>Build-up timing, hall rules, material movement, and finishing checks shape the real job.</p>
              </article>
            </div>
            <InfoGrid items={reassuranceItems} eyebrow="Buyer need" />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>What EGS builds.</h2>
              <p>Custom exhibition stands, pavilion builds, product display zones, counters, demo areas, graphics, signage, last-mile adaptations, installation, and on-site finishing.</p>
            </div>
            <InfoGrid items={buildItems} eyebrow="Exhibition scope" />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>What happens after you brief EGS.</h2>
              <p>EGS checks the stand details against the venue, deadline, product needs, materials, and build-up realities before production moves.</p>
            </div>
            <Stepper steps={standSteps} />
          </div>
        </section>

        <section className="section-band dark-band">
          <div className="container">
            <div className="section-head">
              <h2>When the product display changes, the stand still has to work.</h2>
              <p>At Global Health Exhibition 2024 in Riyadh, Philips needed its 200 sqm stand adapted within 10-12 hours to support an ultrasound display.</p>
            </div>
            <div className="stat-poem">
              <div className="proof-chip"><strong>200 sqm</strong><span>20m x 10m stand</span></div>
              <div className="proof-chip"><strong>10-12h</strong><span>Adaptation window</span></div>
              <div className="proof-chip"><strong>Ultrasound</strong><span>Display counter setup</span></div>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>A pavilion also has to flex.</h2>
              <p>At Gulfood 2026 in Expo City, EGS adapted the 168 sqm Kazakhstan Pavilion and added 5-6 branded product display chillers for meat and dairy products before opening.</p>
            </div>
            <a href="/case-studies#kazakhstan-pavilion-gulfood" className="btn btn-ghost">Open Kazakhstan proof <span className="arrow">→</span></a>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>When the stand still has to work after the brief changes.</h2>
              <p>These are the moments where EGS is most useful: the product story changes, the layout stops serving the team, or the stand has to open cleanly tomorrow.</p>
            </div>
            <ul className="bullet-list">
              <li>A product needs a proper display area.</li>
              <li>An additional exhibitor joins late.</li>
              <li>Graphics or branding need to move.</li>
              <li>The layout no longer supports the sales team.</li>
              <li>The stand has to open cleanly tomorrow.</li>
            </ul>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Questions exhibition teams ask first.</h2>
              <p>Direct answers for marketing, sales, procurement, and regional teams planning a stand in Dubai, the UAE, or the region.</p>
            </div>
            <FAQSection faqs={exhibitionFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Who this is for.</h2>
              <p>EGS is useful when the stand has to satisfy more than one stakeholder before the hall opens.</p>
            </div>
            <InfoGrid items={exhibitionAudience} eyebrow="Audience" />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Send the show, stand size, and what needs to happen.</h2>
              <p>If the stand is planned or already changing, send the layout, deadline, and product/display requirements. EGS will give you a clear feasibility read.</p>
            </div>
            <a href="/contact" className="btn btn-primary">Brief us on your stand <span className="arrow">→</span></a>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
