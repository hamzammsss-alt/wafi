import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

const CommissionCalculationPage = () => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [month, year]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await window.electronAPI.commission.get(month, year);
            setData(res || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSalesChange = (index: number, val: string) => {
        const sales = parseFloat(val) || 0;
        const newData = [...data];
        const item = newData[index];
        item.total_sales = sales;
        item.commission_amount = sales * (item.commission_rate || 0);
        setData(newData);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await window.electronAPI.commission.save(data);
            alert('تم حفظ كشوفات العمولة بنجاح');
            loadData(); // Reload to get IDs/Status
        } catch (error) {
            alert('Error saving: ' + error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen rtl" dir="rtl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">احتساب العمولات</h1>
                    <p className="text-slate-500">إدخال مبيعات الموظفين واحتساب العمولات الشهرية</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border">
                    <select value={month} onChange={e => setMonth(Number(e.target.value))} className="p-2 border rounded bg-transparent font-bold">
                        {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>شهر {i + 1}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(Number(e.target.value))} className="p-2 border rounded bg-transparent font-bold">
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                    <button onClick={handleSave} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                        <Save size={18} />
                        {loading ? 'جاري الحفظ...' : 'حفظ الكشف'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                        <tr>
                            <th className="p-4">الموظف</th>
                            <th className="p-4 text-center">الهدف (Target)</th>
                            <th className="p-4 text-center">نسبة العمولة</th>
                            <th className="p-4 text-center w-48">إجمالي المبيعات</th>
                            <th className="p-4 text-center w-48">قيمة العمولة</th>
                            <th className="p-4 text-center">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا يوجد موظفين بنظام العمولة</td></tr>
                        ) : (
                            data.map((item, idx) => (
                                <tr key={item.employee_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-700">
                                        {item.employee_name}
                                        <div className="text-xs text-slate-400">{item.employee_code}</div>
                                    </td>
                                    <td className="p-4 text-center text-slate-500">
                                        {item.commission_target?.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-bold">
                                            {(item.commission_rate * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <input
                                            type="number"
                                            value={item.total_sales}
                                            onChange={e => handleSalesChange(idx, e.target.value)}
                                            className="w-full p-2 border rounded text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="p-4 text-center font-bold text-emerald-600 text-lg">
                                        {item.commission_amount?.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        {item.is_saved ? (
                                            <span className="flex items-center justify-center gap-1 text-emerald-600 text-sm font-medium">
                                                <CheckCircle size={14} /> محفوظ
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-1 text-amber-500 text-sm font-medium">
                                                <AlertCircle size={14} /> غير محفوظ
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 text-slate-500 text-sm">
                * يتم استخدام "قيمة العمولة" المحفوظة هنا في مسير الرواتب الشهري.
            </div>
        </div>
    );
};

export { CommissionCalculationPage };
