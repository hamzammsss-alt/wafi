-- ============================================================================
-- WAFI ERP - Import/Export Module Complete Schema
-- Version: 31
-- Date: 2026-01-16
-- Description: Comprehensive schema for Import/Export operations including
--              Commercial Invoices, Clearance Expenses, Document Management,
--              Landed Cost Allocation, and Export Documentation
-- ============================================================================

-- ============================================================================
-- 1. COMMERCIAL INVOICES (فواتير الشراء الخارجية)
-- ============================================================================

CREATE TABLE IF NOT EXISTS commercial_invoices (
    id TEXT PRIMARY KEY,
    invoice_no TEXT UNIQUE NOT NULL,
    shipment_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    currency_id TEXT NOT NULL DEFAULT 'USD',
    exchange_rate REAL DEFAULT 1.0,
    total_amount REAL DEFAULT 0,
    payment_terms TEXT,
    incoterms TEXT, -- FOB, CIF, EXW, etc.
    status TEXT DEFAULT 'DRAFT', -- DRAFT, POSTED, PAID
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (shipment_id) REFERENCES import_shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES partners(id)
);

CREATE INDEX IF NOT EXISTS idx_commercial_invoices_shipment ON commercial_invoices(shipment_id);
CREATE INDEX IF NOT EXISTS idx_commercial_invoices_supplier ON commercial_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_commercial_invoices_date ON commercial_invoices(invoice_date);

