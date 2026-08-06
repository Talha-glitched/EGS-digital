-- EGS ERP: append-only inventory movements, serialized assets, reservations and packing.

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(150) UNIQUE,
    name VARCHAR(255) NOT NULL,
    tracking_mode VARCHAR(30) NOT NULL CHECK (tracking_mode IN ('serialized', 'quantity_reusable', 'consumable')),
    uom_id UUID REFERENCES uoms(id) ON DELETE SET NULL,
    reorder_level NUMERIC(15,4) CHECK (reorder_level IS NULL OR reorder_level >= 0),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(150) UNIQUE,
    name VARCHAR(255) NOT NULL,
    location_type VARCHAR(30) NOT NULL CHECK (location_type IN ('warehouse', 'bin', 'vehicle', 'site', 'temporary')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    asset_tag VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(150) NOT NULL UNIQUE,
    serial_number VARCHAR(150),
    purchase_date DATE,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    inventory_asset_id UUID REFERENCES inventory_assets(id) ON DELETE RESTRICT,
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
    note TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_reservation_date_order CHECK (ends_at >= starts_at),
    CONSTRAINT serialized_reservation_quantity CHECK (inventory_asset_id IS NULL OR quantity = 1)
);

CREATE TABLE IF NOT EXISTS inventory_packing_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ongoing_job_id UUID NOT NULL REFERENCES ongoing_jobs(id) ON DELETE CASCADE,
    reference VARCHAR(100) NOT NULL,
    origin_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    destination_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'packed', 'dispatched', 'returned', 'cancelled')),
    note TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ongoing_job_id, reference)
);

CREATE TABLE IF NOT EXISTS inventory_packing_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    packing_list_id UUID NOT NULL REFERENCES inventory_packing_lists(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    inventory_asset_id UUID REFERENCES inventory_assets(id) ON DELETE RESTRICT,
    quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT serialized_packing_quantity CHECK (inventory_asset_id IS NULL OR quantity = 1)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    inventory_asset_id UUID REFERENCES inventory_assets(id) ON DELETE RESTRICT,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('receipt', 'transfer', 'checkout', 'consumption', 'return', 'damage', 'loss', 'adjustment')),
    quantity NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
    from_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    to_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    ongoing_job_id UUID REFERENCES ongoing_jobs(id) ON DELETE SET NULL,
    work_package_id UUID REFERENCES job_scope_lines(id) ON DELETE SET NULL,
    job_activity_id UUID REFERENCES job_activities(id) ON DELETE SET NULL,
    packing_list_id UUID REFERENCES inventory_packing_lists(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(150) NOT NULL UNIQUE,
    note TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT serialized_movement_quantity CHECK (inventory_asset_id IS NULL OR quantity = 1),
    CONSTRAINT inventory_movement_has_location CHECK (from_location_id IS NOT NULL OR to_location_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(status, tracking_mode, name);
CREATE INDEX IF NOT EXISTS idx_inventory_assets_item ON inventory_assets(inventory_item_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_job ON inventory_reservations(ongoing_job_id, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_inventory_packing_job ON inventory_packing_lists(ongoing_job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(inventory_item_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_asset ON inventory_movements(inventory_asset_id, occurred_at DESC) WHERE inventory_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_job ON inventory_movements(ongoing_job_id, occurred_at DESC) WHERE ongoing_job_id IS NOT NULL;
