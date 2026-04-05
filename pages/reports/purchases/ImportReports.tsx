import React, { useState, useEffect } from 'react';
import { Ship } from 'lucide-react';

export const ImportReports = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getImportReports();
            setData(result || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => val?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Ship className="text-blue-500" /> تقارير الاستيراد
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b font-bold text-gray-700 flex justify-between">
                    <span>ملخص ملفات الاستيراد المفتوحة</span>
                    <button onClick={loadData} className="text-sm text-blue-600 hover:underline">تحديث</button>
                </div>
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="p-3">رقم الملف</th>
                            <th className="p-3">تاريخ</th>
                            <th className="p-3">المورد</th>
                            <th className="p-3">قيمة الفاتورة (FOB)</th>
                            <th className="p-3">الاجمالي (CIF تقريباً)</th>
                            <th className="p-3">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3 font-mono text-blue-600 font-bold">{row.file_no}</td>
                                <td className="p-3 text-gray-500">{row.date}</td>
                                <td className="p-3 font-bold text-gray-700">{row.supplier_name}</td>
                                <td className="p-3">{formatCurrency(row.invoice_value)}</td>
                                <td className="p-3 font-bold">{formatCurrency(row.total_cost)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'POSTED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {row.status === 'POSTED' ? 'مرحل / واصل' : 'مسودة / في الطريق'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-400">لا توجد ملفات استيراد</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {loading && <div className="text-center p-4">جاري التحميل...</div>}
            </div>
        </div>
    );
};
