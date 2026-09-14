/**
 * Single Source of Truth for EGS SEO Routes & Metadata
 * Used by:
 * - client/src/App.jsx (Client routing)
 * - client/scripts/prerender.js (Static HTML pre-rendering & dynamic XML sitemap generation)
 * - client/src/hooks/usePageLifecycle.js (Meta tag runtime synchronization)
 */

export const SITE_ORIGIN = 'https://www.exhibitgraphicsign.com';

export const EGS_ORGANIZATION = {
  name: 'Exhibit Graphic Sign (EGS)',
  alternateName: ['EGS Dubai', 'Exhibit Graphic Sign LLC', 'EGS Exhibition Stands'],
  url: 'https://www.exhibitgraphicsign.com/',
  logo: 'https://www.exhibitgraphicsign.com/assets/logo/EGS-Logo.svg',
  image: 'https://www.exhibitgraphicsign.com/assets/images/egs-workshop-dubai.jpg',
  telephone: '+97142383278',
  email: 'info@exhibitgraphicsign.com',
  address: {
    streetAddress: 'Al Qusais Industrial Area',
    addressLocality: 'Dubai',
    addressRegion: 'Dubai',
    postalCode: '00000',
    addressCountry: 'AE',
  },
  geo: {
    latitude: 25.2819,
    longitude: 55.3854,
  },
};

