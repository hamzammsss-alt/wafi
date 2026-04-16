const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

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
const cols = db.prepare('PRAGMA table_info(accounts)').all().map((c) => c.name);
const has = (n) => cols.includes(n);

const getCount = (whereSql = '', params = []) => {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM accounts ${whereSql}`).get(...params);
  return Number(row.c || 0);
};

console.log(`Total accounts: ${getCount()}`);

if (has('type')) {
  const rows = db.prepare("SELECT UPPER(COALESCE(type, '')) AS v, COUNT(*) AS c FROM accounts GROUP BY UPPER(COALESCE(type, '')) ORDER BY c DESC").all();
  console.log('\nBy type:');
  rows.forEach((r) => console.log(`- ${r.v || '(empty)'}: ${r.c}`));
}

if (has('account_category')) {
  const rows = db.prepare("SELECT UPPER(COALESCE(account_category, '')) AS v, COUNT(*) AS c FROM accounts GROUP BY UPPER(COALESCE(account_category, '')) ORDER BY c DESC").all();
  console.log('\nBy category:');
  rows.forEach((r) => console.log(`- ${r.v || '(empty)'}: ${r.c}`));
}

if (has('account_subtype')) {
  const rows = db.prepare("SELECT UPPER(COALESCE(account_subtype, '')) AS v, COUNT(*) AS c FROM accounts GROUP BY UPPER(COALESCE(account_subtype, '')) ORDER BY c DESC").all();
  console.log('\nBy subtype:');
  rows.forEach((r) => console.log(`- ${r.v || '(empty)'}: ${r.c}`));
}

if (has('reference_type')) {
  const rows = db.prepare("SELECT UPPER(COALESCE(reference_type, '')) AS v, COUNT(*) AS c FROM accounts GROUP BY UPPER(COALESCE(reference_type, '')) ORDER BY c DESC").all();
  console.log('\nBy reference type:');
  rows.forEach((r) => console.log(`- ${r.v || '(empty)'}: ${r.c}`));
}
