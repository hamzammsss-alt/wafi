const Database = require('better-sqlite3');
const db = new Database('data.db');

try {
    const banks = db.prepare("SELECT id, account_code, name_ar FROM gl_chart_of_accounts WHERE account_code LIKE '11%' AND (name_ar LIKE '%بنك%' OR name_ar LIKE '%Bank%')").all();
    console.log('Banks found:', JSON.stringify(banks, null, 2));
} catch (error) {
    console.error('Error querying database:', error);
}
