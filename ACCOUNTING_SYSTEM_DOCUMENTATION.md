# نظام المحاسبة الموحد - توثيق شامل

**التاريخ:** 11 أبريل 2026
**الإصدار:** v1.0
**الحالة:** ✓ مكتمل ومفعّل

---

## 1. مكونات النظام المحاسبي

### أ. شجرة الحسابات (Chart of Accounts)
- **إجمالي الحسابات:** 126 حساب
- **التصنيف الأساسي (Account Type):**
  - ASSET (الأصول): 45 حساب
  - EXPENSE (المصاريف): 36 حساب
  - LIABILITY (الالتزامات): 18 حساب
  - EQUITY (حقوق الملكية): 14 حساب
  - REVENUE (الإيرادات): 13 حساب

### ب. التصنيفات الثانوية
- **account_category:** تقسيم ميزانية مقابل الدخل
  - BALANCE_SHEET: الأصول + الالتزامات + حقوق الملكية (77 حساب)
  - INCOME_STATEMENT: الإيرادات + المصاريف (49 حساب)

- **account_subtype:** تصنيف وظيفي
  - CASH: الصناديق النقدية (111x)
  - BANK_ACCOUNT: الحسابات البنكية (112x)
  - RECEIVABLES: الذمم المدينة (114x)
  - PAYABLES: الذمم الدائنة (211x)
  - إلخ... (85 حساب مصنف)

- **reference_type:** نوع الربط
  - CUSTOMER: 6 حسابات (عملاء)
  - SUPPLIER: 6 حسابات (موردين)
  - EMPLOYEE: 12 حساب (موظفين)
  - BANK: 6 حسابات (بنوك)
  - GENERAL: 96 حساب (حسابات عامة)

---

## 2. الربط مع الكيانات الأساسية

### أ. ربط السندات (Vouchers)
```
Voucher (Receipt/Payment/Journal)
    ↓
Journal Entry Header
    ↓
Journal Entry Lines
    ├─ account_id → Chart of Accounts
    ├─ sub_account_id → Linked Partner Account
    ├─ invoice_ref → Invoice/Reference Number
    ├─ tax_ref → Tax Reference
    ├─ customer_id → Partner Link
    └─ bank_account_id → Bank Account Link
```

### ب. السندات المدعومة
1. **Receipt Voucher (سند قبض)**
   - يربط عملاء بحسابات المدينة
   - يسجل دفعات العملاء
   - Linkage: partner_id → linked_account_id → journal entry

2. **Payment Voucher (سند صرف)**
   - يربط موردين بحسابات الدائنة
   - يسجل دفعات الموردين
   - Linkage: partner_id → linked_account_id → journal entry

3. **Journal Voucher (سند قيد يومي)**
   - قيود محاسبية عامة
   - دعم مستوى التفاصيل الكامل
   - Linkage: حسابات + مراجع + حسابات فرعية

4. **Payroll Voucher (كشف رواتب)**
   - تسجيل رواتب الموظفين
   - Linkage: employee_id → linked_account_id → salary accounts

---

## 3. منطق المرجع (Reference Logic)

### لكل نوع حساب:

#### CUSTOMER Accounts (114x - الذمم المدينة)
```
عند تسجيل قبض:
  - الحساب: 114x (أي من حسابات العملاء)
  - الحساب الفرعي: customer_id (معرّف العميل)
  - المرجع: invoice_no + customer_code
  - reference_type: CUSTOMER
  - نوع التفصيل: CUSTOMER_INVOICE
```

#### SUPPLIER Accounts (211x - الذمم الدائنة)
```
عند تسجيل صرف:
  - الحساب: 211x (أي من حسابات الموردين)
  - الحساب الفرعي: supplier_id (معرّف المورد)
  - المرجع: po_no + supplier_code
  - reference_type: SUPPLIER
  - نوع التفصيل: SUPPLIER_INVOICE
```

#### EMPLOYEE Accounts (52x - المصاريف المتعلقة بالموظفين)
```
عند تسجيل راتب:
  - الحساب: 52x (أي من حسابات الرواتب)
  - الحساب الفرعي: employee_id (معرّف الموظف)
  - المرجع: payroll_no + employee_code
  - reference_type: EMPLOYEE
  - نوع التفصيل: EMPLOYEE_SALARY
```

#### BANK Accounts (112x - الحسابات البنكية)
```
عند تسجيل تحويل بنكي:
  - الحساب: 112x (أي من الحسابات البنكية)
  - الحساب الفرعي: bank_account_id (معرّف الحساب البنكي)
  - المرجع: check_no / transfer_ref
  - reference_type: BANK
  - نوع التفصيل: BANK_TRANSFER
```

