// Complete data store for EGS 6 Exhibition Offers
// Sourced directly from 'Final 6 Offers.docx'

export const OFFERS_STAGES = [
  { id: 'all', label: 'All 6 Offers', count: 6 },
  { id: 'before', label: 'Before Show', count: 4, desc: 'Planning, auditing, budgeting & pre-build validation' },
  { id: 'during', label: 'During Show', count: 4, desc: 'Live floor engagement, visitor analytics & urgent rescue' },
  { id: 'after', label: 'After Show', count: 3, desc: 'Data reporting, dismantling & post-show intelligence' },
];

export const OFFERS_DATA = [
  {
    id: 'offer-01',
    number: '01',
    slug: 'design-buildability-audit',
    stageTag: 'BEFORE',
    stageCategory: ['before'],
    title: 'Exhibition Stand Design & Buildability Audit',
    shortHeadline: 'Before You Build It, Make Sure It Will Actually Work.',
    longHeadline: 'Before You Build It, Let Us Make Sure It Works.',
    shortProblem: 'Already have a stand design? Let our exhibition production team review it before you commit to fabrication.',
    shortSummary: 'We check the design for buildability, materials, cost, visitor flow, branding visibility, AV integration, storage and potential execution risks, giving you an experienced second opinion while changes are still easy to make.',
    bestFor: 'Exhibitors and agencies with an existing stand design (from internal designers, international HQ, or another contractor).',
    investment: 'AED 500 – AED 1,000',
    investmentNote: 'If you subsequently award stand production to us, the audit fee is adjusted against the project.',
    primaryCtaLabel: 'Send Us Your Stand Design',
    inquiryType: 'exhibitions',
    accentColor: 'var(--ochre)',
    tagline: 'A Small Review Before a Large Commitment.',
    
    leadIn: [
      'A beautiful 3D exhibition stand is only the beginning.',
      'Once production starts, every design decision affects fabrication, materials, finishing, budget, installation, AV, storage, visitor circulation and ultimately how the completed stand looks in reality.',
      'A problem identified on a drawing can often be corrected easily.',
      'The same problem discovered during installation can become expensive.',
    ],

    auditChecklist: [
      { category: 'Buildability & Practicality', desc: 'Structural feasibility, weight distribution, and ceiling hang points' },
      { category: 'Materials & Finishes', desc: 'Durability under trade show footfall and lighting reflections' },
      { category: 'Cost-Saving Opportunities', desc: 'Hidden fabrication inefficiencies that inflate quotes' },
      { category: 'Visitor Circulation & Flow', desc: 'Entry bottleneck prevention and salesperson positioning' },
      { category: 'Branding Visibility', desc: 'Sightlines from main aisle traffic and lighting wash' },
      { category: 'Storage Requirements', desc: 'Staff lockers, brochures, spare giveaways, and AV equipment access' },
      { category: 'AV & Technology Integration', desc: 'Cable routing, power drops, heat ventilation, and screen angles' },
      { category: 'Production Complexity', desc: 'Off-site CNC timing vs. on-site joinery constraints' },
      { category: 'Installation Considerations', desc: '48-hour build window restrictions at DWTC / ADNEC' },
      { category: 'Potential Execution Risks', desc: 'Permits, fire-rating approvals, and venue compliance' },
    ],

    deliverable: 'A concise review highlighting our observations, concerns, and practical recommendations. The objective is not to redesign your stand—it is to give you an experienced production perspective before you make a major financial commitment.',

    idealIf: [
      'Your creative agency has already designed your 3D stand concept',
      'Another contractor has supplied a quotation and technical drawings',
      'Your international head office has provided global guidelines',
      'You want an independent, production-tested second opinion',
      'You want to compare supplier proposals more intelligently',
      'You want to eliminate expensive on-site rework before fabrication starts',
    ],

    stages: {
      before: [
        'Review CAD drawings, 3D renders, and technical specifications',
        'Identify build risks, material bottlenecks, and venue non-compliance',
        'Deliver a written actionable audit with cost-saving alternatives',
      ],
      during: [
        'Pre-validated design ensures zero installation delays during buildup',
      ],
      after: [
        'Audit fee credited 100% against production if built by EGS',
      ],
    },
  },

  {
    id: 'offer-02',
    number: '02',
    slug: 'interactive-experience-stand',
    stageTag: 'BEFORE + DURING + AFTER',
    stageCategory: ['before', 'during', 'after'],
    title: 'Transform Your Stand into an Interactive Experience',
    shortHeadline: "Don't Just Give Visitors Something to Look At. Give Them Something to Do.",
    longHeadline: "Don't Just Ask Visitors to Look. Give Them a Reason to Stop.",
    shortProblem: 'Many exhibition stands look impressive, but there is very little for the visitor to actually do. Visitors walk in, collect a brochure, take a giveaway, and leave.',
    shortSummary: 'Turn a passive exhibition stand into an engaging brand experience with compact, customizable games, touchscreen quizzes, reaction challenges, and smarter giveaways that earn visitor attention.',
    bestFor: 'Brands looking for measurable footfall engagement (technology, healthcare, industrial, consumer, and B2B).',
    investment: 'Typically from AED 3,500 to AED 7,500',
    investmentNote: 'Varies based on game customization, hardware setup, and lead capture integration.',
    primaryCtaLabel: 'Make My Stand Interactive',
    inquiryType: 'exhibitions',
    accentColor: 'var(--terracotta)',
    tagline: 'Every Giveaway Should Buy You Engagement.',
    framework: 'ATTRACT → ENGAGE → EDUCATE → REWARD',

    leadIn: [
      'Many exhibition stands look impressive, but visitors walk past because there is nothing active happening.',
      'We transform an existing or upcoming stand by introducing compact, digital and physical interactive experiences customized around your brand, product, campaign, or exhibition objective.',
      'Instead of passive footfall, you create active participants who remember your value proposition.',
    ],

    experienceTypes: [
      { name: 'Touchscreen Quizzes', desc: 'Brand and product trivia with instant scoring and leaderboards' },
      { name: 'Reaction Games', desc: 'Fast-paced light/tap challenges that draw a crowd around your perimeter' },
      { name: 'Digital Spin Wheels', desc: 'Controlled prize giveaways linked directly to completed registrations' },
      { name: 'Memory & Match Challenges', desc: 'Pairing product benefits with customer pain points in 45 seconds' },
      { name: '60-Second Product Discovery', desc: 'Guided interactive branch finder matching visitors to the right solution' },
      { name: 'Customized Brand Competitions', desc: 'Daily high-score challenges with verified business contact capture' },
    ],

    smartGiveawayConcept: {
      oldWay: 'Walk Past → Take Giveaway → Leave (Zero Memory, Zero ROI)',
      newWay: 'Participate → Learn → Register → Receive Giveaway (High Engagement, Usable Lead)',
    },

    stages: {
      before: [
        'Identify what you want visitors to learn and which products to highlight',
        'Profile the target visitor personas and determine floor space constraints',
        'Custom-develop the interactive UI, brand assets, and registration gates',
        'Configure prize allocation rules and lead capture fields',
      ],
      during: [
        'Draw high-volume perimeter footfall and create organic conversation starters',
        'Educate visitors through gamified interactions without salesperson fatigue',
        'Give booth staff natural conversation openings based on game results',
        'Distribute branded giveaways conditionally based on completed interactions',
      ],
      after: [
        'Comprehensive report on total participants, completion rates, and average session times',
        'Breakdown of product interest based on interactive discovery choices',
        'Clean, structured contact data exported for immediate CRM follow-up',
      ],
    },
  },

  {
    id: 'offer-03',
    number: '03',
    slug: 'visitor-capture-analytics',
    stageTag: 'BEFORE + DURING + AFTER',
    stageCategory: ['before', 'during', 'after'],
    title: 'Smart Visitor Capture & Exhibition Analytics',
    shortHeadline: 'You Paid for the Stand. What Did the Exhibition Actually Generate?',
    longHeadline: 'You Paid for the Stand. You Paid for the Space. What Did the Exhibition Actually Generate?',
    shortProblem: "Don't finish your exhibition with a pile of business cards and a fuzzy feeling that the show was 'good.'",
    shortSummary: 'Capture visitor information, interests, and engagement in a structured digital workflow, then turn it into real intelligence your sales and management teams can actually act on.',
    bestFor: 'Exhibitors who need measurable exhibition ROI, verified lead data, and actionable management reporting.',
    investment: 'Customized Setup / Tailored Package',
    investmentNote: 'Includes software configuration, hardware tablets/scanners, and post-show analytics report.',
    primaryCtaLabel: 'Discuss Visitor Analytics',
    inquiryType: 'exhibitions',
    accentColor: 'var(--ink-blue)',
    tagline: 'Don’t Leave With a Pile of Business Cards. Leave With Visitor Intelligence.',
    framework: 'CAPTURE → CATEGORISE → MEASURE → REPORT',

    leadIn: [
      'At the end of many exhibitions, companies have: photographs, brochures distributed, a box of business cards, and a general feeling that the show went well.',
      'Yet management still cannot answer: How many qualified leads visited? Which day was busiest? Which products had traction? What was our cost per qualified interaction?',
      'We structure visitor capture and live reporting so your exhibition generates measurable business intelligence, not just footfall impressions.',
    ],

    dashboardMetrics: [
      { label: 'Total Registered Visitors', desc: 'Real-time badge and digital form registrations across all show days' },
      { label: 'Peak Footfall Periods', desc: 'Hourly visitor density heatmaps to optimize booth staffing rosters' },
      { label: 'Product Interest Breakdown', desc: 'Exact product lines and solutions visitors flagged during discussions' },
      { label: 'Qualified Lead Tiers', desc: 'Instant classification (Hot / Warm / Informational) assigned on the spot' },
      { label: 'Activities & Giveaways', desc: 'Complete audit trail of distributed collateral and demo completions' },
      { label: 'Extended Contact Matching', desc: 'Matched list of potential contacts within your industry sphere' },
    ],

    stages: {
      before: [
        'Define key data points to capture (name, company, role, urgency, product interest, budget tier)',
        'Configure seamless intake tools (tablet kiosks, QR touchpoints, fast business card scanning)',
        'Train booth team on 10-second rapid visitor categorization workflows',
      ],
      during: [
        'Live data ingestion on booth tablets with offline-sync reliability',
        'Private management dashboard accessible on mobile/tablet to monitor booth throughput',
        'Optional live leaderboards or interactive stats displayed on stand screens',
      ],
      after: [
        'Delivery of clean, deduplicated, categorized contact lists formatted for your CRM',
        'Executive exhibition summary report showing peak hours, popular products, and lead breakdown',
        'Ready-to-use follow-up dossiers for your sales team within 48 hours of show close',
      ],
    },
  },

  {
    id: 'offer-04',
    number: '04',
    slug: 'bring-stand-back-to-budget',
    stageTag: 'BEFORE',
    stageCategory: ['before'],
    title: 'Bring My Stand Back to Budget',
    shortHeadline: 'Love the Design. Not the Price?',
    longHeadline: 'Approved Design: AED 180,000. Available Budget: AED 140,000. Where Do We Find AED 40,000 Without Destroying It?',
    shortProblem: 'Your exhibition stand has been designed. Everyone likes it. Management approves it. Then the supplier quotations arrive over budget.',
    shortSummary: 'Our production team reviews your approved 3D design, existing quotation, and target budget to identify practical savings opportunities while vigorously protecting the high-impact visual features visitors actually notice.',
    bestFor: 'Exhibitors with an approved stand design that has exceeded available marketing or procurement budget.',
    investment: 'Value-Engineered Production Scope',
    investmentNote: 'No upfront redesign fee required when submitting for budget alignment review.',
    primaryCtaLabel: 'Send Us Your Design & Budget',
    inquiryType: 'exhibitions',
    accentColor: 'var(--ochre)',
    tagline: 'Value Engineering Without Value Destruction.',

    leadIn: [
      'Now the question isn’t: Do we like the design?',
      'The question is: Where do we find AED 40,000 without destroying the look and feel?',
      'This is where deep, practical exhibition production knowledge becomes invaluable.',
      'The objective is not simply to make the stand cheaper—it is to protect the areas visitors will notice while reducing expenditure in areas adding relatively little perceived value.',
    ],

    threeThingsRequired: [
      '1. Your approved 3D stand design (renders & floorplan)',
      '2. Your existing supplier quotation (itemized if available)',
      '3. Your target budget',
    ],

    engineeringLevers: [
      { lever: 'Structural Simplification', desc: 'Re-engineering internal hidden steel/wood frameworks for faster CNC pre-assembly' },
      { lever: 'Material Substitution', desc: 'Specifying premium laminates and acrylics that mirror high-cost solid finishes' },
      { lever: 'Fabrication to Graphic Conversion', desc: 'Turning costly multi-layer millwork features into high-definition backlit fabric graphic treatments' },
      { lever: 'Height & Rigging Optimization', desc: 'Pruning non-essential elevated bulkheads that incur heavy venue rigging and structural permit surcharges' },
      { lever: 'Rental vs Purchase AV', desc: 'Renting certified LED video walls and touchscreens instead of buying dedicated hardware' },
      { lever: 'Specification Fine-Tuning', desc: 'Eliminating redundant custom joinery in back-of-house storage and pantry areas' },
      { lever: 'Alternative Production Methods', desc: 'Switching to modular internal walling with seamless tension-fabric skins' },
      { lever: 'Non-Compromise Safeguard', desc: 'Explicitly safeguarding high-visibility reception counters, lighting, and main branding' },
    ],

    stages: {
      before: [
        'Submit your approved design, existing quote, and target budget',
        'EGS production engineers review line-by-line fabrication costs',
        'Receive an itemized Value Engineering proposal matching your budget target',
      ],
      during: [
        'Built exactly as agreed with zero visual compromise or material downgrade on site',
      ],
      after: [
        'Full post-show review and documentation of re-usable elements for future exhibitions',
      ],
    },
  },

  {
    id: 'offer-05',
    number: '05',
    slug: 'local-uae-exhibition-partner',
    stageTag: 'BEFORE + DURING + AFTER',
    stageCategory: ['before', 'during', 'after'],
    title: 'Your Local Exhibition Partner in the UAE',
    shortHeadline: 'Designed Anywhere. Delivered Properly in the UAE.',
    longHeadline: 'You Manage Your Brand. We Take Full Responsibility for What Happens Locally in Dubai & Abu Dhabi.',
    shortProblem: 'Organizing an exhibition in Dubai (DWTC, Expo City) or Abu Dhabi (ADNEC) from overseas can become complicated very quickly without local crew and venue relationships.',
    shortSummary: 'We act as your on-the-ground UAE production arm or white-label partner. From buildability review and venue approvals through fabrication, pre-opening snagging, on-site troubleshooting, and dismantling.',
    bestFor: 'International exhibitors, overseas marketing teams, and global exhibition & creative agencies.',
    investment: 'Direct UAE Production Pricing (Transparent & In-House)',
    investmentNote: 'Special white-label agreements available for international exhibition agencies.',
    primaryCtaLabel: 'Discuss Your UAE Exhibition',
    inquiryType: 'exhibitions',
    accentColor: 'var(--olive)',
    tagline: 'You Keep the Client. We Handle the UAE Execution.',

    leadIn: [
      'Organizing an exhibition in the UAE from London, Paris, Frankfurt, New York, Riyadh, or Singapore is stressful.',
      'You already have your brand, marketing team, agency, and approved design. What you need is a reliable, battle-tested team on the ground in the UAE.',
      'For International Agencies: Send us your design specifications. We manufacture, install, and support your project under your brand while you retain 100% of your client relationship.',
    ],

    capabilities: [
      { area: 'Local Venue Navigation', desc: 'Direct familiarity with DWTC, ADNEC, Dubai Exhibition Centre (DEC), and Expo City Dubai rules and permits' },
      { area: 'In-House Fabrication', desc: 'Custom joinery, metalwork, high-format printing, acrylic fabrication, and paint finishing' },
      { area: 'AV & Interactive Tech', desc: 'P2.6 LED video walls, sound systems, ambient lighting, touchscreen kiosks, and electrical load balancing' },
      { area: 'Pre-Arrival Assurance', desc: 'Complete photo and video walkthrough inspections sent before your international flight lands' },
      { area: 'Show-Day Standby', desc: 'Local technician on standby for urgent adjustments, emergency printing, and IT troubleshooting' },
      { area: 'Post-Show Teardown', desc: 'Dismantling, secure packing, storage, or international return freight coordination' },
    ],

    stages: {
      before: [
        'Design & buildability review against UAE venue regulations and fire safety standards',
        'Submission of engineering calculations, electrical drawings, and venue permits',
        'Production costing, material sampling, and milestone scheduling',
        'Pre-Arrival Quality Check: Snagging, AV testing, lighting checks, graphics inspection, and high-res video updates sent before your team boards the plane',
      ],
      during: [
        'On-site production manager present during entire setup and show opening',
        'Rapid standby for AV/IT troubleshooting, emergency reprints, extra furniture, or organizer coordination',
        'Minor repairs and daily morning stand check before public exhibition doors open',
      ],
      after: [
        'Orderly stand dismantling and environmentally compliant material recycling/removal',
        'Secure warehousing storage or packaging for onward international shipment',
        'Full project closeout report and debrief document',
      ],
    },
  },

  {
    id: 'offer-06',
    number: '06',
    slug: 'exhibition-rescue-service',
    stageTag: 'BEFORE + DURING',
    stageCategory: ['before', 'during'],
    title: 'Forgot Something? Exhibition Rescue Service',
    shortHeadline: 'Forgot Something? Call One Number.',
    longHeadline: 'Your Exhibition Emergency Contact in Dubai & Abu Dhabi. One WhatsApp Number. One Local Team.',
    shortProblem: 'The exhibition opens tomorrow—or is already running. The brochures ran out. The QR code changed. Someone forgot business cards. Management wants another screen.',
    shortSummary: 'Our Exhibition Rescue Service gives you one direct local point of contact for unexpected and urgent exhibition requirements. Instead of searching for 5 different suppliers under panic, dispatch to our rapid-response team.',
    bestFor: 'Exhibitors, overseas agencies, and stand managers facing unexpected last-minute shortages or site emergencies.',
    investment: 'Fast-Track Emergency Dispatch',
    investmentNote: 'Realistic pricing communicated upfront based on venue access and fabrication urgency.',
    primaryCtaLabel: 'Save Our Exhibition Rescue Number',
    inquiryType: 'exhibitions',
    accentColor: 'var(--ochre)',
    tagline: 'One WhatsApp Number. One Local Team. One Less Problem to Worry About.',
    whatsappNumber: '+971524587992',
    whatsappLink: 'https://wa.me/971524587992?text=URGENT%20EXHIBITION%20RESCUE%3A%20I%20have%20an%20urgent%20requirement%20for%20our%20stand%20at%20',

    leadIn: [
      'Even the best-planned exhibitions develop unexpected requirements 24 hours before opening.',
      'The brochures run out. Someone forgot the business cards. The QR code changes. Management suddenly wants another screen. A product needs a display stand. Additional furniture is required. A graphic needs updating.',
      'At that point, the biggest problem isn’t knowing what you need. It’s knowing who can arrange it quickly in the UAE.',
      'You are buying speed, local knowledge, convenience, reliability, accountability, and the confidence that when something goes wrong, you already know who to call.',
    ],

    rescueCategories: [
      { item: 'Urgent Printing', desc: 'Brochures, flyers, business cards, stickers, product sheets, and lanyard cards' },
      { item: 'Last-Minute Graphics', desc: 'Replacement vinyls, foam-board prints, fabric banners, and updated QR code overlays' },
      { item: 'Screens & AV Displays', desc: '43" to 85" 4K displays, floor stands, HDMI switchers, and tablet presentation mounts' },
      { item: 'Furniture & Seating', desc: 'Barstools, meeting chairs, round tables, literature racks, and locking display cabinets' },
      { item: 'Display Stands & Acrylics', desc: 'Podiums, brochure holders, customized acrylic plinths, and lighting spotlights' },
      { item: 'Urgent Sourcing & Hardware', desc: 'Power extensions, HDMI adapters, cable covers, double-sided tapes, and emergency joinery fixes' },
    ],

    rescueSteps: [
      { step: '1. Tell us what you need', desc: 'Send photographs, measurements, artwork, or requirements via WhatsApp.' },
      { step: '2. We find the fastest practical solution', desc: 'We check immediate stock, in-house print queues, or rental availability.' },
      { step: '3. You approve cost & timing', desc: 'We give you a transparent, realistic delivery timeline and fixed price.' },
      { step: '4. We arrange it', desc: 'In-house production, fast-turnaround printing, or sourcing is executed immediately.' },
      { step: '5. We deliver to your stand', desc: 'Subject to venue security passes, delivered directly to your booth floor.' },
    ],

    stages: {
      before: [
        'Immediate same-day or overnight resolution during exhibition buildup days',
        'Pre-opening emergency prints, graphic fixes, and additional AV staging',
      ],
      during: [
        'Mid-show inventory restocks (brochures, business cards, giveaways)',
        'Rapid hardware replacements and on-site snagging adjustments',
      ],
      after: [
        'Post-show collection of rented hardware and handover',
      ],
    },
  },
];

