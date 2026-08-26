/**
 * Structured Data Schema Generator for Exhibit Graphic Sign (EGS)
 * Conforms to Schema.org and Google Search Essentials standards.
 */

const BASE_URL = 'https://www.exhibitgraphicsign.com';
const LOGO_URL = 'https://www.exhibitgraphicsign.com/assets/logo/EGS-Logo.svg';
const DEFAULT_IMAGE = 'https://www.exhibitgraphicsign.com/assets/images/egs-workshop-dubai.jpg';

export const EGS_ORGANIZATION = {
  '@type': 'LocalBusiness',
  '@id': `${BASE_URL}/#organization`,
  name: 'Exhibit Graphic Sign (EGS)',
  alternateName: 'EGS Dubai',
  url: `${BASE_URL}/`,
  logo: LOGO_URL,
  image: DEFAULT_IMAGE,
  description: 'In-house design and fabrication contractor in Dubai for custom exhibition stands, graduation ceremonies, retail branding rollouts, and commercial interior fitouts since 2010.',
  foundingDate: '2010',
  telephone: '+97142383278',
  email: 'info@exhibitgraphicsign.com',
  priceRange: '$$$',
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
    { '@type': 'City', name: 'Dubai' },
    { '@type': 'City', name: 'Abu Dhabi' },
    { '@type': 'City', name: 'Sharjah' },
    { '@type': 'City', name: 'Ajman' },
    { '@type': 'City', name: 'Ras Al Khaimah' },
    { '@type': 'City', name: 'Fujairah' },
    { '@type': 'Country', name: 'Saudi Arabia' },
  ],
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
 * Generate Service Schema
 */
export function generateServiceSchema({
  name,
  description,
  serviceType,
  url,
  image = DEFAULT_IMAGE,
  areaServed = ['AE', 'SA'],
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
    areaServed: areaServed.map((area) => (typeof area === 'string' ? { '@type': 'Country', name: area } : area)),
  };
}

/**
 * Generate FAQPage Schema
 */
export function generateFaqSchema(faqs) {
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
export function generateBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Combined Schema Bundle
 */
export function buildPageSchemaBundle({ service, faqs, breadcrumbs }) {
  const bundle = [{ '@context': 'https://schema.org', ...EGS_ORGANIZATION }];
  if (service) bundle.push(generateServiceSchema(service));
  if (faqs && faqs.length > 0) bundle.push(generateFaqSchema(faqs));
  if (breadcrumbs && breadcrumbs.length > 0) bundle.push(generateBreadcrumbSchema(breadcrumbs));
  return bundle;
}
