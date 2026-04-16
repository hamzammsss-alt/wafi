-- Schema V57: Expense Dimensions for ERP-grade analytical accounting

-- ============================================================================
-- 1) Expense Types
-- ============================================================================
CREATE TABLE IF NOT EXISTS expense_types (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT,
    name_en TEXT,
    name_ar TEXT,
    company_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE expense_types ADD COLUMN code TEXT;
ALTER TABLE expense_types ADD COLUMN name TEXT;
ALTER TABLE expense_types ADD COLUMN name_en TEXT;
ALTER TABLE expense_types ADD COLUMN name_ar TEXT;
ALTER TABLE expense_types ADD COLUMN company_id TEXT;
ALTER TABLE expense_types ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE expense_types ADD COLUMN created_at DATETIME DEFAULT NULL;

UPDATE expense_types
SET name = COALESCE(NULLIF(name, ''), NULLIF(name_en, ''), NULLIF(name_ar, ''), 'Other')
WHERE name IS NULL OR TRIM(name) = '';

UPDATE expense_types
SET name_ar = COALESCE(NULLIF(name_ar, ''), NULLIF(name, ''), NULLIF(name_en, ''), 'Other')
WHERE name_ar IS NULL OR TRIM(name_ar) = '';

UPDATE expense_types
SET name_en = COALESCE(NULLIF(name_en, ''), NULLIF(name, ''), NULLIF(name_ar, ''), 'Other')
WHERE name_en IS NULL OR TRIM(name_en) = '';

UPDATE expense_types
SET code = CASE UPPER(TRIM(name))
    WHEN 'FUEL' THEN 'FUEL'
    WHEN 'MAINTENANCE' THEN 'MAINTENANCE'
    WHEN 'INSURANCE' THEN 'INSURANCE'
    WHEN 'LICENSE' THEN 'LICENSE'
    WHEN 'PARKING' THEN 'PARKING'
    WHEN 'CLEANING' THEN 'CLEANING'
    WHEN 'FINES' THEN 'FINES'
    ELSE COALESCE(NULLIF(UPPER(TRIM(code)), ''), REPLACE(UPPER(TRIM(name)), ' ', '_'))
END
WHERE code IS NULL OR TRIM(code) = '';

CREATE INDEX IF NOT EXISTS idx_expense_types_code_v57
ON expense_types(code);

CREATE INDEX IF NOT EXISTS idx_expense_types_company_v57
ON expense_types(company_id);

CREATE INDEX IF NOT EXISTS idx_expense_types_active_v57
ON expense_types(is_active);

INSERT INTO expense_types (id, code, name, name_ar, name_en, is_active)
SELECT 'exp_type_fuel', 'FUEL', 'Fuel', 'Fuel', 'Fuel', 1
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types
    WHERE UPPER(COALESCE(code, '')) = 'FUEL'
       OR UPPER(COALESCE(name, '')) = 'FUEL'
       OR UPPER(COALESCE(name_ar, '')) = 'FUEL'
       OR UPPER(COALESCE(name_en, '')) = 'FUEL'
);

INSERT INTO expense_types (id, code, name, name_ar, name_en, is_active)
SELECT 'exp_type_maintenance', 'MAINTENANCE', 'Maintenance', 'Maintenance', 'Maintenance', 1
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types
    WHERE UPPER(COALESCE(code, '')) = 'MAINTENANCE'
       OR UPPER(COALESCE(name, '')) = 'MAINTENANCE'
       OR UPPER(COALESCE(name_ar, '')) = 'MAINTENANCE'
       OR UPPER(COALESCE(name_en, '')) = 'MAINTENANCE'
);

INSERT INTO expense_types (id, code, name, name_ar, name_en, is_active)
SELECT 'exp_type_insurance', 'INSURANCE', 'Insurance', 'Insurance', 'Insurance', 1
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types
    WHERE UPPER(COALESCE(code, '')) = 'INSURANCE'
       OR UPPER(COALESCE(name, '')) = 'INSURANCE'
       OR UPPER(COALESCE(name_ar, '')) = 'INSURANCE'
       OR UPPER(COALESCE(name_en, '')) = 'INSURANCE'
);

INSERT INTO expense_types (id, code, name, name_ar, name_en, is_active)
SELECT 'exp_type_license', 'LICENSE', 'License', 'License', 'License', 1
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types
    WHERE UPPER(COALESCE(code, '')) = 'LICENSE'
       OR UPPER(COALESCE(name, '')) = 'LICENSE'
       OR UPPER(COALESCE(name_ar, '')) = 'LICENSE'
       OR UPPER(COALESCE(name_en, '')) = 'LICENSE'
);

