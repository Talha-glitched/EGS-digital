const reassuranceCards = [
  {
    role: 'Trade Marketing Teams',
    title: 'Brand consistency across networks',
    copy: 'A campaign is only as strong as its weakest store. We enforce identical build quality and graphic placement across Dubai, Abu Dhabi, and the Northern Emirates so brand principals are wowed.',
  },
  {
    role: 'FMCG Brand Managers',
    title: 'Guaranteed on-time campaign launches',
    copy: 'No delayed starts. If your hypermarket promotion begins Friday morning, our midnight-to-6 AM deployment crews ensure your graphics and displays are fully operational before the first shopper walks in.',
  },
  {
    role: 'Retail Operations',
    title: 'Zero-friction store coordination',
    copy: 'No complaints from store managers. Our supervisors are fully trained on strict mall load-in procedures, safety paperwork, gate passes, and thorough post-install sweep-ups.',
  },
  {
    role: 'Procurement Leads',
    title: 'Transparent tracking and live logs',
    copy: 'Complete accountability. We compile live route sheets, location lists, vehicle deployments, and real-time photo-logs of every finished store to prove the work is completed correctly.',
  },
];

export default function RetailReassuranceSection() {
  return (
    <section className="section-band retail-reassurance-section">
      <div className="container">
        <div className="section-head reveal">
          <h2>The campaign has to look consistent in every location.</h2>
          <p>
            We eliminate the standard BTL implementation bottlenecks that make trade marketing and FMCG managers lose sleep.
          </p>
        </div>
        <div className="capability-grid reveal">
          {reassuranceCards.map(({ role, title, copy }) => (
            <article className="cap-card" key={role}>
              <small>{role}</small>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