CREATE TABLE IF NOT EXISTS commercial_invoice_lines (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    item_id TEXT,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    total_price REAL NOT NULL DEFAULT 0,
    weight_kg REAL DEFAULT 0,
    volume_cbm REAL DEFAULT 0,
    hs_code TEXT, -- Harmonized System Code for customs
    FOREIGN KEY (invoice_id) REFERENCES commercial_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE INDEX IF NOT EXISTS idx_commercial_invoice_lines_invoice ON commercial_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_commercial_invoice_lines_item ON commercial_invoice_lines(item_id);

-- ============================================================================
-- 2. CLEARANCE EXPENSES (مصاريف التخليص)
-- ============================================================================
-- 2. CLEARANCE EXPENSES (مصاريف التخليص)
-- ============================================================================

DROP TABLE IF EXISTS clearance_expenses;
CREATE TABLE IF NOT EXISTS clearance_expenses (
    id TEXT PRIMARY KEY,
    expense_no TEXT UNIQUE NOT NULL,
    shipment_id TEXT NOT NULL,
    expense_date DATE NOT NULL,
    expense_type TEXT NOT NULL, -- CUSTOMS, TAX, TRANSPORT, INSURANCE, BROKER_FEE, PORT_FEES, etc.
    description TEXT,
    amount REAL NOT NULL DEFAULT 0,
    currency_id TEXT NOT NULL DEFAULT 'ILS',
    exchange_rate REAL DEFAULT 1.0,
    amount_base_currency REAL, -- Converted to base currency
    allocation_method TEXT DEFAULT 'VALUE', -- VALUE, WEIGHT, VOLUME, MANUAL
    is_allocated BOOLEAN DEFAULT 0,
    payment_method TEXT, -- CASH, BANK, CHECK
    paid_to TEXT, -- Customs broker, shipping company, etc.
    payment_reference TEXT,
    journal_entry_id TEXT, -- Link to GL entry
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (shipment_id) REFERENCES import_shipments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clearance_expenses_shipment ON clearance_expenses(shipment_id);
CREATE INDEX IF NOT EXISTS idx_clearance_expenses_date ON clearance_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_clearance_expenses_type ON clearance_expenses(expense_type);

-- ============================================================================
-- 3. SHIPMENT DOCUMENTS (المستندات المرفقة)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipment_documents (
    id TEXT PRIMARY KEY,
    shipment_id TEXT NOT NULL,
    document_type TEXT NOT NULL, -- BILL_OF_LADING, COMMERCIAL_INVOICE, CERTIFICATE_OF_ORIGIN, PACKING_LIST, etc.
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by TEXT,
    notes TEXT,
    FOREIGN KEY (shipment_id) REFERENCES import_shipments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shipment_documents_shipment ON shipment_documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_documents_type ON shipment_documents(document_type);

-- ============================================================================
-- 4. LANDED COST ALLOCATIONS (توزيع التكاليف)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landed_cost_allocations (
    id TEXT PRIMARY KEY,
    shipment_id TEXT NOT NULL,
    allocation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    allocation_method TEXT NOT NULL, -- VALUE, WEIGHT, VOLUME, MANUAL
    total_goods_value REAL NOT NULL DEFAULT 0,
    total_expenses REAL NOT NULL DEFAULT 0,
    total_landed_cost REAL NOT NULL DEFAULT 0,
    journal_entry_id TEXT, -- Link to GL entry
    performed_by TEXT,
    notes TEXT,
    FOREIGN KEY (shipment_id) REFERENCES import_shipments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_landed_cost_allocations_shipment ON landed_cost_allocations(shipment_id);

CREATE TABLE IF NOT EXISTS landed_cost_allocation_details (
    id TEXT PRIMARY KEY,
    allocation_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    fob_value REAL NOT NULL DEFAULT 0,
    weight_kg REAL DEFAULT 0,
    volume_cbm REAL DEFAULT 0,
    allocation_percentage REAL DEFAULT 0,
    allocated_expense REAL NOT NULL DEFAULT 0,
    old_cost REAL DEFAULT 0,
    new_cost REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (allocation_id) REFERENCES landed_cost_allocations(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE INDEX IF NOT EXISTS idx_landed_cost_details_allocation ON landed_cost_allocation_details(allocation_id);
CREATE INDEX IF NOT EXISTS idx_landed_cost_details_item ON landed_cost_allocation_details(item_id);

-- ============================================================================
-- 5. UPDATES TO EXISTING TABLES
-- ============================================================================

-- Update import_shipments table
-- Check if columns exist before adding them

-- Add LC (Letter of Credit) information
ALTER TABLE import_shipments ADD COLUMN lc_number TEXT;
ALTER TABLE import_shipments ADD COLUMN lc_bank TEXT;
ALTER TABLE import_shipments ADD COLUMN lc_opening_date DATE;

-- Add shipping details
ALTER TABLE import_shipments ADD COLUMN port_of_loading TEXT;
ALTER TABLE import_shipments ADD COLUMN shipping_line TEXT;
ALTER TABLE import_shipments ADD COLUMN bl_number TEXT; -- Bill of Lading

-- Add demurrage tracking
ALTER TABLE import_shipments ADD COLUMN demurrage_free_days INTEGER DEFAULT 0;
ALTER TABLE import_shipments ADD COLUMN actual_arrival_date DATE;

-- Add cost allocation flag
ALTER TABLE import_shipments ADD COLUMN is_cost_allocated BOOLEAN DEFAULT 0;
ALTER TABLE import_shipments ADD COLUMN cost_allocation_date DATETIME;

-- Update containers table
ALTER TABLE shipment_containers ADD COLUMN eta DATE; -- Expected Time of Arrival
ALTER TABLE shipment_containers ADD COLUMN ata DATE; -- Actual Time of Arrival
ALTER TABLE shipment_containers ADD COLUMN demurrage_alert_date DATE;
ALTER TABLE shipment_containers ADD COLUMN container_status TEXT DEFAULT 'IN_TRANSIT'; -- IN_TRANSIT, ARRIVED, CLEARED, DELIVERED
ALTER TABLE shipment_containers ADD COLUMN tracking_url TEXT;
ALTER TABLE shipment_containers ADD COLUMN notes TEXT;

-- ============================================================================
-- 6. EXPORT TABLES (for future implementation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS export_invoices (
    id TEXT PRIMARY KEY,
    invoice_no TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    currency_id TEXT NOT NULL DEFAULT 'USD',
    exchange_rate REAL DEFAULT 1.0,
    total_amount REAL DEFAULT 0,
    payment_terms TEXT,
    incoterms TEXT,
    destination_country TEXT,
    destination_port TEXT,
    status TEXT DEFAULT 'DRAFT',
    is_zero_rated BOOLEAN DEFAULT 1, -- Export invoices are usually zero-rated for VAT
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (customer_id) REFERENCES partners(id)
);

CREATE TABLE IF NOT EXISTS export_invoice_lines (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    item_id TEXT,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    total_price REAL NOT NULL DEFAULT 0,
    weight_kg REAL DEFAULT 0,
    volume_cbm REAL DEFAULT 0,
    hs_code TEXT,
    FOREIGN KEY (invoice_id) REFERENCES export_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS packing_lists (
    id TEXT PRIMARY KEY,
    packing_list_no TEXT UNIQUE NOT NULL,
    export_invoice_id TEXT NOT NULL,
    packing_date DATE NOT NULL,
    total_packages INTEGER DEFAULT 0,
    total_gross_weight REAL DEFAULT 0,
    total_net_weight REAL DEFAULT 0,
    total_volume REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (export_invoice_id) REFERENCES export_invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS packing_list_items (
    id TEXT PRIMARY KEY,
    packing_list_id TEXT NOT NULL,
    package_no INTEGER,
    item_id TEXT,
    description TEXT,
    quantity REAL DEFAULT 0,
    gross_weight REAL DEFAULT 0,
    net_weight REAL DEFAULT 0,
    dimensions TEXT, -- e.g., "100x50x30 cm"
    FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- ============================================================================
-- 7. VIEWS FOR REPORTING
-- ============================================================================

-- View: Shipment Cost Summary
CREATE VIEW IF NOT EXISTS v_shipment_cost_summary AS
SELECT 
    s.id AS shipment_id,
    s.shipment_no,
    s.supplier_id,
    s.status,
    COALESCE(SUM(ci.total_amount * ci.exchange_rate), 0) AS total_goods_value,
    COALESCE(SUM(ce.amount_base_currency), 0) AS total_expenses,
    COALESCE(SUM(ci.total_amount * ci.exchange_rate), 0) + COALESCE(SUM(ce.amount_base_currency), 0) AS total_cost,
    s.is_cost_allocated
FROM import_shipments s
LEFT JOIN commercial_invoices ci ON s.id = ci.shipment_id
LEFT JOIN clearance_expenses ce ON s.id = ce.shipment_id
GROUP BY s.id;

-- View: Container Demurrage Alerts
CREATE VIEW IF NOT EXISTS v_container_demurrage_alerts AS
SELECT 
    c.id,
    c.container_no,
    c.shipment_id,
    s.shipment_no,
    c.eta,
    c.ata,
    s.demurrage_free_days,
    c.demurrage_alert_date,
    CASE 
        WHEN c.demurrage_alert_date <= DATE('now') THEN 'URGENT'
        WHEN c.demurrage_alert_date <= DATE('now', '+3 days') THEN 'WARNING'
        ELSE 'OK'
    END AS alert_status
FROM shipment_containers c
INNER JOIN import_shipments s ON c.shipment_id = s.id
WHERE c.container_status IN ('IN_TRANSIT', 'ARRIVED')
ORDER BY c.demurrage_alert_date;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Trigger: Update commercial_invoices total when lines change
CREATE TRIGGER IF NOT EXISTS trg_update_commercial_invoice_total
AFTER INSERT ON commercial_invoice_lines
BEGIN
    UPDATE commercial_invoices
    SET total_amount = (
        SELECT SUM(total_price)
        FROM commercial_invoice_lines
        WHERE invoice_id = NEW.invoice_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_update_commercial_invoice_total_update
AFTER UPDATE ON commercial_invoice_lines
BEGIN
    UPDATE commercial_invoices
    SET total_amount = (
        SELECT SUM(total_price)
        FROM commercial_invoice_lines
        WHERE invoice_id = NEW.invoice_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.invoice_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_update_commercial_invoice_total_delete
AFTER DELETE ON commercial_invoice_lines
BEGIN
    UPDATE commercial_invoices
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM commercial_invoice_lines
        WHERE invoice_id = OLD.invoice_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.invoice_id;
END;

-- Trigger: Calculate amount in base currency for clearance expenses
CREATE TRIGGER IF NOT EXISTS trg_calculate_clearance_expense_base
BEFORE INSERT ON clearance_expenses
BEGIN
    UPDATE clearance_expenses
    SET amount_base_currency = NEW.amount * NEW.exchange_rate
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_calculate_clearance_expense_base_update
BEFORE UPDATE ON clearance_expenses
BEGIN
    UPDATE clearance_expenses
    SET amount_base_currency = NEW.amount * NEW.exchange_rate
    WHERE id = NEW.id;
END;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
