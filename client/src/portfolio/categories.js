export const CUSTOM_LABELS = {
  graduation: 'Graduation Ceremonies',
  'exhibition-stand': 'Exhibition Stands',
  'corporate-events-branding': 'Corporate Events Branding',
  'retail-branding-displays': 'Retail Branding & Displays',
  'signage-indoor-outdoor': 'Signage Indoor & Outdoor',
  'showroom-office-branding': 'Showroom & Office Branding',
  'large-format-printing': 'Large Format Printing',
  'vehicle-branding': 'Vehicle Branding',
  'product-display-stands': 'Product Display Stands',
  'btl-mall-installation': 'BTL Mall Installations',
  'btl-supermarket-hypermarket': 'BTL Supermarket & Hypermarket',
  'mall-kiosk': 'Mall Kiosks',
};

export const CATEGORY_ORDER = {
  graduation: 1,
  'exhibition-stand': 2,
  'corporate-events-branding': 3,
};

/** Folder number prefix from the shortlist asset directories. */
export const CATEGORY_FOLDER_SORT = {
  'exhibition-stand': 1,
  'corporate-events-branding': 2,
  'retail-branding-displays': 3,
  'signage-indoor-outdoor': 4,
  'showroom-office-branding': 5,
  'large-format-printing': 6,
  'vehicle-branding': 7,
  'product-display-stands': 8,
  'btl-mall-installation': 9,
  'btl-supermarket-hypermarket': 10,
  'mall-kiosk': 12,
  graduation: 0.5,
};

export function ensureCategory(categoriesMap, categoryKey, fallbackSortOrder = 999) {
  if (categoriesMap[categoryKey]) return;
  categoriesMap[categoryKey] = {
    key: categoryKey,
    label: CUSTOM_LABELS[categoryKey] || categoryKey.replace(/-/g, ' '),
    sortOrder: CATEGORY_FOLDER_SORT[categoryKey] ?? fallbackSortOrder,
  };
}

const CATEGORY_SINGULAR = {
  'exhibition-stand': 'Exhibition Stand',
  'corporate-events-branding': 'Corporate Event',
  'retail-branding-displays': 'Retail Display',
  'signage-indoor-outdoor': 'Signage Project',
  'showroom-office-branding': 'Showroom Fitout',
  'large-format-printing': 'Print Project',
  'vehicle-branding': 'Vehicle Graphics',
  'product-display-stands': 'Display Stand',
  'btl-mall-installation': 'Mall Installation',
  'btl-supermarket-hypermarket': 'Supermarket Branding',
  'mall-kiosk': 'Mall Kiosk',
  graduation: 'Graduation Ceremony',
};

export function getCategorySingular(categoryKey) {
  return CATEGORY_SINGULAR[categoryKey] || 'Project';
}

export function buildCategoriesList(categoriesMap) {
  return [
    { key: 'all', label: 'All Services' },
    ...Object.values(categoriesMap).sort((a, b) => {
      const orderA = CATEGORY_ORDER[a.key] || 999;
      const orderB = CATEGORY_ORDER[b.key] || 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.sortOrder - b.sortOrder;
    }),
  ];
}

export function compareByMenuOrder(categoriesMap) {
  return (a, b) => {
    const orderA = CATEGORY_ORDER[a.category] ?? 999;
    const orderB = CATEGORY_ORDER[b.category] ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    const sortA = categoriesMap[a.category]?.sortOrder ?? 999;
    const sortB = categoriesMap[b.category]?.sortOrder ?? 999;
    if (sortA !== sortB) return sortA - sortB;
    if (b.year !== a.year) return b.year - a.year;
    return a.name.localeCompare(b.name);
  };
}
