import pageStyles from '../styles/pages/content-first.css?raw';
import StickyProcessShowcase from '../components/StickyProcessShowcase.jsx';
import { Navbar } from '../components/Navbar.jsx';
import ExhibitionsAdaptationSection from '../components/exhibitions/ExhibitionsAdaptationSection.jsx';
import ExhibitionsCTASection from '../components/exhibitions/ExhibitionsCTASection.jsx';
import ExhibitionsFAQSection from '../components/exhibitions/ExhibitionsFAQSection.jsx';
import ExhibitionsHeroSection from '../components/exhibitions/ExhibitionsHeroSection.jsx';
import ExhibitionsProcessSection from '../components/exhibitions/ExhibitionsProcessSection.jsx';
import ExhibitionsScopeSection from '../components/exhibitions/ExhibitionsScopeSection.jsx';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Footer } from './SiteChrome.jsx';
import ausCaaStand from '../assets/Exhibition Stands/AUS-CAA.jpeg';
import hctStand from '../assets/Exhibition Stands/HCT1.jpeg';
import healthtechStand from '../assets/Exhibition Stands/healthtech.jpg';
import kazakhstanPavilion from '../assets/Exhibition Stands/Kazakhstan_Pavillion.jpeg';

const exhibitionsShowcaseSteps = [
  {
    label: 'Global Health Exhibition ',
    image: healthtechStand,
    alt: 'Healthcare exhibition stand with illuminated branded walls and product displays',
  },
  {
    label: 'HCT Exhibition Stand',
    image: hctStand,
    alt: 'HCT exhibition stand with digital screens and branded counters',
  },
  {
    label: 'Gulfood Kazakhstan',
    image: kazakhstanPavilion,
    alt: 'Kazakhstan pavilion exhibition stand with curved overhead signage',
  },
  {
    label: 'AUS-CAAD Exhibition',
    image: ausCaaStand,
    alt: 'AUS and CAA exhibition stand with branded meeting counters',
  },
];


const exhibitionsRevealSelector = [
  '.exhibitions-page .exhibitions-kicker',
  '.exhibitions-page .exhibitions-hero-copy h1',
  '.exhibitions-page .exhibitions-hero-copy p',
  '.exhibitions-page .exhibitions-hero-actions .btn',
  '.exhibitions-page .egs-sticky-showcase-label',
  '.exhibitions-page .section-head h2',
  '.exhibitions-page .section-head p',
  '.exhibitions-page .cap-card',
  '.exhibitions-page .step',
  '.exhibitions-page .exhibitions-adaptation-copy > *',
  '.exhibitions-page .exhibitions-adaptation-image',
  '.exhibitions-page .faq-item',
  '.exhibitions-page .section-band > .container > .btn',
  '.exhibitions-page .footer-grid > *',
  '.exhibitions-page .footer-big',
  '.exhibitions-page .footer-bottom',
].join(', ');

export default function ExhibitionsPage() {
  usePageLifecycle('Exhibition Stand Contractor Dubai | Custom Exhibition Stands UAE | EGS', {
    revealSelector: exhibitionsRevealSelector,
  });

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page exhibitions-page" style={{ '--accent': 'var(--ochre)' }}>
        <Navbar active="exhibitions" cta="Brief us on your stand" overlay />
        <ExhibitionsHeroSection />
        <StickyProcessShowcase
          steps={exhibitionsShowcaseSteps}
          showPortfolio={false}
          ariaLabel="Exhibition stand proof and process"
        />
        <ExhibitionsScopeSection />
        <ExhibitionsProcessSection />
        <ExhibitionsAdaptationSection />
        <ExhibitionsFAQSection />
        <ExhibitionsCTASection />
        <Footer />
      </div>
    </>
  );
}
