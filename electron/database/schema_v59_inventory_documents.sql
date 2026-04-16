-- Schema V59: Inventory Documents + Stock Ledger Posting Foundation
-- Clean inventory document model with audit-safe posting/reversal support.

CREATE TABLE IF NOT EXISTS inventory_documents (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('GOODS_RECEIPT', 'GOODS_ISSUE', 'STOCK_TRANSFER', 'STOCK_ADJUSTMENT')),
    doc_no TEXT NOT NULL,
    doc_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    warehouse_id TEXT,
    to_warehouse_id TEXT,
    reference_no TEXT,
    remarks TEXT,
    currency_code TEXT NOT NULL DEFAULT 'ILS',
    currency_rate REAL NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    journal_id TEXT,
    reversal_journal_id TEXT,
    posted_at TEXT,
    posted_by TEXT,
    reversed_at TEXT,
    reversed_by TEXT,
    stock_posted_at TEXT,
    stock_reversed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_id) REFERENCES journals(id),
    FOREIGN KEY (reversal_journal_id) REFERENCES journals(id)
);

ALTER TABLE inventory_documents ADD COLUMN company_id TEXT;
ALTER TABLE inventory_documents ADD COLUMN branch_id TEXT;
ALTER TABLE inventory_documents ADD COLUMN doc_type TEXT;
ALTER TABLE inventory_documents ADD COLUMN doc_no TEXT;
ALTER TABLE inventory_documents ADD COLUMN doc_date TEXT;
ALTER TABLE inventory_documents ADD COLUMN status TEXT;
ALTER TABLE inventory_documents ADD COLUMN warehouse_id TEXT;
ALTER TABLE inventory_documents ADD COLUMN to_warehouse_id TEXT;
ALTER TABLE inventory_documents ADD COLUMN reference_no TEXT;
ALTER TABLE inventory_documents ADD COLUMN remarks TEXT;
ALTER TABLE inventory_documents ADD COLUMN currency_code TEXT;
ALTER TABLE inventory_documents ADD COLUMN currency_rate REAL DEFAULT 1;
ALTER TABLE inventory_documents ADD COLUMN created_by TEXT;
ALTER TABLE inventory_documents ADD COLUMN approved_by TEXT;
ALTER TABLE inventory_documents ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE inventory_documents ADD COLUMN journal_id TEXT;
ALTER TABLE inventory_documents ADD COLUMN reversal_journal_id TEXT;
ALTER TABLE inventory_documents ADD COLUMN posted_at TEXT;
ALTER TABLE inventory_documents ADD COLUMN posted_by TEXT;
ALTER TABLE inventory_documents ADD COLUMN reversed_at TEXT;
ALTER TABLE inventory_documents ADD COLUMN reversed_by TEXT;
ALTER TABLE inventory_documents ADD COLUMN stock_posted_at TEXT;
ALTER TABLE inventory_documents ADD COLUMN stock_reversed_at TEXT;
ALTER TABLE inventory_documents ADD COLUMN created_at TEXT;
ALTER TABLE inventory_documents ADD COLUMN updated_at TEXT;

UPDATE inventory_documents
SET company_id = COALESCE(NULLIF(company_id, ''), 'COMP_01')
WHERE company_id IS NULL OR TRIM(company_id) = '';

UPDATE inventory_documents
SET branch_id = COALESCE(NULLIF(branch_id, ''), 'BR_01')
WHERE branch_id IS NULL OR TRIM(branch_id) = '';

UPDATE inventory_documents
SET doc_type = COALESCE(NULLIF(doc_type, ''), 'GOODS_RECEIPT')
WHERE doc_type IS NULL OR TRIM(doc_type) = '';

UPDATE inventory_documents
SET doc_no = COALESCE(NULLIF(doc_no, ''), id)
WHERE doc_no IS NULL OR TRIM(doc_no) = '';

UPDATE inventory_documents
SET doc_date = COALESCE(NULLIF(doc_date, ''), SUBSTR(COALESCE(created_at, CURRENT_TIMESTAMP), 1, 10))
WHERE doc_date IS NULL OR TRIM(doc_date) = '';

UPDATE inventory_documents
SET status = COALESCE(NULLIF(status, ''), 'DRAFT')
WHERE status IS NULL OR TRIM(status) = '';

UPDATE inventory_documents
SET currency_code = COALESCE(NULLIF(currency_code, ''), 'ILS')
WHERE currency_code IS NULL OR TRIM(currency_code) = '';

UPDATE inventory_documents
SET currency_rate = COALESCE(currency_rate, 1)
WHERE currency_rate IS NULL;

UPDATE inventory_documents
SET created_by = COALESCE(NULLIF(created_by, ''), 'SYSTEM')
WHERE created_by IS NULL OR TRIM(created_by) = '';

