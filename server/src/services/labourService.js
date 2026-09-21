import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

function text(value) {
  return String(value ?? '').trim() || null;
}

function rate(value, field = 'Rate') {
  if (value === '' || value == null) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw Object.assign(new Error(`${field} must be a valid positive number.`), { status: 400 });
  }
  return num;
}

async function audit(actor, action, resourceId, summary, metadata = {}) {
  await writeAuditLog({
    userId: actor?.userId,
    userDisplayName: actor?.displayName || 'EGS Admin',
    action,
    resource: 'outsource_labour',
    resourceId,
    summary,
    metadata,
  }).catch(() => {});
}

let seeded = false;
export async function ensureLabourSeeded() {
  if (seeded) return;
  try {
    const countRes = await db.query('SELECT COUNT(*)::int as count FROM outsource_labour WHERE deleted_at IS NULL');
    if (countRes.rows[0].count === 0) {
      console.info('🌱 Seeding initial outsource labour directory...');
      const seedData = [
        {
          name: 'Rashid Ali',
          contact: '+971 50 234 8901',
          phone: '+971 50 234 8901',
          email: null,
          trade: 'Carpenter',
          dailyRate: 220,
          hourlyRate: 30,
          status: 'active',
          notes: 'Master exhibition stand carpenter: custom counter fabrication, curved counters, laminate & veneer pressing.',
        },
        {
          name: 'Muhammad Nadeem',
          contact: '+971 54 881 2234',
          phone: '+971 54 881 2234',
          email: null,
          trade: 'Carpenter',
          dailyRate: 210,
          hourlyRate: 28,
          status: 'available',
          notes: 'Fast framing, raised flooring installations, and interlocking panel locks.',
        },
        {
          name: 'Muhammad Imran',
          contact: '+971 55 456 1234',
          phone: '+971 55 456 1234',
          email: null,
          trade: 'Painter',
          dailyRate: 180,
          hourlyRate: 25,
          status: 'active',
          notes: 'Duco spray gun specialist: high-gloss PU lacquers, filler smoothing, and final stand touchups.',
        },
        {
          name: 'Govind Raj',
          contact: '+971 52 334 9912',
          phone: '+971 52 334 9912',
          email: null,
          trade: 'Painter',
          dailyRate: 170,
          hourlyRate: 24,
          status: 'available',
          notes: 'Emulsion roller painting, fine line masking, and fast booth clean-finish.',
        },
        {
          name: 'Suresh Kumar',
          contact: '+971 52 789 3456',
          phone: '+971 52 789 3456',
          email: null,
          trade: 'Plasterer',
          dailyRate: 180,
          hourlyRate: 25,
          status: 'active',
          notes: 'Gypsum board jointing, skim coat plaster, ceiling cornices & seamless wall preparation for painting.',
        },
        {
          name: 'Anwar Ul Haq',
          contact: '+971 55 612 8901',
          phone: '+971 55 612 8901',
          email: null,
          trade: 'Plasterer',
          dailyRate: 190,
          hourlyRate: 26,
          status: 'available',
          notes: 'Rapid plastering and joint compound filling for DWTC exhibition overnight turnover.',
        },
        {
          name: 'Bilal Ahmed',
          contact: '+971 54 321 9876',
          phone: '+971 54 321 9876',
          email: null,
          trade: 'Helper',
          dailyRate: 130,
          hourlyRate: 18,
          status: 'active',
          notes: 'Experienced site helper: material loading, unloading, stand assembly support, and site clean-up.',
        },
        {
          name: 'Ratan Singh',
          contact: '+971 56 778 4410',
          phone: '+971 56 778 4410',
          email: null,
          trade: 'Helper',
          dailyRate: 130,
          hourlyRate: 18,
          status: 'available',
          notes: 'General site worker: holds DWTC security badge, steel-toe boots & PPE equipped.',
        },
      ];

      for (const item of seedData) {
        await db.query(
          `INSERT INTO outsource_labour (name, contact, phone, email, trade, daily_rate, hourly_rate, status, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [item.name, item.contact, item.phone, item.email, item.trade, item.dailyRate, item.hourlyRate, item.status, item.notes]
        );
      }
      console.info('✅ Initial outsource labour seeded successfully.');
    }
    seeded = true;
  } catch (err) {
    console.warn('Could not check/seed labour:', err.message);
  }
}

// Auto-seed in background
ensureLabourSeeded();

/**
 * List outsource labour with filtering by trade and search
 */
export async function listLabour({
  search,
  trade,
  status = 'all',
  page = 1,
  limit = 50,
  sortKey = 'name',
  sortDir = 'asc',
} = {}) {
  await ensureLabourSeeded();

  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (trade && trade !== 'all') {
    params.push(trade);
    conditions.push(`LOWER(trade) = LOWER($${params.length})`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(
      name ILIKE $${params.length} OR
      contact ILIKE $${params.length} OR
      phone ILIKE $${params.length} OR
      email ILIKE $${params.length} OR
      trade ILIKE $${params.length} OR
      notes ILIKE $${params.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortMap = {
    name: 'name',
    trade: 'trade',
    contact: 'contact',
    dailyRate: 'daily_rate',
    hourlyRate: 'hourly_rate',
    status: 'status',
    createdAt: 'created_at',
  };

  const orderColumn = sortMap[sortKey] || 'name';
  const orderDirection = String(sortDir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const offset = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));
  const limitValue = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const query = `
    SELECT 
      id,
      name,
      contact,
      phone,
      email,
      trade,
      daily_rate::numeric AS "dailyRate",
      hourly_rate::numeric AS "hourlyRate",
      status,
      notes,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM outsource_labour
    ${whereClause}
    ORDER BY ${orderColumn} ${orderDirection} NULLS LAST
    LIMIT ${limitValue} OFFSET ${offset}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM outsource_labour
    ${whereClause}
  `;

  const statsQuery = `
    SELECT 
      COUNT(*)::int AS "totalLabour",
      COUNT(*) FILTER (WHERE LOWER(trade) = 'carpenter')::int AS "carpenters",
      COUNT(*) FILTER (WHERE LOWER(trade) = 'painter')::int AS "painters",
      COUNT(*) FILTER (WHERE LOWER(trade) IN ('plasterer', 'paster'))::int AS "plasterers",
      COUNT(*) FILTER (WHERE LOWER(trade) = 'helper')::int AS "helpers",
      COUNT(*) FILTER (WHERE status = 'active')::int AS "activeCount",
      COUNT(*) FILTER (WHERE status = 'available')::int AS "availableCount"
    FROM outsource_labour
    WHERE deleted_at IS NULL
  `;

  const tradesQuery = `
    SELECT DISTINCT trade FROM outsource_labour WHERE deleted_at IS NULL AND trade IS NOT NULL ORDER BY trade
  `;

  const [itemsRes, countRes, statsRes, tradesRes] = await Promise.all([
    db.query(query, params),
    db.query(countQuery, params),
    db.query(statsQuery),
    db.query(tradesQuery),
  ]);

  return {
    items: itemsRes.rows.map((row) => ({
      ...row,
      dailyRate: row.dailyRate == null ? null : Number(row.dailyRate),
      hourlyRate: row.hourlyRate == null ? null : Number(row.hourlyRate),
    })),
    total: countRes.rows[0]?.total || 0,
    stats: statsRes.rows[0] || {
      totalLabour: 0,
      carpenters: 0,
      painters: 0,
      plasterers: 0,
      helpers: 0,
      activeCount: 0,
      availableCount: 0,
    },
    trades: tradesRes.rows.map((r) => r.trade),
  };
}

/**
 * Get outsource labour by ID
 */
export async function getLabourById(id) {
  const res = await db.query(
    `SELECT 
       id,
       name,
       contact,
       phone,
       email,
       trade,
       daily_rate::numeric AS "dailyRate",
       hourly_rate::numeric AS "hourlyRate",
       status,
       notes,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM outsource_labour
     WHERE id = $1::uuid AND deleted_at IS NULL`,
    [id]
  );

  if (!res.rows.length) {
    throw Object.assign(new Error('Labour record not found.'), { status: 404 });
  }

  const row = res.rows[0];
  return {
    ...row,
    dailyRate: row.dailyRate == null ? null : Number(row.dailyRate),
    hourlyRate: row.hourlyRate == null ? null : Number(row.hourlyRate),
  };
}

/**
 * Create outsource labour
 */
export async function createLabour(payload = {}, actor = {}) {
  const name = text(payload.name);
  if (!name) {
    throw Object.assign(new Error('Labourer name is required.'), { status: 400 });
  }

  const contact = text(payload.contact) || text(payload.phone);
  if (!contact) {
    throw Object.assign(new Error('Contact phone or details are required.'), { status: 400 });
  }

  const trade = text(payload.trade);
  if (!trade) {
    throw Object.assign(new Error('Trade / role is required (e.g. Carpenter, Painter, Plasterer, Helper).'), { status: 400 });
  }

  const phone = text(payload.phone) || contact;
  const email = text(payload.email);
  const dailyRate = rate(payload.dailyRate, 'Daily rate');
  const hourlyRate = rate(payload.hourlyRate, 'Hourly rate');
  const status = ['active', 'available', 'busy', 'inactive'].includes(payload.status) ? payload.status : 'active';
  const notes = text(payload.notes);

  const res = await db.query(
    `INSERT INTO outsource_labour (name, contact, phone, email, trade, daily_rate, hourly_rate, status, notes, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid)
     RETURNING 
       id,
       name,
       contact,
       phone,
       email,
       trade,
       daily_rate::numeric AS "dailyRate",
       hourly_rate::numeric AS "hourlyRate",
       status,
       notes,
       created_at AS "createdAt"`,
    [name, contact, phone, email, trade, dailyRate, hourlyRate, status, notes, actor?.userId || null]
  );

  const labour = {
    ...res.rows[0],
    dailyRate: res.rows[0].dailyRate == null ? null : Number(res.rows[0].dailyRate),
    hourlyRate: res.rows[0].hourlyRate == null ? null : Number(res.rows[0].hourlyRate),
  };

  await audit(actor, 'create', labour.id, `Added outsource labour: ${name} (${trade})`);
  return labour;
}

/**
 * Update outsource labour
 */
export async function updateLabour(id, payload = {}, actor = {}) {
  const current = await db.query('SELECT * FROM outsource_labour WHERE id = $1::uuid AND deleted_at IS NULL', [id]);
  if (!current.rows.length) {
    throw Object.assign(new Error('Labour record not found.'), { status: 404 });
  }

  const row = current.rows[0];
  const name = Object.hasOwn(payload, 'name') ? text(payload.name) || row.name : row.name;
  const contact = Object.hasOwn(payload, 'contact') ? text(payload.contact) || row.contact : row.contact;
  const phone = Object.hasOwn(payload, 'phone') ? text(payload.phone) : row.phone;
  const email = Object.hasOwn(payload, 'email') ? text(payload.email) : row.email;
  const trade = Object.hasOwn(payload, 'trade') ? text(payload.trade) || row.trade : row.trade;
  const dailyRate = Object.hasOwn(payload, 'dailyRate') ? rate(payload.dailyRate, 'Daily rate') : row.daily_rate;
  const hourlyRate = Object.hasOwn(payload, 'hourlyRate') ? rate(payload.hourlyRate, 'Hourly rate') : row.hourly_rate;
  const status = Object.hasOwn(payload, 'status')
    ? (['active', 'available', 'busy', 'inactive'].includes(payload.status) ? payload.status : row.status)
    : row.status;
  const notes = Object.hasOwn(payload, 'notes') ? text(payload.notes) : row.notes;

  const res = await db.query(
    `UPDATE outsource_labour 
     SET name = $2, contact = $3, phone = $4, email = $5, trade = $6, daily_rate = $7, hourly_rate = $8, status = $9, notes = $10, updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING 
       id,
       name,
       contact,
       phone,
       email,
       trade,
       daily_rate::numeric AS "dailyRate",
       hourly_rate::numeric AS "hourlyRate",
       status,
       notes,
       updated_at AS "updatedAt"`,
    [id, name, contact, phone, email, trade, dailyRate, hourlyRate, status, notes]
  );

  const updated = {
    ...res.rows[0],
    dailyRate: res.rows[0].dailyRate == null ? null : Number(res.rows[0].dailyRate),
    hourlyRate: res.rows[0].hourlyRate == null ? null : Number(res.rows[0].hourlyRate),
  };

  await audit(actor, 'update', id, `Updated outsource labour: ${updated.name} (${updated.trade})`);
  return updated;
}

/**
 * Delete outsource labour (soft delete)
 */
export async function deleteLabour(id, actor = {}) {
  const res = await db.query(
    `UPDATE outsource_labour SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1::uuid AND deleted_at IS NULL RETURNING id, name, trade`,
    [id]
  );
  if (!res.rows.length) {
    throw Object.assign(new Error('Labour record not found.'), { status: 404 });
  }
  await audit(actor, 'delete', id, `Deleted outsource labour: ${res.rows[0].name} (${res.rows[0].trade})`);
  return { ok: true, id };
}
