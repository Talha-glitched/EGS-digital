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
import HomeFAQSection from '../components/home/HomeFAQSection.jsx';
import HomeCTASection from '../components/home/HomeCTASection.jsx';
import { images, services } from './siteData.js';
import { EGS_ORGANIZATION } from '../utils/schemaGenerator.js';

const homeRevealSelector = [
  '.home-page .chip',
  '.home-page .hero-actions .btn',
  '.home-page .egs-home-video-copy > *',
  '.home-page .proof-chip',
  '.home-page .hero-feature-image .label',
  '.home-page .section-head h2',
  '.home-page .section-head p',
  '.home-page .service-card',
  '.home-page .proof-file-card',
  '.home-page .step',
  '.home-page .production-hub',
  '.home-page .cap-card',
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

  usePageLifecycle('Exhibition Stand Contractor & Event Production Dubai | EGS', {
    revealSelector: homeRevealSelector,
    description: 'EGS is an in-house Dubai exhibition stand contractor and event production house. Turnkey booth design & fabrication, graduation ceremonies, retail rollouts, and fitouts across UAE since 2010.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg',
    structuredData: [
      {
        '@context': 'https://schema.org',
        ...EGS_ORGANIZATION,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Exhibit Graphic Sign',
        url: 'https://www.exhibitgraphicsign.com/',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://www.exhibitgraphicsign.com/?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  });

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

        <HomeFAQSection />

        <HomeCTASection />

        <Footer />
      </div>
    </>
  );
}
