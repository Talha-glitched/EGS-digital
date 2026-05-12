const scopeItems = [
  ['Custom stands', 'Built around brand finish and visitor flow.'],
  ['Pavilions', 'Larger environments with multiple product needs.'],
  ['Product displays', 'Demo counters, showcases, and sales-floor support.'],
  ['Graphics / signage', 'Brand walls, print, labels, and final visual finish.'],
];

export default function ExhibitionsScopeSection() {
  return (
    <section className="section-band alt exhibitions-scope-section">
      <div className="container">
        <div className="section-head">
          <h2>What EGS builds.</h2>
          <p>The essentials for a stand that works when the hall opens.</p>
        </div>
        <div className="capability-grid">
          {scopeItems.map(([title, copy]) => (
            <article className="cap-card" key={title}>
              <small>Scope</small>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
