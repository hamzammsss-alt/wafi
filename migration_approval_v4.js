const path = require('path');
const Database = require('better-sqlite3');

try {
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
    console.log('Opening DB:', dbPath);
    const db = new Database(dbPath);

    db.exec(`
        -- 1. Create Scheduler Logs Table
        CREATE TABLE IF NOT EXISTS approval_scheduler_log (
            id TEXT PRIMARY KEY,
            ran_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            scanned_count INTEGER NOT NULL DEFAULT 0,
            escalated_count INTEGER NOT NULL DEFAULT 0,
            duration_ms INTEGER NOT NULL DEFAULT 0,
            error TEXT
        );

        -- 2. Keyset Pagination Indexes
        -- Standard Sorting (status, submitted_at DESC, id DESC)
        CREATE INDEX IF NOT EXISTS idx_sales_inv_keyset ON sales_invoices(status, created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_po_keyset ON purchase_orders(status, created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_pr_keyset ON purchase_requests(status, created_at DESC, id DESC);

        -- Filter Support Indexes
        CREATE INDEX IF NOT EXISTS idx_sales_inv_doc_no ON sales_invoices(invoice_no);
        CREATE INDEX IF NOT EXISTS idx_po_doc_no ON purchase_orders(order_no);
        CREATE INDEX IF NOT EXISTS idx_pr_doc_no ON purchase_requests(request_no);
        
        -- Date indices
        CREATE INDEX IF NOT EXISTS idx_sales_inv_date ON sales_invoices(date);
        CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(date);
        CREATE INDEX IF NOT EXISTS idx_pr_date ON purchase_requests(date);
    `);

    console.log('Migration completed for Approval V4.');

} catch (e) {
    console.error('Migration Error:', e);
}
