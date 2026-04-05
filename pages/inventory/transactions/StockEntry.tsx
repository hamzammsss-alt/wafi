import React, { useState, useEffect } from 'react';
import { Item, Warehouse } from '../../../types';

const StockEntry = () => {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);

    // Header State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Lines State
    interface Line {
        id: number;
        item_id: string;
        item_name: string;
        quantity: number;
        cost: number;
        total: number;
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
            ).slice(0, 10)); // Limit 10
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
            if (whData.length > 0) setWarehouseId(whData[0].id);
        } catch (error) {
            console.error("Failed to load data", error);
        }
    };

    const handleAddItem = (item: Item) => {
        const newLine: Line = {
            id: Date.now(),
            item_id: item.id,
            item_name: item.name_ar,
            quantity: 1,
            cost: item.cost_price || 0,
            total: item.cost_price || 0
        };
        setLines([...lines, newLine]);
        setSearchTerm('');
        setIsItemPickerOpen(false);
    };

    const updateLine = (id: number, field: keyof Line, value: number) => {
        setLines(prev => prev.map(line => {
            if (line.id === id) {
                const updated = { ...line, [field]: value };
                // Recalculate total
                updated.total = updated.quantity * updated.cost;
                return updated;
            }
            return line;
        }));
    };

    const removeLine = (id: number) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const handleSave = async () => {
        if (!warehouseId || lines.length === 0) {
            alert('الرجاء تعبئة جميع الحقول المطلوبة (المستودع، وبند واحد على الأقل)');
            return;
        }

        setLoading(true);
        try {
            const doc = {
                type: 'ENTRY',
                warehouse_id: warehouseId,
                date: date,
                notes: notes,
                items: lines.map(l => ({
                    item_id: l.item_id,
                    quantity: l.quantity,
                    cost: l.cost
                }))
            };

            const result = await window.electronAPI.inventory.createStockDocument(doc);
            if (result.success) {
                alert(`تم حفظ سند الإدخال بنجاح! رقم السند: ${result.code}`);
                // Reset
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
            <h1 className="text-2xl font-bold mb-6">سند إدخال مخزني (Stock Entry)</h1>

            {/* Header */}
            <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">تاريخ السند</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full border rounded p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">المستودع</label>
                    <select
                        value={warehouseId}
                        onChange={e => setWarehouseId(e.target.value)}
                        className="w-full border rounded p-2 bg-white"
                    >
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">ملاحظات</label>
                    <input
                        type="text"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full border rounded p-2"
                        placeholder="سبب الإدخال..."
                    />
                </div>
            </div>

            {/* Items Picker */}
            <div className="relative mb-4">
                <input
                    type="text"
                    placeholder="ابحث عن صنف لإضافته (اسم أو كود)..."
                    className="w-full border p-3 rounded shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setIsItemPickerOpen(true); }}
                    onFocus={() => setIsItemPickerOpen(true)}
                /* onBlur with timeout to allow click? React common issue. */
                />
                {isItemPickerOpen && searchTerm && (
                    <div className="absolute top-12 left-0 right-0 bg-white border rounded shadow-xl z-20 max-h-60 overflow-y-auto">
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                className="p-2 hover:bg-blue-50 cursor-pointer border-b flex justify-between"
                                onClick={() => handleAddItem(item)}
                            >
                                <span>{item.name_ar}</span>
                                <span className="text-gray-500 text-sm">{item.code}</span>
                            </div>
                        ))}
                        {filteredItems.length === 0 && (
                            <div className="p-2 text-gray-500 text-center">لا توجد نتائج</div>
                        )}
                    </div>
                )}
            </div>

            {/* Lines Grid */}
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border p-3 w-1/12">#</th>
                            <th className="border p-3 w-4/12">الصنف</th>
                            <th className="border p-3 w-2/12">الكمية</th>
                            <th className="border p-3 w-2/12">التكلفة (الوحدة)</th>
                            <th className="border p-3 w-2/12">الإجمالي</th>
                            <th className="border p-3 w-1/12">حذف</th>
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
                                        className="w-full border rounded p-1 text-center"
                                        value={line.quantity}
                                        onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                                    />
                                </td>
                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full border rounded p-1 text-center"
                                        value={line.cost}
                                        onChange={e => updateLine(line.id, 'cost', parseFloat(e.target.value) || 0)}
                                    />
                                </td>
                                <td className="p-3 text-center font-bold text-gray-700">
                                    {line.total.toFixed(2)}
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
                                    المخزون فارغ. ابحث عن صنف لإضافته.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                        <tr>
                            <td colSpan={4} className="p-3 text-left pl-8">المجموع الكلي:</td>
                            <td className="p-3 text-center text-blue-800">
                                {lines.reduce((sum, l) => sum + l.total, 0).toFixed(2)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={loading || lines.length === 0}
                    className={`px-8 py-3 rounded text-white font-bold shadow ${loading || lines.length === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {loading ? 'جاري الحفظ...' : 'حفظ سند الإدخال'}
                </button>
            </div>
        </div>
    );
};

export default StockEntry;
