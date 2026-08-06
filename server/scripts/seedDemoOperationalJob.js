/**
 * Seeds ONE clearly-marked demo Ongoing Job that exercises the operational
 * modules end to end: scope, suppliers, inventory, costing, settlement and the
 * exception queues.
 *
 * WHY THIS IS SAFE
 * Every row it creates is tagged with the DEMO_TAG below, and every table it
 * touches is reachable from the demo Job or the demo Organization. Running
 * `node scripts/seedDemoOperationalJob.js --remove` deletes all of it.
 *
 * WHY THE TAG MATTERS
 * Demo rows are real rows. Until they are removed they count toward Operations
 * Reports coverage, inventory balances and the settlement queues. The tag is
 * what makes that reversible instead of permanent contamination.
 *
 *   node scripts/seedDemoOperationalJob.js            # create
 *   node scripts/seedDemoOperationalJob.js --remove   # delete everything it made
 *   node scripts/seedDemoOperationalJob.js --verify   # report what exists
 */
import 'dotenv/config';
import db from '../src/db/index.js';

export const DEMO_TAG = '[DEMO]';
const DEMO_ORG = `${DEMO_TAG} Northwind Exhibitions LLC`;
const DEMO_JOB = `${DEMO_TAG} GITEX 2026 Stand — operational walkthrough`;
const DEMO_SKU_PREFIX = 'DEMO-';
const DEMO_LOCATION_PREFIX = 'DEMO-LOC-';

const days = (n) => new Date(Date.now() + n * 86400000);

async function findDemo(client) {
  const org = await client.query(`SELECT id FROM organizations WHERE canonical_name=$1`, [DEMO_ORG]);
  const job = await client.query(`SELECT id FROM ongoing_jobs WHERE title=$1`, [DEMO_JOB]);
  return { organizationId: org.rows[0]?.id || null, jobId: job.rows[0]?.id || null };
}

async function remove(client) {
  const { organizationId, jobId } = await findDemo(client);
  const removed = {};
  const count = (label, result) => { removed[label] = result.rowCount; };

  if (jobId) {
    // Movements first: balances are derived from them, so they must go before
    // the items they reference.
    count('inventory_movements', await client.query(`DELETE FROM inventory_movements WHERE ongoing_job_id=$1::uuid`, [jobId]));
    count('supplier_commitment_updates', await client.query(
      `DELETE FROM supplier_commitment_updates WHERE supplier_commitment_id IN
        (SELECT id FROM supplier_commitments WHERE ongoing_job_id=$1::uuid)`, [jobId]));
    count('supplier_commitments', await client.query(`DELETE FROM supplier_commitments WHERE ongoing_job_id=$1::uuid`, [jobId]));
    count('financial_milestones', await client.query(`DELETE FROM financial_milestones WHERE ongoing_job_id=$1::uuid`, [jobId]));
    count('job_scope_lines', await client.query(`DELETE FROM job_scope_lines WHERE ongoing_job_id=$1::uuid`, [jobId]));
    count('job_locations', await client.query(`DELETE FROM job_locations WHERE ongoing_job_id=$1::uuid`, [jobId]));
    count('ongoing_jobs', await client.query(`DELETE FROM ongoing_jobs WHERE id=$1::uuid`, [jobId]));
  }
  count('inventory_movements_orphan', await client.query(
    `DELETE FROM inventory_movements WHERE inventory_item_id IN (SELECT id FROM inventory_items WHERE sku LIKE $1)`,
    [`${DEMO_SKU_PREFIX}%`]));
  count('inventory_items', await client.query(`DELETE FROM inventory_items WHERE sku LIKE $1`, [`${DEMO_SKU_PREFIX}%`]));
  count('inventory_locations', await client.query(`DELETE FROM inventory_locations WHERE code LIKE $1`, [`${DEMO_LOCATION_PREFIX}%`]));

  // Every demo organization, not just the customer. The seed also creates a
  // demo supplier; looking up only the customer left that organization and its
  // supplier profile behind on the first teardown.
  const demoOrgs = `SELECT id FROM organizations WHERE canonical_name LIKE $1`;
  count('supplier_profiles', await client.query(
    `DELETE FROM supplier_profiles WHERE organization_id IN (${demoOrgs})`, [`${DEMO_TAG}%`]));
  count('organizations', await client.query(
    `DELETE FROM organizations WHERE canonical_name LIKE $1`, [`${DEMO_TAG}%`]));
  void organizationId;
  return removed;
}

