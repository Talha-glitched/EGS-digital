import { useCallback, useEffect, useRef, useState } from 'react';
import './ServicesV2.css';

/** Scroll runway per service: 1 viewport entrance + hold before next panel */
const CHAPTER_HEIGHT_VH = 135;

const PAGE_THEMES = [
  {
    accent: '#D9262E',
    overlay:
      'linear-gradient(155deg, rgba(217, 38, 46, 0.55) 0%, rgba(26, 23, 21, 0.72) 42%, rgba(15, 13, 12, 0.94) 100%)',
    glow: 'rgba(217, 38, 46, 0.18)',
    stage: 'EXHIBITIONS',
  },
  {
    accent: '#E06B4A',
    overlay:
      'linear-gradient(155deg, rgba(180, 72, 48, 0.52) 0%, rgba(26, 23, 21, 0.7) 44%, rgba(15, 13, 12, 0.94) 100%)',
    glow: 'rgba(224, 107, 74, 0.16)',
    stage: 'EVENTS & GRADUATIONS',
  },
  {
    accent: '#4A52C9',
    overlay:
      'linear-gradient(155deg, rgba(47, 49, 147, 0.58) 0%, rgba(26, 23, 21, 0.68) 44%, rgba(15, 13, 12, 0.94) 100%)',
    glow: 'rgba(74, 82, 201, 0.18)',
    stage: 'RETAIL',
  },
  {
    accent: '#5A7344',
    overlay:
      'linear-gradient(155deg, rgba(61, 75, 46, 0.58) 0%, rgba(26, 23, 21, 0.68) 44%, rgba(15, 13, 12, 0.94) 100%)',
    glow: 'rgba(90, 115, 68, 0.18)',
    stage: 'FITOUTS',
  },
];

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function chapterProgress(rect, viewH) {
  const raw = (viewH - rect.top) / viewH;
  return smoothstep(Math.max(0, Math.min(1, raw)));
}

