import pageStyles from '../styles/pages/content-first.css?raw';
import StickyProcessShowcase from '../components/StickyProcessShowcase.jsx';
import { Navbar } from '../components/Navbar.jsx';
import {
  MinimalCTASection,
  MinimalFAQSection,
  MinimalProcessSection,
  MinimalScopeSection,
  MinimalServiceHero,
} from '../components/services/MinimalServiceSections.jsx';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Footer } from './SiteChrome.jsx';
import { images } from './siteData.js';
import { getProjectCta } from '../utils/contactInquiry.js';

const fitoutsCta = getProjectCta('fitouts');

const fitoutShowcaseSteps = [
  {
    label: 'Brand visibility',
    image: images.fitout,
    alt: 'Branded interior fitout and showroom visibility',
  },
  {
    label: 'Joinery built for use',
    image: images.fitout,
    alt: 'Interior joinery and branded finish details',
  },
  {
    label: 'Signage integrated early',
    image: images.retail,
    alt: 'Interior signage and brand graphics in a commercial space',
  },
  {
    label: 'Daily-use handover',
    image: images.activation,
    alt: 'Finished branded space ready for daily customer use',
  },
];

const scopeItems = [
  ['Showrooms', 'Visitor spaces with brand, visibility, and sales use aligned.'],
  ['Reception areas', 'First impressions with signage and movement considered together.'],
  ['Interior signage', 'Brand graphics built into the room early.'],
  ['Joinery details', 'Fixtures and surfaces made for daily use.'],
];

const processSteps = [
  ['Space', 'Photos, drawings, location.'],
  ['Use', 'Movement and sightlines.'],
  ['Scope', 'Signage, joinery, finish.'],
  ['Produce', 'Fabrication and print.'],
  ['Install', 'Site work and adjustment.'],
  ['Handover', 'Ready for daily use.'],
];

const faqs = [
  ['What should we send?', 'Photos or drawings, location, handover target, brand files, signage needs, and problem areas.'],
  ['Does EGS handle interior signage?', 'Yes. Signage should feel built into the room, not added after handover.'],
  ['Is this for full interiors or upgrades?', 'Both can fit, depending on scope and confirmed project needs.'],
  ['What makes EGS useful for fitouts?', 'Production, signage, joinery thinking, and brand-detail sensitivity in one workflow.'],
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
  '.minimal-service-page .footer-grid > *',
  '.minimal-service-page .footer-big',
  '.minimal-service-page .footer-bottom',
].join(', ');

export default function FitoutsPage() {
  usePageLifecycle('Interior Fitout Branding Dubai | Branded Interiors And Signage | EGS', {
    revealSelector,
  });

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page minimal-service-page fitouts-minimal-page" style={{ '--accent': 'var(--olive)' }}>
        <Navbar active="fitouts" cta={fitoutsCta.label} ctaInquiryType={fitoutsCta.inquiryType} overlay />
        <MinimalServiceHero
          image={images.fitout}
          imageAlt="Fakhruddin Properties branded showroom"
          kicker="Interior fitout branding Dubai"
          title="Spaces built beyond the handover photo."
          subline={['Brand', 'Signage', 'Joinery', 'Ready for daily use']}
          primaryCta={fitoutsCta}
          secondaryCta={{ href: '/case-studies', label: 'See relevant work' }}
        />
        <StickyProcessShowcase
          steps={fitoutShowcaseSteps}
          showPortfolio={false}
          ariaLabel="Interior fitout proof and process"
        />
        <MinimalScopeSection
          title="What EGS builds."
          copy="Branded spaces where visibility and use matter together."
          eyebrow="Fitout scope"
          items={scopeItems}
        />
        <MinimalProcessSection
          title="From space to handover."
          copy="A practical path for rooms that need to work."
          steps={processSteps}
        />
        <MinimalFAQSection
          title="Questions fitout teams ask first."
          copy="Short answers before drawings and site photos move."
          faqs={faqs}
        />
        <MinimalCTASection
          title="Send the room, deadline, and what has to work."
          copy="EGS will look at brand, signage, joinery, and handover together."
          cta={fitoutsCta}
        />
        <Footer />
      </div>
    </>
  );
}
