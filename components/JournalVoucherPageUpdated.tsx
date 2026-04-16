/**
 * JournalVoucherPageUpdated.tsx - Updated Version
 * 
 * تحديث شامل لقائمة القيود اليومية ليتطابق مع:
 * - الحسابات الجديدة والمحدثة (126 حساب)
 * - الأعمدة الجديدة في قاعدة البيانات
 * - الحسابات الفرعية والربط الذكي
 * - عرض شامل لكل السجلات مع التأثير المالي
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface JournalEntryLine {
  id: string;
  voucherNo: string;
  voucherType: 'JOURNAL' | 'RECEIPT' | 'PAYMENT' | 'PAYROLL';
  date: string;
  
  // Account Information
  accountId: string;
  accountCode: string;
  accountName: string;
  accountCategory: string;    // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  
  // Sub-Account & References (NEW)
  sub_account_id: string;     // الحساب الفرعي
  invoice_ref: string;        // رقم الفاتورة/المرجع
  tax_ref: string;           // مرجع ضريبي
  customer_id?: string;      // معرّف العميل (للقبض)
  supplier_id?: string;      // معرّف المورّد (للصرف)
  bank_account_id?: string;  // معرّف الحساب البنكي
  
  // Amounts
  debit: number;
  credit: number;
  
  // Description
  description: string;
  
  // Status
  posted: boolean;
}

interface GroupedJournalEntry {
  voucherNo: string;
  voucherType: string;
  date: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lineCount: number;
  lines: JournalEntryLine[];
}

// ============ Service Functions ============

/**
 * احسب تأثير القيود على الأرصدة المالية
 */
export const calculateJournalImpact = async (journalEntry: JournalEntryLine[]): Promise<any> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  try {
    // اجمع التأثير حسب الحساب
    const accountImpact = new Map<string, { debit: number; credit: number; balance: number }>();
    
    journalEntry.forEach(line => {
      const key = `${line.accountId}`;
      const current = accountImpact.get(key) || { debit: 0, credit: 0, balance: 0 };
      
      current.debit += line.debit;
      current.credit += line.credit;
      current.balance = current.debit - current.credit;
      
      accountImpact.set(key, current);
    });

    // احسب التأثير على الفئات المحاسبية الرئيسية
    const categoryImpact = new Map<string, { debit: number; credit: number }>();
    
    journalEntry.forEach(line => {
      const category = line.accountCategory;
      const current = categoryImpact.get(category) || { debit: 0, credit: 0 };
      
      current.debit += line.debit;
      current.credit += line.credit;
      
      categoryImpact.set(category, current);
    });

    // احسبها من قاعدة البيانات
    const dbResult = await api.accounting.calculateJournalImpact(Array.from(accountImpact.entries()).map(([key, val]) => ({
      accountId: key,
      debit: val.debit,
      credit: val.credit
    })));

    return {
      accountImpact: Object.fromEntries(accountImpact),
      categoryImpact: Object.fromEntries(categoryImpact),
      totalDebit: journalEntry.reduce((sum, l) => sum + l.debit, 0),
      totalCredit: journalEntry.reduce((sum, l) => sum + l.credit, 0),
      isBalanced: Math.abs(
        journalEntry.reduce((sum, l) => sum + l.debit, 0) -
        journalEntry.reduce((sum, l) => sum + l.credit, 0)
      ) < 0.01,
      dbVerification: dbResult
    };
  } catch (err) {
    console.error('❌ خطأ في حساب التأثير:', err);
    throw err;
  }
};

/**
 * احسب تأثير السند على القوائم المالية
 */
export const calculateFinancialStatementImpact = async (journalEntry: JournalEntryLine[]): Promise<any> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  try {
    // احسب تأثير كل حساب على الفئات المحاسبية
    const impactByCategory = {
      ASSET: { current: 0, change: 0 },
      LIABILITY: { current: 0, change: 0 },
      EQUITY: { current: 0, change: 0 },
      REVENUE: { current: 0, change: 0 },
      EXPENSE: { current: 0, change: 0 }
    };

    journalEntry.forEach(line => {
      const category = line.accountCategory as any;
      if (!impactByCategory[category]) return;

      // الأصول والمصاريف: Debit يزيد، Credit يقلل
      if (category === 'ASSET' || category === 'EXPENSE') {
        impactByCategory[category].change += line.debit - line.credit;
      }
      // الالتزامات والإيرادات والملكية: Credit يزيد، Debit يقلل
      else {
        impactByCategory[category].change += line.credit - line.debit;
      }
    });

    // احسب الأرصدة الحالية من قاعدة البيانات
    const currentBalances = await api.accounting.getCurrentAccountBalances();
    
    // احسب الأرصدة الجديدة
    const newBalances = { ...impactByCategory };
    Object.keys(currentBalances).forEach(category => {
      if (newBalances[category as any]) {
        newBalances[category as any].current = currentBalances[category];
        newBalances[category as any].new = currentBalances[category] + newBalances[category as any].change;
      }
    });

    // احسب النسب المالية الأساسية
    const currentRatio = newBalances.ASSET.new / newBalances.LIABILITY.new;
    const equityRatio = newBalances.EQUITY.new / newBalances.ASSET.new;

    return {
      categoryImpact: impactByCategory,
      balanceSheetImpact: newBalances,
      incomeStatementImpact: {
        REVENUE: newBalances.REVENUE,
        EXPENSE: newBalances.EXPENSE,
        netProfit: newBalances.REVENUE.new - newBalances.EXPENSE.new
      },
      ratios: {
        current: currentRatio,
        equity: equityRatio
      }
    };
  } catch (err) {
    console.error('❌ خطأ في حساب تأثير القوائم المالية:', err);
    throw err;
  }
};

