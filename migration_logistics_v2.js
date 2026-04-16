
const path = require('path');
const Database = require('better-sqlite3');

try {
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
    console.log('Opening DB:', dbPath);
    const db = new Database(dbPath);

    // Add new columns to vehicles table
    // vehicles: vehicle_code, description, driver_id, color, insurance_expiry, license_expiry

    const columns = [
        "vehicle_code TEXT",
        "description TEXT",
        "driver_id TEXT",
        "color TEXT",
        "insurance_expiry TEXT", // Date string
        "license_expiry TEXT"    // Date string
    ];

    for (const col of columns) {
        try {
            db.prepare(`ALTER TABLE vehicles ADD COLUMN ${col}`).run();
            console.log(`Added column: ${col}`);
        } catch (e) {
            // Ignore if column exists
            if (!e.message.includes('duplicate column')) {
                console.log(`Column likely exists or error: ${col} -> ${e.message}`);
            }
        }
    }

    console.log('Migration completed.');

} catch (e) {
    console.error('Error:', e);
}
