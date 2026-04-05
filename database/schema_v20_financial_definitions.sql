-- ================================================================
-- Financial Definitions
-- ================================================================

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    code TEXT UNIQUE,
    parent_id TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES cost_centers(id)
);

-- Payment Terms
CREATE TABLE IF NOT EXISTS payment_terms (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    days INTEGER DEFAULT 0
);

-- Expense Types
CREATE TABLE IF NOT EXISTS expense_types (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    account_id TEXT, -- Linked GL Account
    description TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Revenue Types
CREATE TABLE IF NOT EXISTS revenue_types (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    account_id TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Taxes
CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rate REAL DEFAULT 0,
    type TEXT, -- 'Add' / 'Deduct'
    is_active INTEGER DEFAULT 1
);