UPDATE inventory_documents
SET version = COALESCE(version, 1)
WHERE version IS NULL;

UPDATE inventory_documents
SET created_at = COALESCE(NULLIF(created_at, ''), CURRENT_TIMESTAMP)
WHERE created_at IS NULL OR TRIM(created_at) = '';

UPDATE inventory_documents
SET updated_at = COALESCE(NULLIF(updated_at, ''), created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL OR TRIM(updated_at) = '';

CREATE TABLE IF NOT EXISTS inventory_document_lines (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    from_warehouse_id TEXT,
    to_warehouse_id TEXT,
    qty REAL NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    project_id TEXT,
    cost_center_id TEXT,
    partner_id TEXT,
    expense_type_id TEXT,
    vehicle_id TEXT,
    remarks TEXT,
    adjustment_direction TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES inventory_documents(id) ON DELETE CASCADE
);

ALTER TABLE inventory_document_lines ADD COLUMN line_no INTEGER;
ALTER TABLE inventory_document_lines ADD COLUMN from_warehouse_id TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN to_warehouse_id TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN qty REAL;
ALTER TABLE inventory_document_lines ADD COLUMN unit_cost REAL;
ALTER TABLE inventory_document_lines ADD COLUMN total_cost REAL;
ALTER TABLE inventory_document_lines ADD COLUMN project_id TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN cost_center_id TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN partner_id TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN expense_type_id TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN vehicle_id TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN remarks TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN adjustment_direction TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN created_at TEXT;
ALTER TABLE inventory_document_lines ADD COLUMN updated_at TEXT;

UPDATE inventory_document_lines
SET line_no = COALESCE(line_no, rowid)
WHERE line_no IS NULL;

UPDATE inventory_document_lines
SET qty = COALESCE(qty, 0)
WHERE qty IS NULL;

UPDATE inventory_document_lines
SET unit_cost = COALESCE(unit_cost, 0)
WHERE unit_cost IS NULL;

UPDATE inventory_document_lines
SET total_cost = COALESCE(total_cost, unit_cost * qty, 0)
WHERE total_cost IS NULL;

UPDATE inventory_document_lines
SET created_at = COALESCE(NULLIF(created_at, ''), CURRENT_TIMESTAMP)
WHERE created_at IS NULL OR TRIM(created_at) = '';

UPDATE inventory_document_lines
SET updated_at = COALESCE(NULLIF(updated_at, ''), created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL OR TRIM(updated_at) = '';

CREATE TABLE IF NOT EXISTS stock_ledger_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    doc_line_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    qty_in REAL NOT NULL DEFAULT 0,
    qty_out REAL NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    movement_side TEXT NOT NULL DEFAULT 'IN',
    is_reversal INTEGER NOT NULL DEFAULT 0,
    reversed_entry_id TEXT,
    movement_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reversed_entry_id) REFERENCES stock_ledger_entries(id)
);

ALTER TABLE stock_ledger_entries ADD COLUMN movement_side TEXT;
ALTER TABLE stock_ledger_entries ADD COLUMN is_reversal INTEGER DEFAULT 0;
ALTER TABLE stock_ledger_entries ADD COLUMN reversed_entry_id TEXT;

UPDATE stock_ledger_entries
SET movement_side = CASE
    WHEN COALESCE(qty_out, 0) > 0 THEN 'OUT'
    ELSE 'IN'
END
WHERE movement_side IS NULL OR TRIM(movement_side) = '';

UPDATE stock_ledger_entries
SET is_reversal = COALESCE(is_reversal, 0)
WHERE is_reversal IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_documents_scope_status_date_v59
    ON inventory_documents(company_id, branch_id, status, doc_date, id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_documents_doc_no_scope_v59
    ON inventory_documents(company_id, COALESCE(branch_id, ''), doc_type, doc_no);

CREATE INDEX IF NOT EXISTS idx_inventory_documents_doc_type_id_v59
    ON inventory_documents(company_id, doc_type, id);

CREATE INDEX IF NOT EXISTS idx_inventory_document_lines_document_id_v59
    ON inventory_document_lines(document_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_document_lines_doc_line_v59
    ON inventory_document_lines(document_id, line_no);

CREATE INDEX IF NOT EXISTS idx_inventory_document_lines_item_v59
    ON inventory_document_lines(item_id);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_doc_v59
    ON stock_ledger_entries(company_id, doc_type, doc_id, is_reversal);

CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_ledger_doc_line_side_v59
    ON stock_ledger_entries(company_id, doc_type, doc_id, doc_line_id, warehouse_id, movement_side, is_reversal);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_wh_date_v59
    ON stock_ledger_entries(company_id, item_id, warehouse_id, movement_date);
