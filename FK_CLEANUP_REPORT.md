# FK Violations Cleanup Report

## 📊 الملخص الكامل

**حالة البيانات النهائية:** ✅ **صفر انتهاكات FK**

### المراحل:
1. **المحاولة الأولى:** حذفنا 9 صفوف → بقي 2 انتهاك
2. **المحاولة الثانية:** حذفنا 2 صف → 0 انتهاك ✅

**إجمالي الصفوف المحذوفة:** 11 صف

---

## 🔍 تحليل الانتهاكات

### الانتهاكات التي تم حذفها:

#### المرحلة الأولى (9 انتهاكات):
| الجدول | Rowid | يشير إلى | الحالة |
|--------|-------|---------|-------|
| `sales_returns` | 1 | `sales_invoices_bad_fk_backup` | ❌ جدول غير موجود |
| `treasury_vouchers` | 1 | `gl_journal_headers` | ❌ جدول غير موجود |
| `purchase_return_lines` | 1 | `purchase_returns_bad_fk_backup` | ❌ جدول غير موجود |
| `sales_quotation_lines` | 1 | `sales_quotations_bad_fk_backup` | ❌ جدول غير موجود |
| `purchase_invoices` | 1 | `branches` (id=1) | ❌ صف غير موجود |
| `purchase_invoice_lines` | 1 | `purchase_invoices_bad_fk_backup` | ❌ جدول غير موجود |
| `sales_order_lines` | 1 | `sales_orders_bad_fk_backup` | ❌ جدول غير موجود |
| `sales_invoice_lines` | 1 | `sales_invoices_bad_fk_backup` | ❌ جدول غير موجود |
| `purchase_order_lines` | 1 | `purchase_orders_bad_fk_backup` | ❌ جدول غير موجود |

#### المرحلة الثانية (2 انتهاك متبقي):
| الجدول | Rowid | يشير إلى | السبب |
|--------|-------|---------|-------|
| `purchase_returns` | 1 | `purchase_invoices(3)` | ❌ تم حذف الصف الأب |
| `sales_return_lines` | 1 | `sales_returns(1)` | ❌ تم حذف الصف الأب |

---

## 🛠️ الأسباب الجذرية

### 1. أسطر تشير إلى جداول غير موجودة
بعض الأسطر تحتوي على مفاتيح خارجية تشير إلى جداول بأسماء غير عادية (مثل `*_bad_fk_backup`). هذه الجداول لا توجد في الواقع في قاعدة البيانات.

### 2. أسطر يتيمة (Orphaned Rows)
بعد حذف الأسطر الأب (مثل `sales_returns`، `purchase_invoices`)، بقيت بعض الأسطر الفرعية التي تشير إليها بدون كائن والدها.

### 3. مداخل الاختبار غير المتزامنة
سكريبت seed_test_data.js كان ينشئ بيانات اختبار بسرعة دون التحقق من قيود FK، مما أدى إلى بيانات غير متسقة.

---

## 🧹 عملية التنظيف

### الخطوات المتخذة:

```javascript
1. تفعيل PRAGMA foreign_keys = ON
   ↓
2. جلب جميع FK violations باستخدام PRAGMA foreign_key_check
   ↓
3. تعطيل قيود FK مؤقتاً: PRAGMA foreign_keys = OFF
   ↓
4. حذف جميع الأسطر المنتهكة باستخدام rowid
   ↓
5. إعادة تفعيل قيود FK: PRAGMA foreign_keys = ON
   ↓
6. التحقق من Violations = 0
```

### أسباب التعطيل المؤقت:
- قيود FK تمنع حذف الأسطر التي تشير إلى جداول غير موجودة
- بدون تعطيل مؤقت، يفشل الحذف مع خطأ "no such table"

---

## ✅ الحالة النهائية

```
[Violations] After cleanup: 0
[Deleted] Total rows removed: 11
✅ SUCCESS: All FK violations have been cleaned!
```

**جودة البيانات:** 🟢 **ممتازة**
- جميع الأسطر الموجودة تشير إلى صفوف موجودة فعلاً
- لا توجد مراجع معطلة
- البيئة جاهزة للاختبار

---

## 🔧 أوامر متوفرة

### تشغيل التنظيف:
```bash
npm run cleanup:fk
```

### تشغيل الـ Seed + التنظيف:
```bash
npm run seed:test-data && npm run cleanup:fk
```

---

## 📝 التوصيات المستقبلية

### 1. تحسين سكريبت Seed
```javascript
// بدلاً من إدراج البيانات عشوائياً، تحقق من FK:
PRAGMA foreign_keys = ON

// أدرج الأسطر الأب أولاً
INSERT INTO branches ...
INSERT INTO items ...

// ثم أدرج البيانات الفرعية
INSERT INTO purchase_invoices (references branches)
INSERT INTO purchase_invoice_lines (references purchase_invoices)
```

### 2. التحقق التلقائي بعد الـ Seed
```javascript
const violations = db.prepare('PRAGMA foreign_key_check').all();
if (violations.length > 0) {
  console.warn(`⚠️ Found ${violations.length} FK violations after seed`);
  // قم بالتنظيف تلقائياً
}
```

### 3. اختبار FK دورياً
```bash
# أضف إلى CI/CD:
npm run cleanup:fk -- --check-only  # فقط تحقق، لا تحذف
```

---

## 📊 إحصائيات المحاولات

| المحاولة | الانتهاكات قبل | المحذوفة | الانتهاكات بعد |
|--------|---------------|---------|----------------|
| 1 | 9 | 9 | 2 |
| 2 | 2 | 2 | **0** ✅ |
| **الإجمالي** | — | **11** | — |

---

**التاريخ:** 2026-04-06  
**الحالة:** ✅ مكتمل  
**جودة البيانات:** 🟢 نظيفة تماماً
