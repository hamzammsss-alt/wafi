const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Try to locate DB
const userHome = process.env.USERPROFILE || 'C:\\Users\\Ahmad Sultan';
const appData = process.env.APPDATA || path.join(userHome, 'AppData', 'Roaming');

const possiblePaths = [
    path.join(appData, 'wafi-erp', 'wafi.db'),
    path.join(appData, 'WAFI ERP', 'wafi.db'),
    path.join(appData, 'wafi', 'wafi.db'),
    path.join(appData, 'Electron', 'wafi.db'),
    'c:\\WAFI ERP\\wafi.db',
    'c:\\WAFI ERP\\database.sqlite'
];

let dbPath = '';
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        dbPath = p;
        break;
    }
}

if (!dbPath) {
    console.error('Could not find wafi.db in common locations:', possiblePaths);
    process.exit(1);
}

console.log('Using DB:', dbPath);
const db = new Database(dbPath, { fileMustExist: true });

console.log('Checking Account 1141...');

try {
    const acc = db.prepare("SELECT * FROM gl_chart_of_accounts WHERE account_code = '1141'").get();
    if (!acc) {
        console.log('Account 1141 not found in gl_chart_of_accounts');

        // Check legacy accounts table
        const accLegacy = db.prepare("SELECT * FROM accounts WHERE code = '1141'").get();
        if (accLegacy) {
            console.log('Found in accounts (Legacy):', accLegacy);
            // Check if legacy has weird data
            console.log('Legacy Currency:', accLegacy.currency);
            if (accLegacy.currency && accLegacy.currency.length < 5) {
                console.log('WARNING: Legacy Currency seems to be a CODE (' + accLegacy.currency + ') not UUID.');
            }
        }
    } else {
        console.log('Found in gl_chart_of_accounts:', acc);

        if (acc.currency_id) {
            const curr = db.prepare("SELECT * FROM currencies WHERE id = ?").get(acc.currency_id);
            console.log('Currency Check:', curr ? 'Valid' : 'INVALID FOREIGN KEY (ID: ' + acc.currency_id + ')');

            if (!curr) {
                // Check if it is a code
                const currByCode = db.prepare("SELECT * FROM currencies WHERE code = ?").get(acc.currency_id);
                if (currByCode) console.log(' -> But it matches a Currency CODE! (' + currByCode.code + ')');
            }
        } else {
            console.log('Currency ID is NULL');
        }

        if (acc.parent_id) {
            const parent = db.prepare("SELECT * FROM gl_chart_of_accounts WHERE id = ?").get(acc.parent_id);
            console.log('Parent Check:', parent ? 'Valid (' + parent.account_code + ')' : 'INVALID FOREIGN KEY (ID: ' + acc.parent_id + ')');
        } else {
            console.log('Parent ID is NULL');
        }
    }

    // List Triggers
    const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'gl_chart_of_accounts'").all();
    console.log('Triggers on gl_chart_of_accounts:', triggers);

} catch (e) {
    console.error('Error:', e);
}
