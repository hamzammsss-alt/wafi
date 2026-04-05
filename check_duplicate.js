const path = require('path');
const os = require('os');
const { app } = require('electron');

// Need to wait for app ready if we use 'app.getPath', but simply checking fixed path is easier for a script
// However, since we launch with electron, we can use app.getPath safely if we wrap in ready, 
// OR just use the known path since we are debugging.
// Let's use the known path to avoid async complexity in a simple script.

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'wafi-erp', 'wafi.db');
const Database = require('better-sqlite3');

try {
    const db = new Database(dbPath, { verbose: console.log });
    const nid = '404084097';
    const row = db.prepare('SELECT * FROM hr_employees WHERE national_id = ?').get(nid);

    if (row) {
        console.log('--- FOUND EMPLOYEE ---');
        console.log(JSON.stringify(row, null, 2));
    } else {
        console.log('--- NO EMPLOYEE FOUND ---');
    }
} catch (e) {
    console.error('Error:', e);
}

// Exit explicitly
process.exit(0);
