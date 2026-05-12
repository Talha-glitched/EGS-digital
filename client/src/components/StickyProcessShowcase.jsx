import { useCallback, useEffect, useRef, useState } from 'react';
import { images } from '../pages/siteData.js';
import drawingImage from '../assets/Exhibition Stands/drawing.png';
import drawingTwoImage from '../assets/Exhibition Stands/drawing2.png';
import hp1Image from '../assets/Exhibition Stands/hp1.jpeg';
import hp2Image from '../assets/Exhibition Stands/hp2.jpeg';
import './StickyProcessShowcase.css';

const DEFAULT_STEPS = [
  {
    label: 'Brief',
    image: drawingTwoImage,
    alt: 'Event planning and briefing for physical brand work',
  },
  {
    label: 'Design',
    image: drawingImage,
    alt: 'Exhibition stand design and visual development',
  },
  {
    label: 'Produce',
    image: hp1Image,
    alt: 'Fabrication, joinery, and production in Dubai and Sharjah',
  },
  {
    label: 'Handover',
    image: hp2Image,
    alt: 'Graduation ceremony and live event delivery',
  },
];

const DEFAULT_PORTFOLIO = [
  {
    href: '/case-studies#hct-graduation-program',
    tag: 'Graduations',
    title: 'HCT Graduation Program',
    copy: '4,500 graduates and 13,500 guests across the UAE in 2025.',
    image: images.hctGraduationCard,
  },
  {
    href: '/case-studies#philips-global-health-riyadh',
    tag: 'Exhibitions',
    title: 'Philips / Global Health Riyadh',
    copy: 'Healthcare stand adapted in 10-12 hours for an ultrasound display.',
    image: images.philips,
  },
];

export default function StickyProcessShowcase({
  steps = DEFAULT_STEPS,
  portfolioItems = DEFAULT_PORTFOLIO,
  portfolioEyebrow = 'Proof',
  portfolioTitle = 'Physical brand work under real deadline pressure.',
  portfolioCta = { label: 'View all case studies', href: '/case-studies' },
  showPortfolio = true,
  ariaLabel = 'How EGS moves from brief to handover',
  afterScroll = null,
  /** Taller label slots + wrapping; use on pages with long headline-style step labels (e.g. Events). */
  wrapLabels = false,
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

  const isLastStepActive = activeStep === stepCount - 1;

  return (
    <div
      className={`egs-sticky-showcase egs-sticky-showcase--scrub${isLastStepActive ? ' egs-sticky-showcase--last-step-active' : ''}${wrapLabels ? ' egs-sticky-showcase--wrap-labels' : ''}`}
    >
      <div
        ref={wrapperRef}
        className="egs-sticky-showcase-scroll"
        style={{ height: `${scrollHeightVh}vh` }}
        aria-hidden={false}
      >
        <div className="egs-sticky-showcase-sticky">
          <div className="egs-sticky-showcase-grid-bg" aria-hidden="true" />

          <div className="egs-sticky-showcase-inner" role="region" aria-label={ariaLabel}>
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
              className={`egs-sticky-showcase-viewport${isLastStepActive ? ' is-last-active' : ''}`}
              style={{ '--sticky-steps': stepCount }}
            >
              <div ref={imageStackRef} className="egs-sticky-showcase-stack">
                {steps.map((step, idx) => (
                  <div
                    key={step.label}
                    className={`egs-sticky-showcase-slide${idx === 0 ? ' egs-sticky-showcase-slide--first' : ''}${idx === stepCount - 1 ? ' egs-sticky-showcase-slide--last' : ''}`}
                  >
                    <img src={step.image} alt={step.alt} loading="lazy" />
                    <div className="egs-sticky-showcase-slide-overlay" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {afterScroll}

      {showPortfolio ? <section className="egs-sticky-showcase-portfolio" aria-labelledby="egs-sticky-portfolio-heading">
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
      </section> : null}
    </div>
  );
}
