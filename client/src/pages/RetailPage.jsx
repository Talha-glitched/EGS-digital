import pageStyles from '../styles/pages/content-first.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { ControlBoard, FAQSection, Footer, InfoGrid, SiteNav, Stepper } from './SiteChrome.jsx';
import { images } from './siteData.js';

const retailSteps = [
  ['List', 'Send locations, launch date, access windows, asset types, and installation scope.'],
  ['Route', 'EGS reviews timing, vehicles, team split, material readiness, and access constraints.'],
  ['Prepare', 'Chillers, displays, graphics, branding, tools, and install requirements are checked before dispatch.'],
  ['Install', 'Teams work around mall or hypermarket closing windows.'],
  ['QA/QC', 'Supervisors check consistency, finish, missing items, and completion before launch.'],
  ['Launch', 'The campaign is ready before customers arrive.'],
];

const retailAssets = [
  ['Chiller branding', 'Confirmed Sadia proof includes chiller branding and installation.'],
  ['Island displays', 'Product display setups that need to be ready before launch.'],
  ['Retail graphics', 'Campaign graphics and branding that need to stay consistent across locations.'],
  ['Mall activation assets', 'Public-facing retail activation environments and campaign builds.'],
  ['Product displays', 'Display setups for promotions, launches, and retail visibility.'],
  ['QA/QC checks', 'For Sadia, QA/QC people moved across teams to check completion and consistency.'],
];

const retailReassurance = [
  ['Trade marketing', 'Launch date and brand consistency matter across stores.'],
  ['FMCG teams', 'Product display has to be ready when the promotion starts.'],
  ['Retail operations', 'Install teams must work around access rules and store timing.'],
  ['Procurement', 'Location count, assets, vehicles, and QA/QC need clear handling.'],
];

const retailAudience = [
  ['FMCG teams', 'Need product displays and campaign assets ready when the promotion starts.'],
  ['Trade marketing', 'Need brand consistency across stores, access windows, and launch timing.'],
  ['Mall activation teams', 'Need public-facing environments installed around venue rules and customer traffic.'],
  ['Procurement teams', 'Need location counts, assets, vehicles, and QA/QC handled clearly.'],
];

const retailFaqs = [
  ['What should we send for a retail rollout brief?', 'Send the location list, access windows, launch date, asset types, installation scope, store contacts if available, and any photos or drawings of the display areas.'],
  ['Can EGS install retail branding across 33 Carrefour hypermarket locations in one night?', 'Yes. The Sadia proof story is exactly that: 33 Carrefour hypermarket locations across the UAE, started around midnight after mall closing and finished before 6am.'],
  ['What retail assets can EGS install?', 'Confirmed proof includes chiller branding and installation, island displays, retail graphics, product display setups, and mall activation work.'],
  ['Does EGS provide QA/QC during rollouts?', 'For Sadia, EGS used installation teams plus 8-10 QA/QC people moving across teams. Use that proof when discussing rollout quality.'],
  ['Can EGS handle mall activation work?', 'Yes. Money Kicks / Money Kickz is a recognizable public-facing mall activation credibility example, but not a detailed case study yet.'],
];

