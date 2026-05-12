import { images } from '../../pages/siteData.js';

export default function ExhibitionsAdaptationSection() {
  return (
    <section className="section-band alt exhibitions-adaptation-section">
      <div className="container exhibitions-adaptation-grid">
        <div className="exhibitions-adaptation-copy">
          <span className="exhibitions-kicker">Adaptation proof</span>
          <h2>When the brief changes, the stand still has to open.</h2>
          <p>Philips needed a 200 sqm healthcare stand adapted in 10-12 hours. Kazakhstan Pavilion needed product display chillers added before opening.</p>
          <div className="exhibitions-adaptation-actions">
            <a href="/case-studies#philips-global-health-riyadh" className="btn btn-primary">Open Philips proof <span className="arrow">-&gt;</span></a>
            <a href="/case-studies#kazakhstan-pavilion-gulfood" className="btn btn-ghost">Kazakhstan proof</a>
          </div>
        </div>
        <div className="exhibitions-adaptation-image">
          <img src={images.philips} alt="Philips exhibition stand detail" />
        </div>
      </div>
    </section>
  );
}
