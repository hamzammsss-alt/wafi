const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function resolveDbPath() {
  const candidates = [
    path.resolve('wafi.db'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'wafi-erp', 'wafi.db') : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Could not locate database file (wafi.db).');
}

const db = new Database(resolveDbPath());
const info = db.prepare('PRAGMA table_info(accounts)').all();

console.log('Accounts table columns:');
info.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

db.close();
