import pageStyles from '../styles/pages/content-first.css?raw';
import { Suspense, lazy, useRef } from 'react';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { motion } from 'motion/react';
import BlurText from '../components/BlurText.jsx';
import { ClientMarquee, FAQSection, Footer, InfoGrid, ProductionHub, ProofCard, SiteNav, Stepper } from './SiteChrome.jsx';
import { images, processSteps, proofCards, services } from './siteData.js';
import hctHeroPoster from '../assets/HCT.jpeg';
import hctHeroVideo from '../assets/hctgraduation.mp4';

const CircularGallery = lazy(() => import('../components/CircularGallery.jsx'));

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

const serviceGalleryImages = [
  '/assets/egs-profile/corporate-events-branding.jpg',
  '/assets/egs-profile/graduation-ceremonies-overview.jpg',
  '/assets/egs-profile/event-management-02.jpg',
  '/assets/egs-profile/event-management-03.jpg',
];

const serviceGalleryItems = services.map((service, index) => ({
  image: serviceGalleryImages[index] ?? service.image,
  text: service.title,
  href: service.href,
}));

const homeRevealSelector = [
  '.home-page .chip',
  '.home-page .hero-actions .btn',
  '.home-page .home-video-hero-copy > *',
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
].join(', ');

function LegacyHomeHero() {
  return (
    <section className="content-hero">
      <div className="container">
        <div className="hero-board">
          <div className="hero-copy">
            <div>
              <div className="chip-row">
                <span className="chip"><span className="chip-dot" />Dubai / UAE production house</span>
                <span className="chip"><span className="chip-dot" />Built for fixed deadlines</span>
              </div>
              <BlurText
                text="Every deadline has moving parts. EGS keeps them moving."
                delay={150}
                animateBy="words"
                direction="bottom"
                className="wide-title"
                as="h1"
              />
              <motion.p
                className="lede"
                initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
                whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.18 }}
              >
                EGS is a Dubai production house for high-stakes physical brand moments across the UAE. When the requirement changes late and the date cannot move, we keep the work moving until it is ready and correct.
              </motion.p>
            </div>
            <div>
              <div className="hero-actions">
                <a href="/contact" className="btn btn-primary">Send us your brief <span className="arrow">&rarr;</span></a>
                <a href="/case-studies" className="btn btn-ghost">See case studies</a>
              </div>
              <div className="proof-chip-strip">
                <div className="proof-chip"><strong>2010</strong><span>Founded in Dubai</span></div>
                <div className="proof-chip"><strong>25+</strong><span>Big projects/year</span></div>
                <div className="proof-chip"><strong>UAE</strong><span>Venue and install pressure</span></div>
              </div>
            </div>
          </div>
          <div className="hero-visual-stack">
            <div className="image-cell hero-feature-image">
              <motion.img
                src={images.graduationProfile}
                alt="HCT graduation ceremony production"
                initial={{ filter: 'blur(10px)', opacity: 0, y: 40 }}
                whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
              <span className="label">Seven HCT ceremonies / 4,500 graduates / 13,500 guests</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeVideoHero() {
  return (
    <section className="home-video-hero" aria-label="EGS hero">
      <video
        className="home-video-hero-media"
        src={hctHeroVideo}
        poster={hctHeroPoster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="home-video-hero-shade" aria-hidden="true" />
      <div className="home-video-hero-copy">
        <span className="home-video-hero-kicker">Dubai / UAE production house for 15+ years</span>
        <motion.h1
          className="home-video-heading"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut', delay: 0.1 }}
        >
          Shaping Brand Moments across the Gulf.
        </motion.h1>
        <motion.div
          className="home-video-services"
          aria-label="EGS services"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 18 }}
          whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.78, ease: 'easeOut', delay: 0.24 }}
        >
          <span className="home-video-service-rotator" aria-hidden="true">
            <span>Exhibitions &amp; Museums</span>
            <span>Product Launches</span>
            <span>Graduation Ceremonies</span>
            <span>Events</span>
            <span>Brand and Retail Activations</span>
            <span>Interior Fitouts</span>
          </span>
          <span className="home-video-service-a11y">
            Exhibitions and museums, product launches, graduation ceremonies, events, brand and retail activations, and interior fitouts.
          </span>
        </motion.div>
      </div>
    </section>
  );
}

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
        <SiteNav active="home" />

        <HomeVideoHero />

        <section className="content-hero legacy-home-hero" aria-hidden="true">
          <div className="container">
            <div className="hero-board">
              <div className="hero-copy">
                <div>
                  <div className="chip-row">
                    <span className="chip"><span className="chip-dot" />Dubai / UAE production house</span>
                    <span className="chip"><span className="chip-dot" />Built for fixed deadlines</span>
                  </div>
                  <BlurText
                    text="Every deadline has moving parts. EGS keeps them moving."
                    delay={150}
                    animateBy="words"
                    direction="bottom"
                    className="wide-title"
                    as="h1"
                  />
                  <motion.p
                    className="lede"
                    initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
                    whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.18 }}
                  >
                    EGS is a Dubai production house for high-stakes physical brand moments across the UAE. When the requirement changes late and the date cannot move, we keep the work moving until it is ready and correct.
                  </motion.p>
                </div>
                <div>
                  <div className="hero-actions">
                    <a href="/contact" className="btn btn-primary">Send us your brief <span className="arrow">→</span></a>
                    <a href="/case-studies" className="btn btn-ghost">See case studies</a>
                  </div>
                  <div className="proof-chip-strip">
                    <div className="proof-chip"><strong>2010</strong><span>Founded in Dubai</span></div>
                    <div className="proof-chip"><strong>25+</strong><span>Big projects/year</span></div>
                    <div className="proof-chip"><strong>UAE</strong><span>Venue and install pressure</span></div>
                  </div>
                </div>
              </div>
              <div className="hero-visual-stack">
                <div className="image-cell hero-feature-image">
                  <motion.img
                    src={images.graduationProfile}
                    alt="HCT graduation ceremony production"
                    initial={{ filter: 'blur(10px)', opacity: 0, y: 40 }}
                    whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  />
                  <span className="label">Seven HCT ceremonies · 4,500 graduates · 13,500 guests</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ClientMarquee />

        <section className="section-band alt">
          <div className="container">
            <div className="section-head">
              <h2 className="home-intro-title">We are EGS Shaping high stakes physical brand moments for 15+ years</h2>
              <p>Every deadline has moving parts. EGS keeps them moving.
EGS is a Dubai production house for high-stakes physical brand moments across the UAE. When the requirement changes late and the date cannot move, we keep the work moving until it is ready and correct. Instead of images can we show the cards like this</p>
            </div>
            <div className="home-services-gallery">
              <Suspense fallback={null}>
                <CircularGallery
                  items={serviceGalleryItems}
                  bend={3.4}
                  textColor="#1A1715"
                  borderRadius={0.08}
                  scrollSpeed={1.8}
                  scrollEase={0.045}
                  font={'400 34px "Instrument Serif", Georgia, serif'}
                />
              </Suspense>
            </div>
          </div>
        </section>

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