/**
 * احسب تأثير القيود على الحسابات الفرعية
 */
export const calculateSubAccountImpact = async (journalEntry: JournalEntryLine[]): Promise<any> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  try {
    // اجمع التأثير حسب الحساب الفرعي
    const subAccountImpact = new Map<string, {
      mainAccountId: string;
      debit: number;
      credit: number;
      balance: number;
      invoiceRefs: string[];
      taxRefs: string[];
    }>();

    journalEntry.forEach(line => {
      if (!line.sub_account_id) return;

      const key = line.sub_account_id;
      const current = subAccountImpact.get(key) || {
        mainAccountId: line.accountId,
        debit: 0,
        credit: 0,
        balance: 0,
        invoiceRefs: [],
        taxRefs: []
      };

      current.debit += line.debit;
      current.credit += line.credit;
      current.balance = current.debit - current.credit;
      
      if (line.invoice_ref) current.invoiceRefs.push(line.invoice_ref);
      if (line.tax_ref) current.taxRefs.push(line.tax_ref);

      subAccountImpact.set(key, current);
    });

    return Object.fromEntries(subAccountImpact);
  } catch (err) {
    console.error('❌ خطأ في حساب تأثير الحسابات الفرعية:', err);
    throw err;
  }
};

/**
 * مكون واجهة محدثة لعرض القيود
 */
