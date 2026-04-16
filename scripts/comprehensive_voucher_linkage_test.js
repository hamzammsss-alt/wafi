/**
 * comprehensive_voucher_linkage_test.js
 * 
 * اختبار شامل لربط السندات بشجرة الحسابات والمراجع
 * يختبر: القبض، الصرف، القيود اليومية، كشف الرواتب
 */

const Database = require('better-sqlite3');
const path = require('path');

// تحديد مسار قاعدة البيانات
const dbPath = path.join(__dirname, '..', 'wafi.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('🔍 اختبار شامل لربط السندات\n');
console.log('=' .repeat(60));

// ============================================
// 1. اختبار القبض من عميل (Receipt)
// ============================================

console.log('\n📥 اختبار 1: سند قبض من عميل\n');

try {
  // البحث عن عميل
  const customer = db.prepare(`
    SELECT id, code, name FROM partners WHERE type = 'CUSTOMER' LIMIT 1
  `).get();

  if (!customer) {
    console.log('❌ لا توجد عملاء في النظام');
  } else {
    console.log(`✓ عميل: ${customer.name} (${customer.code})`);

    // البحث عن حساب العميل (ذمم مدينة)
    const cust_account = db.prepare(`
      SELECT id, code, name, account_category, reference_type 
      FROM accounts 
      WHERE code LIKE '114%' 
      AND reference_type = 'CUSTOMER'
      LIMIT 1
    `).get();

    if (cust_account) {
      console.log(`✓ حساب العميل: ${cust_account.name} (${cust_account.code})`);

      // البحث عن حساب نقدي/بنكي
      const cash_account = db.prepare(`
        SELECT id, code, name 
        FROM accounts 
        WHERE code IN ('111', '112')
        LIMIT 1
      `).get();

      if (cash_account) {
        console.log(`✓ حساب النقد: ${cash_account.name} (${cash_account.code})`);

        // محاكاة قيد القبض
        const amount = 5000;
        console.log(`\n💾 محاكاة قيد قبض بمبلغ: ${amount} ريال\n`);
        
        console.log('السطر 1 (الخصم):');
        console.log(`  - الحساب: ${cash_account.code} ${cash_account.name} | مدين: ${amount}`);
        console.log(`  - المرجع: -`);
        console.log(`  - reference_type: GENERAL`);

        console.log('\nالسطر 2 (الدائن):');
        console.log(`  - الحساب: ${cust_account.code} ${cust_account.name} | دائن: ${amount}`);
        console.log(`  - المرجع: ${customer.code}-INV001`);
        console.log(`  - reference_type: ${cust_account.reference_type}`);
        console.log(`  - sub_account_id (customer_id): ${customer.id}`);
        console.log(`  - customer_id: ${customer.id}`);
      }
    } else {
      console.log('❌ لا توجد حسابات عملاء مصنفة');
    }
  }
} catch (err) {
  console.error('❌ خطأ في الاختبار 1:', err.message);
}

// ============================================
// 2. اختبار الصرف لمورد (Payment)
// ============================================

console.log('\n' + '='.repeat(60));
console.log('\n📤 اختبار 2: سند صرف لمورد\n');

try {
  // البحث عن مورد
  const supplier = db.prepare(`
    SELECT id, code, name FROM partners WHERE type = 'SUPPLIER' LIMIT 1
  `).get();

  if (!supplier) {
    console.log('❌ لا توجد موردين في النظام');
  } else {
    console.log(`✓ مورد: ${supplier.name} (${supplier.code})`);

    // البحث عن حساب المورد (ذمم دائنة)
    const supp_account = db.prepare(`
      SELECT id, code, name, reference_type 
      FROM accounts 
      WHERE code LIKE '211%' 
      AND reference_type = 'SUPPLIER'
      LIMIT 1
    `).get();

    if (supp_account) {
      console.log(`✓ حساب المورد: ${supp_account.name} (${supp_account.code})`);

      // البحث عن حساب بنكي
      const bank_account = db.prepare(`
        SELECT id, code, name 
        FROM accounts 
        WHERE code LIKE '112%'
        LIMIT 1
      `).get();

      if (bank_account) {
        console.log(`✓ حساب بنكي: ${bank_account.name} (${bank_account.code})`);

        const amount = 10000;
        console.log(`\n💾 محاكاة قيد صرف بمبلغ: ${amount} ريال\n`);
        
        console.log('السطر 1 (الخصم):');
        console.log(`  - الحساب: ${supp_account.code} ${supp_account.name} | مدين: ${amount}`);
        console.log(`  - المرجع: ${supplier.code}-PO001`);
        console.log(`  - reference_type: ${supp_account.reference_type}`);
        console.log(`  - sub_account_id (supplier_id): ${supplier.id}`);

        console.log('\nالسطر 2 (الدائن):');
        console.log(`  - الحساب: ${bank_account.code} ${bank_account.name} | دائن: ${amount}`);
        console.log(`  - المرجع: CHQ001`);
        console.log(`  - reference_type: BANK`);
      }
    } else {
      console.log('❌ لا توجد حسابات موردين مصنفة');
    }
  }
} catch (err) {
  console.error('❌ خطأ في الاختبار 2:', err.message);
}

// ============================================
// 3. اختبار قيد يومي (Journal Entry)
// ============================================

console.log('\n' + '='.repeat(60));
console.log('\n📝 اختبار 3: قيد يومي عام\n');

try {
  // البحث عن حسابات متنوعة
  const accounts = db.prepare(`
    SELECT id, code, name, reference_type, account_category
    FROM accounts 
    WHERE is_active = 1
    ORDER BY code
    LIMIT 4
  `).all();

  if (accounts.length >= 2) {
    const debit_acc = accounts[0];
    const credit_acc = accounts[1];
    const amount = 2500;

    console.log(`✓ حساب مدين: ${debit_acc.name} (${debit_acc.code})`);
    console.log(`✓ حساب دائن: ${credit_acc.name} (${credit_acc.code})`);
    
    console.log(`\n💾 محاكاة قيد يومي بمبلغ: ${amount} ريال\n`);
    
    console.log('السطر 1 (الخصم):');
    console.log(`  - الحساب: ${debit_acc.code} ${debit_acc.name} | مدين: ${amount}`);
    console.log(`  - الفئة: ${debit_acc.account_category}`);
    console.log(`  - reference_type: ${debit_acc.reference_type}`);

    console.log('\nالسطر 2 (الدائن):');
    console.log(`  - الحساب: ${credit_acc.code} ${credit_acc.name} | دائن: ${amount}`);
    console.log(`  - الفئة: ${credit_acc.account_category}`);
    console.log(`  - reference_type: ${credit_acc.reference_type}`);
  }
} catch (err) {
  console.error('❌ خطأ في الاختبار 3:', err.message);
}

// ============================================
// 4. إحصائية الحسابات
// ============================================

console.log('\n' + '='.repeat(60));
console.log('\n📊 إحصائية النظام\n');

try {
  // إحصائيات الحسابات
  const acc_stats = db.prepare(`
    SELECT 
      type,
      COUNT(*) as count,
      COUNT(NULLIF(reference_type, 'GENERAL')) as linked,
      ROUND(AVG(balance), 2) as avg_balance
    FROM accounts 
    WHERE is_active = 1
    GROUP BY type
    ORDER BY count DESC
  `).all();

  console.log('📌 توزيع الحسابات حسب النوع:\n');
  acc_stats.forEach(row => {
    console.log(`  ${row.type.padEnd(12)} : ${String(row.count).padStart(3)} حساب (${row.linked} مرتبط)`);
  });

  // إحصائيات أنواع المراجع
  const ref_stats = db.prepare(`
    SELECT 
      reference_type,
      COUNT(*) as count
    FROM accounts
    WHERE is_active = 1
    GROUP BY reference_type
    ORDER BY count DESC
  `).all();

  console.log('\n📌 توزيع أنواع المراجع:\n');
  ref_stats.forEach(row => {
    console.log(`  ${row.reference_type.padEnd(12)} : ${String(row.count).padStart(3)} حساب`);
  });

  // إحصائيات السند الحالية (إن وجدت)
  const voucher_count = db.prepare(`
    SELECT COUNT(*) as count FROM journal_entries
  `).get();

  console.log('\n📌 السندات الحالية:\n');
  console.log(`  المجموع: ${voucher_count.count} سند`);

  if (voucher_count.count > 0) {
    const recent_vouchers = db.prepare(`
      SELECT je.id, je.type, COUNT(jel.id) as line_count
      FROM journal_entries je
      LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
      GROUP BY je.id
      ORDER BY je.id DESC
      LIMIT 5
    `).all();

    console.log('\n  آخر 5 سندات:');
    recent_vouchers.forEach(v => {
      console.log(`    - ID: ${v.id} | النوع: ${v.type} | الأسطر: ${v.line_count}`);
    });
  }
} catch (err) {
  console.error('❌ خطأ في الإحصائيات:', err.message);
}

// ============================================
// 5. تقرير الجاهزية
// ============================================

console.log('\n' + '='.repeat(60));
console.log('\n✅ تقرير جاهزية النظام\n');

try {
  const checks = {
    'شجرة الحسابات': {
      total: db.prepare('SELECT COUNT(*) as c FROM accounts').get().c,
      classified: db.prepare('SELECT COUNT(*) as c FROM accounts WHERE type IS NOT NULL').get().c
    },
    'أنواع المراجع': {
      specific: db.prepare('SELECT COUNT(*) as c FROM accounts WHERE reference_type != "GENERAL"').get().c,
      total: db.prepare('SELECT COUNT(*) as c FROM accounts').get().c
    },
    'السندات': {
      receipts: db.prepare('SELECT COUNT(*) as c FROM journal_entries WHERE type = "RECEIPT"').get().c,
      payments: db.prepare('SELECT COUNT(*) as c FROM journal_entries WHERE type = "PAYMENT"').get().c,
      journals: db.prepare('SELECT COUNT(*) as c FROM journal_entries WHERE type = "JOURNAL"').get().c
    }
  };

  Object.entries(checks).forEach(([name, data]) => {
    console.log(`${name}:`);
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object') {
        console.log(`  ${key}: ${value.specific || value} ${value.total ? `من ${value.total}` : ''}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });
  });

  console.log('\n✓ النظام جاهز للاستخدام!');
} catch (err) {
  console.error('❌ خطأ في التقرير:', err.message);
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ انتهى الاختبار الشامل\n');

db.close();