async function seed(client) {
  const existing = await findDemo(client);
  if (existing.jobId) throw new Error('Demo data already exists. Run with --remove first.');

  const user = (await client.query(`SELECT id,name FROM users WHERE is_active=TRUE ORDER BY created_at LIMIT 1`)).rows[0];
  if (!user) throw new Error('No active user to attribute demo records to.');
  const uom = Object.fromEntries((await client.query(`SELECT stable_code,id FROM uoms`)).rows.map((r) => [r.stable_code, r.id]));
  const service = Object.fromEntries((await client.query(`SELECT stable_code,id FROM service_offerings`)).rows.map((r) => [r.stable_code, r.id]));

  const organizationId = (await client.query(
    `INSERT INTO organizations(canonical_name, trading_name, organization_type) VALUES($1,$2,'customer') RETURNING id`,
    [DEMO_ORG, 'Northwind Exhibitions'],
  )).rows[0].id;

  const jobId = (await client.query(
    `INSERT INTO ongoing_jobs(customer_organization_id,title,job_number,summary_stage,value_aed,owner,owner_user_id,
       received_at,target_date,inquiry_source,physical_delivery_state)
     VALUES($1::uuid,$2,$3,'In Production',185000,$4,$5::uuid,NOW(),$6,'demo_seed','not_delivered') RETURNING id`,
    [organizationId, DEMO_JOB, 'DEMO-0001', user.name, user.id, days(21)],
  )).rows[0].id;

  // 1. Scope and location -------------------------------------------------
  const locationId = (await client.query(
    `INSERT INTO job_locations(ongoing_job_id,name,city,role,deadline) VALUES($1::uuid,$2,'Dubai','installation',$3) RETURNING id`,
    [jobId, 'DWTC Hall 4 — Stand C21', days(20)],
  )).rows[0].id;

  const scope = [
    ['Main stand structure', service['exhibition-stands'], uom.sqm, 48],
    ['Fascia and graphics', service['large-format-printing'], uom.sqm, 26],
    ['Wayfinding signage', service['signage-indoor-outdoor'], uom.piece, 8],
  ];
  const scopeIds = [];
  for (const [title, serviceId, uomId, quantity] of scope) {
    scopeIds.push((await client.query(
      `INSERT INTO job_scope_lines(ongoing_job_id,service_offering_id,uom_id,quantity,title,job_location_id,
         current_scope_state,current_progress,owner_user_id,target_date)
       VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::uuid,'in_production',40,$7::uuid,$8) RETURNING id`,
      [jobId, serviceId, uomId, quantity, title, locationId, user.id, days(18)],
    )).rows[0].id);
  }

  // 2. Supplier commitment and delivery evidence --------------------------
  const supplierOrgId = (await client.query(
    `INSERT INTO organizations(canonical_name,trading_name,organization_type) VALUES($1,$2,'supplier') RETURNING id`,
    [`${DEMO_TAG} Gulf Aluminium Systems`, 'Gulf Aluminium'],
  )).rows[0].id;
  const supplierProfileId = (await client.query(
    `INSERT INTO supplier_profiles(organization_id,status,capability_tags,created_by_user_id)
     VALUES($1::uuid,'active',$2,$3::uuid) RETURNING id`,
    [supplierOrgId, ['aluminium', 'fabrication'], user.id],
  )).rows[0].id;

  const commitmentId = (await client.query(
    `INSERT INTO supplier_commitments(ongoing_job_id,work_package_id,supplier_profile_id,reference,description,
       status,committed_amount,actual_amount,currency,expected_delivery_at,created_by_user_id)
     VALUES($1::uuid,$2::uuid,$3::uuid,'DEMO-PO-118','Aluminium extrusion and fixings for stand frame',
       'partially_delivered',42000,41250,'AED',$4,$5::uuid) RETURNING id`,
    [jobId, scopeIds[0], supplierProfileId, days(-2), user.id],
  )).rows[0].id;

  for (const [type, note] of [
    ['progress', 'Frame sections cut and powder-coated.'],
    ['delivery', 'Partial delivery received: 32 of 40 lengths.'],
    ['issue', 'Eight lengths delayed — supplier awaiting stock.'],
  ]) {
    await client.query(
      `INSERT INTO supplier_commitment_updates(supplier_commitment_id,update_type,note,created_by_user_id)
       VALUES($1::uuid,$2,$3,$4::uuid)`, [commitmentId, type, note, user.id],
    );
  }

  // 3. Inventory: locations, items, and an append-only movement history ----
  const warehouseId = (await client.query(
    `INSERT INTO inventory_locations(code,name,location_type,barcode) VALUES($1,'Demo Warehouse — Al Qusais','warehouse',$1) RETURNING id`,
    [`${DEMO_LOCATION_PREFIX}WH1`],
  )).rows[0].id;
  const siteId = (await client.query(
    `INSERT INTO inventory_locations(code,name,location_type,barcode) VALUES($1,'Demo Site — DWTC Hall 4','site',$1) RETURNING id`,
    [`${DEMO_LOCATION_PREFIX}SITE1`],
  )).rows[0].id;

  const items = [
    ['ALU-40', 'Aluminium extrusion 40mm', 'quantity_reusable', uom['linear-metre'], 120, 38],
    ['VINYL-GLOSS', 'Gloss print vinyl', 'consumable', uom.sqm, 40, 26],
    ['LED-SPOT', 'LED spotlight', 'quantity_reusable', uom.piece, 30, 85],
  ];
  const movements = [];
  for (const [sku, name, mode, uomId, reorder, cost] of items) {
    const itemId = (await client.query(
      `INSERT INTO inventory_items(sku,barcode,name,tracking_mode,uom_id,reorder_level,default_unit_cost_aed,status,created_by_user_id)
       VALUES($1,$1,$2,$3,$4::uuid,$5,$6,'active',$7::uuid) RETURNING id`,
      [`${DEMO_SKU_PREFIX}${sku}`, name, mode, uomId, reorder, cost, user.id],
    )).rows[0].id;

    // Receipt into the warehouse, then checkout to site, then partial consumption.
    // Balance is never written directly; it is reconstructed from these rows.
    const plan = [
      ['receipt', 200, null, warehouseId],
      ['checkout', 90, warehouseId, siteId],
      ['consumption', 55, siteId, null],
    ];
    for (const [type, quantity, from, to] of plan) {
      movements.push((await client.query(
        `INSERT INTO inventory_movements(inventory_item_id,movement_type,quantity,from_location_id,to_location_id,
           ongoing_job_id,work_package_id,idempotency_key,unit_cost_aed,cost_source,note,recorded_by_user_id,occurred_at)
         VALUES($1::uuid,$2,$3,$4::uuid,$5::uuid,$6::uuid,$7::uuid,$8,$9,'item_default',$10,$11::uuid,NOW()) RETURNING id`,
        [itemId, type, quantity, from, to, jobId, scopeIds[0],
          `demo-${sku}-${type}`, cost, `Demo ${type} for operational walkthrough`, user.id],
      )).rows[0].id);
    }
  }

  // 4. Settlement position: delivered while money is still outstanding -----
  await client.query(
    `UPDATE ongoing_jobs SET physical_delivery_state='delivered', physically_delivered_at=NOW(),
       physical_delivery_updated_by_user_id=$2::uuid WHERE id=$1::uuid`, [jobId, user.id],
  );
  await client.query(
    `INSERT INTO financial_milestones(ongoing_job_id,milestone,amount,currency,milestone_state,due_on,
       display_order,zoho_reference,confirmed_from,confirmed_at,confirmed_by_user_id,is_paid)
     VALUES($1::uuid,'Final balance',92500,'AED','awaiting_final_payment',$2,1,'DEMO-INV-2291','human',NOW(),$3::uuid,FALSE)`,
    [jobId, days(-5), user.id],
  );

  return {
    organizationId, supplierOrgId, jobId, locationId,
    scopeLines: scopeIds.length, supplierUpdates: 3, inventoryItems: items.length,
    inventoryMovements: movements.length,
  };
}

