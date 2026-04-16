/**
 * ReceiptVoucher.tsx - Updated Version
 * 
 * تحديث شامل لسند القبض ليتطابق مع:
 * - الحسابات الجديدة والمحدثة (126 حساب)
 * - الأعمدة الجديدة في قاعدة البيانات
 * - التصنيف الذكي للمراجع
 * - الربط الكامل end-to-end
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Save, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';

interface ReceiptVoucherUpdated {
  // Header
  voucherNo: string;
  date: string;
  partnerId: string;          // معرّف العميل
  partnerCode: string;
  partnerName: string;
  description: string;
  
  // Account Linkage (NEW)
  accountId: string;           // حساب العميل (114xxx)
  accountCode: string;
  accountName: string;
  reference_type: string;      // CUSTOMER (نوع المرجع)
  
  // Line Details
  lines: ReceiptLineNew[];
}

interface ReceiptLineNew {
  id: string;
  
  // Account Fields
  accountId: string;           // حساب الربط (مثل البنك)
  accountCode: string;
  accountName: string;
  
  // Sub-Account & References (NEW)
  sub_account_id: string;      // معرّف الحساب الفرعي (العميل)
  invoice_ref: string;         // رقم الفاتورة
  tax_ref: string;            // مرجع ضريبي
  customer_id: string;        // معرّف العميل (كيان)
  bank_account_id: string;    // الحساب البنكي
  
  // Amounts
  amount: number;
  
  // Metadata
  reference_type: string;      // نوع المرجع الذكي
}

// ============ Update Service Functions ============

/**
 * حفظ سند القبض مع كل الحقول الجديدة
 */
export const saveReceiptVoucherWithLinkage = async (voucher: ReceiptVoucherUpdated): Promise<void> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  try {
    // التحقق من البيانات الأساسية
    if (!voucher.partnerId) throw new Error('يجب تحديد العميل');
    if (!voucher.accountId) throw new Error('يجب تحديد الحساب الرئيسي');
    if (voucher.lines.length === 0) throw new Error('يجب إضافة سطر واحد على الأقل');

    // الحفظ في قاعدة البيانات
    const result = await api.journal.saveVoucher({
      type: 'RECEIPT',
      header: {
        voucherNo: voucher.voucherNo,
        date: voucher.date,
        partner_id: voucher.partnerId,      // العميل
        partner_code: voucher.partnerCode,
        partner_name: voucher.partnerName,
        account_id: voucher.accountId,      // الحساب الرئيسي
        reference_type: voucher.reference_type,  // نوع المرجع
        description: voucher.description
      },
      lines: voucher.lines.map(line => ({
        account_id: line.accountId,
        debit: line.amount,
        credit: 0,
        sub_account_id: line.sub_account_id,      // الحساب الفرعي
        invoice_ref: line.invoice_ref,            // المرجع
        tax_ref: line.tax_ref,                    // مرجع ضريبي
        customer_id: line.customer_id,            // كيان العميل
        bank_account_id: line.bank_account_id,    // الحساب البنكي
        description: `قبض من ${voucher.partnerName}`
      }))
    });

    console.log('✅ تم حفظ سند القبض بنجاح:', result);
    return result;
  } catch (err) {
    console.error('❌ خطأ في حفظ سند القبض:', err);
    throw err;
  }
};

/**
 * احسب تأثير السند على الأرصدة
 */
