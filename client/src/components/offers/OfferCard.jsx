import { useInquiryModal } from '../../context/InquiryModalContext.jsx';

export default function OfferCard({ offer, onOpenDossier, isActive }) {
  const { openInquiry } = useInquiryModal();

  const handleCtaClick = (e) => {
    e.stopPropagation();
    if (offer.whatsappLink) {
      window.open(offer.whatsappLink, '_blank', 'noopener,noreferrer');
    } else {
      openInquiry(offer.inquiryType || 'exhibitions');
    }
  };

  return (
    <article
      id={offer.slug}
      className={`offer-card ${isActive ? 'is-active-offer' : ''}`}
      style={{ '--card-accent': offer.accentColor }}
      onClick={() => onOpenDossier(offer)}
    >
      <div className="offer-card-top">
        <div className="offer-card-badges">
          <span className="offer-badge-num">{offer.number}</span>
          <span className="offer-badge-stage">{offer.stageTag}</span>
        </div>
        <span className="offer-badge-price">{offer.investment}</span>
      </div>

      <div className="offer-card-body">
        <h3 className="offer-card-title">{offer.title}</h3>
        <p className="offer-card-headline">{offer.shortHeadline}</p>
        <p className="offer-card-summary">{offer.shortSummary}</p>

        <div className="offer-card-meta">
          <div className="meta-line">
            <span className="meta-k">Best for:</span>
            <span className="meta-v">{offer.bestFor}</span>
          </div>
        </div>
      </div>

      <div className="offer-card-actions">
        <button
          type="button"
          className="btn btn-primary offer-primary-btn"
          onClick={handleCtaClick}
        >
          {offer.primaryCtaLabel}
          <span className="arrow">→</span>
        </button>

        <button
          type="button"
          className="offer-dossier-trigger"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDossier(offer);
          }}
        >
          <span>Open Full Dossier & Simulator</span>
          <span className="dossier-arrow">↗</span>
        </button>
      </div>
    </article>
  );
}
