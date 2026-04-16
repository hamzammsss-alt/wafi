/**
 * PayrollVoucher.tsx - Updated Version
 * 
 * تحديث شامل لسند الرواتب ليتطابق مع:
 * - الحسابات الجديدة والمحدثة (126 حساب)
 * - الأعمدة الجديدة في قاعدة البيانات
 * - الربط الذكي مع الموظفين والعناصر
 * - تفاصيل الخصومات والإضافات
 */

import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle2, DollarSign, Calculator } from 'lucide-react';

interface PayrollVoucherUpdated {
  // Header
  voucherNo: string;
  date: string;
  month: string;
  year: number;
  description: string;
  
  // Organization
  organizationId: string;
  
  // Line Details
  lines: PayrollLineNew[];
}

interface PayrollLineNew {
  id: string;
  
  // Employee Information
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  
  // Salary Components
  basicSalary: number;
  allowances: number;  // البدلات
  deductions: number;  // الخصومات
  netSalary: number;
  
  // Account Mapping (NEW)
  salaryAccountId: string;    // حساب المرتبات (601)
  allowanceAccountId?: string;  // حساب البدلات
  deductionAccountId?: string;  // حساب الخصومات
  bankAccountId: string;      // حساب البنك للتحويل
  
  // Sub-Account & References (NEW)
  sub_account_id: string;     // الموظف
  employee_record_id: string; // معرّف سجل الموظف
  
  // References
  invoice_ref: string;        // مرجع الرواتب
  tax_ref: string;           // مرجع ضريبي (للضريبة)
  
  // Metadata
  reference_type: string;      // EMPLOYEE
}

// ============ Service Functions ============

/**
 * احسب مكونات الراتب
 */
export const calculatePayrollComponents = (netSalary: number, basicSalary: number): {
  allowances: number;
  deductions: number;
  socialInsurance: number;
  tax: number;
} => {
  const socialInsuranceRate = 0.08;  // 8%
  const taxRate = 0.05;              // 5%

  const socialInsurance = basicSalary * socialInsuranceRate;
  const tax = Math.max(0, basicSalary - socialInsurance - 1000) * taxRate;
  const allowances = netSalary - basicSalary;
  const deductions = socialInsurance + tax;

  return {
    allowances: Math.max(0, allowances),
    deductions: Math.max(0, deductions),
    socialInsurance,
    tax
  };
};

/**
 * حفظ سند الرواتب مع كل الحقول الجديدة
 */
export const savePayrollVoucherWithLinkage = async (voucher: PayrollVoucherUpdated): Promise<void> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  try {
    // التحقق من البيانات الأساسية
    if (!voucher.month) throw new Error('يجب تحديد الشهر');
    if (!voucher.year) throw new Error('يجب تحديد السنة');
    if (voucher.lines.length === 0) throw new Error('يجب إضافة موظف واحد على الأقل');

    // الحفظ في قاعدة البيانات
    const result = await api.journal.saveVoucher({
      type: 'PAYROLL',
      header: {
        voucherNo: voucher.voucherNo,
        date: voucher.date,
        month: voucher.month,
        year: voucher.year,
        description: voucher.description,
        organization_id: voucher.organizationId
      },
      lines: voucher.lines.map(line => ({
        account_id: line.salaryAccountId,
        debit: line.basicSalary + line.allowances,  // إجمالي المستحقات
        credit: 0,
        sub_account_id: line.sub_account_id,       // الموظف
        employee_id: line.employeeId,               // معرّف الموظف
        invoice_ref: line.invoice_ref,              // مرجع الرواتب
        tax_ref: line.tax_ref,                      // مرجع ضريبي
        bank_account_id: line.bankAccountId,        // الحساب البنكي
        description: `راتب ${line.employeeName} - ${voucher.month}/${voucher.year}`
      })),
      totalEmployees: voucher.lines.length,
      totalSalaries: voucher.lines.reduce((sum, l) => sum + l.netSalary, 0)
    });

    console.log('✅ تم حفظ سند الرواتب بنجاح:', result);
    return result;
  } catch (err) {
    console.error('❌ خطأ في حفظ سند الرواتب:', err);
    throw err;
  }
};

/**
 * احسب تأثير السند على الأرصدة
 */
