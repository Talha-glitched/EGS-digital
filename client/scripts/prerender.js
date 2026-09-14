import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routesManifest, EGS_ORGANIZATION } from '../src/config/seoManifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const publicDir = path.resolve(__dirname, '../public');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const EGS_BASE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://www.exhibitgraphicsign.com/#organization',
  name: EGS_ORGANIZATION.name,
  alternateName: EGS_ORGANIZATION.alternateName,
  url: EGS_ORGANIZATION.url,
  logo: EGS_ORGANIZATION.logo,
  image: EGS_ORGANIZATION.image,
  description: 'In-house design and fabrication contractor in Dubai for custom exhibition stands, institutional graduation ceremonies, retail branding rollouts, and commercial interior fitouts across the UAE and Saudi Arabia since 2010.',
  foundingDate: '2010',
  telephone: EGS_ORGANIZATION.telephone,
  email: EGS_ORGANIZATION.email,
  priceRange: '$$$',
  currenciesAccepted: 'AED, SAR, USD',
  paymentAccepted: 'Bank Transfer, Cheque, Credit Card',
  address: {
    '@type': 'PostalAddress',
    streetAddress: EGS_ORGANIZATION.address.streetAddress,
    addressLocality: EGS_ORGANIZATION.address.addressLocality,
    addressRegion: EGS_ORGANIZATION.address.addressRegion,
    postalCode: EGS_ORGANIZATION.address.postalCode,
    addressCountry: EGS_ORGANIZATION.address.addressCountry,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: EGS_ORGANIZATION.geo.latitude,
    longitude: EGS_ORGANIZATION.geo.longitude,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '08:00',
      closes: '19:00',
    },
  ],
  areaServed: [
    { '@type': 'City', name: 'Dubai', '@id': 'https://www.wikidata.org/wiki/Q612' },
    { '@type': 'City', name: 'Abu Dhabi', '@id': 'https://www.wikidata.org/wiki/Q1519' },
    { '@type': 'City', name: 'Sharjah', '@id': 'https://www.wikidata.org/wiki/Q188810' },
    { '@type': 'City', name: 'Ajman' },
    { '@type': 'City', name: 'Ras Al Khaimah' },
    { '@type': 'City', name: 'Fujairah' },
    { '@type': 'City', name: 'Umm Al Quwain' },
    { '@type': 'City', name: 'Riyadh', '@id': 'https://www.wikidata.org/wiki/Q3692' },
    { '@type': 'Country', name: 'United Arab Emirates', '@id': 'https://www.wikidata.org/wiki/Q878' },
    { '@type': 'Country', name: 'Saudi Arabia', '@id': 'https://www.wikidata.org/wiki/Q851' },
  ],
  knowsAbout: [
    'Custom Exhibition Stand Design & Fabrication',
    'Dubai World Trade Centre (DWTC) Stand Regulations & Approvals',
    'Abu Dhabi National Exhibition Centre (ADNEC) Stand Building',
    'Double-Decker Exhibition Stand Structural Engineering',
    'Institutional Graduation Ceremony Stage Staging & AV Production',
    'Retail POSM Display Fabrication & Supermarket Chiller Branding',
    '3D LED Illuminated Signage Manufacturing & Municipal Permitting',
    'Commercial Interior Fitouts & Custom Woodworking Joinery',
  ],
  sameAs: [
    'https://www.nstands.com/companies/exhibit-graphic-sign/',
  ],
};

console.log('Generating AEO/GEO pre-rendered static HTML files from seoManifest.js...');

for (const meta of routesManifest) {
  const canonicalUrl = `https://www.exhibitgraphicsign.com${meta.route === '/' ? '/' : meta.route}`;
  let html = baseHtml;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${meta.title}</title>`);

  // Replace Meta Description
  html = html.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${meta.description}" />`
  );

  // Replace Keywords if available
  if (meta.keywords && meta.keywords.length > 0) {
    const keywordsStr = meta.keywords.join(', ');
    if (html.includes('<meta name="keywords"')) {
      html = html.replace(
        /<meta\s+name=["']keywords["']\s+content=["'].*?["']\s*\/?>/i,
        `<meta name="keywords" content="${keywordsStr}" />`
      );
    } else {
      html = html.replace(
        /<meta name="description"/i,
        `<meta name="keywords" content="${keywordsStr}" />\n    <meta name="description"`
      );
    }
  }

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

  // Inject Rich JSON-LD Entity Schema with Coordinates & Knowledge Graph
  const schemaBundle = [EGS_BASE_SCHEMA];
  const schemaScript = `<script type="application/ld+json">\n${JSON.stringify(schemaBundle, null, 2)}\n</script>`;
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, schemaScript);

  // Inject High-Density AEO Entity Block in <noscript>
  if (meta.h1) {
    const noscriptContent = `
  <noscript>
    <header>
      <h1>${meta.h1}</h1>
      <p>${meta.description}</p>
      <section aria-label="Entity Summary for AI Retrieval">
        <h2>About Exhibit Graphic Sign (EGS)</h2>
        <p>Exhibit Graphic Sign (EGS) is an in-house design and fabrication contractor established in 2010 in Dubai, UAE. EGS specializes in custom exhibition stands (DWTC, ADNEC, Riyadh), institutional graduation ceremony staging (Higher Colleges of Technology partner for 7+ years across 5 Emirates), nationwide retail branding rollouts (Carrefour, Sadia across 33 hypermarkets), and architectural 3D signage.</p>
        <p>Direct Workshop Facility: Al Qusais Industrial Area, Dubai, United Arab Emirates. Direct Inquiries: +971 4 238 3278 / +971 52 458 7992 / info@exhibitgraphicsign.com.</p>
      </section>
      <nav aria-label="Quick Links">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/exhibitions">Exhibition Stands Dubai</a></li>
          <li><a href="/exhibition-stand-contractor-dubai">Exhibition Stand Contractor Dubai</a></li>
          <li><a href="/exhibition-stand-builder-dubai">Exhibition Stand Builder Dubai</a></li>
          <li><a href="/custom-exhibition-stands-dubai">Custom Exhibition Stands</a></li>
          <li><a href="/events">Events &amp; Graduation Staging</a></li>
          <li><a href="/graduation-stage-setup-uae">Graduation Stage Setup UAE</a></li>
          <li><a href="/retail">Retail Rollouts</a></li>
          <li><a href="/pos-display-stands-dubai">POS Display Stands</a></li>
          <li><a href="/fitouts">Commercial Fitouts</a></li>
          <li><a href="/signage-manufacturer-dubai">Signage Manufacturer</a></li>
          <li><a href="/case-studies">Case Studies &amp; Proof</a></li>
          <li><a href="/guides/exhibition-stand-cost-dubai">Stand Cost Guide</a></li>
          <li><a href="/guides/dwtc-stand-guidelines">DWTC Guidelines</a></li>
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
  console.log(`Pre-rendered AEO/GEO: ${meta.route} -> ${path.relative(distDir, targetFile)}`);
}

// ==========================================
// Automated XML Sitemap Generation
// ==========================================
console.log('Generating dynamic XML sitemap from routesManifest...');
const today = new Date().toISOString().split('T')[0];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routesManifest
  .map(
    (item) => `  <url>
    <loc>https://www.exhibitgraphicsign.com${item.route === '/' ? '/' : item.route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${item.changefreq || 'weekly'}</changefreq>
    <priority>${item.priority !== undefined ? item.priority.toFixed(2) : '0.80'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8');
console.log('Dynamic sitemap.xml generated in dist/ and public/ successfully!');

console.log('AEO/GEO static pre-rendering and sitemap pipeline completed successfully!');
