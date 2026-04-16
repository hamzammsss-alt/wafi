const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'wafi-erp', 'wafi.db');
console.log('Opening database at:', dbPath);

try {
    const db = new Database(dbPath);
    const employees = db.prepare('SELECT id, employee_code, first_name, last_name FROM hr_employees').all();
    console.log('Current Employees:');
    employees.forEach(e => {
        console.log(`- ${e.employee_code}: ${e.first_name} ${e.last_name} (${e.id})`);
    });

    // Check max code logic
    let maxCode = 0;
    employees.forEach((emp) => {
        const code = parseInt(emp.employee_code);
        if (!isNaN(code) && code > maxCode) {
            maxCode = code;
        }
    });
    console.log('\nMax numeric code found:', maxCode);
    console.log('Next suggested code:', maxCode > 0 ? maxCode + 1 : 1001);

    db.close();
} catch (err) {
    console.error('Error:', err.message);
}
