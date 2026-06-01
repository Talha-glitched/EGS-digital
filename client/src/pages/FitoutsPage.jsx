import pageStyles from '../styles/pages/content-first.css?raw';
import minimalServiceResponsiveStyles from '../styles/pages/minimal-service-responsive.css?raw';
import stickyShowcaseResponsiveStyles from '../styles/pages/sticky-showcase-responsive.css?raw';
import fitoutsStyles from '../styles/pages/fitouts.css?raw';
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
    label: 'Showrooms &\nReception Areas',
    image: images.fitoutReceptionArea,
    alt: 'Branded reception area with custom counter and wall signage',
  },
  {
    label: 'Office Branding\nAnd Wayfinding',
    image: images.fitoutOfficeGraphics,
    alt: 'Office branding and wayfinding graphics in a working interior',
  },
  {
    label: 'Interior Graphics\nAnd Signage',
    image: images.fitoutInteriorSignage,
    alt: 'Interior signage and brand graphics in a commercial space',
  },
  {
    label: 'Kiosk Fitouts\nAnd Counters',
    image: images.fitoutKiosk,
    alt: 'Branded mall kiosk fitout with counters and display surfaces',
  },
];

const scopeItems = [
  [
    'Showrooms and reception areas',
    'Branded front-of-house spaces where visitors need to understand the company quickly, move clearly, and leave with the right impression.',
  ],
  [
    'Office branding and wayfinding',
    'Reception walls, directional signs, meeting-room graphics, privacy films, and branded surfaces planned as part of the working environment.',
  ],
  [
    'Joinery, counters and fixtures',
    'Counters, shelving, feature walls, display fixtures, and finish details built for both presentation and everyday wear.',
  ],
  [
    'Large-format interior graphics',
    'Wall graphics, glazing, printed panels, feature surfaces, and environmental branding produced when print has to fit the room, not just the file.',
  ],
  [
    'Permanent retail kiosks',
    'Mall kiosks and compact retail units fit here when they are fixed branded spaces with joinery, signage, durability, and handover requirements.',
  ],
  [
    'Handover and snag closure',
    'Access coordination, site adjustments, cleaning, practical fixes, and walkthrough notes so the space is ready for staff, visitors, and daily use.',
  ],
];

const processSteps = [
  ['Site Read', 'Photos, drawings, measurements, access, wall conditions, and handover target are checked before scope is fixed.'],
  ['Use Case', 'Visitor flow, staff movement, storage, durability, cleaning, and maintenance needs shape the design decisions.'],
  ['Scope Lock', 'Signage, joinery, graphics, finishes, fixtures, approvals, and responsibilities are separated clearly before production.'],
  ['Production', 'Counters, branded surfaces, printed graphics, signage, fixtures, and finish details are produced for fit and finish.'],
  ['Install & Snag', 'Site work, adjustments, signage placement, cleaning, and snag closure are coordinated around the operating space.'],
  ['Handover', 'The space is walked with the client, practical fixes are closed, and the room is ready for daily use.'],
];

const faqs = [
  [
    'Is EGS right for a full fitout or a branded upgrade?',
    'EGS is strongest where the space needs physical brand execution: reception areas, showrooms, office branding, interior signage, counters, fixtures, graphics, and compact retail units. For pure interior design without production or branding, EGS is not the best fit.',
  ],
  [
    'Should mall kiosks sit under fitouts or retail rollouts?',
    'A fixed or semi-permanent mall kiosk belongs here because it behaves like a small fitout: joinery, signage, durability, approvals, and handover. Temporary campaign installs and BTL mall activations belong on the retail rollouts side.',
  ],
  [
    'Does large-format printing belong in a fitout brief?',
    'Yes, when the print affects the room: wall graphics, glazing, feature panels, wayfinding, privacy film, or branded surfaces. Standalone print orders are different from interior fitout branding.',
  ],
  [
    'What does EGS need before estimating?',
    'Send photos or drawings, location, measurements, handover target, brand files, signage needs, fixture requirements, access restrictions, and any problem areas the space has to solve.',
  ],
  [
    'How do you stop the space looking good only on handover day?',
    'EGS checks the daily-use details early: staff flow, visitor movement, storage, cleaning, edge wear, sign visibility, fixture strength, and what has to be easy to maintain.',
  ],
  [
    'Can EGS coordinate signage, graphics, and joinery together?',
    'Yes. That is the advantage. Brand graphics, signs, counters, display elements, and finish details are planned together so they feel built into the space instead of patched on late.',
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
      <style>{minimalServiceResponsiveStyles}</style>
      <style>{stickyShowcaseResponsiveStyles}</style>
      <style>{fitoutsStyles}</style>
      <div className="content-page minimal-service-page fitouts-minimal-page" style={{ '--accent': 'var(--olive)' }}>
        <Navbar active="fitouts" cta={fitoutsCta.label} ctaInquiryType={fitoutsCta.inquiryType} overlay />
        <MinimalServiceHero
          image={images.fitoutVelocityInterior}
          imageAlt="Velocity trampoline park interior branding and large format graphics"
          kicker="Interior fitout branding Dubai"
          title="Branded interiors built for daily use."
          subline={['Showroom flow checked', 'Signage integrated early', 'Graphics fitted to site', 'Handover snags closed']}
          primaryCta={fitoutsCta}
          secondaryCta={{ href: '/case-studies', label: 'See relevant work' }}
        />
        <StickyProcessShowcase
          steps={fitoutShowcaseSteps}
          showPortfolio={false}
          ariaLabel="Interior fitout proof and process"
          wrapLabels
        />
        <MinimalScopeSection
          title="What EGS builds."
          copy="For fitouts, EGS focuses on branded spaces where signage, graphics, joinery, and handover quality have to work together."
          eyebrow="Fitout scope"
          items={scopeItems}
        />
        <MinimalProcessSection
          title="From space to handover."
          copy="A practical path for interiors that need to look right and survive daily use."
          steps={processSteps}
        />
        <MinimalFAQSection
          title="Questions fitout teams ask first."
          copy="Practical answers for showroom, office, property, and branded-space teams."
          faqs={faqs}
          accordion
        />
        <MinimalCTASection
          title="Send the room, deadline, and what has to work."
          copy="EGS will look at brand, signage, graphics, joinery, access, and handover together."
          cta={fitoutsCta}
        />
        <Footer />
      </div>
    </>
  );
}
