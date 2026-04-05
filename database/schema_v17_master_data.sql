-- ================================================================
-- V17 MASTER DATA - FINANCIAL DEFINITIONS
-- ================================================================

-- 1. Currencies & Exchange Rates (Enhancement)
-- Note: 'currencies' table already exists in v1_foundation.
-- We might need to ensure it has 'sub_unit' and 'fraction' columns if not already.
-- SQLITE doesn't support IF NOT EXISTS for columns easily, so we assume they might exist or we add them via migration script later if needed.
-- For now, we'll create a new table for daily rates if not covered well.
-- "currency_rates_history" exists in v16.

-- 2. Banks (Reference Data)
-- e.g. Bank of Palestine, Arab Bank
CREATE TABLE IF NOT EXISTS banks (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    swift_code TEXT,
    is_local BOOLEAN DEFAULT 1 -- Local vs International
);

-- 3. Company Bank Accounts
-- Our accounts in the banks
CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL,
    branch_name TEXT,
    account_number TEXT NOT NULL,
    iban TEXT,
    currency_id TEXT NOT NULL,
    
    gl_account_id TEXT, -- Linked to Chart of Accounts (Cash at Bank)
    
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES banks(id),
    FOREIGN KEY (currency_id) REFERENCES currencies(id),
    FOREIGN KEY (gl_account_id) REFERENCES gl_chart_of_accounts(id)
);

-- 4. Payment Methods
-- Cash, Check, Visa, Bank Transfer
CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    type TEXT NOT NULL, -- CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, ELECTRONIC_WALLET
    
    gl_account_id TEXT, -- Where the money goes (e.g. Cash Box, Visa Clearing Account)
    commission_rate DECIMAL(5, 2) DEFAULT 0, -- e.g. 2% for Visa
    
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (gl_account_id) REFERENCES gl_chart_of_accounts(id)
);

-- 5. Cost Centers (Analytical Accounting)
-- Tree Structure: Projects, Branches, Departments
CREATE TABLE IF NOT EXISTS cost_centers (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- 01, 01-01
    name_ar TEXT NOT NULL,
    name_en TEXT,
    
    parent_id TEXT,
    type TEXT DEFAULT 'DEPARTMENT', -- DEPARTMENT, PROJECT, BRANCH, EQUIPMENT
    
    manager_name TEXT,
    
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES cost_centers(id)
);

-- 6. Expense Analysis Tree (Administrative classification)
-- Distinct from GL Accounts. e.g. "Fuel" -> "Generators" vs "Vehicles"
CREATE TABLE IF NOT EXISTS expense_analysis_categories (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    parent_id TEXT,
    FOREIGN KEY (parent_id) REFERENCES expense_analysis_categories(id)
);

-- 7. Taxes & Deductions Setup
CREATE TABLE IF NOT EXISTS tax_definitions (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    type TEXT NOT NULL, -- VAT, PURCHASE, SOURCE_DEDUCTION
    percentage DECIMAL(5, 2) DEFAULT 0,
    
    gl_account_id TEXT, -- Liability Account
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (gl_account_id) REFERENCES gl_chart_of_accounts(id)
);
