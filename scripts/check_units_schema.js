#!/usr/bin/env node
const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('./wafi.db');

console.log('=== Units Table Schema ===\n');
const columns = db.prepare("PRAGMA table_info('units')").all();
console.log('Columns:');
columns.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
});

db.close();
