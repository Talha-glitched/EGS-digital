import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './Navbar.css';
import egsLogo from '../assets/logo/New_Logo/Logo-01.png';
import exhibitionIcon from '../assets/exhibition.png';
import eventIcon from '../assets/event.png';
import retailIcon from '../assets/retail.png';
import interiorIcon from '../assets/interior.png';
import caseStudyIcon from '../assets/case study.png';
import hctLogo from '../assets/client_logos_gray/done/9.png';
import sadiaLogo from '../assets/client_logos_gray/done/16.png';
import philipsLogo from '../assets/client_logos_gray/done/4.png';
import projectIcon from '../assets/tell us about ur project.png';
import mailIcon from '../assets/mail.png';
import whatsappIcon from '../assets/whatsapp.png';
import { useInquiryModal } from '../context/InquiryModalContext.jsx';

const MOBILE_BREAKPOINT = 768;

const defaultItems = [
  {
    label: 'Services',
    bgColor: 'var(--paper)',
    textColor: 'var(--paper)',
    links: [
      { label: 'Exhibitions', href: '/exhibitions', ariaLabel: 'Open exhibitions page', icon: exhibitionIcon },
      { label: 'Events / Graduations', href: '/events', ariaLabel: 'Open events and graduations page', icon: eventIcon },
      { label: 'Retail Rollouts', href: '/retail', ariaLabel: 'Open retail rollouts page', icon: retailIcon },
      { label: 'Fitouts', href: '/fitouts', ariaLabel: 'Open fitouts page', icon: interiorIcon },
    ],
  },
  {
    label: 'Proof',
    bgColor: 'var(--terracotta)',
    textColor: 'var(--paper)',
    links: [
      { label: 'HCT Graduation Program', href: '/case-studies#hct-graduation-program', ariaLabel: 'Open HCT graduation case study', icon: hctLogo, iconVariant: 'logo', iconScale: 2 },
      { label: 'Sadia / Carrefour UAE', href: '/case-studies#sadia-carrefour-rollout', ariaLabel: 'Open Sadia Carrefour case study', icon: sadiaLogo, iconVariant: 'logo', iconScale: 1.5 },
      { label: 'Philips Riyadh', href: '/case-studies#philips-global-health-riyadh', ariaLabel: 'Open Philips Riyadh case study', icon: philipsLogo, iconVariant: 'logo', iconScale: 1.75 },
      { label: 'All Case Studies', href: '/case-studies', ariaLabel: 'Open all case studies', icon: caseStudyIcon },
    ],
  },
  {
    label: 'Contact',
    bgColor: 'var(--ink-blue)',
    textColor: 'var(--paper)',
    links: [
      { label: 'Tell us about your project', inquiryType: 'general', ariaLabel: 'Tell us about your project', icon: projectIcon },
      { label: 'Email EGS', href: 'mailto:info@exhibitgraphicsign.com', ariaLabel: 'Email EGS', icon: mailIcon },
      { label: 'Call / WhatsApp', href: 'tel:+971524587992', ariaLabel: 'Call or WhatsApp EGS', icon: whatsappIcon },
    ],
  },
];

function getLinkIconStyle(link) {
  if (!link.iconScale) return undefined;

  const baseHeight = 40;
  const baseMaxWidth = 132;

  return {
    height: `${baseHeight * link.iconScale}px`,
    maxWidth: `min(100%, ${baseMaxWidth * link.iconScale}px)`,
  };
}

