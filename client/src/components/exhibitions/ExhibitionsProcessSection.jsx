const processSteps = [
  ['Brief', 'Show, size, deadline.'],
  ['Check', 'Venue, access, risk.'],
  ['Design', 'Intent and production scope.'],
  ['Produce', 'Fabrication and print.'],
  ['Install', 'Build-up and finishing.'],
  ['Handover', 'Ready before opening.'],
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
