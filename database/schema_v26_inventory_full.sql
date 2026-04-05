-- ================================================================
-- V26 INVENTORY FULL MODULE
-- Comprehensive schema for Item Master (7 Tabs), Warehouses, and Transactions
-- ================================================================

-- 1. EXTENDED ITEM MASTER (Updating/Replacing basic concepts)
-- We'll assume 'items' table exists but needs many new columns.
-- SQLite ALTER TABLE is limited, so we add columns safely.

ALTER TABLE items ADD COLUMN trade_name TEXT; -- الاسم التجاري
ALTER TABLE items ADD COLUMN name_he TEXT; -- الاسم العبري
-- ALTER TABLE items ADD COLUMN brand_id TEXT REFERENCES brands(id); -- Already added in schema_v18
ALTER TABLE items ADD COLUMN tax_type TEXT DEFAULT 'VAT_16'; -- VAT_16, EXEMPT, ZERO
ALTER TABLE items ADD COLUMN is_service INTEGER DEFAULT 0; -- 1 = Service (No Stock)
-- ALTER TABLE items ADD COLUMN is_active INTEGER DEFAULT 1;

-- Costing & Pricing Extended
ALTER TABLE items ADD COLUMN costing_method TEXT DEFAULT 'WEIGHTED_AVG'; -- WEIGHTED_AVG, FIFO, STANDARD
ALTER TABLE items ADD COLUMN standard_cost DECIMAL(18, 4) DEFAULT 0;
ALTER TABLE items ADD COLUMN floor_price DECIMAL(18, 4) DEFAULT 0; -- أقل سعر بيع

-- Flags for Tabs
ALTER TABLE items ADD COLUMN has_expiry INTEGER DEFAULT 0; -- Tab 6: Batch/Expiry
ALTER TABLE items ADD COLUMN has_serial INTEGER DEFAULT 0; -- Tab 6: Serial Numbers
ALTER TABLE items ADD COLUMN shelf_life_days INTEGER DEFAULT 0; -- أيام الصلاحية الافتراضية
ALTER TABLE items ADD COLUMN default_warehouse_id TEXT REFERENCES warehouses(id); -- المستودع الافتراضي

-- Create Price Lists (Tab 3: Pricing)
CREATE TABLE IF NOT EXISTS price_lists (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    currency_id TEXT,
    is_active INTEGER DEFAULT 1
);

-- Item Prices per List & Unit
CREATE TABLE IF NOT EXISTS item_prices (
    id TEXT PRIMARY KEY,
    price_list_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unit_id TEXT NOT NULL, -- السعر للوحدة الفلانية (حبة، كرتونة)
    price DECIMAL(18, 4) DEFAULT 0,
    FOREIGN KEY (price_list_id) REFERENCES price_lists(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- 2. BATCHES & SERIALS (Tab 6)
CREATE TABLE IF NOT EXISTS item_batches (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    expiry_date DATE,
    manufacturing_date DATE,
    quantity DECIMAL(18, 4) DEFAULT 0, -- Current visible qty across all WH (calculated) or cached
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS item_serials (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    status TEXT DEFAULT 'AVAILABLE', -- AVAILABLE, SOLD, RETURNED, DEFECTIVE
    current_warehouse_id TEXT, -- Where is it now?
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- 3. ALTERNATIVES (Tab 7)
CREATE TABLE IF NOT EXISTS item_alternatives (
    item_id TEXT NOT NULL,
    alternative_item_id TEXT NOT NULL,
    note TEXT,
    PRIMARY KEY (item_id, alternative_item_id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (alternative_item_id) REFERENCES items(id)
);

-- 4. INVENTORY TRANSACTIONS (Refined)
-- Ensures we capture all movements
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL, -- PURCHASE, SALE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, ASSEMBLY_BUILD, ASSEMBLY_USE
    ref_document_type TEXT, -- INVOICE, BILL, TRANSFER, STOCK_TAKE
    ref_document_id TEXT,
    
    warehouse_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    
    quantity DECIMAL(18, 4) NOT NULL, -- Positive for IN, Negative for OUT
    unit_cost DECIMAL(18, 4) DEFAULT 0,
    total_cost DECIMAL(18, 4) DEFAULT 0,
    
    -- Specific Tracking
    batch_id TEXT, -- Optional linkage
    serial_id TEXT, -- Optional linkage
    
    created_by TEXT,
    notes TEXT,
    
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (batch_id) REFERENCES item_batches(id)
);

-- 5. STOCK TRANSFER REQUESTS (Transit)
CREATE TABLE IF NOT EXISTS stock_transfers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL, -- TR-2024-001
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    from_warehouse_id TEXT NOT NULL,
    to_warehouse_id TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, IN_TRANSIT, COMPLETED, CANCELLED
    
    driver_name TEXT,
    vehicle_no TEXT,
    notes TEXT,
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unit_id TEXT,
    quantity DECIMAL(18, 4) NOT NULL,
    received_quantity DECIMAL(18, 4) DEFAULT 0, -- For partial receipt
    FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id)
);

-- 6. KITTING / ASSEMBLY (Tab 16 in Task)
CREATE TABLE IF NOT EXISTS item_kits (
    parent_item_id TEXT NOT NULL, -- The Kit (Finished Good)
    child_item_id TEXT NOT NULL, -- Component
    quantity DECIMAL(18, 4) NOT NULL,
    PRIMARY KEY (parent_item_id, child_item_id),
    FOREIGN KEY (parent_item_id) REFERENCES items(id),
    FOREIGN KEY (child_item_id) REFERENCES items(id)
);
