import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Download, Calendar, Box, Trash2 } from 'lucide-react';
import { exportToCSV } from '../../../utils/export';

export const ExpiryReport = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [daysFilter, setDaysFilter] = useState<number>(30); // الافتراضي: 30 يوماً

    useEffect(() => {
        loadData();
    }, [daysFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getExpiryReport({ days: daysFilter });
            setData(result || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (data.length === 0) return alert('لا توجد بيانات لتصديرها');
        exportToCSV(data, `Expiry_Report_${daysFilter}_Days_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const formatCurrency = (val: number) => val?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // دالة لتحديد لون وتنبيه الحالة بناءً على الأيام المتبقية
    const getStatusBadge = (days: number) => {
        if (days < 0) {
            return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold border border-red-200">منتهي الصلاحية ({Math.abs(days)} يوم)</span>;
        } else if (days <= 7) {
            return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-bold border border-orange-200">حرج ({days} أيام)</span>;
        } else {
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-bold border border-yellow-200">تحذير ({days} أيام)</span>;
        }
    };

    const handleWriteOff = async (row: any) => {
        if (!confirm(`هل أنت متأكد من إتلاف الكمية (${row.remaining_quantity}) للصنف: ${row.item_name}؟\nسيتم توليد قيد محاسبي بقيمة الخسارة (${formatCurrency(row.total_value)}).`)) {
            return;
        }
        setLoading(true);
        try {
            // @ts-ignore
            await window.electronAPI.inventory.writeOffBatch({ batchId: row.batch_id, itemId: row.item_id, quantity: row.remaining_quantity, totalValue: row.total_value });
            alert('تم تسجيل سند الإتلاف بنجاح.');
            loadData(); // إعادة تحميل التقرير
        } catch (error: any) {
            alert('حدث خطأ أثناء الإتلاف: ' + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <AlertTriangle className="text-red-600" /> تقرير صلاحية المخزون (Expiry Report)
            </h1>

            {/* الإحصائيات السريعة */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold">أصناف منتهية الصلاحية</p>
                        <p className="text-2xl font-bold text-gray-900">{data.filter(d => d.days_remaining < 0).length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex items-center gap-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Calendar size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold">تنتهي خلال أسبوع</p>
                        <p className="text-2xl font-bold text-gray-900">{data.filter(d => d.days_remaining >= 0 && d.days_remaining <= 7).length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Box size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold">إجمالي القيمة المهددة</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(data.reduce((sum, item) => sum + item.total_value, 0))}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b font-bold text-gray-700 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                        <span>عرض الأصناف التي تنتهي صلاحيتها خلال:</span>
                        <select 
                            value={daysFilter} 
                            onChange={(e) => setDaysFilter(Number(e.target.value))}
                            className="p-1 border border-gray-300 rounded outline-none focus:border-blue-500 bg-white text-sm"
                        >
                            <option value={7}>7 أيام (أسبوع)</option>
                            <option value={30}>30 يوماً (شهر)</option>
                            <option value={90}>90 يوماً (3 أشهر)</option>
                            <option value={180}>180 يوماً (6 أشهر)</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                            <Download size={16} /> تصدير CSV
                        </button>
                        <button onClick={loadData} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg border border-blue-100"><RefreshCw size={18} /></button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-white font-bold text-gray-600 border-b border-gray-200">
                            <tr>
                                <th className="p-4">رمز الصنف</th>
                                <th className="p-4">اسم الصنف</th>
                                <th className="p-4 text-center">تاريخ الصلاحية</th>
                                <th className="p-4 text-center">الحالة</th>
                                <th className="p-4 text-center">الكمية المتبقية</th>
                                <th className="p-4">إجمالي التكلفة</th>
                                <th className="p-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.length > 0 ? data.map((row: any, idx: number) => (
                                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${row.days_remaining < 0 ? 'bg-red-50/30' : ''}`}>
                                    <td className="p-4 font-mono text-gray-500">{row.item_code}</td>
                                    <td className="p-4 font-bold text-gray-800">{row.item_name}</td>
                                    <td className="p-4 text-center font-mono text-red-600">{row.expiry_date}</td>
                                    <td className="p-4 text-center">{getStatusBadge(row.days_remaining)}</td>
                                    <td className="p-4 text-center font-bold text-gray-900">{row.remaining_quantity}</td>
                                    <td className="p-4 font-medium text-gray-800">{formatCurrency(row.total_value)}</td>
                                    <td className="p-4 text-center">
                                        {row.days_remaining < 0 && (
                                            <button onClick={() => handleWriteOff(row)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100" title="إتلاف الكمية">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="p-12 text-center text-gray-400">{loading ? 'جاري التحميل...' : 'المخزون سليم. لا توجد أصناف تنتهي صلاحيتها في هذه الفترة.'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};