INSERT INTO expense_types (id, code, name, name_ar, name_en, is_active)
SELECT 'exp_type_parking', 'PARKING', 'Parking', 'Parking', 'Parking', 1
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types
    WHERE UPPER(COALESCE(code, '')) = 'PARKING'
       OR UPPER(COALESCE(name, '')) = 'PARKING'
       OR UPPER(COALESCE(name_ar, '')) = 'PARKING'
       OR UPPER(COALESCE(name_en, '')) = 'PARKING'
);

INSERT INTO expense_types (id, code, name, name_ar, name_en, is_active)
SELECT 'exp_type_cleaning', 'CLEANING', 'Cleaning', 'Cleaning', 'Cleaning', 1
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types
    WHERE UPPER(COALESCE(code, '')) = 'CLEANING'
       OR UPPER(COALESCE(name, '')) = 'CLEANING'
       OR UPPER(COALESCE(name_ar, '')) = 'CLEANING'
       OR UPPER(COALESCE(name_en, '')) = 'CLEANING'
);

INSERT INTO expense_types (id, code, name, name_ar, name_en, is_active)
SELECT 'exp_type_fines', 'FINES', 'Fines', 'Fines', 'Fines', 1
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types
    WHERE UPPER(COALESCE(code, '')) = 'FINES'
       OR UPPER(COALESCE(name, '')) = 'FINES'
       OR UPPER(COALESCE(name_ar, '')) = 'FINES'
       OR UPPER(COALESCE(name_en, '')) = 'FINES'
);

INSERT INTO expense_types (id, code, name, name_ar, name_en, is_active)
SELECT 'exp_type_other', 'OTHER', 'Other', 'Other', 'Other', 1
WHERE NOT EXISTS (
    SELECT 1 FROM expense_types
    WHERE UPPER(COALESCE(code, '')) = 'OTHER'
       OR UPPER(COALESCE(name, '')) = 'OTHER'
       OR UPPER(COALESCE(name_ar, '')) = 'OTHER'
       OR UPPER(COALESCE(name_en, '')) = 'OTHER'
);

-- ============================================================================
-- 2) Cost Centers (Hierarchical)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cost_centers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    name_ar TEXT,
    company_id TEXT,
    parent_id TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES cost_centers(id)
);

ALTER TABLE cost_centers ADD COLUMN code TEXT;
ALTER TABLE cost_centers ADD COLUMN name TEXT;
ALTER TABLE cost_centers ADD COLUMN name_en TEXT;
ALTER TABLE cost_centers ADD COLUMN name_ar TEXT;
ALTER TABLE cost_centers ADD COLUMN company_id TEXT;
ALTER TABLE cost_centers ADD COLUMN parent_id TEXT;
ALTER TABLE cost_centers ADD COLUMN is_active INTEGER DEFAULT 1;

UPDATE cost_centers
SET name = COALESCE(NULLIF(name, ''), NULLIF(name_en, ''), NULLIF(name_ar, ''), code)
WHERE name IS NULL OR TRIM(name) = '';

UPDATE cost_centers
SET name_ar = COALESCE(NULLIF(name_ar, ''), NULLIF(name, ''), NULLIF(name_en, ''), code, 'General')
WHERE name_ar IS NULL OR TRIM(name_ar) = '';

UPDATE cost_centers
SET name_en = COALESCE(NULLIF(name_en, ''), NULLIF(name, ''), NULLIF(name_ar, ''), code, 'General')
WHERE name_en IS NULL OR TRIM(name_en) = '';

CREATE INDEX IF NOT EXISTS idx_cost_centers_code_v57
ON cost_centers(code);

CREATE INDEX IF NOT EXISTS idx_cost_centers_company_v57
ON cost_centers(company_id);

CREATE INDEX IF NOT EXISTS idx_cost_centers_parent_v57
ON cost_centers(parent_id);

CREATE INDEX IF NOT EXISTS idx_cost_centers_active_v57
ON cost_centers(is_active);

INSERT INTO cost_centers (id, code, name, name_ar, name_en, parent_id, is_active)
SELECT 'cc_logistics', 'LOGISTICS', 'Logistics', 'Logistics', 'Logistics', NULL, 1
WHERE NOT EXISTS (
    SELECT 1 FROM cost_centers
    WHERE UPPER(COALESCE(code, '')) = 'LOGISTICS'
       OR UPPER(COALESCE(name, '')) = 'LOGISTICS'
       OR UPPER(COALESCE(name_ar, '')) = 'LOGISTICS'
       OR UPPER(COALESCE(name_en, '')) = 'LOGISTICS'
);

