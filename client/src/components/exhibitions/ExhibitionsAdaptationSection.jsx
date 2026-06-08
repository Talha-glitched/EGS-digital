import { images } from '../../pages/siteData.js';

export default function ExhibitionsAdaptationSection() {
  return (
    <section className="section-band alt exhibitions-adaptation-section">
      <div className="container exhibitions-adaptation-grid">
        <div className="exhibitions-adaptation-copy">
          <span className="exhibitions-kicker">Adaptation proof</span>
          <h2>Last-minute stand changes, handled before opening.</h2>
          <p>EGS delivered the full Philips 200 sqm healthcare stand, then adapted it in 10-12 hours for an ultrasound display. At Gulfood, EGS produced the full Kazakhstan Pavilion and added 5-6 branded product display chillers before opening.</p>
          <div className="exhibitions-adaptation-actions">
            <a href="/case-studies#philips-global-health-riyadh" className="btn btn-primary">Open Philips proof <span className="arrow">-&gt;</span></a>
            <a href="/case-studies#kazakhstan-pavilion-gulfood" className="btn btn-ghost">Kazakhstan proof</a>
          </div>
        </div>
        <div className="exhibitions-adaptation-image">
          <img src={images.philipsMri} alt="Philips exhibition stand detail" />
        </div>
      </div>
    </section>
  );
}