function ServicePage({ service, index, total, theme, innerRef, isActive }) {
  return (
    <article
      className="egs-services-v2-page"
      style={{ zIndex: index + 2 }}
      aria-label={`${service.title}, service ${index + 1} of ${total}`}
    >
      <div
        ref={innerRef}
        className={`egs-services-v2-page-inner${isActive ? ' is-active' : ''}`}
        style={{
          '--page-accent': theme.accent,
          '--page-overlay': theme.overlay,
          '--page-glow': theme.glow,
        }}
      >
        <div className="egs-services-v2-page-bg" aria-hidden="true">
          <img src={service.image} alt="" loading={index === 0 ? 'eager' : 'lazy'} />
        </div>

        <div className="egs-services-v2-page-overlay" aria-hidden="true" />
        <div className="egs-services-v2-page-glow" aria-hidden="true" />

        <div className="egs-services-v2-page-content">
          <div className="egs-services-v2-top-left">
            <span className="egs-services-v2-stage">{theme.stage}</span>
            <h3 className="egs-services-v2-headline">{service.title}</h3>
          </div>

          <div className="egs-services-v2-bottom-left">
            <span className="egs-services-v2-tag">Service {service.label}</span>
            <p className="egs-services-v2-copy">{service.copy}</p>
          </div>

          <div className="egs-services-v2-bottom-right">
            <a href={service.href} className="egs-services-v2-cta">
              <span>Explore {service.title}</span>
              <span className="egs-services-v2-cta-arrow" aria-hidden="true">→</span>
            </a>
          </div>

          <div className="egs-services-v2-page-pill" aria-hidden="true">
            <span className="egs-services-v2-page-pill-num is-active">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="egs-services-v2-page-pill-sep">/</span>
            <span className="egs-services-v2-page-pill-num">
              {String(total).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ServicesV2({ services }) {
  const chaptersRef = useRef(null);
  const chapterRefs = useRef([]);
  const innerRefs = useRef([]);
  const activeFlagsRef = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [activeFlags, setActiveFlags] = useState(() => services.map(() => false));
  const lastActiveRef = useRef(-1);
  const rafRef = useRef(0);
  const reducedMotionRef = useRef(false);

  const applyScrollSync = useCallback(() => {
    const chapters = chapterRefs.current;
    const inners = innerRefs.current;
    if (!chapters.length) return;

    const viewH = window.innerHeight;
    let currentActive = 0;
    const nextFlags = [];

    chapters.forEach((chapter, index) => {
      const inner = inners[index];
      if (!chapter || !inner) return;

      const rect = chapter.getBoundingClientRect();
      let progress = chapterProgress(rect, viewH);

      if (reducedMotionRef.current) {
        progress = rect.top < viewH * 0.92 ? 1 : 0;
      }

      const offset = (1 - progress) * 100;
      inner.style.transform = `translate3d(0, ${offset}%, 0)`;

      const isActive = progress > 0.68;
      nextFlags[index] = isActive;
      inner.classList.toggle('is-active', isActive);

      if (progress > 0.15) {
        currentActive = index;
      }
    });

    if (currentActive !== lastActiveRef.current) {
      lastActiveRef.current = currentActive;
      setActiveIndex(currentActive);
    }

    if (nextFlags.some((flag, i) => flag !== activeFlagsRef.current[i])) {
      activeFlagsRef.current = nextFlags;
      setActiveFlags([...nextFlags]);
    }

    const chaptersEl = chaptersRef.current;
    if (chaptersEl) {
      const bounds = chaptersEl.getBoundingClientRect();
      const inView = bounds.top < viewH * 0.95 && bounds.bottom > viewH * 0.05;
      setShowProgress(inView);
    }
  }, []);

  const scheduleSync = useCallback(() => {
    if (rafRef.current !== 0) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      applyScrollSync();
    });
  }, [applyScrollSync]);

  useEffect(() => {
    chapterRefs.current = chapterRefs.current.slice(0, services.length);
    innerRefs.current = innerRefs.current.slice(0, services.length);
    activeFlagsRef.current = services.map(() => false);
    setActiveFlags(services.map(() => false));
  }, [services.length]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const setRm = () => {
      reducedMotionRef.current = mq.matches;
      scheduleSync();
    };
    setRm();
    mq.addEventListener?.('change', setRm);
    const legacyChange = () => setRm();
    mq.addListener?.(legacyChange);

    const run = () => scheduleSync();

    window.addEventListener('scroll', run, { passive: true });
    window.addEventListener('resize', run);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(run);
      if (chaptersRef.current) resizeObserver.observe(chaptersRef.current);
      chapterRefs.current.forEach((chapter) => {
        if (chapter) resizeObserver.observe(chapter);
      });
    }

    run();
    const t = window.setTimeout(run, 120);

    return () => {
      window.clearTimeout(t);
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
  }, [scheduleSync, services.length]);

  return (
    <section className="egs-services-v2" aria-label="EGS core services">
      <div
        ref={chaptersRef}
        className="egs-services-v2-chapters"
        role="region"
        aria-label="EGS core services"
      >
        <p className="egs-services-v2-sr-only" aria-live="polite">
          {services[activeIndex]?.title}, service {activeIndex + 1} of {services.length}
        </p>

        <div
          className={`egs-services-v2-progress${showProgress ? ' is-visible' : ''}`}
          aria-hidden="true"
        >
          {services.map((service, idx) => {
            const theme = PAGE_THEMES[idx] ?? PAGE_THEMES[0];
            return (
              <span
                key={service.href}
                className={`egs-services-v2-progress-dot${idx === activeIndex ? ' is-active' : ''}${idx < activeIndex ? ' is-past' : ''}`}
                style={{ '--page-accent': theme.accent }}
              />
            );
          })}
        </div>

        {services.map((service, index) => (
          <div
            key={service.href}
            ref={(el) => {
              chapterRefs.current[index] = el;
            }}
            className="egs-services-v2-chapter"
            style={{ height: `${CHAPTER_HEIGHT_VH}vh` }}
          >
            <ServicePage
              service={service}
              index={index}
              total={services.length}
              theme={PAGE_THEMES[index] ?? PAGE_THEMES[0]}
              isActive={activeFlags[index]}
              innerRef={(el) => {
                innerRefs.current[index] = el;
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
