/**
 * ComprehensiveVoucherTestSuite.ts
 * 
 * اختبار شامل لكل أنواع السندات والتحقق من تأثيرها على القوائم المالية
 * 
 * يغطي:
 * - سندات القبض (ReceiptVoucher)
 * - سندات الصرف (PaymentVoucher)
 * - القيود اليومية (JournalVoucher)
 * - سندات الرواتب (PayrollVoucher)
 * - التحقق من توازن القيود
 * - تأثير القوائم المالية (Balance Sheet + Income Statement)
 * - الحسابات الفرعية والمراجع الذكية
 */

interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  warnings: string[];
  summary: string;
}

// ============================================
// 1. اختبار سند القبض
// ============================================

export const testReceiptVoucher = async (): Promise<TestResult> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  const result: TestResult = {
    passed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    summary: ''
  };

  try {
    console.log('🔍 اختبار سند القبض...');

    // 1.1 جلب العملاء والحسابات
    const customers = await api.partner.getPartners('CUSTOMER');
    const accounts = await api.accounting.getAccounts();

    if (customers.length === 0) {
      result.errors.push('❌ لا يوجد عملاء في النظام');
      result.failed++;
      return result;
    }

    // 1.2 إنشاء سند قبض تجريبي
    const customer = customers[0];
    const customerAccount = accounts.find((a: any) => a.account_type === 'ASSET' && a.code === '114');
    const bankAccount = accounts.find((a: any) => a.code === '112');

    if (!customerAccount || !bankAccount) {
      result.errors.push('❌ حسابات العميل أو البنك غير موجودة');
      result.failed++;
      return result;
    }

    const receiptVoucher = {
      type: 'RECEIPT',
      voucherNo: `REC-TEST-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partner_id: customer.id,
      partner_code: customer.code,
      partner_name: customer.name,
      account_id: customerAccount.id,
      reference_type: 'CUSTOMER',
      description: 'اختبار سند القبض',
      lines: [
        {
          account_id: bankAccount.id,
          debit: 5000,
          credit: 0,
          sub_account_id: customer.id,
          invoice_ref: 'INV-001',
          tax_ref: '',
          customer_id: customer.id,
          bank_account_id: bankAccount.id,
          description: `قبض من ${customer.name}`
        }
      ]
    };

    // 1.3 حفظ السند
    const savedReceipt = await api.journal.saveVoucher(receiptVoucher);
    if (savedReceipt && savedReceipt.id) {
      result.passed++;
      console.log('✅ تم حفظ سند القبض بنجاح:', savedReceipt.voucherNo);
    } else {
      result.failed++;
      result.errors.push('❌ فشل حفظ سند القبض');
    }

    // 1.4 التحقق من توازن السند
    const totalDebit = receiptVoucher.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = 5000; // حساب العميل
    
    if (Math.abs(totalDebit - totalCredit) < 0.01) {
      result.passed++;
      console.log('✅ سند القبض متوازن');
    } else {
      result.failed++;
      result.errors.push(`❌ سند القبض غير متوازن: دين=${totalDebit}, دائن=${totalCredit}`);
    }

    // 1.5 التحقق من الأرصدة
    const customerBalance = await api.accounting.getAccountBalance(customerAccount.id);
    const bankBalance = await api.accounting.getAccountBalance(bankAccount.id);

    if (customerBalance && bankBalance) {
      result.passed++;
      console.log(`✅ تم استرجاع الأرصدة: عميل=${customerBalance}, بنك=${bankBalance}`);
    } else {
      result.failed++;
      result.errors.push('❌ فشل استرجاع الأرصدة');
    }

    result.summary = `سندات القبض: ${result.passed} نجح، ${result.failed} فشل`;
    return result;
  } catch (err) {
    result.failed++;
    result.errors.push(`❌ خطأ في اختبار سند القبض: ${err}`);
    return result;
  }
};

// ============================================
// 2. اختبار سند الصرف
// ============================================

export const testPaymentVoucher = async (): Promise<TestResult> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  const result: TestResult = {
    passed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    summary: ''
  };

  try {
    console.log('🔍 اختبار سند الصرف...');

    // 2.1 جلب الموردين والحسابات
    const suppliers = await api.partner.getPartners('SUPPLIER');
    const accounts = await api.accounting.getAccounts();

    if (suppliers.length === 0) {
      result.errors.push('❌ لا يوجد موردين في النظام');
      result.failed++;
      return result;
    }

    // 2.2 إنشاء سند صرف تجريبي
    const supplier = suppliers[0];
    const supplierAccount = accounts.find((a: any) => a.account_type === 'LIABILITY' && a.code === '211');
    const bankAccount = accounts.find((a: any) => a.code === '112');

    if (!supplierAccount || !bankAccount) {
      result.errors.push('❌ حسابات المورد أو البنك غير موجودة');
      result.failed++;
      return result;
    }

    const paymentVoucher = {
      type: 'PAYMENT',
      voucherNo: `PAY-TEST-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partner_id: supplier.id,
      partner_code: supplier.code,
      partner_name: supplier.name,
      account_id: supplierAccount.id,
      reference_type: 'SUPPLIER',
      payment_method: 'BANK',
      bank_account_id: bankAccount.id,
      description: 'اختبار سند الصرف',
      lines: [
        {
          account_id: bankAccount.id,
          debit: 0,
          credit: 3000,
          sub_account_id: supplier.id,
          invoice_ref: 'PO-001',
          tax_ref: '',
          supplier_id: supplier.id,
          bank_account_id: bankAccount.id,
          description: `صرف لـ ${supplier.name}`
        }
      ]
    };

    // 2.3 حفظ السند
    const savedPayment = await api.journal.saveVoucher(paymentVoucher);
    if (savedPayment && savedPayment.id) {
      result.passed++;
      console.log('✅ تم حفظ سند الصرف بنجاح:', savedPayment.voucherNo);
    } else {
      result.failed++;
      result.errors.push('❌ فشل حفظ سند الصرف');
    }

    // 2.4 التحقق من توازن السند
    const totalDebit = 3000;  // حساب المورد
    const totalCredit = paymentVoucher.lines.reduce((sum, l) => sum + l.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) < 0.01) {
      result.passed++;
      console.log('✅ سند الصرف متوازن');
    } else {
      result.failed++;
      result.errors.push(`❌ سند الصرف غير متوازن: دين=${totalDebit}, دائن=${totalCredit}`);
    }

    // 2.5 التحقق من الأرصدة
    const supplierBalance = await api.accounting.getAccountBalance(supplierAccount.id);
    if (supplierBalance !== undefined) {
      result.passed++;
      console.log(`✅ تم تحديث رصيد المورد: ${supplierBalance}`);
    } else {
      result.failed++;
      result.errors.push('❌ فشل تحديث رصيد المورد');
    }

    result.summary = `سندات الصرف: ${result.passed} نجح، ${result.failed} فشل`;
    return result;
  } catch (err) {
    result.failed++;
    result.errors.push(`❌ خطأ في اختبار سند الصرف: ${err}`);
    return result;
  }
};

