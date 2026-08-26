import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const routesMetadata = [
  {
    route: '/',
    title: 'Exhibition Stand Contractor & Event Production Dubai | EGS',
    description: 'EGS is an in-house Dubai exhibition stand contractor and event production house. Turnkey booth design & fabrication, graduation ceremonies, retail rollouts, and fitouts across UAE since 2010.',
    h1: 'Shaping Brand Moments across the UAE',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'Exhibit Graphic Sign (EGS)',
      url: 'https://www.exhibitgraphicsign.com/',
      telephone: '+97142383278',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Al Qusais Industrial Area',
        addressLocality: 'Dubai',
        addressRegion: 'Dubai',
        addressCountry: 'AE',
      },
    },
  },
  {
    route: '/exhibitions',
    title: 'Custom Exhibition Stand Contractor Dubai | Design & Build | EGS',
    description: 'Premier exhibition stand contractor in Dubai & Riyadh. In-house custom booth design, CNC joinery fabrication, and turnkey installation at DWTC & ADNEC.',
    h1: 'Exhibition stands built for opening day.',
  },
  {
    route: '/events',
    title: 'Graduation Ceremony Setup & Event Production UAE | EGS',
    description: 'Professional event staging and graduation ceremony production across the UAE. Over 7 years serving Higher Colleges of Technology (HCT) with stage, LED backdrop, and AV production.',
    h1: 'Ceremonies built for showtime.',
  },
  {
    route: '/retail',
    title: 'Retail Branding Rollouts & Hypermarket Displays UAE | EGS',
    description: 'Nationwide retail branding rollouts, supermarket chiller displays (Carrefour, Sadia), and mall activations executed overnight with in-house fabrication.',
    h1: 'Retail rollouts ready before shoppers arrive.',
  },
  {
    route: '/fitouts',
    title: 'Commercial Interior Fitout & Office Branding Dubai | EGS',
    description: 'Commercial interior fitouts, corporate office branding, custom joinery, reception counters, and architectural signage in Dubai and Sharjah.',
    h1: 'Commercial spaces built for everyday wear.',
  },
  {
    route: '/case-studies',
    title: 'Exhibition & Event Staging Case Studies | EGS UAE Production Proof',
    description: 'Verified production case studies: HCT nationwide graduation staging, Sadia 33-store overnight Carrefour rollout, Philips Riyadh healthcare booth adaptation, and Kazakhstan Pavilion at Gulfood.',
    h1: 'High-Stakes Production Case Studies: Dubai & GCC Deliveries',
  },
  {
    route: '/graduation-portfolio',
    title: 'Institutional Staging & Graduation Ceremony Portfolio UAE | EGS',
    description: 'Archive of graduation ceremony stages, LED backdrop walls, and VIP protocol seating setups delivered across the UAE by EGS.',
    h1: 'Graduation Staging Portfolio',
  },
  {
    route: '/exhibition-stand-contractor-dubai',
    title: 'Exhibition Stand Contractor Dubai | In-House Turnkey Fabrication | EGS',
    description: 'Premier exhibition stand contractor in Dubai. Direct in-house joinery workshop, turnkey custom booth construction, DWTC approvals, and opening-day delivery.',
    h1: 'Exhibition Stand Contractor in Dubai — In-House Fabrication & Turnkey Delivery',
  },
  {
    route: '/exhibition-stand-builder-dubai',
    title: 'Exhibition Stand Builder Dubai | Custom Booth Construction | EGS',
    description: 'Expert exhibition stand builder in Dubai. Custom booth construction, joinery craftsmanship, DWTC pre-assembly, and on-time trade show handover.',
    h1: 'Exhibition Stand Builder in Dubai — Custom Booth Construction & Joinery',
  },
  {
    route: '/exhibition-stand-design-dubai',
    title: 'Exhibition Stand Design Dubai | 3D Booth Concepts & Renders | EGS',
    description: 'Bespoke exhibition stand design in Dubai. High-impact 3D booth concepts, spatial ergonomics, lead-generation layouts, and build-ready engineering.',
    h1: 'Exhibition Stand Design in Dubai — High-Impact 3D Concepts & Space Planning',
  },
  {
    route: '/custom-exhibition-stands-dubai',
    title: 'Custom Exhibition Stands Dubai | Bespoke Trade Show Booths | EGS',
    description: 'Bespoke custom exhibition stands in Dubai. Architectural joinery, double-decker pavilions, immersive product zones, and premium trade show execution.',
    h1: 'Custom Exhibition Stands in Dubai — Bespoke Trade Show Booths & Pavilions',
  },
  {
    route: '/exhibition-stand-contractor-abu-dhabi',
    title: 'Exhibition Stand Contractor Abu Dhabi | ADNEC Stand Builder | EGS',
    description: 'Trusted exhibition stand contractor in Abu Dhabi. Custom booth construction, joinery fabrication, and turnkey delivery at ADNEC for ADIPEC, IDEX, and major expos.',
    h1: 'Exhibition Stand Contractor in Abu Dhabi — Turnkey ADNEC Stand Builder',
  },
  {
    route: '/exhibition-stand-contractor-riyadh',
    title: 'Exhibition Stand Contractor Riyadh | Stand Builder Saudi Arabia | EGS',
    description: 'Premier exhibition stand contractor in Riyadh, Saudi Arabia. Custom booth design, cross-border fabrication, RICEC & Riyadh Front delivery.',
    h1: 'Exhibition Stand Contractor in Riyadh — Custom Booths for Saudi Arabia',
  },
  {
    route: '/pos-display-stands-dubai',
    title: 'POS Display Stands Dubai | Retail POSM Manufacturer UAE | EGS',
    description: 'Custom POS display stands and POSM manufacturer in Dubai. Supermarket gondolas, FSDUs, chiller branding, and overnight hypermarket rollouts across the UAE.',
    h1: 'POS Display Stands in Dubai — Custom Retail POSM & Hypermarket Units',
  },
  {
    route: '/signage-manufacturer-dubai',
    title: 'Signage Manufacturer Dubai | Corporate Signage & 3D Letters | EGS',
    description: 'Premier signage manufacturer in Dubai. 3D illuminated letters, corporate reception signs, building wayfinding, and outdoor commercial signs across the UAE.',
    h1: 'Signage Manufacturer in Dubai — 3D Illuminated Letters & Corporate Signage',
  },
  {
    route: '/graduation-stage-setup-uae',
    title: 'Graduation Ceremony Setup UAE | Institutional Stage Staging | EGS',
    description: 'Premier graduation ceremony setup and institutional stage staging in UAE. 7+ years delivering for HCT across 5 Emirates with staging, LED backdrops, and VIP protocol.',
    h1: 'Graduation Ceremony Stage Setup UAE — Staging, AV & Protocol Execution',
  },
  {
    route: '/events/gitex-exhibition-stands',
    title: 'GITEX Global Exhibition Stand Builder Dubai | DWTC Booths | EGS',
    description: 'Custom exhibition stand contractor for GITEX Global at Dubai World Trade Centre (DWTC). Tech-focused 3D booth design, LED integration, and turnkey delivery.',
    h1: 'GITEX Global Exhibition Stand Builder in Dubai — High-Tech Custom Booths',
  },
  {
    route: '/events/arab-health-exhibition-stands',
    title: 'Arab Health Exhibition Stand Contractor Dubai | DWTC Booths | EGS',
    description: 'Custom healthcare exhibition stand contractor for Arab Health & Medlab at DWTC. Clinical-grade booth design, medical equipment displays, and turnkey build.',
    h1: 'Arab Health Exhibition Stand Contractor in Dubai — Healthcare & Medical Booths',
  },
  {
    route: '/events/gulfood-exhibition-stands',
    title: 'Gulfood Exhibition Stand Design & Build Dubai | DWTC Booths | EGS',
    description: 'Custom F&B exhibition stand builder for Gulfood at Dubai World Trade Centre (DWTC). National country pavilions, sampling counters, and turnkey booth delivery.',
    h1: 'Gulfood Exhibition Stand Design & Build Dubai — F&B Booths & Country Pavilions',
  },
  {
    route: '/guides/exhibition-stand-cost-dubai',
    title: 'Exhibition Stand Cost in Dubai | 2026 Pricing Guide | EGS',
    description: 'Comprehensive 2026 guide to exhibition stand costs in Dubai. Cost per sqm breakdowns, custom vs shell scheme pricing, hidden venue fees, and procurement tips.',
    h1: 'Exhibition Stand Cost in Dubai — The Complete Pricing Guide for Exhibitors',
  },
  {
    route: '/guides/dwtc-stand-guidelines',
    title: 'DWTC Exhibition Stand Guidelines & Regulations | Builder Guide | EGS',
    description: 'Dubai World Trade Centre (DWTC) exhibition stand regulations guide. Maximum build heights, double-decker structural approvals, rigging permits, and safety rules.',
    h1: 'DWTC Exhibition Stand Guidelines & Height Regulations — The Builder’s Manual',
  },
];

