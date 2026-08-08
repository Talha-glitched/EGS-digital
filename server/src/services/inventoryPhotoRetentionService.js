import fs from 'node:fs/promises';
import path from 'node:path';
import db from '../db/index.js';
import { getUploadSubdir } from '../utils/uploadPath.js';

const uploadRoot = getUploadSubdir('inventory');
const RETENTION_DAYS = 60;

// Runs daily. Items are soft-deleted immediately (see deleteWarehouseItem) so they stay
// recoverable via Data Recovery; only the photo file itself is purged, and only once the
// item has been deleted for RETENTION_DAYS, to reclaim VPS storage from things nobody undid.
export async function purgeExpiredInventoryPhotos() {
  const candidates = await db.query(
    `SELECT id, slug FROM inventory_items
     WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '${RETENTION_DAYS} days'
       AND photo_purged_at IS NULL AND slug IS NOT NULL`,
  );

  let purged = 0;
  for (const row of candidates.rows) {
    try {
      await fs.rm(path.join(uploadRoot, row.slug), { recursive: true, force: true });
      await db.query(`UPDATE inventory_items SET photo_url = NULL, photo_purged_at = NOW() WHERE id = $1::uuid`, [row.id]);
      purged += 1;
    } catch (err) {
      console.error(`[InventoryPhotoRetention] Failed to purge photo for item ${row.slug}:`, err.message);
    }
  }
  if (purged) console.info(`[InventoryPhotoRetention] Purged ${purged} photo(s) deleted more than ${RETENTION_DAYS} days ago.`);
  return purged;
}

let cronTimer = null;

export function startInventoryPhotoRetentionCron() {
  if (cronTimer) return;
  const oneDay = 24 * 60 * 60 * 1000;
  cronTimer = setInterval(() => {
    purgeExpiredInventoryPhotos().catch((err) => console.error('Inventory photo retention cron failed:', err.message));
  }, oneDay);
  purgeExpiredInventoryPhotos().catch((err) => console.error('Inventory photo retention initial run failed:', err.message));
}

export function stopInventoryPhotoRetentionCron() {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}
