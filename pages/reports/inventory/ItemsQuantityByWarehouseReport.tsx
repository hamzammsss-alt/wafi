import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, Package2, RefreshCw, Search, Store } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exportToCSV } from '../../../utils/export';

interface ReportRow {
    warehouse_id: string;
    warehouse_name: string;
    item_id: string;
    code: string;
    item_name: string;
    quantity: number;
}

export const ItemsQuantityByWarehouseReport: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [rows, setRows] = useState<ReportRow[]>([]);

    const [selectedItemId, setSelectedItemId] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [includeZeroQty, setIncludeZeroQty] = useState(false);

    useEffect(() => {
        const boot = async () => {
            const [itemsResult, warehousesResult] = await Promise.all([
                window.electronAPI.inventory.getItems(),
                window.electronAPI.inventory.getWarehouses(),
            ]);

            setItems(Array.isArray(itemsResult) ? itemsResult : []);
            setWarehouses(Array.isArray(warehousesResult) ? warehousesResult : []);
        };

        void boot();
    }, []);

    useEffect(() => {
        const queryItemId = searchParams.get('itemId');
        if (queryItemId) setSelectedItemId(queryItemId);
    }, [searchParams]);

    const runReport = async () => {
        setLoading(true);
        try {
            const targetItems = selectedItemId
                ? items.filter((item) => String(item.id) === String(selectedItemId))
                : items;

            const targetWarehouses = selectedWarehouseId
                ? warehouses.filter((warehouse) => String(warehouse.id) === String(selectedWarehouseId))
                : warehouses;

            const result = await Promise.all(targetItems.flatMap((item) => targetWarehouses.map(async (warehouse) => {
                const stock = await window.electronAPI.getStock({
                    itemId: String(item.id),
                    warehouseId: String(warehouse.id),
                });

                return {
                    warehouse_id: String(warehouse.id),
                    warehouse_name: String(warehouse.name_ar || warehouse.name || warehouse.code || 'مستودع'),
                    item_id: String(item.id),
                    code: String(item.code || ''),
                    item_name: String(item.name_ar || item.name || ''),
                    quantity: Number(stock?.quantity || 0),
                } as ReportRow;
            })));

            const filtered = includeZeroQty ? result : result.filter((entry) => Number(entry.quantity) !== 0);
            setRows(filtered.sort((a, b) => {
                if (a.warehouse_name === b.warehouse_name) return a.item_name.localeCompare(b.item_name, 'ar');
                return a.warehouse_name.localeCompare(b.warehouse_name, 'ar');
            }));
        } catch (error) {
            console.error('Failed to run quantity-by-warehouse report', error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (items.length === 0 || warehouses.length === 0) return;
        void runReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, warehouses]);

    const totals = useMemo(() => {
        const totalQty = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
        return { totalQty, rowCount: rows.length };
    }, [rows]);

    const handleExport = () => {
        exportToCSV(rows, 'items-quantity-by-warehouse.csv');
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Store className="w-6 h-6 text-sky-600" />
                            كمية الأصناف حسب المستودع
                        </h1>
                        <span className="text-sm text-gray-500">تقرير توزيع أرصدة الأصناف على المستودعات</span>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    disabled={rows.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                    <Download className="w-4 h-4" />
                    تصدير
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المستودع</label>
                    <select
                        value={selectedWarehouseId}
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                    >
                        <option value="">جميع المستودعات</option>
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.name_ar || w.name || w.code}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
                    <select
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                    >
                        <option value="">كل الأصناف</option>
                        {items.map((i) => (
                            <option key={i.id} value={i.id}>{i.name_ar || i.name} ({i.code || '-'})</option>
                        ))}
                    </select>
                </div>

                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={includeZeroQty}
                        onChange={(e) => setIncludeZeroQty(e.target.checked)}
                        className="h-4 w-4"
                    />
                    <span>إظهار الأرصدة الصفرية</span>
                </label>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void runReport()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-bold"
                    >
                        <Search className="w-4 h-4" />
                        عرض
                    </button>
                    <button
                        onClick={() => void runReport()}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                        title="تحديث"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">عدد السطور</div>
                    <div className="text-2xl font-black text-sky-700">{totals.rowCount}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">إجمالي الكمية</div>
                    <div className="text-2xl font-black text-emerald-700">{totals.totalQty.toLocaleString('en-US', { maximumFractionDigits: 3 })}</div>
                </div>
            </div>

            <div className="card overflow-hidden">
                <table className="dense-table w-full text-right">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3">المستودع</th>
                            <th className="px-4 py-3">رقم الصنف</th>
                            <th className="px-4 py-3">اسم الصنف</th>
                            <th className="px-4 py-3">الكمية</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">جارٍ تحميل البيانات...</td>
                            </tr>
                        )}
                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                                    <Package2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    لا توجد بيانات مطابقة
                                </td>
                            </tr>
                        )}
                        {!loading && rows.map((row, idx) => (
                            <tr key={`${row.warehouse_id}-${row.item_id}-${idx}`} className="hover:bg-sky-50/40">
                                <td className="px-4 py-3 text-gray-700">{row.warehouse_name}</td>
                                <td className="px-4 py-3 font-mono text-gray-600">{row.code || '-'}</td>
                                <td className="px-4 py-3 font-semibold text-gray-800">{row.item_name}</td>
                                <td className="px-4 py-3 font-bold text-sky-700">{row.quantity.toLocaleString('en-US', { maximumFractionDigits: 3 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ItemsQuantityByWarehouseReport;

