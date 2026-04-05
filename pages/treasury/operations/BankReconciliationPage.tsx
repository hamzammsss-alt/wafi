import React, { useState, useEffect } from 'react';
import { Archive, Calendar, Check, AlertCircle, Save } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Account } from '../../../types';

export const BankReconciliationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const urlBankId = searchParams.get('bankId');
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState(urlBankId || '');

    // Dates & Balances
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [endBalance, setEndBalance] = useState<number>(0);
    const [bookBalance, setBookBalance] = useState<number>(0);

    const [items, setItems] = useState<any[]>([]);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Initial Load (Accounts)
    useEffect(() => {
        const load = async () => {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const allAccounts = await window.electronAPI.getAccounts();
                // Filter for Bank Accounts (or Cash)
                // Or just let user pick from all, but better filter checks/banks.
                // Heuristic: Name includes "Bank" or Code starts with 12?
                // Let's filter transactionals.
                setAccounts(allAccounts.filter((a: any) => a.is_transactional === 1 && (a.name_en?.toLowerCase().includes('bank') || a.name_ar?.includes('بنك'))));
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (urlBankId) setSelectedAccount(urlBankId);
    }, [urlBankId]);

    // Load Items when Filter Changes
    useEffect(() => {
        if (selectedAccount && endDate) {
            fetchData();
        }
    }, [selectedAccount, endDate]);

    const fetchData = async () => {
        setIsLoading(true);
        setCheckedItems({});
        try {
            // @ts-ignore
            const api = (window.electronAPI as any).treasury;
            const [unrecItems, bal] = await Promise.all([
                api.getUnreconciledItems(selectedAccount, endDate),
                api.getBookBalance(selectedAccount, endDate)
            ]);

            setItems(unrecItems || []);
            setBookBalance(bal || 0);
        } catch (e: any) {
            console.error(e);
            setFeedback({ type: 'error', message: 'فشل تحميل البيانات' });
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate Cleared Balance
    const clearedSum = items.reduce((sum, item) => {
        if (checkedItems[item.id]) {
            // Debit adds to balance, Credit subtracts (assuming Asset)
            // Or simple sum of net?
            // Item has debit/credit.
            return sum + (item.debit - item.credit);
        }
        return sum;
    }, 0);

    // Adjusted Cleared Balance = Book Balance? 
    // Wait. 
    // Reconciliation Logic Update:
    // User enters "Statement Ending Balance" (Bank Paper).
    // We arrive at it by:
    // Adjusted Book Balance = Book Balance + (Unrecorded Items?) -> No, we select EXISTING items.
    // Standard Manual Rec Formula:
    // Statement Balance - Outstanding Checks + Deposits in Transit = Book Balance.

    // BUT the user prompt implies:
    // "Finish until Difference is Zero".
    // Difference = Ending Bank Balance - Cleared Balance? No.
    // Cleared Balance means "Sum of items marked as cleared".
    // 
    // Usually:
    // Cleared Balance (Calculated) = Opening Balance + Sum of Cleared Debits - Sum of Cleared Credits.
    // But we don't track "Opening Balance" explicit here for the period. 
    // We scan "Unreconciled up to Date".
    // So "Cleared Balance" essentially assumes we start from 0 if we fetch ALL unreconciled history? 
    // Or we fetch unreconciled.
    // If we have previously reconciled items, they are NOT in the list.
    // BUT their impact is in the "Book Balance" math? No.
    // Book Balance = All Posted.
    // 
    // The Prompt says: "Show Cleared Balance (Sum of ticked items)".
    // And "Difference (Ending Bank Balance - Cleared Balance)".
    // 
    // This implies we are building the balance from scratch or from last reconciliation?
    // If we have OLD reconciled items, we need their sum too.
    // 
    // Let's assume for simplicity (or strict V1):
    // "Cleared Balance" = (Sum of ALL PREVIOUSLY Reconciled) + (Sum of CURRENT Ticked).
    // But `getUnreconciledItems` excludes reconciled.
    // We need `getReconciledBalance`?
    // 
    // Improved Logic:
    // 1. Get `Total Reconciled Balance` (Sum of lines where reconciled=1 AND date <= endDate).
    // 2. Add `Current Ticked Sum` to it.
    // 3. This is the `Total Cleared Balance`.
    // 4. Compare with `Statement Balance`.

    // However, the prompt might just want "Cleared Balance" of the *current session*?
    // "Show Cleared Balance (Sum of ticked items)".
    // "Difference (Ending - Cleared)".
    // This implies the user enters the FULL Balance.
    // So we need the FULL reconciled history.

    // I will add `getReconciledBalance` to Backend in this file or TreasuryService via `getBookBalance` logic?
    // Let's calculate:
    // Book Balance = Total of EVERYTHING.
    // Unreconciled Balance = Book Balance - Reconciled Balance.
    // 
    // Wait, simpler:
    // Target = Statement Balance.
    // Current State = Reconciled Balance (Pre-existing) + Ticked Items.
    // 
    // Let's calculate "Pre-existing Reconciled Balance".
    // BookBalance = (Pre-existing Reconciled) + (Unreconciled).
    // So: Pre-existing Reconciled = BookBalance - Unreconciled_Total.
    // 
    // Correct? Yes.
    // So we can derive it.

    const totalUnreconciledInDb = items.reduce((sum, item) => sum + (item.debit - item.credit), 0);
    const preExistingReconciled = bookBalance - totalUnreconciledInDb;

    const currentClearedBalance = preExistingReconciled + clearedSum;
    const difference = endBalance - currentClearedBalance; // Or (currentCleared - end).

    const handleFinish = async () => {
        if (Math.abs(difference) > 0.01) return;

        try {
            const idsToReconcile = Object.keys(checkedItems).filter(k => checkedItems[k]);
            const api = (window.electronAPI as any).treasury;
            await api.reconcileItems(idsToReconcile);
            setFeedback({ type: 'success', message: 'تمت التسوية بنجاح' });
            fetchData();
        } catch (e) {
            setFeedback({ type: 'error', message: 'حدث خطأ' });
        }
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col p-6 gap-6" dir="rtl">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Archive size={24} /></div>
                        تسوية البنك (Bank Reconciliation)
                    </h1>
                    <p className="text-gray-500 mt-2">مطابقة كشف البنك مع الدفاتر</p>
                </div>

                <div className="flex gap-4 items-end">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">الحساب البنكي</label>
                        <select
                            className="w-64 px-4 py-2 border rounded-lg bg-white"
                            value={selectedAccount}
                            onChange={e => setSelectedAccount(e.target.value)}
                        >
                            <option value="">-- اختر حساب --</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ الكشف</label>
                        <input
                            type="date"
                            className="px-4 py-2 border rounded-lg"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">رصيد الكشف (النهائي)</label>
                        <input
                            type="number"
                            className="w-40 px-4 py-2 border rounded-lg"
                            value={endBalance}
                            onChange={e => setEndBalance(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-gray-500 text-sm font-medium">رصيد الدفتر (Book Balance)</div>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{bookBalance.toFixed(2)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-gray-500 text-sm font-medium">الرصيد المطابق (Cleared)</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{currentClearedBalance.toFixed(2)}</div>
                </div>
                <div className={`bg-white p-4 rounded-xl border shadow-sm ${Math.abs(difference) < 0.01 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="text-gray-500 text-sm font-medium">الفرق (Difference)</div>
                    <div className={`text-2xl font-bold mt-1 ${Math.abs(difference) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                        {difference.toFixed(2)}
                    </div>
                </div>
                <div className="flex items-center">
                    <button
                        disabled={Math.abs(difference) > 0.01 || items.length === 0}
                        onClick={handleFinish}
                        className="w-full h-full bg-indigo-600 disabled:bg-gray-300 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition flex flex-col items-center justify-center gap-1"
                    >
                        <Save size={24} />
                        <span>إتمام التسوية</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0">
                            <tr>
                                <th className="p-4 w-12 text-center">
                                    {/* Select All? Maybe too dangerous for manual recon */}
                                </th>
                                <th className="p-4">التاريخ</th>
                                <th className="p-4">المرجع</th>
                                <th className="p-4">الوصف</th>
                                <th className="p-4">مدين (إيداع)</th>
                                <th className="p-4">دائن (صرف)</th>
                                <th className="p-4">القيمة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">جاري التحميل...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">لا توجد حركات غير مطابقة حتى هذا التاريخ</td></tr>
                            ) : (
                                items.map(item => (
                                    <tr key={item.id} className={`hover:bg-gray-50 cursor-pointer ${checkedItems[item.id] ? 'bg-emerald-50' : ''}`}
                                        onClick={() => setCheckedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
                                        <td className="p-4 text-center">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${checkedItems[item.id] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>
                                                {checkedItems[item.id] && <Check size={14} />}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600">{item.date}</td>
                                        <td className="p-4 text-indigo-600 font-mono text-sm">{item.voucher_no}</td>
                                        <td className="p-4 text-gray-800">{item.description}</td>
                                        <td className="p-4 text-emerald-600 font-medium">{item.debit > 0 ? item.debit.toFixed(2) : '-'}</td>
                                        <td className="p-4 text-red-600 font-medium">{item.credit > 0 ? item.credit.toFixed(2) : '-'}</td>
                                        <td className="p-4 font-bold" dir="ltr">{(item.debit - item.credit).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {feedback && (
                <div className={`fixed bottom-6 left-6 p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {feedback.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold">{feedback.message}</span>
                </div>
            )}
        </div>
    );
};
