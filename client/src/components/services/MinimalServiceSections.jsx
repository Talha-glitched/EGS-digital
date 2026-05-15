import { useCallback, useState } from 'react';
import InquiryCtaButton from '../inquiry/InquiryCtaButton.jsx';
import { motion } from 'motion/react';
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
  const sublineItems = Array.isArray(subline) ? subline : null;
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
        <motion.span
          className="minimal-service-kicker"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut' }}
        >
          {kicker}
        </motion.span>
        <motion.h1
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut', delay: 0.1 }}
        >
          {title}
        </motion.h1>
        {sublineItems ? (
          <motion.p
            className="minimal-service-rotating-subline"
            aria-label={sublineItems.join(', ')}
            initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
            whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.78, ease: 'easeOut', delay: 0.24 }}
          >
            <span className="minimal-service-subline-rotator" aria-hidden="true">
              {sublineItems.map((item, index) => (
                <span key={item} style={{ animationDelay: `${index * 2.4}s` }}>
                  {item}
                </span>
              ))}
            </span>
          </motion.p>
        ) : (
          <motion.p
            initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
            whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.78, ease: 'easeOut', delay: 0.24 }}
          >
            {subline}
          </motion.p>
        )}
        <motion.div
          className="minimal-service-actions"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut', delay: 0.34 }}
        >
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
        </motion.div>
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