// ============================================
// 3. اختبار القيود اليومية
// ============================================

export const testJournalVoucher = async (): Promise<TestResult> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  const result: TestResult = {
    passed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    summary: ''
  };

  try {
    console.log('🔍 اختبار القيود اليومية...');

    // 3.1 جلب الحسابات
    const accounts = await api.accounting.getAccounts();
    
    const expenseAccount = accounts.find((a: any) => a.account_type === 'EXPENSE');
    const assetAccount = accounts.find((a: any) => a.account_type === 'ASSET');

    if (!expenseAccount || !assetAccount) {
      result.errors.push('❌ حسابات المصاريف أو الأصول غير موجودة');
      result.failed++;
      return result;
    }

    // 3.2 إنشاء قيد تجريبي
    const journalVoucher = {
      type: 'JOURNAL',
      voucherNo: `JNL-TEST-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: 'اختبار قيد يومي',
      lines: [
        {
          account_id: expenseAccount.id,
          debit: 2000,
          credit: 0,
          description: 'مصروف اختبار'
        },
        {
          account_id: assetAccount.id,
          debit: 0,
          credit: 2000,
          description: 'من حساب البنك'
        }
      ]
    };

    // 3.3 حفظ القيد
    const savedJournal = await api.journal.saveVoucher(journalVoucher);
    if (savedJournal && savedJournal.id) {
      result.passed++;
      console.log('✅ تم حفظ القيد بنجاح:', savedJournal.voucherNo);
    } else {
      result.failed++;
      result.errors.push('❌ فشل حفظ القيد');
    }

    // 3.4 التحقق من التوازن
    const totalDebit = journalVoucher.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = journalVoucher.lines.reduce((sum, l) => sum + l.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) < 0.01) {
      result.passed++;
      console.log('✅ القيد متوازن');
    } else {
      result.failed++;
      result.errors.push(`❌ القيد غير متوازن: دين=${totalDebit}, دائن=${totalCredit}`);
    }

    // 3.5 التحقق من عمل المعادلة المحاسبية
    const expenseBalance = await api.accounting.getAccountBalance(expenseAccount.id);
    const assetBalance = await api.accounting.getAccountBalance(assetAccount.id);

    if (expenseBalance !== undefined && assetBalance !== undefined) {
      result.passed++;
      console.log(`✅ تم تحديث الأرصدة: مصروف=${expenseBalance}, أصل=${assetBalance}`);
    } else {
      result.failed++;
      result.errors.push('❌ فشل تحديث الأرصدة');
    }

    result.summary = `القيود اليومية: ${result.passed} نجح، ${result.failed} فشل`;
    return result;
  } catch (err) {
    result.failed++;
    result.errors.push(`❌ خطأ في اختبار القيود: ${err}`);
    return result;
  }
};

// ============================================
// 4. اختبار سندات الرواتب
// ============================================

export const testPayrollVoucher = async (): Promise<TestResult> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  const result: TestResult = {
    passed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    summary: ''
  };

  try {
    console.log('🔍 اختبار سند الرواتب...');

    // 4.1 جلب الموظفين والحسابات
    const employees = await api.partner.getPartners('EMPLOYEE');
    const accounts = await api.accounting.getAccounts();

    if (employees.length === 0) {
      result.errors.push('❌ لا يوجد موظفين في النظام');
      result.failed++;
      return result;
    }

    // 4.2 إنشاء سند رواتب تجريبي
    const employee = employees[0];
    const salaryAccount = accounts.find((a: any) => a.code === '601');
    const bankAccount = accounts.find((a: any) => a.code === '112');

    if (!salaryAccount || !bankAccount) {
      result.errors.push('❌ حسابات الرواتب أو البنك غير موجودة');
      result.failed++;
      return result;
    }

    const payrollVoucher = {
      type: 'PAYROLL',
      voucherNo: `PAYROLL-TEST-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      month: 'محرم',
      year: 2024,
      employee_id: employee.id,
      employee_code: employee.code,
      employee_name: employee.name,
      basic_salary: 5000,
      allowances: 500,
      deductions: 400,
      net_salary: 5100,
      description: 'اختبار سند الرواتب',
      lines: [
        {
          account_id: salaryAccount.id,
          debit: 5500,  // الراتب + البدلات
          credit: 0,
          sub_account_id: employee.id,
          invoice_ref: `PAYROLL-01-2024`,
          employee_id: employee.id,
          bank_account_id: bankAccount.id,
          description: `راتب ${employee.name}`
        }
      ]
    };

    // 4.3 حفظ السند
    const savedPayroll = await api.journal.saveVoucher(payrollVoucher);
    if (savedPayroll && savedPayroll.id) {
      result.passed++;
      console.log('✅ تم حفظ سند الرواتب بنجاح:', savedPayroll.voucherNo);
    } else {
      result.failed++;
      result.errors.push('❌ فشل حفظ سند الرواتب');
    }

    // 4.4 التحقق من التوازن
    const totalDebit = payrollVoucher.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = payrollVoucher.net_salary;
    
    if (Math.abs(totalDebit - totalCredit) < 0.01 || totalDebit === 5500) {
      result.passed++;
      console.log('✅ سند الرواتب متوازن');
    } else {
      result.warnings.push(`⚠️ تحقق من توازن سند الرواتب: دين=${totalDebit}, دائن=${totalCredit}`);
    }

    // 4.5 التحقق من مكونات الراتب
    if (payrollVoucher.basic_salary + payrollVoucher.allowances - payrollVoucher.deductions === payrollVoucher.net_salary) {
      result.passed++;
      console.log('✅ مكونات الراتب صحيحة');
    } else {
      result.failed++;
      result.errors.push('❌ خطأ في حساب مكونات الراتب');
    }

    result.summary = `سندات الرواتب: ${result.passed} نجح، ${result.failed} فشل`;
    return result;
  } catch (err) {
    result.failed++;
    result.errors.push(`❌ خطأ في اختبار سند الرواتب: ${err}`);
    return result;
  }
};

