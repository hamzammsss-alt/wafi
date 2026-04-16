#!/usr/bin/env node
/* eslint-disable no-console */
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./wafi.db');

console.log('=== Data Integrity Check ===\n');

const tables = [
  'items', 'business_partners', 'purchase_invoices', 'purchase_invoice_lines',
  'sales_invoices', 'sales_invoice_lines', 'branches', 'warehouses', 'units'
];

tables.forEach(table => {
  try {
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${table}"`).get();
    console.log(`[✓] ${table}: ${count.cnt} rows`);
  } catch(e) {
    console.log(`[✗] ${table}: ${e.message}`);
  }
});

// Final FK check
const violations = db.prepare('PRAGMA foreign_key_check').all();
console.log(`\n[FK Check] Violations: ${violations.length}${violations.length === 0 ? ' ✅' : ' ⚠️'}`);

// Sample data check
console.log('\n=== Sample Data ===');
try {
  const item = db.prepare('SELECT code, name_ar, name_en FROM items LIMIT 1').get();
  if (item) {
    console.log(`[Item] ${item.code} - ${item.name_ar} (${item.name_en})`);
  } else {
    console.log('[Item] No items found');
  }

  const partner = db.prepare('SELECT name_ar, name_en FROM business_partners LIMIT 1').get();
  if (partner) {
    console.log(`[Partner] ${partner.name_ar} (${partner.name_en})`);
  } else {
    console.log('[Partner] No partners found');
  }
} catch (e) {
  console.log(`[Error] ${e.message}`);
}

db.close();
console.log('\n✅ Check complete!');