export const routesManifest = [
  // ==========================================
  // Core Hub Pages
  // ==========================================
  {
    route: '/',
    title: 'Exhibition Stand Contractor & Event Production Dubai | EGS',
    description: 'EGS is an in-house Dubai exhibition stand contractor and event production house. Turnkey booth design & fabrication, graduation ceremonies, retail rollouts, and fitouts across UAE since 2010.',
    h1: 'Shaping Brand Moments across the UAE',
    keywords: ['exhibition stand company Dubai', 'exhibition stand contractor Dubai', 'stand builder Dubai', 'event production UAE'],
    priority: 1.0,
    changefreq: 'weekly',
    category: 'Hub',
  },
  {
    route: '/exhibitions',
    title: 'Custom Exhibition Stand Contractor Dubai | Design & Build | EGS',
    description: 'Premier exhibition stand contractor in Dubai & Riyadh. In-house custom booth design, CNC joinery fabrication, and turnkey installation at DWTC & ADNEC.',
    h1: 'Exhibition stands built for opening day.',
    keywords: ['custom exhibition stands Dubai', 'exhibition booth builder Dubai', 'DWTC stand contractor'],
    priority: 0.95,
    changefreq: 'weekly',
    category: 'Hub',
  },
  {
    route: '/events',
    title: 'Graduation Ceremony Setup & Event Production UAE | EGS',
    description: 'Professional event staging and graduation ceremony production across the UAE. Over 7 years serving Higher Colleges of Technology (HCT) with stage, LED backdrop, and AV production.',
    h1: 'Ceremonies built for showtime.',
    keywords: ['graduation ceremony production UAE', 'event staging Dubai', 'institutional ceremony production'],
    priority: 0.9,
    changefreq: 'weekly',
    category: 'Hub',
  },
  {
    route: '/retail',
    title: 'Retail Branding Rollouts & Hypermarket Displays UAE | EGS',
    description: 'Nationwide retail branding rollouts, supermarket chiller displays (Carrefour, Sadia), and mall activations executed overnight with in-house fabrication.',
    h1: 'Retail rollouts ready before shoppers arrive.',
    keywords: ['retail branding Dubai', 'retail rollout UAE', 'hypermarket chiller branding', 'POSM manufacturer Dubai'],
    priority: 0.85,
    changefreq: 'weekly',
    category: 'Hub',
  },
  {
    route: '/fitouts',
    title: 'Commercial Interior Fitout & Office Branding Dubai | EGS',
    description: 'Commercial interior fitouts, corporate office branding, custom joinery, reception counters, and architectural signage in Dubai and Sharjah.',
    h1: 'Commercial spaces built for everyday wear.',
    keywords: ['commercial fit-out Dubai', 'office branding Dubai', 'custom joinery Dubai', 'commercial interior contractor'],
    priority: 0.85,
    changefreq: 'weekly',
    category: 'Hub',
  },
  {
    route: '/case-studies',
    title: 'Exhibition & Event Staging Case Studies | EGS UAE Production Proof',
    description: 'Verified production case studies: HCT nationwide graduation staging, Sadia 33-store overnight Carrefour rollout, Philips Riyadh healthcare booth adaptation, and Kazakhstan Pavilion at Gulfood.',
    h1: 'Pressure-tested deliveries across the UAE and GCC.',
    keywords: ['exhibition case studies Dubai', 'event production proof UAE', 'HCT graduation case study', 'Sadia rollout case study'],
    priority: 0.9,
    changefreq: 'weekly',
    category: 'Case Studies',
  },
  {
    route: '/case-studies/hct-nationwide-graduation-ceremonies',
    title: 'HCT Graduation Ceremonies Case Study | UAE Production Proof | EGS',
    description: 'Case study: EGS delivered 7 grand graduation ceremonies in 2025 across 5 Emirates for 4,500 graduates and 13,500 guests for Higher Colleges of Technology (HCT).',
    h1: 'HCT Graduation Program — UAE Nationwide Institutional Staging',
    keywords: ['HCT graduation case study', 'graduation ceremony production UAE', 'ADNEC convocation staging'],
    priority: 0.88,
    changefreq: 'monthly',
    category: 'Case Studies',
  },
  {
    route: '/case-studies/hct-fujairah-stage-extension',
    title: 'HCT Fujairah 5-6m Stage Extension Case Study | 10-Hour Recovery | EGS',
    description: 'Case study: 10 hours before the Fujairah ceremony at Zayed Sports Complex, EGS sourced materials, transported them to Fujairah, and extended the stage on schedule.',
    h1: 'HCT Fujairah 5-6m Stage Extension — 10-Hour Showtime Recovery',
    keywords: ['HCT Fujairah case study', 'urgent stage setup UAE', 'event production crisis management'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Case Studies',
  },
  {
    route: '/case-studies/sadia-33-store-overnight-carrefour-rollout',
    title: 'Sadia Carrefour 33-Store Overnight Rollout Case Study | EGS Retail',
    description: 'Case study: EGS deployed 13 vehicles, 30 crew members, and roving QA supervisors to complete chiller branding across 33 Carrefour hypermarkets between midnight and 6am.',
    h1: 'Sadia Overnight Carrefour Rollout — 33 UAE Hypermarket Locations',
    keywords: ['Sadia rollout case study', 'Carrefour retail rollout UAE', 'overnight hypermarket branding Dubai'],
    priority: 0.88,
    changefreq: 'monthly',
    category: 'Case Studies',
  },
  {
    route: '/case-studies/philips-global-health-riyadh-healthcare-booth',
    title: 'Philips Healthcare Stand at Global Health Riyadh Case Study | EGS',
    description: 'Case study: 200 sqm healthcare stand delivery in Riyadh with a 10-12 hour on-site joinery reconfiguration for an urgent ultrasound demonstration unit.',
    h1: 'Philips Healthcare Stand at Global Health Riyadh — 200 sqm Build & 10-Hour Adaptation',
    keywords: ['Philips exhibition stand case study', 'healthcare stand contractor Riyadh', 'Global Health Riyadh booth builder'],
    priority: 0.88,
    changefreq: 'monthly',
    category: 'Case Studies',
  },
  {
    route: '/case-studies/kazakhstan-pavilion-gulfood',
    title: 'Kazakhstan National Pavilion at Gulfood Case Study | EGS Pavilions',
    description: 'Case study: Turnkey 168 sqm country pavilion delivery at Gulfood with overnight installation of 5-6 branded display chillers before morning inspection.',
    h1: 'Kazakhstan National Pavilion at Gulfood — 168 sqm Multi-Exhibitor Build',
    keywords: ['Kazakhstan Pavilion case study', 'Gulfood country pavilion contractor', 'national pavilion builder DWTC'],
    priority: 0.88,
    changefreq: 'monthly',
    category: 'Case Studies',
  },
  {
    route: '/graduation-portfolio',
    title: 'Institutional Staging & Graduation Ceremony Portfolio UAE | EGS',
    description: 'Archive of graduation ceremony stages, LED backdrop walls, and VIP protocol seating setups delivered across the UAE by EGS.',
    h1: 'Graduation Staging Portfolio',
    keywords: ['graduation ceremony portfolio UAE', 'university stage setup photos Dubai', 'convocation staging UAE'],
    priority: 0.8,
    changefreq: 'monthly',
    category: 'Graduation',
  },
  {
    route: '/portfolio-fable',
    title: 'Visual Production Portfolio & Client Showcase | EGS Dubai',
    description: 'Interactive visual portfolio of custom exhibition stands, UAE nationwide graduation ceremonies, retail hypermarket rollouts, and commercial joinery by EGS.',
    h1: 'Physical Production Portfolio',
    keywords: ['EGS visual portfolio', 'exhibition stand photos Dubai', 'event staging gallery UAE'],
    priority: 0.75,
    changefreq: 'monthly',
    category: 'Portfolio',
  },
  {
    route: '/offers',
    title: 'Exhibition Stand Packages & Turnkey Booth Offers Dubai | EGS',
    description: 'Explore 6 transparent turnkey exhibition stand packages for DWTC and ADNEC shows. Fixed timelines, zero surprise charges, and complete in-house fabrication.',
    h1: 'Exhibition Stand Packages Built for Opening Day',
    keywords: ['exhibition stand packages Dubai', 'turnkey booth offers DWTC', 'stand builder pricing Dubai'],
    priority: 0.8,
    changefreq: 'monthly',
    category: 'Commercial',
  },
  {
    route: '/offers-v2',
    title: 'All-Inclusive Trade Show Booth Packages Dubai | EGS',
    description: 'Turnkey exhibition booth solutions with guaranteed on-time handover at Dubai World Trade Centre and ADNEC. Structural joinery, graphic print, and show-day support.',
    h1: 'Turnkey Trade Show Booth Packages',
    keywords: ['trade show booth packages Dubai', 'exhibition stand rental Dubai'],
    priority: 0.7,
    changefreq: 'monthly',
    category: 'Commercial',
  },

  // ==========================================
  // Tier 1: Commercial Exhibition Money Pages
  // ==========================================
  {
    route: '/exhibition-stand-contractor-dubai',
    title: 'Exhibition Stand Contractor Dubai | In-House Turnkey Fabrication | EGS',
    description: 'Premier exhibition stand contractor in Dubai. Direct in-house joinery workshop, turnkey custom booth construction, DWTC approvals, and opening-day delivery.',
    h1: 'Exhibition Stand Contractor in Dubai — In-House Fabrication & Turnkey Delivery',
    keywords: ['exhibition stand contractor Dubai', 'stand contractor Dubai', 'turnkey exhibition contractor UAE'],
    priority: 0.95,
    changefreq: 'weekly',
    category: 'Commercial',
  },
  {
    route: '/exhibition-stand-builder-dubai',
    title: 'Exhibition Stand Builder Dubai | Custom Booth Construction | EGS',
    description: 'Expert exhibition stand builder in Dubai. Custom booth construction, joinery craftsmanship, DWTC pre-assembly, and on-time trade show handover.',
    h1: 'Exhibition Stand Builder in Dubai — Custom Booth Construction & Joinery',
    keywords: ['exhibition stand builder Dubai', 'booth builder Dubai', 'trade show stand builder Dubai'],
    priority: 0.95,
    changefreq: 'weekly',
    category: 'Commercial',
  },
  {
    route: '/exhibition-stand-design-dubai',
    title: 'Exhibition Stand Design Dubai | 3D Booth Concepts & Renders | EGS',
    description: 'Bespoke exhibition stand design in Dubai. High-impact 3D booth concepts, spatial ergonomics, lead-generation layouts, and build-ready engineering.',
    h1: 'Exhibition Stand Design in Dubai — High-Impact 3D Concepts & Space Planning',
    keywords: ['exhibition stand design Dubai', '3D booth design Dubai', 'trade show stand designer UAE'],
    priority: 0.95,
    changefreq: 'weekly',
    category: 'Commercial',
  },
  {
    route: '/custom-exhibition-stands-dubai',
    title: 'Custom Exhibition Stands Dubai | Bespoke Trade Show Booths | EGS',
    description: 'Bespoke custom exhibition stands in Dubai. Architectural joinery, double-decker pavilions, immersive product zones, and premium trade show execution.',
    h1: 'Custom Exhibition Stands in Dubai — Bespoke Trade Show Booths & Pavilions',
    keywords: ['custom exhibition stands Dubai', 'bespoke trade show booths Dubai', 'double decker stand Dubai'],
    priority: 0.9,
    changefreq: 'weekly',
    category: 'Commercial',
  },

  // ==========================================
  // Tier 2: Sub-Service Silos
  // ==========================================
  {
    route: '/pos-display-stands-dubai',
    title: 'POS Display Stands Dubai | Retail POSM Manufacturer UAE | EGS',
    description: 'Custom POS display stands and POSM manufacturer in Dubai. Supermarket gondolas, FSDUs, chiller branding, and overnight hypermarket rollouts across the UAE.',
    h1: 'POS Display Stands in Dubai — Custom Retail POSM & Hypermarket Units',
    keywords: ['POS display stands Dubai', 'POSM manufacturer UAE', 'retail display units Dubai'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Retail',
  },
  {
    route: '/signage-manufacturer-dubai',
    title: 'Signage Manufacturer Dubai | Corporate Signage & 3D Letters | EGS',
    description: 'Premier signage manufacturer in Dubai. 3D illuminated letters, corporate reception signs, building wayfinding, and outdoor commercial signs across the UAE.',
    h1: 'Signage Manufacturer in Dubai — 3D Illuminated Letters & Corporate Signage',
    keywords: ['signage manufacturer Dubai', '3D illuminated letters Dubai', 'corporate signage UAE'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Fitouts',
  },
  {
    route: '/graduation-stage-setup-uae',
    title: 'Graduation Ceremony Setup UAE | Institutional Stage Staging | EGS',
    description: 'Premier graduation ceremony setup and institutional stage staging in UAE. 7+ years delivering for HCT across 5 Emirates with staging, LED backdrops, and VIP protocol.',
    h1: 'Graduation Ceremony Stage Setup UAE — Staging, AV & Protocol Execution',
    keywords: ['graduation ceremony setup UAE', 'graduation stage setup Dubai', 'convocation event production UAE'],
    priority: 0.9,
    changefreq: 'monthly',
    category: 'Graduation',
  },

  // ==========================================
  // Tier 3: Location Hubs
  // ==========================================
  {
    route: '/exhibition-stand-contractor-abu-dhabi',
    title: 'Exhibition Stand Contractor Abu Dhabi | ADNEC Stand Builder | EGS',
    description: 'Trusted exhibition stand contractor in Abu Dhabi. Custom booth construction, joinery fabrication, and turnkey delivery at ADNEC for ADIPEC, IDEX, and major expos.',
    h1: 'Exhibition Stand Contractor in Abu Dhabi — Turnkey ADNEC Stand Builder',
    keywords: ['exhibition stand contractor Abu Dhabi', 'ADNEC stand builder', 'exhibition stand builder Abu Dhabi'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Locations',
  },
  {
    route: '/exhibition-stand-contractor-riyadh',
    title: 'Exhibition Stand Contractor Riyadh | Stand Builder Saudi Arabia | EGS',
    description: 'Premier exhibition stand contractor in Riyadh, Saudi Arabia. Custom booth design, cross-border fabrication, RICEC & Riyadh Front delivery.',
    h1: 'Exhibition Stand Contractor in Riyadh — Custom Booths for Saudi Arabia',
    keywords: ['exhibition stand contractor Riyadh', 'stand builder Saudi Arabia', 'Riyadh exhibition stand builder'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Locations',
  },

  // ==========================================
  // Tier 4: Major Trade Shows & Event Hubs
  // ==========================================
  {
    route: '/events/gitex-exhibition-stands',
    title: 'GITEX Global Exhibition Stand Builder Dubai | DWTC Booths | EGS',
    description: 'Custom exhibition stand contractor for GITEX Global at Dubai World Trade Centre (DWTC). Tech-focused 3D booth design, LED integration, and turnkey delivery.',
    h1: 'GITEX Global Exhibition Stand Builder in Dubai — High-Tech Custom Booths',
    keywords: ['GITEX exhibition stand builder', 'GITEX booth contractor Dubai', 'GITEX Global stands DWTC'],
    priority: 0.9,
    changefreq: 'monthly',
    category: 'Events',
  },
  {
    route: '/events/arab-health-exhibition-stands',
    title: 'Arab Health Exhibition Stand Contractor Dubai | DWTC Booths | EGS',
    description: 'Custom healthcare exhibition stand contractor for Arab Health & Medlab at DWTC. Clinical-grade booth design, medical equipment displays, and turnkey build.',
    h1: 'Arab Health Exhibition Stand Contractor in Dubai — Healthcare & Medical Booths',
    keywords: ['Arab Health stand builder', 'Arab Health exhibition stand contractor Dubai', 'Medlab stand builder DWTC'],
    priority: 0.9,
    changefreq: 'monthly',
    category: 'Events',
  },
  {
    route: '/events/gulfood-exhibition-stands',
    title: 'Gulfood Exhibition Stand Design & Build Dubai | DWTC Booths | EGS',
    description: 'Custom F&B exhibition stand builder for Gulfood at Dubai World Trade Centre (DWTC). National country pavilions, sampling counters, and turnkey booth delivery.',
    h1: 'Gulfood Exhibition Stand Design & Build Dubai — F&B Booths & Country Pavilions',
    keywords: ['Gulfood stand builder', 'Gulfood exhibition stand Dubai', 'food exhibition stand contractor DWTC'],
    priority: 0.9,
    changefreq: 'monthly',
    category: 'Events',
  },

  {
    route: '/events/adipec-stand-contractor',
    title: 'ADIPEC Stand Contractor Abu Dhabi | Custom Booths at ADNEC | EGS',
    description: 'Custom exhibition stand contractor for ADIPEC at ADNEC Abu Dhabi. Energy pavilions, double-decker VIP lounges, ADNEC HSE permits, and turnkey build.',
    h1: 'ADIPEC Exhibition Stand Contractor at ADNEC Abu Dhabi — Energy Pavilions & Custom Booths',
    keywords: ['ADIPEC stand contractor', 'ADIPEC stand builder Abu Dhabi', 'ADNEC energy pavilion contractor'],
    priority: 0.9,
    changefreq: 'monthly',
    category: 'Events',
  },
  {
    route: '/events/big-5-exhibition-stands',
    title: 'The Big 5 Exhibition Stand Builder Dubai | DWTC Booths | EGS',
    description: 'Premier exhibition stand builder for The Big 5 Global at Dubai World Trade Centre (DWTC). Heavy product plinths, architectural joinery, DWTC permits, and turnkey build.',
    h1: 'The Big 5 Exhibition Stand Builder in Dubai — Custom Booths for Construction Leaders',
    keywords: ['The Big 5 stand builder', 'Big 5 exhibition stand contractor Dubai', 'construction stand builder DWTC'],
    priority: 0.9,
    changefreq: 'monthly',
    category: 'Events',
  },

  // ==========================================
  // Venue Authority Hubs
  // ==========================================
  {
    route: '/venues/dwtc-exhibition-stand-builder',
    title: 'DWTC Exhibition Stand Builder Dubai | Custom Booths & DWTC Approvals | EGS',
    description: 'Premier exhibition stand builder for Dubai World Trade Centre (DWTC). In-house joinery, structural permits, DWTC approvals, and guaranteed opening-day handover.',
    h1: 'Exhibition Stand Builder at DWTC Dubai — In-House Fabrication & Direct Venue Approvals',
    keywords: ['exhibition stand builder DWTC', 'DWTC stand contractor', 'DWTC booth builder Dubai', 'DWTC stand approvals'],
    priority: 0.95,
    changefreq: 'weekly',
    category: 'Venues',
  },
  {
    route: '/venues/adnec-exhibition-stand-builder',
    title: 'ADNEC Exhibition Stand Builder Abu Dhabi | Stand Contractor | EGS',
    description: 'Premier exhibition stand builder for ADNEC Abu Dhabi. In-house fabrication, Abu Dhabi venue permits, ADIPEC booths, and turnkey delivery at ADNEC halls.',
    h1: 'Exhibition Stand Builder at ADNEC Abu Dhabi — Turnkey Fabrication & Engineering',
    keywords: ['exhibition stand builder ADNEC', 'ADNEC stand contractor', 'ADNEC booth builder Abu Dhabi'],
    priority: 0.95,
    changefreq: 'weekly',
    category: 'Venues',
  },
  {
    route: '/venues/dubai-exhibition-centre-stand-builder',
    title: 'Dubai Exhibition Centre (DEC) Stand Builder | Expo City Booths | EGS',
    description: 'Premier exhibition stand builder for Dubai Exhibition Centre (DEC) in Expo City Dubai. Custom country pavilions, high-impact booth design, DEC permits, and turnkey build.',
    h1: 'Exhibition Stand Builder at Dubai Exhibition Centre (DEC) — Expo City Pavilions',
    keywords: ['exhibition stand builder Dubai Exhibition Centre', 'DEC stand builder Expo City', 'exhibition booth builder Expo City Dubai'],
    priority: 0.9,
    changefreq: 'weekly',
    category: 'Venues',
  },

  // ==========================================
  // Graduation Yearly Production Archives
  // ==========================================
  {
    route: '/graduation-ceremonies-2025',
    title: 'UAE Graduation Ceremonies 2025 Production Record | HCT & Institutional Staging | EGS',
    description: 'Verified record of 7 grand UAE graduation ceremonies produced by EGS in 2025 for 4,500 graduates and 13,500 guests across ADNEC Abu Dhabi, Grand Hyatt Dubai, Zayed Sports Complex, and Sharjah.',
    h1: 'UAE Graduation Ceremonies 2025 — Full Production Across 7 Grand Convocations',
    keywords: ['graduation ceremonies 2025 UAE', 'convocation stage setup Dubai 2025', 'HCT graduation production 2025'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Graduation',
  },
  {
    route: '/graduation-ceremonies-2024',
    title: 'UAE Graduation Ceremonies 2024 Production Record | Arena Staging & AV | EGS',
    description: 'Verified production record of 8 institutional graduation ceremonies delivered by EGS in 2024 for 3,500 graduates and 10,000 guests, including Coca-Cola Arena Dubai and ADNEC Abu Dhabi.',
    h1: 'UAE Graduation Ceremonies 2024 — 8 Grand Convocations Across the UAE',
    keywords: ['graduation ceremonies 2024 UAE', 'Coca-Cola Arena graduation staging', 'ADNEC convocation 2024'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Graduation',
  },
  {
    route: '/graduation-ceremonies-2023',
    title: 'UAE Graduation Ceremonies 2023 Production Showcase | EGS UAE',
    description: 'Production record of institutional graduation ceremony staging delivered across Dubai, Abu Dhabi, and Northern Emirates by EGS in 2023.',
    h1: 'UAE Graduation Ceremonies 2023 — Multi-Campus Institutional Commencement Staging',
    keywords: ['graduation ceremonies 2023 UAE', 'institutional commencement staging Dubai'],
    priority: 0.8,
    changefreq: 'monthly',
    category: 'Graduation',
  },

  // ==========================================
  // Blog Knowledge Hub & Articles
  // ==========================================
  {
    route: '/blog',
    title: 'Exhibition & Production Insights Blog | EGS Dubai Contractor',
    description: 'Expert guides on exhibition stand construction in Dubai, DWTC & ADNEC regulations, 2026 booth pricing, graduation staging, and UAE retail branding rollouts.',
    h1: 'Exhibition Stand Building, Venue Guides & Production Insights',
    keywords: ['exhibition stand blog Dubai', 'DWTC stand guide', 'stand building tips Dubai', 'retail rollout advice UAE'],
    priority: 0.85,
    changefreq: 'weekly',
    category: 'Blog',
  },
  {
    route: '/blog/exhibition-stand-cost-dubai-2026',
    title: 'Exhibition Stand Cost in Dubai: 2026 Pricing Breakdown | EGS',
    description: 'A transparent breakdown of custom exhibition stand pricing in Dubai for 2026. Realistic cost-per-sqm ranges, shell scheme upgrades, hidden venue fees, and budgeting advice.',
    h1: 'Exhibition Stand Cost in Dubai: 2026 Pricing Breakdown for Exhibitors',
    keywords: ['exhibition stand cost Dubai', 'exhibition booth cost per sqm UAE', 'trade show booth budget Dubai 2026'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Blog',
  },
  {
    route: '/blog/complete-dwtc-exhibitor-guide-regulations',
    title: 'Complete DWTC Exhibitor Guide: Stand Regulations & Approvals | EGS',
    description: 'Everything you need to know about building at Dubai World Trade Centre. Maximum build heights, double-decker structural approvals, Civil Defence permits, and setup timelines.',
    h1: 'Complete DWTC Exhibitor Guide: Stand Regulations, Heights & Approvals',
    keywords: ['DWTC exhibitor guide', 'DWTC stand builder regulations', 'DWTC stand permits Dubai'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Blog',
  },
  {
    route: '/blog/custom-vs-modular-exhibition-stands-uae',
    title: 'Custom vs Modular Exhibition Stands: Which Delivers Better ROI in Dubai? | EGS',
    description: 'An objective comparison between bespoke custom timber exhibition stands and reusable modular aluminum systems for trade shows in Dubai and Abu Dhabi.',
    h1: 'Custom vs Modular Exhibition Stands: Which Delivers Better ROI in Dubai?',
    keywords: ['custom vs modular exhibition stands Dubai', 'modular booth vs custom stand UAE'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Blog',
  },
  {
    route: '/blog/institutional-graduation-ceremony-production-guide',
    title: 'How to Plan an Institutional Graduation Ceremony in the UAE | EGS',
    description: 'A comprehensive operational guide for universities and institutions planning grand commencement ceremonies across Dubai, Abu Dhabi, and the Northern Emirates.',
    h1: 'How to Plan an Institutional Graduation Ceremony in the UAE: Stage, LED & Protocol',
    keywords: ['graduation ceremony production guide UAE', 'university commencement planning Dubai', 'institutional stage setup UAE'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Blog',
  },
  {
    route: '/blog/overnight-retail-branding-rollout-uae-hypermarkets',
    title: 'Executing Multi-Location Retail Rollouts in UAE Hypermarkets Overnight | EGS',
    description: 'Logistics, vehicle fleets, access timing, and quality control strategies for executing nationwide supermarket and mall retail branding rollouts across the UAE.',
    h1: 'Executing Multi-Location Retail Rollouts in UAE Hypermarkets Overnight',
    keywords: ['retail branding rollout UAE', 'hypermarket branding Dubai', 'POS display installation UAE'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Blog',
  },

  // ==========================================
  // Tier 5: High-Intent Buyer Guides
  // ==========================================
  {
    route: '/guides/exhibition-stand-cost-dubai',
    title: 'Exhibition Stand Cost in Dubai | 2026 Pricing Guide | EGS',
    description: 'Comprehensive 2026 guide to exhibition stand costs in Dubai. Cost per sqm breakdowns, custom vs shell scheme pricing, hidden venue fees, and procurement tips.',
    h1: 'Exhibition Stand Cost in Dubai — The Complete Pricing Guide for Exhibitors',
    keywords: ['exhibition stand cost Dubai', 'exhibition booth pricing UAE', 'custom stand cost per sqm Dubai'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Guides',
  },
  {
    route: '/guides/dwtc-stand-guidelines',
    title: 'DWTC Exhibition Stand Guidelines & Regulations | Builder Guide | EGS',
    description: 'Dubai World Trade Centre (DWTC) exhibition stand regulations guide. Maximum build heights, double-decker structural approvals, rigging permits, and safety rules.',
    h1: 'DWTC Exhibition Stand Guidelines & Height Regulations — The Builder’s Manual',
    keywords: ['DWTC exhibition stand guidelines', 'DWTC stand builder rules', 'DWTC height limits exhibition stands'],
    priority: 0.85,
    changefreq: 'monthly',
    category: 'Guides',
  },
];

/**
 * Helper to look up metadata by route path
 */
export function getRouteMetadata(pathname) {
  const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return routesManifest.find((r) => r.route === normalized) || null;
}