console.log('Generating pre-rendered static HTML files for all routes...');

for (const meta of routesMetadata) {
  const canonicalUrl = `https://www.exhibitgraphicsign.com${meta.route === '/' ? '/' : meta.route}`;
  let html = baseHtml;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${meta.title}</title>`);

  // Replace Meta Description
  html = html.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${meta.description}" />`
  );

  // Replace Canonical Link
  html = html.replace(
    /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // Replace OpenGraph Title & Description
  html = html.replace(
    /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:title" content="${meta.title}" />`
  );
  html = html.replace(
    /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:description" content="${meta.description}" />`
  );
  html = html.replace(
    /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );

  // Replace Twitter Title & Description
  html = html.replace(
    /<meta\s+property=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:title" content="${meta.title}" />`
  );
  html = html.replace(
    /<meta\s+property=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:description" content="${meta.description}" />`
  );
  html = html.replace(
    /<meta\s+property=["']twitter:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="twitter:url" content="${canonicalUrl}" />`
  );

  // If route has specific H1 and noscript snapshot, ensure crawler noscript contains it
  if (meta.h1) {
    const noscriptContent = `
  <noscript>
    <header>
      <h1>${meta.h1}</h1>
      <p>${meta.description}</p>
      <nav aria-label="Quick Links">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/exhibition-stand-contractor-dubai">Exhibition Stand Contractor Dubai</a></li>
          <li><a href="/exhibition-stand-builder-dubai">Exhibition Stand Builder Dubai</a></li>
          <li><a href="/custom-exhibition-stands-dubai">Custom Exhibition Stands</a></li>
          <li><a href="/events">Events &amp; Graduation Staging</a></li>
          <li><a href="/retail">Retail Rollouts</a></li>
          <li><a href="/fitouts">Commercial Fitouts</a></li>
          <li><a href="/case-studies">Case Studies &amp; Proof</a></li>
          <li><a href="/guides/exhibition-stand-cost-dubai">Stand Cost Guide</a></li>
        </ul>
      </nav>
    </header>
  </noscript>`;
    html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, noscriptContent);
  }

  // Determine output path
  let targetFile;
  if (meta.route === '/') {
    targetFile = indexHtmlPath;
  } else {
    const routePath = meta.route.startsWith('/') ? meta.route.slice(1) : meta.route;
    const targetDir = path.join(distDir, routePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    targetFile = path.join(targetDir, 'index.html');
  }

  fs.writeFileSync(targetFile, html, 'utf8');
  console.log(`Pre-rendered: ${meta.route} -> ${path.relative(distDir, targetFile)}`);
}

console.log('Static pre-rendering completed successfully!');
