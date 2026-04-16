-- Schema V61: Sales Operations Foundation

CREATE TABLE IF NOT EXISTS sales_operation_documents (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('SALES_QUOTATION', 'SALES_ORDER', 'DELIVERY_NOTE', 'SALES_RETURN')),
    doc_no TEXT NOT NULL,
    doc_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'POSTED', 'PARTIAL', 'COMPLETED', 'CANCELLED')),
    customer_id TEXT NOT NULL,
    warehouse_id TEXT,
    currency_code TEXT NOT NULL DEFAULT 'ILS',
    currency_rate REAL NOT NULL DEFAULT 1,
    subtotal REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    taxable_amount REAL NOT NULL DEFAULT 0,
    vat_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    reference_no TEXT,
    remarks TEXT,
    source_doc_type TEXT,
    source_doc_id TEXT,
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

CREATE TABLE IF NOT EXISTS sales_operation_document_lines (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    warehouse_id TEXT,
    qty REAL NOT NULL DEFAULT 0,
    delivered_qty REAL NOT NULL DEFAULT 0,
    returned_qty REAL NOT NULL DEFAULT 0,
    invoiced_qty REAL NOT NULL DEFAULT 0,
    reserved_qty REAL NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    line_subtotal REAL NOT NULL DEFAULT 0,
    taxable_amount REAL NOT NULL DEFAULT 0,
    vat_amount REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL DEFAULT 0,
    unit_cost REAL,
    project_id TEXT,
    cost_center_id TEXT,
    partner_id TEXT,
    remarks TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES sales_operation_documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_operation_line_links (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    source_doc_type TEXT NOT NULL,
    source_doc_id TEXT NOT NULL,
    source_line_id TEXT NOT NULL,
    target_doc_type TEXT NOT NULL,
    target_doc_id TEXT NOT NULL,
    target_line_id TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_reservations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    sales_order_id TEXT NOT NULL,
    sales_order_line_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    reserved_qty REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_ops_documents_scope_status_date_v61
    ON sales_operation_documents(company_id, branch_id, doc_type, status, doc_date, id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_ops_documents_doc_no_v61
    ON sales_operation_documents(company_id, COALESCE(branch_id, ''), doc_type, doc_no);

CREATE INDEX IF NOT EXISTS idx_sales_ops_lines_document_v61
    ON sales_operation_document_lines(document_id, line_no);

CREATE INDEX IF NOT EXISTS idx_sales_ops_lines_item_v61
    ON sales_operation_document_lines(item_id);

CREATE INDEX IF NOT EXISTS idx_sales_ops_links_source_v61
    ON sales_operation_line_links(company_id, source_doc_id, source_line_id);

CREATE INDEX IF NOT EXISTS idx_sales_ops_links_target_v61
    ON sales_operation_line_links(company_id, target_doc_id, target_line_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_ops_links_pair_v61
    ON sales_operation_line_links(company_id, source_line_id, target_line_id);

CREATE INDEX IF NOT EXISTS idx_sales_reservations_order_v61
    ON sales_reservations(company_id, sales_order_id, sales_order_line_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_reservations_line_v61
    ON sales_reservations(company_id, sales_order_line_id, item_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_sales_stock_ledger_doc_v61
    ON stock_ledger_entries(company_id, doc_type, doc_id, is_reversal);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_stock_ledger_line_v61
    ON stock_ledger_entries(company_id, doc_type, doc_id, doc_line_id, warehouse_id, movement_side, is_reversal);
