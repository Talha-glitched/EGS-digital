import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import pageStyles from '../styles/pages/offers-v2.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { useInquiryModal } from '../context/InquiryModalContext.jsx';
import { OFFERS_DATA, OFFERS_FAQS, DIAGNOSTIC_QUESTIONS, OFFERS_STAGES } from '../data/offersData.js';

import egsLogo from '../assets/logo/New_Logo/Logo-03.png';
import lightbulbGif from '../assets/Icons/lightbulb.gif';
import audGraduation from '../assets/Graduation/Websites Gallery Graduations/2025/AUD/DSC02388.JPG';
import fuGraduationSpeaker from '../assets/Existing Website Shortlist/FU-Graduation/DSC08234.jpg.jpeg';
import cocaColaArenaGraduation from '../assets/Graduation/Websites Gallery Graduations/2024/Dubai-CocaCola Arena/IZM09305.jpg';

const pad2 = (n) => String(n).padStart(2, '0');

const SLIDES = [
  {
    id: 'hero',
    eyebrow: 'EGS EXHIBITION OFFERS V2',
    headline: '6 WAYS WE PROTECT & MAXIMIZE YOUR TRADE SHOW INVESTMENT',
    subhead: 'From independent stand buildability audits and budget recovery to gamified visitor capture, white-label local execution, and 24/7 emergency site rescue.',
    stagesPills: ['01 BEFORE SHOW', '02 DURING SHOW', '03 AFTER SHOW'],
    image: cocaColaArenaGraduation,
  },
  {
    id: 'intro',
    stageLabel: 'THE 3-STAGE FRAMEWORK',
    headline: 'THE EGS PRODUCTION EDGE',
    copy: 'Exhibition success is built long before the doors open and continues well after the show closes. We structure specialized support services around the 3 critical phases of your event.',
    images: [audGraduation],
    stages: [
      {
        num: '01',
        title: 'BEFORE SHOW',
        desc: 'Buildability audits, Line-by-line budget recovery, and structural safety checks.',
        offers: ['Offer 01: Design Audit', 'Offer 04: Budget Recovery', 'Offer 05: UAE Partner']
      },
      {
        num: '02',
        title: 'DURING SHOW',
        desc: 'Interactive touchscreen games, visitor lead capture, and 24/7 emergency site rescue.',
        offers: ['Offer 02: Interactive Experience', 'Offer 03: Visitor Analytics', 'Offer 06: Emergency Rescue']
      },
      {
        num: '03',
        title: 'AFTER SHOW',
        desc: 'CRM-ready lead exports, post-show management reporting, and orderly dismantling.',
        offers: ['Offer 03: Lead Intelligence', 'Offer 05: Dismantling & Storage']
      }
    ],
    values: [
      { title: 'In-House Production', text: 'Full CNC joinery, metalwork, and large-format printing right here in Dubai.' },
      { title: '14+ Years UAE Track Record', text: 'Battle-tested experience across DWTC, ADNEC, DEC, and Expo City Dubai.' },
      { title: 'Transparent Pricing', text: 'No hidden venue surcharges or last-minute installation surprise fees.' }
    ]
  },
  {
    id: 'offers-overview',
    eyebrow: 'CATALOGUE OF OFFERS',
    headline: 'SPECIALIZED EXHIBITION SUPPORT SERVICES',
    image: fuGraduationSpeaker
  },
  {
    id: 'diagnostic',
    eyebrow: 'EXHIBITOR DIAGNOSTIC',
    headline: 'FIND THE RIGHT SUPPORT FOR YOUR STAND',
    copy: 'Answer 3 quick questions to identify the ideal support package for your upcoming trade show in Dubai or Abu Dhabi.'
  }
];

const BOTTOM_NAV_ITEMS = [
  { label: 'EXECUTION', slideIdx: 0 },
  { label: 'THE EDGE', slideIdx: 1 },
  { label: 'THE OFFERS', slideIdx: 2 },
  { label: 'DIAGNOSTIC', slideIdx: 3 }
];

function BgImage({ src }) {
  return <img src={src} className="pf-bg-landscape" alt="" />;
}

