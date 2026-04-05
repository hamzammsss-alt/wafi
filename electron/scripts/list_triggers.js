const Database = require('better-sqlite3');
const path = require('path');

// Adjust path to point to the user's actual database
const dbPaths = [
    path.join(process.env.APPDATA, 'WAFI ERP', 'wafi.db'),
    path.join(process.env.APPDATA, 'wafi-erp', 'wafi.db'),
    path.join(process.env.APPDATA, 'wafi_erp', 'wafi.db'),
    path.join('c:', 'WAFI ERP', 'wafi.db'), // Root (Dev)
    path.join('c:', 'WAFI ERP', 'backend', 'database.sqlite'),
];

let db = null;
for (const p of dbPaths) {
    try {
        console.log(`Trying path: ${p}`);
        if (require('fs').existsSync(p)) {
            db = new Database(p, { verbose: console.log });
            console.log(`Successfully opened DB at ${p}`);
            break;
        }
    } catch (e) {
        console.log(`Failed to open ${p}: ${e.message}`);
    }
}

if (db) {
    try {
        const triggers = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'trigger'").all();
        console.log("Found Triggers:", triggers.length);
        triggers.forEach(t => {
            if (t.sql && (t.sql.includes('gl_journal') || t.sql.includes('backup'))) {
                console.log('--------------------------------------------------');
                console.log(`NAME: ${t.name}`);
                console.log(`TABLE: ${t.tbl_name}`);
                console.log(`SQL: ${t.sql}`);
            }
        });
    } catch (e) {
        console.error("Error listing triggers:", e);
    }
} else {
    console.error("Could not find database file.");
}
