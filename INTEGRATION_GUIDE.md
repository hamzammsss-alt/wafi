# 🔌 دليل الدمج والتطبيق

## نظرة عامة

هذا الدليل يوضح كيفية دمج الواجهات الرسومية المحدثة في التطبيق الحقيقي.

---

## المرحلة 1: التحضيرات الأساسية

### 1.1 تحديث ملفات الروuting

```typescript
// src/config/routes.tsx

// إضافة المسارات الجديدة
const routes = [
  // قيود جديدة
  {
    path: '/treasury/receipt-updated',
    element: <ReceiptVoucherComponentUpdated mode="create" />,
    label: 'سند القبض (محدث)'
  },
  {
    path: '/treasury/payment-updated',
    element: <PaymentVoucherComponentUpdated mode="create" />,
    label: 'سند الصرف (محدث)'
  },
  {
    path: '/gl/journal-updated',
    element: <JournalVoucherComponentUpdated />,
    label: 'القيود اليومية (محدثة)'
  },
  {
    path: '/hr/payroll-updated',
    element: <PayrollVoucherComponentUpdated mode="create" />,
    label: 'سند الرواتب (محدث)'
  }
];
```

### 1.2 تحديث قائمة التنقل

```typescript
// src/components/navigation/MainMenu.tsx

const menuItems = [
  // ...قائمة قديمة...
  {
    label: 'الواجهات المحدثة',
    icon: '🔄',
    submenu: [
      {
        label: 'سند القبض المحدث',
        path: '/treasury/receipt-updated',
        icon: '💰'
      },
      {
        label: 'سند الصرف المحدث',
        path: '/treasury/payment-updated',
        icon: '💸'
      },
      {
        label: 'القيود المحدثة',
        path: '/gl/journal-updated',
        icon: '📋'
      },
      {
        label: 'الرواتب المحدثة',
        path: '/hr/payroll-updated',
        icon: '👥'
      }
    ]
  }
];
```

---

## المرحلة 2: اختبار الواجهات الجديدة

### 2.1 إنشاء صفحة اختبار شاملة

```typescript
// pages/testing/TestDashboard.tsx

import React, { useState } from 'react';
import { runAllTests } from '@/services/ComprehensiveVoucherTestSuite';

export const TestDashboard: React.FC = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRunTests = async () => {
    try {
      setLoading(true);
      const testResults = await runAllTests();
      setResults(testResults);
      console.log('✅ تم تشغيل الاختبارات بنجاح');
    } catch (err) {
      console.error('❌ خطأ في الاختبارات:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">🧪 لوحة اختبار النظام</h1>

      <button
        onClick={handleRunTests}
        disabled={loading}
        className="mb-6 px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'جاري التشغيل...' : 'تشغيل جميع الاختبارات'}
      </button>

      {results && (
        <div className="space-y-4">
          {/* Receipt Voucher Tests */}
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <h2 className="font-bold text-blue-800">سندات القبض</h2>
            <p>{results.receipt.passed} نجح، {results.receipt.failed} فشل</p>
            {results.receipt.errors.length > 0 && (
              <ul className="list-disc list-inside text-red-700">
                {results.receipt.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          {/* Payment Voucher Tests */}
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <h2 className="font-bold text-green-800">سندات الصرف</h2>
            <p>{results.payment.passed} نجح، {results.payment.failed} فشل</p>
            {results.payment.errors.length > 0 && (
              <ul className="list-disc list-inside text-red-700">
                {results.payment.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          {/* Journal Voucher Tests */}
          <div className="bg-purple-50 p-4 rounded border border-purple-200">
            <h2 className="font-bold text-purple-800">القيود اليومية</h2>
            <p>{results.journal.passed} نجح، {results.journal.failed} فشل</p>
            {results.journal.errors.length > 0 && (
              <ul className="list-disc list-inside text-red-700">
                {results.journal.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          {/* Payroll Voucher Tests */}
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
            <h2 className="font-bold text-yellow-800">سندات الرواتب</h2>
            <p>{results.payroll.passed} نجح، {results.payroll.failed} فشل</p>
            {results.payroll.errors.length > 0 && (
              <ul className="list-disc list-inside text-red-700">
                {results.payroll.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          {/* Financial Statements Tests */}
          <div className="bg-indigo-50 p-4 rounded border border-indigo-200">
            <h2 className="font-bold text-indigo-800">القوائم المالية</h2>
            <p>{results.financialStatements.passed} نجح، {results.financialStatements.failed} فشل</p>
            {results.financialStatements.errors.length > 0 && (
              <ul className="list-disc list-inside text-red-700">
                {results.financialStatements.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          {/* Sub-Accounts Tests */}
          <div className="bg-pink-50 p-4 rounded border border-pink-200">
            <h2 className="font-bold text-pink-800">الحسابات الفرعية</h2>
            <p>{results.subAccounts.passed} نجح، {results.subAccounts.failed} فشل</p>
            {results.subAccounts.errors.length > 0 && (
              <ul className="list-disc list-inside text-red-700">
                {results.subAccounts.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-100 p-4 rounded border-2 border-gray-400">
            <h2 className="font-bold text-lg">📊 ملخص النتائج</h2>
            <p className="text-lg">
              إجمالي الاختبارات: <span className="font-bold">{results.summary.totalTests}</span>
            </p>
            <p className="text-lg text-green-700">
              النجاح: <span className="font-bold">{results.summary.totalPassed}</span>
            </p>
            <p className="text-lg text-red-700">
              الفشل: <span className="font-bold">{results.summary.totalFailed}</span>
            </p>
            <p className="text-lg text-blue-800">
              معدل النجاح: <span className="font-bold">{results.summary.successRate.toFixed(2)}%</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestDashboard;
```

