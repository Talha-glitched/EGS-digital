import { useState } from 'react';
import pageStyles from '../styles/pages/content-first.css?raw';
import caseStudiesResponsiveStyles from '../styles/pages/case-studies-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer, ProofCard } from './SiteChrome.jsx';
import { images, proofCards } from './siteData.js';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import healthtechStand from '../assets/Exhibition Stands/healthtech.jpg';
import kazakhstanPavilion from '../assets/Exhibition Stands/Kazakhstan_Pavillion.jpeg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const caseProofCards = proofCards.filter((card) => card.href !== '/case-studies#money-kicks-activation');

const cases = [
  {
    id: 'hct-graduation-program',
    tag: 'Graduations / Institutional events',
    title: 'HCT Graduation Program',
    stat: '7 ceremonies',
    image: images.hctProfile,
    situation: 'HCT is the anchor proof for EGS graduation ceremony production. EGS has worked with HCT for almost seven years, managing full ceremony environments rather than isolated decor items.',
    pressure: 'Graduation ceremonies are public, emotional, and fixed in time. Families, graduates, leadership, and VIPs arrive expecting every stage, backdrop, print, signage, and production detail to be ready.',
    did: 'In 2025, EGS delivered seven HCT grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah, and Fujairah for 4,500 graduates and 13,500 guests. In 2024, EGS delivered eight grand ceremonies across Dubai, Abu Dhabi, Sharjah, Ras Al Khaimah, Fujairah, and Baniyas for 3,500 graduates and 10,000 guests.',
    result: 'HCT remains the flagship proof that EGS can take responsibility for multi-campus institutional ceremony seasons at UAE scale.',
    proves: ['institutional event scale', 'repeat-client trust', 'ceremony pressure handling', 'full-room production responsibility'],
    takeaway: 'If your ceremony has public stakes, multiple stakeholders, and no room for delay, EGS has handled that scale before.',
  },
  {
    id: 'hct-fujairah-stage-extension',
    tag: 'Urgent stage work / Graduations',
    title: 'HCT Fujairah Stage Extension',
    stat: '10 hours',
    image: images.graduationWide,
    situation: 'EGS designed and executed the full 2025 HCT Fujairah ceremony at Zayed Sports Complex, including the core stage and event production setup.',
    pressure: 'With only 10 hours left before showtime, the approved setup needed a further 5-6 metre stage extension for a photo display/frame area. The deadline stayed fixed and the ceremony time could not move.',
    did: 'EGS kept the wider ceremony delivery on track while sourcing materials, moving them to Fujairah, extending the wooden/carpentered stage, and finishing the added scope before the ceremony started.',
    result: 'The full ceremony setup and the additional stage extension were both delivered on time.',
    proves: ['urgent stage adaptation', 'material sourcing under pressure', 'logistics outside Dubai', 'fixed showtime recovery'],
    takeaway: 'Urgent event changes require material availability, transport, site access, carpentry, and a team that can finish before doors open.',
  },
  {
    id: 'sadia-carrefour-rollout',
    tag: 'Retail rollout',
    title: 'Sadia Carrefour Rollout',
    stat: '33 locations',
    image: images.retailSadiaChiller,
    imagesList: [images.retailSadiaChiller, images.retailSadiaBusDisplay],
    captions: ['Sadia Chiller Branding installation at Carrefour', 'Sadia Custom POSM Product Bus Display'],
    situation: 'In 2019, EGS owned the Sadia Carrefour hypermarket retail installation rollout across 33 UAE locations, not a single-store add-on.',
    pressure: 'The rollout was originally planned for Friday. On Wednesday, while the program was already in motion, the client asked EGS to move the full 33-location Carrefour UAE scope forward and complete it that same night. Mall work could only begin after closing.',
    did: 'EGS started around midnight and finished before 6am. Scope included chiller branding and installation, plus island displays. The rollout used 13 vehicles, one labourer per vehicle, and 8-10 QA/QC people moving across teams, with approximately 25-30 people involved overall.',
    result: 'The full rollout, not only a small add-on, was completed across all 33 locations before morning.',
    proves: ['multi-location rollout capacity', 'overnight retail execution', 'QA/QC coordination', 'hypermarket/mall access discipline'],
    takeaway: 'For retail teams, the reassurance is not only speed. It is vehicles, access timing, team split, and QA/QC across locations before customers arrive.',
  },
  {
    id: 'philips-global-health-riyadh',
    tag: 'Exhibition stands / Healthcare',
    title: 'Philips Global Health Riyadh',
    stat: '200 sqm',
    image: images.phillips1,
    imagesList: [images.phillips1, images.phillips2],
    captions: ['Philips Global Health Riyadh Main Hall', 'Philips Ultrasound Display Counter and Lounge Area'],
    situation: 'At Global Health Exhibition in Riyadh, Saudi Arabia, Philips operated a major 200 sqm healthcare stand with high-profile medical device demonstrations.',
    pressure: 'With only 10 to 12 hours remaining before hall opening, Philips confirmed that an ultrasound machine had arrived on site and needed a prominent display counter and power routing that had not been part of the approved fabrication drawing.',
    did: 'EGS reconfigured the joinery on site, ran concealed wiring, color-matched the laminates, and built an ultrasound display unit ready for live clinical demos before the exhibition doors opened.',
    result: 'The machine was fully integrated and functioning smoothly when VIP delegations and hospital directors arrived.',
    proves: ['late-stage exhibition adaptation', 'healthcare booth compliance', 'GCC cross-border execution', 'live equipment integration'],
    takeaway: 'Exhibition stands often change on the floor. An agile in-house builder can solve surprises without compromising aesthetics.',
  },
  {
    id: 'kazakhstan-pavilion-gulfood',
    tag: 'National Pavilions / F&B',
    title: 'Kazakhstan Pavilion Gulfood',
    stat: '168 sqm',
    image: kazakhstanPavilion,
    situation: 'Kazakhstan Pavilion at Gulfood (Dubai World Trade Centre) hosted multiple food and beverage exporters under one national identity.',
    pressure: 'Multiple participating exporters arrived with additional product lines and display requirements 14 hours prior to the show opening.',
    did: 'EGS expanded the product display shelving, fabricated additional branded pedestals overnight in our Al Qusais workshop, and transported them to DWTC before morning inspection.',
    result: 'All national exporters showcased their full product catalog with unified country branding.',
    proves: ['country pavilion expertise', 'overnight workshop fabrication', 'DWTC venue compliance', 'multi-exhibitor coordination'],
    takeaway: 'Country pavilions need contractors with sufficient workshop scale to absorb late scope additions overnight.',
  },
];

