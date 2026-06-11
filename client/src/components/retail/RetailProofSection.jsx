import { images } from '../../pages/siteData.js';

export default function RetailProofSection() {
  return (
    <section className="section-band alt retail-proof-section">
      <div className="container retail-proof-grid">
        <div className="retail-proof-copy">
          <span className="minimal-service-kicker">Campaign Proof</span>
          <h2>33 Carrefour locations. Midnight to before 6am.</h2>
          <p>
            In 2019, Sadia's Carrefour hypermarket rollout was planned for Friday. On Wednesday, the client asked EGS to move the installation forward to that same night across 33 Carrefour hypermarket locations in the UAE.
          </p>
          <p>
            Because mall work could only start after closing, EGS deployed 13 vehicles, 13 installers, and 8–10 QA/QC supervisors, starting around midnight and finishing every single store before doors opened at 6 AM. Scope included chiller branding and installation, plus island displays.
          </p>
          <div className="retail-proof-actions">
            <a href="/case-studies#sadia-carrefour-rollout" className="btn btn-primary">
              Open Sadia proof <span className="arrow">-&gt;</span>
            </a>
            <a href="/case-studies" className="btn btn-ghost">
              See all case studies
            </a>
          </div>
        </div>
        <div className="retail-proof-image">
          <img src={images.retailSadiaChiller} alt="Sadia retail branding installation at Carrefour" loading="lazy" />
        </div>
      </div>
    </section>
  );
}
