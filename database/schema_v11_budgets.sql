-- ================================================================
-- 1. عناوين الموازنات (Budget Headers)
-- تعريف الموازنة (المسمي، السنة، النوع)
-- ================================================================
CREATE TABLE IF NOT EXISTS gl_budget_headers (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT NOT NULL, -- "موازنة 2026 الأساسية"
    fiscal_year INTEGER NOT NULL, -- 2026
    
    type TEXT DEFAULT 'ANNUAL', -- ANNUAL (سنوية), MONTHLY (شهرية), QUARTERLY (ربعية)
    status TEXT DEFAULT 'DRAFT', -- DRAFT, APPROVED, CLOSED, REVISED
    
    revision_number INTEGER DEFAULT 0, -- 0 for original, 1, 2... for revisions
    
    description TEXT,
    
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by TEXT,
    approved_at DATETIME
);

-- فهرس لعدم تكرار الموازنة لنفس السنة (اختياري، قد يكون لدينا عدة سيناريوهات)
-- CREATE INDEX IF NOT EXISTS idx_budget_year ON gl_budget_headers(fiscal_year);

-- ================================================================
-- 2. بنود الموازنة (Budget Lines)
-- الأرقام التقديرية لكل حساب وفترة
-- ================================================================
CREATE TABLE IF NOT EXISTS gl_budget_lines (
    id TEXT PRIMARY KEY, -- UUID
    header_id TEXT NOT NULL,
    
    account_id TEXT NOT NULL, -- الحساب المستهدف (إيراد أو مصروف)
    
    period INTEGER DEFAULT 0, 
    -- 0 = المجموع السنوي (إذا كانت الموازنة سنوية غير موزعة)
    -- 1..12 = الشهر (إذا كانت موزعة شهرياً)
    
    amount DECIMAL(18,4) DEFAULT 0, -- المبلغ المقدر
    
    notes TEXT,
    
    FOREIGN KEY (header_id) REFERENCES gl_budget_headers(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Index for reporting performance (Budget vs Actual)
CREATE INDEX IF NOT EXISTS idx_budget_reporting ON gl_budget_lines(header_id, account_id, period);
