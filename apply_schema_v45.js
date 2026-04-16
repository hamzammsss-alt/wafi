const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'wafi.db');
const sqlPath = path.join(__dirname, 'database', 'schema_v45_treasury_updates.sql');

try {
    const db = new Database(dbPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    db.exec(sql);
    console.log('Successfully applied ' + sqlPath);
    db.close();
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('Columns already exist. Schema is up to date.');
    } else {
        console.error('Error applying schema:', error);
    }
}