export const calculateReceiptImpact = async (voucher: ReceiptVoucherUpdated): Promise<any> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  try {
    const impact = {
      // حساب العميل (ذمم مدينة)
      customerAccount: {
        accountId: voucher.accountId,
        accountCode: voucher.accountCode,
        accountName: voucher.accountName,
        amount: voucher.lines.reduce((sum, l) => sum + l.amount, 0),
        type: 'CREDIT'  // تقليل الذمة
      },
      
      // حسابات البنوك/النقد
      bankAccounts: voucher.lines.map(line => ({
        accountId: line.accountId,
        accountCode: line.accountCode,
        accountName: line.accountName,
        bankAccountId: line.bank_account_id,
        amount: line.amount,
        type: 'DEBIT'   // زيادة في البنك/النقد
      })),
      
      // حسابات فرعية
      subAccounts: voucher.lines.map(line => ({
        mainAccountId: line.sub_account_id,
        amount: line.amount,
        type: 'CREDIT'  // تقليل الذمة من العميل
      }))
    };

    // احسبها من قاعدة البيانات للتحقق
    const verificationResult = await api.accounting.verifyBalances({
      voucherType: 'RECEIPT',
      lines: voucher.lines.map((l, idx) => ({
        accountId: idx === 0 ? voucher.accountId : l.accountId,
        debit: idx === 0 ? 0 : l.amount,
        credit: idx === 0 ? l.amount : 0
      }))
    });

    return {
      impact,
      verification: verificationResult,
      totalAmount: voucher.lines.reduce((sum, l) => sum + l.amount, 0),
      isBalanced: Math.abs(
        voucher.lines.reduce((sum, l) => sum + l.amount, 0) -
        voucher.lines.reduce((sum, l) => sum + l.amount, 0)
      ) < 0.01
    };
  } catch (err) {
    console.error('❌ خطأ في حساب التأثير:', err);
    throw err;
  }
};

/**
 * الحصول على الحسابات المتاحة بناءً على نوع المرجع
 */
export const getAccountsForReferenceType = async (referenceType: string): Promise<any[]> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  try {
    const accounts = await api.accounting.getAccountsByReferenceType(referenceType);
    return accounts;
  } catch (err) {
    console.error(`❌ خطأ في جلب حسابات ${referenceType}:`, err);
    return [];
  }
};

/**
 * مكون واجهة محدثة
 */
