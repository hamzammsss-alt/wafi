CREATE TABLE IF NOT EXISTS stock_documents (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    type TEXT CHECK(type IN ('ENTRY', 'ISSUE', 'DISPATCH')) NOT NULL,
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

CREATE TABLE IF NOT EXISTS stock_document_lines (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    cost REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES stock_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE INDEX IF NOT EXISTS idx_stock_document_lines_document ON stock_document_lines(document_id);
CREATE INDEX IF NOT EXISTS idx_stock_document_lines_item ON stock_document_lines(item_id);
