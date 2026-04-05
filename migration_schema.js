
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

try {
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
    console.log('Opening DB:', dbPath);
    const db = new Database(dbPath);

    db.exec(`
         CREATE TABLE IF NOT EXISTS stock_document_lines (
             id TEXT PRIMARY KEY,
             document_id TEXT NOT NULL,
             item_id TEXT NOT NULL,
             quantity REAL DEFAULT 0,
             cost REAL DEFAULT 0,
             notes TEXT,
             FOREIGN KEY(document_id) REFERENCES stock_documents(id) ON DELETE CASCADE
         );
     `);
    console.log('Created stock_document_lines table.');
} catch (e) {
    console.error('Error:', e);
}
