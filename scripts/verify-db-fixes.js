const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'wafi-erp', 'wafi.db');

console.log(`Checking DB at: ${dbPath}`);

try {
    const db = new Database(dbPath, { readonly: true });

    // 1. Check journal_entries
    try {
        const stmt = db.prepare('SELECT count(*) as count FROM journal_entries');
        const res = stmt.get();
        console.log(`[OK] Table 'journal_entries' exists. Count: ${res.count}`);
    } catch (e) {
        console.error(`[FAIL] Table 'journal_entries' check failed: ${e.message}`);
    }

    // 2. Check business_partners columns
    try {
        const stmt = db.prepare('PRAGMA table_info(business_partners)');
        const cols = stmt.all();
        const hasRegion = cols.some(c => c.name === 'region_id');

        if (hasRegion) {
            console.log(`[OK] Column 'region_id' found in 'business_partners'.`);
        } else {
            console.error(`[FAIL] Column 'region_id' NOT found in 'business_partners'.`);
            console.log('Columns found:', cols.map(c => c.name).join(', '));
        }

    } catch (e) {
        console.error(`[FAIL] business_partners check failed: ${e.message}`);
    }

} catch (e) {
    console.error(`Failed to open DB: ${e.message}`);
}
