import React, { useState, useEffect } from 'react';
import { Package, ArrowRight, Filter, Search, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToCSV } from '../../utils/export';

const ItemMovement = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<any[]>([]);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        // @ts-ignore
        const data = await window.electronAPI.inventory.getItems();
        setItems(data);
    };

    const runReport = async () => {
        if (!selectedItemId) { alert("الرجاء اختيار الصنف"); return; }

        setLoading(true);
        try {
            // @ts-ignore
            const data = await window.electronAPI.reports.getItemMovement({
                itemId: selectedItemId,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
            setMovements(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        exportToCSV(movements, `Item_Movement_${selectedItemId}_${dateRange.startDate}.csv`);
    };

    let runningStock = 0;

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen font-sans" dir="rtl">

            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Package className="w-6 h-6 text-orange-600" />
                            حركة صنف (كرت الصنف)
                        </h1>
                        <span className="text-sm text-gray-500">متابعة الوارد والصادر والرصيد للأصناف</span>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    disabled={movements.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-bold hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                    <Download className="w-4 h-4" />
                    تصدير
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
                    <select
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                    >
                        <option value="">اختر الصنف...</option>
                        {items.map(i => (
                            <option key={i.id} value={i.id}>{i.name_ar} ({i.code})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                    <input
                        type="date"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    />
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={runReport}
                        className="mb-0.5 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold shadow-lg shadow-orange-600/20 h-10 self-end"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Report Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">نوع الحركة</th>
                            <th className="px-6 py-3">رقم المستند</th>
                            <th className="px-6 py-3">وارد</th>
                            <th className="px-6 py-3">صادر</th>
                            <th className="px-6 py-3">الرصيد</th>
                            <th className="px-6 py-3">الوحدة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {movements.map((row, index) => {
                            runningStock += row.quantity_change;
                            const isIn = row.quantity_change > 0;
                            return (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{row.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{row.ref_no}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{isIn ? row.quantity_change : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">{!isIn ? Math.abs(row.quantity_change) : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{runningStock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.unit_name}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {movements.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>لا توجد حركات للعرض</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export { ItemMovement };
