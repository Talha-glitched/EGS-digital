import pageStyles from '../styles/pages/content-first.css?raw';
import homeResponsiveStyles from '../styles/pages/home-responsive.css?raw';
import stickyShowcaseResponsiveStyles from '../styles/pages/sticky-showcase-responsive.css?raw';
import { useRef } from 'react';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { motion } from 'motion/react';
import HomeHero from '../components/HomeHero.jsx';
import StickyProcessShowcase from '../components/StickyProcessShowcase.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { ClientMarquee, Footer } from './SiteChrome.jsx';
import HomeServicesSection from '../components/home/HomeServicesSection.jsx';
import HomeProofSection from '../components/home/HomeProofSection.jsx';
import HomeProcessSection from '../components/home/HomeProcessSection.jsx';
import HomeStandardsSection from '../components/home/HomeStandardsSection.jsx';
import HomeHCTSection from '../components/home/HomeHCTSection.jsx';
import HomeFAQSection from '../components/home/HomeFAQSection.jsx';
import HomeCTASection from '../components/home/HomeCTASection.jsx';
import CircularGallery from '../components/CircularGallery.jsx';
import { images, processSteps, proofCards, services } from './siteData.js';

const homeRevealSelector = [
  '.home-page .chip',
  '.home-page .hero-actions .btn',
  '.home-page .egs-home-video-copy > *',
  '.home-page .proof-chip',
  '.home-page .hero-feature-image .label',
  '.home-page .section-head h2',
  '.home-page .section-head p',
  '.home-page .service-card',  '.home-page .proof-file-card',
  '.home-page .home-circular-gallery',
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
  const galleryFallbackImage = images.graduationWide;
  const serviceGalleryItems = services.map((service) => ({
    image: service.image || galleryFallbackImage,
    text: service.title,
    href: service.href,
  }));

  usePageLifecycle('Exhibit Graphic Sign | Exhibition Stands, Events, Retail Branding Dubai', {
    revealSelector: homeRevealSelector,
    description: 'Dubai production partner for high-stakes physical brand moments since 2010. We build custom exhibition stands, graduation ceremonies, retail activations, and office fitouts in the UAE.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": "https://exhibitgraphicsign.com/#organization",
      "name": "Exhibit Graphic Sign (EGS)",
      "url": "https://exhibitgraphicsign.com/",
      "logo": "https://exhibitgraphicsign.com/wp-content/uploads/2024/02/EGS-Logo-300x126.png",
      "image": "https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg",
      "description": "Dubai production partner for high-stakes physical brand moments: custom exhibition stands, graduation ceremonies, events, retail branding, and office fitouts.",
      "foundingDate": "2010",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Sharjah & Dubai",
        "addressRegion": "Dubai",
        "addressCountry": "AE"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+971565348700",
        "contactType": "customer service",
        "email": "info@exhibitgraphicsign.com",
        "availableLanguage": ["English", "Arabic"]
      },
      "sameAs": [
        "https://www.nstands.com/companies/exhibit-graphic-sign/"
      ]
    }
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
      <style>{homeResponsiveStyles}</style>
      <style>{stickyShowcaseResponsiveStyles}</style>
      <div className="content-page home-page" style={{ '--accent': 'var(--terracotta)' }}>
        <Navbar active="home" overlay />

        <HomeHero />

        <StickyProcessShowcase afterScroll={<HomeServicesSection services={services} />} />

        <ClientMarquee />
         {/* <section className="section-band alt home-circular-gallery-section">
          <div className="container">
            <div className="section-head">
              <h2>Explore services in motion.</h2>
              <p>Scroll through core services and click a card to jump into that service page.</p>
            </div>
          </div>
          <div className="home-circular-gallery reveal">
            <CircularGallery
              items={serviceGalleryItems}
              bend={6}
              textColor="#f5f1ea"
              borderRadius={0.11}
              showText
              fallbackImage={galleryFallbackImage}
              scrollEase={0.02}
              scrollSpeed={1.8}
              font="700 44px Arial"
              planeWidth={700}
              planeHeight={860}
            />
          </div>
        </section>

        */}

        {/* <HomeProofSection
          proofScrollRef={proofScrollRef}
          proofCards={proofCards}
          onScrollProofCards={scrollProofCards}
        /> */}
       

        {/* <HomeProcessSection processSteps={processSteps} />

        <HomeStandardsSection />

        <HomeHCTSection image={images.hct} /> */}

        <HomeFAQSection />

        <HomeCTASection />

        <Footer />
      </div>
    </>
  );
}

