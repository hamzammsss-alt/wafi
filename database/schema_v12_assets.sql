-- ================================================================
-- 1. Asset Groups (Categories)
-- ================================================================
CREATE TABLE IF NOT EXISTS asset_categories (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    depreciation_method TEXT DEFAULT 'Straight Line',
    depreciation_rate DECIMAL(5,2) DEFAULT 0,
    
    -- GL Accounts Integration
    asset_account_id TEXT, -- e.g. Vehicles Cost
    accumulated_depreciation_account_id TEXT, -- e.g. Acc Dep Vehicles
    depreciation_expense_account_id TEXT, -- e.g. Dep Expense Vehicles

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 2. Fixed Assets Register
-- ================================================================
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    
    -- Linked to Category (Group)
    category_id TEXT, 
    type TEXT, -- Legacy/Fallback name of the group if needed
    
    purchase_date DATE,
    purchase_cost DECIMAL(18,4) DEFAULT 0,
    salvage_value DECIMAL(18,4) DEFAULT 0,
    
    life_years INTEGER DEFAULT 0,
    depreciation_rate DECIMAL(5,2) DEFAULT 0,
    
    status TEXT DEFAULT 'Active', -- Active, Sold, Disposed, Fully Depreciated
    
    accumulated_depreciation DECIMAL(18,4) DEFAULT 0,
    book_value DECIMAL(18,4) DEFAULT 0,
    
    location TEXT,
    serial_number TEXT,
    custodian TEXT, -- Person responsible
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES asset_categories(id)
);

-- ================================================================
-- 3. Asset Depreciations (History of calculations/postings)
-- ================================================================
CREATE TABLE IF NOT EXISTS asset_depreciations (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(18,4) DEFAULT 0,
    description TEXT,
    journal_entry_id TEXT, -- Link to GL
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    -- FOREIGN KEY (journal_entry_id) REFERENCES gl_journal_headers(id)
);
