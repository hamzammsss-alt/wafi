import React, { useEffect, useState } from 'react';
import { Save, ArrowRight, Loader2, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BudgetForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Header State
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());
    const [name, setName] = useState(`موازنة ${new Date().getFullYear() + 1}`);

    // Lines State
    const [accounts, setAccounts] = useState<any[]>([]);
    const [budgetLines, setBudgetLines] = useState<Record<string, number>>({}); // accountId -> amount

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            // Fetch All accounts, filter only Profit & Loss accounts (Revenue, Expense)
            // @ts-ignore
            const allAccounts = await window.electronAPI.account.getAccounts();
            const pnlAccounts = allAccounts.filter((a: any) =>
                ['Revenue', 'Expense', 'Cost of Goods Sold', 'Operating Expense'].includes(a.type) //&&  a.is_transactional === 1
            );
            // Sort by code
            setAccounts(pnlAccounts.sort((a: any, b: any) => a.code.localeCompare(b.code)));
        } catch (error) {
            console.error("Failed to load accounts", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAmountChange = (accountId: string, value: string) => {
        setBudgetLines(prev => ({
            ...prev,
            [accountId]: parseFloat(value) || 0
        }));
    };

    const handleSubmit = async () => {
        if (!name || !fiscalYear) return;
        setSubmitting(true);
        try {
            // Transform data for backend
            const linesPayload = Object.entries(budgetLines).map(([accountId, amount]) => ({
                account_id: accountId,
                period: 0, // Annual
                amount: amount,
                notes: ''
            })).filter(l => l.amount > 0);

            const payload = {
                name,
                fiscal_year: parseInt(fiscalYear),
                lines: linesPayload
            };

            // @ts-ignore
            await window.electronAPI.budget.create(payload);
            navigate('/gl/budgets');
        } catch (error) {
            console.error("Failed to save budget", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-full font-sans" dir="rtl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        onClick={() => navigate('/gl/budgets')}
                    >
                        <ArrowRight className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">إعداد موازنة تقديرية جديدة</h1>
                        <p className="text-sm text-slate-500">تحديد القيم التقديرية للحسابات للسنة المالية القادمة</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm disabled:opacity-70 transition-colors"
                >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    حفظ الموازنة
                </button>
            </div>

            {/* Header Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Calendar size={14} /> السنة المالية
                    </label>
                    <input
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        type="number"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <FileText size={14} /> اسم الموازنة
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        placeholder="مثلا: موازنة العام 2026 الأساسية"
                    />
                </div>
            </div>

            {/* Lines Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">تقديرات الحسابات (الأرباح والخسائر)</h3>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex justify-center p-20">
                            <Loader2 className="animate-spin text-indigo-500 h-8 w-8" />
                        </div>
                    ) : (
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 w-[150px]">رقم الحساب</th>
                                    <th className="px-6 py-3">اسم الحساب</th>
                                    <th className="px-6 py-3 w-[150px]">النوع</th>
                                    <th className="px-6 py-3 w-[250px]">المبلغ التقديري (سنوي)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {accounts.map((acc) => (
                                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-3 font-mono text-slate-500 text-sm">{acc.code}</td>
                                        <td className="px-6 py-3 font-medium text-slate-800">{acc.name}</td>
                                        <td className="px-6 py-3">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide
                                                ${acc.type === 'Revenue' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                {acc.type === 'Revenue' ? 'إيرادات' : 'مصروفات'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-2">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full p-2 pl-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-left font-mono group-hover:bg-white transition-all shadow-sm"
                                                    placeholder="0.00"
                                                    onChange={(e) => handleAmountChange(acc.id, e.target.value)}
                                                />
                                                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ILS</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BudgetForm;