export const DIAGNOSTIC_QUESTIONS = [
  {
    id: 'stage',
    title: '1. What stage is your exhibition project currently in?',
    options: [
      { value: 'designing', label: 'We have a design concept, but haven’t started building yet', recommendedOffer: 'offer-01' },
      { value: 'overbudget', label: 'Our design is approved, but the supplier quotes are over budget', recommendedOffer: 'offer-04' },
      { value: 'engagement', label: 'Our stand is planned, but we need games, quizzes & visitor engagement', recommendedOffer: 'offer-02' },
      { value: 'international', label: 'We are exhibiting from overseas and need a local UAE production partner', recommendedOffer: 'offer-05' },
      { value: 'analytics', label: 'We want measurable visitor data, lead capture, and management ROI', recommendedOffer: 'offer-03' },
      { value: 'urgent', label: 'The show is starting soon (or live) and we need urgent items right now', recommendedOffer: 'offer-06' },
    ],
  },
  {
    id: 'venue',
    title: '2. Which UAE venue or city is your exhibition located in?',
    options: [
      { value: 'dwtc', label: 'Dubai World Trade Centre (DWTC)' },
      { value: 'adnec', label: 'ADNEC (Abu Dhabi National Exhibition Centre)' },
      { value: 'dec', label: 'Dubai Exhibition Centre (DEC / Expo City)' },
      { value: 'sharjah', label: 'Expo Centre Sharjah' },
      { value: 'other', label: 'Other UAE / Regional Venue' },
    ],
  },
  {
    id: 'priority',
    title: '3. What is your primary objective or biggest challenge?',
    options: [
      { value: 'cost', label: 'Cutting AED 20k–50k from our production cost without ruining aesthetics', recommendedOffer: 'offer-04' },
      { value: 'risk', label: 'Validating our 3D drawings to eliminate build risks and venue fines', recommendedOffer: 'offer-01' },
      { value: 'leads', label: 'Stopping aisle walk-bys and capturing high-intent B2B sales leads', recommendedOffer: 'offer-02' },
      { value: 'local_hands', label: 'Having a trusted local white-label team handle everything on-site', recommendedOffer: 'offer-05' },
      { value: 'emergency', label: 'Sourcing urgent printing, screens, or graphics in under 24 hours', recommendedOffer: 'offer-06' },
    ],
  },
];