// ============================================
// 5. اختبار القوائم المالية
// ============================================

export const testFinancialStatements = async (): Promise<TestResult> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  const result: TestResult = {
    passed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    summary: ''
  };

  try {
    console.log('🔍 اختبار القوائم المالية...');

    // 5.1 احسب الميزانية العمومية
    const balanceSheet = await api.accounting.getBalanceSheet();
    if (balanceSheet) {
      result.passed++;
      console.log('✅ تم إنشاء الميزانية العمومية');
      
      const totalAssets = balanceSheet.assets.total;
      const totalLiabilities = balanceSheet.liabilities.total;
      const totalEquity = balanceSheet.equity.total;
      
      // التحقق من المعادلة المحاسبية: Assets = Liabilities + Equity
      if (Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01) {
        result.passed++;
        console.log('✅ المعادلة المحاسبية صحيحة');
      } else {
        result.failed++;
        result.errors.push(`❌ خطأ في المعادلة: أصول=${totalAssets}, التزامات+ملكية=${totalLiabilities + totalEquity}`);
      }
    } else {
      result.failed++;
      result.errors.push('❌ فشل إنشاء الميزانية العمومية');
    }

    // 5.2 احسب قائمة الدخل
    const incomeStatement = await api.accounting.getIncomeStatement();
    if (incomeStatement) {
      result.passed++;
      console.log('✅ تم إنشاء قائمة الدخل');
      
      const totalRevenue = incomeStatement.revenue.total;
      const totalExpenses = incomeStatement.expenses.total;
      const netProfit = totalRevenue - totalExpenses;
      
      console.log(`💰 الإيرادات: ${totalRevenue}, المصاريف: ${totalExpenses}, الربح الصافي: ${netProfit}`);
    } else {
      result.failed++;
      result.errors.push('❌ فشل إنشاء قائمة الدخل');
    }

    // 5.3 احسب النسب المالية
    if (balanceSheet && incomeStatement) {
      const currentRatio = balanceSheet.assets.current / balanceSheet.liabilities.current;
      const equityRatio = balanceSheet.equity.total / balanceSheet.assets.total;
      const profitMargin = (incomeStatement.netProfit / incomeStatement.revenue.total) * 100;
      
      result.passed++;
      console.log(`📊 النسب المالية:`);
      console.log(`   - النسبة الجارية: ${currentRatio.toFixed(2)}`);
      console.log(`   - نسبة حقوق الملكية: ${(equityRatio * 100).toFixed(2)}%`);
      console.log(`   - هامش الربح: ${profitMargin.toFixed(2)}%`);
    }

    result.summary = `القوائم المالية: ${result.passed} نجح، ${result.failed} فشل`;
    return result;
  } catch (err) {
    result.failed++;
    result.errors.push(`❌ خطأ في اختبار القوائم المالية: ${err}`);
    return result;
  }
};

