import { getCategorySingular } from './categories.js';
import { PROJECT_RULES } from './projectRules.js';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function extractDate(filename) {
  const dateMatch = filename.match(/(201\d|202\d)[-_](\d{2})[-_](\d{2})/);
  if (dateMatch) {
    return {
      year: parseInt(dateMatch[1], 10),
      month: parseInt(dateMatch[2], 10),
      day: parseInt(dateMatch[3], 10),
      monthStr: MONTHS[parseInt(dateMatch[2], 10) - 1],
      groupKey: `${dateMatch[1]}-${dateMatch[2]}`,
    };
  }

  const compactMatch = filename.match(/(201\d|202\d)(\d{2})(\d{2})/);
  if (compactMatch) {
    const m = parseInt(compactMatch[2], 10);
    if (m >= 1 && m <= 12) {
      return {
        year: parseInt(compactMatch[1], 10),
        month: m,
        day: parseInt(compactMatch[3], 10),
        monthStr: MONTHS[m - 1],
        groupKey: `${compactMatch[1]}-${compactMatch[2]}`,
      };
    }
  }

  const yearMatch = filename.match(/(201\d|202\d)/);
  if (yearMatch) {
    return {
      year: parseInt(yearMatch[1], 10),
      month: null,
      day: null,
      monthStr: null,
      groupKey: `${yearMatch[1]}`,
    };
  }

  return null;
}

function inferFromReadableFilename(filename) {
  const cleanBase = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[\d\s()\-_]+$/, '')
    .replace(/^(IMG|DSC|MAC|WhatsApp Image)\b.*/i, '')
    .trim();

  const testBase = cleanBase.replace(/copy/i, '').trim();
  const hasLetters = /[a-zA-Z]/.test(testBase);
  if (!cleanBase || cleanBase.length <= 2 || !hasLetters) return null;

  const projectName = cleanBase
    .split(/[\s\-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    name: projectName,
    groupKey: projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  };
}

function applyProjectRule(ctx) {
  for (const rule of PROJECT_RULES) {
    if (!rule.match(ctx)) continue;
    return {
      name: rule.result.name,
      location: rule.result.location ?? 'Dubai, UAE',
      year: rule.result.year ?? 2024,
      facts: rule.result.facts ?? null,
      groupKey: rule.result.groupKey,
      category: rule.result.category ?? null,
    };
  }
  return null;
}

export function getProjectDetails(filename, folderName, categoryKey) {
  const nameLower = filename.toLowerCase();
  const ctx = { filename, folderName, categoryKey, nameLower };

  const fromRule = applyProjectRule(ctx);
  let projectName = fromRule?.name ?? '';
  let location = fromRule?.location ?? 'Dubai, UAE';
  let year = fromRule?.year ?? 2024;
  let facts = fromRule?.facts ?? null;
  let groupKey = fromRule?.groupKey ?? '';
  const category = fromRule?.category ?? null;

  if (!projectName) {
    const fromFilename = inferFromReadableFilename(filename);
    if (fromFilename) {
      projectName = fromFilename.name;
      groupKey = fromFilename.groupKey;
    }
  }

  const parsedDate = extractDate(filename);
  if (parsedDate) {
    year = parsedDate.year;
    if (!projectName) {
      const categorySingular = getCategorySingular(categoryKey);
      projectName = parsedDate.monthStr
        ? `${categorySingular} - ${parsedDate.monthStr} ${parsedDate.year}`
        : `${categorySingular} - ${parsedDate.year}`;
      groupKey = `date-${categoryKey}-${parsedDate.groupKey}`;
    }
  }

  if (!projectName) {
    const categorySingular = getCategorySingular(categoryKey);
    projectName = `${categorySingular} Showcase`;
    groupKey = `showcase-${categoryKey}-${year}`;
  }

  return { name: projectName, location, year, facts, groupKey, category };
}
