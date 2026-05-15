import { useCallback, useState } from 'react';
import InquiryCtaButton from '../inquiry/InquiryCtaButton.jsx';
import { FAQSection } from '../../pages/SiteChrome.jsx';

export function MinimalServiceHero({
  image,
  imageAlt,
  kicker,
  title,
  subline,
  primaryCta,
  secondaryCta,
  backgroundVideo,
}) {
  const [videoReady, setVideoReady] = useState(false);
  const onVideoCanPlay = useCallback(() => {
    setVideoReady(true);
  }, []);

  return (
    <section className="minimal-service-hero" aria-label={title}>
      {backgroundVideo ? (
        <div
          className={`minimal-service-hero-media-stack${videoReady ? ' is-video-ready' : ''}`}
        >
          <img className="minimal-service-hero-media" src={image} alt={imageAlt} />
          <video
            className="minimal-service-hero-video"
            src={backgroundVideo}
            muted
            playsInline
            loop
            autoPlay
            preload="auto"
            aria-hidden="true"
            onCanPlay={onVideoCanPlay}
          />
        </div>
      ) : (
        <img className="minimal-service-hero-media" src={image} alt={imageAlt} />
      )}
      <div className="minimal-service-hero-shade" aria-hidden="true" />
      <div className="minimal-service-hero-copy">
        <span className="minimal-service-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{subline}</p>
        <div className="minimal-service-actions">
          <InquiryCtaButton
            inquiryType={primaryCta.inquiryType}
            label={primaryCta.label}
            className="btn btn-primary"
            arrow={false}
          >
            {primaryCta.label} <span className="arrow">-&gt;</span>
          </InquiryCtaButton>
          {secondaryCta ? (
            <a href={secondaryCta.href} className="btn btn-ghost">{secondaryCta.label}</a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function MinimalPhotoProofSection({ title, copy, items }) {
  return (
    <section className="section-band minimal-proof-section">
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <div className="minimal-proof-grid">
          {items.map((item) => (
            <a className="minimal-proof-card" href={item.href} key={`${item.metric}-${item.label}`}>
              <img src={item.image} alt="" loading="lazy" decoding="async" />
              <span>{item.label}</span>
              <strong>{item.metric}</strong>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MinimalScopeSection({ title, copy, eyebrow, items }) {
  return (
    <section className="section-band alt minimal-scope-section">
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <div className="capability-grid">
          {items.map((entry) => {
            const [itemTitle, itemCopy] = entry;
            const itemEyebrow = entry.length > 2 ? entry[2] : eyebrow;
            return (
              <article className="cap-card" key={itemTitle}>
                {itemEyebrow ? <small>{itemEyebrow}</small> : null}
                <h3>{itemTitle}</h3>
                <p>{itemCopy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function MinimalProcessSection({ title, copy, steps }) {
  return (
    <section className="section-band minimal-process-section">
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <div className="notebook-stepper">
          {steps.map(([stepTitle, stepCopy], index) => (
            <div className="step" key={stepTitle}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{stepTitle}</h3>
              <p>{stepCopy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MinimalFAQSection({ title, copy, faqs, accordion = false }) {
  return (
    <section className="section-band minimal-faq-section">
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <FAQSection faqs={faqs} accordion={accordion} />
      </div>
    </section>
  );
}

export function MinimalCTASection({ title, copy, cta }) {
  return (
    <section className="section-band alt minimal-cta-section">
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <InquiryCtaButton inquiryType={cta.inquiryType} label={cta.label} className="btn btn-primary" arrow={false}>
          {cta.label} <span className="arrow">-&gt;</span>
        </InquiryCtaButton>
      </div>
    </section>
  );
}
