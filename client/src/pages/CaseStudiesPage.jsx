import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import pageStyles from '../styles/pages/content-first.css?raw';
import caseStudiesResponsiveStyles from '../styles/pages/case-studies-responsive.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import { images } from './siteData.js';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import healthtechStand from '../assets/Exhibition Stands/healthtech.jpg';
import kazakhstanPavilion from '../assets/Exhibition Stands/Kazakhstan_Pavillion.jpeg';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const SLUG_MAP = {
  'hct-graduation-program': 'hct-nationwide-graduation-ceremonies',
  'hct-fujairah-stage-extension': 'hct-fujairah-stage-extension',
  'sadia-carrefour-rollout': 'sadia-33-store-overnight-carrefour-rollout',
  'philips-global-health-riyadh': 'philips-global-health-riyadh-healthcare-booth',
  'kazakhstan-pavilion-gulfood': 'kazakhstan-pavilion-gulfood',
};

const cases = [
  {
    id: 'hct-graduation-program',
    tag: 'Graduations / Institutional events',
    title: 'HCT Graduation Program',
    stat: '7 ceremonies',
    image: images.hctProfile,
    imagesList: [images.hctProfile, images.graduationWide],
    captions: ['HCT 2025 Grand Ceremony Main Stage & LED Wall', 'Full Convocation Arena Staging & VIP Protocol'],
    inquiryType: 'events',
    ctaLabel: 'Tell us about your ceremony',
    serviceLink: '/events',
    serviceLinkLabel: 'Explore Ceremony Production',
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
    imagesList: [images.graduationWide],
    captions: ['Zayed Sports Complex 5-6m Stage Extension overnight'],
    inquiryType: 'events',
    ctaLabel: 'Tell us about your staging project',
    serviceLink: '/events',
    serviceLinkLabel: 'Explore Staging & AV Production',
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
    inquiryType: 'retail',
    ctaLabel: 'Tell us about your retail rollout',
    serviceLink: '/retail',
    serviceLinkLabel: 'Explore Retail Branding Services',
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
    imagesList: [healthtechStand, images.phillips2],
    captions: ['Philips Global Health Riyadh Main Hall', 'Philips Ultrasound Display Counter and Lounge Area'],
    inquiryType: 'exhibitions',
    ctaLabel: 'Tell us about your exhibition stand',
    serviceLink: '/exhibitions',
    serviceLinkLabel: 'Explore Exhibition Stand Services',
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
    imagesList: [kazakhstanPavilion],
    captions: ['Kazakhstan National Pavilion at Gulfood DWTC'],
    inquiryType: 'exhibitions',
    ctaLabel: 'Tell us about your pavilion project',
    serviceLink: '/exhibitions',
    serviceLinkLabel: 'Explore Exhibition & Pavilion Services',
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
  [
    'How does EGS keep the customer experience coordinated?',
    'Design, production, logistics, installation, on-site response, and handover stay connected through one accountable team, so the client is not left coordinating disconnected suppliers under pressure.',
  ],
];

function CaseImageGallery({ imagesList, captions = [], title }) {
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
                Scroll down <span className="arrow">&darr;</span>
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
  usePageLifecycle('Exhibition & Event Staging Case Studies | EGS UAE Production Proof', {
    revealSelector: caseStudiesRevealSelector,
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
      additionalSchemas: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'EGS Production Case Studies',
          description: 'A collection of verified case files demonstrating high-stakes physical builds executed under tight deadline pressure across the UAE.',
          url: 'https://exhibitgraphicsign.com/case-studies',
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: cases.map((c, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              item: {
                '@type': 'CreativeWork',
                name: c.title,
                headline: c.situation,
                url: `https://exhibitgraphicsign.com/case-studies#${c.id}`,
              },
            })),
          },
        },
      ],
    }),
  });

  // Handle hash scrolling on mount and hashchange
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const el = document.getElementById(hash);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
        }
      }
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  return (
    <>
      <style>{pageStyles}</style>
      <style>{caseStudiesResponsiveStyles}</style>
      <div className="content-page case-studies-page" style={{ '--accent': 'var(--terracotta)' }}>
        <Navbar active="case-studies" cta="Tell us about your project" overlay />

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
                  <p className="lede">
                    These are the moments that explain how EGS works: multi-campus ceremonies, overnight retail rollouts, urgent stand adaptations, and pavilion changes under fixed deadline pressure.
                  </p>
                </div>
                <div className="hero-actions">
                  <InquiryCtaButton inquiryType="general" className="btn btn-primary">
                    Tell us about your project &rarr;
                  </InquiryCtaButton>
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

                    <div className="case-actions" style={{ marginTop: '28px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <InquiryCtaButton inquiryType={item.inquiryType || 'general'} className="btn btn-primary">
                        {item.ctaLabel} &rarr;
                      </InquiryCtaButton>
                      <Link to={`/case-studies/${SLUG_MAP[item.id] || item.id}`} className="btn btn-ghost">
                        Full Case Study Details &rarr;
                      </Link>
                      {item.serviceLink ? (
                        <a href={item.serviceLink} className="btn btn-ghost">
                          {item.serviceLinkLabel}
                        </a>
                      ) : null}
                    </div>
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
            <FAQSection faqs={caseStudiesFaqs} accordion />
          </div>
        </section>

        <section className="section-band dark-band">
          <div className="container">
            <div className="section-head">
              <h2>Which pressure looks closest to yours?</h2>
              <p>Send the service, date, location, and what needs to happen. EGS will give you a clear read on what can be done.</p>
            </div>
            <InquiryCtaButton inquiryType="general" className="btn btn-ghost">
              Tell us about your project &rarr;
            </InquiryCtaButton>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
