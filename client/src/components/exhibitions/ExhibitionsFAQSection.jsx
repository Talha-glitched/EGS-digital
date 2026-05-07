import { FAQSection } from '../../pages/SiteChrome.jsx';

const exhibitionFaqs = [
  ['How early should we brief EGS?', 'Earlier is better for larger stands. Late changes can be reviewed when the timing is physically possible.'],
  ['What should we send for a quote?', 'Show name, stand size, hall, open sides, deadline, floorplan, products, and brand files.'],
  ['Can EGS handle last-minute changes?', 'Yes, when the change is safe and workable within the schedule. Philips and Kazakhstan are the proof.'],
  ['Does EGS build healthcare stands?', 'Yes. Philips at Global Health Exhibition 2024 is the primary healthcare proof story.'],
];

export default function ExhibitionsFAQSection() {
  return (
    <section className="section-band exhibitions-faq-section">
      <div className="container">
        <div className="section-head">
          <h2>Questions teams ask first.</h2>
          <p>Short answers before the brief moves.</p>
        </div>
        <FAQSection faqs={exhibitionFaqs} />
      </div>
    </section>
  );
}
