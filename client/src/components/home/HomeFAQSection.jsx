import { FAQSection } from '../../pages/SiteChrome.jsx';

const homeFaqs = [
  ['What does EGS do?', 'EGS builds exhibition stands, graduation ceremonies, event environments, retail branding, signage, and branded interiors across Dubai and the UAE.'],
  ['Can EGS handle urgent changes?', 'Yes, when the change is physically possible and the team can keep the standard intact. The proof includes Sadia, HCT Fujairah, Philips, and Kazakhstan Pavilion.'],
  ['Who should contact EGS?', 'Marketing, events, procurement, retail, and institutional teams who need physical brand work delivered properly under real deadline pressure.'],
  ['What should I send first?', 'Send the service type, deadline, venue or location, and any drawings, photos, location lists, or brand guidelines you already have.'],
];

export default function HomeFAQSection() {
  return (
    <section className="section-band alt">
      <div className="container">
        <div className="section-head">
          <h2>Questions buyers ask first.</h2>
          <p>Direct answers before a marketing manager, event lead, retail team, or procurement contact sends the first brief.</p>
        </div>
        <FAQSection faqs={homeFaqs} />
      </div>
    </section>
  );
}
