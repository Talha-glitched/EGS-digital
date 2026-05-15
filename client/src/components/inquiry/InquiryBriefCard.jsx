import { useInquiryModal } from '../../context/InquiryModalContext.jsx';

export default function InquiryBriefCard({ inquiryType, title, copy }) {
  const { openInquiry } = useInquiryModal();

  return (
    <button type="button" className="brief-card" onClick={() => openInquiry(inquiryType)}>
      <small>Start enquiry</small>
      <h3>{title}</h3>
      <p>{copy}</p>
    </button>
  );
}
