import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

function text(value) {
  return String(value ?? '').trim() || null;
}

function money(value, field = 'Cost') {
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) {
    throw Object.assign(new Error(`${field} must be a valid positive number.`), { status: 400 });
  }
  return result;
}

function date(value) {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function rating(value) {
  if (value === '' || value == null) return null;
  const num = parseInt(value, 10);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    throw Object.assign(new Error('Quality rating must be between 1 and 5 stars.'), { status: 400 });
  }
  return num;
}

async function audit(actor, action, resourceId, summary, metadata = {}) {
  await writeAuditLog({
    userId: actor?.userId,
    userDisplayName: actor?.displayName || 'EGS Admin',
    action,
    resource: 'supplier',
    resourceId,
    summary,
    metadata,
  }).catch(() => {});
}

// Seed initial realistic suppliers & purchases if empty
let seeded = false;
export async function ensureSuppliersSeeded() {
  if (seeded) return;
  try {
    const countRes = await db.query('SELECT COUNT(*)::int as count FROM suppliers WHERE deleted_at IS NULL');
    if (countRes.rows[0].count === 0) {
      console.info('🌱 Seeding initial suppliers and buy history...');
      const seedData = [
        {
          name: 'Gulf Aluminium Systems',
          contactPerson: 'Tariq Mahmood',
          phone: '+971 4 345 6789',
          email: 'sales@gulfaluminium.demo',
          service: 'Aluminium Extrusions, Stand Frames, CNC Routing',
          address: 'Al Quoz Industrial Area 1, Dubai',
          notes: 'Specialist in custom modular exhibition stand profiles and fast turnaround',
          status: 'active',
          purchases: [
            {
              itemDescription: '50x Custom powder-coated aluminium stand frame poles (3m)',
              cost: 6500,
              purchaseDate: '2026-08-10',
              qualityRating: 5,
              jobReference: 'GITEX 2026 - Tech Hub',
              invoiceReference: 'INV-GAS-1092',
              notes: 'Excellent precision cutting, delivered right on schedule to DWTC',
            },
            {
              itemDescription: '20x Heavy-duty corner connectors and steel baseplates',
              cost: 2800,
              purchaseDate: '2026-07-15',
              qualityRating: 4,
              jobReference: 'Arab Health 2026',
              invoiceReference: 'INV-GAS-1140',
              notes: 'Solid build quality, slight 2-hour delay in delivery',
            },
          ],
        },
        {
          name: 'Danube Building Materials',
          contactPerson: 'Sunil Varma',
          phone: '+971 4 812 7700',
          email: 'commercial@aldanube.demo',
          service: 'MDF Panels, Commercial Plywood, Gypsum Boards, Timber',
          address: 'Jebel Ali Free Zone / Al Quoz 3, Dubai',
          notes: 'Primary material supplier with same-day delivery for bulk orders',
          status: 'active',
          purchases: [
            {
              itemDescription: '80x 18mm Commercial Plywood Sheets (8x4 ft)',
              cost: 7200,
              purchaseDate: '2026-08-01',
              qualityRating: 5,
              jobReference: 'Big 5 Global 2025',
              invoiceReference: 'DBM-99321',
              notes: 'A-grade smooth surface, perfect for high-gloss spray finishes',
            },
            {
              itemDescription: '40x 12mm MDF panels and pine timber battens',
              cost: 3400,
              purchaseDate: '2026-07-20',
              qualityRating: 4,
              jobReference: 'Gulfood 2026 - Pavilion Stand',
              invoiceReference: 'DBM-100412',
              notes: 'Good quality, zero warped sheets',
            },
          ],
        },
        {
          name: 'Desert Neon & Acrylic Fabrication',
          contactPerson: 'Farhan Siddiqui',
          phone: '+971 50 876 5432',
          email: 'orders@desertneon.demo',
          service: '3D Acrylic Letters, Backlit Signage, LED Modules, Neon Flex',
          address: 'Industrial Area 5, Sharjah',
          notes: 'Top tier fabrication for corporate branding and 3D illuminated logos',
          status: 'active',
          purchases: [
            {
              itemDescription: 'Custom 3D acrylic backlit company logo with Samsung LEDs',
              cost: 4200,
              purchaseDate: '2026-08-18',
              qualityRating: 5,
              jobReference: 'ADIPEC Stand 2025',
              invoiceReference: 'DN-4401',
              notes: 'Extremely clean edge finish and even illumination. Highly recommended.',
            },
          ],
        },
        {
          name: 'National Paints & Chemical Supplies',
          contactPerson: 'Ramesh Nair',
          phone: '+971 6 534 5678',
          email: 'sales@nationalpaints.demo',
          service: 'Duco Spray Paint, PU Primer, Wall Emulsion, Putty & Thinners',
          address: 'Industrial Area 13, Sharjah',
          notes: 'Reliable supplier for architectural and stand coatings',
          status: 'active',
          purchases: [
            {
              itemDescription: '15x 20L Premium Matte White Emulsion & Duco Undercoat',
              cost: 2150,
              purchaseDate: '2026-08-05',
              qualityRating: 4,
              jobReference: 'DWTC Exhibition Season Batch',
              invoiceReference: 'NP-88210',
              notes: 'Consistent color matching and coverage',
            },
          ],
        },
      ];

      for (const item of seedData) {
        const supRes = await db.query(
          `INSERT INTO suppliers (name, contact_person, phone, email, service, address, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [item.name, item.contactPerson, item.phone, item.email, item.service, item.address, item.notes, item.status]
        );
        const supplierId = supRes.rows[0].id;

        for (const p of item.purchases) {
          await db.query(
            `INSERT INTO supplier_purchases (supplier_id, item_description, cost, purchase_date, quality_rating, job_reference, invoice_reference, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [supplierId, p.itemDescription, p.cost, p.purchaseDate, p.qualityRating, p.jobReference, p.invoiceReference, p.notes]
          );
        }
      }
      console.info('✅ Initial suppliers and buy history seeded successfully.');
    }
    seeded = true;
  } catch (err) {
    console.warn('Could not check/seed suppliers:', err.message);
  }
}

