-- Schema V63: Manufacturing Foundation

CREATE TABLE IF NOT EXISTS mfg_bom_headers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    version_no INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
    is_default INTEGER NOT NULL DEFAULT 0,
    output_qty REAL NOT NULL DEFAULT 1,
    effective_from TEXT,
    effective_to TEXT,
    remarks TEXT,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mfg_bom_lines (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    component_item_id TEXT NOT NULL,
    warehouse_id TEXT,
    qty_per REAL NOT NULL DEFAULT 0,
    scrap_percent REAL NOT NULL DEFAULT 0,
    issue_method TEXT NOT NULL DEFAULT 'MANUAL' CHECK (issue_method IN ('MANUAL', 'BACKFLUSH')),
    remarks TEXT,
    FOREIGN KEY (bom_id) REFERENCES mfg_bom_headers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mfg_routing_headers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    version_no INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
    is_default INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mfg_routing_steps (
    id TEXT PRIMARY KEY,
    routing_id TEXT NOT NULL,
    step_no INTEGER NOT NULL,
    work_center_code TEXT NOT NULL,
    operation_code TEXT NOT NULL,
    setup_time_minutes REAL NOT NULL DEFAULT 0,
    run_time_minutes REAL NOT NULL DEFAULT 0,
    labor_cost_rate REAL NOT NULL DEFAULT 0,
    machine_cost_rate REAL NOT NULL DEFAULT 0,
    remarks TEXT,
    FOREIGN KEY (routing_id) REFERENCES mfg_routing_headers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mfg_production_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    order_no TEXT NOT NULL,
    order_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'RELEASED', 'IN_PROGRESS', 'PARTIAL', 'COMPLETED', 'CANCELLED')),
    item_id TEXT NOT NULL,
    bom_id TEXT,
    routing_id TEXT,
    warehouse_id TEXT NOT NULL,
    qty_planned REAL NOT NULL DEFAULT 0,
    qty_started REAL NOT NULL DEFAULT 0,
    qty_completed REAL NOT NULL DEFAULT 0,
    qty_scrapped REAL NOT NULL DEFAULT 0,
    qty_issued REAL NOT NULL DEFAULT 0,
    material_cost_issued REAL NOT NULL DEFAULT 0,
    labor_cost_estimated REAL NOT NULL DEFAULT 0,
    machine_cost_estimated REAL NOT NULL DEFAULT 0,
    cost_capitalized REAL NOT NULL DEFAULT 0,
    total_wip_cost REAL NOT NULL DEFAULT 0,
    unit_cost_completed REAL NOT NULL DEFAULT 0,
    reference_no TEXT,
    remarks TEXT,
    project_id TEXT,
    cost_center_id TEXT,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    source_doc_type TEXT,
    source_doc_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mfg_production_order_components (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    component_item_id TEXT NOT NULL,
    warehouse_id TEXT,
    qty_required REAL NOT NULL DEFAULT 0,
    qty_issued REAL NOT NULL DEFAULT 0,
    qty_returned REAL NOT NULL DEFAULT 0,
    issue_method TEXT NOT NULL DEFAULT 'MANUAL' CHECK (issue_method IN ('MANUAL', 'BACKFLUSH')),
    unit_cost REAL,
    total_cost REAL,
    remarks TEXT,
    FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mfg_production_order_operations (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    step_no INTEGER NOT NULL,
    work_center_code TEXT NOT NULL,
    operation_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    setup_time_minutes REAL NOT NULL DEFAULT 0,
    run_time_minutes REAL NOT NULL DEFAULT 0,
    labor_cost_rate REAL NOT NULL DEFAULT 0,
    machine_cost_rate REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mfg_production_issues (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    issue_no TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    production_order_id TEXT NOT NULL,
    reference_no TEXT,
    remarks TEXT,
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
    FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (journal_id) REFERENCES journals(id),
    FOREIGN KEY (reversal_journal_id) REFERENCES journals(id)
);

CREATE TABLE IF NOT EXISTS mfg_production_issue_lines (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    component_line_id TEXT,
    component_item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    remarks TEXT,
    FOREIGN KEY (issue_id) REFERENCES mfg_production_issues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mfg_production_receipts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    receipt_no TEXT NOT NULL,
    receipt_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    production_order_id TEXT NOT NULL,
    reference_no TEXT,
    remarks TEXT,
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
    FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (journal_id) REFERENCES journals(id),
    FOREIGN KEY (reversal_journal_id) REFERENCES journals(id)
);

CREATE TABLE IF NOT EXISTS mfg_production_receipt_lines (
    id TEXT PRIMARY KEY,
    receipt_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    qty_received REAL NOT NULL DEFAULT 0,
    qty_scrapped REAL NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    remarks TEXT,
    FOREIGN KEY (receipt_id) REFERENCES mfg_production_receipts(id) ON DELETE CASCADE
);

ALTER TABLE mfg_production_orders ADD COLUMN material_cost_issued REAL DEFAULT 0;
ALTER TABLE mfg_production_orders ADD COLUMN labor_cost_estimated REAL DEFAULT 0;
ALTER TABLE mfg_production_orders ADD COLUMN machine_cost_estimated REAL DEFAULT 0;
ALTER TABLE mfg_production_orders ADD COLUMN cost_capitalized REAL DEFAULT 0;
ALTER TABLE mfg_production_orders ADD COLUMN total_wip_cost REAL DEFAULT 0;
ALTER TABLE mfg_production_orders ADD COLUMN unit_cost_completed REAL DEFAULT 0;
ALTER TABLE mfg_production_orders ADD COLUMN source_doc_type TEXT;
ALTER TABLE mfg_production_orders ADD COLUMN source_doc_id TEXT;

UPDATE mfg_production_orders
SET material_cost_issued = COALESCE(material_cost_issued, 0),
    labor_cost_estimated = COALESCE(labor_cost_estimated, 0),
    machine_cost_estimated = COALESCE(machine_cost_estimated, 0),
    cost_capitalized = COALESCE(cost_capitalized, 0),
    total_wip_cost = COALESCE(total_wip_cost, 0),
    unit_cost_completed = COALESCE(unit_cost_completed, 0)
WHERE 1 = 1;

CREATE INDEX IF NOT EXISTS idx_mfg_bom_item_default_v63
    ON mfg_bom_headers(company_id, item_id, status, is_default, version_no DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_bom_line_no_v63
    ON mfg_bom_lines(bom_id, line_no);

CREATE INDEX IF NOT EXISTS idx_mfg_routing_item_default_v63
    ON mfg_routing_headers(company_id, item_id, status, is_default, version_no DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_routing_step_no_v63
    ON mfg_routing_steps(routing_id, step_no);

CREATE INDEX IF NOT EXISTS idx_mfg_order_scope_v63
    ON mfg_production_orders(company_id, branch_id, status, order_date, id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_order_no_v63
    ON mfg_production_orders(company_id, branch_id, order_no);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_order_component_no_v63
    ON mfg_production_order_components(production_order_id, line_no);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_order_operation_no_v63
    ON mfg_production_order_operations(production_order_id, step_no);

CREATE INDEX IF NOT EXISTS idx_mfg_issue_scope_v63
    ON mfg_production_issues(company_id, branch_id, status, issue_date, id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_issue_no_v63
    ON mfg_production_issues(company_id, branch_id, issue_no);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_issue_line_no_v63
    ON mfg_production_issue_lines(issue_id, line_no);

CREATE INDEX IF NOT EXISTS idx_mfg_receipt_scope_v63
    ON mfg_production_receipts(company_id, branch_id, status, receipt_date, id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_receipt_no_v63
    ON mfg_production_receipts(company_id, branch_id, receipt_no);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_receipt_line_no_v63
    ON mfg_production_receipt_lines(receipt_id, line_no);

CREATE INDEX IF NOT EXISTS idx_mfg_stock_ledger_doc_v63
    ON stock_ledger_entries(company_id, doc_type, doc_id, is_reversal);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mfg_stock_ledger_line_v63
    ON stock_ledger_entries(company_id, doc_type, doc_id, doc_line_id, warehouse_id, movement_side, is_reversal);