export const JournalVoucherComponentUpdated: React.FC = () => {
  const [journalEntries, setJournalEntries] = useState<GroupedJournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<GroupedJournalEntry | null>(null);
  const [impact, setImpact] = useState<any>(null);
  const [financialImpact, setFinancialImpact] = useState<any>(null);
  const [subAccountImpact, setSubAccountImpact] = useState<any>(null);

  // تحميل البيانات الأولية
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const api = (window as any).electronAPI;
        
        // جلب جميع القيود
        const entries = await api.journal.getVouchers();
        
        // اجمع القيود
        const grouped = new Map<string, GroupedJournalEntry>();
        entries.forEach((entry: JournalEntryLine) => {
          let group = grouped.get(entry.voucherNo);
          if (!group) {
            group = {
              voucherNo: entry.voucherNo,
              voucherType: entry.voucherType,
              date: entry.date,
              totalDebit: 0,
              totalCredit: 0,
              isBalanced: false,
              lineCount: 0,
              lines: []
            };
            grouped.set(entry.voucherNo, group);
          }
          group.lines.push(entry);
          group.totalDebit += entry.debit;
          group.totalCredit += entry.credit;
          group.lineCount += 1;
        });

        // احسب التوازن
        grouped.forEach(group => {
          group.isBalanced = Math.abs(group.totalDebit - group.totalCredit) < 0.01;
        });

        setJournalEntries(Array.from(grouped.values()));
        console.log('✅ تم تحميل البيانات:', journalEntries.length, 'قيد');
      } catch (err) {
        console.error('❌ خطأ في تحميل البيانات:', err);
        setErrors([String(err)]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // عرض تفاصيل السند
  const handleViewEntry = async (entry: GroupedJournalEntry) => {
    try {
      setLoading(true);
      setSelectedEntry(entry);

      // احسب التأثير
      const journalImpact = await calculateJournalImpact(entry.lines);
      setImpact(journalImpact);

      // احسب تأثير القوائم المالية
      const finImpact = await calculateFinancialStatementImpact(entry.lines);
      setFinancialImpact(finImpact);

      // احسب تأثير الحسابات الفرعية
      const subAccImpact = await calculateSubAccountImpact(entry.lines);
      setSubAccountImpact(subAccImpact);
    } catch (err) {
      setErrors([String(err)]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">✅ القيود اليومية (محدثة)</h1>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle size={20} />
            أخطاء التحميل
          </h3>
          <ul className="list-disc list-inside text-red-700 mt-2">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Main Content */}
      {!selectedEntry ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <p className="text-gray-600 text-sm">إجمالي القيود</p>
              <p className="text-2xl font-bold text-blue-700">{journalEntries.length}</p>
            </div>

            <div className="bg-green-50 p-4 rounded border border-green-200">
              <p className="text-gray-600 text-sm">قيود متوازنة</p>
              <p className="text-2xl font-bold text-green-700">
                {journalEntries.filter(e => e.isBalanced).length}
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <p className="text-gray-600 text-sm">قيود غير متوازنة</p>
              <p className="text-2xl font-bold text-yellow-700">
                {journalEntries.filter(e => !e.isBalanced).length}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded border border-purple-200">
              <p className="text-gray-600 text-sm">إجمالي الأسطر</p>
              <p className="text-2xl font-bold text-purple-700">
                {journalEntries.reduce((sum, e) => sum + e.lineCount, 0)}
              </p>
            </div>
          </div>

          {/* Vouchers List */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-right">رقم السند</th>
                  <th className="border p-2 text-right">النوع</th>
                  <th className="border p-2 text-right">التاريخ</th>
                  <th className="border p-2 text-right">عدد الأسطر</th>
                  <th className="border p-2 text-right">مجموع الدين</th>
                  <th className="border p-2 text-right">مجموع الدائن</th>
                  <th className="border p-2 text-right">الحالة</th>
                  <th className="border p-2 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.map(entry => (
                  <tr key={entry.voucherNo} className="hover:bg-gray-50">
                    <td className="border p-2 text-right font-mono">{entry.voucherNo}</td>
                    <td className="border p-2 text-right">{entry.voucherType}</td>
                    <td className="border p-2 text-right">{entry.date}</td>
                    <td className="border p-2 text-right">{entry.lineCount}</td>
                    <td className="border p-2 text-right text-blue-600 font-semibold">
                      {entry.totalDebit.toFixed(2)}
                    </td>
                    <td className="border p-2 text-right text-green-600 font-semibold">
                      {entry.totalCredit.toFixed(2)}
                    </td>
                    <td className="border p-2 text-right">
                      {entry.isBalanced ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                          ✅ متوازن
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                          ❌ غير متوازن
                        </span>
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => handleViewEntry(entry)}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        <Eye size={16} className="inline mr-1" />
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Entry Details */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedEntry(null)}
              className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ← العودة للقائمة
            </button>

            <h2 className="text-xl font-bold mb-4">تفاصيل السند: {selectedEntry.voucherNo}</h2>

            {/* Entry Lines */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-right">رقم الحساب</th>
                    <th className="border p-2 text-right">اسم الحساب</th>
                    <th className="border p-2 text-right">الفئة</th>
                    <th className="border p-2 text-right">الحساب الفرعي</th>
                    <th className="border p-2 text-right">المرجع</th>
                    <th className="border p-2 text-right">دين</th>
                    <th className="border p-2 text-right">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntry.lines.map(line => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="border p-2 text-right font-mono">{line.accountCode}</td>
                      <td className="border p-2 text-right">{line.accountName}</td>
                      <td className="border p-2 text-right text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {line.accountCategory}
                        </span>
                      </td>
                      <td className="border p-2 text-right text-xs">{line.sub_account_id}</td>
                      <td className="border p-2 text-right text-xs">
                        {line.invoice_ref}
                      </td>
                      <td className="border p-2 text-right text-blue-600 font-semibold">
                        {line.debit > 0 ? line.debit.toFixed(2) : '-'}
                      </td>
                      <td className="border p-2 text-right text-green-600 font-semibold">
                        {line.credit > 0 ? line.credit.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={5} className="border p-2 text-right">المجموع</td>
                    <td className="border p-2 text-right text-blue-600">
                      {selectedEntry.totalDebit.toFixed(2)}
                    </td>
                    <td className="border p-2 text-right text-green-600">
                      {selectedEntry.totalCredit.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Impact Summary */}
            {impact && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-2">✅ توازن السند</h3>
                  {impact.isBalanced ? (
                    <p className="text-green-700">
                      ✅ السند متوازن (الدين = الدائن = {impact.totalDebit.toFixed(2)})
                    </p>
                  ) : (
                    <p className="text-red-700">
                      ❌ السند غير متوازن (الفرق = {Math.abs(impact.totalDebit - impact.totalCredit).toFixed(2)})
                    </p>
                  )}
                </div>

                {financialImpact && (
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <h3 className="font-bold text-green-800 mb-2">📊 القوائم المالية</h3>
                    <p className="text-gray-700">
                      • الأصول المتداولة: {financialImpact.balanceSheetImpact.ASSET.change > 0 ? '+' : ''}{financialImpact.balanceSheetImpact.ASSET.change.toFixed(2)}
                    </p>
                    <p className="text-gray-700">
                      • الالتزامات: {financialImpact.balanceSheetImpact.LIABILITY.change > 0 ? '+' : ''}{financialImpact.balanceSheetImpact.LIABILITY.change.toFixed(2)}
                    </p>
                    <p className="text-gray-700">
                      • صافي الربح: {financialImpact.incomeStatementImpact.netProfit.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Account Impact */}
            {Object.keys(subAccountImpact || {}).length > 0 && (
              <div className="bg-purple-50 p-4 rounded border border-purple-200">
                <h3 className="font-bold text-purple-800 mb-3">🔗 تأثير الحسابات الفرعية</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(subAccountImpact || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-white p-3 rounded border">
                      <p className="font-semibold text-sm">{key}</p>
                      <p className="text-xs text-gray-600">
                        الرصيد: {value.balance.toFixed(2)} ريال
                      </p>
                      {value.invoiceRefs.length > 0 && (
                        <p className="text-xs text-gray-600">
                          المراجع: {value.invoiceRefs.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default JournalVoucherComponentUpdated;
