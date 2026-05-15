const scopeItems = [
  [
    'Stand design',
    'Layouts, elevations, renders, visitor flow, storage, counters, meeting areas, product positions, lighting intent, and organiser rules aligned before production starts.',
  ],
  [
    'Production',
    'Joinery, structure, finishes, paint, graphics, signage, counters, display units, and branded details produced with the opening date and venue access window in mind.',
  ],
  [
    'Installation',
    'On-site build sequencing, electrical coordination, graphics placement, product display setup, cleaning, snagging, and final checks completed before the hall opens.',
  ],
  [
    'Pavilions and product displays',
    'Multi-brand pavilions, showcases, demo counters, chillers, display shelves, and launch-ready product zones built so visitors understand the offer quickly.',
  ],
  [
    'Stand management',
    'Approvals, crew coordination, last-minute fixes, client handover, show-day support, removal, and asset recovery handled by one accountable team.',
  ],
];

export default function ExhibitionsScopeSection() {
  return (
    <section className="section-band alt exhibitions-scope-section">
      <div className="container">
        <div className="section-head">
          <h2>What EGS builds.</h2>
          <p>The exhibition stand chain under one roof: design, production, installation, product display, on-site support, and handover when the hall opens.</p>
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
