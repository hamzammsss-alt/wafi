
const path = require('path');
const Database = require('better-sqlite3');

const appData = process.env.APPDATA;
const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');
console.log('Connecting to DB at:', dbPath);

try {
    const db = new Database(dbPath, { fileMustExist: true });

    console.log('\n--- Searching for "backup_fix" references in sqlite_master ---');
    const objects = db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql LIKE '%backup_fix%'").all();

    if (objects.length === 0) {
        console.log('No objects found containing "backup_fix".');
    } else {
        objects.forEach(obj => {
            console.log(`[${obj.type}] ${obj.name} on ${obj.tbl_name}`);
            console.log('SQL:', obj.sql);
            console.log('---');
        });
    }

    console.log('\n--- Listing ALL Triggers ---');
    const triggers = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='trigger'").all();
    triggers.forEach(t => console.log(`Trigger: ${t.name} (on ${t.tbl_name})`));

} catch (err) {
    console.error('Database Error:', err);
}
