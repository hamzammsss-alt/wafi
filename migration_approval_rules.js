const path = require('path');
const Database = require('better-sqlite3');

try {
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
    console.log('Opening DB:', dbPath);
    const db = new Database(dbPath);

    db.exec(`
        -- 1. Create Approval Rules Table
        CREATE TABLE IF NOT EXISTS approval_rules (
            id TEXT PRIMARY KEY,
            doc_type TEXT NOT NULL,
            min_amount REAL NOT NULL DEFAULT 0,
            requires_level INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Indexes for Inbox Filters
        -- For an inbox view, we ideally need indexes on the tables that participate. 
        -- Creating common indexes across expected document tables.

        -- Sales Invoices
        CREATE INDEX IF NOT EXISTS idx_sales_inv_status_date ON sales_invoices(status, created_at);
        CREATE INDEX IF NOT EXISTS idx_sales_inv_doc_no ON sales_invoices(invoice_no);
        CREATE INDEX IF NOT EXISTS idx_sales_inv_date_only ON sales_invoices(date);

        -- Purchase Orders
        CREATE INDEX IF NOT EXISTS idx_po_status_date ON purchase_orders(status, created_at);
        CREATE INDEX IF NOT EXISTS idx_po_doc_no ON purchase_orders(order_no);
        CREATE INDEX IF NOT EXISTS idx_po_date_only ON purchase_orders(date);

        -- Purchase Requests
        CREATE INDEX IF NOT EXISTS idx_pr_status_date ON purchase_requests(status, created_at);
        CREATE INDEX IF NOT EXISTS idx_pr_doc_no ON purchase_requests(request_no);
        CREATE INDEX IF NOT EXISTS idx_pr_date_only ON purchase_requests(date);
    `);

    // 3. Add optional columns to document tables (SQLite ALTER TABLE ADD COLUMN)
    const tablesToAlter = [
        { table: 'sales_invoices' },
        { table: 'purchase_orders' },
        { table: 'purchase_requests' }
    ];

    tablesToAlter.forEach(({ table }) => {
        try {
            db.exec(`ALTER TABLE ${table} ADD COLUMN approval_level_required INTEGER DEFAULT 1;`);
            console.log(`Added approval_level_required to ${table}`);
        } catch (e) { /* Column might already exist */ }

        try {
            db.exec(`ALTER TABLE ${table} ADD COLUMN rejected_level INTEGER;`);
            console.log(`Added rejected_level to ${table}`);
        } catch (e) { /* Column might already exist */ }
    });

    console.log('Migration completed for Approval Rules and Schema Extents.');

} catch (e) {
    console.error('Migration Error:', e);
}
