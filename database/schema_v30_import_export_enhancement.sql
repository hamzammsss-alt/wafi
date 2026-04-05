-- ================================================================
-- V30 IMPORT & EXPORT ENHANCEMENTS
-- Adding Proforma Invoices and linking to Shipments
-- ================================================================

-- 1. PROFORMA INVOICES (Draft/Offer from Supplier)
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id TEXT PRIMARY KEY,
    proforma_no TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    
    date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    
    currency_id TEXT NOT NULL,
    exchange_rate REAL DEFAULT 1,
    
    payment_terms TEXT, -- e.g. "30% Advance, 70% BL"
    delivery_terms TEXT, -- e.g. "FOB Shanghai"
    
    status TEXT DEFAULT 'DRAFT', -- DRAFT, APPROVED, CONVERTED, CANCELLED
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    
    FOREIGN KEY (supplier_id) REFERENCES business_partners(id),
    FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

-- 2. PROFORMA LINES
CREATE TABLE IF NOT EXISTS proforma_invoice_lines (
    id TEXT PRIMARY KEY,
    proforma_id TEXT NOT NULL,
    
    item_id TEXT, -- Can be null if it's a new item not yet in system
    item_name TEXT, -- Store name in case it's ad-hoc
    
    description TEXT,
    
    quantity REAL NOT NULL,
    unit_id TEXT,
    
    unit_price REAL NOT NULL, -- FC
    total_price REAL NOT NULL, -- FC
    
    expected_weight_kg REAL DEFAULT 0,
    
    FOREIGN KEY (proforma_id) REFERENCES proforma_invoices(id) ON DELETE CASCADE
    -- FOREIGN KEY (item_id) REFERENCES items(id)
);

-- 3. UPDATE IMPORT SHIPMENTS
-- We need to link Shipment to Proforma
-- ALTER TABLE import_shipments ADD COLUMN proforma_id TEXT REFERENCES proforma_invoices(id);
