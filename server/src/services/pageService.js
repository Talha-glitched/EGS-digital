import mongoose from 'mongoose';
import { Page } from '../models/Page.js';
import { parseLegacyPages } from '../utils/legacyPageParser.js';
import db from '../db/index.js';

let legacyCache;

async function getLegacyPages() {
  if (!legacyCache) {
    legacyCache = await parseLegacyPages();
  }

  return legacyCache;
}

function hasDatabaseConnection() {
  return mongoose.connection?.readyState === 1;
}

async function syncLegacyPagesToDatabase() {
  const legacyPages = await getLegacyPages();

  if (!hasDatabaseConnection()) {
    return legacyPages;
  }

  try {
    await Promise.all(
      legacyPages.map((page) =>
        Page.updateOne(
          { slug: page.slug },
          {
            $set: {
              ...page,
              sourceFile: page.fileName,
            },
          },
          { upsert: true }
        )
      )
    );

    return Page.find().sort({ slug: 1 }).lean();
  } catch (err) {
    return legacyPages;
  }
}

export async function getAllPages() {
  try {
    const res = await db.query('SELECT slug, title, meta_description as "metaDescription", source_file as "sourceFile" FROM pages ORDER BY slug ASC');
    if (res.rows.length > 0) return res.rows;
  } catch (err) {
    // Fall back to legacy page parser or mongo if available
  }
  return syncLegacyPagesToDatabase();
}

export async function getPageBySlug(slug) {
  try {
    const res = await db.query('SELECT slug, title, meta_description as "metaDescription", source_file as "sourceFile" FROM pages WHERE slug = $1 LIMIT 1', [slug]);
    if (res.rows.length > 0) return res.rows[0];
  } catch (err) {
    // Fall back
  }

  if (!hasDatabaseConnection()) {
    const legacyPages = await getLegacyPages();
    return legacyPages.find((page) => page.slug === slug) ?? null;
  }

  await syncLegacyPagesToDatabase();
  return Page.findOne({ slug }).lean();
}


