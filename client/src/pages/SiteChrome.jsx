import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { clientNames } from './siteData.js';

const logoSrc = 'https://exhibitgraphicsign.com/wp-content/uploads/2024/02/EGS-Logo-300x126.png';

export function SiteNav({ active = 'home', cta = 'Send a brief' }) {
  const items = [
    {
      label: 'Services',
      bgColor: 'var(--ink)',
      textColor: 'var(--paper)',
      links: [
        { label: 'Exhibitions', href: '/exhibitions', ariaLabel: 'Open exhibitions page' },
        { label: 'Events / Graduations', href: '/events', ariaLabel: 'Open events and graduations page' },
        { label: 'Retail Rollouts', href: '/retail', ariaLabel: 'Open retail rollouts page' },
        { label: 'Fitouts', href: '/fitouts', ariaLabel: 'Open fitouts page' },
      ],
    },
    {
      label: 'Proof',
      bgColor: 'var(--terracotta)',
      textColor: 'var(--paper)',
      links: [
        { label: 'HCT Graduation Program', href: '/case-studies#hct-graduation-program', ariaLabel: 'Open HCT graduation case study' },
        { label: 'Sadia / Carrefour UAE', href: '/case-studies#sadia-carrefour-rollout', ariaLabel: 'Open Sadia Carrefour case study' },
        { label: 'Philips Riyadh', href: '/case-studies#philips-global-health-riyadh', ariaLabel: 'Open Philips Riyadh case study' },
        { label: 'All Case Studies', href: '/case-studies', ariaLabel: 'Open all case studies' },
      ],
    },
    {
      label: 'Brief',
      bgColor: 'var(--paper-2)',
      textColor: 'var(--ink)',
      links: [
        { label: 'Send a Brief', href: '/contact', ariaLabel: 'Open contact page' },
        { label: 'Email EGS', href: 'mailto:info@exhibitgraphicsign.com', ariaLabel: 'Email EGS' },
        { label: 'Call / WhatsApp', href: 'tel:+971524587992', ariaLabel: 'Call or WhatsApp EGS' },
        { label: 'Home', href: '/', ariaLabel: 'Open home page' },
      ],
    },
  ];

  return (
    <CardNav
      active={active}
      logo={logoSrc}
      logoAlt="EGS"
      items={items}
      cta={cta}
      baseColor="var(--paper)"
      menuColor="var(--ink)"
      buttonBgColor="var(--ink)"
      buttonTextColor="var(--paper)"
    />
  );
}

