-- SQLite 3.x Schema
-- ================================================================
-- V29 IMPORT & EXPORT MODULE
-- Separate module for managing LCs, Shipments, and Landed Cost
-- ================================================================

-- 1. IMPORT SHIPMENTS (Files)
CREATE TABLE IF NOT EXISTS import_shipments (
    id TEXT PRIMARY KEY,
    shipment_no TEXT NOT NULL UNIQUE, -- SHP-2026-001 or FILE-2026-001
    
    reference_number TEXT, -- Proforma Invoice No / LC Number
    supplier_id TEXT NOT NULL,
    origin_country TEXT,
    port_of_arrival TEXT, -- Ashdod, Haifa, Allenby
    
    status TEXT DEFAULT 'OPEN', -- OPEN, AT_SEA, AT_PORT, CLEARING, CLOSED
    
    currency_id TEXT NOT NULL, -- The main currency of the LC (e.g. USD)
    exchange_rate REAL DEFAULT 1, -- Rate locked or est.
    
    bank_id TEXT, -- Opening Bank
    
    opening_date DATE DEFAULT CURRENT_DATE,
    arrival_date_est DATE,
    arrival_date_actual DATE,
    closing_date DATE,
    
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    
    FOREIGN KEY (supplier_id) REFERENCES business_partners(id),
    FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

-- 2. SHIPMENT CONTAINERS
CREATE TABLE IF NOT EXISTS shipment_containers (
    id TEXT PRIMARY KEY,
    shipment_id TEXT NOT NULL,
    
    container_no TEXT NOT NULL,
    size TEXT, -- 20ft, 40ft, 40ft HC
    seal_no TEXT,
    
    bill_of_lading TEXT, -- BL Number (can share across containers)
    
    gross_weight REAL DEFAULT 0,
    net_weight REAL DEFAULT 0,
    cbm REAL DEFAULT 0, -- Cubic Meters
    
    demurrage_start_date DATE, -- When free days end
    
    FOREIGN KEY (shipment_id) REFERENCES import_shipments(id) ON DELETE CASCADE
);

-- 3. CLEARANCE EXPENSES (Taxes, Transport, etc. paid in local currency usually)
CREATE TABLE IF NOT EXISTS clearance_expenses (
    id TEXT PRIMARY KEY,
    shipment_id TEXT NOT NULL,
    
    expense_type TEXT NOT NULL, -- CUSTOMS, PURCHASE_TAX, TRANSPORT, PORT_FEES, STORAGE, INSURANCE, COMMISSION, OTHER
    reference_doc TEXT, -- Clearance Invoice No / Receipt No
    
    vendor_id TEXT, -- The Customs Broker, Transporter, or Ministry
    
    amount_local REAL NOT NULL, -- Usually paid in NIS
    tax_amount REAL DEFAULT 0, -- VAT if applicable
    
    is_allocatable INTEGER DEFAULT 1, -- Should this be added to item cost? (VAT is usually NO)
    allocation_method TEXT DEFAULT 'VALUE', -- VALUE, WEIGHT, CBM, MANUAL
    
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shipment_id) REFERENCES import_shipments(id) ON DELETE CASCADE
    -- FOREIGN KEY (vendor_id) REFERENCES business_partners(id)
);

-- 4. COST ALLOCATION HISTORY (Landed Cost)
CREATE TABLE IF NOT EXISTS landed_cost_allocations (
    id TEXT PRIMARY KEY,
    shipment_id TEXT NOT NULL,
    
    item_id TEXT NOT NULL,
    batch_id TEXT, -- If tracking specific batch
    
    original_fob_cost_fc REAL NOT NULL, -- Cost in Foreign Currency
    exchange_rate_used REAL DEFAULT 1,
    original_fob_cost_local REAL NOT NULL, -- Cost in Local Currency
    
    allocated_customs REAL DEFAULT 0,
    allocated_transport REAL DEFAULT 0,
    allocated_other REAL DEFAULT 0,
    
    final_landed_cost REAL NOT NULL, -- Unit Cost in Warehouse
    
    allocation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shipment_id) REFERENCES import_shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- 5. EXPORT DOCUMENTS (Simplified)
CREATE TABLE IF NOT EXISTS export_shipments (
    id TEXT PRIMARY KEY,
    shipment_no TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    
    invoice_id TEXT, -- Link to Sales Invoice (Zero Tax)
    
    destination_country TEXT,
    port_of_loading TEXT,
    port_of_discharge TEXT,
    
    loading_date DATE,
    driver_details TEXT,
    vehicle_no TEXT,
    
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES business_partners(id)
);

-- 6. CLEARANCE DATA (For Local Purchase Invoices - Moqasa)
-- Adding fields to existing purchase_invoices table
-- NOTE:
-- These columns already exist in schema_v5_purchasing.sql.
-- Keep v29 focused on import/export tables to avoid duplicate-column failures
-- when validating the full schema chain from v1..v41.

