import { OFFERS_DATA } from '../../data/offersData.js';

export default function OffersHeroSection({ onScrollToOffer }) {
  return (
    <section className="offers-hero-section">
      <div className="container">
        <div className="offers-hero-content">
          <div className="eyebrow">
            <span className="dot" />
            Specialist Production & Operational Capabilities • UAE
          </div>

          <h1 className="offers-hero-title">
            Get More Value From <span className="ital">Every</span> Exhibition.
          </h1>

          <p className="offers-hero-subhead">
            6 Practical Services to Improve Your Stand, Control Costs, Engage Visitors, and Support Your Team Before, During, and After the Show.
          </p>

          <div className="offers-hero-lede">
            <p>
              A successful exhibition is not only about building an attractive stand. It is about making sure the stand is practical to build, stays within budget, attracts the right visitors, captures useful leads, works properly when the show opens, and has reliable support when something unexpected happens.
            </p>
          </div>

          {/* Compact 6-Offers Preview Grid filling the hero space */}
          <div className="hero-brief-offers-section">
            <div className="hero-brief-header">
              <span className="hero-brief-label">Explore The 6 Specialized Offers</span>
              <span className="hero-brief-sub">Click any offer or scroll down to explore in full-screen</span>
            </div>

            <div className="hero-brief-grid">
              {OFFERS_DATA.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  className="hero-brief-card"
                  onClick={() => onScrollToOffer && onScrollToOffer(offer.id)}
                  style={{ '--card-accent': offer.accentColor || 'var(--ochre)' }}
                >
                  <div className="brief-card-top">
                    <span className="brief-card-num">{offer.number}</span>
                    <span className="brief-card-tag">{offer.stageTag}</span>
                  </div>
                  <h3 className="brief-card-title">{offer.title}</h3>
                  <p className="brief-card-desc">{offer.shortHeadline}</p>
                  <div className="brief-card-bottom">
                    <span className="brief-card-price">{offer.investment}</span>
                    <span className="brief-card-arrow">↓</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


