import React, { useEffect, useState } from 'react';
import { Plus, Eye, BarChart2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BudgetList = () => {
    const navigate = useNavigate();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBudgets();
    }, []);

    const loadBudgets = async () => {
        try {
            // @ts-ignore
            const data = await window.electronAPI.budget.getAll();
            setBudgets(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-full font-sans" dir="rtl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">الموازنات التقديرية</h1>
                <button
                    onClick={() => navigate('/gl/budgets/new')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    موازنة جديدة
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-700">قائمة الموازنات</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
                            <tr>
                                <th className="px-6 py-3">السنة المالية</th>
                                <th className="px-6 py-3">اسم الموازنة</th>
                                <th className="px-6 py-3">الحالة</th>
                                <th className="px-6 py-3 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-slate-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="animate-spin h-5 w-5" />
                                            جاري التحميل...
                                        </div>
                                    </td>
                                </tr>
                            ) : budgets.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-slate-400">
                                        لا توجد موازنات مسجلة. ابدأ بإضافة واحدة جديدة.
                                    </td>
                                </tr>
                            ) : (
                                budgets.map((budget) => (
                                    <tr key={budget.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-600">{budget.fiscal_year}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">{budget.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold 
                                                ${budget.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                    budget.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-100 text-slate-600'}`}>
                                                {budget.status === 'APPROVED' ? 'معتمدة' :
                                                    budget.status === 'DRAFT' ? 'مسودة' : budget.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    onClick={() => navigate(`/gl/budgets/${budget.id}`)}
                                                    title="استعراض التخصيصات"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                    onClick={() => navigate(`/reports/financial/budget-variance?id=${budget.id}`)}
                                                    title="تقرير الأداء"
                                                >
                                                    <BarChart2 className="h-4 w-4" />
                                                </button>
                                            </div>
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

export default BudgetList;
