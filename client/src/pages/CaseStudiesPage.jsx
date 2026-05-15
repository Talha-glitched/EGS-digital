import pageStyles from '../styles/pages/content-first.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer, ProofCard } from './SiteChrome.jsx';
import { images, proofCards } from './siteData.js';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import healthtechStand from '../assets/Exhibition Stands/healthtech.jpg';
import kazakhstanPavilion from '../assets/Exhibition Stands/Kazakhstan_Pavillion.jpeg';

const caseProofCards = proofCards.filter((card) => card.href !== '/case-studies#money-kicks-activation');

const cases = [
  {
    id: 'hct-graduation-program',
    tag: 'Graduations / Institutional events',
    title: 'HCT Graduation Program',
    stat: '7 ceremonies',
    image: images.hctProfile,
    situation: 'HCT is the anchor proof for EGS graduation ceremony production. EGS has worked with HCT for almost seven years.',
    pressure: 'Graduation ceremonies are public, emotional, and fixed in time. Families, graduates, leadership, and VIPs arrive expecting the room to be ready.',
    did: 'In 2025, EGS delivered seven HCT grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah, and Fujairah for 4,500 graduates and 13,500 guests. In 2024, EGS delivered eight grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah, Fujairah, and Baniyas for 3,500 graduates and 10,000 guests.',
    result: 'HCT remains the flagship proof that EGS can support multi-campus institutional ceremony seasons at UAE scale.',
    proves: ['institutional event scale', 'repeat-client trust', 'ceremony pressure handling', 'full-room production responsibility'],
    takeaway: 'If your ceremony has public stakes, multiple stakeholders, and no room for delay, EGS has handled that scale before.',
  },
  {
    id: 'hct-fujairah-stage-extension',
    tag: 'Urgent stage work / Graduations',
    title: 'HCT Fujairah Stage Extension',
    stat: '10 hours',
    image: images.graduationWide,
    situation: 'The 2025 HCT Fujairah ceremony took place at Zayed Sports Complex.',
    pressure: 'Ten hours before the ceremony, the stage needed a 5-6 metre extension for a photo display/frame area. The ceremony time could not move.',
    did: 'EGS sourced material, moved it to Fujairah, extended the wooden/carpentered stage, and finished before the ceremony started.',
    result: 'The ceremony was delivered on time.',
    proves: ['urgent stage adaptation', 'material sourcing under pressure', 'logistics outside Dubai', 'fixed showtime recovery'],
    takeaway: 'Urgent event changes require material availability, transport, site access, carpentry, and a team that can finish before doors open.',
  },
  {
    id: 'sadia-carrefour-rollout',
    tag: 'Retail rollout',
    title: 'Sadia Carrefour Rollout',
    stat: '33 locations',
    image: images.retail,
    situation: 'In 2019, Sadia had planned its Carrefour hypermarket retail installations for Friday.',
    pressure: 'On Wednesday, the client asked EGS to move the rollout forward and complete all 33 Carrefour hypermarket locations across the UAE that same night. Mall work could only begin after closing.',
    did: 'EGS started around midnight and finished before 6am. Scope included chiller branding and installation, plus island displays. The rollout used 13 vehicles, one labourer per vehicle, and 8-10 QA/QC people moving across teams, with approximately 25-30 people involved overall.',
    result: 'All 33 locations were completed before morning.',
    proves: ['multi-location rollout capacity', 'overnight retail execution', 'QA/QC coordination', 'hypermarket/mall access discipline'],
    takeaway: 'For retail teams, the reassurance is not only speed. It is vehicles, access timing, team split, and QA/QC across locations before customers arrive.',
  },
  {
    id: 'philips-global-health-riyadh',
    tag: 'Exhibition stands / Healthcare',
    title: 'Philips Global Health Riyadh',
    stat: '200 sqm',
    image: healthtechStand,
    situation: 'At Global Health Exhibition 2024 in Riyadh, Philips had a 20m x 10m / 200 sqm stand.',
    pressure: 'Philips needed to display an ultrasound machine, and EGS had 10-12 hours to adapt the stand.',
    did: 'EGS added a display counter setup with computers and a TV screen so the product could be shown properly.',
    result: 'The stand supported the added ultrasound display requirement.',
    proves: ['healthcare exhibition adaptation', 'product display problem solving', '200 sqm stand experience', 'multinational client pressure handling'],
    takeaway: 'Exhibition stands have to serve the actual product story on the floor, even when the display requirement changes late.',
  },
  {
    id: 'kazakhstan-pavilion-gulfood',
    tag: 'Exhibition stands / Pavilion adaptation',
    title: 'Kazakhstan Pavilion Gulfood',
    stat: '168 sqm',
    image: kazakhstanPavilion,
    situation: 'At Gulfood 2026 in Expo City, the Kazakhstan Pavilion stand was 28m x 6m / 168 sqm.',
    pressure: 'A last-minute additional exhibitor needed product display accommodation for meat and dairy products before opening.',
    did: 'EGS adapted the stand and added 5-6 branded product display chillers before opening.',
    result: 'The pavilion could accommodate the additional exhibitor and product display requirement.',
    proves: ['large pavilion adaptation', 'product display chiller integration', 'late exhibitor change handling', 'Gulfood/Expo City pressure'],
    takeaway: 'Pavilions need flexibility because exhibitor requirements can change close to opening.',
  },
];

