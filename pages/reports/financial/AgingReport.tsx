import React, { useState, useEffect } from 'react';
import { Hourglass, RefreshCw } from 'lucide-react';
import { exportToCSV } from '../../../utils/export';

const AgingReport = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getAgingReport();
            setData(result || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        exportToCSV(data, `Aging_Report_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const formatCurrency = (val: number) => val?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Hourglass className="text-orange-600" /> تقرير أعمار الذمم (Aging)
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b font-bold text-gray-700 flex justify-between">
                    <span>تحليل الذمم المستحقة حسب الفترة</span>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm font-bold bg-green-50 px-3 py-1 rounded-lg">
                            تصدير CSV
                        </button>
                        <button onClick={loadData} className="text-blue-600 hover:text-blue-800"><RefreshCw size={20} /></button>
                    </div>
                </div>
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 font-bold text-gray-700">
                        <tr>
                            <th className="p-4">العميل</th>
                            <th className="p-4">إجمالي المستحق</th>
                            <th className="p-4 bg-green-50 text-green-800">0-30 يوم</th>
                            <th className="p-4 bg-yellow-50 text-yellow-800">31-60 يوم</th>
                            <th className="p-4 bg-orange-50 text-orange-800">61-90 يوم</th>
                            <th className="p-4 bg-red-50 text-red-800">90+ يوم</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.map((row: any, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{row.partner_name}</td>
                                <td className="p-4 font-bold">{formatCurrency(row.total_due)}</td>
                                <td className="p-4 bg-green-50/50 text-gray-600 font-medium">{formatCurrency(row.d_0_30)}</td>
                                <td className="p-4 bg-yellow-50/50 text-gray-600 font-medium">{formatCurrency(row.d_31_60)}</td>
                                <td className="p-4 bg-orange-50/50 text-gray-600 font-medium">{formatCurrency(row.d_61_90)}</td>
                                <td className="p-4 bg-red-50/50 font-bold text-red-600">{formatCurrency(row.d_90_plus)}</td>
                            </tr>
                        ))}
                        {data.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-400">لا توجد ذمم مستحقة</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {loading && <div className="text-center p-4">جاري التحميل...</div>}
            </div>
        </div>
    );
};

export default AgingReport;