export const OFFERS_FAQS = [
  {
    q: 'Do I have to change my existing stand contractor to use these services?',
    a: 'No. You do not have to switch contractors or agencies to work with us. Many clients engage EGS for a single specialized need—such as an independent buildability audit, value engineering an existing quote, adding interactive digital activations, or utilizing our exhibition rescue hotline during buildup.',
  },
  {
    q: 'How does the AED 500 – AED 1,000 Design Audit fee work?',
    a: 'You send us your 3D renders, floorplans, and specs. Our production engineers review buildability, materials, and cost risks, providing a clear written report. If you subsequently decide to manufacture the stand with EGS, the full audit fee is credited 100% against your production invoice.',
  },
  {
    q: 'Can EGS work as a white-label partner for overseas creative agencies?',
    a: 'Yes. A large portion of our exhibition production is white-label for international design studios and event agencies in Europe, the US, Asia, and the GCC. You retain 100% client relationship; we execute fabrication, permits, installation, and standby in the UAE seamlessly under your brand standards.',
  },
  {
    q: 'How quickly can the Exhibition Rescue Service deliver missing items?',
    a: 'Timing depends on venue security access, permit windows, and the specific requirement. Urgent digital printing, replacement graphics, and standard screen/furniture rentals can often be dispatched within hours. Send requirements to our direct WhatsApp line (+971 52 458 7992) for an instant feasibility check.',
  },
  {
    q: 'What is required for the "Bring Stand Back to Budget" review?',
    a: 'Simply send us three items: (1) your approved 3D stand design, (2) your existing contractor quotation, and (3) your realistic target budget. We will conduct a line-by-line production review and propose practical value-engineering adjustments that preserve the visible beauty while hitting your financial target.',
  },
];
