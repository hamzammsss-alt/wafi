const Database = require('better-sqlite3');
const db = new Database('wafi.db');

const rows = db.prepare("SELECT id, account_code, name_ar, parent_id, is_transactional, currency_id FROM gl_chart_of_accounts WHERE account_code LIKE '112%' ORDER BY account_code").all();
console.log(JSON.stringify(rows, null, 2));

db.close();
