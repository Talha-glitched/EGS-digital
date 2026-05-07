import pageStyles from '../styles/pages/content-first.css?raw';
import { Navbar } from '../components/Navbar.jsx';
import ExhibitionsAdaptationSection from '../components/exhibitions/ExhibitionsAdaptationSection.jsx';
import ExhibitionsCTASection from '../components/exhibitions/ExhibitionsCTASection.jsx';
import ExhibitionsFAQSection from '../components/exhibitions/ExhibitionsFAQSection.jsx';
import ExhibitionsHeroSection from '../components/exhibitions/ExhibitionsHeroSection.jsx';
import ExhibitionsProcessSection from '../components/exhibitions/ExhibitionsProcessSection.jsx';
import ExhibitionsProofSection from '../components/exhibitions/ExhibitionsProofSection.jsx';
import ExhibitionsScopeSection from '../components/exhibitions/ExhibitionsScopeSection.jsx';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Footer } from './SiteChrome.jsx';

const exhibitionsRevealSelector = [
  '.exhibitions-page .exhibitions-kicker',
  '.exhibitions-page .exhibitions-hero-copy h1',
  '.exhibitions-page .exhibitions-hero-copy p',
  '.exhibitions-page .exhibitions-hero-actions .btn',
  '.exhibitions-page .section-head h2',
  '.exhibitions-page .section-head p',
  '.exhibitions-page .exhibitions-metric-card',
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
        <ExhibitionsProofSection />
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
