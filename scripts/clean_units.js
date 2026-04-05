const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'wafi-erp', 'wafi.db');
console.log('Opening DB at:', dbPath);

try {
    const db = new Database(dbPath);

    // Check count before
    const countBefore = db.prepare("SELECT COUNT(*) as c FROM units").get();
    console.log('Total units before:', countBefore.c);

    // Delete empty or bad IDs
    const res = db.prepare("DELETE FROM units WHERE id IS NULL OR id = '' OR id = 'undefined'").run();
    console.log('Deleted invalid units:', res.changes);

    // Check count after
    const countAfter = db.prepare("SELECT COUNT(*) as c FROM units").get();
    console.log('Total units after:', countAfter.c);

} catch (err) {
    console.error('Error cleaning DB:', err);
}
