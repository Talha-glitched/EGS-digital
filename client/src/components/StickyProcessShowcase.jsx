import { useCallback, useEffect, useRef, useState } from 'react';
import { images } from '../pages/siteData.js';
import './StickyProcessShowcase.css';

const DEFAULT_STEPS = [
  {
    label: 'Brief',
    image: images.graduationProfile,
    alt: 'Event planning and briefing for physical brand work',
  },
  {
    label: 'Design',
    image: images.philips,
    alt: 'Exhibition stand design and visual development',
  },
  {
    label: 'Produce',
    image: images.fitout,
    alt: 'Fabrication, joinery, and production in Dubai and Sharjah',
  },
  {
    label: 'Handover',
    image: images.hct,
    alt: 'Graduation ceremony and live event delivery',
  },
];

const DEFAULT_PORTFOLIO = [
  {
    href: '/case-studies#hct-graduation-program',
    tag: 'Graduations',
    title: 'HCT Graduation Program',
    copy: '4,500 graduates and 13,500 guests across the UAE in 2025.',
    image: images.hct,
  },
  {
    href: '/case-studies#sadia-carrefour-rollout',
    tag: 'Retail rollout',
    title: 'Sadia / Carrefour UAE',
    copy: 'Carrefour hypermarket locations completed between midnight and before 6am.',
    image: images.retail,
  },
];

