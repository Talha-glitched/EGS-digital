import { InfoGrid } from '../../pages/SiteChrome.jsx';

const pressureItems = [
  ['Move quickly', 'EGS moves when the requirement changes, but keeps the physical work tied to the client need.'],
  ['Protect the standard', 'Fast is only useful when the finish, handover, and public moment still hold.'],
  ['Keep control', 'Late changes should not become public chaos for the visitor, guest, customer, or sales team.'],
  ['Remember the work', 'Repeat-client memory matters because each engagement should make the next one sharper.'],
];

export default function HomeStandardsSection() {
  return (
    <section className="section-band">
      <div className="container">
        <div className="section-head">
          <h2>Fast is only useful when the standard stays intact.</h2>
          <p>The hard part is not saying yes. The hard part is sourcing material, moving crews, handling access, keeping the finish clean, and still delivering what the client asked for.</p>
        </div>
        <InfoGrid items={pressureItems} eyebrow="How EGS works" />
      </div>
    </section>
  );
}