export const calculatePayrollImpact = async (voucher: PayrollVoucherUpdated): Promise<any> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  try {
    const totalBasicSalaries = voucher.lines.reduce((sum, l) => sum + l.basicSalary, 0);
    const totalAllowances = voucher.lines.reduce((sum, l) => sum + l.allowances, 0);
    const totalDeductions = voucher.lines.reduce((sum, l) => sum + l.deductions, 0);
    const totalNetSalaries = voucher.lines.reduce((sum, l) => sum + l.netSalary, 0);

    const impact = {
      // حساب المرتبات (مصروف)
      salaryExpense: {
        accountId: voucher.lines[0].salaryAccountId,
        accountName: 'مصروف المرتبات',
        amount: totalBasicSalaries + totalAllowances,
        type: 'DEBIT'
      },
      
      // حساب البنك (أصل)
      bankPayment: {
        accountId: voucher.lines[0].bankAccountId,
        accountName: 'حساب البنك',
        amount: totalNetSalaries,
        type: 'CREDIT'
      },
      
      // حسابات الخصومات
      deductions: {
        socialInsurance: {
          amount: voucher.lines.reduce((sum, l) => sum + (calculatePayrollComponents(l.netSalary, l.basicSalary).socialInsurance), 0),
          accountName: 'التأمينات الاجتماعية'
        },
        tax: {
          amount: voucher.lines.reduce((sum, l) => sum + (calculatePayrollComponents(l.netSalary, l.basicSalary).tax), 0),
          accountName: 'الضريبة على الدخل'
        }
      }
    };

    return {
      impact,
      totalEmployees: voucher.lines.length,
      totalBasicSalaries,
      totalAllowances,
      totalDeductions,
      totalNetSalaries,
      isBalanced: Math.abs(
        (totalBasicSalaries + totalAllowances) - (totalNetSalaries + totalDeductions)
      ) < 0.01
    };
  } catch (err) {
    console.error('❌ خطأ في حساب التأثير:', err);
    throw err;
  }
};

/**
 * مكون واجهة محدثة
 */
