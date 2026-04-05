import React, { useState, useEffect } from 'react';
import { Item, Warehouse } from '../../../types';

const StockTransfer = () => {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);

    // Header State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fromWarehouseId, setFromWarehouseId] = useState('');
    const [toWarehouseId, setToWarehouseId] = useState('');
    const [transferType, setTransferType] = useState<'DIRECT' | 'TRANSIT'>('DIRECT');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Lines State
    interface Line {
        id: number;
        item_id: string;
        item_name: string;
        quantity: number;
    }
    const [lines, setLines] = useState<Line[]>([]);

    // Item Picker State
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (searchTerm) {
            setFilteredItems(items.filter(i =>
                i.name_ar.includes(searchTerm) ||
                (i.code && i.code.includes(searchTerm))
            ).slice(0, 10));
        } else {
            setFilteredItems([]);
        }
    }, [searchTerm, items]);

    const loadData = async () => {
        try {
            const [whData, itemsData] = await Promise.all([
                window.electronAPI.inventory.getWarehouses(),
                window.electronAPI.inventory.getItems()
            ]);
            setWarehouses(whData);
            setItems(itemsData);
            if (whData.length > 0) {
                setFromWarehouseId(whData[0].id);
                if (whData.length > 1) setToWarehouseId(whData[1].id);
                else setToWarehouseId(whData[0].id);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        }
    };

    const handleAddItem = (item: Item) => {
        const newLine: Line = {
            id: Date.now(),
            item_id: item.id,
            item_name: item.name_ar,
            quantity: 1
        };
        setLines([...lines, newLine]);
        setSearchTerm('');
        setIsItemPickerOpen(false);
    };

    const updateLine = (id: number, value: number) => {
        setLines(prev => prev.map(line => line.id === id ? { ...line, quantity: value } : line));
    };

    const removeLine = (id: number) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const handleSave = async () => {
        if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) {
            alert('الرجاء اختيار مستودعات مختلفة للمصدر والوجهة');
            return;
        }
        if (lines.length === 0) {
            alert('الرجاء إضافة بند واحد على الأقل');
            return;
        }

        setLoading(true);
        try {
            const transfer = {
                type: transferType,
                from_warehouse_id: fromWarehouseId,
                to_warehouse_id: toWarehouseId,
                date: date,
                notes: notes,
                items: lines.map(l => ({
                    item_id: l.item_id,
                    quantity: l.quantity
                }))
            };

            const result = await window.electronAPI.inventory.transferRequest(transfer);
            if (result.success) {
                alert(`تم إرسال طلب النقل بنجاح! رقم: ${result.code}`);
                setLines([]);
                setNotes('');
            }
        } catch (error: any) {
            console.error(error);
            alert('فشل الحفظ: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-purple-700">نقل مخزني / مخزون بالطريق (Stock Transfer)</h1>

            {/* Header */}
            <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t-4 border-purple-500">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع النقل</label>
                        <select
                            value={transferType}
                            onChange={e => setTransferType(e.target.value as any)}
                            className="w-full border rounded p-2 bg-purple-50 font-bold"
                        >
                            <option value="DIRECT">مباشر (Direct)</option>
                            <option value="TRANSIT">عبر وسيط / بالطريق (In-Transit)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {transferType === 'DIRECT' ? 'يتم تحديث الرصيد في المستودعين فوراً' : 'يخرج من المصدر ويبقى معلقاً حتى الاستلام'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">المستودع (المصدر)</label>
                        <select
                            value={fromWarehouseId}
                            onChange={e => setFromWarehouseId(e.target.value)}
                            className="w-full border rounded p-2 bg-white"
                        >
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">المستودع (الوجهة)</label>
                        <select
                            value={toWarehouseId}
                            onChange={e => setToWarehouseId(e.target.value)}
                            className="w-full border rounded p-2 bg-white"
                        >
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">ملاحظات</label>
                    <input
                        type="text"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full border rounded p-2"
                        placeholder="سبب النقل / اسم السائق..."
                    />
                </div>
            </div>

            {/* Items Picker */}
            <div className="relative mb-4">
                <input
                    type="text"
                    placeholder="ابحث عن صنف للنقل..."
                    className="w-full border p-3 rounded shadow-sm focus:ring-2 focus:ring-purple-500"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setIsItemPickerOpen(true); }}
                    onFocus={() => setIsItemPickerOpen(true)}
                />
                {isItemPickerOpen && searchTerm && (
                    <div className="absolute top-12 left-0 right-0 bg-white border rounded shadow-xl z-20 max-h-60 overflow-y-auto">
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                className="p-2 hover:bg-purple-50 cursor-pointer border-b flex justify-between"
                                onClick={() => handleAddItem(item)}
                            >
                                <span>{item.name_ar}</span>
                                <span className="text-gray-500 text-sm">{item.code}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lines Grid */}
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border p-3 w-1/12">#</th>
                            <th className="border p-3 w-6/12">الصنف</th>
                            <th className="border p-3 w-3/12">الكمية المنقولة</th>
                            <th className="border p-3 w-2/12">حذف</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, index) => (
                            <tr key={line.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-center">{index + 1}</td>
                                <td className="p-3 font-medium">{line.item_name}</td>
                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full border rounded p-1 text-center font-bold"
                                        value={line.quantity}
                                        onChange={e => updateLine(line.id, parseFloat(e.target.value) || 0)}
                                    />
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => removeLine(line.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                    >
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {lines.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    القائمة فارغة.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={loading || lines.length === 0}
                    className={`px-8 py-3 rounded text-white font-bold shadow ${loading || lines.length === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                >
                    {loading ? 'جاري التنفيذ...' : 'تنفيذ النقل'}
                </button>
            </div>
        </div>
    );
};

export default StockTransfer;
