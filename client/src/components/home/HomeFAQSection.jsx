import { FAQSection } from '../../pages/SiteChrome.jsx';

const homeFaqs = [
  ['How does EGS keep pricing transparent?', 'We clarify scope, materials, timelines, and change requests early, so customers understand what is included, what can move the cost, and what needs approval before work continues.'],
  ['What does ethical business mean at EGS?', 'It means practical recommendations, honest feasibility checks, and commitments we can stand behind. If a deadline, budget, or late request needs a tradeoff, we say it clearly.'],
  ['Can EGS manage last-minute hiccups?', 'Yes, when the change is physically possible and safe. The team focuses on solving the issue quickly, protecting the deadline, and keeping the final work presentable.'],
  ['How adaptable is the team around fixed deadlines?', 'EGS plans backwards from the handover time, adjusts crew movement around venue realities, and keeps the work moving when requirements shift late.'],
  ['How do you coordinate before, during, and after an event?', 'Design, production, installation, on-site response, and removal stay connected through one accountable team, so the customer experience feels looked after from first brief to final handback.'],
];

export default function HomeFAQSection() {
  return (
    <section className="section-band alt minimal-faq-section">
      <div className="container">
        <div className="section-head">
          <h2>Questions clients ask first.</h2>
          <p>Short answers about how EGS works: clear pricing, ethical commitments, deadline pressure, and coordinated delivery before, during, and after the event.</p>
        </div>
        <FAQSection faqs={homeFaqs} accordion />
      </div>
    </section>
  );
}
