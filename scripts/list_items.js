#!/usr/bin/env node
const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('./wafi.db');

console.log('=== Items in Database ===\n');
const items = db.prepare('SELECT id, code, name_ar, name_en FROM items LIMIT 15').all();

if (items.length === 0) {
  console.log('No items found!');
} else {
  console.log(`Total items: ${items.length}\n`);
  items.forEach((i, idx) => {
    console.log(`${idx + 1}. [${i.id.slice(0, 8)}] ${i.code} - ${i.name_ar} (${i.name_en})`);
  });
}

db.close();
