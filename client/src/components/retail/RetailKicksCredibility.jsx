import { images } from '../../pages/siteData.js';

export default function RetailKicksCredibility() {
  return (
    <section className="section-band retail-kicks-section">
      <div className="container retail-proof-grid">
        <div className="retail-proof-image">
          <img src={images.activation} alt="Money Kicks mall activation by EGS" loading="lazy" />
        </div>
        <div className="retail-proof-copy">
          <span className="minimal-service-kicker">Activation Credibility</span>
          <h2>Mall activations for public-facing sneaker brands.</h2>
          <p>
            EGS has executed mall activation installations connected to Money Kicks / Money Kickz, the sneaker and lifestyle brand associated with Rashed Belhasa, the Dubai influencer and entrepreneur known online as Money Kicks.
          </p>
          <p>
            When brand visibility is highly public, influencer-focused, and under intense shopper traffic, the build quality and visual detailing have to be absolutely pristine. EGS delivers the structural joinery, print consistency, and overnight setups that make activations a premium success.
          </p>
          <div className="retail-proof-actions">
            <a href="/case-studies#money-kicks-activation" className="btn btn-primary">
              See Money Kicks proof <span className="arrow">-&gt;</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
