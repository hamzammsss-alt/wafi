import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Printer, RefreshCw, BarChart2, Filter } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const BudgetReport = () => {
    const [searchParams] = useSearchParams();
    const initialBudgetId = searchParams.get('id');

    const [budgets, setBudgets] = useState<any[]>([]);
    const [selectedBudgetId, setSelectedBudgetId] = useState<string>(initialBudgetId || '');
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadBudgets();
    }, []);

    useEffect(() => {
        if (selectedBudgetId) {
            loadReport(selectedBudgetId);
        }
    }, [selectedBudgetId]);

    const loadBudgets = async () => {
        try {
            // @ts-ignore
            const list = await window.electronAPI.budget.getAll();
            setBudgets(list);
            if (!selectedBudgetId && list.length > 0) {
                setSelectedBudgetId(list[0].id);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadReport = async (id: string) => {
        setLoading(true);
        try {
            // @ts-ignore
            const data = await window.electronAPI.budget.getReport(id);
            setReportData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Helper: Determine Row Color based on Variance
    const getVarianceColor = (val: number) => {
        if (val >= 0) return 'text-emerald-600';
        return 'text-rose-600';
    };

    const getVarianceBg = (val: number) => {
        if (val >= 0) return 'bg-emerald-50 text-emerald-700';
        return 'bg-rose-50 text-rose-700';
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-full font-sans" dir="rtl">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800">تقرير انحراف الموازنة (Budget vs Actual)</h1>
                        <p className="text-sm text-slate-500">مقارنة القيم التقديرية بالأداء الفعلي</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => selectedBudgetId && loadReport(selectedBudgetId)}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <RefreshCw className="h-4 w-4" />
                        تحديث
                    </button>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                        <Printer className="h-4 w-4" />
                        طباعة
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex gap-6 items-center">
                <div className="flex items-center gap-2 text-slate-500">
                    <Filter size={18} />
                    <span className="font-semibold text-sm">خيارات التقرير:</span>
                </div>

                <div className="relative w-[300px]">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">الموازنة</label>
                    <select
                        value={selectedBudgetId}
                        onChange={(e) => setSelectedBudgetId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-700"
                    >
                        <option value="" disabled>اختر موازنة...</option>
                        {budgets.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.fiscal_year})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Report Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase">الحساب</th>
                                <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase">النوع</th>
                                <th className="px-6 py-4 text-blue-600 bg-blue-50/50 text-xs font-bold uppercase">المحدد بالموازنة</th>
                                <th className="px-6 py-4 text-slate-600 bg-slate-50 text-xs font-bold uppercase">الفعلي (Actual)</th>
                                <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase">قيمة الانحراف</th>
                                <th className="px-6 py-4 text-slate-500 text-xs font-bold uppercase">% نسبة الانحراف</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-400">
                                        تحليل البيانات...
                                    </td>
                                </tr>
                            ) : reportData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-400">
                                        لا توجد بيانات لهذا التقرير
                                    </td>
                                </tr>
                            ) : (
                                reportData.filter(d => d.budget_amount !== 0 || d.actual_amount !== 0).map((row) => (
                                    <tr key={row.account_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800">{row.account_name}</span>
                                                <span className="text-xs font-mono text-slate-400">{row.account_code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded">
                                                {row.account_type === 'Revenue' ? 'إيراد' : 'مصروف'}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 bg-blue-50/10 font-mono font-medium text-slate-700">
                                            {row.budget_amount?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                            {row.actual_amount?.toLocaleString()}
                                        </td>

                                        <td className={`px-6 py-4 font-mono font-bold ${getVarianceColor(row.variance)}`}>
                                            {row.variance > 0 ? '+' : ''}{row.variance?.toLocaleString()}
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${getVarianceBg(row.variance)}`}>
                                                {Math.abs(row.variance_percent) < 1000 ? `${row.variance_percent}%` : '>1000%'}
                                                {row.variance >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BudgetReport;
