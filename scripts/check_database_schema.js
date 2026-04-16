/**
 * check_database_schema.js
 * فحص شامل لهيكل قاعدة البيانات والجداول الموجودة
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wafi.db');
const db = new Database(dbPath);

console.log('🔍 فحص هيكل قاعدة البيانات\n');
console.log('=' .repeat(60));

// الحصول على جميع الجداول
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`).all();

console.log('\n📊 الجداول الموجودة:\n');
tables.forEach(t => {
  const columns = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(`📌 ${t.name} (${columns.length} عمود)`);
  columns.forEach(col => {
    console.log(`   - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}`);
  });
  console.log('');
});

// الحصول على عدد السجلات في كل جدول مهم
console.log('=' .repeat(60));
console.log('\n📈 عدد السجلات:\n');

const importantTables = ['accounts', 'partners', 'customers', 'suppliers', 
                         'employees', 'journal_entries', 'journal_entry_lines',
                         'invoice', 'bank_accounts', 'cost_centers'];

importantTables.forEach(tableName => {
  try {
    const count = db.prepare(`SELECT COUNT(*) as c FROM ${tableName}`).get();
    console.log(`${tableName.padEnd(25)}: ${count.c} سجل`);
  } catch (err) {
    // الجدول غير موجود
  }
});

console.log('\n' + '=' .repeat(60));

// البحث عن أي جداول تحتوي على بيانات الشركاء
console.log('\n🔎 البحث عن جداول الشركاء:\n');

const partnerTables = tables
  .filter(t => t.name.toLowerCase().includes('partner') || 
               t.name.toLowerCase().includes('customer') ||
               t.name.toLowerCase().includes('supplier') ||
               t.name.toLowerCase().includes('employee'))
  .map(t => t.name);

if (partnerTables.length > 0) {
  console.log('✓ جداول الشركاء المتاحة:');
  partnerTables.forEach(t => {
    const count = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
    console.log(`  - ${t}: ${count.c} سجل`);
  });
} else {
  console.log('❌ لا توجد جداول للشركاء');
}

// البحث عن أي جداول تحتوي على بيانات السندات
console.log('\n🔎 البحث عن جداول السندات:\n');

const voucherTables = tables
  .filter(t => t.name.toLowerCase().includes('voucher') || 
               t.name.toLowerCase().includes('receipt') ||
               t.name.toLowerCase().includes('payment') ||
               t.name.toLowerCase().includes('journal'))
  .map(t => t.name);

if (voucherTables.length > 0) {
  console.log('✓ جداول السندات المتاحة:');
  voucherTables.forEach(t => {
    const count = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
    console.log(`  - ${t}: ${count.c} سجل`);
  });
} else {
  console.log('❌ لا توجد جداول للسندات');
}

console.log('\n' + '=' .repeat(60) + '\n');

db.close();
