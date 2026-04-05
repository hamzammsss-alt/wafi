CREATE TABLE IF NOT EXISTS stock_documents (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    type TEXT CHECK(type IN ('ENTRY', 'ISSUE')) NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    warehouse_id TEXT,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, POSTED, CANCELLED
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_documents_code ON stock_documents(code);
CREATE INDEX IF NOT EXISTS idx_stock_documents_date ON stock_documents(date);
CREATE INDEX IF NOT EXISTS idx_stock_documents_warehouse ON stock_documents(warehouse_id);
