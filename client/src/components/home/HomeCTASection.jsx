import InquiryCtaButton from '../inquiry/InquiryCtaButton.jsx';

export default function HomeCTASection() {
  return (
    <section className="section-band">
      <div className="container">
        <div className="section-head">
          <h2>Send the deadline, location, and what needs to happen.</h2>
          <p>If the date is fixed or the requirement has changed, tell us what you need. EGS will look at what can be done and what needs to move first.</p>
        </div>
        <InquiryCtaButton inquiryType="general" className="btn btn-primary" />
      </div>
    </section>
  );
}
