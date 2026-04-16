-- Schema V58: Centralized Journal Engine
-- Purpose:
-- 1) Create normalized journal header/lines tables for centralized posting.
-- 2) Add posting registry for duplicate-posting protection by source version.

-- -----------------------------------------------------------------------------
-- Journal Header
-- -----------------------------------------------------------------------------
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
    updated_at TEXT NOT NULL,
    FOREIGN KEY (reversed_journal_id) REFERENCES journals(id)
);

-- Backward compatibility with older journal table shape
ALTER TABLE journals ADD COLUMN journal_no TEXT;
ALTER TABLE journals ADD COLUMN journal_date TEXT;
ALTER TABLE journals ADD COLUMN fiscal_period_id TEXT;
ALTER TABLE journals ADD COLUMN source_type TEXT DEFAULT 'MANUAL';
ALTER TABLE journals ADD COLUMN source_id TEXT DEFAULT '';
ALTER TABLE journals ADD COLUMN source_no TEXT;
ALTER TABLE journals ADD COLUMN source_version INTEGER DEFAULT 1;
ALTER TABLE journals ADD COLUMN reference_no TEXT;
ALTER TABLE journals ADD COLUMN description TEXT;
ALTER TABLE journals ADD COLUMN currency_code TEXT DEFAULT 'ILS';
ALTER TABLE journals ADD COLUMN exchange_rate REAL DEFAULT 1;
ALTER TABLE journals ADD COLUMN total_debit REAL DEFAULT 0;
ALTER TABLE journals ADD COLUMN total_credit REAL DEFAULT 0;
ALTER TABLE journals ADD COLUMN posted_by TEXT;
ALTER TABLE journals ADD COLUMN reversed_journal_id TEXT;

UPDATE journals
SET journal_no = COALESCE(NULLIF(journal_no, ''), NULLIF(number, ''), id)
WHERE journal_no IS NULL OR TRIM(journal_no) = '';

UPDATE journals
SET journal_date = COALESCE(NULLIF(journal_date, ''), NULLIF(date, ''), SUBSTR(COALESCE(created_at, CURRENT_TIMESTAMP), 1, 10))
WHERE journal_date IS NULL OR TRIM(journal_date) = '';

UPDATE journals
SET source_type = COALESCE(NULLIF(source_type, ''), 'MANUAL')
WHERE source_type IS NULL OR TRIM(source_type) = '';

UPDATE journals
SET source_id = COALESCE(NULLIF(source_id, ''), id)
WHERE source_id IS NULL OR TRIM(source_id) = '';

UPDATE journals
SET source_version = COALESCE(source_version, 1)
WHERE source_version IS NULL;

UPDATE journals
SET currency_code = COALESCE(NULLIF(currency_code, ''), 'ILS')
WHERE currency_code IS NULL OR TRIM(currency_code) = '';

UPDATE journals
SET exchange_rate = COALESCE(exchange_rate, 1)
WHERE exchange_rate IS NULL;

UPDATE journals
SET total_debit = COALESCE(total_debit, 0)
WHERE total_debit IS NULL;

UPDATE journals
SET total_credit = COALESCE(total_credit, 0)
WHERE total_credit IS NULL;

UPDATE journals
SET posted_by = COALESCE(NULLIF(posted_by, ''), 'SYSTEM')
WHERE posted_by IS NULL OR TRIM(posted_by) = '';

UPDATE journals
SET posted_at = COALESCE(NULLIF(posted_at, ''), COALESCE(created_at, CURRENT_TIMESTAMP))
WHERE posted_at IS NULL OR TRIM(posted_at) = '';

UPDATE journals
SET created_at = COALESCE(NULLIF(created_at, ''), CURRENT_TIMESTAMP)
WHERE created_at IS NULL OR TRIM(created_at) = '';

UPDATE journals
SET updated_at = COALESCE(NULLIF(updated_at, ''), created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL OR TRIM(updated_at) = '';

-- -----------------------------------------------------------------------------
-- Journal Lines
-- -----------------------------------------------------------------------------
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
    FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Backward compatibility with older line table shape
ALTER TABLE journal_lines ADD COLUMN line_no INTEGER;
ALTER TABLE journal_lines ADD COLUMN description TEXT;
ALTER TABLE journal_lines ADD COLUMN currency_code TEXT;
ALTER TABLE journal_lines ADD COLUMN base_debit REAL;
ALTER TABLE journal_lines ADD COLUMN base_credit REAL;
ALTER TABLE journal_lines ADD COLUMN item_id TEXT;
ALTER TABLE journal_lines ADD COLUMN warehouse_id TEXT;

UPDATE journal_lines
SET journal_id = COALESCE(NULLIF(journal_id, ''), NULLIF(entry_id, ''))
WHERE journal_id IS NULL OR TRIM(journal_id) = '';

UPDATE journal_lines
SET line_no = COALESCE(line_no, rowid)
WHERE line_no IS NULL;

UPDATE journal_lines
SET description = COALESCE(NULLIF(description, ''), memo)
WHERE description IS NULL OR TRIM(description) = '';

UPDATE journal_lines
SET currency_code = COALESCE(NULLIF(currency_code, ''), NULLIF(currency_id, ''), 'ILS')
WHERE currency_code IS NULL OR TRIM(currency_code) = '';

UPDATE journal_lines
SET exchange_rate = COALESCE(exchange_rate, 1)
WHERE exchange_rate IS NULL;

UPDATE journal_lines
SET base_debit = COALESCE(base_debit, debit, 0)
WHERE base_debit IS NULL;

UPDATE journal_lines
SET base_credit = COALESCE(base_credit, credit, 0)
WHERE base_credit IS NULL;

UPDATE journal_lines
SET created_at = COALESCE(NULLIF(created_at, ''), CURRENT_TIMESTAMP)
WHERE created_at IS NULL OR TRIM(created_at) = '';

UPDATE journal_lines
SET updated_at = COALESCE(NULLIF(updated_at, ''), created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL OR TRIM(updated_at) = '';

-- -----------------------------------------------------------------------------
-- Posting Registry
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Indexes and constraints
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_journals_company_journal_no_v58
ON journals(company_id, journal_no);

CREATE INDEX IF NOT EXISTS idx_journals_source_v58
ON journals(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_journals_company_date_v58
ON journals(company_id, journal_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_id_v58
ON journal_lines(journal_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id_v58
ON journal_lines(account_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_lines_journal_line_no_v58
ON journal_lines(journal_id, line_no);

CREATE UNIQUE INDEX IF NOT EXISTS ux_posting_registry_source_version_v58
ON posting_registry(company_id, source_type, source_id, source_version);

CREATE UNIQUE INDEX IF NOT EXISTS ux_posting_registry_hash_v58
ON posting_registry(company_id, posting_hash);

CREATE INDEX IF NOT EXISTS idx_posting_registry_journal_v58
ON posting_registry(journal_id);
