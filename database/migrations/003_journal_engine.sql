CREATE TABLE IF NOT EXISTS journals (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    journal_no TEXT NOT NULL,
    journal_date TEXT NOT NULL,
    fiscal_period_id TEXT,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_no TEXT,
    source_version INTEGER NOT NULL DEFAULT 1,
    reference_no TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'POSTED',
    currency_code TEXT NOT NULL,
    exchange_rate REAL NOT NULL DEFAULT 1,
    total_debit REAL NOT NULL DEFAULT 0,
    total_credit REAL NOT NULL DEFAULT 0,
    posted_by TEXT NOT NULL,
    posted_at TEXT NOT NULL,
    reversed_journal_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id TEXT PRIMARY KEY,
    journal_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    account_id TEXT NOT NULL,
    description TEXT,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    currency_code TEXT NOT NULL DEFAULT 'ILS',
    exchange_rate REAL NOT NULL DEFAULT 1,
    base_debit REAL NOT NULL DEFAULT 0,
    base_credit REAL NOT NULL DEFAULT 0,
    branch_id TEXT,
    cost_center_id TEXT,
    expense_type_id TEXT,
    vehicle_id TEXT,
    partner_id TEXT,
    project_id TEXT,
    item_id TEXT,
    warehouse_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posting_registry (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_version INTEGER NOT NULL DEFAULT 1,
    journal_id TEXT NOT NULL,
    posting_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journals_source ON journals(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_id ON journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON journal_lines(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_posting_registry_source_version
ON posting_registry(company_id, source_type, source_id, source_version);
