CREATE TABLE IF NOT EXISTS purchase_returns (
    id TEXT PRIMARY KEY,
    return_no TEXT UNIQUE NOT NULL,
    invoice_id TEXT REFERENCES purchase_invoices(id),
    supplier_id TEXT REFERENCES business_partners(id),
    branch_id TEXT REFERENCES branches(id),
    warehouse_id TEXT REFERENCES warehouses(id),
    date DATE NOT NULL,
    currency_id TEXT DEFAULT 'ILS',
    exchange_rate REAL DEFAULT 1,
    subtotal REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'DRAFT',
    journal_header_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS purchase_return_lines (
    id TEXT PRIMARY KEY,
    return_id TEXT REFERENCES purchase_returns(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id),
    unit_id TEXT REFERENCES units(id),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    tax_amount REAL DEFAULT 0,
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_preturn_supplier ON purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_preturn_date ON purchase_returns(date);
