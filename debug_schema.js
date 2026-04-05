const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.env.APPDATA, 'wafi-erp', 'wafi.db');
console.log(`Connecting to ${dbPath}`);
const db = new Database(dbPath);

const objects = db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master").all();

let output = '';
for (const obj of objects) {
    output += `TYPE: ${obj.type}\nNAME: ${obj.name}\nTBL_NAME: ${obj.tbl_name}\nSQL: ${obj.sql}\n----------------------------------------\n`;
}

fs.writeFileSync('schema_dump.txt', output);
console.log(`Dumped ${objects.length} objects to schema_dump.txt`);
db.close();
