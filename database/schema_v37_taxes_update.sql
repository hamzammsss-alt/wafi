-- Add limit and fixed amount support to taxes
-- Note: SQLite does not support adding multiple columns in one ALTER TABLE, but it supports ADD COLUMN one by one.
-- Or we can recreate the table. Since it's a dev environment, we can recreate it or just ADD COLUMN if supported.
-- Safest is ADD COLUMN IF NOT EXISTS? SQLite 3.35+ supports DROP COLUMN.
-- Let's just use ALTER TABLE ADD COLUMN.

ALTER TABLE taxes ADD COLUMN amount REAL DEFAULT 0;
ALTER TABLE taxes ADD COLUMN is_fixed INTEGER DEFAULT 0; -- 0: Percentage, 1: Fixed Amount
