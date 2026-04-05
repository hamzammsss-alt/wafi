
const path = require('path');
const Database = require('better-sqlite3');

const appData = process.env.APPDATA;
const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
const db = new Database(dbPath);

console.log('Running migration: Add linked_account_id to hr_employees');

try {
    const cols = db.prepare("PRAGMA table_info(hr_employees)").all();
    if (!cols.some(c => c.name === 'linked_account_id')) {
        db.prepare("ALTER TABLE hr_employees ADD COLUMN linked_account_id TEXT").run();
        console.log("Added 'linked_account_id' column to hr_employees.");
    } else {
        console.log("Column 'linked_account_id' already exists.");
    }
} catch (error) {
    console.error("Migration failed:", error);
}
