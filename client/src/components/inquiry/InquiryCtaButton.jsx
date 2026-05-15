import { getProjectCta } from '../../utils/contactInquiry.js';
import { useInquiryModal } from '../../context/InquiryModalContext.jsx';

export default function InquiryCtaButton({
  inquiryType = 'general',
  label,
  className = 'btn btn-primary',
  arrow = true,
  children,
  ...props
}) {
  const { openInquiry } = useInquiryModal();
  const cta = getProjectCta(inquiryType);
  const displayLabel = label ?? cta.label;

  return (
    <button
      type="button"
      className={className}
      onClick={() => openInquiry(inquiryType)}
      {...props}
    >
      {children ?? (
        <>
          {displayLabel}
          {arrow ? <span className="arrow">→</span> : null}
        </>
      )}
    </button>
  );
}
