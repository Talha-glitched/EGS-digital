import { images } from '../../pages/siteData.js';

export default function ExhibitionsHeroSection() {
  return (
    <section className="exhibitions-hero" aria-label="Exhibitions hero">
      <img
        className="exhibitions-hero-media"
        src={images.philipsArab}
        alt="Philips exhibition stand"
      />
      <div className="exhibitions-hero-shade" aria-hidden="true" />
      <div className="exhibitions-hero-copy">
        <span className="exhibitions-kicker">Dubai / UAE exhibition stand contractor</span>
        <h1>Exhibition stands built for opening day.</h1>
        <p>Custom stands. Pavilion builds. Product display changes.</p>
        <div className="exhibitions-hero-actions">
          <a href="/contact" className="btn btn-primary">Brief us on your stand <span className="arrow">-&gt;</span></a>
          <a href="/case-studies#philips-global-health-riyadh" className="btn btn-ghost">See proof</a>
        </div>
      </div>
    </section>
  );
}