---

## المرحلة 3: توصيل البيانات الحقيقية

### 3.1 تحديث خدمة API

```typescript
// services/api.ts

export const createReceiptVoucher = async (data: any) => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');
  
  return api.journal.saveVoucher({
    type: 'RECEIPT',
    ...data
  });
};

export const createPaymentVoucher = async (data: any) => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');
  
  return api.journal.saveVoucher({
    type: 'PAYMENT',
    ...data
  });
};

export const createJournalVoucher = async (data: any) => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');
  
  return api.journal.saveVoucher({
    type: 'JOURNAL',
    ...data
  });
};

export const createPayrollVoucher = async (data: any) => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');
  
  return api.journal.saveVoucher({
    type: 'PAYROLL',
    ...data
  });
};
```

### 3.2 تحديث مخزن البيانات (Redux/Store)

```typescript
// store/vouchersSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const saveReceiptVoucher = createAsyncThunk(
  'vouchers/saveReceipt',
  async (data: any) => {
    const api = (window as any).electronAPI;
    return api.journal.saveVoucher({
      type: 'RECEIPT',
      ...data
    });
  }
);

export const savePaymentVoucher = createAsyncThunk(
  'vouchers/savePayment',
  async (data: any) => {
    const api = (window as any).electronAPI;
    return api.journal.saveVoucher({
      type: 'PAYMENT',
      ...data
    });
  }
);

const vouchersSlice = createSlice({
  name: 'vouchers',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(saveReceiptVoucher.pending, (state) => {
        state.loading = true;
      })
      .addCase(saveReceiptVoucher.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(saveReceiptVoucher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export default vouchersSlice.reducer;
```

---

## المرحلة 4: التكامل مع النظام

### 4.1 تحديث الصفة الرئيسية

```typescript
// App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TaskBar } from '@/components/TaskBar';

import { ReceiptVoucherComponentUpdated } from '@/components/ReceiptVoucherUpdated';
import { PaymentVoucherComponentUpdated } from '@/components/PaymentVoucherUpdated';
import { JournalVoucherComponentUpdated } from '@/components/JournalVoucherPageUpdated';
import { PayrollVoucherComponentUpdated } from '@/components/PayrollVoucherUpdated';
import TestDashboard from '@/pages/testing/TestDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <TaskBar />
        <Routes>
          {/* Voucher Routes */}
          <Route path="/treasury/receipt-updated" element={<ReceiptVoucherComponentUpdated mode="create" />} />
          <Route path="/treasury/payment-updated" element={<PaymentVoucherComponentUpdated mode="create" />} />
          <Route path="/gl/journal-updated" element={<JournalVoucherComponentUpdated />} />
          <Route path="/hr/payroll-updated" element={<PayrollVoucherComponentUpdated mode="create" />} />
          
          {/* Test Route */}
          <Route path="/testing/dashboard" element={<TestDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

### 4.2 تحديث الشريط العلوي

```typescript
// components/TaskBar.tsx

