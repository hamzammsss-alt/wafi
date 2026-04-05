
const path = require('path');
const Database = require('better-sqlite3');

try {
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
    console.log('Opening DB:', dbPath);
    const db = new Database(dbPath);

    // Add new columns to drivers table
    // drivers: license_expiry

    const columns = [
        "license_expiry TEXT"    // Date string
    ];

    for (const col of columns) {
        try {
            db.prepare(`ALTER TABLE drivers ADD COLUMN ${col}`).run();
            console.log(`Added column: ${col}`);
        } catch (e) {
            // Ignore if column exists
            if (!e.message.includes('duplicate column')) {
                console.log(`Column likely exists or error: ${col} -> ${e.message}`);
            }
        }
    }

    console.log('Migration for drivers completed.');

} catch (e) {
    console.error('Error:', e);
}