export default function StickyProcessShowcase({
  steps = DEFAULT_STEPS,
  portfolioItems = DEFAULT_PORTFOLIO,
  portfolioEyebrow = 'Proof',
  portfolioTitle = 'Physical brand work under real deadline pressure.',
  portfolioCta = { label: 'View all case studies', href: '/case-studies' },
}) {
  const wrapperRef = useRef(null);
  const labelWrapRef = useRef(null);
  const viewportRef = useRef(null);
  const imageStackRef = useRef(null);
  const labelTrackRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const lastStepRef = useRef(-1);
  const rafRef = useRef(0);
  const labelHeightRef = useRef(120);
  const reducedMotionRef = useRef(false);

  const stepCount = steps.length;

  /**
   * Scroll-scrub progress through the tall wrapper:
   * progress = 0 when the wrapper top aligns with the viewport top;
   * progress = 1 after scrolling (wrapperHeight - viewportHeight).
   * Uses getBoundingClientRect (robust) instead of offsetTop (breaks with offset parents / transforms).
   *
   * Labels + image stack use the same progress (0→1) so text and images move continuously
   * between “stops” instead of jumping at fixed scroll positions.
   */
  const applyScrollSync = useCallback(() => {
    const scrollWrapper = wrapperRef.current;
    const imageStack = imageStackRef.current;
    const labelTrack = labelTrackRef.current;
    const labelWrap = labelWrapRef.current;
    const viewport = viewportRef.current;
    if (!scrollWrapper || !imageStack || !labelTrack) return;

    const rect = scrollWrapper.getBoundingClientRect();
    const viewH = window.innerHeight;
    const range = Math.max(1, scrollWrapper.offsetHeight - viewH);
    let progress = -rect.top / range;
    progress = Math.max(0, Math.min(1, progress));

    if (stepCount <= 1) {
      labelTrack.style.transform = 'translateY(0)';
      imageStack.style.transform = 'translateY(0)';
      if (lastStepRef.current !== 0) {
        lastStepRef.current = 0;
        setActiveStep(0);
      }
      return;
    }

    let scrub = progress;
    if (reducedMotionRef.current) {
      const idx = Math.min(stepCount - 1, Math.floor(progress * stepCount));
      scrub = idx / (stepCount - 1);
    }

    const labelH =
      labelWrap?.querySelector('.egs-sticky-showcase-label')?.offsetHeight ??
      labelHeightRef.current;
    labelHeightRef.current = labelH;

    const labelTravelPx = scrub * (stepCount - 1) * labelH;
    labelTrack.style.transform = `translateY(-${labelTravelPx}px)`;

    const slideViewportH = viewport?.clientHeight ?? 0;
    if (slideViewportH > 0) {
      const imageTravelPx = scrub * (stepCount - 1) * slideViewportH;
      imageStack.style.transform = `translateY(-${imageTravelPx}px)`;
    }

    const nearest = Math.round(scrub * (stepCount - 1));
    if (nearest !== lastStepRef.current) {
      lastStepRef.current = nearest;
      setActiveStep(nearest);
    }
  }, [stepCount]);

  const scheduleSync = useCallback(() => {
    if (rafRef.current !== 0) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      applyScrollSync();
    });
  }, [applyScrollSync]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const setRm = () => {
      reducedMotionRef.current = mq.matches;
    };
    setRm();
    mq.addEventListener?.('change', setRm);
    const legacyChange = () => setRm();
    mq.addListener?.(legacyChange);

    const scrollWrapper = wrapperRef.current;
    if (!scrollWrapper) return undefined;

    const run = () => {
      scheduleSync();
    };

    window.addEventListener('scroll', run, { passive: true });
    window.addEventListener('resize', run);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(run);
      resizeObserver.observe(scrollWrapper);
      if (labelWrapRef.current) {
        resizeObserver.observe(labelWrapRef.current);
      }
      if (viewportRef.current) {
        resizeObserver.observe(viewportRef.current);
      }
    }

    run();

    return () => {
      mq.removeEventListener?.('change', setRm);
      mq.removeListener?.(legacyChange);
      window.removeEventListener('scroll', run);
      window.removeEventListener('resize', run);
      resizeObserver?.disconnect();
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [scheduleSync, steps.length]);

  const scrollHeightVh = stepCount * 125;

  return (
    <div className="egs-sticky-showcase egs-sticky-showcase--scrub">
      <div
        ref={wrapperRef}
        className="egs-sticky-showcase-scroll"
        style={{ height: `${scrollHeightVh}vh` }}
        aria-hidden={false}
      >
        <div className="egs-sticky-showcase-sticky">
          <div className="egs-sticky-showcase-grid-bg" aria-hidden="true" />

          <div className="egs-sticky-showcase-inner" role="region" aria-label="How EGS moves from brief to handover">
            <p className="egs-sticky-sr-only" aria-live="polite">
              {steps[activeStep]?.label}, step {activeStep + 1} of {stepCount}
            </p>
            <div ref={labelWrapRef} className="egs-sticky-showcase-label-wrap">
              <div ref={labelTrackRef} className="egs-sticky-showcase-label-track">
                {steps.map((step, idx) => (
                  <div
                    key={step.label}
                    className="egs-sticky-showcase-label"
                    data-step={idx}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
            </div>

            <div
              ref={viewportRef}
              className="egs-sticky-showcase-viewport"
              style={{ '--sticky-steps': stepCount }}
            >
              <div ref={imageStackRef} className="egs-sticky-showcase-stack">
                {steps.map((step) => (
                  <div key={step.label} className="egs-sticky-showcase-slide">
                    <img src={step.image} alt={step.alt} loading="lazy" />
                    <div className="egs-sticky-showcase-slide-overlay" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="egs-sticky-showcase-portfolio" aria-labelledby="egs-sticky-portfolio-heading">
        <div className="egs-sticky-showcase-portfolio-inner">
          <div className="egs-sticky-showcase-portfolio-head">
            <p className="egs-sticky-showcase-portfolio-eyebrow">{portfolioEyebrow}</p>
            <h2 id="egs-sticky-portfolio-heading">{portfolioTitle}</h2>
            <a href={portfolioCta.href} className="egs-sticky-showcase-btn-outline">
              {portfolioCta.label}
            </a>
          </div>

          <div className="egs-sticky-showcase-portfolio-grid">
            {portfolioItems.map((item) => (
              <a key={item.href} href={item.href} className="egs-sticky-showcase-card">
                <div className="egs-sticky-showcase-card-media">
                  <img src={item.image} alt="" loading="lazy" />
                  <div className="egs-sticky-showcase-card-gradient">
                    <span className="egs-sticky-showcase-card-tag">{item.tag}</span>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                    <span className="egs-sticky-showcase-card-cta">Read case study →</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
