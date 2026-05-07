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
  { metric: '7', label: 'Grand ceremonies in 2025', image: images.hctProfile, href: '/case-studies#hct-graduation-program' },
  { metric: '4,500', label: 'Graduates', image: images.graduationProfile, href: '/case-studies#hct-graduation-program' },
  { metric: '10h', label: 'Fujairah stage change', image: images.graduationWide, href: '/case-studies#hct-fujairah-stage-extension' },
];

const scopeItems = [
  ['Stage environments', 'Stage, screen, branding, and public-facing ceremony surfaces.'],
  ['Guest flow', 'Movement, arrival, sightlines, and room readiness.'],
  ['Event branding', 'Backdrops, graphics, photo areas, and institutional details.'],
  ['On-site changes', 'Physical adaptations before doors open.'],
];

const processSteps = [
  ['Brief', 'Date, venue, audience.'],
  ['Room', 'Access, stage, flow.'],
  ['Scope', 'Branding and build needs.'],
  ['Produce', 'Materials and crew.'],
  ['Install', 'Site work and changes.'],
  ['Doors', 'Ready before arrivals.'],
];

const faqs = [
  ['What does EGS handle?', 'The physical ceremony environment: stage, branding, room readiness, adaptation, and handover.'],
  ['What should we send?', 'Date, venue, audience size, ceremony type, stage needs, branding, and VIP considerations.'],
  ['Can EGS handle urgent event changes?', 'Yes, when physically possible. HCT Fujairah is the 10-hour proof story.'],
  ['Is this only for graduations?', 'Graduations are the strongest proof; the same discipline applies to launches and institutional events.'],
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

export default function EventsPage() {
  usePageLifecycle('Graduation Ceremony Setup UAE | Event Production Company Dubai | EGS', {
    revealSelector,
  });

  return (
    <>
      <style>{pageStyles}</style>
      <div className="content-page minimal-service-page events-minimal-page" style={{ '--accent': 'var(--terracotta)' }}>
        <Navbar active="events" cta="Brief us on your ceremony" overlay />
        <MinimalServiceHero
          image={images.hctProfile}
          imageAlt="HCT graduation ceremony audience and stage production"
          kicker="Graduation ceremony setup UAE"
          title="Ceremonies built for showtime."
          subline="Stage. Branding. Guest flow. Ready before doors."
          primaryCta={{ href: '/contact', label: 'Brief us on your ceremony' }}
          secondaryCta={{ href: '/case-studies#hct-graduation-program', label: 'Read HCT proof' }}
        />
        <MinimalPhotoProofSection
          title="Proof at ceremony scale."
          copy="Graduates, guests, fixed showtimes."
          items={proofItems}
        />
        <MinimalScopeSection
          title="What EGS handles."
          copy="The physical environment behind the public moment."
          eyebrow="Ceremony scope"
          items={scopeItems}
        />
        <MinimalProcessSection
          title="Work backwards from doors."
          copy="The room has to be ready before people arrive."
          steps={processSteps}
        />
        <MinimalFAQSection
          title="Questions ceremony teams ask first."
          copy="Short answers before the brief moves."
          faqs={faqs}
        />
        <MinimalCTASection
          title="Send the date, venue, and what has to be ready."
          copy="EGS will read the room, the deadline, and what needs to move first."
          cta={{ href: '/contact', label: 'Brief us on your ceremony' }}
        />
        <Footer />
      </div>
    </>
  );
}
