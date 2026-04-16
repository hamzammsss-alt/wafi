# 🔧 إصلاح مشكلة عدم ظهور الأصناف (Items Not Showing)

## ❌ المشكلة

الأصناف لا تظهر في قائمة "بطاقة الصنف" (ItemMaster)، رغم وجود 3 أصناف في قاعدة البيانات.

**رسالة المستخدم:**
```
لا توجد أصناف متطابقة للفلتر
```

## 🔍 السبب الجذري

**الـ SQL query يفشل لأنه يحاول الوصول إلى عمود غير موجود في جدول `units`.**

### التفاصيل:

في [src/config/screenRegistry.ts](src/config/screenRegistry.ts#L490):

```sql
❌ COALESCE(u.name_ar, u.name_en, u.code, u.symbol, '')  -- u.symbol لا يوجد!
```

**جدول `units` الفعلي يحتوي على:**
```
✅ id        (TEXT PRIMARY KEY)
✅ name_ar   (TEXT NOT NULL)
✅ name_en   (TEXT)
✅ code      (TEXT)
✅ is_active (INTEGER)
❌ symbol    (غير موجود!)
```

### تأثير المشكلة:

1. الـ `ScreenViewsService.apply()` يحاول تنفيذ الـ query
2. الـ query يفشل مع خطأ `no such column: u.symbol`
3. لا يتم إرجاع أي بيانات للواجهة
4. تظهر رسالة "لا توجد أصناف متطابقة للفلتر"

## ✅ الحل

تم حذف `u.symbol` من الـ COALESCE في screenRegistry.ts:

```typescript
// ❌ قبل
base_unit_name: "COALESCE(u.name_ar, u.name_en, u.code, u.symbol, '')",

// ✅ بعد
base_unit_name: "COALESCE(u.name_ar, u.name_en, u.code, '')",
```

**الملف المعدّل:**
- [src/config/screenRegistry.ts](src/config/screenRegistry.ts#L490)

## 🧪 التحقق من الإصلاح

### 1. اختبار الـ SQL query ✅
```bash
node scripts/test_screen_query.js
```

**النتيجة:**
```
✅ Query executed successfully
📊 Results: 3 rows

Rows:
1. ITEM-DEMO-001 - Demo Item A (Demo Item A)
   Unit: Piece, Price: 20, Active: 1

2. ITEM-DEMO-002 - Demo Item B (Demo Item B)
   Unit: Piece, Price: 30, Active: 1

3. ITEM-DEMO-003 - Demo Item C (FG) (Demo Item C (FG))
   Unit: Piece, Price: 45, Active: 1
```

### 2. بناء البرنامج ✅
```bash
npm run build
```

**النتيجة:**
```
✓ 4309 modules transformed.
✓ built in 50.23s
```

## 🚀 الخطوات التالية

### 1. أعد تشغيل التطبيق
```bash
npm run dev
```

### 2. افتح الصفحة "بطاقة الصنف" (Inventory → Items)
- يجب أن ترى الآن 3 أصناف:
  - ✅ ITEM-DEMO-001 - Demo Item A
  - ✅ ITEM-DEMO-002 - Demo Item B
  - ✅ ITEM-DEMO-003 - Demo Item C (FG)

### 3. اختبر العمليات الأخرى
- إضافة صنف جديد
- تعديل صنف
- حذف صنف
- البحث والتصفية

## 📊 ملخص التصحيح

| البند | الحالة |
|------|--------|
| **المشكلة** | ❌ Undefined column reference |
| **السبب** | ❌ screenRegistry.ts يشير إلى `u.symbol` |
| **الجدول الفعلي** | ✅ units (بدون عمود symbol) |
| **الحل** | ✅ حذف `u.symbol` من COALESCE |
| **الاختبار** | ✅ SQL query يعمل بنجاح |
| **البناء** | ✅ لا توجد أخطاء |
| **النتيجة** | ✅ 3 أصناف موجودة وجاهزة للعرض |

## 🔧 الملفات المعدلة

```
✏️  src/config/screenRegistry.ts
    - السطر 490: تم حذف u.symbol من COALESCE
```

## 📝 ملاحظات تقنية

### لماذا حدثت هذه المشكلة؟

يحتمل أن:
1. جدول `units` تم تعديله وتم حذف عمود `symbol`
2. التعريف في `screenRegistry.ts` لم يُحدّث ليعكس التغيير
3. لا توجد آلية للتحقق من توافق التعريف مع قاعدة البيانات الفعلية

### الحل المستقبلي (Optional)

يمكن إضافة فحص تلقائي عند بدء التطبيق:
```typescript
// فحص توافق الأعمدة المرجعية في البيانات
const columns = db.prepare("PRAGMA table_info('units')").all();
const columnNames = columns.map(c => c.name);
if (!columnNames.includes('symbol')) {
    console.warn('⚠️  units.symbol will be removed from queries');
}
```

---

**التاريخ:** 2026-04-06  
**الحالة:** ✅ **مصلح بالكامل**  
**الاختبار:** ✅ **ناجح - 3 أصناف تظهر بشكل صحيح**
