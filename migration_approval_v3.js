const path = require('path');
const Database = require('better-sqlite3');

try {
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
    console.log('Opening DB:', dbPath);
    const db = new Database(dbPath);

    db.exec(`
        -- 1. Create SLA Rules Table
        CREATE TABLE IF NOT EXISTS approval_sla_rules (
            id TEXT PRIMARY KEY,
            doc_type TEXT NOT NULL,
            level INTEGER NOT NULL,
            sla_minutes INTEGER NOT NULL DEFAULT 60,
            escalate_to_level INTEGER,
            enabled BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Indexes for Overdue/SLA Sweeps
        -- (status, submitted_at) already partially covered, but we enforce specific ones
        CREATE INDEX IF NOT EXISTS idx_sales_inv_type_status ON sales_invoices(status);
        CREATE INDEX IF NOT EXISTS idx_po_type_status ON purchase_orders(status);
        CREATE INDEX IF NOT EXISTS idx_pr_type_status ON purchase_requests(status);

        CREATE INDEX IF NOT EXISTS idx_sales_inv_created_at ON sales_invoices(created_at);
        CREATE INDEX IF NOT EXISTS idx_po_created_at ON purchase_orders(created_at);
        CREATE INDEX IF NOT EXISTS idx_pr_created_at ON purchase_requests(created_at);
    `);

    // 3. Add version and metadata columns
    const tablesToAlter = [
        { table: 'sales_invoices' },
        { table: 'purchase_orders' },
        { table: 'purchase_requests' }
    ];

    tablesToAlter.forEach(({ table }) => {
        try {
            db.exec(`ALTER TABLE ${table} ADD COLUMN version INTEGER NOT NULL DEFAULT 1;`);
            console.log(`Added version to ${table}`);
        } catch (e) {
            console.log(`Column version may already exist in ${table}`);
        }
    });

    try {
        db.exec(`ALTER TABLE document_audit ADD COLUMN metadata_json TEXT; `);
        console.log('Added metadata_json to document_audit');
    } catch (e) { console.log('Column metadata_json may already exist in document_audit'); }

    console.log('Migration completed for Approval V3.');

} catch (e) {
    console.error('Migration Error:', e);
}
