const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Attempt to find the DB in common locations
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'wafi-erp', 'wafi.db');
console.log('Inspecting Database at:', dbPath);

try {
    const db = new Database(dbPath, { readonly: true });

    console.log('\n--- Triggers Found ---');
    const triggers = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'").all();
    triggers.forEach(t => {
        console.log(`Trigger: ${t.name} on Table: ${t.tbl_name}`);
        if (t.sql.includes('business_partners_backup_fix_fk')) {
            console.log('!!! FOUND ROGUE TRIGGER !!!');
            console.log(t.sql);
        }
    });

    console.log('\n--- Tables Mentioning backup ---');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%backup%'").all();
    console.log(tables);

    db.close();
} catch (err) {
    console.error('Failed to open database:', err.message);
}
