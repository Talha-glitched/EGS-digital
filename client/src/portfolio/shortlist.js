import { CUSTOM_LABELS, ensureCategory } from './categories.js';
import { isExcludedAsset } from './exclusions.js';
import { buildClient, mediaTypeForFilename, resolveMediaUrl } from './media.js';
import { getProjectDetails } from './resolveProject.js';

import shortlistManifest from './data/shortlistManifest.json';

export function buildShortlistClients() {
  const categoriesMap = {
    graduation: { key: 'graduation', label: CUSTOM_LABELS.graduation, sortOrder: 0.5 },
  };
  const projectGroups = {};

  shortlistManifest.forEach(({ relativePath: relPath, url, filename }) => {
    const parts = relPath.split('/');
    if (parts.length < 2) return;

    const folderName = parts[0];
    if (isExcludedAsset(filename)) return;

    const mediaType = mediaTypeForFilename(filename);
    if (!mediaType) return;

    let categoryKey = folderName
      .toLowerCase()
      .replace(/^\d+/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (categoryKey === 'fu-graduation') {
      categoryKey = 'graduation';
    }

    const sortMatch = folderName.match(/^(\d+)/);
    const sortOrder = sortMatch ? parseInt(sortMatch[1], 10) : 999;

    ensureCategory(categoriesMap, categoryKey, sortOrder);
    if (categoriesMap[categoryKey].sortOrder === 999 && sortOrder !== 999) {
      categoriesMap[categoryKey].sortOrder = sortOrder;
    }

    let pName = '';
    let pLoc = 'Dubai, UAE';
    let pYear = 2024;
    let pFacts = null;
    let details;

    if (folderName === 'FU-Graduation') {
      pName = 'Fujairah University Graduation';
      pLoc = 'Fujairah, UAE';
      pYear = 2026;
      pFacts = { venue: 'Fujairah University', graduates: 'Class of 2026', guests: '2,500' };
      details = { groupKey: 'fu-graduation' };
    } else {
      details = getProjectDetails(filename, folderName, categoryKey);
      pName = details.name;
      pLoc = details.location;
      pYear = details.year;
      pFacts = details.facts;
    }

    const projectCategory = details.category ?? categoryKey;
    ensureCategory(categoriesMap, projectCategory);

    const projectKey = `${projectCategory}|${details.groupKey}`;
    if (!projectGroups[projectKey]) {
      projectGroups[projectKey] = {
        id: `shortlist-${projectCategory}-${details.groupKey}`,
        name: pName,
        category: projectCategory,
        location: pLoc,
        year: pYear,
        facts: pFacts,
        items: [],
      };
    }

    projectGroups[projectKey].items.push({
      type: mediaType,
      url: resolveMediaUrl(url),
      name: filename,
      year: pYear,
    });
  });

  const clients = Object.values(projectGroups).map((group) => buildClient(group));

  return { clients, categoriesMap };
}
