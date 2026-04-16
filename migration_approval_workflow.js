const path = require('path');
const Database = require('better-sqlite3');

try {
    const appData = process.env.APPDATA;
    // Note: ensure this path matches the rest of the application
    const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
    console.log('Opening DB:', dbPath);
    const db = new Database(dbPath);

    db.exec(`
        CREATE TABLE IF NOT EXISTS document_audit (
            id TEXT PRIMARY KEY,
            document_type TEXT NOT NULL,
            document_id TEXT NOT NULL,
            action TEXT NOT NULL,
            from_status TEXT,
            to_status TEXT,
            acted_by TEXT NOT NULL,
            acted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reason TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_doc_audit_doc_id ON document_audit(document_id);
        CREATE INDEX IF NOT EXISTS idx_doc_audit_doc_type ON document_audit(document_type);
    `);

    console.log('Created document_audit table and indexes.');

} catch (e) {
    console.error('Migration Error:', e);
}
