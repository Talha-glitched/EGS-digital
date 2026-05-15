import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './Navbar.css';
import egsLogo from '../assets/logo/EGS-Logo.png';
import { useInquiryModal } from '../context/InquiryModalContext.jsx';

const defaultItems = [
  {
    label: 'Services',
    bgColor: 'var(--paper)',
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
    label: 'Contact',
    bgColor: 'var(--ink-blue)',
    textColor: 'var(--paper)',
    links: [
      { label: 'Tell us about your project', inquiryType: 'general', ariaLabel: 'Tell us about your project' },
      { label: 'Email EGS', href: 'mailto:info@exhibitgraphicsign.com', ariaLabel: 'Email EGS' },
      { label: 'Call / WhatsApp', href: 'tel:+971524587992', ariaLabel: 'Call or WhatsApp EGS' },
    ],
  },
];

function CardNav({
  active = 'home',
  items,
  cta = 'Tell us about your project',
  ctaInquiryType = 'general',
  ease = 'power3.out',
  baseColor = 'var(--paper)',
  menuColor = 'var(--ink)',
  buttonBgColor = 'var(--ink)',
  buttonTextColor = 'var(--paper)',
  /** Full-bleed hero: fixed on top, transparent until user scrolls */
  overlay = false,
}) {
  const { openInquiry } = useInquiryModal();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const overlaySolid = false;
  const navRef = useRef(null);
  const tlRef = useRef(null);
  const expandTimeoutRef = useRef(null);

  const list = items || defaultItems;
  const hoveredItem = hoveredIndex !== null ? list[hoveredIndex] : null;
  // Mix the brand color with ink to darken, then make it highly transparent (30%)
  const dynamicBg = isExpanded && hoveredItem 
    ? `color-mix(in oklab, color-mix(in oklab, ${hoveredItem.bgColor} 84%, var(--ink)) 30%, transparent)` 
    : '';

  const handleMouseEnterItem = (index) => {
    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
    setHoveredIndex(index);
    if (!isExpanded) {
      setIsExpanded(true);
      tlRef.current?.play(0);
    }
  };

  const handleMouseLeaveNav = () => {
    expandTimeoutRef.current = setTimeout(() => {
      if (tlRef.current) {
        tlRef.current.eventCallback('onReverseComplete', () => {
          setIsExpanded(false);
          setHoveredIndex(null);
        });
        tlRef.current.reverse();
      } else {
        setIsExpanded(false);
        setHoveredIndex(null);
      }
    }, 150);
  };

  const handleMouseEnterNav = () => {
    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
  };

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 292;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const contentEl = navEl.querySelector('.egs-navbar-content');
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

    const contentEl = navEl.querySelector('.egs-navbar-content');
    if (contentEl) {
      gsap.set(contentEl, { y: 20, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.42,
      ease,
    });
    
    if (contentEl) {
      tl.to(contentEl, { y: 0, opacity: 1, duration: 0.35, ease }, '-=0.2');
    }

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

  // Toggle menu logic removed, handled by hover

  // setCardRef removed, cards are handled via CSS

  const navSurface =
    overlay && !overlaySolid ? 'transparent' : baseColor;

  const menuIconColor =
    overlay && !overlaySolid ? 'var(--paper)' : menuColor || 'var(--ink)';

  const ctaSurfaceStyle =
    overlay && !overlaySolid
      ? {
          backgroundColor: 'transparent',
          color: 'var(--paper)',
          border: '1px solid rgba(245, 241, 234, 0.42)',
        }
      : { backgroundColor: buttonBgColor, color: buttonTextColor };

  return (
    <div
      className={`egs-navbar-container${overlay ? ' egs-navbar-container--overlay' : ''}`}
    >
      <nav
        ref={navRef}
        className={`egs-navbar ${isExpanded ? 'open' : ''}${
          overlay ? ' egs-navbar--overlay' : ''
        }${overlay && overlaySolid ? ' egs-navbar--overlay-solid' : ''}`}
        style={{ 
          backgroundColor: navSurface,
          ...(dynamicBg ? { '--dynamic-bg': dynamicBg } : {})
        }}
        aria-label="Primary navigation"
        onMouseLeave={handleMouseLeaveNav}
        onMouseEnter={handleMouseEnterNav}
      >
        <div className="egs-navbar-top">
          <a
            href="/"
            className="egs-navbar-logo"
            aria-label="Exhibit Graphic Sign home"
            aria-current={active === 'home' ? 'page' : undefined}
          >
            <img src={egsLogo} alt="Exhibit Graphic Sign" className="egs-navbar-logo-image" />
          </a>

          <div className="egs-desktop-nav-links">
            {(items || []).slice(0, 3).map((item, index) => (
              <span
                key={item.label}
                className={`egs-desktop-nav-item ${hoveredIndex === index ? 'active' : ''}`}
                onMouseEnter={() => handleMouseEnterItem(index)}
                style={{
                  color: hoveredIndex === index ? item.textColor : '',
                  opacity: isExpanded && hoveredIndex !== index ? 0.6 : 1
                }}
              >
                {item.label}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="egs-navbar-cta-button"
            style={ctaSurfaceStyle}
            onClick={() => openInquiry(ctaInquiryType)}
          >
            {cta} <span>→</span>
          </button>
        </div>

        <div className={`egs-navbar-content ${isExpanded ? 'visible' : ''}`} aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, index) => (
            <article
              className={`egs-nav-card ${hoveredIndex === index ? 'active-card' : ''}`}
              key={`${item.label}-${index}`}
              style={{ color: item.textColor }}
            >
              <div className="egs-nav-card-links">
                {item.links?.map((link) => {
                  const closeMenu = () => {
                    if (tlRef.current) {
                      tlRef.current.eventCallback('onReverseComplete', () => {
                        setIsExpanded(false);
                        setHoveredIndex(null);
                      });
                      tlRef.current.reverse();
                    }
                  };

                  if (link.inquiryType) {
                    return (
                      <button
                        type="button"
                        className="egs-nav-card-link"
                        aria-label={link.ariaLabel}
                        key={link.label}
                        onClick={() => {
                          openInquiry(link.inquiryType);
                          closeMenu();
                        }}
                      >
                        <span className="link-arrow">↗</span>
                        <span className="link-label">{link.label}</span>
                      </button>
                    );
                  }

                  return (
                    <a
                      className="egs-nav-card-link"
                      href={link.href}
                      aria-label={link.ariaLabel}
                      key={link.label}
                      onClick={closeMenu}
                    >
                      <span className="link-arrow">↗</span>
                      <span className="link-label">{link.label}</span>
                    </a>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function Navbar(props) {
  return <CardNav items={props.items || defaultItems} {...props} />;
}