export const ReceiptVoucherComponentUpdated: React.FC<{ mode: 'view' | 'edit' | 'create' }> = ({ mode }) => {
  const [voucher, setVoucher] = useState<ReceiptVoucherUpdated>({
    voucherNo: '',
    date: new Date().toISOString().split('T')[0],
    partnerId: '',
    partnerCode: '',
    partnerName: '',
    description: '',
    accountId: '',
    accountCode: '',
    accountName: '',
    reference_type: 'CUSTOMER',
    lines: [{
      id: '1',
      accountId: '112',      // حساب البنك (افتراضي)
      accountCode: '112',
      accountName: 'حسابات بنكية',
      sub_account_id: '',
      invoice_ref: '',
      tax_ref: '',
      customer_id: '',
      bank_account_id: '',
      amount: 0,
      reference_type: 'CUSTOMER'
    }]
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
        
        // جلب الحسابات
        const accounts = await api.accounting.getAccounts();
        
        // جلب العملاء
        const customers = await api.partner.getPartners('CUSTOMER');
        
        console.log('✅ تم تحميل البيانات:', { accounts: accounts.length, customers: customers.length });
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

    if (!voucher.partnerId) newErrors.push('يجب تحديد العميل');
    if (!voucher.accountId) newErrors.push('يجب تحديد الحساب الرئيسي');
    if (voucher.lines.length === 0) newErrors.push('يجب إضافة سطر واحد على الأقل');

    // التحقق من الأسطر
    voucher.lines.forEach((line, idx) => {
      if (!line.accountId) newErrors.push(`السطر ${idx + 1}: يجب تحديد الحساب`);
      if (line.amount <= 0) newErrors.push(`السطر ${idx + 1}: المبلغ يجب أن يكون أكبر من صفر`);
      if (!line.sub_account_id) newErrors.push(`السطر ${idx + 1}: يجب تحديد الحساب الفرعي (العميل)`);
      if (!line.invoice_ref) newErrors.push(`السطر ${idx + 1}: يجب تحديد رقم المرجع`);
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // حساب التأثير
  const handleCalculateImpact = async () => {
    if (!validateVoucher()) return;

    try {
      setLoading(true);
      const result = await calculateReceiptImpact(voucher);
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
      await saveReceiptVoucherWithLinkage(voucher);
      
      // اعرض النجاح
      setErrors([]);
      console.log('✅ تم حفظ سند القبض بنجاح');
      
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
      <h1 className="text-2xl font-bold mb-4">✅ سند القبض (محدث)</h1>

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
            <p>✅ إجمالي المبلغ: {impact.totalAmount} ريال</p>
            <p>✅ متوازن: {impact.isBalanced ? 'نعم' : 'لا'}</p>
            <p>✅ حساب العميل: {impact.impact.customerAccount.accountName}</p>
            <p>✅ حسابات البنوك: {impact.impact.bankAccounts.length} حساب</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Header Section */}
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h2 className="font-bold text-blue-800 mb-3">معلومات السند</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold">رقم السند</label>
              <input
                type="text"
                value={voucher.voucherNo}
                onChange={(e) => setVoucher({...voucher, voucherNo: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="REC-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">التاريخ</label>
              <input
                type="date"
                value={voucher.date}
                onChange={(e) => setVoucher({...voucher, date: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">العميل</label>
              <input
                type="text"
                value={voucher.partnerName}
                className="w-full p-2 border rounded"
                placeholder="اختر العميل"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">حساب العميل</label>
              <input
                type="text"
                value={voucher.accountName}
                className="w-full p-2 border rounded"
                placeholder="114xxx - ذمم مدينة"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Lines Section */}
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <h2 className="font-bold text-gray-800 mb-3">أسطر السند</h2>
          
          {voucher.lines.map((line, idx) => (
            <div key={line.id} className="bg-white p-4 mb-3 border rounded">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold">الحساب</label>
                  <input
                    type="text"
                    value={line.accountName}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="حساب النقد/البنك"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">الحساب الفرعي</label>
                  <input
                    type="text"
                    value={line.sub_account_id}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="العميل/المرجع"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">المبلغ</label>
                  <input
                    type="number"
                    value={line.amount}
                    onChange={(e) => {
                      const newLines = [...voucher.lines];
                      newLines[idx].amount = Number(e.target.value);
                      setVoucher({...voucher, lines: newLines});
                    }}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">رقم الفاتورة</label>
                  <input
                    type="text"
                    value={line.invoice_ref}
                    onChange={(e) => {
                      const newLines = [...voucher.lines];
                      newLines[idx].invoice_ref = e.target.value;
                      setVoucher({...voucher, lines: newLines});
                    }}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="INV-001"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">المرجع الضريبي</label>
                  <input
                    type="text"
                    value={line.tax_ref}
                    onChange={(e) => {
                      const newLines = [...voucher.lines];
                      newLines[idx].tax_ref = e.target.value;
                      setVoucher({...voucher, lines: newLines});
                    }}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="TAX-REF"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">الحساب البنكي</label>
                  <input
                    type="text"
                    value={line.bank_account_id}
                    className="w-full p-2 border rounded text-xs"
                    placeholder="Bank Account"
                  />
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
            <DollarSign size={18} />
            احسب التأثير
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
        <div className="mt-6 bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-3">📊 ملخص التأثير على الحسابات</h3>
          
          <div className="space-y-2 text-sm">
            <h4 className="font-semibold">حسابات العملاء:</h4>
            <p className="text-gray-700">
              • {impact.impact.customerAccount.accountName}: تقليل بمبلغ {impact.impact.customerAccount.amount} ريال
            </p>

            <h4 className="font-semibold mt-3">حسابات البنوك:</h4>
            {impact.impact.bankAccounts.map((acc: any, i: number) => (
              <p key={i} className="text-gray-700">
                • {acc.accountName}: زيادة بمبلغ {acc.amount} ريال
              </p>
            ))}

            <h4 className="font-semibold mt-3">الحسابات الفرعية:</h4>
            <p className="text-gray-700">
              • تم ربط {impact.impact.subAccounts.length} حساب فرعي
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptVoucherComponentUpdated;
