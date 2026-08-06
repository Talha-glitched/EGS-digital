#!/usr/bin/env node

import dotenv from 'dotenv'; dotenv.config();
const [{ default: db }, inventory] = await Promise.all([import('../src/db/index.js'), import('../src/services/inventoryService.js')]);
try {
  const schema = await db.query(`SELECT
    to_regclass('public.inventory_items') IS NOT NULL AS items_ready,
    to_regclass('public.inventory_locations') IS NOT NULL AS locations_ready,
    to_regclass('public.inventory_assets') IS NOT NULL AS assets_ready,
    to_regclass('public.inventory_reservations') IS NOT NULL AS reservations_ready,
    to_regclass('public.inventory_packing_lists') IS NOT NULL AS packing_ready,
    to_regclass('public.inventory_movements') IS NOT NULL AS movements_ready,
    (SELECT COUNT(*)::int FROM inventory_assets a LEFT JOIN inventory_items i ON i.id = a.inventory_item_id WHERE i.id IS NULL OR i.tracking_mode <> 'serialized') AS invalid_assets,
    (SELECT COUNT(*)::int FROM inventory_movements m LEFT JOIN inventory_items i ON i.id = m.inventory_item_id LEFT JOIN inventory_assets a ON a.id = m.inventory_asset_id WHERE i.id IS NULL OR (m.inventory_asset_id IS NOT NULL AND (a.id IS NULL OR a.inventory_item_id <> m.inventory_item_id))) AS invalid_movements,
    (SELECT COUNT(*)::int FROM inventory_movements m LEFT JOIN job_scope_lines w ON w.id=m.work_package_id WHERE m.work_package_id IS NOT NULL AND (w.id IS NULL OR m.ongoing_job_id IS NULL OR w.ongoing_job_id<>m.ongoing_job_id)) AS invalid_movement_work_packages,
    (SELECT COUNT(*)::int FROM inventory_reservations r LEFT JOIN inventory_items i ON i.id = r.inventory_item_id LEFT JOIN ongoing_jobs oj ON oj.id = r.ongoing_job_id LEFT JOIN inventory_assets a ON a.id = r.inventory_asset_id WHERE i.id IS NULL OR oj.id IS NULL OR (r.inventory_asset_id IS NOT NULL AND (a.id IS NULL OR a.inventory_item_id <> r.inventory_item_id))) AS invalid_reservations,
    (SELECT COUNT(*)::int FROM inventory_packing_lines pl LEFT JOIN inventory_packing_lists p ON p.id = pl.packing_list_id LEFT JOIN inventory_items i ON i.id = pl.inventory_item_id LEFT JOIN inventory_assets a ON a.id = pl.inventory_asset_id WHERE p.id IS NULL OR i.id IS NULL OR (pl.inventory_asset_id IS NOT NULL AND (a.id IS NULL OR a.inventory_item_id <> pl.inventory_item_id))) AS invalid_packing_lines,
    (WITH signed AS (SELECT inventory_item_id, to_location_id AS location_id, quantity FROM inventory_movements WHERE to_location_id IS NOT NULL UNION ALL SELECT inventory_item_id, from_location_id, -quantity FROM inventory_movements WHERE from_location_id IS NOT NULL) SELECT COUNT(*)::int FROM (SELECT inventory_item_id, location_id, SUM(quantity) balance FROM signed GROUP BY inventory_item_id, location_id HAVING SUM(quantity) < 0) negative) AS negative_balances,
    (SELECT COUNT(*)::int FROM (SELECT idempotency_key FROM inventory_movements GROUP BY idempotency_key HAVING COUNT(*) > 1) duplicate) AS duplicate_idempotency_keys`);
  const workspace = await inventory.getInventoryWorkspace(); const result = { ...schema.rows[0], itemsLoaded: workspace.items.length, locationsLoaded: workspace.locations.length, assetsLoaded: workspace.assets.length, reservationsLoaded: workspace.reservations.length, packingListsLoaded: workspace.packingLists.length, movementsLoaded: workspace.movements.length, workPackagesLoaded: workspace.workPackages.length };
  if (!result.items_ready || !result.locations_ready || !result.assets_ready || !result.reservations_ready || !result.packing_ready || !result.movements_ready || result.invalid_assets || result.invalid_movements || result.invalid_movement_work_packages || result.invalid_reservations || result.invalid_packing_lines || result.negative_balances || result.duplicate_idempotency_keys) throw new Error(`Inventory verification failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result, null, 2)); console.log('Read-only inventory verification passed.');
} finally { await db.getPool().end(); }
