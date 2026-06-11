const scopeItems = [
  {
    title: 'Supermarket and hypermarket rollouts',
    copy: 'Chiller wraps, gondola ends, island displays, and campaign graphics installed around store hours so each branch opens with the same standard.',
  },
  {
    title: 'Product display stands',
    copy: 'FSDUs, counter displays, and POSM fabricated for the right weight, finish, dimensions, and retail guideline fit before anything reaches site.',
  },
  {
    title: 'Mall activations',
    copy: 'Temporary brand activations, atrium builds, and promotional pop-ups planned around mall access, approvals, safety paperwork, and load-in rules.',
  },
  {
    title: 'In-house production and QA',
    copy: 'Large-format printing, joinery, metalwork, supervisor checks, and completion photos stay in one chain so color, sizing, placement, and finish remain consistent.',
  },
  {
    title: 'Route and crew coordination',
    copy: 'Vehicles, installers, supervisors, and store contacts are mapped before dispatch, reducing late arrivals, missed branches, and handover confusion.',
  },
  {
    title: 'Launch-day consistency',
    copy: 'For trade marketing and FMCG teams, the goal is simple: every location should look like the campaign was built once, then repeated correctly.',
  },
];

export default function RetailScopeSection() {
  return (
    <section className="section-band alt retail-scope-section">
      <div className="container">
        <div className="section-head">
          <h2>What EGS builds.</h2>
          <p>
            The retail execution chain under one roof: campaign assets, production, routing, installation, and QA/QC managed by one accountable team.
          </p>
        </div>
        <div className="capability-grid">
          {scopeItems.map(({ title, copy }) => (
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
