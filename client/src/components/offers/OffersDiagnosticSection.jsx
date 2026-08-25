import { useState } from 'react';
import { DIAGNOSTIC_QUESTIONS, OFFERS_DATA } from '../../data/offersData.js';
import { useInquiryModal } from '../../context/InquiryModalContext.jsx';

export default function OffersDiagnosticSection({ onSelectOffer }) {
  const { openInquiry } = useInquiryModal();
  const [selectedAnswers, setSelectedAnswers] = useState({
    stage: 'designing',
    venue: 'dwtc',
    priority: 'cost',
  });

  const handleSelect = (questionId, value) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Determine recommended offer based on selected answers
  const currentStageOpt = DIAGNOSTIC_QUESTIONS[0].options.find(
    (o) => o.value === selectedAnswers.stage
  );
  const currentPriorityOpt = DIAGNOSTIC_QUESTIONS[2].options.find(
    (o) => o.value === selectedAnswers.priority
  );

  const matchedOfferId =
    currentStageOpt?.recommendedOffer || currentPriorityOpt?.recommendedOffer || 'offer-01';
  const matchedOffer = OFFERS_DATA.find((o) => o.id === matchedOfferId) || OFFERS_DATA[0];

  return (
    <section id="diagnostic" className="offers-diagnostic-section">
      <div className="container">
        <div className="diagnostic-container-box">
          <div className="diagnostic-header">
            <div className="eyebrow">
              <span className="dot" />
              Tailored Guidance
            </div>
            <h2 className="diagnostic-title">Not Sure Which Service You Need?</h2>
            <p className="diagnostic-sub">
              Tell us what you are trying to solve. You don’t have to change your existing agency or contractor to work with us—sometimes all you need is a second opinion, a specialist service, or a reliable local team.
            </p>
          </div>

          <div className="diagnostic-interactive-grid">
            {/* Questions Column */}
            <div className="questions-column">
              {DIAGNOSTIC_QUESTIONS.map((q) => (
                <div key={q.id} className="diagnostic-q-group">
                  <h4 className="q-title">{q.title}</h4>
                  <div className="q-options-list">
                    {q.options.map((opt) => {
                      const isSelected = selectedAnswers[q.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`q-option-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelect(q.id, opt.value)}
                        >
                          <span className="radio-dot">{isSelected ? '●' : '○'}</span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendation Result Column */}
            <div className="recommendation-column">
              <div className="recommendation-card">
                <span className="rec-badge">Recommended Starting Point</span>
                <span className="rec-offer-num">Offer {matchedOffer.number}</span>
                <h3 className="rec-offer-title">{matchedOffer.title}</h3>
                <p className="rec-offer-headline">{matchedOffer.shortHeadline}</p>
                <p className="rec-offer-copy">{matchedOffer.shortSummary}</p>

                <div className="rec-meta-box">
                  <div className="rec-meta-row">
                    <span className="k">Stage:</span>
                    <span className="v">{matchedOffer.stageTag}</span>
                  </div>
                  <div className="rec-meta-row">
                    <span className="k">Investment:</span>
                    <span className="v">{matchedOffer.investment}</span>
                  </div>
                </div>

                <div className="rec-actions">
                  <button
                    type="button"
                    className="btn btn-primary rec-btn"
                    onClick={() => openInquiry('exhibitions')}
                  >
                    Tell Us About Your Exhibition
                    <span className="arrow">→</span>
                  </button>

                  <button
                    type="button"
                    className="rec-dossier-link"
                    onClick={() => onSelectOffer(matchedOffer)}
                  >
                    Open Offer {matchedOffer.number} Full Dossier & Simulator →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
