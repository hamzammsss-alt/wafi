const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const paths = [
    'C:/Users/Ahmad Sultan/AppData/Roaming/wafi-pro/wafi.db',
    'C:/Users/Ahmad Sultan/AppData/Roaming/wafi-erp/wafi.db',
    'C:/Users/Ahmad Sultan/AppData/Roaming/Electron/wafi.db'
];

const schemaPath = path.join(__dirname, '../database/schema_v7_views.sql');
console.log(`Reading Schema: ${schemaPath}`);
const sql = fs.readFileSync(schemaPath, 'utf8');

paths.forEach(dbPath => {
    if (fs.existsSync(dbPath)) {
        console.log(`Opening DB: ${dbPath}`);
        try {
            const db = new Database(dbPath);
            console.log('Executing Schema...');
            db.exec(sql);
            console.log('Success!');
            db.close();
        } catch (err) {
            console.error(`Error processing ${dbPath}:`, err);
        }
    } else {
        console.log(`DB not found at: ${dbPath}`);
    }
});
