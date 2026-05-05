import pageStyles from '../styles/pages/content-first.css?raw';
import { useRef } from 'react';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { motion } from 'motion/react';
import HomeHero from '../components/HomeHero.jsx';
import StickyProcessShowcase from '../components/StickyProcessShowcase.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { ClientMarquee, FAQSection, Footer, InfoGrid, ProductionHub, ProofCard, Stepper } from './SiteChrome.jsx';
import { images, processSteps, proofCards, services } from './siteData.js';

const pressureItems = [
  ['Move quickly', 'EGS moves when the requirement changes, but keeps the physical work tied to the client need.'],
  ['Protect the standard', 'Fast is only useful when the finish, handover, and public moment still hold.'],
  ['Keep control', 'Late changes should not become public chaos for the visitor, guest, customer, or sales team.'],
  ['Remember the work', 'Repeat-client memory matters because each engagement should make the next one sharper.'],
];

const homeFaqs = [
  ['What does EGS do?', 'EGS builds exhibition stands, graduation ceremonies, event environments, retail branding, signage, and branded interiors across Dubai and the UAE.'],
  ['Can EGS handle urgent changes?', 'Yes, when the change is physically possible and the team can keep the standard intact. The proof includes Sadia, HCT Fujairah, Philips, and Kazakhstan Pavilion.'],
  ['Who should contact EGS?', 'Marketing, events, procurement, retail, and institutional teams who need physical brand work delivered properly under real deadline pressure.'],
  ['What should I send first?', 'Send the service type, deadline, venue or location, and any drawings, photos, location lists, or brand guidelines you already have.'],
];

const homeRevealSelector = [
  '.home-page .chip',
  '.home-page .hero-actions .btn',
  '.home-page .egs-home-video-copy > *',
  '.home-page .proof-chip',
  '.home-page .hero-feature-image .label',
  '.home-page .section-head h2',
  '.home-page .section-head p',
  '.home-page .service-card',
  '.home-page .home-services-gallery',
  '.home-page .proof-file-card',
  '.home-page .proof-carousel-controls',
  '.home-page .step',
  '.home-page .production-hub',
  '.home-page .cap-card',
  '.home-page .dark-band .image-cell',
  '.home-page .stat-poem .proof-chip',
  '.home-page .faq-item',
  '.home-page .section-band > .container > .btn',
  '.home-page .footer-grid > *',
  '.home-page .footer-big',
  '.home-page .footer-bottom',
  '.home-page .egs-sticky-showcase-portfolio-head h2',
  '.home-page .egs-sticky-showcase-card',
].join(', ');


export default function HomePage() {
  const proofScrollRef = useRef(null);

  usePageLifecycle('Exhibit Graphic Sign | Exhibition Stands, Events, Retail Branding Dubai', {
    revealSelector: homeRevealSelector,
  });

  const scrollProofCards = (direction) => {
    const scroller = proofScrollRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.min(scroller.clientWidth * 0.86, 760),
      behavior: 'smooth',
    });
  };

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page home-page" style={{ '--accent': 'var(--terracotta)' }}>
        <Navbar active="home" overlay />

        <HomeHero />

        <StickyProcessShowcase />

        <section className="section-band alt home-services-section">
          <div className="container">
            <div className="section-head">
              <h2 className="home-intro-title">We are EGS Shaping high stakes physical brand moments for 15+ years</h2>
              <p>Every deadline has moving parts. EGS keeps them moving.
EGS is a Dubai production house for high-stakes physical brand moments across the UAE. When the requirement changes late and the date cannot move, we keep the work moving until it is ready and correct. Instead of images can we show the cards like this</p>
            </div>
            <div className="home-services-gallery">
              <div className="service-grid">
                {services.map((service) => (
                  <a className="service-card" href={service.href} key={service.href}>
                    <div className="media">
                      <img src={service.image} alt={service.title} />
                    </div>
                    <div className="body">
                      <small>{service.label}</small>
                      <h3>{service.title}</h3>
                      <p>{service.copy}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ClientMarquee />

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>What pressure-tested looks like.</h2>
              <p>Proof should be quick to understand: client, deadline pressure, physical work, and result. Open any file to see the full story.</p>
            </div>
          </div>
          <div className="proof-scroll" ref={proofScrollRef}>
            <div className="proof-track">
              {proofCards.map((card) => <ProofCard card={card} key={card.title} />)}
            </div>
          </div>
          <div className="container">
            <div className="proof-carousel-controls" aria-label="Proof card carousel controls">
              <span className="proof-carousel-kicker">Proof files</span>
              <span className="proof-carousel-rule" aria-hidden="true" />
              <div className="proof-carousel-buttons">
                <button type="button" onClick={() => scrollProofCards(-1)} aria-label="Scroll proof cards left">&larr;</button>
                <button type="button" onClick={() => scrollProofCards(1)} aria-label="Scroll proof cards right">&rarr;</button>
              </div>
            </div>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>From brief to handover, the work stays physical.</h2>
              <p>EGS works backwards from the opening date, showtime, launch window, or handover. The first job is to understand the hard constraint.</p>
            </div>
            <div className="process-with-hub">
              <Stepper steps={processSteps} />
              <ProductionHub
                items={['client', 'venue', 'materials', 'crew', 'fabrication', 'graphics', 'installation', 'handover']}
              />
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Fast is only useful when the standard stays intact.</h2>
              <p>The hard part is not saying yes. The hard part is sourcing material, moving crews, handling access, keeping the finish clean, and still delivering what the client asked for.</p>
            </div>
            <InfoGrid items={pressureItems} eyebrow="How EGS works" />
          </div>
        </section>

        <section className="section-band dark-band">
          <div className="container">
            <div className="section-head">
              <h2>Seven ceremonies. 4,500 graduates. One public moment.</h2>
              <p>In 2025, EGS delivered seven HCT grand ceremonies across the UAE for 4,500 graduates and 13,500 guests.</p>
            </div>
            <div className="image-cell" style={{ aspectRatio: '21 / 9', marginBottom: '34px' }}>
              <img src={images.hct} alt="HCT graduation ceremony production" />
              <span className="label">Higher Colleges of Technology · 2025 graduation season</span>
            </div>
            <div className="stat-poem">
              <div className="proof-chip"><strong>7</strong><span>Grand ceremonies</span></div>
              <div className="proof-chip"><strong>4,500</strong><span>Graduates</span></div>
              <div className="proof-chip"><strong>13,500</strong><span>Guests</span></div>
            </div>
            <a href="/case-studies#hct-graduation-program" className="btn btn-ghost" style={{ marginTop: '28px' }}>Read the HCT case study <span className="arrow">→</span></a>
          </div>
        </section>

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2>Questions buyers ask first.</h2>
              <p>Direct answers before a marketing manager, event lead, retail team, or procurement contact sends the first brief.</p>
            </div>
            <FAQSection faqs={homeFaqs} />
          </div>
        </section>

        <section className="section-band">
          <div className="container">
            <div className="section-head">
              <h2>Send the deadline, location, and what needs to happen.</h2>
              <p>If the date is fixed or the requirement has changed, send the brief. EGS will look at what can be done and what needs to move first.</p>
            </div>
            <a href="/contact" className="btn btn-primary">Send us your brief <span className="arrow">→</span></a>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
