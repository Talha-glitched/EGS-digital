import { FAQSection } from '../../pages/SiteChrome.jsx';

const exhibitionFaqs = [
  ['What should an exhibition manager send first?', 'Send the show name, stand size, hall, open sides, floorplan, deadline, product list, storage needs, brand files, and any organiser rules. EGS can then price the real scope instead of guessing.'],
  ['How does EGS keep exhibition stand pricing transparent?', 'We separate the stand scope, materials, production requirements, installation windows, and change requests clearly, so marketing and procurement teams know what is included and what may affect cost.'],
  ['Can EGS advise us if the design or budget is unrealistic?', 'Yes. Ethical delivery means saying what will work, what needs adjustment, and what could create risk on site before the team commits to production.'],
  ['Can EGS handle last-minute changes before opening day?', 'Yes, when the change is physically possible, safe, and allowed by the venue schedule. Philips Global Health Riyadh and Kazakhstan Pavilion are examples of late adaptation under pressure.'],
  ['How does EGS coordinate the stand before and during the exhibition?', 'Design, approvals, fabrication, transport, installation, on-site fixes, and handover stay connected through one team, so the stand is ready for visitors and the client is not chasing disconnected suppliers.'],
];

export default function ExhibitionsFAQSection() {
  return (
    <section className="section-band exhibitions-faq-section">
      <div className="container">
        <div className="section-head">
          <h2>Questions exhibition teams ask first.</h2>
          <p>For marketing, procurement, and event teams planning a stand that has to open correctly, on time, and with clear scope.</p>
        </div>
        <FAQSection faqs={exhibitionFaqs} />
      </div>
    </section>
  );
}
