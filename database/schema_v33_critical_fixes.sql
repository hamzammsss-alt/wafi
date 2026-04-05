-- Correction for Customer Types (Missing description)
ALTER TABLE customer_types ADD COLUMN description TEXT;

-- Correction for Expense Types (Missing name)
-- If it fails because it exists, Database.ts handles it gracefully.
ALTER TABLE expense_types ADD COLUMN name TEXT;
-- ALTER TABLE expense_types ADD COLUMN name_ar TEXT; 
-- ALTER TABLE expense_types ADD COLUMN name_en TEXT;
ALTER TABLE expense_types ADD COLUMN category TEXT;

-- Correction for Proformas (Purchase Invoices need issue_date exposed if missing, though it should be there)
-- Just ensuring it exists or adding it if it was missed in a previous migration.
-- schema_v5_purchasing.sql usually has issue_date. If it failed, we add it here.
ALTER TABLE purchase_invoices ADD COLUMN issue_date TEXT;

-- Correction for Warehouses (Legacy NOT NULL constraint fix)
-- We can't easily DROP NOT NULL in SQLite without table recreation.
-- Instead, we ensure we populate 'name' with 'name_ar' values to satisfy the constraint if it exists.
-- UPDATE warehouses SET name = name_ar WHERE name IS NULL OR name = '';

-- Ensure 'location' column exists for Warehouses
-- ALTER TABLE warehouses ADD COLUMN location TEXT;

-- Ensure Payment Methods has 'type'
-- ALTER TABLE payment_methods ADD COLUMN type TEXT;
