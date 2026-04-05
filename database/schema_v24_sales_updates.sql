-- Schema v24: Add Sales Rep
-- Necessary for Commission Calculations
-- force split
SELECT 1;
ALTER TABLE sales_invoices ADD COLUMN sales_rep_id TEXT;