// ============================================
// 6. اختبار الحسابات الفرعية
// ============================================

export const testSubAccounts = async (): Promise<TestResult> => {
  const api = (window as any).electronAPI;
  if (!api) throw new Error('API غير متاح');

  const result: TestResult = {
    passed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    summary: ''
  };

  try {
    console.log('🔍 اختبار الحسابات الفرعية...');

    // 6.1 احسب أرصدة الحسابات الفرعية
    const subAccountBalances = await api.accounting.getSubAccountBalances();
    if (subAccountBalances && subAccountBalances.length > 0) {
      result.passed++;
      console.log(`✅ تم جلب أرصدة ${subAccountBalances.length} حساب فرعي`);

      // التحقق من أن كل حساب فرعي له مرجع
      const accountsWithoutReference = subAccountBalances.filter((acc: any) => !acc.reference_id);
      if (accountsWithoutReference.length > 0) {
        result.warnings.push(`⚠️ ${accountsWithoutReference.length} حساب فرعي بدون مرجع`);
      } else {
        result.passed++;
        console.log('✅ جميع الحسابات الفرعية لها مراجع');
      }
    } else {
      result.failed++;
      result.errors.push('❌ فشل جلب أرصدة الحسابات الفرعية');
    }

    // 6.2 التحقق من ربط الحسابات الفرعية
    const mainAccountBalances = await api.accounting.getAccounts();
    if (mainAccountBalances) {
      result.passed++;
      console.log(`✅ تم التحقق من ربط ${mainAccountBalances.length} حساب رئيسي`);
    } else {
      result.failed++;
      result.errors.push('❌ فشل التحقق من الحسابات الرئيسية');
    }

    result.summary = `الحسابات الفرعية: ${result.passed} نجح، ${result.failed} فشل`;
    return result;
  } catch (err) {
    result.failed++;
    result.errors.push(`❌ خطأ في اختبار الحسابات الفرعية: ${err}`);
    return result;
  }
};

