-- Schema V44: Order to Invoice Cycle Integration
-- Adds columns to link Sales Orders -> Dispatch -> Invoices

-- 1. Sales Orders
ALTER TABLE sales_orders ADD COLUMN delivery_status TEXT DEFAULT 'PENDING';

-- 2. Sales Order Lines
ALTER TABLE sales_order_lines ADD COLUMN dispatched_qty REAL DEFAULT 0;
ALTER TABLE sales_order_lines ADD COLUMN invoiced_qty REAL DEFAULT 0;

-- 3. Dispatch Header
ALTER TABLE dispatch_header ADD COLUMN source_type TEXT;
ALTER TABLE dispatch_header ADD COLUMN source_id TEXT;

-- 4. Dispatch Lines
ALTER TABLE dispatch_lines ADD COLUMN source_line_id TEXT;

-- 5. Sales Invoices
ALTER TABLE sales_invoices ADD COLUMN dispatch_id TEXT;
ALTER TABLE sales_invoices ADD COLUMN order_id TEXT;

-- 6. Sales Invoice Lines
ALTER TABLE sales_invoice_lines ADD COLUMN dispatch_line_id TEXT;
