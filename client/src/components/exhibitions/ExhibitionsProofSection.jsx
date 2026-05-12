import { images } from '../../pages/siteData.js';

const proofItems = [
  {
    metric: '200 sqm',
    label: 'Philips Riyadh stand',
    image: images.philipsArab,
    href: '/case-studies#philips-global-health-riyadh',
  },
  {
    metric: '10-12h',
    label: 'Ultrasound display adaptation',
    image: images.philips,
    href: '/case-studies#philips-global-health-riyadh',
  },
  {
    metric: '168 sqm',
    label: 'Kazakhstan Pavilion',
    image: images.philipsArab,
    href: '/case-studies#kazakhstan-pavilion-gulfood',
  },
];

export default function ExhibitionsProofSection() {
  return (
    <section className="section-band exhibitions-proof-section">
      <div className="container">
        <div className="section-head">
          <h2>Proof under show pressure.</h2>
          <p>Large stands, late changes, fixed openings.</p>
        </div>
        <div className="exhibitions-proof-grid" aria-label="Exhibition proof highlights">
          {proofItems.map((item) => (
            <a className="exhibitions-metric-card" href={item.href} key={item.metric}>
              <img src={item.image} alt="" loading="lazy" decoding="async" />
              <span className="exhibitions-proof-label">{item.label}</span>
              <strong>{item.metric}</strong>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
