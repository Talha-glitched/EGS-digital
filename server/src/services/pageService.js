import { parseLegacyPages } from '../utils/legacyPageParser.js';
import db from '../db/index.js';

let legacyCache;

async function getLegacyPages() {
  if (!legacyCache) {
    legacyCache = await parseLegacyPages();
  }
  return legacyCache;
}

export async function getAllPages() {
  try {
    const res = await db.query('SELECT slug, title, meta_description as "metaDescription", source_file as "sourceFile" FROM pages ORDER BY slug ASC');
    if (res.rows.length > 0) return res.rows;
  } catch (err) {
    // Fall back to legacy page parser
  }
  return getLegacyPages();
}

export async function getPageBySlug(slug) {
  try {
    const res = await db.query('SELECT slug, title, meta_description as "metaDescription", source_file as "sourceFile" FROM pages WHERE slug = $1 LIMIT 1', [slug]);
    if (res.rows.length > 0) return res.rows[0];
  } catch (err) {
    // Fall back to legacy page parser
  }

  const legacyPages = await getLegacyPages();
  return legacyPages.find((page) => page.slug === slug) ?? null;
}


