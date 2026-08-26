/**
 * Structured Data & Knowledge Graph Schema Generator for Exhibit Graphic Sign (EGS)
 * Conforms to Schema.org, Google Search Essentials, and Answer Engine Optimization (AEO/GEO) standards.
 */

const BASE_URL = 'https://www.exhibitgraphicsign.com';
const LOGO_URL = 'https://www.exhibitgraphicsign.com/assets/logo/EGS-Logo.svg';
const DEFAULT_IMAGE = 'https://www.exhibitgraphicsign.com/assets/images/egs-workshop-dubai.jpg';

export const EGS_ORGANIZATION = {
  '@type': 'LocalBusiness',
  '@id': `${BASE_URL}/#organization`,
  name: 'Exhibit Graphic Sign (EGS)',
  alternateName: ['EGS Dubai', 'Exhibit Graphic Sign LLC', 'EGS Exhibition Stands'],
  url: `${BASE_URL}/`,
  logo: LOGO_URL,
  image: DEFAULT_IMAGE,
  description: 'In-house design and fabrication contractor in Dubai for custom exhibition stands, institutional graduation ceremonies, retail branding rollouts, and commercial interior fitouts across the UAE and Saudi Arabia since 2010.',
  foundingDate: '2010',
  telephone: '+97142383278',
  email: 'info@exhibitgraphicsign.com',
  priceRange: '$$$',
  currenciesAccepted: 'AED, SAR, USD',
  paymentAccepted: 'Bank Transfer, Cheque, Credit Card',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Al Qusais Industrial Area',
    addressLocality: 'Dubai',
    addressRegion: 'Dubai',
    postalCode: '00000',
    addressCountry: 'AE',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 25.2819,
    longitude: 55.3854,
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
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'EGS Production & Fabrication Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Custom Exhibition Stand Design & Build',
          url: `${BASE_URL}/exhibition-stand-contractor-dubai`,
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Graduation Ceremony Staging & AV Setup',
          url: `${BASE_URL}/graduation-stage-setup-uae`,
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Retail POS Display Stands & Rollouts',
          url: `${BASE_URL}/pos-display-stands-dubai`,
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: '3D Illuminated Signage Manufacturing',
          url: `${BASE_URL}/signage-manufacturer-dubai`,
        },
      },
    ],
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+97142383278',
      contactType: 'sales',
      email: 'info@exhibitgraphicsign.com',
      availableLanguage: ['English', 'Arabic'],
    },
    {
      '@type': 'ContactPoint',
      telephone: '+971524587992',
      contactType: 'customer service',
      email: 'info@exhibitgraphicsign.com',
      availableLanguage: ['English', 'Arabic'],
    },
  ],
  sameAs: [
    'https://www.nstands.com/companies/exhibit-graphic-sign/',
  ],
};

/**
 * Generate Service Schema with enriched GEO and AEO entity context
 */
export function generateServiceSchema({
  name,
  description,
  serviceType,
  url,
  image = DEFAULT_IMAGE,
  areaServed = ['Dubai', 'Abu Dhabi', 'Sharjah', 'United Arab Emirates', 'Saudi Arabia'],
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType,
    url: `${BASE_URL}${url}`,
    image,
    provider: EGS_ORGANIZATION,
    areaServed: areaServed.map((area) => (typeof area === 'string' ? { '@type': 'AdministrativeArea', name: area } : area)),
  };
}

/**
 * Generate FAQPage Schema
 */
export function generateFAQSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

/**
 * Generate BreadcrumbList Schema
 */
export function generateBreadcrumbsSchema(breadcrumbs) {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.url}`,
    })),
  };
}

/**
 * Combined Schema Bundle Generator
 */
export function buildPageSchemaBundle({ service, faqs, breadcrumbs, additionalSchemas = [] }) {
  const bundle = [
    {
      '@context': 'https://schema.org',
      ...EGS_ORGANIZATION,
    },
  ];

  if (service) {
    bundle.push(generateServiceSchema(service));
  }

  if (faqs && faqs.length > 0) {
    const faqSchema = generateFAQSchema(faqs);
    if (faqSchema) bundle.push(faqSchema);
  }

  if (breadcrumbs && breadcrumbs.length > 0) {
    const breadcrumbsSchema = generateBreadcrumbsSchema(breadcrumbs);
    if (breadcrumbsSchema) bundle.push(breadcrumbsSchema);
  }

  if (additionalSchemas && additionalSchemas.length > 0) {
    bundle.push(...additionalSchemas);
  }

  return bundle;
}
