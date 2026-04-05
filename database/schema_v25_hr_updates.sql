-- Schema V25: HR Enhancements
-- 1. Add Hourly Rate to Contracts
-- Safe check for column existence is hard in pure SQLite SQL script without stored procs, 
-- but usually we assume sequential application. If re-running, this might fail if column exists.
-- We rely on database.ts error suppression for duplicate columns.

SELECT 1; -- Force split
ALTER TABLE hr_employee_contracts ADD COLUMN hourly_rate DECIMAL(18, 4) DEFAULT 0;

-- 2. Ensure Relatives Table Exists
CREATE TABLE IF NOT EXISTS hr_employee_relatives (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    name TEXT NOT NULL,
    relation TEXT NOT NULL, -- SPOUSE, CHILD, FATHER, MOTHER, SIBLING
    date_of_birth DATE, -- Important for children
    national_id TEXT, -- For insurance
    note TEXT,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
);
