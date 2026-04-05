import React, { useState, useEffect } from 'react';
import { Package, RefreshCcw, Filter, Printer } from 'lucide-react';
import PrintPreview from '@/pages/common/PrintPreview';

export const InventoryValuationReport = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const [showPrint, setShowPrint] = useState(false);

    useEffect(() => {
        loadWarehouses();
        loadData();
    }, []);

    const loadWarehouses = async () => {
        try {
            // @ts-ignore
            const result = await window.electronAPI.inventory.getWarehouses();
            setWarehouses(result || []);
        } catch (error) { console.error(error); }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (selectedWarehouse) filters.warehouse_id = selectedWarehouse;

            // @ts-ignore
            const result = await window.electronAPI.inventory.getValuation(filters);
            setData(result || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const formatCurrency = (val: number) => val ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

    const totalQty = data.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalVal = data.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0);

    if (showPrint) {
        return (
            <PrintPreview
                title="تقرير قيمة المخزون"
                data={data}
                columns={[
                    { header: 'المستودع', key: 'warehouse_name' },
                    { header: 'رقم الصنف', key: 'code', width: '15%' },
                    { header: 'اسم الصنف', key: 'item_name', width: '30%' },
                    { header: 'الوحدة', key: 'unit_name' },
                    { header: 'الكمية', key: 'quantity' },
                    { header: 'التكلفة', key: 'avg_cost', format: (val: number) => formatCurrency(val) },
                    { header: 'الإجمالي', key: 'total_value', format: (val: number) => formatCurrency(val) },
                ]}
                onClose={() => setShowPrint(false)}
            />
        );
    }

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Package className="text-indigo-600" /> قيمة المخزون
                </h1>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border shadow-sm">
                        <Filter size={16} className="text-gray-400" />
                        <select
                            value={selectedWarehouse}
                            onChange={e => setSelectedWarehouse(e.target.value)}
                            className="bg-transparent outline-none text-sm min-w-[150px]"
                        >
                            <option value="">جميع المستودعات</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name_ar}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={loadData}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                        title="تحديث"
                    >
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={() => setShowPrint(true)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                        title="طباعة"
                    >
                        <Printer size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">إجمالي قيمة المخزون</div>
                    <div className="text-2xl font-bold text-indigo-600">{formatCurrency(totalVal)} <span className="text-xs text-gray-400">دينار</span></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">عدد الأصناف</div>
                    <div className="text-2xl font-bold text-emerald-600">{data.length} <span className="text-xs text-gray-400">صنف</span></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">الكمية الإجمالية</div>
                    <div className="text-2xl font-bold text-blue-600">{totalQty.toLocaleString()} <span className="text-xs text-gray-400">وحدة</span></div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 font-bold text-gray-700 sticky top-0 z-10 border-b">
                            <tr>
                                <th className="p-4 w-48">المستودع</th>
                                <th className="p-4 w-32">رقم الصنف</th>
                                <th className="p-4">اسم الصنف</th>
                                <th className="p-4 w-24 text-center">الوحدة</th>
                                <th className="p-4 w-32 text-center">الكمية</th>
                                <th className="p-4 w-32 text-center">التكلفة</th>
                                <th className="p-4 w-32 text-center">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && (
                                <tr><td colSpan={7} className="p-12 text-center text-gray-500">جاري التحميل...</td></tr>
                            )}
                            {!loading && data.length === 0 && (
                                <tr><td colSpan={7} className="p-12 text-center text-gray-400">لا توجد بيانات</td></tr>
                            )}
                            {!loading && data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="p-4 text-gray-600">{row.warehouse_name}</td>
                                    <td className="p-4 font-mono text-gray-600">{row.code}</td>
                                    <td className="p-4 font-medium text-gray-800">{row.item_name}</td>
                                    <td className="p-4 text-center text-gray-500">{row.unit_name}</td>
                                    <td className={`p-4 text-center font-bold ${row.quantity < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                                        {row.quantity}
                                    </td>
                                    <td className="p-4 text-center font-mono text-gray-600">{formatCurrency(row.avg_cost)}</td>
                                    <td className="p-4 text-center font-mono font-bold text-indigo-600">{formatCurrency(row.total_value)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t font-bold sticky bottom-0 z-10">
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-600">الإجمالي الكلي</td>
                                <td className="p-4 text-center text-blue-600">{totalQty.toLocaleString()}</td>
                                <td className="p-4"></td>
                                <td className="p-4 text-center text-indigo-700 text-lg">{formatCurrency(totalVal)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};
