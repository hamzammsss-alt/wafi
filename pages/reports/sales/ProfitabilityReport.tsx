import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, Download } from 'lucide-react';
import { exportToCSV } from '../../../utils/export';

export const ProfitabilityReport = () => {
    const [range, setRange] = useState({
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getProfitability(range);
            setData(result || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        exportToCSV(data, `Profitability_Report_${range.startDate}_${range.endDate}.csv`);
    };

    const formatCurrency = (val: number) => val?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="text-green-600" /> تقرير الربحية
            </h1>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-end gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">من تاريخ</label>
                    <input type="date" value={range.startDate} onChange={e => setRange({ ...range, startDate: e.target.value })} className="border p-2 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">إلى تاريخ</label>
                    <input type="date" value={range.endDate} onChange={e => setRange({ ...range, endDate: e.target.value })} className="border p-2 rounded" />
                </div>
                <button onClick={loadData} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700">عرض</button>
                <button onClick={handleExport} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2">
                    <Download className="w-4 h-4" /> تصدير
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0">
                            <tr>
                                <th className="p-4">الكود</th>
                                <th className="p-4">اسم الصنف</th>
                                <th className="p-4">الكمية المباعة</th>
                                <th className="p-4">إجمالي المبيعات</th>
                                <th className="p-4">إجمالي التكلفة</th>
                                <th className="p-4">الربح</th>
                                <th className="p-4 text-center">هامش الربح %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-gray-700">
                            {data.map((row) => (
                                <tr key={row.code} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono text-gray-500">{row.code}</td>
                                    <td className="p-4 font-bold text-gray-800">{row.item_name}</td>
                                    <td className="p-4 font-medium">{row.quantity_sold}</td>
                                    <td className="p-4">{formatCurrency(row.total_sales)}</td>
                                    <td className="p-4 text-gray-500">{formatCurrency(row.total_cost)}</td>
                                    <td className={`p-4 font-bold ${row.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {formatCurrency(row.profit)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${row.margin >= 20 ? 'bg-green-100 text-green-700' : row.margin > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            {row.margin.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-400">لا توجد مبيعات في هذه الفترة</td>
                                </tr>
                            )}
                        </tbody>
                        {data.length > 0 && (
                            <tfoot className="bg-gray-50 font-bold border-t">
                                <tr>
                                    <td colSpan={3} className="p-4 text-center">الإجمالي</td>
                                    <td className="p-4">{formatCurrency(data.reduce((s, r) => s + r.total_sales, 0))}</td>
                                    <td className="p-4">{formatCurrency(data.reduce((s, r) => s + r.total_cost, 0))}</td>
                                    <td className="p-4 text-green-600">{formatCurrency(data.reduce((s, r) => s + r.profit, 0))}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
            {loading && <div className="text-center p-4">جاري التحميل...</div>}
        </div>
    );
};