const caseStudiesFaqs = [
  [
    'Which case study should I look at first?',
    'Start with the pressure closest to your project: HCT for ceremony scale, Sadia for overnight retail rollouts, Philips for exhibition stand adaptation, and Kazakhstan Pavilion for late product-display changes.',
  ],
  [
    'Do these examples show how EGS handles fixed deadlines?',
    'Yes. Each case explains the situation, what changed, how the team responded, and what was delivered before opening, showtime, or handover.',
  ],
  [
    'Can EGS handle last-minute changes without hiding the tradeoffs?',
    'When a change is physically possible and safe, EGS focuses on the fastest workable route. If timing, budget, access, or material availability creates a tradeoff, we make that clear before moving.',
  ],
  [
    'What should I send if my project looks similar?',
    'Send the date, venue or locations, scope, drawings or photos, brand files, access window, and the issue you are trying to solve. That gives EGS enough context to respond with a practical next step.',
  ],
];

export default function CaseStudiesPage() {
  const [selectedCase, setSelectedCase] = useState(cases[0]);

  usePageLifecycle('Exhibition & Event Staging Case Studies | EGS UAE Production Proof', {
    revealSelector: '.case-studies-page .reveal',
    description: 'Verified production case studies: HCT nationwide graduation staging, Sadia 33-store overnight Carrefour rollout, Philips Riyadh healthcare booth adaptation, and Kazakhstan Pavilion at Gulfood.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'High-Stakes Production Case Studies',
        description: 'Verified case studies covering custom exhibition stand adaptations, multi-site retail branding rollouts, and institutional graduation staging across the UAE and GCC.',
        serviceType: 'Production Case Studies',
        url: '/case-studies',
      },
      faqs: caseStudiesFaqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Case Studies', url: '/case-studies' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{caseStudiesResponsiveStyles}</style>
      <div className="content-page case-studies-page" style={{ '--accent': 'var(--terracotta)' }}>
        <Navbar active="case-studies" overlay />

        <section className="section-band alt case-studies-hero">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow"><span className="dot" style={{ backgroundColor: 'var(--terracotta)' }} />Case studies</span>
              <h1>Pressure-tested deliveries across the UAE and GCC.</h1>
              <p>
                When the requirement changes late and the date cannot move, this is what happens.
              </p>
            </div>
          </div>
        </section>

        <section className="section-band case-studies-grid-section">
          <div className="container">
            <div className="case-studies-nav">
              {cases.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`case-nav-btn ${selectedCase.id === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedCase(c)}
                >
                  <span className="case-nav-stat">{c.stat}</span>
                  <span className="case-nav-title">{c.title}</span>
                </button>
              ))}
            </div>

            <article className="case-detail-card" id={selectedCase.id}>
              <div className="case-detail-media">
                <img src={selectedCase.image} alt={selectedCase.title} />
              </div>
              <div className="case-detail-content">
                <span className="proof-tag">{selectedCase.tag}</span>
                <h2>{selectedCase.title}</h2>
                <div className="case-narrative">
                  <div className="narrative-block">
                    <h4>The Situation</h4>
                    <p>{selectedCase.situation}</p>
                  </div>
                  <div className="narrative-block">
                    <h4>The Pressure</h4>
                    <p>{selectedCase.pressure}</p>
                  </div>
                  <div className="narrative-block">
                    <h4>What EGS Delivered</h4>
                    <p>{selectedCase.did}</p>
                  </div>
                  <div className="narrative-block">
                    <h4>The Outcome & Proof</h4>
                    <p>{selectedCase.result}</p>
                  </div>
                </div>
                <div className="case-actions">
                  <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary">
                    Discuss a Similar Project →
                  </InquiryCtaButton>
                  <a href="/exhibitions" className="btn btn-ghost">Explore Exhibition Services</a>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Frequently asked questions about our production proof.</h2>
            </div>
            <FAQSection faqs={caseStudiesFaqs} />
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
