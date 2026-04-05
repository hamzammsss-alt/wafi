import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, RefreshCcw } from 'lucide-react';

export const InventoryStatus = () => {
    const [tab, setTab] = useState('Stock');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // New Filters
    const [slowDays, setSlowDays] = useState(90);
    const [expiryDays, setExpiryDays] = useState(30);

    useEffect(() => {
        if (tab === 'Stock') loadStockData();
        if (tab === 'Slow') loadSlowData();
        if (tab === 'Expiry') loadExpiryData();
    }, [tab]);

    const loadStockData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getInventoryStatus();
            setData(result || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const loadSlowData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getSlowMovingItems(slowDays);
            setData(result || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const loadExpiryData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getExpiryReport(expiryDays);
            setData(result || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const formatCurrency = (val: number) => val ? val.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Package className="text-indigo-600" /> تقارير المخزون
                </h1>
                <div className="flex gap-2">
                    {tab === 'Slow' && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border">
                            <span className="text-sm">الأيام بدون حركة: </span>
                            <input type="number" value={slowDays} onChange={e => setSlowDays(Number(e.target.value))} className="w-16 border rounded p-1" />
                            <button onClick={loadSlowData} className="px-2 bg-indigo-50 text-indigo-600 rounded">تحديث</button>
                        </div>
                    )}
                    {tab === 'Expiry' && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border">
                            <span className="text-sm">ينتهي خلال (يوم): </span>
                            <input type="number" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))} className="w-16 border rounded p-1" />
                            <button onClick={loadExpiryData} className="px-2 bg-indigo-50 text-indigo-600 rounded">تحديث</button>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            if (tab === 'Stock') loadStockData();
                            if (tab === 'Slow') loadSlowData();
                            if (tab === 'Expiry') loadExpiryData();
                        }}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                    >
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex gap-2 border-b">
                <button onClick={() => setTab('Stock')} className={`px-4 py-2 font-bold ${tab === 'Stock' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>جرد المخزون</button>
                <button onClick={() => setTab('Slow')} className={`px-4 py-2 font-bold ${tab === 'Slow' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>الأصناف الراكدة</button>
                <button onClick={() => setTab('Expiry')} className={`px-4 py-2 font-bold ${tab === 'Expiry' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>صلاحية المواد</button>
            </div>

            {loading && <div className="p-12 text-center text-gray-500">جاري التحميل...</div>}

            {!loading && tab === 'Stock' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0">
                            <tr>
                                <th className="p-3">رقم الصنف</th>
                                <th className="p-3">اسم الصنف</th>
                                <th className="p-3">الوحدة</th>
                                <th className="p-3 text-center">الكمية المتوفرة</th>
                                <th className="p-3 text-center">القيمة الإجمالية</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map((row: any) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-mono text-gray-600">{row.code}</td>
                                    <td className="p-3 font-medium text-gray-800">{row.name_ar}</td>
                                    <td className="p-3 text-gray-500">{row.unit_name}</td>
                                    <td className={`p-3 text-center font-bold ${row.total_quantity <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {row.total_quantity}
                                    </td>
                                    <td className="p-3 text-center font-mono text-gray-700">
                                        {formatCurrency(row.total_value)}
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-400">لا توجد أصناف</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t font-bold">
                            <tr>
                                <td colSpan={3} className="p-3 text-center">الإجمالي الكلي</td>
                                <td className="p-3 text-center text-indigo-600">{data.reduce((sum: number, r: any) => sum + r.total_quantity, 0)}</td>
                                <td className="p-3 text-center text-indigo-600">{formatCurrency(data.reduce((sum: number, r: any) => sum + r.total_value, 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {!loading && tab === 'Slow' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-yellow-50 font-bold text-yellow-800 sticky top-0">
                            <tr>
                                <th className="p-3">رقم الصنف</th>
                                <th className="p-3">اسم الصنف</th>
                                <th className="p-3 text-center">الكمية الحالية</th>
                                <th className="p-3 text-center">آخر حركة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map((row: any) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-mono text-gray-600">{row.code}</td>
                                    <td className="p-3 font-medium text-gray-800">{row.name_ar}</td>
                                    <td className="p-3 text-center font-bold text-gray-700">{row.current_stock}</td>
                                    <td className="p-3 text-center text-gray-500">
                                        {row.last_movement_date ? new Date(row.last_movement_date).toLocaleDateString() : 'لا يوجد'}
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-gray-400">جميع الأصناف نشطة! لا يوجد أصناف راكدة.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && tab === 'Expiry' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-red-50 font-bold text-red-800 sticky top-0">
                            <tr>
                                <th className="p-3">رقم الباتش</th>
                                <th className="p-3">رقم الصنف</th>
                                <th className="p-3">اسم الصنف</th>
                                <th className="p-3 text-center">الكمية</th>
                                <th className="p-3 text-center">تاريخ الانتهاء</th>
                                <th className="p-3 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map((row: any, i: number) => {
                                const expiry = new Date(row.expiry_date);
                                const today = new Date();
                                const isExpired = expiry < today;
                                return (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono text-gray-600">{row.batch_no}</td>
                                        <td className="p-3 font-mono text-gray-600">{row.item_code}</td>
                                        <td className="p-3 font-medium text-gray-800">{row.item_name}</td>
                                        <td className="p-3 text-center font-bold text-gray-700">{row.quantity}</td>
                                        <td className="p-3 text-center font-mono">{new Date(row.expiry_date).toLocaleDateString()}</td>
                                        <td className="p-3 text-center">
                                            {isExpired
                                                ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">منتهي</span>
                                                : <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">سينتهي قريباً</span>
                                            }
                                        </td>
                                    </tr>
                                )
                            })}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-400">لا توجد أصناف منتهية أو قريبة الانتهاء.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
