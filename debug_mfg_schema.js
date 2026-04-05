
const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
// Adjusted path to match typical dev environment or resource path
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

try {
    console.log('--- Checking mfg_machines schema ---');
    const columns = db.prepare("PRAGMA table_info(mfg_machines)").all();

    if (columns.length === 0) {
        console.log('Table mfg_machines does not exist!');
    } else {
        console.table(columns);
    }

} catch (e) {
    console.error('Error inspecting database:', e);
}
