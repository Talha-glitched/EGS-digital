import { buildCategoriesList, compareByMenuOrder } from './categories.js';
import { buildGradClients } from './graduations.js';
import { buildShortlistClients } from './shortlist.js';

const GRAD_CLIENTS = buildGradClients();
const { clients: SHORTLIST_CLIENTS, categoriesMap } = buildShortlistClients();

export const ALL_CLIENTS = [...SHORTLIST_CLIENTS, ...GRAD_CLIENTS].sort(
  (a, b) => b.year - a.year || a.name.localeCompare(b.name)
);

export const CATEGORIES = buildCategoriesList(categoriesMap);
export const YEARS = [...new Set(ALL_CLIENTS.map((c) => c.year))].sort((a, b) => b - a);
export const sortByMenuOrder = compareByMenuOrder(categoriesMap);

export function filterClients({ category, year }) {
  const filtered = ALL_CLIENTS.filter(
    (c) =>
      (category === 'all' || c.category === category) &&
      (year === 'all' || c.year === year)
  );

  if (category === 'all') {
    return [...filtered].sort(sortByMenuOrder);
  }

  return filtered;
}
