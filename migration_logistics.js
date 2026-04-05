
const path = require('path');
const Database = require('better-sqlite3');

try {
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
    console.log('Opening DB:', dbPath);
    const db = new Database(dbPath);

    db.exec(`
        CREATE TABLE IF NOT EXISTS drivers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            license_no TEXT,
            phone TEXT,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            plate_no TEXT NOT NULL,
            model TEXT,
            brand TEXT,
            type TEXT,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log('Created drivers and vehicles tables.');

} catch (e) {
    console.error('Error:', e);
}
