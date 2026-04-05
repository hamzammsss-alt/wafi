-- ================================================================
-- V27 STOCK TAKE (Physical Inventory)
-- Tables for managing Stock Counts and Adjustments
-- ================================================================

CREATE TABLE IF NOT EXISTS stock_takes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL, -- ST-2024-001
    warehouse_id TEXT NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, POSTED, CANCELLED
    type TEXT DEFAULT 'FULL', -- FULL, PARTIAL (by Category/Bin)
    notes TEXT,
    created_by TEXT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS stock_take_items (
    id TEXT PRIMARY KEY,
    stock_take_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    
    snapshot_quantity DECIMAL(18, 4) DEFAULT 0, -- System Qty at moment of creation
    counted_quantity DECIMAL(18, 4) DEFAULT 0,  -- User input
    
    difference DECIMAL(18, 4) GENERATED ALWAYS AS (counted_quantity - snapshot_quantity) VIRTUAL,
    cost_price DECIMAL(18, 4) DEFAULT 0, -- For value adjustment reporting
    
    notes TEXT,
    FOREIGN KEY (stock_take_id) REFERENCES stock_takes(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);
