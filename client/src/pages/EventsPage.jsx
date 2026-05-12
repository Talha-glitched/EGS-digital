import pageStyles from '../styles/pages/content-first.css?raw';
import StickyProcessShowcase from '../components/StickyProcessShowcase.jsx';
import { Navbar } from '../components/Navbar.jsx';
import {
  MinimalCTASection,
  MinimalFAQSection,
<<<<<<< HEAD
=======
  MinimalProcessSection,
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
  MinimalScopeSection,
  MinimalServiceHero,
} from '../components/services/MinimalServiceSections.jsx';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Footer } from './SiteChrome.jsx';
import { images } from './siteData.js';
<<<<<<< HEAD
import graduationCeremonialStaging from '../assets/Graduation/SHJ1.jpg';
import graduationVipGuestStudent from '../assets/Graduation/SHJ3.jpg';
import graduationOnsiteOperations from '../assets/Graduation/operation.jpeg';

const eventsStickyShowcaseSteps = [
  {
    label: 'Ceremonial Staging & Branding',
    image: graduationCeremonialStaging,
    alt: 'Ceremony stage, branding, and public-facing staging by EGS',
  },
  {
    label: 'AV & Technical Production',
    image: images.graduationProfile,
    alt: 'Graduation ceremony AV and technical production environment',
  },
  {
    label: "VIP's, Guest & Student Experience",
    image: graduationVipGuestStudent,
    alt: 'VIP, guest, and student experience at graduation-scale ceremonies',
  },
  {
    label: 'On-site Event Operations',
    image: graduationOnsiteOperations,
    alt: 'On-site ceremony operations and stage readiness before doors open',
=======

const ceremonyProofSteps = [
  {
    label: '7 Grand ceremonies',
    image: images.hctProfile,
    alt: 'HCT graduation ceremony audience and stage production by EGS',
  },
  {
    label: '4,500+ Graduates',
    image: images.graduationProfile,
    alt: 'Graduation ceremony stage and audience production environment',
  },
  {
    label: '13,500+ Guests',
    image: images.graduationWide,
    alt: 'Large graduation ceremony venue and guest seating',
  },
  {
    label: '10h Stage change',
    image: images.graduationStage,
    alt: 'Graduation stage adaptation completed before ceremony start',
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
  },
];

const scopeItems = [
<<<<<<< HEAD
  [
    'Design',
    'Ceremony renders and room plans that lock stage setup, seating arrangements, venue branding, LED screen backdrops, and audio-video support before fabrication commits.',
  ],
  [
    'Production',
    'Materials, joinery, and branded builds packaged for stage setup, screen structures, and AV runs, so install crews are not improvising at the venue.',
  ],
  [
    'Installation',
    'On-site stage setup, venue branding, LED screen backdrops, lighting and sound system setup, and audio-video support lined up, tuned, and checked before rehearsal and arrivals.',
  ],
  [
    'Removal',
    'Controlled strike after close: pack-down, asset recovery, and handover so the space returns to use on schedule.',
  ],
  [
    'Management',
    'Student registration support, crew sequencing, seating arrangements held against the plan through guest flow, and timings when thousands move through the building.',
  ],
];

const faqs = [
  [
    'What does EGS handle?',
    'The full ceremony production chain: design, production, installation, removal, and on-site management, including student registration support, stage setup, seating arrangements, venue branding, LED screen backdrops, lighting and sound system setup, and audio-video support.',
  ],
  [
    'What should we send before EGS can respond with a plan?',
    'Date, venue, audience and graduate counts, ceremony format, stage and branding intent, VIP and protocol notes, registration and seating logic, rehearsal window, and any non-negotiable timings.',
  ],
  [
    'Can EGS handle urgent changes close to showtime?',
    'Yes, when it is physically possible. HCT Fujairah is the reference: a 5 to 6 metre stage extension sourced and finished before the ceremony after a late requirement change.',
  ],
  [
    'Is EGS only for graduations?',
    'Graduations are the clearest proof at scale, but the same discipline applies to launches, convocations, and other institutional ceremonies where the room has to be correct before people arrive.',
  ],
  [
    'How do you protect ceremony start time and on-stage dignity?',
    'Work is sequenced from fixed showtime backwards: stage, AV, and room readiness are commissioned and checked before rehearsal and doors, so leadership and families are not waiting on a visible scramble.',
  ],
  [
    'How should we think about VIPs, protocol, and leadership in the room?',
    'Sightlines, movement, holding rooms, and stage order are planned with protocol in mind. The production has to support confidence for VIPs and leadership, not fight the ceremony script.',
  ],
  [
    'How do AV, lighting, sound, and LED backdrops stay coordinated on the day?',
    'One production path ties screens, audio, lighting, and branded surfaces to the same cue plan. Fewer disconnected teams means fewer gaps at the moment there is no second take.',
  ],
  [
    'How do registration, seating arrangements, and guest flow stay aligned with the stage?',
    'Registration data, seating plans, and stage movement are treated as one flow problem, not three suppliers guessing at each other while guests arrive.',
  ],
  [
    'Will the environment read well for photography and video?',
    'Stage, backdrop, and lighting choices are judged on how they read in a crowded room and on camera. Cheap-looking production shows in every graduate photo.',
  ],
  [
    'Do we work with one accountable team or many disconnected crews?',
    'EGS carries the physical ceremony production scope under one roof so coordination is not split across generic suppliers who treat graduation like a template gig.',
  ],
  [
    'Can EGS support annual ceremony seasons without reinventing the brief every year?',
    'Yes. Repeat seasons benefit from documented room reads, asset libraries, and post-event notes. Less re-explaining, more refinement.',
  ],
  [
    'What about rehearsal changes, cues, and last-minute script tweaks?',
    'Rehearsal windows are built into the plan. When cues or order shift, the crew path is updated once and pushed through stage, AV, and registration touchpoints so the floor stays coherent.',
  ],
  [
    'What happens after the ceremony: strike and venue handback?',
    'Removal is part of scope: controlled pack-down, asset recovery, and handover so the venue returns to use on schedule without loose ends in the room.',
  ],
=======
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
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
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
<<<<<<< HEAD
=======
  '.minimal-service-page .step',
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
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
        <StickyProcessShowcase
<<<<<<< HEAD
          steps={eventsStickyShowcaseSteps}
          showPortfolio={false}
          wrapLabels
          ariaLabel="Ceremony and event production capabilities"
        />
        <MinimalScopeSection
          title="What EGS handles."
          copy="Graduation ceremonies need the whole chain under one roof, from design through strike, with student registration support, stage setup, seating arrangements, venue branding, LED screen backdrops, lighting and sound system setup, and audio-video support ready before families and leadership walk in."
          items={scopeItems}
        />
=======
          steps={ceremonyProofSteps}
          showPortfolio={false}
          ariaLabel="Graduation ceremony proof at scale"
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
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
        <MinimalCTASection
          title="Send the date, venue, and what has to be ready."
          copy="EGS will read the room, the deadline, and what needs to move first."
          cta={{ href: '/contact', label: 'Brief us on your ceremony' }}
        />
<<<<<<< HEAD
         <MinimalFAQSection
          title="Questions ceremony teams ask first."
          copy="Grounded answers for university and institutional leads: dignity, timing, VIPs, AV, guest flow, and repeat seasons."
          faqs={faqs}
          accordion
        />
=======
>>>>>>> 67f76e82f1c21460e724886377eab7e0a3251f53
        <Footer />
      </div>
    </>
  );
}
