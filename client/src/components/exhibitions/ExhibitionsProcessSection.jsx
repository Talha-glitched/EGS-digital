const processSteps = [
  ['Brief', 'Show name, stand size, open sides, floorplan, products, deadlines, and organiser rules are gathered first.'],
  ['Check', 'Venue access, approvals, electrical needs, rigging limits, storage, and late-change risks are reviewed before promises are made.'],
  ['Design', 'Layouts, renders, counters, displays, lighting, and visitor flow are locked against what can actually be built.'],
  ['Produce', 'Joinery, graphics, signage, finishes, and display elements move through production with the build-up window in mind.'],
  ['Install', 'Crew sequence, electrical coordination, graphics placement, cleaning, and snagging happen on site before opening.'],
  ['Handover', 'The stand is checked with the client, ready for visitors, and supported through show needs and removal planning.'],
];

export default function ExhibitionsProcessSection() {
  return (
    <section className="section-band exhibitions-process-section">
      <div className="container">
        <div className="section-head">
          <h2>From brief to handover.</h2>
          <p>A simple path for fixed show dates.</p>
        </div>
        <div className="notebook-stepper">
          {processSteps.map(([title, copy], index) => (
            <div className="step" key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