async function verify(client) {
  const { jobId } = await findDemo(client);
  if (!jobId) return { present: false };
  const q = async (sql, params) => (await client.query(sql, params)).rows[0];
  return {
    present: true,
    jobId,
    settlement: await q(`SELECT payment_status AS "paymentStatus", settlement_source AS "settlementSource",
        physical_delivery_state AS "delivery", is_delivered_but_unpaid AS "inUnpaidQueue"
      FROM job_settlement_status WHERE ongoing_job_id=$1::uuid`, [jobId]),
    scope: await q(`SELECT COUNT(*)::int n FROM job_scope_lines WHERE ongoing_job_id=$1::uuid`, [jobId]),
    suppliers: await q(`SELECT COUNT(*)::int commitments, SUM(actual_amount)::float "actualSpend"
      FROM supplier_commitments WHERE ongoing_job_id=$1::uuid`, [jobId]),
    // Balance is derived from movements, never stored.
    inventoryBalance: (await client.query(
      `SELECT i.sku, SUM(CASE WHEN m.to_location_id IS NOT NULL THEN m.quantity ELSE 0 END)
                    - SUM(CASE WHEN m.from_location_id IS NOT NULL THEN m.quantity ELSE 0 END) AS balance
         FROM inventory_movements m JOIN inventory_items i ON i.id=m.inventory_item_id
        WHERE i.sku LIKE $1 GROUP BY i.sku ORDER BY i.sku`, [`${DEMO_SKU_PREFIX}%`])).rows,
    materialCost: await q(`SELECT COALESCE(SUM(m.quantity*m.unit_cost_aed),0)::float total
      FROM inventory_movements m WHERE m.ongoing_job_id=$1::uuid AND m.movement_type IN ('consumption','damage','loss')`, [jobId]),
  };
}

const mode = process.argv.includes('--remove') ? 'remove' : process.argv.includes('--verify') ? 'verify' : 'seed';
const client = await db.getClient();
try {
  if (mode === 'verify') {
    console.log(JSON.stringify(await verify(client), null, 2));
  } else {
    await client.query('BEGIN');
    const result = mode === 'remove' ? await remove(client) : await seed(client);
    await client.query('COMMIT');
    console.log(mode === 'remove' ? 'Removed:' : 'Seeded:', JSON.stringify(result, null, 2));
    if (mode === 'seed') console.log(JSON.stringify(await verify(client), null, 2));
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`${mode} failed:`, error.message);
  process.exitCode = 1;
} finally {
  client.release();
  process.exit(process.exitCode || 0);
}