function MobileNavLink({ link, onNavigate }) {
  const { openInquiry } = useInquiryModal();

  if (link.inquiryType) {
    return (
      <li>
        <button
          type="button"
          className="egs-mobile-nav__link"
          aria-label={link.ariaLabel}
          onClick={() => {
            openInquiry(link.inquiryType);
            onNavigate();
          }}
        >
          {link.label}
        </button>
      </li>
    );
  }

  return (
    <li>
      <a
        className="egs-mobile-nav__link"
        href={link.href}
        aria-label={link.ariaLabel}
        onClick={onNavigate}
      >
        {link.label}
      </a>
    </li>
  );
}

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
  overlay = false,
}) {
  const { openInquiry } = useInquiryModal();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const overlaySolid = false;
  const navRef = useRef(null);
  const tlRef = useRef(null);
  const expandTimeoutRef = useRef(null);

  const list = items || defaultItems;
  const hoveredItem = hoveredIndex !== null ? list[hoveredIndex] : null;

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const closeDesktopMenu = useCallback(() => {
    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
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
  }, []);

  const closeMenu = useCallback(() => {
    if (isMobile) {
      closeMobileMenu();
      return;
    }
    closeDesktopMenu();
  }, [isMobile, closeMobileMenu, closeDesktopMenu]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      if (mobile) {
        setIsExpanded(false);
        setHoveredIndex(null);
        closeDesktopMenu();
      } else {
        closeMobileMenu();
      }
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [closeDesktopMenu, closeMobileMenu]);

  useEffect(() => {
    if (!isMobile || !isMobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen, closeMenu]);

  const dynamicBg =
    !isMobile && isExpanded && hoveredItem
      ? `color-mix(in oklab, color-mix(in oklab, ${hoveredItem.bgColor} 84%, var(--ink)) 30%, transparent)`
      : '';

  const handleMouseEnterItem = (index) => {
    if (isMobile) return;
    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
    setHoveredIndex(index);
    if (!isExpanded) {
      setIsExpanded(true);
      tlRef.current?.play(0);
    }
  };

  const handleMouseLeaveNav = () => {
    if (isMobile) return;
    expandTimeoutRef.current = setTimeout(() => {
      closeDesktopMenu();
    }, 150);
  };

  const handleMouseEnterNav = () => {
    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((open) => !open);
  };

  const calculateDesktopHeight = () => 300;

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl || isMobile) return null;

    gsap.set(navEl, { height: 64, overflow: 'hidden' });

    const contentEl = navEl.querySelector('.egs-navbar-content');
    if (contentEl) {
      gsap.set(contentEl, { y: 20, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, {
      height: calculateDesktopHeight,
      duration: 0.42,
      ease,
    });

    if (contentEl) {
      tl.to(contentEl, { y: 0, opacity: 1, duration: 0.35, ease }, '-=0.2');
    }

    return tl;
  };

  useLayoutEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return undefined;

    if (isMobile) {
      tlRef.current?.kill();
      tlRef.current = null;
      gsap.set(navEl, { height: 64, overflow: 'visible', clearProps: 'height' });
      return undefined;
    }

    const tl = createTimeline();
    tlRef.current = tl;
    return () => {
      tl?.kill();
      tlRef.current = null;
    };
  }, [ease, items, isMobile]);

  useLayoutEffect(() => {
    if (isMobile || !tlRef.current) return undefined;

    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateDesktopHeight();
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
  }, [isExpanded, isMobile]);

  const navSurface = overlay && !overlaySolid ? 'transparent' : baseColor;

  const menuIconColor =
    overlay && !overlaySolid && !isMobileMenuOpen ? 'var(--paper)' : menuColor || 'var(--ink)';

  const ctaSurfaceStyle =
    overlay && !overlaySolid && !isMobileMenuOpen
      ? {
          backgroundColor: 'transparent',
          color: 'var(--paper)',
          border: '1px solid rgba(245, 241, 234, 0.42)',
        }
      : { backgroundColor: buttonBgColor, color: buttonTextColor };

  return (
    <div
      className={`egs-navbar-container${overlay ? ' egs-navbar-container--overlay' : ''}${isMobileMenuOpen ? ' egs-navbar-container--menu-open' : ''}`}
    >
      <nav
        ref={navRef}
        className={`egs-navbar${isExpanded ? ' open' : ''}${isMobile ? ' egs-navbar--mobile-bar' : ''}${
          overlay ? ' egs-navbar--overlay' : ''
        }${overlay && overlaySolid ? ' egs-navbar--overlay-solid' : ''}${isMobileMenuOpen ? ' egs-navbar--menu-open' : ''}`}
        style={{
          backgroundColor: navSurface,
          ...(dynamicBg ? { '--dynamic-bg': dynamicBg } : {}),
        }}
        aria-label="Primary navigation"
        onMouseLeave={handleMouseLeaveNav}
        onMouseEnter={handleMouseEnterNav}
      >
        <div className="egs-navbar-top">
          <button
            type="button"
            className={`egs-hamburger-menu${isMobileMenuOpen ? ' open' : ''}`}
            onClick={isMobile ? toggleMobileMenu : undefined}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobile ? isMobileMenuOpen : false}
            aria-controls={isMobile ? 'egs-mobile-nav-panel' : undefined}
            style={{ color: isMobile ? menuIconColor : undefined }}
          >
            <span className="egs-hamburger-line" aria-hidden="true" />
            <span className="egs-hamburger-line" aria-hidden="true" />
          </button>

          <a
            href="/"
            className="egs-navbar-logo"
            aria-label="Exhibit Graphic Sign home"
            aria-current={active === 'home' ? 'page' : undefined}
            onClick={closeMenu}
          >
            <img src={egsLogo} alt="" className="egs-navbar-logo-image" />
          </a>

          <div className="egs-desktop-nav-links">
            {list.slice(0, 3).map((item, index) => (
              <span
                key={item.label}
                className={`egs-desktop-nav-item ${hoveredIndex === index ? 'active' : ''}`}
                onMouseEnter={() => handleMouseEnterItem(index)}
                style={{
                  color: hoveredIndex === index ? item.textColor : '',
                  opacity: isExpanded && hoveredIndex !== index ? 0.6 : 1,
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

        {!isMobile ? (
          <div
            className={`egs-navbar-content${isExpanded ? ' visible' : ''}`}
            aria-hidden={!isExpanded}
          >
            {list.slice(0, 3).map((item, index) => (
              <article
                className={`egs-nav-card egs-nav-card--${item.label.toLowerCase()}${hoveredIndex === index ? ' active-card' : ''}`}
                key={`${item.label}-${index}`}
                style={{ color: item.textColor }}
              >
                <div className="egs-nav-card-links">
                  {item.links?.map((link) => {
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
                          {link.icon ? (
                            <img
                              src={link.icon}
                              alt=""
                              className={`link-icon${link.iconVariant === 'logo' ? ' link-icon--logo' : ''}`}
                              style={getLinkIconStyle(link)}
                              aria-hidden="true"
                            />
                          ) : null}
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
                        onClick={() => closeMenu()}
                      >
                        {link.icon ? (
                          <img
                            src={link.icon}
                            alt=""
                            className={`link-icon${link.iconVariant === 'logo' ? ' link-icon--logo' : ''}`}
                            style={getLinkIconStyle(link)}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="link-label">{link.label}</span>
                      </a>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </nav>

      {isMobile ? (
        <div
          className={`egs-mobile-nav${isMobileMenuOpen ? ' is-open' : ''}${overlay ? ' egs-mobile-nav--overlay' : ''}`}
          aria-hidden={!isMobileMenuOpen}
        >
          <button
            type="button"
            className="egs-mobile-nav__backdrop"
            aria-label="Close menu"
            tabIndex={isMobileMenuOpen ? 0 : -1}
            onClick={closeMobileMenu}
          />

          <div
            id="egs-mobile-nav-panel"
            className="egs-mobile-nav__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="egs-mobile-nav__scroll">
              {list.map((item) => (
                <section className="egs-mobile-nav__group" key={item.label}>
                  <h2 className="egs-mobile-nav__group-title">{item.label}</h2>
                  <ul className="egs-mobile-nav__list">
                    {item.links?.map((link) => (
                      <MobileNavLink
                        key={link.label}
                        link={link}
                        onNavigate={closeMobileMenu}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="egs-mobile-nav__footer">
              <button
                type="button"
                className="egs-mobile-nav__cta"
                onClick={() => {
                  openInquiry(ctaInquiryType);
                  closeMobileMenu();
                }}
              >
                {cta}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Navbar(props) {
  return <CardNav items={props.items || defaultItems} {...props} />;
}
