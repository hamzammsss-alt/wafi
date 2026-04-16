#!/usr/bin/env node
const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('./wafi.db');

db.prepare("DELETE FROM items WHERE code LIKE 'TEST-CREATE-%'").run();
const items = db.prepare('SELECT COUNT(*) as cnt FROM items').get();
console.log('[Cleanup] Removed test items. Remaining items:', items.cnt);
db.close();
