const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.APPDATA + '/wafi-erp/wafi.db';
console.log('DB Path:', dbPath);

try {
    const db = new Database(dbPath);
    const cols = db.prepare("PRAGMA table_info(business_partners)").all();
    const hasMemId = cols.some(c => c.name === 'membership_id');

    if (!hasMemId) {
        console.log('membership_id is missing! Adding fields from V42...');
        const sql = fs.readFileSync(path.join(__dirname, '../database/schema_v42_partner_profile_expansion.sql'), 'utf8');
        const stmts = sql.split(';').filter(s => s.trim().length > 0);
        for (const stmt of stmts) {
            try {
                db.prepare(stmt).run();
                console.log('Executed successfully.');
            } catch (e) {
                if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) {
                    console.error('Failed command with error:', e.message);
                }
            }
        }
        console.log('Finished applying V42 schema.');
    } else {
        console.log('membership_id already exists.');
    }
} catch (e) {
    console.error('Database connection failed:', e.message);
}
process.exit(0);