---

## 4. تكامل السندات مع النظام

### أ. عملية القبض (Receipt)
```
Customer Payment Input
    ↓
    Validate: customer linked account exists
    ↓
    Create Journal Entry:
    - Debit: Bank/Cash Account (112x) - amount
    - Credit: Customer Account (114x) - amount
    ↓
    Set Metadata:
    - sub_account_id = customer_id
    - invoice_ref = invoice_no
    - customer_id = customer entity id
    ↓
    Store in journal_entry_lines
```

### ب. عملية الصرف (Payment)
```
Supplier Payment Input
    ↓
    Validate: supplier linked account exists
    ↓
    Create Journal Entry:
    - Debit: Supplier Account (211x) - amount
    - Credit: Bank/Cash Account (112x) - amount
    ↓
    Set Metadata:
    - sub_account_id = supplier_id
    - invoice_ref = po_no
    - customer_id = supplier entity id
    ↓
    Store in journal_entry_lines
```

### ج. قيد يومي (Journal Entry)
```
Manual Entry Input
    ↓
    For each line:
        Validate: account_id exists
        ↓
        If reference_type != 'GENERAL':
            Resolve sub_account_id from reference
            Set invoice_ref = reference_code
        ↓
        Store: account_id, debit/credit, sub_account_id, invoice_ref
```

---

## 5. راجع الفحص (Audit Trail)

### الحقول المرتبطة في journal_entry_lines:
```sql
- id: معرّف السطر الفريد
- journal_entry_id: معرّف العملية المرتبطة
- account_id: الحساب المحاسبي
- debit/credit: المبالغ
- line_description: وصف السطر
- cost_center_id: مركز التكلفة
- sub_account_id: الحساب الفرعي (Partner/Employee/Bank)
- invoice_ref: المرجع (رقم الفاتورة/الشيك/PO)
- tax_ref: المرجع الضريبي
- due_date: تاريخ الاستحقاق
- customer_id: معرّف الكيان المرتبط (Customer/Supplier/Employee)
- is_returned: هل مرتجع
- bank_account_id: الحساب البنكي (للتحويلات)
```

---

## 6. التحقق من الصحة (Validation)

### قبل حفظ كل عملية:
1. ✓ الحساب موجود ومفعّل
2. ✓ إذا كان reference_type != GENERAL، التحقق من وجود sub_account_id
3. ✓ القيد متوازن (Debit = Credit)
4. ✓ المرجع محدد (إن وجد)
5. ✓ الرابط إلى الكيان صحيح (إن وجد)

### بعد الحفظ:
- تسجيل النشاط في audit trail
- تحديث أرصدة الحسابات
- تحديث أرصدة الحسابات الفرعية (إن وجدت)

---

## 7. الحالة الحالية للنظام

### حالة القاعدة:
- ✓ شجرة الحسابات: محدثة بالكامل (126 حساب)
- ✓ التصنيفات: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
- ✓ أنواع المراجع: معرّفة ومصنفة
- ✓ الحقول المرتبطة: مضافة إلى journal_entry_lines
- ✓ السندات: جاهزة للاستخدام (0 عملية حالياً)

### حالة السندات:
- ✓ Receipt Voucher: جاهز مع الربط الكامل
- ✓ Payment Voucher: جاهز مع الربط الكامل
- ✓ Journal Voucher: جاهز مع دعم المراجع
- ✓ Payroll Voucher: جاهز مع ربط الموظفين

---

## 8. الخطوات التالية

### قريباً (Next Phase):
1. اختبار شامل لكل نوع سند مع البيانات الفعلية
2. إضافة reports للتحقق من الموازنة
3. إضافة reconciliation tools
4. تدريب المستخدمين على الاستخدام

### في المستقبل:
- دعم العملات المتعددة (Multi-currency)
- دعم الأبعاد التحليلية (Analytical Dimensions)
- Automated intercompany reconciliation
- Advanced financial analysis reports

---

## 9. الأوامر الأساسية

### لتشغيل الفحص الشامل:
```bash
npx electron scripts/comprehensive_accounting_audit.js
```

### لتحديث أنواع المراجع:
```bash
npx electron scripts/assign_reference_types.js
```

### لإعادة تصنيف الحسابات:
```bash
npx electron scripts/reclassify_coa_accounts.js
```

---

**انتهت الوثيقة**

تم إعداد هذا النظام ليكون متكاملاً وموحداً في جميع العمليات المحاسبية، مع ضمان الربط الصحيح بين السندات والحسابات والكيانات الأساسية (عملاء، موردين، موظفين، بنوك).
