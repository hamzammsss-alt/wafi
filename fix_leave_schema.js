const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'wafi-erp', 'wafi.db');

try {
    const db = new Database(dbPath, { verbose: console.log });

    // 1. Fix Leave Types
    const cols = [
        { name: 'description', type: 'TEXT' },
        { name: 'days_per_year', type: 'INTEGER DEFAULT 30' },
        { name: 'is_paid', type: 'INTEGER DEFAULT 1' },
        { name: 'carry_forward', type: 'INTEGER DEFAULT 0' },
        { name: 'require_attachment', type: 'INTEGER DEFAULT 0' }
    ];

    const tableInfo = db.prepare('PRAGMA table_info(hr_leave_types)').all();

    for (const col of cols) {
        const exists = tableInfo.some(c => c.name === col.name);
        if (!exists) {
            console.log(`Adding ${col.name} to hr_leave_types...`);
            db.prepare(`ALTER TABLE hr_leave_types ADD COLUMN ${col.name} ${col.type}`).run();
            console.log(`✅ ${col.name} added.`);
        } else {
            console.log(`ℹ️ ${col.name} exists in hr_leave_types.`);
        }
    }

    // 2. Fix Leave Requests
    const reqCols = [
        { name: 'submission_date', type: 'DATE DEFAULT CURRENT_DATE' }
    ];

    // Check if table exists first (it should)
    const reqTableInfo = db.prepare('PRAGMA table_info(hr_leave_requests)').all();
    for (const col of reqCols) {
        const exists = reqTableInfo.some(c => c.name === col.name);
        if (!exists) {
            console.log(`Adding ${col.name} to hr_leave_requests...`);
            db.prepare(`ALTER TABLE hr_leave_requests ADD COLUMN ${col.name} ${col.type}`).run();
            console.log(`✅ ${col.name} added.`);
        } else {
            console.log(`ℹ️ ${col.name} exists in hr_leave_requests.`);
        }
    }

} catch (e) {
    console.error('❌ Error:', e.message);
}