const MenuItems = [
  {
    label: 'السندات',
    icon: '📄',
    submenu: [
      { label: 'سند القبض المحدث', path: '/treasury/receipt-updated', icon: '💰' },
      { label: 'سند الصرف المحدث', path: '/treasury/payment-updated', icon: '💸' },
      { label: 'القيود المحدثة', path: '/gl/journal-updated', icon: '📋' },
      { label: 'الرواتب المحدثة', path: '/hr/payroll-updated', icon: '👥' }
    ]
  },
  {
    label: 'الاختبارات',
    icon: '🧪',
    submenu: [
      { label: 'لوحة الاختبارات', path: '/testing/dashboard', icon: '📊' }
    ]
  }
];
```

---

## المرحلة 5: مراقبة الأداء

### 5.1 تتبع الأخطاء

```typescript
// services/ErrorLogger.ts

export const logError = (error: Error, context: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    context,
    message: error.message,
    stack: error.stack
  };
  
  console.error(`[${timestamp}] ${context}:`, error);
  
  // send to analytics or logging service
  if ((window as any).electronAPI) {
    (window as any).electronAPI.log.error(logEntry);
  }
};

export const logSuccess = (message: string, context: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ✅ ${context}: ${message}`, data);
  
  if ((window as any).electronAPI) {
    (window as any).electronAPI.log.info({ timestamp, context, message, data });
  }
};
```

### 5.2 قياس الأداء

```typescript
// services/PerformanceMonitor.ts

export const measurePerformance = async <T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    
    console.error(`❌ ${label}: ${duration.toFixed(2)}ms - ${error}`);
    throw error;
  }
};
```

---

## المرحلة 6: انتقال بيانات الإنتاج

### 6.1 نسخ البيانات

```typescript
// scripts/MigrateToUpdatedInterfaces.ts

export const migrateVouchers = async () => {
  const api = (window as any).electronAPI;
  
  // جلب جميع السندات القديمة
  const oldVouchers = await api.journal.getVouchers();
  
  for (const voucher of oldVouchers) {
    // تحويل البيانات إلى الشكل الجديد
    const newVoucher = {
      ...voucher,
      lines: voucher.lines.map((line: any) => ({
        ...line,
        // أضف الحقول الجديدة
        sub_account_id: voucher.partner_id || line.sub_account_id,
        invoice_ref: line.invoice_ref || '',
        tax_ref: line.tax_ref || '',
        // ...حقول أخرى...
      }))
    };
    
    // احفظ البيانات الجديدة
    await api.journal.updateVoucher(newVoucher);
  }
  
  console.log('✅ تم ترحيل جميع البيانات');
};
```

---

## المرحلة 7: التحقق النهائي

### قائمة التحقق

- [ ] تم دمج جميع المسارات
- [ ] تم تحديث قائمة القائمة
- [ ] تم تشغيل الاختبارات الشاملة بنجاح (100%)
- [ ] تم اختبار السندات مع بيانات حقيقية
- [ ] تم التحقق من حساب التأثير
- [ ] تم التحقق من القوائم المالية
- [ ] تم ترحيل البيانات القديمة
- [ ] تم مراقبة الأخطاء والأداء

---

## 🚀 البدء الفوري

```bash
# 1. اختبر لوحة الاختبارات
Navigate to: http://localhost:3000/testing/dashboard
Click: "تشغيل جميع الاختبارات"

# 2. جرّب سند القبض
Navigate to: http://localhost:3000/treasury/receipt-updated

# 3. جرّب سند الصرف
Navigate to: http://localhost:3000/treasury/payment-updated

# 4. جرّب القيود
Navigate to: http://localhost:3000/gl/journal-updated

# 5. جرّب الرواتب
Navigate to: http://localhost:3000/hr/payroll-updated
```

---

## 📞 دعم سريع

### إذا واجهت مشاكل:

1. **تحقق من لوحة الاختبارات**: `/testing/dashboard`
2. **راجع رسائل الخطأ**: في وحدة التحكم (DevTools)
3. **تشغيل اختبار معين**: استخدم `runAllTests()` في الكونسول

---

**تم إكمال دليل الدمج! 🎉**
