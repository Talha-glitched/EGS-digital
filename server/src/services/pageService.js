import mongoose from 'mongoose';
import { Page } from '../models/Page.js';
import { parseLegacyPages } from '../utils/legacyPageParser.js';

let legacyCache;

async function getLegacyPages() {
  if (!legacyCache) {
    legacyCache = await parseLegacyPages();
  }

  return legacyCache;
}

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

async function syncLegacyPagesToDatabase() {
  const legacyPages = await getLegacyPages();

  if (!hasDatabaseConnection()) {
    return legacyPages;
  }

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
}

export async function getAllPages() {
  return syncLegacyPagesToDatabase();
}

export async function getPageBySlug(slug) {
  if (!hasDatabaseConnection()) {
    const legacyPages = await getLegacyPages();
    return legacyPages.find((page) => page.slug === slug) ?? null;
  }

  await syncLegacyPagesToDatabase();
  return Page.findOne({ slug }).lean();
}

