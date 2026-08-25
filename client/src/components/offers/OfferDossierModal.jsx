import { useEffect, useMemo } from 'react';
import { useInquiryModal } from '../../context/InquiryModalContext.jsx';
import { OFFERS_DATA } from '../../data/offersData.js';
import {
  AuditRadarWidget,
  InteractiveGameSimulator,
  AnalyticsDashboardWidget,
  ValueEngineeringCalculator,
  UaePartnerBlueprintWidget,
  RescueHotlineWidget,
} from './OfferInteractiveWidgets.jsx';

const pad2 = (n) => String(n).padStart(2, '0');

export default function OfferDossierModal({ offer, isOpen, onClose, onSelectOffer }) {
  const { openInquiry } = useInquiryModal();

  const currentIndex = useMemo(() => {
    if (!offer) return 0;
    return OFFERS_DATA.findIndex((o) => o.id === offer.id);
  }, [offer]);

  const totalOffers = OFFERS_DATA.length;
  const progressRatio = (currentIndex + 1) / totalOffers;

  const goToPrevOffer = () => {
    if (!onSelectOffer) return;
    const prevIdx = (currentIndex - 1 + totalOffers) % totalOffers;
    onSelectOffer(OFFERS_DATA[prevIdx]);
  };

  const goToNextOffer = () => {
    if (!onSelectOffer) return;
    const nextIdx = (currentIndex + 1) % totalOffers;
    onSelectOffer(OFFERS_DATA[nextIdx]);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToNextOffer();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrevOffer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, currentIndex]);

  if (!isOpen || !offer) return null;

  const handleCtaClick = () => {
    if (offer.whatsappLink) {
      window.open(offer.whatsappLink, '_blank', 'noopener,noreferrer');
    } else {
      openInquiry(offer.inquiryType || 'exhibitions');
    }
  };

  const renderWidget = () => {
    switch (offer.id) {
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
    <div className="dossier-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="dossier-modal-panel scrolly-modal-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ '--offer-accent': offer.accentColor || 'var(--ochre)' }}
      >
        {/* Top Visual Progress Line */}
        <div
          className="scrolly-progress-bar"
          style={{ transform: `scaleX(${progressRatio})` }}
          aria-hidden="true"
        />

        {/* Modal Header */}
        <div className="dossier-modal-header">
          <div className="dossier-meta">
            <span className="dossier-num">Offer {offer.number}</span>
            <span className="dossier-stage-pill">{offer.stageTag} PHASE</span>
            <span className="scrolly-counter">
              {pad2(currentIndex + 1)} / {pad2(totalOffers)}
            </span>
          </div>

          <div className="dossier-header-actions">
            <button
              type="button"
              className="dossier-close-btn"
              onClick={onClose}
              aria-label="Close scrollytelling viewer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollytelling Content Stream */}
        <div className="dossier-modal-body scrolly-modal-body">
          <div className="scrolly-content-grid">
            {/* Left Column: Narrative & Business Case */}
            <div className="scrolly-narrative-col">
              <div className="dossier-title-block">
                {offer.tagline && (
                  <span className="scrolly-tagline-badge">{offer.tagline}</span>
                )}
                <h2 className="dossier-title">{offer.title}</h2>
                <p className="dossier-tagline">{offer.longHeadline || offer.shortHeadline}</p>
              </div>

              {/* The Problem Callout */}
              {offer.shortProblem && (
                <div className="scrolly-problem-box">
                  <span className="problem-label">The Challenge</span>
                  <p className="problem-text">{offer.shortProblem}</p>
                </div>
              )}

              {/* Lead-in narrative */}
              {offer.leadIn && (
                <div className="dossier-section leadin-box">
                  {offer.leadIn.map((para, idx) => (
                    <p key={idx} className="leadin-para">
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {/* Ideal If / Three Things */}
              {offer.idealIf && (
                <div className="dossier-section">
                  <h3 className="section-subtitle">Ideal For Your Stand If</h3>
                  <ul className="scrolly-bullet-list">
                    {offer.idealIf.map((item, idx) => (
                      <li key={idx}>✓ {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {offer.threeThingsRequired && (
                <div className="dossier-section">
                  <h3 className="section-subtitle">All We Need From You</h3>
                  <div className="three-things-grid">
                    {offer.threeThingsRequired.map((item, idx) => (
                      <div key={idx} className="thing-card">
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverable Summary */}
              {offer.deliverable && (
                <div className="dossier-section scrolly-deliverable-box">
                  <h3 className="section-subtitle">Core Deliverable</h3>
                  <p className="deliverable-text">{offer.deliverable}</p>
                </div>
              )}

              {/* Direct Action Card in Narrative */}
              <div className="scrolly-cta-card">
                <div className="cta-card-copy">
                  <span className="cta-k">Ready to implement this offer?</span>
                  <span className="cta-sub">Get a production-ready assessment within 24 hours.</span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCtaClick}
                >
                  {offer.primaryCtaLabel}
                  <span className="arrow">→</span>
                </button>
              </div>
            </div>

            {/* Right Column: Interactive Simulators & Execution Details */}
            <div className="scrolly-interactive-col">
              {/* Investment & Best For Snapshot */}
              <div className="dossier-footer-summary scrolly-investment-card">
                <div className="summary-col">
                  <span className="summary-k">Best For</span>
                  <p className="summary-v">{offer.bestFor}</p>
                </div>
                <div className="summary-col">
                  <span className="summary-k">Investment</span>
                  <p className="summary-v price">
                    {offer.investment}
                    {offer.investmentNote && <small>{offer.investmentNote}</small>}
                  </p>
                </div>
              </div>

              {/* Embedded Interactive Mini-App / Simulator */}
              <div className="dossier-section widget-container">
                {renderWidget()}
              </div>

              {/* Timeline Phases: Before, During, After */}
              {offer.stages && (
                <div className="dossier-section">
                  <h3 className="section-subtitle">Operational Execution Timeline</h3>
                  <div className="timeline-phases-grid">
                    {offer.stages.before && (
                      <div className="timeline-phase-card">
                        <div className="phase-header">
                          <span className="phase-dot" />
                          <h4>Before the Exhibition</h4>
                        </div>
                        <ul>
                          {offer.stages.before.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {offer.stages.during && (
                      <div className="timeline-phase-card">
                        <div className="phase-header">
                          <span className="phase-dot during" />
                          <h4>During the Exhibition</h4>
                        </div>
                        <ul>
                          {offer.stages.during.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {offer.stages.after && (
                      <div className="timeline-phase-card">
                        <div className="phase-header">
                          <span className="phase-dot after" />
                          <h4>After the Exhibition</h4>
                        </div>
                        <ul>
                          {offer.stages.after.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Scope & Checklist items */}
              {offer.auditChecklist && (
                <div className="dossier-section">
                  <h3 className="section-subtitle">What Our Production Engineers Review</h3>
                  <div className="scope-items-grid">
                    {offer.auditChecklist.map((item, idx) => (
                      <div key={idx} className="scope-item">
                        <strong>{item.category}:</strong> <span>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {offer.experienceTypes && (
                <div className="dossier-section">
                  <h3 className="section-subtitle">Available Interactive Formats</h3>
                  <div className="scope-items-grid">
                    {offer.experienceTypes.map((item, idx) => (
                      <div key={idx} className="scope-item">
                        <strong>{item.name}:</strong> <span>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {offer.dashboardMetrics && (
                <div className="dossier-section">
                  <h3 className="section-subtitle">Tracked Management Metrics</h3>
                  <div className="scope-items-grid">
                    {offer.dashboardMetrics.map((item, idx) => (
                      <div key={idx} className="scope-item">
                        <strong>{item.label}:</strong> <span>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {offer.engineeringLevers && (
                <div className="dossier-section">
                  <h3 className="section-subtitle">8 Key Value Engineering Levers</h3>
                  <div className="scope-items-grid">
                    {offer.engineeringLevers.map((item, idx) => (
                      <div key={idx} className="scope-item">
                        <strong>{item.lever}:</strong> <span>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {offer.rescueCategories && (
                <div className="dossier-section">
                  <h3 className="section-subtitle">Urgent Sourcing & Production Scope</h3>
                  <div className="scope-items-grid">
                    {offer.rescueCategories.map((item, idx) => (
                      <div key={idx} className="scope-item">
                        <strong>{item.item}:</strong> <span>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {offer.capabilities && (
                <div className="dossier-section">
                  <h3 className="section-subtitle">Full UAE On-The-Ground Scope</h3>
                  <div className="scope-items-grid">
                    {offer.capabilities.map((item, idx) => (
                      <div key={idx} className="scope-item">
                        <strong>{item.area}:</strong> <span>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollytelling Bottom Navigation Bar */}
        <div className="dossier-modal-footer scrolly-modal-footer">
          <div className="scrolly-nav-controls">
            <button
              type="button"
              className="scrolly-nav-btn prev"
              onClick={goToPrevOffer}
              aria-label="Previous offer"
            >
              ← Previous Offer
            </button>

            {/* Quick-Jump Pills (01 - 06) */}
            <div className="scrolly-pills-bar">
              {OFFERS_DATA.map((o, idx) => {
                const isActive = o.id === offer.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`scrolly-pill-btn ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectOffer && onSelectOffer(o)}
                    title={`Offer ${o.number}: ${o.title}`}
                  >
                    <span>{o.number}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="scrolly-nav-btn next"
              onClick={goToNextOffer}
              aria-label="Next offer"
            >
              Next Offer →
            </button>
          </div>

          <div className="scrolly-footer-cta-wrap">
            <button
              type="button"
              className="btn btn-primary dossier-action-btn"
              onClick={handleCtaClick}
            >
              {offer.primaryCtaLabel}
              <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

