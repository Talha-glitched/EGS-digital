-- EGS ERP & Commercial CRM Migration 34: Suppliers with Buy History and Outsource Labour Directory

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(100),
    email VARCHAR(255),
    service TEXT, -- services or materials supplied (e.g., "Aluminium Fabrication, Glass & CNC")
    address TEXT,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS supplier_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    cost NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'AED',
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quality_rating INTEGER CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
    job_reference VARCHAR(255),
    invoice_reference VARCHAR(100),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outsource_labour (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    phone VARCHAR(100),
    email VARCHAR(255),
    trade VARCHAR(100) NOT NULL, -- e.g. plasterer, carpenter, painter, helper, electrician
    daily_rate NUMERIC(12,2) CHECK (daily_rate IS NULL OR daily_rate >= 0),
    hourly_rate NUMERIC(12,2) CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'available', 'busy', 'inactive')),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_supplier ON supplier_purchases(supplier_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_outsource_labour_trade ON outsource_labour(trade, status) WHERE deleted_at IS NULL;
