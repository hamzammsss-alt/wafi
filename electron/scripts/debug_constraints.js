const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite'); // Adjust path as needed
const db = new Database(dbPath, { verbose: console.log });

console.log('--- BRANCHES ---');
try {
    const branches = db.prepare('SELECT id, name_ar FROM branches').all();
    console.log(branches);
} catch (e) {
    console.error(e.message);
}

console.log('\n--- CURRENCIES ---');
try {
    const currencies = db.prepare('SELECT id, code FROM currencies').all();
    console.log(currencies);
} catch (e) {
    console.error(e.message);
}

console.log('\n--- SYSTEM INFO ---');
try {
    const sys = db.prepare('SELECT * FROM system_info').all();
    console.log(sys);
} catch (e) {
    console.error(e.message);
}
