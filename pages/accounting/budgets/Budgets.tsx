import React, { useState } from 'react';
import { Target, Save, ChevronDown, ChevronUp } from 'lucide-react';

export const Budgets = () => {
    // Mock budget data
    const [budgetItems, setBudgetItems] = useState([
        { id: 1, account: '401001-مبيعات نقدية', yearly: 120000, monthly: 10000 },
        { id: 2, account: '501001-رواتب وأجور', yearly: 60000, monthly: 5000 },
    ]);

    const handleMonthlyChange = (id: number, val: number) => {
        setBudgetItems(prev => prev.map(item =>
            item.id === id ? { ...item, monthly: val, yearly: val * 12 } : item
        ));
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans" dir="rtl">
            <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Target className="text-blue-600" /> الموازنات التقديرية (Budgets)
                    </h1>
                    <p className="text-sm text-gray-500">مقارنة الأداء الفعلي بالمخطط له لعام 2024</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition">
                    <Save size={18} /> حفظ الموازنة
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100 text-xs font-bold text-gray-600 uppercase">
                            <tr>
                                <th className="px-6 py-4 text-right">الحساب</th>
                                <th className="px-6 py-4 text-right bg-blue-50 text-blue-800">الموازنة الشهرية</th>
                                <th className="px-6 py-4 text-right bg-indigo-50 text-indigo-800">الموازنة السنوية</th>
                                <th className="px-6 py-4 text-right">توزيع موسمي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {budgetItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-700">{item.account}</td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            value={item.monthly}
                                            onChange={e => handleMonthlyChange(item.id, Number(e.target.value))}
                                            className="border rounded p-1 w-32 text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-bold text-indigo-600 font-mono text-lg">{item.yearly.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-xs text-gray-500 hover:text-blue-600 underline">تفاصيل</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