export default function OffersV2Page() {
  const { openInquiry } = useInquiryModal();

  const [activeCat, setActiveCat] = useState('slides'); // 'slides', 'all', 'before', 'during', 'after'
  const [loaderStep, setLoaderStep] = useState('blank');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedOffer, setSelectedOffer] = useState(null); // Offer object for dossier modal viewer
  const [dossierTab, setDossierTab] = useState('overview'); // 'overview', 'checklist', 'stages', 'pricing'

  // Diagnostic Quiz State
  const [diagStep, setDiagStep] = useState(0);
  const [diagAnswers, setDiagAnswers] = useState({ stage: '', venue: '', priority: '' });

  const aboutRef = useRef(null);
  const lastWheelTime = useRef(0);
  const [islandOffset, setIslandOffset] = useState({ x: 0, y: 0 });

  usePageLifecycle('6 Exhibition Support Services V2 | Scrollytelling Experience | EGS Dubai', {
    description: 'Explore the 6 specialized EGS exhibition support services through an interactive scrollytelling experience: Stand buildability audits, budget value engineering, interactive engagement, visitor analytics, local UAE partner execution, and 24/7 rescue.',
  });

  // Entrance Loader Sequence
  useEffect(() => {
    const t0 = setTimeout(() => setLoaderStep('logo-fade-in'), 400);
    const t1 = setTimeout(() => setLoaderStep('logo-shrink'), 1300);
    const t2 = setTimeout(() => setLoaderStep('quote-fade-in'), 1600);
    const t3 = setTimeout(() => setLoaderStep('quote-move-down'), 3600);
    const t4 = setTimeout(() => setLoaderStep('overlay-fade-out'), 4600);
    const t5 = setTimeout(() => setLoaderStep('done'), 5200);

    return () => {
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2);
      clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
    };
  }, []);

  // Filtered Offers List for Carousel List View
  const filteredOffers = useMemo(() => {
    if (activeCat === 'slides' || activeCat === 'all') return OFFERS_DATA;
    return OFFERS_DATA.filter((offer) => offer.stageCategory.includes(activeCat));
  }, [activeCat]);

  const [hoverOffer, setHoverOffer] = useState(null);
  const activeBgOffer = hoverOffer || selectedOffer || OFFERS_DATA[0];

  const translateX = useMemo(() => activeSlideIdx * 100, [activeSlideIdx]);

  const scrollToSlide = (idx) => {
    setActiveSlideIdx(idx);
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      const now = performance.now();
      if (selectedOffer) {
        if (e.key === 'Escape') {
          setSelectedOffer(null);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const currIdx = OFFERS_DATA.findIndex((o) => o.id === selectedOffer.id);
          const nextIdx = (currIdx + 1) % OFFERS_DATA.length;
          setSelectedOffer(OFFERS_DATA[nextIdx]);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const currIdx = OFFERS_DATA.findIndex((o) => o.id === selectedOffer.id);
          const prevIdx = (currIdx - 1 + OFFERS_DATA.length) % OFFERS_DATA.length;
          setSelectedOffer(OFFERS_DATA[prevIdx]);
        }
        return;
      }

      if (activeCat !== 'slides') return;
      if (now - lastWheelTime.current < 400) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        lastWheelTime.current = now;
        setActiveSlideIdx((prev) => {
          if (prev < SLIDES.length - 1) return prev + 1;
          setActiveCat('all');
          return prev;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        lastWheelTime.current = now;
        setActiveSlideIdx((prev) => (prev > 0 ? prev - 1 : prev));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCat, selectedOffer]);

  // Wheel slide switching for presentation mode
  useEffect(() => {
    const el = aboutRef.current;
    if (!el || activeCat !== 'slides') return undefined;

    const handleWheel = (e) => {
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheelTime.current < 450) return;

      const dx = e.deltaX;
      const dy = e.deltaY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) < 15) return;

      const goForward = dx > 0 || (absY > absX && dy > 0);
      const goBackward = dx < 0 || (absY > absX && dy < 0);

      if (goForward) {
        lastWheelTime.current = now;
        setActiveSlideIdx((prev) => {
          if (prev < SLIDES.length - 1) return prev + 1;
          setActiveCat('all');
          return prev;
        });
      } else if (goBackward) {
        lastWheelTime.current = now;
        setActiveSlideIdx((prev) => (prev > 0 ? prev - 1 : prev));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [activeCat]);

  // Island mouse move
  const handleIslandMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setIslandOffset({ x: (x / (rect.width / 2)) * 20, y: (y / (rect.height / 2)) * 20 });
  };

  const handleIslandMouseLeave = () => {
    setIslandOffset({ x: 0, y: 0 });
  };

  // Recommended offer from diagnostic quiz
  const recommendedOfferId = useMemo(() => {
    if (diagAnswers.stage) {
      const q1 = DIAGNOSTIC_QUESTIONS[0].options.find((o) => o.value === diagAnswers.stage);
      if (q1?.recommendedOffer) return q1.recommendedOffer;
    }
    if (diagAnswers.priority) {
      const q3 = DIAGNOSTIC_QUESTIONS[2].options.find((o) => o.value === diagAnswers.priority);
      if (q3?.recommendedOffer) return q3.recommendedOffer;
    }
    return 'offer-01';
  }, [diagAnswers]);

  const recommendedOffer = useMemo(
    () => OFFERS_DATA.find((o) => o.id === recommendedOfferId) || OFFERS_DATA[0],
    [recommendedOfferId]
  );

  return (
    <>
      <style>{pageStyles}</style>

      <div className={`pf-page offers-v2-page ${loaderStep === 'done' ? 'loader-done' : ''}`}>
        {/* Persistent Header & Navigation */}
        <div className={`pf-persistent-logo-wrap ${loaderStep} ${activeCat === 'slides' ? 'is-about' : 'is-projects'} ${selectedOffer ? 'is-viewer-open' : ''}`}>
          <Link to="/" className="pf-persistent-logo-link" aria-label="EGS home">
            <img src={egsLogo} alt="EGS — Exhibit Graphic Sign" />
          </Link>
          {activeCat !== 'slides' && loaderStep === 'done' && (
            <button
              type="button"
              className="pf-go-back-btn"
              onClick={() => {
                if (selectedOffer) {
                  setSelectedOffer(null);
                } else {
                  setActiveCat('slides');
                  setActiveSlideIdx(0);
                }
              }}
            >
              <span className="pf-back-arrow">↑</span> Go back
            </button>
          )}
        </div>

        {/* Entrance Loader Overlay */}
        {loaderStep !== 'done' && (
          <div className={`pf-loader-overlay ${loaderStep === 'overlay-fade-out' || loaderStep === 'quote-move-down' ? 'fade-out' : ''}`}>
            {(loaderStep === 'quote-fade-in' || loaderStep === 'quote-move-down' || loaderStep === 'overlay-fade-out') && (
              <div className="pf-loader-quote-container">
                <img src={lightbulbGif} className="pf-loader-gif" alt="Lightbulb animation" />
                <div className="pf-loader-quote">
                  “Exhibition success is engineered before, during, and after the show.”
                </div>
              </div>
            )}
          </div>
        )}

        {/* Crossfading Backdrop */}
        <div className="pf-bg" aria-hidden="true">
          <div className="pf-bg-layer is-visible">
            <BgImage src={cocaColaArenaGraduation} />
          </div>
        </div>

        <div className={`pf-layout ${activeCat === 'slides' ? 'about-mode' : ''}`}>
          {/* Side Rail for List View */}
          <aside className={`pf-nav-col ${activeCat === 'slides' ? 'is-hidden' : ''}`}>
            <div className="pf-nav-section">
              <button
                type="button"
                className={`pf-nav-about-btn ${activeCat === 'slides' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCat('slides');
                  setActiveSlideIdx(0);
                }}
              >
                Overview Fable
              </button>
            </div>

            <nav aria-label="Offers Stages" className="pf-nav-section">
              <span className="pf-side-label">Exhibitor Stages</span>
              <div className="pf-cats">
                {OFFERS_STAGES.map((stg) => (
                  <button
                    key={stg.id}
                    type="button"
                    className={`pf-cat ${activeCat === stg.id ? 'active' : ''}`}
                    onClick={() => setActiveCat(stg.id)}
                  >
                    {stg.label}
                    <span className="pf-cat-count">({stg.count})</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="pf-side-rescue">
              <span className="pf-side-rescue-title">🚨 24/7 Rescue Hotline</span>
              <p className="pf-side-rescue-text">
                Forgot business cards, brochures, or screens? Need urgent graphic fixes?
              </p>
              <a
                href="https://wa.me/971524587992?text=URGENT%20EXHIBITION%20RESCUE%3A%20I%20need%20urgent%20support%20at%20our%20stand"
                target="_blank"
                rel="noopener noreferrer"
                className="pf-side-rescue-link"
              >
                WhatsApp Rescue Line →
              </a>
            </div>

            <div className="pf-side-contact">
              <span className="pf-side-label">Direct Contact</span>
              <a href="mailto:info@exhibitgraphicsign.com">info@exhibitgraphicsign.com</a>
              <a href="tel:+97142383278">+971 4 238 3278</a>
              <a href="tel:+971524587992">+971 52 458 7992</a>
              <span className="pf-side-copy">© 2026 Exhibit Graphic Sign</span>
            </div>
          </aside>

          {/* Presentation Mode vs List Mode */}
          {activeCat === 'slides' ? (
            <section ref={aboutRef} className="pf-about-section">
              <div className="pf-about-viewport-scroll">
                <div className="pf-horizontal-scroll-sticky">
                  <div
                    className="pf-horizontal-scroll-track"
                    style={{ transform: `translate3d(-${translateX}vw, 0px, 0px)` }}
                  >
                    {/* Slide 01: Hero */}
                    <div className={`pf-about-slide ${activeSlideIdx === 0 ? 'is-active' : ''}`}>
                      <div className="pf-slide-hero-container">
                        <div className="pf-hero-headline-wrap">
                          <span className="pf-hero-eyebrow">{SLIDES[0].eyebrow}</span>
                          <h1 className="pf-hero-title">{SLIDES[0].headline}</h1>
                          <p className="pf-hero-subhead">{SLIDES[0].subhead}</p>
                          <div className="pf-hero-stages-pills">
                            {SLIDES[0].stagesPills.map((pill) => (
                              <span key={pill} className="pf-hero-stage-pill">{pill}</span>
                            ))}
                          </div>
                        </div>
                        <div className="pf-hero-media-wrap">
                          <img src={SLIDES[0].image} alt="EGS Trade Show Stand" />
                        </div>
                      </div>
                    </div>

                    {/* Slide 02: 3-Stage Framework */}
                    <div className={`pf-about-slide ${activeSlideIdx === 1 ? 'is-active' : ''}`}>
                      <div className="pf-slide-intro-container">
                        <div className="pf-intro-top-left">
                          <span className="pf-hero-eyebrow">{SLIDES[1].stageLabel}</span>
                          <h2 className="pf-slide-headline">{SLIDES[1].headline}</h2>
                        </div>

                        <div className="pf-intro-stages-grid">
                          {SLIDES[1].stages.map((stg) => (
                            <div key={stg.num} className="pf-stage-card">
                              <span className="pf-stage-num">{stg.num}</span>
                              <h3 className="pf-stage-title">{stg.title}</h3>
                              <p className="pf-stage-desc">{stg.desc}</p>
                              <div className="pf-stage-offers-list">
                                {stg.offers.map((off) => (
                                  <span key={off} className="pf-stage-offer-item">• {off}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pf-intro-right-col">
                          <span className="pf-intro-values-title">WHY EGS OFFERS V2</span>
                          {SLIDES[1].values.map((v) => (
                            <div key={v.title} className="pf-intro-value-item">
                              <span className="pf-intro-val-name">{v.title}</span>
                              <p className="pf-intro-val-desc">{v.text}</p>
                            </div>
                          ))}
                        </div>

                        {/* Hover Contact Island */}
                        <div
                          className="pf-contact-island"
                          onMouseMove={handleIslandMouseMove}
                          onMouseLeave={handleIslandMouseLeave}
                          style={{ transform: `translate3d(${islandOffset.x}px, ${islandOffset.y}px, 0)` }}
                        >
                          <div className="pf-contact-island-collapsed">
                            <span>CONTACT</span>
                            <span className="pf-contact-arrow-circle">→</span>
                          </div>
                          <div className="pf-contact-island-expanded">
                            <div className="pf-contact-details">
                              <span className="pf-contact-label">EMAIL</span>
                              <a href="mailto:info@exhibitgraphicsign.com">info@exhibitgraphicsign.com</a>
                              <span className="pf-contact-label">PHONE</span>
                              <a href="tel:+971524587992">+971 52 458 7992</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Slide 03: 6 Offers Overview */}
                    <div className={`pf-about-slide ${activeSlideIdx === 2 ? 'is-active' : ''}`}>
                      <div className="pf-slide-offers-grid-container">
                        <div className="pf-offers-grid-header">
                          <span className="pf-offers-grid-tag">{SLIDES[2].eyebrow}</span>
                          <h2 className="pf-offers-grid-title">{SLIDES[2].headline}</h2>
                        </div>

                        <div className="pf-offers-cards-grid-6">
                          {OFFERS_DATA.map((offer) => (
                            <div
                              key={offer.id}
                              className="pf-offer-overview-card"
                              onClick={() => setSelectedOffer(offer)}
                            >
                              <div className="pf-offer-card-top">
                                <span className="pf-offer-num-badge">OFFER {offer.number}</span>
                                <span className="pf-offer-stage-badge">{offer.stageTag}</span>
                              </div>
                              <h3 className="pf-offer-card-title">{offer.title}</h3>
                              <p className="pf-offer-card-summary">{offer.shortHeadline}</p>
                              <div className="pf-offer-card-bottom">
                                <span className="pf-offer-investment">{offer.investment}</span>
                                <span className="pf-offer-action-link">View Dossier →</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Slide 04: Interactive Diagnostic & Rescue */}
                    <div className={`pf-about-slide ${activeSlideIdx === 3 ? 'is-active' : ''}`}>
                      <div className="pf-slide-diagnostic-container">
                        <div className="pf-diag-quiz-box">
                          <h2 className="pf-diag-quiz-title">Exhibitor Diagnostic Matrix</h2>
                          <div className="pf-diag-question">
                            <span className="pf-diag-q-label">1. What stage is your exhibition project in?</span>
                            <div className="pf-diag-options-grid">
                              {DIAGNOSTIC_QUESTIONS[0].options.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  className={`pf-diag-opt-btn ${diagAnswers.stage === opt.value ? 'selected' : ''}`}
                                  onClick={() => setDiagAnswers((prev) => ({ ...prev, stage: opt.value }))}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {recommendedOffer && (
                            <div className="pf-diag-result-card">
                              <div className="pf-diag-result-info">
                                <span className="pf-diag-result-tag">RECOMMENDED OFFER</span>
                                <span className="pf-diag-result-name">{recommendedOffer.title}</span>
                              </div>
                              <button
                                type="button"
                                className="pf-diag-result-btn"
                                onClick={() => setSelectedOffer(recommendedOffer)}
                              >
                                Open Offer Dossier →
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="pf-diag-hotline-card">
                          <h3 className="pf-hotline-title">🚨 Urgent Exhibition Rescue</h3>
                          <p className="pf-hotline-copy">
                            Show opens tomorrow or live right now? Sourcing missing brochures, replacement vinyls, touchscreens, or emergency joinery in under 24 hours.
                          </p>
                          <a
                            href="https://wa.me/971524587992?text=URGENT%20EXHIBITION%20RESCUE%3A%20I%20need%20urgent%20support%20at%20our%20stand"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pf-hotline-btn"
                          >
                            Dispatch Rescue Team (+971 52 458 7992)
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Navigation Progress Pill */}
                  <div className="pf-bottom-nav-bar">
                    <div className="pf-bottom-nav-container">
                      <div className="pf-bottom-nav-items">
                        {BOTTOM_NAV_ITEMS.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            className={`pf-bottom-nav-item ${activeSlideIdx === item.slideIdx ? 'is-active' : ''}`}
                            onClick={() => scrollToSlide(item.slideIdx)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div className="pf-bottom-nav-pill">
                        {SLIDES.map((_, idx) => (
                          <span
                            key={idx}
                            className={`pf-pill-num ${activeSlideIdx === idx ? 'is-active' : ''}`}
                            onClick={() => scrollToSlide(idx)}
                          >
                            {pad2(idx + 1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <main className="pf-list">
              <div className="pf-list-track">
                {filteredOffers.map((offer, i) => (
                  <button
                    key={offer.id}
                    type="button"
                    className="pf-item"
                    style={{ transform: `translateY(${100 + i * 80}px)` }}
                    onClick={() => setSelectedOffer(offer)}
                    onMouseEnter={() => setHoverOffer(offer)}
                    onMouseLeave={() => setHoverOffer(null)}
                  >
                    <div>
                      <span className="pf-item-num">{offer.number}</span>
                      <span>{offer.title}</span>
                    </div>
                    <span className="pf-item-meta">{offer.stageTag}</span>
                  </button>
                ))}
              </div>
            </main>
          )}
        </div>

        {/* Fullscreen Offer Dossier Viewer */}
        {selectedOffer && (
          <div className="pf-viewer" role="dialog" aria-modal="true">
            <div className="pf-viewer-progress" style={{ transform: 'scaleX(1)' }} />

            <div className="pf-viewer-head">
              <div className="pf-viewer-titles">
                <span className="pf-viewer-title">OFFER {selectedOffer.number}: {selectedOffer.title}</span>
                <span className="pf-viewer-sub">{selectedOffer.stageTag} PHASE</span>
                <span className="pf-viewer-counter">
                  {pad2(OFFERS_DATA.findIndex((o) => o.id === selectedOffer.id) + 1)} / {pad2(OFFERS_DATA.length)}
                </span>
              </div>
              <button
                type="button"
                className="pf-viewer-close"
                onClick={() => setSelectedOffer(null)}
                aria-label="Close dossier"
              >
                ✕
              </button>
            </div>

            <div className="pf-viewer-stage">
              <div className="pf-viewer-dossier-body">
                <div className="pf-dossier-card-left">
                  <span className="pf-dossier-tagline">{selectedOffer.tagline}</span>
                  <h2 className="pf-dossier-headline">{selectedOffer.longHeadline}</h2>
                  <p className="pf-dossier-problem"><strong>The Problem:</strong> {selectedOffer.shortProblem}</p>
                  <p className="pf-dossier-summary">{selectedOffer.shortSummary}</p>
                  <div className="pf-dossier-cta-group">
                    <button
                      type="button"
                      className="pf-dossier-btn-primary"
                      onClick={() => openInquiry('exhibitions')}
                    >
                      {selectedOffer.primaryCtaLabel} →
                    </button>
                  </div>
                </div>

                <div className="pf-dossier-card-right">
                  <span className="pf-dossier-section-title">Investment & Best For</span>
                  <div className="pf-dossier-list">
                    <div className="pf-dossier-list-item">
                      <strong>Investment:</strong> {selectedOffer.investment} ({selectedOffer.investmentNote})
                    </div>
                    <div className="pf-dossier-list-item">
                      <strong>Best For:</strong> {selectedOffer.bestFor}
                    </div>
                  </div>

                  {selectedOffer.auditChecklist && (
                    <>
                      <span className="pf-dossier-section-title">Audit Checklist Covered</span>
                      <div className="pf-dossier-list">
                        {selectedOffer.auditChecklist.slice(0, 5).map((item) => (
                          <div key={item.category} className="pf-dossier-list-item">
                            <strong>{item.category}:</strong> {item.desc}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedOffer.experienceTypes && (
                    <>
                      <span className="pf-dossier-section-title">Available Experience Modules</span>
                      <div className="pf-dossier-list">
                        {selectedOffer.experienceTypes.map((item) => (
                          <div key={item.name} className="pf-dossier-list-item">
                            <strong>{item.name}:</strong> {item.desc}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedOffer.dashboardMetrics && (
                    <>
                      <span className="pf-dossier-section-title">Live Intelligence Metrics</span>
                      <div className="pf-dossier-list">
                        {selectedOffer.dashboardMetrics.map((item) => (
                          <div key={item.label} className="pf-dossier-list-item">
                            <strong>{item.label}:</strong> {item.desc}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="pf-viewer-hint-top"
              onClick={() => {
                const currIdx = OFFERS_DATA.findIndex((o) => o.id === selectedOffer.id);
                const prevIdx = (currIdx - 1 + OFFERS_DATA.length) % OFFERS_DATA.length;
                setSelectedOffer(OFFERS_DATA[prevIdx]);
              }}
            >
              ↑ Previous Offer
            </button>

            <button
              type="button"
              className="pf-viewer-hint"
              onClick={() => {
                const currIdx = OFFERS_DATA.findIndex((o) => o.id === selectedOffer.id);
                const nextIdx = (currIdx + 1) % OFFERS_DATA.length;
                setSelectedOffer(OFFERS_DATA[nextIdx]);
              }}
            >
              ↓ Next Offer
            </button>
          </div>
        )}
      </div>
    </>
  );
}
