CREATE TABLE IF NOT EXISTS purchase_rfqs (
    id TEXT PRIMARY KEY,
    request_no TEXT UNIQUE,
    requester_id TEXT,
    branch_id TEXT,
    date TEXT,
    needed_date TEXT,
    status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED, CANCELLED
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY(requester_id) REFERENCES employees(id),
    FOREIGN KEY(branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS purchase_rfq_lines (
    id TEXT PRIMARY KEY,
    rfq_id TEXT,
    item_id TEXT,
    description TEXT,
    quantity REAL DEFAULT 1,
    unit_id TEXT,
    notes TEXT,
    FOREIGN KEY(rfq_id) REFERENCES purchase_rfqs(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id),
    FOREIGN KEY(unit_id) REFERENCES units(id)
);
