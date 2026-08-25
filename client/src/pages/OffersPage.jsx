import { useState, useEffect, useRef } from 'react';
import pageStyles from '../styles/pages/content-first.css?raw';
import offersStyles from '../styles/pages/offers.css?raw';
import { Navbar } from '../components/Navbar.jsx';
import { Footer, ClientMarquee } from './SiteChrome.jsx';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { OFFERS_DATA, OFFERS_FAQS } from '../data/offersData.js';
import OffersHeroSection from '../components/offers/OffersHeroSection.jsx';
import OffersDiagnosticSection from '../components/offers/OffersDiagnosticSection.jsx';
import {
  AuditRadarWidget,
  InteractiveGameSimulator,
  AnalyticsDashboardWidget,
  ValueEngineeringCalculator,
  UaePartnerBlueprintWidget,
  RescueHotlineWidget,
} from '../components/offers/OfferInteractiveWidgets.jsx';
import { useInquiryModal } from '../context/InquiryModalContext.jsx';

const offersRevealSelector = [
  '.offers-page .eyebrow',
  '.offers-page .offers-hero-title',
  '.offers-page .offers-hero-subhead',
  '.offers-page .offers-hero-lede',
  '.offers-page .hero-brief-card',
  '.offers-page .scrolly-offer-slide',
  '.offers-page .diagnostic-container-box',
  '.offers-page .faq-item-card',
  '.offers-page .offers-cta-band',
  '.offers-page .footer-grid > *',
].join(', ');

// Curated high-impact, decluttered editorial data for the 6 offers
const EDITORIAL_OFFERS = [
  {
    id: 'offer-01',
    number: '01',
    phase: 'PRE-SHOW AUDIT',
    title: 'Stand Buildability & Risk Audit',
    headline: 'Before You Build It, Make Sure It Actually Works.',
    insight: 'Catching structural, material, and venue compliance flaws on CAD costs AED 0. Finding them during a 48-hour build window at DWTC or ADNEC can cost tens of thousands.',
    points: [
      'Structural feasibility, ceiling hang-points & venue permit check',
      'Material durability & reflection testing under trade show lighting',
      'Hidden fabrication inefficiency & cost-leak identification',
    ],
    investment: 'AED 500 – 1,000',
    investmentNote: '100% credited against production if built by EGS',
    primaryCta: 'Request Stand Audit',
    inquiryType: 'exhibitions',
    accentColor: 'var(--ochre)',
  },
  {
    id: 'offer-02',
    number: '02',
    phase: 'LIVE ENGAGEMENT',
    title: 'Interactive Stand Experience',
    headline: "Don't Just Give Visitors Something to Look At. Give Them Something to Do.",
    insight: 'Most trade show visitors walk past passive stands, grab a pen, and leave. Gamified interactive touchpoints convert idle aisle traffic into engaged brand dialogues and verified leads.',
    points: [
      'Touchscreen quizzes, reaction challenges & digital spin wheels',
      'Registration-gated prize mechanics (zero wasted giveaways)',
      '60-second product discovery kiosks that pre-qualify buyer intent',
    ],
    investment: 'From AED 3,500 – 7,500',
    investmentNote: 'Includes interactive software, hardware setup & analytics',
    primaryCta: 'Make My Stand Interactive',
    inquiryType: 'exhibitions',
    accentColor: 'var(--terracotta)',
  },
  {
    id: 'offer-03',
    number: '03',
    phase: 'VISITOR INTELLIGENCE',
    title: 'Smart Visitor Capture & Analytics',
    headline: 'You Paid for the Space. What Did the Exhibition Actually Generate?',
    insight: "Don't finish the show with a loose pile of business cards and guesswork. Track real-time visitor density, product traction, and categorized sales-ready lead tiers.",
    points: [
      'Digital intake tablets with offline-sync reliability on the stand floor',
      'Hourly footfall heatmaps to optimize booth sales staffing rosters',
      'Clean, deduplicated CRM-formatted lead exports within 48 hours',
    ],
    investment: 'Tailored Package',
    investmentNote: 'Hardware tablets, scanner intake & executive post-show report',
    primaryCta: 'Setup Visitor Analytics',
    inquiryType: 'exhibitions',
    accentColor: 'var(--ink-blue)',
  },
  {
    id: 'offer-04',
    number: '04',
    phase: 'BUDGET OPTIMIZATION',
    title: 'Bring Stand Back to Budget',
    headline: 'Love the 3D Design. Not the Supplier Quotation?',
    insight: 'Approved design: AED 180,000. Budget: AED 140,000. Our production engineers eliminate hidden fabrication bloat while vigorously protecting the front-of-house features visitors notice.',
    points: [
      'Structural simplification & pre-assembled CNC joinery modules',
      'Conversion of costly millwork into backlit tension fabric graphics',
      'Venue rigging optimization to eliminate heavy overhead surcharges',
    ],
    investment: 'Value-Engineered Scope',
    investmentNote: 'No upfront redesign fee required for budget review',
    primaryCta: 'Submit Design & Budget Target',
    inquiryType: 'exhibitions',
    accentColor: 'var(--ochre)',
  },
  {
    id: 'offer-05',
    number: '05',
    phase: 'UAE EXECUTION',
    title: 'Local UAE Exhibition Partner',
    headline: 'Designed Globally. Built & Supported Flawlessly in Dubai.',
    insight: 'You manage your brand and client relationships. EGS handles in-house Dubai fabrication, venue approvals, civil defense permits, and 24/7 on-site show standby.',
    points: [
      'In-house CNC joinery, metalwork, acrylics & large-format print in Dubai',
      'Direct familiarity with DWTC, ADNEC, DEC & Expo City regulations',
      'Pre-arrival 4K video walkthrough sent before your flight lands in UAE',
    ],
    investment: 'Direct UAE In-House Rates',
    investmentNote: 'White-label partner agreements for international agencies',
    primaryCta: 'Discuss Your UAE Stand',
    inquiryType: 'exhibitions',
    accentColor: 'var(--olive)',
  },
  {
    id: 'offer-06',
    number: '06',
    phase: '24/7 RAPID RESCUE',
    title: '24/7 Exhibition Rescue Service',
    headline: 'Forgot Something? Call One Local WhatsApp Number.',
    insight: 'Brochures ran out? QR code changed? Urgent extra screens or damaged vinyl during buildup? One direct UAE dispatch line delivers emergency solutions directly to your booth floor.',
    points: [
      'Emergency same-day printing: Brochures, flyers, cards & badges',
      'Replacement vinyls, foam-board prints & last-minute graphic fixes',
      '43" to 85" 4K displays, furniture, acrylic podiums & hardware',
    ],
    investment: 'Fast-Track Dispatch',
    investmentNote: 'Immediate WhatsApp assessment & fixed upfront pricing',
    primaryCta: 'Dispatch Rescue Team via WhatsApp',
    whatsappLink: 'https://wa.me/971524587992?text=URGENT%20EXHIBITION%20RESCUE%3A%20I%20need%20urgent%20support%20at%20our%20stand',
    whatsappNumber: '+971 52 458 7992',
    accentColor: 'var(--ochre)',
  },
];

