import InquiryCtaButton from '../inquiry/InquiryCtaButton.jsx';

export default function ExhibitionsCTASection() {
  return (
    <section className="section-band alt exhibitions-cta-section">
      <div className="container">
        <div className="section-head">
          <h2>Send the show, size, and deadline.</h2>
          <p>EGS will read the scope and tell you what needs to move first.</p>
        </div>
        <InquiryCtaButton inquiryType="exhibitions" className="btn btn-primary" arrow={false}>
          Tell us about your stand <span className="arrow">-&gt;</span>
        </InquiryCtaButton>
      </div>
    </section>
  );
}
