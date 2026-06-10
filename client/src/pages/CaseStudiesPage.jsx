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
    image: healthtechStand,
    situation: 'At Global Health Exhibition 2024 in Riyadh, EGS delivered the full Philips 20m x 10m / 200 sqm healthcare exhibition stand.',
    pressure: 'After the main stand scope was underway, Philips needed to add an ultrasound machine display, and EGS had 10-12 hours to adapt the stand without compromising the original delivery.',
    did: 'EGS protected the full stand program while adding a display counter setup with computers and a TV screen so the product could be shown properly.',
    result: 'The completed stand carried the original healthcare exhibition brief and the late ultrasound display requirement.',
    proves: ['healthcare exhibition adaptation', 'product display problem solving', '200 sqm stand experience', 'multinational client pressure handling'],
    takeaway: 'Exhibition stands have to serve the actual product story on the floor, even when the display requirement changes late.',
  },
  {
    id: 'kazakhstan-pavilion-gulfood',
    tag: 'Exhibition stands / Pavilion adaptation',
    title: 'Kazakhstan Pavilion Gulfood',
    stat: '168 sqm',
    image: kazakhstanPavilion,
    situation: 'At Gulfood 2026 in Expo City, EGS produced the full Kazakhstan Pavilion stand: 28m x 6m / 168 sqm.',
    pressure: 'After the pavilion production was already committed, a last-minute additional exhibitor needed meat and dairy product display accommodation before opening.',
    did: 'EGS kept the full pavilion build moving while adapting the stand plan and adding 5-6 branded product display chillers before opening.',
    result: 'The finished pavilion delivered the original Kazakhstan Pavilion scope and absorbed the additional exhibitor requirement.',
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

function CaseImageGallery({ imagesList, captions, title }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!imagesList || imagesList.length === 0) return null;

  if (imagesList.length === 1) {
    return (
      <div className="case-image animate-on-hover">
        <img src={imagesList[0]} alt={`${title} visual proof`} loading="lazy" />
      </div>
    );
  }

  const handleNext = () => {
    setActiveIdx((prev) => (prev + 1) % imagesList.length);
  };

  const handlePrev = () => {
    setActiveIdx((prev) => (prev - 1 + imagesList.length) % imagesList.length);
  };

  return (
    <div className="case-image-gallery">
      <div className="case-image multiple">
        {imagesList.map((imgUrl, idx) => (
          <img
            key={imgUrl}
            src={imgUrl}
            alt={`${title} visual proof ${idx + 1}`}
            className={`gallery-img ${idx === activeIdx ? 'active' : ''}`}
            loading="lazy"
          />
        ))}
        <div className="gallery-caption">
          <span>{captions[activeIdx] || `${title} proof ${activeIdx + 1}`}</span>
        </div>
        <div className="gallery-nav">
          <button type="button" onClick={handlePrev} aria-label="Previous image" className="gallery-btn">
            &larr;
          </button>
          <span className="gallery-indicator">{activeIdx + 1} / {imagesList.length}</span>
          <button type="button" onClick={handleNext} aria-label="Next image" className="gallery-btn">
            &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

function CaseDirectory({ casesList }) {
  return (
    <div className="case-directory">
      <div className="case-directory-body">
        {casesList.map((item, idx) => {
          let accentColor = 'var(--terracotta)';
          if (item.tag.toLowerCase().includes('retail')) {
            accentColor = 'var(--claret)';
          } else if (item.tag.toLowerCase().includes('exhibition') || item.tag.toLowerCase().includes('pavilion')) {
            accentColor = 'var(--purple)';
          }

          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="case-directory-row reveal"
              style={{ '--accent-row': accentColor }}
            >
              <span className="col-num">{String(idx + 1).padStart(2, '0')}</span>
              <span className="col-tag">
                <span className="tag-dot" />
                {item.tag.split(' / ')[0]}
              </span>
              <span className="col-title">{item.title}</span>
              <span className="col-action">
                Scroll down <span className="arrow">↓</span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

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
  '.case-studies-page .archive-board',
  '.case-studies-page .case-directory-row',
  '.case-studies-page .case-meta',
  '.case-studies-page .case-body',
  '.case-studies-page .case-note',
].join(', ');

export default function CaseStudiesPage() {
  usePageLifecycle('EGS Case Studies | Exhibition, Graduation, Retail And Event Proof UAE', {
    revealSelector: caseStudiesRevealSelector,
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{caseStudiesResponsiveStyles}</style>
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
              <div className="archive-board reveal">
                <CaseDirectory casesList={cases} />
              </div>
            </div>
          </div>
        </section>

        {cases.map((item) => {
          let caseAccent = 'var(--terracotta)';
          if (item.tag.toLowerCase().includes('retail')) {
            caseAccent = 'var(--claret)';
          } else if (item.tag.toLowerCase().includes('exhibition') || item.tag.toLowerCase().includes('pavilion')) {
            caseAccent = 'var(--purple)';
          }

          return (
            <section className="case-section" id={item.id} key={item.id} style={{ '--accent': caseAccent }}>
              <div className="container">
                <div className="case-layout">
                  <aside className="case-meta reveal">
                    <span className="chip"><span className="chip-dot" />{item.tag}</span>
                    <h2>{item.title}</h2>
                    <strong>{item.stat}</strong>
                    <CaseImageGallery
                      imagesList={item.imagesList || [item.image]}
                      captions={item.captions || [`${item.title} visual proof`]}
                      title={item.title}
                    />
                  </aside>
                  <div className="case-body reveal">
                    {[
                      ['Situation', item.situation],
                      ['Pressure', item.pressure],
                      ['What EGS Did', item.did],
                      ['Result', item.result],
                    ].map(([title, copy]) => (
                      <article className="case-note reveal" key={title}>
                        <h3>{title}</h3>
                        <p>{copy}</p>
                      </article>
                    ))}
                    <article className="case-note reveal">
                      <h3>What It Proves</h3>
                      <ul>
                        {item.proves.map((proof) => <li key={proof}>{proof}</li>)}
                      </ul>
                    </article>
                    <article className="case-note reveal">
                      <h3>Buyer Takeaway</h3>
                      <p>{item.takeaway}</p>
                    </article>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

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
