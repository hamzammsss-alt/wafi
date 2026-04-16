CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    number TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    nature TEXT NOT NULL,
    parent_id TEXT,
    is_active INTEGER NOT NULL,
    is_group INTEGER NOT NULL,
    FOREIGN KEY(parent_id) REFERENCES accounts(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_number ON accounts(company_id, number);

CREATE TABLE IF NOT EXISTS journals (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    number TEXT NOT NULL,
    date TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    posted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_journals_keyset ON journals(company_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS journal_lines (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    debit REAL NOT NULL,
    credit REAL NOT NULL,
    memo TEXT,
    FOREIGN KEY(entry_id) REFERENCES journals(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS fiscal_periods (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL
);
