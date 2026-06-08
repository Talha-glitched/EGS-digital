const failurePoints = [
  {
    title: 'Mall & Hypermarket Access Rejections',
    copy: 'Uncoordinated security permits or late gate pass submissions leave installation crews locked outside loading docks. EGS secures venue-specific clearances and passes in advance.',
  },
  {
    title: 'Outsourced Color & Finish Drifts',
    copy: 'Outsourcing print files to third parties results in mismatched colors and sizing errors on site. EGS prints and fabricates in-house, ensuring absolute color consistency and perfect fitment.',
  },
  {
    title: 'Disconnected Crews & Delivery',
    copy: 'Separate print, transport, and install crews cause components to arrive without installers. EGS integrates production, trucking, and install under a single operational chain.',
  },
  {
    title: 'Zero Live Completion Snagging',
    copy: 'Leaving campaign managers to guess if a store actually went live. EGS supervisors run strict on-site QA checklists and compile photo logs for your team before the store opens.',
  },
];

export default function RetailFailurePointsSection() {
  return (
    <section className="section-band alt retail-failures-section">
      <div className="container">
        <div className="section-head reveal">
          <h2>Where retail campaigns usually break.</h2>
          <p>
            Vague promises don't survive a multi-location campaign rollout. Here are the failure points EGS actively prevents at the last mile:
          </p>
        </div>
        <div className="retail-failures-grid reveal">
          {failurePoints.map(({ title, copy }, index) => (
            <div className="retail-failure-card" key={title}>
              <div className="retail-failure-header">
                <span className="retail-failure-icon">{index + 1}</span>
                <h3>{title}</h3>
              </div>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
