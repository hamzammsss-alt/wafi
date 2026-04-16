-- Schema V53: Accounting Foundation (Chart of Accounts + Financial Definitions)
-- This schema is additive and backward-compatible with legacy account structures.

-- Accounts normalization fields
ALTER TABLE accounts ADD COLUMN company_id TEXT DEFAULT 'COMP_01';
ALTER TABLE accounts ADD COLUMN branch_id TEXT;
ALTER TABLE accounts ADD COLUMN account_code TEXT;
ALTER TABLE accounts ADD COLUMN account_category TEXT DEFAULT 'GENERAL';
ALTER TABLE accounts ADD COLUMN account_subtype TEXT DEFAULT 'GENERAL';
ALTER TABLE accounts ADD COLUMN posting_allowed INTEGER DEFAULT 1;
ALTER TABLE accounts ADD COLUMN is_group INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN currency_behavior TEXT DEFAULT 'BASE_ONLY';
ALTER TABLE accounts ADD COLUMN currency_code TEXT;
ALTER TABLE accounts ADD COLUMN scope_type TEXT DEFAULT 'COMPANY';
ALTER TABLE accounts ADD COLUMN status TEXT DEFAULT 'ACTIVE';
ALTER TABLE accounts ADD COLUMN requires_cost_center INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN requires_analysis_code INTEGER DEFAULT 0;

UPDATE accounts
SET company_id = COALESCE(NULLIF(company_id, ''), 'COMP_01');

UPDATE accounts
SET account_code = UPPER(COALESCE(NULLIF(account_code, ''), NULLIF(code, ''), id));

UPDATE accounts
SET account_category = COALESCE(NULLIF(account_category, ''), 'GENERAL'),
    account_subtype = COALESCE(NULLIF(account_subtype, ''), 'GENERAL'),
    posting_allowed = COALESCE(posting_allowed, is_transactional, CASE WHEN COALESCE(is_group, 0) = 1 THEN 0 ELSE 1 END),
    currency_behavior = COALESCE(NULLIF(currency_behavior, ''), CASE WHEN COALESCE(currency_code, currency, '') != '' THEN 'FIXED_CURRENCY' ELSE 'BASE_ONLY' END),
    currency_code = COALESCE(NULLIF(currency_code, ''), NULLIF(currency, '')),
    scope_type = COALESCE(NULLIF(scope_type, ''), CASE WHEN COALESCE(branch_id, '') != '' THEN 'BRANCH' ELSE 'COMPANY' END),
    status = COALESCE(NULLIF(status, ''), CASE WHEN COALESCE(is_active, 1) = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END),
    requires_cost_center = COALESCE(requires_cost_center, 0),
    requires_analysis_code = COALESCE(requires_analysis_code, 0);

CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_company_account_code
ON accounts(company_id, account_code);

CREATE INDEX IF NOT EXISTS idx_accounts_company_parent
ON accounts(company_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_accounts_company_posting
ON accounts(company_id, posting_allowed, status);

-- Financial Definitions matrix for account linking and resolution
CREATE TABLE IF NOT EXISTS financial_definitions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    branch_id TEXT,
    scope_type TEXT NOT NULL CHECK (
        scope_type IN ('COMPANY', 'BRANCH', 'ITEM', 'ITEM_GROUP', 'WAREHOUSE', 'PARTNER')
    ),
    scope_id TEXT NOT NULL,
    mapping_key TEXT NOT NULL CHECK (
        mapping_key IN (
            'RECEIVABLE',
            'PAYABLE',
            'REVENUE',
            'EXPENSE',
            'INVENTORY',
            'COGS',
            'TAX_PAYABLE',
            'TAX_RECEIVABLE',
            'DISCOUNT',
            'ROUNDING'
        )
    ),
    account_id TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    is_active INTEGER NOT NULL DEFAULT 1,
    valid_from TEXT,
    valid_to TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_financial_definitions_company
ON financial_definitions(company_id);

CREATE INDEX IF NOT EXISTS idx_financial_definitions_scope
ON financial_definitions(company_id, scope_type, scope_id, mapping_key);

CREATE INDEX IF NOT EXISTS idx_financial_definitions_account
ON financial_definitions(account_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_financial_definitions_active
ON financial_definitions(company_id, COALESCE(branch_id, ''), scope_type, scope_id, mapping_key)
WHERE is_active = 1;
