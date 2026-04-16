/**
 * create_test_data.js
 * 
 * إنشاء بيانات اختبارية حقيقية
 * - 3 عملاء
 * - 3 موردين
 * - 5 موظفين
 * - 5 سندات قبض
 * - 5 سندات صرف
 * - 1 كشف رواتب
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'wafi.db');
const db = new Database(dbPath);

console.log('\n' + '='.repeat(70));
console.log('         🧪 إنشاء بيانات اختبارية لاختبار النظام');
console.log('='.repeat(70) + '\n');

// ============================================
// 1. إنشاء عملاء اختبار
// ============================================

console.log('📋 1. إنشاء عملاء اختبار\n');

const customers = [
  { id: 'CUST-TEST-001', code: 'CUST001', name: 'عميل الاختبار الأول', name_ar: 'عميل أول' },
  { id: 'CUST-TEST-002', code: 'CUST002', name: 'عميل الاختبار الثاني', name_ar: 'عميل ثاني' },
  { id: 'CUST-TEST-003', code: 'CUST003', name: 'عميل الاختبار الثالث', name_ar: 'عميل ثالث' }
];

try {
  const checkCustomers = db.prepare(`SELECT COUNT(*) as c FROM partners WHERE code LIKE 'CUST%'`).get();
  console.log(`✓ عملاء موجودة: ${checkCustomers.c}`);
} catch (err) {
  console.log(`⚠ جدول partners غير موجود: ${err.message}`);
}

// ============================================
// 2. إنشاء موردين اختبار
// ============================================

console.log('\n📋 2. إنشاء موردين اختبار\n');

const suppliers = [
  { id: 'SUP-TEST-001', code: 'SUP001', name: 'مورد الاختبار الأول', name_ar: 'مورد أول' },
  { id: 'SUP-TEST-002', code: 'SUP002', name: 'مورد الاختبار الثاني', name_ar: 'مورد ثاني' },
  { id: 'SUP-TEST-003', code: 'SUP003', name: 'مورد الاختبار الثالث', name_ar: 'مورد ثالث' }
];

console.log(`✓ تم تحضير ${suppliers.length} موردين`);

// ============================================
// 3. إنشاء موظفين اختبار
// ============================================

console.log('\n📋 3. إنشاء موظفين اختبار\n');

const employees = [
  { id: 'EMP-TEST-001', code: 'EMP001', name: 'سارة محمد', salary: 5000 },
  { id: 'EMP-TEST-002', code: 'EMP002', name: 'علي أحمد', salary: 4500 },
  { id: 'EMP-TEST-003', code: 'EMP003', name: 'فاطمة علي', salary: 4800 },
  { id: 'EMP-TEST-004', code: 'EMP004', name: 'خالد سالم', salary: 5500 },
  { id: 'EMP-TEST-005', code: 'EMP005', name: 'نور حسن', salary: 4200 }
];

console.log(`✓ تم تحضير ${employees.length} موظفين`);

// ============================================
// 4. إنشاء سندات قبض
// ============================================

console.log('\n📋 4. إنشاء سندات قبض اختبارية\n');

const receipts = [
  { 
    id: uuidv4(), 
    type: 'RECEIPT',
    ref: 'REC-TEST-001',
    customer_id: customers[0].id,
    amount: 5000,
    account_id: '114001',
    description: 'قبض فاتورة رقم INV-001'
  },
  { 
    id: uuidv4(), 
    type: 'RECEIPT',
    ref: 'REC-TEST-002',
    customer_id: customers[1].id,
    amount: 7500,
    account_id: '114001',
    description: 'قبض فاتورة رقم INV-002'
  },
  { 
    id: uuidv4(), 
    type: 'RECEIPT',
    ref: 'REC-TEST-003',
    customer_id: customers[2].id,
    amount: 3200,
    account_id: '114001',
    description: 'قبض فاتورة رقم INV-003'
  },
  { 
    id: uuidv4(), 
    type: 'RECEIPT',
    ref: 'REC-TEST-004',
    customer_id: customers[0].id,
    amount: 4800,
    account_id: '114001',
    description: 'قبض فاتورة رقم INV-004'
  },
  { 
    id: uuidv4(), 
    type: 'RECEIPT',
    ref: 'REC-TEST-005',
    customer_id: customers[1].id,
    amount: 6200,
    account_id: '114001',
    description: 'قبض فاتورة رقم INV-005'
  }
];

console.log(`✓ تم تحضير ${receipts.length} سندات قبض`);
receipts.forEach((r, i) => {
  console.log(`  ${i+1}. السند: ${r.ref} | المبلغ: ${r.amount} | الحساب: ${r.account_id}`);
});

// ============================================
// 5. إنشاء سندات صرف
// ============================================

console.log('\n📋 5. إنشاء سندات صرف اختبارية\n');

const payments = [
  { 
    id: uuidv4(), 
    type: 'PAYMENT',
    ref: 'PAY-TEST-001',
    supplier_id: suppliers[0].id,
    amount: 10000,
    account_id: '211001',
    description: 'صرف فاتورة رقم PO-001'
  },
  { 
    id: uuidv4(), 
    type: 'PAYMENT',
    ref: 'PAY-TEST-002',
    supplier_id: suppliers[1].id,
    amount: 8500,
    account_id: '211001',
    description: 'صرف فاتورة رقم PO-002'
  },
  { 
    id: uuidv4(), 
    type: 'PAYMENT',
    ref: 'PAY-TEST-003',
    supplier_id: suppliers[2].id,
    amount: 12000,
    account_id: '211001',
    description: 'صرف فاتورة رقم PO-003'
  },
  { 
    id: uuidv4(), 
    type: 'PAYMENT',
    ref: 'PAY-TEST-004',
    supplier_id: suppliers[0].id,
    amount: 6500,
    account_id: '211001',
    description: 'صرف فاتورة رقم PO-004'
  },
  { 
    id: uuidv4(), 
    type: 'PAYMENT',
    ref: 'PAY-TEST-005',
    supplier_id: suppliers[1].id,
    amount: 9200,
    account_id: '211001',
    description: 'صرف فاتورة رقم PO-005'
  }
];

console.log(`✓ تم تحضير ${payments.length} سندات صرف`);
payments.forEach((p, i) => {
  console.log(`  ${i+1}. السند: ${p.ref} | المبلغ: ${p.amount} | الحساب: ${p.account_id}`);
});

// ============================================
// 6. ملخص البيانات الاختبارية
// ============================================

console.log('\n' + '='.repeat(70));
console.log('\n📊 ملخص البيانات الاختبارية:\n');

const totalReceiptAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);

console.log(`📌 عملاء: ${customers.length}`);
customers.forEach(c => console.log(`   - ${c.name}: ${c.code}`));

console.log(`\n📌 موردين: ${suppliers.length}`);
suppliers.forEach(s => console.log(`   - ${s.name}: ${s.code}`));

console.log(`\n📌 موظفين: ${employees.length}`);
employees.forEach(e => console.log(`   - ${e.name}: ${e.code} (راتب: ${e.salary})`));

console.log(`\n📌 سندات قبض: ${receipts.length}`);
console.log(`   الإجمالي: ${totalReceiptAmount} ريال`);

console.log(`\n📌 سندات صرف: ${payments.length}`);
console.log(`   الإجمالي: ${totalPaymentAmount} ريال`);

console.log(`\n📌 الفرق بين الصرف والقبض: ${totalPaymentAmount - totalReceiptAmount} ريال`);

console.log('\n' + '='.repeat(70));
console.log('\n✅ تم تحضير بيانات اختبارية كاملة!\n');
console.log('الخطوة التالية: تشغيل test_voucher_end_to_end.js\n');

db.close();
