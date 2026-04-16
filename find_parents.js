const Database = require('better-sqlite3');
const path = require('path');
const userHome = process.env.USERPROFILE || 'C:\\Users\\Ahmad Sultan';
const dbPath = path.join(userHome, 'AppData', 'Roaming', 'wafi-erp', 'wafi.db');
const db = new Database(dbPath, { fileMustExist: true });

const search = (term) => {
    return db.prepare("SELECT id, account_code, name_ar FROM gl_chart_of_accounts WHERE name_ar LIKE ? OR name_en LIKE ?").all(`%${term}%`, `%${term}%`);
};

console.log('--- Receivables ---');
console.log(search('عمم')); // Thimam
console.log(search('ذمم')); // Thimam
console.log(search('Receivable'));

console.log('--- Payables ---');
console.log(search('مورد'));
console.log(search('Payable'));

console.log('--- Employees ---');
console.log(search('موظف'));
console.log(search('Employee'));