export default function RetailPage() {
  usePageLifecycle('Retail Branding Installation UAE | Mall And Hypermarket Rollouts | EGS');

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page" style={{ '--accent': 'var(--claret)' }}>
        <SiteNav active="retail" cta="Start a rollout brief" />

        <section className="content-hero">
          <div className="container">
            <div className="hero-board">
              <div className="hero-copy">
                <div>
                  <div className="chip-row">
                    <span className="chip"><span className="chip-dot" />Retail branding installation UAE</span>
                    <span className="chip"><span className="chip-dot" />Mall access / hypermarket timing</span>
                  </div>
                  <h1>Retail rollouts are won after closing time.</h1>
                  <p className="lede">
                    EGS installs retail branding for campaigns that have to open on a fixed date. Mall access, delivery windows, installers, and QA/QC all have to line up before customers arrive.
                  </p>
                </div>
                <div>
                  <div className="hero-actions">
                    <a href="/contact" className="btn btn-primary">Start a retail rollout brief <span className="arrow">→</span></a>
                    <a href="/case-studies#sadia-carrefour-rollout" className="btn btn-ghost">See Sadia proof</a>
                  </div>
                  <div className="proof-chip-strip">
                    <div className="proof-chip"><strong>33</strong><span>Carrefour locations</span></div>
                    <div className="proof-chip"><strong>13</strong><span>Vehicles deployed</span></div>
                    <div className="proof-chip"><strong>6am</strong><span>Finished before morning</span></div>
                  </div>
                </div>
              </div>
              <ControlBoard
                rows={[
                  ['Locations', '33', 'Carrefour UAE'],
                  ['Dispatch', '13', 'vehicles'],
                  ['Install window', '12-6', 'after closing'],
                  ['QA/QC', '8-10', 'supervisors'],
                  ['Assets', 'chillers', 'island displays'],
                ]}
              />
            </div>
          </div>
        </section>

        <section className="section-band dark-band">
          <div className="container">
            <div className="section-head">
              <h2>33 Carrefour locations. Midnight to before 6am.</h2>
              <p>In 2019, Sadia's Carrefour hypermarket rollout was planned for Friday. On Wednesday, the client asked EGS to move the installation forward to that same night across 33 Carrefour hypermarket locations in the UAE.</p>
            </div>
            <div className="stat-poem">
              <div className="proof-chip"><strong>33</strong><span>Locations</span></div>
              <div className="proof-chip"><strong>13</strong><span>Vehicles</span></div>
              <div className="proof-chip"><strong>25-30</strong><span>Approx. total people</span></div>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Multi-location work needs a control system.</h2>
              <p>Scope included chiller branding and installation, plus island displays. Work began around midnight after mall closing and finished before 6am.</p>
            </div>
            <div className="image-mosaic retail-mosaic">
              <div className="image-cell">
                <img src={images.retail} alt="Retail branding installation work" />
                <span className="label">Retail branding and display work</span>
              </div>
              <div className="stack">
                <div className="project-file">
                  <span>Access</span>
                  <h3>Start after closing.</h3>
                  <p>The physical work begins when the customer traffic stops, so routing and readiness matter before teams arrive.</p>
                </div>
                <div className="image-cell">
                  <img src={images.activation} alt="Mall activation work" />
                  <span className="label">Mall activation environments</span>
                </div>
              </div>
            </div>
            <Stepper steps={retailSteps} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>What EGS installs.</h2>
              <p>Retail work has to hold together across assets, store access, launch timing, and QA/QC. The confirmed proof includes chillers, island displays, graphics, and activation environments.</p>
            </div>
            <InfoGrid items={retailAssets} eyebrow="Retail asset" />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>The campaign has to look consistent in every location.</h2>
              <p>Retail buyers need launch timing, store access, brand consistency, and proof of completion handled as one job.</p>
            </div>
            <InfoGrid items={retailReassurance} eyebrow="Buyer reassurance" />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>One missed location can weaken the whole campaign.</h2>
              <p>Retail rollouts fail through small operational misses: access, delivery, store coordination, inconsistent finish, or poor proof of completion.</p>
            </div>
            <ul className="bullet-list">
              <li>Access starts after closing.</li>
              <li>Store teams need coordination.</li>
              <li>Delivery and installation must match.</li>
              <li>Branding has to be consistent.</li>
              <li>Proof of completion matters.</li>
              <li>Launch dates often move earlier, not later.</li>
            </ul>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Mall activation work for a public-facing sneaker brand.</h2>
              <p>EGS has also done mall activation work connected to Money Kicks / Money Kickz, the sneaker/lifestyle brand associated with Rashed Belhasa, the Dubai influencer and entrepreneur known online as Money Kicks.</p>
            </div>
            <a href="/case-studies#money-kicks-activation" className="btn btn-ghost">Open Money Kicks note <span className="arrow">→</span></a>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Send the location list and launch date.</h2>
              <p>If your campaign has multiple stores, tight access windows, or a launch date that moved, send the location list and what needs to be installed.</p>
            </div>
            <a href="/contact" className="btn btn-primary">Start a retail rollout brief <span className="arrow">→</span></a>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Questions retail teams ask first.</h2>
              <p>Direct answers for FMCG, trade marketing, retail operations, mall activation, campaign, and procurement teams.</p>
            </div>
            <FAQSection faqs={retailFaqs} />
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Who this is for.</h2>
              <p>This page is for teams who need launch timing, access coordination, and consistent retail branding across one or many locations.</p>
            </div>
            <InfoGrid items={retailAudience} eyebrow="Audience" />
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