INSERT INTO cost_centers (id, code, name, name_ar, name_en, parent_id, is_active)
SELECT 'cc_sales', 'SALES', 'Sales', 'Sales', 'Sales', NULL, 1
WHERE NOT EXISTS (
    SELECT 1 FROM cost_centers
    WHERE UPPER(COALESCE(code, '')) = 'SALES'
       OR UPPER(COALESCE(name, '')) = 'SALES'
       OR UPPER(COALESCE(name_ar, '')) = 'SALES'
       OR UPPER(COALESCE(name_en, '')) = 'SALES'
);

INSERT INTO cost_centers (id, code, name, name_ar, name_en, parent_id, is_active)
SELECT 'cc_admin', 'ADMIN', 'Administration', 'Administration', 'Administration', NULL, 1
WHERE NOT EXISTS (
    SELECT 1 FROM cost_centers
    WHERE UPPER(COALESCE(code, '')) = 'ADMIN'
       OR UPPER(COALESCE(name, '')) = 'ADMINISTRATION'
       OR UPPER(COALESCE(name_ar, '')) = 'ADMINISTRATION'
       OR UPPER(COALESCE(name_en, '')) = 'ADMINISTRATION'
);

INSERT INTO cost_centers (id, code, name, name_ar, name_en, parent_id, is_active)
SELECT 'cc_warehouse', 'WAREHOUSE', 'Warehouse', 'Warehouse', 'Warehouse', NULL, 1
WHERE NOT EXISTS (
    SELECT 1 FROM cost_centers
    WHERE UPPER(COALESCE(code, '')) = 'WAREHOUSE'
       OR UPPER(COALESCE(name, '')) = 'WAREHOUSE'
       OR UPPER(COALESCE(name_ar, '')) = 'WAREHOUSE'
       OR UPPER(COALESCE(name_en, '')) = 'WAREHOUSE'
);

-- ============================================================================
-- 3) Vehicles
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    vehicle_code TEXT,
    brand TEXT,
    plate_no TEXT NOT NULL,
    model TEXT,
    department TEXT,
    company_id TEXT,
    is_active INTEGER DEFAULT 1
);

ALTER TABLE vehicles ADD COLUMN name TEXT;
ALTER TABLE vehicles ADD COLUMN vehicle_code TEXT;
ALTER TABLE vehicles ADD COLUMN brand TEXT;
ALTER TABLE vehicles ADD COLUMN plate_no TEXT;
ALTER TABLE vehicles ADD COLUMN model TEXT;
ALTER TABLE vehicles ADD COLUMN department TEXT;
ALTER TABLE vehicles ADD COLUMN company_id TEXT;
ALTER TABLE vehicles ADD COLUMN is_active INTEGER DEFAULT 1;

UPDATE vehicles
SET name = COALESCE(
    NULLIF(name, ''),
    NULLIF(vehicle_code, ''),
    NULLIF(brand, ''),
    NULLIF(model, ''),
    NULLIF(plate_no, ''),
    'Vehicle'
)
WHERE name IS NULL OR TRIM(name) = '';

CREATE INDEX IF NOT EXISTS idx_vehicles_plate_v57
ON vehicles(plate_no);

CREATE INDEX IF NOT EXISTS idx_vehicles_company_v57
ON vehicles(company_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_active_v57
ON vehicles(is_active);

-- ============================================================================
-- 4) Journals + Journal Lines with analytical dimensions
-- ============================================================================
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

