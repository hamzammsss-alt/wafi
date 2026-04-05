const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Determine App Data path
const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share");
const dbPath = path.join(appData, 'wafi-erp', 'wafi.db');

console.log(`Checking database at: ${dbPath}`);

try {
    const db = new Database(dbPath, { readonly: true });

    // Check banks count
    const count = db.prepare('SELECT COUNT(*) as count FROM banks').get().count;
    console.log(`Total banks in database: ${count}`);

    // Check for a specific bank from the HTML file (e.g., Leumi code 10)
    // Adjust logic if bank_code is stored differently (e.g. string vs int)
    const sample = db.prepare("SELECT * FROM banks WHERE bank_code = '10' OR bank_code = 10 LIMIT 1").get();
    if (sample) {
        console.log('Sample bank found:', sample);
    } else {
        console.log('Sample bank (Code 10) not found.');
    }

    db.close();
} catch (err) {
    console.error('Error verifying database:', err);
}
