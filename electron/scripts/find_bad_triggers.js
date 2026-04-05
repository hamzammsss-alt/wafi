const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join('c:\\WAFI ERP', 'wafi.db');
const db = new Database(dbPath);

console.log("Checking for triggers referencing 'gl_journal_header'...");

const triggers = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'trigger'").all();

let found = false;
for (const trigger of triggers) {
    if (trigger.sql.includes('gl_journal_header')) {
        console.log(`[FOUND BAD TRIGGER] Name: ${trigger.name}, Table: ${trigger.tbl_name}`);
        console.log(`SQL: ${trigger.sql}`);
        console.log('---');
        found = true;
    }
}

if (!found) {
    console.log("No triggers found referencing 'gl_journal_header'.");
} else {
    console.log("Found bad triggers. You should drop them.");
}