function CardNav({
  active = 'home',
  logo,
  logoAlt = 'Logo',
  items,
  cta = 'Send a brief',
  ease = 'power3.out',
  baseColor = '#fff',
  menuColor,
  buttonBgColor,
  buttonTextColor,
}) {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 292;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const contentEl = navEl.querySelector('.card-nav-content');
      if (!contentEl) return 292;
      const previous = {
        visibility: contentEl.style.visibility,
        pointerEvents: contentEl.style.pointerEvents,
        position: contentEl.style.position,
        height: contentEl.style.height,
      };
      contentEl.style.visibility = 'visible';
      contentEl.style.pointerEvents = 'auto';
      contentEl.style.position = 'static';
      contentEl.style.height = 'auto';
      const contentHeight = contentEl.scrollHeight;
      contentEl.style.visibility = previous.visibility;
      contentEl.style.pointerEvents = previous.pointerEvents;
      contentEl.style.position = previous.position;
      contentEl.style.height = previous.height;
      return 64 + contentHeight + 18;
    }
    return 300;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 64, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: 38, opacity: 0 });

    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.42,
      ease,
    });
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.42, ease, stagger: 0.075 }, '-=0.14');

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;
    return () => {
      tl?.kill();
      tlRef.current = null;
    };
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        tlRef.current = createTimeline();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      setIsHamburgerOpen(false);
      tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
      tl.reverse();
    }
  };

  const setCardRef = (index) => (el) => {
    if (el) cardsRef.current[index] = el;
  };

  return (
    <div className="card-nav-container">
      <nav
        ref={navRef}
        className={`card-nav ${isExpanded ? 'open' : ''}`}
        style={{ backgroundColor: baseColor }}
        aria-label="Primary navigation"
      >
        <div className="card-nav-top">
          <button
            type="button"
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            aria-expanded={isExpanded}
            style={{ color: menuColor || 'var(--ink)' }}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <a href="/" className="card-logo" aria-label="Exhibit Graphic Sign home">
            <img src={logo} alt={logoAlt} />
            <span className="card-logo-status">{active === 'home' ? 'Home' : 'EGS'}</span>
          </a>

          <a
            href="/contact"
            className="card-nav-cta-button"
            style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
          >
            {cta} <span>→</span>
          </a>
        </div>

        <div className={`card-nav-content ${isExpanded ? 'visible' : ''}`} aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, index) => (
            <article
              className="nav-card"
              key={`${item.label}-${index}`}
              ref={setCardRef(index)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((link) => (
                  <a
                    className="nav-card-link"
                    href={link.href}
                    aria-label={link.ariaLabel}
                    key={link.label}
                    onClick={() => {
                      setIsHamburgerOpen(false);
                      setIsExpanded(false);
                    }}
                  >
                    <span>↗</span>
                    {link.label}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <img
              src="https://exhibitgraphicsign.com/wp-content/uploads/2024/02/EGS-Logo-300x126.png"
              alt="EGS"
              style={{ height: '44px', filter: 'brightness(0) invert(1)', marginBottom: '20px' }}
            />
            <p style={{ maxWidth: '42ch', fontSize: '14px', opacity: '0.72', lineHeight: '1.55' }}>
              A Dubai production house for exhibition stands, ceremonies, retail branding, signage, and branded interiors.
            </p>
          </div>
          <div>
            <h4>Pages</h4>
            <ul>
              <li><a href="/exhibitions">Exhibitions</a></li>
              <li><a href="/events">Events</a></li>
              <li><a href="/retail">Retail</a></li>
              <li><a href="/fitouts">Fitouts</a></li>
            </ul>
          </div>
          <div>
            <h4>Proof</h4>
            <ul>
              <li><a href="/case-studies#hct-graduation-program">HCT program</a></li>
              <li><a href="/case-studies#sadia-carrefour-rollout">Sadia rollout</a></li>
              <li><a href="/case-studies#philips-global-health-riyadh">Philips Riyadh</a></li>
              <li><a href="/case-studies#kazakhstan-pavilion-gulfood">Kazakhstan Pavilion</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:info@exhibitgraphicsign.com">info@exhibitgraphicsign.com</a></li>
              <li>+971 4 238 3278</li>
              <li>+971 52 458 7992</li>
              <li>Al Qusais, Dubai</li>
            </ul>
          </div>
        </div>
        <div className="footer-big"><em>Built for</em> fixed deadlines.</div>
        <div className="footer-bottom">
          <span>© 2026 Exhibit Graphic Sign - Est. 2010</span>
          <span>Dubai / UAE production house</span>
        </div>
      </div>
    </footer>
  );
}

export function ClientMarquee() {
  return (
    <div className="marquee">
      <div className="marquee-track">
        {[...clientNames, ...clientNames].map((name, index) => (
          <div className="marquee-item" key={`${name}-${index}`}>{name}</div>
        ))}
      </div>
    </div>
  );
}

export function ProofCard({ card }) {
  return (
    <a className="proof-file-card" href={card.href}>
      <span className="proof-tag">{card.tag}</span>
      <strong>{card.stat}</strong>
      <h3>{card.title}</h3>
      <p>{card.copy}</p>
      <em>Open proof →</em>
    </a>
  );
}

export function Stepper({ steps }) {
  return (
    <div className="notebook-stepper">
      {steps.map(([title, copy], index) => (
        <div className="step" key={title}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <h3>{title}</h3>
          <p>{copy}</p>
        </div>
      ))}
    </div>
  );
}

export function InfoGrid({ items, eyebrow = 'Details' }) {
  return (
    <div className="capability-grid">
      {items.map(([title, copy]) => (
        <article className="cap-card" key={title}>
          <small>{eyebrow}</small>
          <h3>{title}</h3>
          <p>{copy}</p>
        </article>
      ))}
    </div>
  );
}

export function FAQSection({ faqs }) {
  return (
    <div className="faq-grid">
      {faqs.map(([question, answer]) => (
        <article className="faq-item" key={question}>
          <h3>{question}</h3>
          <p>{answer}</p>
        </article>
      ))}
    </div>
  );
}

export function ProductionHub({ center = 'EGS', items }) {
  return (
    <div className="production-hub" aria-label="Production coordination diagram">
      <div className="hub-core">
        <span>Production hub</span>
        <strong>{center}</strong>
        <em>keeps the work moving</em>
      </div>
      {items.map((item, index) => (
        <div className={`hub-node hub-node-${index + 1}`} key={item}>
          {item}
        </div>
      ))}
    </div>
  );
}

export function AnnotatedImage({ src, alt, labels }) {
  return (
    <div className="annotated-image">
      <img src={src} alt={alt} />
      {labels.map((label, index) => (
        <span className={`annotation annotation-${index + 1}`} key={label}>
          {label}
        </span>
      ))}
    </div>
  );
}

export function ControlBoard({ rows }) {
  return (
    <div className="control-board">
      <div className="control-head">
        <span>Rollout control</span>
        <strong>status / ready</strong>
      </div>
      {rows.map(([label, value, status]) => (
        <div className="control-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <em>{status}</em>
        </div>
      ))}
    </div>
  );
}
