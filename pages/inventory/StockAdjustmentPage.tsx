import React, { useState, useEffect } from 'react';
import { Save, Sliders, Search, AlertTriangle, Calendar, Box, Activity } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Item, Warehouse } from '../../types';

interface AdjustmentLine {
    id: string;
    itemId: string;
    name: string;
    quantity: number;
    notes: string;
}

export const StockAdjustmentPage = () => {
    // Header State
    const [header, setHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        warehouseId: '',
        reason: '',
        notes: '',
        ref_no: 'ADJ-NEW'
    });

    const [lines, setLines] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showItemPicker, setShowItemPicker] = useState(false);

    useEffect(() => {
        loadMasterData();
    }, []);

    const loadMasterData = async () => {
        try {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const [whs, itms] = await Promise.all([
                    // @ts-ignore
                    window.electronAPI.inventory.getWarehouses(),
                    // @ts-ignore
                    window.electronAPI.inventory.getItems()
                ]);
                setWarehouses(whs || []);
                setItems(itms || []);

                if (whs && whs.length > 0) {
                    setHeader(h => ({ ...h, warehouseId: whs[0].id }));
                }
            }
        } catch (err) {
            console.error("Failed to load master data", err);
        }
    };

    const addLine = () => {
        setLines([...lines, { id: uuidv4(), itemId: '', name: '', quantity: 0, notes: '' }]);
    };

    const updateLine = (id: string, field: string, value: any) => {
        setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const removeLine = (id: string) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const handleItemSelect = (item: Item) => {
        const newLine = {
            id: uuidv4(),
            itemId: item.id,
            name: item.name_ar,
            quantity: 1, // Default positive, user can change to negative
            notes: ''
        };
        setLines([...lines, newLine]);
        setSearchTerm('');
        setShowItemPicker(false);
    };

    const filteredItems = items.filter(i =>
        i.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.code.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20);

    const handleSave = async () => {
        if (!header.warehouseId) {
            alert("الرجاء اختيار المستودع");
            return;
        }
        if (lines.length === 0) {
            alert("الرجاء إضافة أصناف للمعالجة");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                header,
                lines
            };

            // @ts-ignore
            if (window.electronAPI && window.electronAPI.inventory.saveTransaction) {
                // @ts-ignore
                await window.electronAPI.inventory.saveTransaction({
                    type: 'ADJUSTMENT',
                    warehouseId: header.warehouseId,
                    date: header.date,
                    notes: `Adjustment: ${header.reason} - ${header.notes}`,
                    items: lines.map(l => ({ itemId: l.itemId, quantity: l.quantity }))
                });
                alert("تم حفظ تسوية المخزون بنجاح");
                setLines([]);
                setHeader(h => ({ ...h, notes: '', reason: '' }));
            } else {
                console.log("Saving Adjustment:", payload);
                alert("تم الحفظ (محاكاة)");
            }
        } catch (err: any) {
            alert("فشل الحفظ: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                        <Sliders size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">تعديل مخزون (تسوية)</h1>
                        <p className="text-xs text-slate-500">Stock Adjustment</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Save size={18} />
                        <span>حفظ التعديل</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">

                    {/* Header Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Activity size={18} className="text-red-500" />
                            بيانات التسوية
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">المستودع</label>
                                <select
                                    value={header.warehouseId}
                                    onChange={e => setHeader({ ...header, warehouseId: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                                >
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name || w.name_ar}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">تاريخ المعالجة</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={header.date}
                                        onChange={e => setHeader({ ...header, date: e.target.value })}
                                        className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                                    />
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">سبب التعديل</label>
                                <select
                                    value={header.reason}
                                    onChange={e => setHeader({ ...header, reason: e.target.value })}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                                >
                                    <option value="">-- اختر السبب --</option>
                                    <option value="DAMAGED">تالف / Damaged</option>
                                    <option value="EXPIRED">منتهي الصلاحية / Expired</option>
                                    <option value="COUNT_CORRECTION">تصحبح جرد / Inventory Correction</option>
                                    <option value="OTHER">أخرى / Other</option>
                                </select>
                            </div>

                            <div className="lg:col-span-3">
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">ملاحظات إضافية</label>
                                <input
                                    type="text"
                                    value={header.notes}
                                    onChange={e => setHeader({ ...header, notes: e.target.value })}
                                    placeholder="شرح سبب التعديل..."
                                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                                <Box size={18} className="text-red-500" />
                                الأصناف المعدلة
                            </h2>
                            <div className="relative">
                                {/* Search Input */}
                                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100 w-64 shadow-sm transition-all">
                                    <Search size={16} className="text-slate-400 ml-2" />
                                    <input
                                        type="text"
                                        placeholder="بحث لإضافة صنف..."
                                        className="w-full outline-none text-sm"
                                        value={searchTerm}
                                        onChange={e => { setSearchTerm(e.target.value); setShowItemPicker(true); }}
                                        onFocus={() => setShowItemPicker(true)}
                                    />
                                </div>
                                {/* Dropdown */}
                                {showItemPicker && searchTerm && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                                        {filteredItems.map(item => (
                                            <button
                                                key={item.id}
                                                className="w-full text-right px-4 py-2 hover:bg-red-50 text-sm border-b border-slate-50 last:border-0 flex justify-between group"
                                                onClick={() => handleItemSelect(item)}
                                            >
                                                <span className="font-medium text-slate-700 group-hover:text-red-700">{item.name_ar}</span>
                                                <span className="text-slate-400 text-xs font-mono">{item.code}</span>
                                            </button>
                                        ))}
                                        {filteredItems.length === 0 && (
                                            <div className="p-3 text-center text-xs text-slate-400">لا توجد نتائج</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-right">
                                <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 border-b border-slate-200 w-16 text-center">#</th>
                                        <th className="px-6 py-3 border-b border-slate-200">الصنف</th>
                                        <th className="px-6 py-3 border-b border-slate-200 w-40">الكمية ( +/- )</th>
                                        <th className="px-6 py-3 border-b border-slate-200 w-1/3">ملاحظات</th>
                                        <th className="px-6 py-3 border-b border-slate-200 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {lines.map((line, index) => (
                                        <tr key={line.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3 text-center text-slate-400 text-sm font-mono">{index + 1}</td>
                                            <td className="px-6 py-3 font-medium text-slate-700">{line.name}</td>
                                            <td className="px-6 py-3">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={line.quantity}
                                                        onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className={`w-full p-1.5 border border-slate-200 rounded text-center focus:ring-2 focus:ring-red-100 outline-none font-bold dir-ltr ${line.quantity < 0 ? 'text-red-600 border-red-200' : 'text-green-600 border-green-200'}`}
                                                    />
                                                    <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 text-xs text-slate-400 whitespace-nowrap">
                                                        {line.quantity > 0 ? 'زيادة' : line.quantity < 0 ? 'نقص' : '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="text"
                                                    value={line.notes}
                                                    onChange={e => updateLine(line.id, 'notes', e.target.value)}
                                                    placeholder="ملاحظة..."
                                                    className="w-full p-1.5 border border-slate-200 rounded text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button
                                                    onClick={() => removeLine(line.id)}
                                                    className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <AlertTriangle size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {lines.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                                                <Box size={32} className="text-slate-200" />
                                                <p>لا توجد أصناف مضافة. ابحث في الصندوق أعلاه للإضافة.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Totals or Count */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-between items-center text-sm text-slate-600">
                            <span>عدد الأصناف: {lines.length}</span>
                            <span>صافي التعديل: {lines.reduce((s, l) => s + (l.quantity || 0), 0)}</span>
                        </div>
                    </div>

                </div>
            </div>

            {/* Overlay to close picker */}
            {showItemPicker && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowItemPicker(false)}></div>
            )}
        </div>
    );
};

export default StockAdjustmentPage;
