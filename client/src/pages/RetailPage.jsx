import pageStyles from '../styles/pages/content-first.css?raw';
import minimalServiceResponsiveStyles from '../styles/pages/minimal-service-responsive.css?raw';
import stickyShowcaseResponsiveStyles from '../styles/pages/sticky-showcase-responsive.css?raw';
import retailStyles from '../styles/pages/retail.css?raw';
import StickyProcessShowcase from '../components/StickyProcessShowcase.jsx';
import { Navbar } from '../components/Navbar.jsx';
import {
  MinimalCTASection,
  MinimalFAQSection,
  MinimalProcessSection,
  MinimalServiceHero,
} from '../components/services/MinimalServiceSections.jsx';

// Custom ICP-Focused Components
import RetailProofSection from '../components/retail/RetailProofSection.jsx';
import RetailScopeSection from '../components/retail/RetailScopeSection.jsx';
import RetailFailurePointsSection from '../components/retail/RetailFailurePointsSection.jsx';

import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Footer } from './SiteChrome.jsx';
import { images } from './siteData.js';
import { getProjectCta } from '../utils/contactInquiry.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

const retailCta = getProjectCta('retail');

const retailShowcaseSteps = [
  {
    label: 'Supermarket &\nHypermarket',
    image: images.retailHypermarketDisplay,
    alt: 'Chiller branding and island displays at Carrefour locations',
  },
  {
    label: 'Product Display Stands',
    image: images.retailSadiaBusDisplay,
    alt: 'Custom product displays and POSM fabricated in-house',
  },
  {
    label: 'Mall Activations',
    image: images.retailMallActivation,
    alt: 'High-stakes mall activations and temporary installations',
  },
  {
    label: 'Campaign Graphics\nAnd Store Branding',
    image: images.retailCampaignGraphics,
    alt: 'Installed retail campaign graphics and branded chiller panels',
  },
];

const processSteps = [
  ['Rollout Brief', 'Share the location list, launch date, asset specs, and store contacts.'],
  ['Route Mapping', 'EGS maps vehicles, crew splits, and supervisors around geography and access windows.'],
  ['Print & Pack', 'Graphics, POSM, and display units are produced, checked, packed, and labelled by location.'],
  ['After-Hours Install', 'Crews deploy after store or mall access opens, with teams split by route.'],
  ['QA & Completion', 'Supervisors check placement, finish, and photos before the campaign goes live.'],
  ['Campaign Launch', 'Each location opens with the same brand standard, not a different version of the campaign.'],
];

const faqs = [
  [
    'Can EGS keep every branch ready by launch morning?',
    'That is the point of the rollout plan. EGS maps production status, route order, access windows, crew splits, supervisors, and completion photos before teams move, so launch readiness is checked branch by branch.',
  ],
  [
    'How do you keep branding consistent across all locations?',
    'Printing, fabrication, packing, installation, and QA/QC stay under one team. That reduces color drift, wrong dimensions, uneven placement, and the small finish differences that make one store look off-brand.',
  ],
  [
    'Can you work around mall and hypermarket access restrictions?',
    'Yes. EGS plans around closing times, loading docks, gate passes, security procedures, store contacts, and mall approval requirements so installers are ready when the access window opens.',
  ],
  [
    'What proof do you have for urgent multi-location work?',
    'For Sadia, EGS completed 33 Carrefour hypermarket locations across the UAE between midnight and before 6am, using 13 vehicles with QA/QC supervisors moving across teams.',
  ],
  [
    'What should we send for a serious estimate?',
    'Send the branch list, launch date, access windows, asset types, quantities, dimensions, artwork status, and store or mall contacts. Site photos help EGS catch fit, access, and placement issues earlier.',
  ],
  [
    'Can EGS produce the assets as well as install them?',
    'Yes. EGS handles large-format printing, POSM, display units, joinery, metalwork, packing, dispatch, installation, and supervisor checks so every location receives the right assets.',
  ],
  [
    'What happens if branches, quantities, or timing change late?',
    'EGS reviews the change against material readiness, production load, access windows, and crew availability, then separates what can be compressed from what would risk the launch standard.',
  ],
];

const revealSelector = [
  '.minimal-service-page .minimal-service-kicker',
  '.minimal-service-page .minimal-service-hero-copy h1',
  '.minimal-service-page .minimal-service-hero-copy p',
  '.minimal-service-page .minimal-service-actions .btn',
  '.minimal-service-page .egs-sticky-showcase-label',
  '.minimal-service-page .section-head h2',
  '.minimal-service-page .section-head p',
  '.minimal-service-page .cap-card',
  '.minimal-service-page .step',
  '.minimal-service-page .faq-item',
  '.minimal-service-page .section-band > .container > .btn',
  '.minimal-service-page .retail-proof-copy > *',
  '.minimal-service-page .retail-proof-image',
  '.minimal-service-page .retail-failure-card',
  '.minimal-service-page .footer-grid > *',
  '.minimal-service-page .footer-big',
  '.minimal-service-page .footer-bottom',
].join(', ');

export default function RetailPage() {
  usePageLifecycle('Retail Branding Rollouts & Hypermarket Displays UAE | EGS', {
    revealSelector,
    description: 'Nationwide retail branding rollouts, supermarket chiller displays (Carrefour, Sadia), and mall activations executed overnight with in-house fabrication.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/Philips-Pairs.jpg',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'Retail Branding Rollouts and Mall Activations',
        description: 'Overnight multi-site retail rollouts, hypermarket product chiller displays, custom POSM designs, and temporary mall campaign installs.',
        serviceType: 'Retail Branding Contractor',
        url: '/retail',
      },
      faqs,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Retail Rollouts', url: '/retail' },
      ],
    }),
  });

  return (
    <>
      <style>{pageStyles}</style>
      <style>{minimalServiceResponsiveStyles}</style>
      <style>{stickyShowcaseResponsiveStyles}</style>
      <style>{retailStyles}</style>
      <div className="content-page minimal-service-page retail-minimal-page" style={{ '--accent': 'var(--claret)' }}>
        <Navbar active="retail" cta={retailCta.label} ctaInquiryType={retailCta.inquiryType} overlay />

        <MinimalServiceHero
          image={images.retailSadiaChiller}
          imageAlt="Retail branding installation work"
          kicker="Retail branding installation UAE"
          title="Retail rollouts ready before shoppers arrive."
          subline={['Location list checked', 'Access windows mapped', 'Assets matched by store', 'Launch photos confirmed']}
          primaryCta={retailCta}
          secondaryCta={{ href: '#sadia-proof', label: 'See Sadia proof' }}
        />

        <StickyProcessShowcase
          steps={retailShowcaseSteps}
          showPortfolio={false}
          ariaLabel="Retail rollout proof and process"
          wrapLabels
        />

        <div id="sadia-proof">
          <RetailProofSection />
        </div>

        <RetailScopeSection />

        <MinimalProcessSection
          title="From list to launch."
          copy="Retail work is a logistics and routing problem. Here is how EGS secures the process:"
          steps={processSteps}
        />

        <RetailFailurePointsSection />

        <MinimalFAQSection
          title="Questions retail teams ask first."
          copy="Short, grounded answers before the location list moves."
          faqs={faqs}
          accordion
        />

        <MinimalCTASection
          title="Send the location list and launch date."
          copy="EGS will return route mapping, vehicle counts, crew allocation, and a confirmed overnight install schedule."
          primaryCta={retailCta}
          secondaryCta={{ href: '/case-studies#sadia-carrefour-rollout', label: 'Read 33-Store Rollout Case Study' }}
        />

        <Footer />
      </div>
    </>
  );
}