export const PayrollVoucherComponentUpdated: React.FC<{ mode: 'view' | 'edit' | 'create' }> = ({ mode }) => {
  const [voucher, setVoucher] = useState<PayrollVoucherUpdated>({
    voucherNo: '',
    date: new Date().toISOString().split('T')[0],
    month: new Date().toLocaleDateString('ar-SA', { month: 'long' }),
    year: new Date().getFullYear(),
    description: '',
    organizationId: '',
    lines: []
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [impact, setImpact] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // تحميل البيانات الأولية
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const api = (window as any).electronAPI;
        
        // جلب الموظفين
        const employees = await api.partner.getPartners('EMPLOYEE');
        
        // جلب الحسابات
        const accounts = await api.accounting.getAccounts();
        
        // جلب الحسابات البنكية
        const bankAccounts = await api.accounting.getAccountsByCategory('ASSET');
        
        console.log('✅ تم تحميل البيانات:', { 
          employees: employees.length, 
          accounts: accounts.length,
          bankAccounts: bankAccounts.length
        });
      } catch (err) {
        console.error('❌ خطأ في تحميل البيانات:', err);
        setErrors([String(err)]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // التحقق من صحة البيانات
  const validateVoucher = (): boolean => {
    const newErrors: string[] = [];

    if (!voucher.month) newErrors.push('يجب تحديد الشهر');
    if (!voucher.year) newErrors.push('يجب تحديد السنة');
    if (voucher.lines.length === 0) newErrors.push('يجب إضافة موظف واحد على الأقل');

    // التحقق من الأسطر
    voucher.lines.forEach((line, idx) => {
      if (!line.employeeId) newErrors.push(`السطر ${idx + 1}: يجب تحديد الموظف`);
      if (line.basicSalary <= 0) newErrors.push(`السطر ${idx + 1}: الراتب الأساسي يجب أن يكون أكبر من صفر`);
      if (!line.salaryAccountId) newErrors.push(`السطر ${idx + 1}: يجب تحديد حساب المرتبات`);
      if (!line.bankAccountId) newErrors.push(`السطر ${idx + 1}: يجب تحديد حساب البنك`);
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // إضافة موظف جديد
  const handleAddEmployee = () => {
    const newLine: PayrollLineNew = {
      id: String(voucher.lines.length + 1),
      employeeId: '',
      employeeCode: '',
      employeeName: '',
      basicSalary: 0,
      allowances: 0,
      deductions: 0,
      netSalary: 0,
      salaryAccountId: '601',  // حساب المرتبات
      bankAccountId: '112',     // حساب البنك
      sub_account_id: '',
      employee_record_id: '',
      invoice_ref: `PAYROLL-${voucher.month}-${voucher.year}`,
      tax_ref: '',
      reference_type: 'EMPLOYEE'
    };
    setVoucher({...voucher, lines: [...voucher.lines, newLine]});
  };

  // حساب التأثير
  const handleCalculateImpact = async () => {
    if (!validateVoucher()) return;

    try {
      setLoading(true);
      
      // احسب مكونات الرواتب
      const updatedLines = voucher.lines.map(line => {
        const components = calculatePayrollComponents(line.netSalary, line.basicSalary);
        return {
          ...line,
          allowances: components.allowances,
          deductions: components.deductions
        };
      });
      
      const updatedVoucher = {...voucher, lines: updatedLines};
      const result = await calculatePayrollImpact(updatedVoucher);
      setImpact(result);
      console.log('✅ تم حساب التأثير:', result);
    } catch (err) {
      setErrors([String(err)]);
    } finally {
      setLoading(false);
    }
  };

  // حفظ السند
  const handleSave = async () => {
    if (!validateVoucher()) return;

    try {
      setIsSaving(true);
      await savePayrollVoucherWithLinkage(voucher);
      
      // اعرض النجاح
      setErrors([]);
      console.log('✅ تم حفظ سند الرواتب بنجاح');
      
      // حساب التأثير النهائي
      await handleCalculateImpact();
    } catch (err) {
      setErrors([String(err)]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">✅ سند الرواتب (محدث)</h1>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle size={20} />
            أخطاء التحقق
          </h3>
          <ul className="list-disc list-inside text-red-700 mt-2">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Success */}
      {impact && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-bold text-green-800 flex items-center gap-2">
            <CheckCircle2 size={20} />
            تأثير السند على القوائم المالية
          </h3>
          <div className="mt-2 text-sm text-green-700">
            <p>✅ عدد الموظفين: {impact.totalEmployees}</p>
            <p>✅ إجمالي الرواتب: {impact.totalNetSalaries} ريال</p>
            <p>✅ متوازن: {impact.isBalanced ? 'نعم' : 'لا'}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Header Section */}
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h2 className="font-bold text-blue-800 mb-3">معلومات سند الرواتب</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold">رقم السند</label>
              <input
                type="text"
                value={voucher.voucherNo}
                onChange={(e) => setVoucher({...voucher, voucherNo: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="PAYROLL-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">الشهر</label>
              <input
                type="text"
                value={voucher.month}
                onChange={(e) => setVoucher({...voucher, month: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="محرم"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">السنة</label>
              <input
                type="number"
                value={voucher.year}
                onChange={(e) => setVoucher({...voucher, year: Number(e.target.value)})}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Employees Section */}
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800">الموظفون ({voucher.lines.length})</h2>
            <button
              onClick={handleAddEmployee}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              + إضافة موظف
            </button>
          </div>
          
          {voucher.lines.map((line, idx) => (
            <div key={line.id} className="bg-white p-4 mb-3 border rounded">
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-semibold">الموظف</label>
                  <input
                    type="text"
                    value={line.employeeName}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="اسم الموظف"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">الراتب الأساسي</label>
                  <input
                    type="number"
                    value={line.basicSalary}
                    onChange={(e) => {
                      const newLines = [...voucher.lines];
                      newLines[idx].basicSalary = Number(e.target.value);
                      newLines[idx].netSalary = Number(e.target.value); // مبدئياً
                      setVoucher({...voucher, lines: newLines});
                    }}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">البدلات</label>
                  <input
                    type="number"
                    value={line.allowances}
                    onChange={(e) => {
                      const newLines = [...voucher.lines];
                      newLines[idx].allowances = Number(e.target.value);
                      setVoucher({...voucher, lines: newLines});
                    }}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">الخصومات</label>
                  <input
                    type="number"
                    value={line.deductions}
                    onChange={(e) => {
                      const newLines = [...voucher.lines];
                      newLines[idx].deductions = Number(e.target.value);
                      setVoucher({...voucher, lines: newLines});
                    }}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">الراتب الصافي</label>
                  <div className="w-full p-2 border rounded text-xs bg-gray-100 font-semibold">
                    {(line.basicSalary + line.allowances - line.deductions).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCalculateImpact}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            <Calculator size={18} />
            احسب المبالغ
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            <Save size={18} />
            حفظ السند
          </button>
        </div>
      </div>

      {/* Impact Summary */}
      {impact && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-3">💰 ملخص الرواتب</h3>
            
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                • عدد الموظفين: {impact.totalEmployees}
              </p>
              <p className="text-gray-700">
                • إجمالي الرواتب الأساسية: {impact.totalBasicSalaries.toFixed(2)} ريال
              </p>
              <p className="text-gray-700">
                • إجمالي البدلات: {impact.totalAllowances.toFixed(2)} ريال
              </p>
              <p className="text-gray-700">
                • إجمالي الخصومات: {impact.totalDeductions.toFixed(2)} ريال
              </p>
              <p className="text-green-700 font-bold">
                • إجمالي الرواتب الصافية: {impact.totalNetSalaries.toFixed(2)} ريال
              </p>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded border border-purple-200">
            <h3 className="font-bold text-purple-800 mb-3">📊 تأثير الحسابات</h3>
            
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                • مصروف المرتبات: {impact.impact.salaryExpense.amount.toFixed(2)} ريال (دين)
              </p>
              <p className="text-gray-700">
                • حساب البنك: {impact.impact.bankPayment.amount.toFixed(2)} ريال (دائن)
              </p>
              {impact.impact.deductions.socialInsurance.amount > 0 && (
                <p className="text-gray-700">
                  • التأمينات الاجتماعية: {impact.impact.deductions.socialInsurance.amount.toFixed(2)} ريال
                </p>
              )}
              {impact.impact.deductions.tax.amount > 0 && (
                <p className="text-gray-700">
                  • الضريبة على الدخل: {impact.impact.deductions.tax.amount.toFixed(2)} ريال
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollVoucherComponentUpdated;
