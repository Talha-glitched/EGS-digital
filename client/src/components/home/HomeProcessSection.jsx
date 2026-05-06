import { ProductionHub, Stepper } from '../../pages/SiteChrome.jsx';

export default function HomeProcessSection({ processSteps }) {
  return (
    <section className="section-band alt">
      <div className="container">
        <div className="section-head">
          <h2>From brief to handover, the work stays physical.</h2>
          <p>EGS works backwards from the opening date, showtime, launch window, or handover. The first job is to understand the hard constraint.</p>
        </div>
        <div className="process-with-hub">
          <Stepper steps={processSteps} />
          <ProductionHub items={['client', 'venue', 'materials', 'crew', 'fabrication', 'graphics', 'installation', 'handover']} />
        </div>
      </div>
    </section>
  );
}
