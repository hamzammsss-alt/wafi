-- Approvals Workflow Audit Table and Status Columns
CREATE TABLE IF NOT EXISTS approvals_audit (
    id TEXT PRIMARY KEY,
    doc_type TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    actor_user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_audit_doc ON approvals_audit(doc_type, doc_id);

-- Depending on what tables exist, we should ensure they have 'status' column.
-- Many tables already have status (e.g. sales_invoices, purchase_orders, etc.).
-- If they don't, we'd add it here, but typically they do.
-- Just in case, this file can be expanded if specific tables need 'status'.

-- Examples of adding status if missing (sqlite ALTER TABLE ADD COLUMN ignores safely in custom transaction runner)
-- ALTER TABLE sales_invoices ADD COLUMN status TEXT DEFAULT 'DRAFT';
-- ALTER TABLE purchase_orders ADD COLUMN status TEXT DEFAULT 'DRAFT';
