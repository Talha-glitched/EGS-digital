import pageStyles from '../styles/pages/content-first.css?raw';
import { Navbar } from '../components/Navbar.jsx';
import {
  MinimalCTASection,
  MinimalFAQSection,
  MinimalPhotoProofSection,
  MinimalProcessSection,
  MinimalScopeSection,
  MinimalServiceHero,
} from '../components/services/MinimalServiceSections.jsx';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Footer } from './SiteChrome.jsx';
import { images } from './siteData.js';

const proofItems = [
  { metric: '33', label: 'Carrefour locations', image: images.retail, href: '/case-studies#sadia-carrefour-rollout' },
  { metric: '13', label: 'Vehicles deployed', image: images.activation, href: '/case-studies#sadia-carrefour-rollout' },
  { metric: '6am', label: 'Finished before morning', image: images.retail, href: '/case-studies#sadia-carrefour-rollout' },
];

const scopeItems = [
  ['Chiller branding', 'Confirmed Sadia proof includes chiller branding and install.'],
  ['Island displays', 'Campaign displays ready before launch.'],
  ['Retail graphics', 'Consistent branded assets across locations.'],
  ['Mall activations', 'Public-facing retail environments and campaign builds.'],
];

const processSteps = [
  ['List', 'Locations and assets.'],
  ['Route', 'Teams and access windows.'],
  ['Prepare', 'Displays, branding, tools.'],
  ['Install', 'After closing time.'],
  ['Check', 'QA/QC and consistency.'],
  ['Launch', 'Ready before customers.'],
];

const faqs = [
  ['What should we send?', 'Location list, access windows, launch date, asset types, scope, contacts, and display photos.'],
  ['Can EGS handle 33 locations overnight?', 'Yes. Sadia / Carrefour UAE is the proof story.'],
  ['What retail assets can EGS install?', 'Chiller branding, island displays, retail graphics, product displays, and activation assets.'],
  ['Does EGS provide QA/QC?', 'For Sadia, EGS used install teams plus 8-10 QA/QC people moving across teams.'],
];

const revealSelector = [
  '.minimal-service-page .minimal-service-kicker',
  '.minimal-service-page .minimal-service-hero-copy h1',
  '.minimal-service-page .minimal-service-hero-copy p',
  '.minimal-service-page .minimal-service-actions .btn',
  '.minimal-service-page .section-head h2',
  '.minimal-service-page .section-head p',
  '.minimal-service-page .minimal-proof-card',
  '.minimal-service-page .cap-card',
  '.minimal-service-page .step',
  '.minimal-service-page .faq-item',
  '.minimal-service-page .section-band > .container > .btn',
  '.minimal-service-page .footer-grid > *',
  '.minimal-service-page .footer-big',
  '.minimal-service-page .footer-bottom',
].join(', ');

export default function RetailPage() {
  usePageLifecycle('Retail Branding Installation UAE | Mall And Hypermarket Rollouts | EGS', {
    revealSelector,
  });

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page minimal-service-page retail-minimal-page" style={{ '--accent': 'var(--claret)' }}>
        <Navbar active="retail" cta="Start a rollout brief" overlay />
        <MinimalServiceHero
          image={images.retail}
          imageAlt="Retail branding installation work"
          kicker="Retail branding installation UAE"
          title="Retail rollouts built before customers arrive."
          subline="Stores. Assets. Access windows. Launch-ready."
          primaryCta={{ href: '/contact', label: 'Start a rollout brief' }}
          secondaryCta={{ href: '/case-studies#sadia-carrefour-rollout', label: 'See Sadia proof' }}
        />
        <MinimalPhotoProofSection
          title="Proof after closing time."
          copy="Multi-location work with launch pressure."
          items={proofItems}
        />
        <MinimalScopeSection
          title="What EGS installs."
          copy="Campaign assets that need to look consistent everywhere."
          eyebrow="Retail scope"
          items={scopeItems}
        />
        <MinimalProcessSection
          title="From list to launch."
          copy="Retail work is a routing and readiness problem."
          steps={processSteps}
        />
        <MinimalFAQSection
          title="Questions retail teams ask first."
          copy="Short answers before the location list moves."
          faqs={faqs}
        />
        <MinimalCTASection
          title="Send the location list and launch date."
          copy="EGS will look at access, assets, teams, and QA/QC together."
          cta={{ href: '/contact', label: 'Start a rollout brief' }}
        />
        <Footer />
      </div>
    </>
  );
}