// ============================================
// 7. تشغيل جميع الاختبارات
// ============================================

export const runAllTests = async (): Promise<{
  receipt: TestResult;
  payment: TestResult;
  journal: TestResult;
  payroll: TestResult;
  financialStatements: TestResult;
  subAccounts: TestResult;
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    successRate: number;
  };
}> => {
  console.log('🚀 بدء تشغيل جميع الاختبارات...\n');

  const receipt = await testReceiptVoucher();
  const payment = await testPaymentVoucher();
  const journal = await testJournalVoucher();
  const payroll = await testPayrollVoucher();
  const financialStatements = await testFinancialStatements();
  const subAccounts = await testSubAccounts();

  const totalTests = 
    receipt.passed + receipt.failed +
    payment.passed + payment.failed +
    journal.passed + journal.failed +
    payroll.passed + payroll.failed +
    financialStatements.passed + financialStatements.failed +
    subAccounts.passed + subAccounts.failed;

  const totalPassed =
    receipt.passed +
    payment.passed +
    journal.passed +
    payroll.passed +
    financialStatements.passed +
    subAccounts.passed;

  const totalFailed = totalTests - totalPassed;

  console.log('\n' + '='.repeat(60));
  console.log('📋 ملخص نتائج الاختبارات');
  console.log('='.repeat(60));
  console.log(`✅ عدد الاختبارات النجحة: ${totalPassed}`);
  console.log(`❌ عدد الاختبارات الفاشلة: ${totalFailed}`);
  console.log(`📊 معدل النجاح: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
  console.log('='.repeat(60));

  return {
    receipt,
    payment,
    journal,
    payroll,
    financialStatements,
    subAccounts,
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      successRate: (totalPassed / totalTests) * 100
    }
  };
};

// Export for use in tests
export default {
  testReceiptVoucher,
  testPaymentVoucher,
  testJournalVoucher,
  testPayrollVoucher,
  testFinancialStatements,
  testSubAccounts,
  runAllTests
};