// Auto-seed in background
ensureSuppliersSeeded();

/**
 * List suppliers with aggregated purchase history metrics
 */
export async function listSuppliers({
  search,
  service,
  status = 'active',
  page = 1,
  limit = 50,
  sortKey = 'name',
  sortDir = 'asc',
} = {}) {
  await ensureSuppliersSeeded();

  const conditions = ['s.deleted_at IS NULL'];
  const params = [];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`s.status = $${params.length}`);
  }

  if (service && service !== 'all') {
    params.push(`%${service}%`);
    conditions.push(`s.service ILIKE $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(
      s.name ILIKE $${params.length} OR
      s.contact_person ILIKE $${params.length} OR
      s.phone ILIKE $${params.length} OR
      s.email ILIKE $${params.length} OR
      s.service ILIKE $${params.length} OR
      s.address ILIKE $${params.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortMap = {
    name: 's.name',
    contactPerson: 's.contact_person',
    service: 's.service',
    status: 's.status',
    totalPurchases: 'COALESCE(metrics.total_purchases, 0)',
    totalSpent: 'COALESCE(metrics.total_spent, 0)',
    avgRating: 'COALESCE(metrics.avg_rating, 0)',
    createdAt: 's.created_at',
  };

  const orderColumn = sortMap[sortKey] || 's.name';
  const orderDirection = String(sortDir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const offset = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));
  const limitValue = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const query = `
    SELECT 
      s.id,
      s.name,
      s.contact_person AS "contactPerson",
      s.phone,
      s.email,
      s.service,
      s.address,
      s.notes,
      s.status,
      s.created_at AS "createdAt",
      s.updated_at AS "updatedAt",
      COALESCE(metrics.total_purchases, 0)::int AS "totalPurchases",
      COALESCE(metrics.total_spent, 0)::numeric AS "totalSpent",
      COALESCE(metrics.avg_rating, 0)::numeric AS "avgRating",
      metrics.last_purchase_date AS "lastPurchaseDate"
    FROM suppliers s
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(sp.id) AS total_purchases,
        SUM(sp.cost) AS total_spent,
        ROUND(AVG(sp.quality_rating), 1) AS avg_rating,
        MAX(sp.purchase_date) AS last_purchase_date
      FROM supplier_purchases sp
      WHERE sp.supplier_id = s.id
    ) metrics ON TRUE
    ${whereClause}
    ORDER BY ${orderColumn} ${orderDirection} NULLS LAST
    LIMIT ${limitValue} OFFSET ${offset}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM suppliers s
    ${whereClause}
  `;

  const statsQuery = `
    SELECT 
      COUNT(DISTINCT s.id)::int AS "totalSuppliers",
      COALESCE(COUNT(sp.id), 0)::int AS "totalPurchases",
      COALESCE(SUM(sp.cost), 0)::numeric AS "totalSpend",
      COALESCE(ROUND(AVG(sp.quality_rating), 1), 0)::numeric AS "overallAvgRating"
    FROM suppliers s
    LEFT JOIN supplier_purchases sp ON sp.supplier_id = s.id
    WHERE s.deleted_at IS NULL
  `;

  const [itemsRes, countRes, statsRes, servicesRes] = await Promise.all([
    db.query(query, params),
    db.query(countQuery, params),
    db.query(statsQuery),
    db.query(`SELECT DISTINCT service FROM suppliers WHERE deleted_at IS NULL AND service IS NOT NULL`),
  ]);

  const rawServices = servicesRes.rows.flatMap((r) =>
    (r.service || '').split(',').map((s) => s.trim()).filter(Boolean)
  );
  const distinctServices = [...new Set(rawServices)].sort((a, b) => a.localeCompare(b));

  return {
    items: itemsRes.rows.map((row) => ({
      ...row,
      totalSpent: Number(row.totalSpent || 0),
      avgRating: Number(row.avgRating || 0),
    })),
    total: countRes.rows[0]?.total || 0,
    stats: {
      totalSuppliers: statsRes.rows[0]?.totalSuppliers || 0,
      totalPurchases: statsRes.rows[0]?.totalPurchases || 0,
      totalSpend: Number(statsRes.rows[0]?.totalSpend || 0),
      overallAvgRating: Number(statsRes.rows[0]?.overallAvgRating || 0),
    },
    services: distinctServices,
  };
}

/**
 * Get supplier by ID with full purchase history
 */
export async function getSupplierById(id) {
  const supplierRes = await db.query(
    `SELECT 
       s.id,
       s.name,
       s.contact_person AS "contactPerson",
       s.phone,
       s.email,
       s.service,
       s.address,
       s.notes,
       s.status,
       s.created_at AS "createdAt",
       s.updated_at AS "updatedAt"
     FROM suppliers s
     WHERE s.id = $1::uuid AND s.deleted_at IS NULL`,
    [id]
  );

  if (!supplierRes.rows.length) {
    throw Object.assign(new Error('Supplier not found.'), { status: 404 });
  }

  const supplier = supplierRes.rows[0];

  const purchasesRes = await db.query(
    `SELECT 
       sp.id,
       sp.supplier_id AS "supplierId",
       sp.item_description AS "itemDescription",
       sp.cost::numeric AS cost,
       sp.currency,
       sp.purchase_date AS "purchaseDate",
       sp.quality_rating AS "qualityRating",
       sp.job_reference AS "jobReference",
       sp.invoice_reference AS "invoiceReference",
       sp.notes,
       sp.created_at AS "createdAt",
       u.name AS "createdBy"
     FROM supplier_purchases sp
     LEFT JOIN users u ON u.id = sp.created_by_user_id
     WHERE sp.supplier_id = $1::uuid
     ORDER BY sp.purchase_date DESC, sp.created_at DESC`,
    [id]
  );

  const purchases = purchasesRes.rows.map((p) => ({
    ...p,
    cost: Number(p.cost || 0),
  }));

  const totalPurchases = purchases.length;
  const totalSpent = purchases.reduce((sum, p) => sum + p.cost, 0);
  const ratedPurchases = purchases.filter((p) => p.qualityRating != null);
  const avgRating = ratedPurchases.length
    ? Number((ratedPurchases.reduce((sum, p) => sum + p.qualityRating, 0) / ratedPurchases.length).toFixed(1))
    : 0;

  return {
    ...supplier,
    purchases,
    totalPurchases,
    totalSpent,
    avgRating,
  };
}

/**
 * Create new supplier
 */
export async function createSupplier(payload = {}, actor = {}) {
  const name = text(payload.name);
  if (!name) {
    throw Object.assign(new Error('Supplier name is required.'), { status: 400 });
  }

  const contactPerson = text(payload.contactPerson);
  const phone = text(payload.phone);
  const email = text(payload.email);
  const service = text(payload.service);
  const address = text(payload.address);
  const notes = text(payload.notes);
  const status = payload.status === 'inactive' ? 'inactive' : 'active';

  const res = await db.query(
    `INSERT INTO suppliers (name, contact_person, phone, email, service, address, notes, status, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid)
     RETURNING id, name, contact_person AS "contactPerson", phone, email, service, address, notes, status, created_at AS "createdAt"`,
    [name, contactPerson, phone, email, service, address, notes, status, actor?.userId || null]
  );

  const supplier = res.rows[0];
  await audit(actor, 'create', supplier.id, `Created supplier: ${supplier.name}`);
  return supplier;
}

/**
 * Update supplier
 */
export async function updateSupplier(id, payload = {}, actor = {}) {
  const current = await db.query('SELECT * FROM suppliers WHERE id = $1::uuid AND deleted_at IS NULL', [id]);
  if (!current.rows.length) {
    throw Object.assign(new Error('Supplier not found.'), { status: 404 });
  }

  const row = current.rows[0];
  const name = Object.hasOwn(payload, 'name') ? text(payload.name) || row.name : row.name;
  const contactPerson = Object.hasOwn(payload, 'contactPerson') ? text(payload.contactPerson) : row.contact_person;
  const phone = Object.hasOwn(payload, 'phone') ? text(payload.phone) : row.phone;
  const email = Object.hasOwn(payload, 'email') ? text(payload.email) : row.email;
  const service = Object.hasOwn(payload, 'service') ? text(payload.service) : row.service;
  const address = Object.hasOwn(payload, 'address') ? text(payload.address) : row.address;
  const notes = Object.hasOwn(payload, 'notes') ? text(payload.notes) : row.notes;
  const status = Object.hasOwn(payload, 'status') ? (payload.status === 'inactive' ? 'inactive' : 'active') : row.status;

  const res = await db.query(
    `UPDATE suppliers 
     SET name = $2, contact_person = $3, phone = $4, email = $5, service = $6, address = $7, notes = $8, status = $9, updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING id, name, contact_person AS "contactPerson", phone, email, service, address, notes, status, updated_at AS "updatedAt"`,
    [id, name, contactPerson, phone, email, service, address, notes, status]
  );

  const updated = res.rows[0];
  await audit(actor, 'update', id, `Updated supplier: ${updated.name}`);
  return updated;
}

/**
 * Delete supplier (soft delete)
 */
export async function deleteSupplier(id, actor = {}) {
  const res = await db.query(
    `UPDATE suppliers SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1::uuid AND deleted_at IS NULL RETURNING id, name`,
    [id]
  );
  if (!res.rows.length) {
    throw Object.assign(new Error('Supplier not found.'), { status: 404 });
  }
  await audit(actor, 'delete', id, `Deleted supplier: ${res.rows[0].name}`);
  return { ok: true, id };
}

/**
 * Add purchase to supplier's buy history
 */
export async function addSupplierPurchase(supplierId, payload = {}, actor = {}) {
  const itemDescription = text(payload.itemDescription);
  if (!itemDescription) {
    throw Object.assign(new Error('Item or service description is required.'), { status: 400 });
  }

  const cost = money(payload.cost, 'Purchase cost');
  const currency = text(payload.currency) || 'AED';
  const purchaseDate = date(payload.purchaseDate);
  const qualityRating = rating(payload.qualityRating);
  const jobReference = text(payload.jobReference);
  const invoiceReference = text(payload.invoiceReference);
  const notes = text(payload.notes);

  // Check supplier exists
  const supRes = await db.query('SELECT name FROM suppliers WHERE id = $1::uuid AND deleted_at IS NULL', [supplierId]);
  if (!supRes.rows.length) {
    throw Object.assign(new Error('Supplier not found.'), { status: 404 });
  }

  const res = await db.query(
    `INSERT INTO supplier_purchases 
       (supplier_id, item_description, cost, currency, purchase_date, quality_rating, job_reference, invoice_reference, notes, created_by_user_id)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid)
     RETURNING 
       id,
       supplier_id AS "supplierId",
       item_description AS "itemDescription",
       cost::numeric AS cost,
       currency,
       purchase_date AS "purchaseDate",
       quality_rating AS "qualityRating",
       job_reference AS "jobReference",
       invoice_reference AS "invoiceReference",
       notes,
       created_at AS "createdAt"`,
    [supplierId, itemDescription, cost, currency, purchaseDate, qualityRating, jobReference, invoiceReference, notes, actor?.userId || null]
  );

  await db.query('UPDATE suppliers SET updated_at = NOW() WHERE id = $1::uuid', [supplierId]);
  const purchase = { ...res.rows[0], cost: Number(res.rows[0].cost) };

  await audit(actor, 'create', purchase.id, `Recorded purchase from ${supRes.rows[0].name}: ${itemDescription} (AED ${cost})`, {
    supplierId,
    cost,
    qualityRating,
  });

  return purchase;
}

/**
 * Delete purchase from buy history
 */
export async function deleteSupplierPurchase(supplierId, purchaseId, actor = {}) {
  const res = await db.query(
    `DELETE FROM supplier_purchases WHERE id = $1::uuid AND supplier_id = $2::uuid RETURNING id, item_description AS "itemDescription", cost`,
    [purchaseId, supplierId]
  );
  if (!res.rows.length) {
    throw Object.assign(new Error('Purchase record not found.'), { status: 404 });
  }
  await db.query('UPDATE suppliers SET updated_at = NOW() WHERE id = $1::uuid', [supplierId]);
  await audit(actor, 'delete', purchaseId, `Removed purchase entry: ${res.rows[0].itemDescription}`, { supplierId });
  return { ok: true, id: purchaseId };
}
