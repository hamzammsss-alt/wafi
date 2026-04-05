-- Schema v15: Advanced Payroll Features (Commission & Production)

-- 1. Create table for Production Items (Standard rates for tasks/pieces)
CREATE TABLE IF NOT EXISTS hr_production_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    default_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'ILS',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create table for Employee Production Logs (Daily entries)
CREATE TABLE IF NOT EXISTS hr_employee_production_log (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    production_date DATE NOT NULL,
    item_name TEXT NOT NULL, -- Flexible: can be free text or linked to item
    quantity INTEGER NOT NULL DEFAULT 0,
    rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * rate) VIRTUAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);

-- 3. Create table for Commission Calculations
CREATE TABLE IF NOT EXISTS hr_employee_commissions (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0, -- e.g., 0.02 for 2%
    commission_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'PAID')) DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
);

-- 4. Alter Contracts table to add Mixed Salary fields
-- SQLite doesn't support adding multiple columns in one ALTER statement easily or modifying columns. 
-- We assume these columns *might* not exist. We add them if they don't.
-- Since we can't do IF NOT EXISTS for columns in standard SQLite easily in one script without errors if they exist,
-- we will just run ALTER TABLE statements. If they fail (exist), it's fine in this context or we'd standardly do a migration check.
-- For safety, the user can run this.

ALTER TABLE hr_employee_contracts ADD COLUMN salary_type TEXT DEFAULT 'FIXED'; -- ENUM: FIXED, COMMISSION, PRODUCTION, MIXED
ALTER TABLE hr_employee_contracts ADD COLUMN commission_rate DECIMAL(5, 4) DEFAULT 0;
ALTER TABLE hr_employee_contracts ADD COLUMN commission_target DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE hr_employee_contracts ADD COLUMN piece_rate_default DECIMAL(10, 2) DEFAULT 0;

-- 5. Alter Salary Slips to include Commission and Production
ALTER TABLE hr_salary_slips ADD COLUMN commission_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE hr_salary_slips ADD COLUMN production_amount DECIMAL(10, 2) DEFAULT 0;