export default function OffersPage() {
  const { openInquiry } = useInquiryModal();
  const [activeOfferId, setActiveOfferId] = useState('offer-01');
  const slideRefs = useRef({});

  usePageLifecycle('6 Exhibition Support Services Dubai & UAE | Stand Audit, Budget & Engagement | EGS', {
    revealSelector: offersRevealSelector,
    description: '6 practical exhibition support services for trade shows in Dubai & Abu Dhabi. Stand buildability audits, budget value engineering, interactive touchscreen experiences, visitor analytics, white-label UAE production, and 24/7 rescue.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        'serviceType': 'Exhibition Support Services',
        'provider': {
          '@type': 'LocalBusiness',
          'name': 'Exhibit Graphic Sign (EGS)',
          'url': 'https://exhibitgraphicsign.com/',
        },
        'areaServed': ['AE', 'SA'],
        'description': '6 specialized exhibition support services for exhibitors in Dubai and Abu Dhabi: Design Audits, Interactive Experiences, Visitor Analytics, Budget Optimization, Local UAE Execution, and Exhibition Rescue.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': OFFERS_FAQS.map((faq) => ({
          '@type': 'Question',
          'name': faq.q,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.a,
          },
        })),
      },
    ],
  });

  // Track active slide on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveOfferId(entry.target.id);
          }
        });
      },
      {
        root: null,
        rootMargin: '-20% 0px -40% 0px',
        threshold: 0.2,
      }
    );

    EDITORIAL_OFFERS.forEach((offer) => {
      const el = document.getElementById(offer.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToOffer = (offerId) => {
    setActiveOfferId(offerId);
    const el = document.getElementById(offerId);
    if (el) {
      const topOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const handleCtaClick = (offer) => {
    if (offer.whatsappLink) {
      window.open(offer.whatsappLink, '_blank', 'noopener,noreferrer');
    } else {
      openInquiry(offer.inquiryType || 'exhibitions');
    }
  };

  const renderWidget = (offerId) => {
    switch (offerId) {
      case 'offer-01':
        return <AuditRadarWidget />;
      case 'offer-02':
        return <InteractiveGameSimulator />;
      case 'offer-03':
        return <AnalyticsDashboardWidget />;
      case 'offer-04':
        return <ValueEngineeringCalculator />;
      case 'offer-05':
        return <UaePartnerBlueprintWidget />;
      case 'offer-06':
        return <RescueHotlineWidget />;
      default:
        return null;
    }
  };

  return (
    <>
      <style>{pageStyles}</style>
      <style>{offersStyles}</style>
      <div className="content-page offers-page fullwidth-scrolly-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" cta="Send a brief" overlay />

        {/* Hero Section with Compact 6-Offers Grid */}
        <OffersHeroSection onScrollToOffer={scrollToOffer} />

        {/* Floating Side Progress Indicator */}
        <aside className="scrolly-floating-rail" aria-label="Offers Quick Navigation">
          <span className="floating-rail-title">6 Offers</span>
          <div className="floating-rail-dots">
            {EDITORIAL_OFFERS.map((offer) => {
              const isActive = activeOfferId === offer.id;
              return (
                <button
                  key={offer.id}
                  type="button"
                  className={`floating-dot-btn ${isActive ? 'active' : ''}`}
                  onClick={() => scrollToOffer(offer.id)}
                  title={`Offer ${offer.number}: ${offer.title}`}
                >
                  <span className="dot-num">{offer.number}</span>
                  <span className="dot-tooltip">{offer.title}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Full-Width Full-Screen Scrollytelling Stream */}
        <main className="scrolly-stream-section">
          {EDITORIAL_OFFERS.map((offer, index) => {
            const isEven = index % 2 === 1;
            return (
              <section
                key={offer.id}
                id={offer.id}
                ref={(el) => { slideRefs.current[offer.id] = el; }}
                className={`scrolly-offer-slide ${activeOfferId === offer.id ? 'is-active-slide' : ''} ${isEven ? 'slide-alt-bg' : ''}`}
                style={{ '--offer-accent': offer.accentColor || 'var(--ochre)' }}
              >
                <div className="container scrolly-slide-container">
                  {/* Clean Minimal Slide Header */}
                  <div className="scrolly-slide-header">
                    <div className="slide-meta-left">
                      <span className="slide-offer-badge">OFFER {offer.number}</span>
                      <span className="slide-phase-pill">{offer.phase}</span>
                    </div>
                    <div className="slide-meta-right">
                      <span className="slide-investment-tag">
                        {offer.investment} <span className="inv-divider">•</span> <small>{offer.investmentNote}</small>
                      </span>
                    </div>
                  </div>

                  {/* 2-Column Scrollytelling Grid */}
                  <div className="scrolly-slide-grid">
                    {/* Left Column: High-Craft Editorial Narrative */}
                    <div className="scrolly-narrative-panel">
                      <div className="slide-title-block">
                        <span className="slide-sub-title">{offer.title}</span>
                        <h2 className="slide-main-title">{offer.headline}</h2>
                      </div>

                      {/* Editorial Truth & Insight */}
                      <div className="slide-insight-box">
                        <p className="insight-text">{offer.insight}</p>
                      </div>

                      {/* 3 Core Value Deliverables */}
                      <div className="slide-points-list">
                        <span className="points-header">What You Receive:</span>
                        <ul>
                          {offer.points.map((point, pIdx) => (
                            <li key={pIdx}>
                              <span className="point-dot">✓</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Primary CTA Button */}
                      <div className="slide-cta-row">
                        <button
                          type="button"
                          className="btn btn-primary slide-cta-btn"
                          onClick={() => handleCtaClick(offer)}
                        >
                          {offer.primaryCta}
                          <span className="arrow">→</span>
                        </button>
                        {offer.whatsappNumber && (
                          <a
                            href={offer.whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost slide-ghost-btn"
                          >
                            WhatsApp Hotline ({offer.whatsappNumber})
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Live Interactive Feature Widget */}
                    <div className="scrolly-interactive-panel">
                      <div className="slide-widget-wrapper">
                        {renderWidget(offer.id)}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </main>

        {/* Diagnostic Problem Matrix */}
        <OffersDiagnosticSection onSelectOffer={(offer) => scrollToOffer(offer.id)} />

        {/* Client Logos Marquee */}
        <ClientMarquee />

        {/* FAQ Section */}
        <section className="offers-faq-section">
          <div className="container">
            <div className="eyebrow">
              <span className="dot" />
              Common Questions
            </div>
            <h2 className="display-sm" style={{ marginTop: '8px' }}>
              Working With EGS on Specialist Exhibition Requirements.
            </h2>
            <div className="faq-list">
              {OFFERS_FAQS.map((faq, idx) => (
                <div key={idx} className="faq-item-card">
                  <h3 className="faq-q">{faq.q}</h3>
                  <p className="faq-a">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA Band */}
        <section className="section-band dark-band offers-cta-band">
          <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="eyebrow" style={{ color: 'var(--paper)', opacity: 0.7 }}>
              Next Steps
            </span>
            <h2 className="display-md" style={{ color: 'var(--paper)', margin: '16px 0 20px' }}>
              Have an upcoming exhibition in Dubai or Abu Dhabi?
            </h2>
            <p
              className="body-lg"
              style={{ color: 'var(--paper)', opacity: 0.8, maxWidth: '640px', margin: '0 auto 32px' }}
            >
              Send us your stand drawing, brief, quotation, or urgent requirement. We will give you a clear, production-tested perspective within 24 hours.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--paper)', color: 'var(--ink)' }}
                onClick={() => openInquiry('exhibitions')}
              >
                Tell Us About Your Stand
                <span className="arrow">→</span>
              </button>
              <a
                href="https://wa.me/971524587992"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ borderColor: 'var(--paper)', color: 'var(--paper)' }}
              >
                Chat on WhatsApp (+971 52 458 7992)
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}



