/**
 * list_main_tables.js
 * قائمة الجداول الرئيسية والسجلات
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wafi.db');
const db = new Database(dbPath);

console.log('📊 الجداول الرئيسية:\n');

const tables = [
  'accounts',
  'journal_entries', 
  'journal_entry_lines',
  'partners',
  'customers',
  'suppliers',
  'employees',
  'sales_invoices',
  'purchase_invoices',
  'receipts',
  'payments',
  'bank_accounts',
  'cost_centers'
];

let totalRecords = 0;

tables.forEach(table => {
  try {
    const result = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get();
    const count = result.c;
    if (count > 0 || true) {
      console.log(`✓ ${table.padEnd(25)}: ${count} سجل`);
      totalRecords += count;
    }
  } catch (err) {
    // جدول غير موجود
  }
});

console.log('\n' + '='.repeat(50));

// معلومات الحسابات
try {
  const accounts = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN reference_type != 'GENERAL' THEN 1 END) as linked,
      COUNT(DISTINCT type) as types
    FROM accounts
  `).get();
  
  console.log('\n📋 معلومات الحسابات:');
  console.log(`  - إجمالي: ${accounts.total}`);
  console.log(`  - مع مراجع: ${accounts.linked}`);
  console.log(`  - أنواع مختلفة: ${accounts.types}`);
} catch (err) {
  console.log(`❌ خطأ: ${err.message}`);
}

console.log('\n' + '='.repeat(50));

db.close();