const caseFaqs = [
  ['Which case study should I look at first?', 'Start with the pressure closest to your project: HCT for ceremony scale, Sadia for overnight retail rollouts, Philips for exhibition stand adaptation, and Kazakhstan Pavilion for late product-display changes.'],
  ['Do these examples show how EGS handles fixed deadlines?', 'Yes. Each case explains the situation, what changed, how the team responded, and what was delivered before opening, showtime, or handover.'],
  ['Can EGS handle last-minute changes without hiding the tradeoffs?', 'When a change is physically possible and safe, EGS focuses on the fastest workable route. If timing, budget, access, or material availability creates a tradeoff, we make that clear before moving.'],
  ['What should I send if my project looks similar?', 'Send the date, venue or locations, scope, drawings or photos, brand files, access window, and the issue you are trying to solve. That gives EGS enough context to respond with a practical next step.'],
  ['How does EGS keep the customer experience coordinated?', 'Design, production, logistics, installation, on-site response, and handover stay connected through one accountable team, so the client is not left coordinating disconnected suppliers under pressure.'],
];

const caseStudiesRevealSelector = [
  '.content-page .chip',
  '.content-page .hero-copy h1',
  '.content-page .hero-copy .lede',
  '.content-page .hero-actions .btn',
  '.content-page .section-head h2',
  '.content-page .section-head p',
  '.content-page .faq-item',
  '.content-page .section-band > .container > .btn',
  '.content-page .footer-grid > *',
  '.content-page .footer-big',
  '.content-page .footer-bottom',
].join(', ');

export default function CaseStudiesPage() {
  usePageLifecycle('EGS Case Studies | Exhibition, Graduation, Retail And Event Proof UAE', {
    revealSelector: caseStudiesRevealSelector,
  });

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page case-studies-page" style={{ '--accent': 'var(--terracotta)' }}>
        <Navbar active="case-studies" cta="Send us your brief" overlay />

        <section className="content-hero">
          <div className="container">
            <div className="hero-board">
              <div className="hero-copy">
                <div>
                  <div className="chip-row">
                    <span className="chip"><span className="chip-dot" />Proof archive</span>
                    <span className="chip"><span className="chip-dot" />Case files</span>
                  </div>
                  <h1>Proof before promises.</h1>
                  <p className="lede">These are the moments that explain how EGS works: multi-campus ceremonies, overnight retail rollouts, urgent stand adaptations, and pavilion changes under fixed deadline pressure.</p>
                </div>
                <div className="hero-actions">
                  <InquiryCtaButton inquiryType="general" className="btn btn-primary" />
                  <a href="#hct-graduation-program" className="btn btn-ghost">Start with HCT</a>
                </div>
              </div>
              <div className="archive-board">
                {caseProofCards.slice(0, 4).map((card) => <ProofCard card={card} key={card.title} />)}
              </div>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Jump to a case file.</h2>
              <p>Each case is kept short: situation, pressure, what EGS did, result, and what it proves.</p>
            </div>
          </div>
          <div className="proof-scroll">
            <div className="proof-track">
              {caseProofCards.map((card) => <ProofCard card={card} key={card.title} />)}
            </div>
          </div>
        </section>

        {cases.map((item) => (
          <section className="case-section" id={item.id} key={item.id}>
            <div className="container">
              <div className="case-layout">
                <aside className="case-meta">
                  <span className="chip"><span className="chip-dot" />{item.tag}</span>
                  <h2>{item.title}</h2>
                  <strong>{item.stat}</strong>
                  <div className="case-image">
                    <img src={item.image} alt={`${item.title} visual proof`} />
                  </div>
                </aside>
                <div className="case-body">
                  {[
                    ['Situation', item.situation],
                    ['Pressure', item.pressure],
                    ['What EGS Did', item.did],
                    ['Result', item.result],
                  ].map(([title, copy]) => (
                    <article className="case-note" key={title}>
                      <h3>{title}</h3>
                      <p>{copy}</p>
                    </article>
                  ))}
                  <article className="case-note">
                    <h3>What It Proves</h3>
                    <ul>
                      {item.proves.map((proof) => <li key={proof}>{proof}</li>)}
                    </ul>
                  </article>
                  <article className="case-note">
                    <h3>Buyer Takeaway</h3>
                    <p>{item.takeaway}</p>
                  </article>
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Questions buyers ask before they trust the proof.</h2>
              <p>Practical answers for exhibition, event, retail, and institutional teams comparing pressure, deadline fit, and delivery responsibility.</p>
            </div>
            <FAQSection faqs={caseFaqs} accordion />
          </div>
        </section>

        <section className="section-band dark-band">
          <div className="container">
            <div className="section-head">
              <h2>Which pressure looks closest to yours?</h2>
              <p>Send the service, date, location, and what needs to happen. EGS will give you a clear read on what can be done.</p>
            </div>
            <InquiryCtaButton inquiryType="general" className="btn btn-ghost" />
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
