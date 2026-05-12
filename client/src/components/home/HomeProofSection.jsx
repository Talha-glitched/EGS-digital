import { ProofCard } from '../../pages/SiteChrome.jsx';

export default function HomeProofSection({ proofScrollRef, proofCards, onScrollProofCards }) {
  return (
    <section className="section-band">
      <div className="container">
        <div className="section-head">
          <h2>What pressure-tested looks like.</h2>
          <p>Proof should be quick to understand: client, deadline pressure, physical work, and result. Open any file to see the full story.</p>
        </div>
      </div>
      <div className="proof-scroll" ref={proofScrollRef}>
        <div className="proof-track">
          {proofCards.map((card) => <ProofCard card={card} key={card.title} />)}
        </div>
      </div>
      <div className="container">
        <div className="proof-carousel-controls" aria-label="Proof card carousel controls">
          <span className="proof-carousel-kicker">Proof files</span>
          <span className="proof-carousel-rule" aria-hidden="true" />
          <div className="proof-carousel-buttons">
            <button type="button" onClick={() => onScrollProofCards(-1)} aria-label="Scroll proof cards left">&larr;</button>
            <button type="button" onClick={() => onScrollProofCards(1)} aria-label="Scroll proof cards right">&rarr;</button>
          </div>
        </div>
      </div>
    </section>
  );
}
