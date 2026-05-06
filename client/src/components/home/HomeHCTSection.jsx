export default function HomeHCTSection({ image }) {
  return (
    <section className="section-band dark-band">
      <div className="container">
        <div className="section-head">
          <h2>Seven ceremonies. 4,500 graduates. One public moment.</h2>
          <p>In 2025, EGS delivered seven HCT grand ceremonies across the UAE for 4,500 graduates and 13,500 guests.</p>
        </div>
        <div className="image-cell" style={{ aspectRatio: '21 / 9', marginBottom: '34px' }}>
          <img src={image} alt="HCT graduation ceremony production" />
          <span className="label">Higher Colleges of Technology · 2025 graduation season</span>
        </div>
        <div className="stat-poem">
          <div className="proof-chip"><strong>7</strong><span>Grand ceremonies</span></div>
          <div className="proof-chip"><strong>4,500</strong><span>Graduates</span></div>
          <div className="proof-chip"><strong>13,500</strong><span>Guests</span></div>
        </div>
        <a href="/case-studies#hct-graduation-program" className="btn btn-ghost" style={{ marginTop: '28px' }}>Read the HCT case study <span className="arrow">→</span></a>
      </div>
    </section>
  );
}
