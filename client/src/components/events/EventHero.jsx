import { Link } from 'react-router-dom';
import InquiryCtaButton from '../inquiry/InquiryCtaButton.jsx';
import '../../styles/components/event-hero.css';

export default function EventHero({
  kicker = 'Dubai World Trade Centre (DWTC) • Official Exhibition Contractor',
  title,
  subline,
  bgImage,
  bgAlt = 'Custom exhibition stand by EGS',
  primaryCtaText = 'Request Exhibition Proposal →',
  inquiryType = 'exhibitions',
  secondaryCtaLink,
  secondaryCtaText,
  trustItems = [
    '15 Min from DWTC Halls',
    'Civil Defence & Venue Approvals',
    'In-House Joinery & Engineering',
  ],
  showcase = {
    badge: 'Featured Build',
    image: null,
    imageAlt: 'Exhibition stand showcase by EGS',
    title: 'Custom Exhibition Booth',
    description: 'Precision carpentry, integrated LED walls, and turnkey handover before show opening.',
    specs: [
      { value: 'Turnkey', label: 'Build Scope' },
      { value: 'DWTC', label: 'Venue Permits' },
      { value: '24h', label: 'Proposal Turnaround' },
    ],
  },
}) {
  return (
    <section className="egs-event-hero" aria-label={title}>
      {/* Background Media & Cinematic Scrim */}
      {bgImage ? (
        <img
          className="egs-event-hero-bg"
          src={bgImage}
          alt={bgAlt}
          loading="eager"
          fetchpriority="high"
        />
      ) : null}
      <div className="egs-event-hero-overlay" aria-hidden="true" />

      <div className="egs-event-hero-container">
        {/* Left Column: Heading & Value Proposition */}
        <div className="egs-event-hero-content">
          <div className="egs-event-hero-kicker">
            <span className="kicker-dot" aria-hidden="true" />
            <span>{kicker}</span>
          </div>

          <h1 className="egs-event-hero-title">{title}</h1>

          {subline ? (
            <p className="egs-event-hero-subline">{subline}</p>
          ) : null}

          <div className="egs-event-hero-actions">
            <InquiryCtaButton inquiryType={inquiryType} className="btn btn-primary">
              {primaryCtaText}
            </InquiryCtaButton>
            {secondaryCtaLink && secondaryCtaText ? (
              secondaryCtaLink.startsWith('http') || secondaryCtaLink.startsWith('https') ? (
                <a
                  href={secondaryCtaLink}
                  className="btn btn-ghost"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {secondaryCtaText}
                </a>
              ) : (
                <Link to={secondaryCtaLink} className="btn btn-ghost">
                  {secondaryCtaText}
                </Link>
              )
            ) : null}
          </div>

          {/* Trust Credentials */}
          {trustItems && trustItems.length > 0 ? (
            <div className="egs-event-hero-trust-bar">
              {trustItems.map((item, idx) => (
                <div className="egs-event-hero-trust-item" key={idx}>
                  <span className="check-icon" aria-hidden="true">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Right Column: Floating Glassmorphic Proof Showcase */}
        {showcase ? (
          <aside className="egs-event-hero-showcase" aria-label="Featured Project Showcase">
            {showcase.image ? (
              <div className="egs-event-hero-showcase-media">
                <img src={showcase.image} alt={showcase.imageAlt || showcase.title} />
                {showcase.badge ? (
                  <span className="egs-event-hero-showcase-badge">{showcase.badge}</span>
                ) : null}
              </div>
            ) : null}

            <div className="egs-event-hero-showcase-body">
              {showcase.title ? <h3>{showcase.title}</h3> : null}
              {showcase.description ? <p>{showcase.description}</p> : null}
            </div>

            {showcase.specs && showcase.specs.length > 0 ? (
              <div className="egs-event-hero-specs">
                {showcase.specs.map((s, idx) => (
                  <div className="egs-event-hero-spec-item" key={idx}>
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