CREATE TABLE IF NOT EXISTS journal_lines (
    id TEXT PRIMARY KEY,
    journal_id TEXT NOT NULL,
    entry_id TEXT,
    account_id TEXT NOT NULL,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    memo TEXT,
    currency_id TEXT,
    exchange_rate REAL,
    foreign_debit REAL,
    foreign_credit REAL,
    branch_id TEXT,
    cost_center_id TEXT,
    expense_type_id TEXT,
    vehicle_id TEXT,
    partner_id TEXT,
    project_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
    FOREIGN KEY (expense_type_id) REFERENCES expense_types(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

ALTER TABLE journal_lines ADD COLUMN journal_id TEXT;
ALTER TABLE journal_lines ADD COLUMN entry_id TEXT;
ALTER TABLE journal_lines ADD COLUMN branch_id TEXT;
ALTER TABLE journal_lines ADD COLUMN cost_center_id TEXT;
ALTER TABLE journal_lines ADD COLUMN expense_type_id TEXT;
ALTER TABLE journal_lines ADD COLUMN vehicle_id TEXT;
ALTER TABLE journal_lines ADD COLUMN partner_id TEXT;
ALTER TABLE journal_lines ADD COLUMN project_id TEXT;
ALTER TABLE journal_lines ADD COLUMN created_at TEXT DEFAULT NULL;
ALTER TABLE journal_lines ADD COLUMN updated_at TEXT DEFAULT NULL;

UPDATE journal_lines
SET journal_id = COALESCE(NULLIF(journal_id, ''), NULLIF(entry_id, ''))
WHERE journal_id IS NULL OR TRIM(journal_id) = '';

UPDATE journal_lines
SET entry_id = COALESCE(NULLIF(entry_id, ''), NULLIF(journal_id, ''))
WHERE entry_id IS NULL OR TRIM(entry_id) = '';

UPDATE journal_lines
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL OR TRIM(created_at) = '';

UPDATE journal_lines
SET updated_at = COALESCE(NULLIF(updated_at, ''), created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL OR TRIM(updated_at) = '';

CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_v57
ON journal_lines(journal_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_branch_v57
ON journal_lines(branch_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_cost_center_v57
ON journal_lines(cost_center_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_expense_type_v57
ON journal_lines(expense_type_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_vehicle_v57
ON journal_lines(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_partner_v57
ON journal_lines(partner_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_project_v57
ON journal_lines(project_id);

-- ============================================================================
-- 5) Validation triggers for active dimensions
-- ============================================================================
CREATE TRIGGER IF NOT EXISTS trg_journal_lines_validate_dimensions_insert_v57
BEFORE INSERT ON journal_lines
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.branch_id IS NOT NULL AND TRIM(NEW.branch_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM branches b
                WHERE b.id = NEW.branch_id
                  AND COALESCE(b.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive branch_id')
    END;

    SELECT CASE
        WHEN NEW.cost_center_id IS NOT NULL AND TRIM(NEW.cost_center_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM cost_centers c
                WHERE c.id = NEW.cost_center_id
                  AND COALESCE(c.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive cost_center_id')
    END;

    SELECT CASE
        WHEN NEW.expense_type_id IS NOT NULL AND TRIM(NEW.expense_type_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM expense_types e
                WHERE e.id = NEW.expense_type_id
                  AND COALESCE(e.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive expense_type_id')
    END;

    SELECT CASE
        WHEN NEW.vehicle_id IS NOT NULL AND TRIM(NEW.vehicle_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM vehicles v
                WHERE v.id = NEW.vehicle_id
                  AND COALESCE(v.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive vehicle_id')
    END;

    SELECT CASE
        WHEN NEW.partner_id IS NOT NULL AND TRIM(NEW.partner_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM business_partners p
                WHERE p.id = NEW.partner_id
                  AND COALESCE(p.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive partner_id')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_journal_lines_validate_dimensions_update_v57
BEFORE UPDATE ON journal_lines
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.branch_id IS NOT NULL AND TRIM(NEW.branch_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM branches b
                WHERE b.id = NEW.branch_id
                  AND COALESCE(b.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive branch_id')
    END;

    SELECT CASE
        WHEN NEW.cost_center_id IS NOT NULL AND TRIM(NEW.cost_center_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM cost_centers c
                WHERE c.id = NEW.cost_center_id
                  AND COALESCE(c.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive cost_center_id')
    END;

    SELECT CASE
        WHEN NEW.expense_type_id IS NOT NULL AND TRIM(NEW.expense_type_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM expense_types e
                WHERE e.id = NEW.expense_type_id
                  AND COALESCE(e.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive expense_type_id')
    END;

    SELECT CASE
        WHEN NEW.vehicle_id IS NOT NULL AND TRIM(NEW.vehicle_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM vehicles v
                WHERE v.id = NEW.vehicle_id
                  AND COALESCE(v.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive vehicle_id')
    END;

    SELECT CASE
        WHEN NEW.partner_id IS NOT NULL AND TRIM(NEW.partner_id) <> ''
            AND NOT EXISTS (
                SELECT 1
                FROM business_partners p
                WHERE p.id = NEW.partner_id
                  AND COALESCE(p.is_active, 1) = 1
            )
        THEN RAISE(ABORT, 'Invalid or inactive partner_id')
    END;
END;
