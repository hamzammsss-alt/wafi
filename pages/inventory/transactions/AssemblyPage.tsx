import React, { useState, useEffect } from 'react';
import { Item, Warehouse } from '../../../types';

const AssemblyPage = () => {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);

    // Header State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [warehouseId, setWarehouseId] = useState('');
    const [type, setType] = useState<'BUILD' | 'UNBUILD'>('BUILD');
    const [notes, setNotes] = useState('');

    // Assembly Item State
    const [parentItem, setParentItem] = useState<Item | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [components, setComponents] = useState<any[]>([]); // To show BOM details
    const [loading, setLoading] = useState(false);

    // Picker
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

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
            if (whData.length > 0) setWarehouseId(whData[0].id);
        } catch (error) {
            console.error("Failed to load data", error);
        }
    };

    const handleSelectParent = async (item: Item) => {
        setParentItem(item);
        setSearchTerm(item.name_ar);
        setIsPickerOpen(false);

        // Fetch Kit Components to display to user
        try {
            const kits = await window.electronAPI.inventory.getKit(item.id);
            setComponents(kits);
            if (!kits || kits.length === 0) {
                alert("تنبيه: هذا الصنف لا يحتوي على مكونات (BOM) معرفة في النظام.");
            }
        } catch (e) {
            console.error("Failed to fetch kit", e);
        }
    };

    const handleSave = async () => {
        if (!parentItem || !warehouseId || quantity <= 0) {
            alert('الرجاء تعبئة جميع الحقول المطلوبة');
            return;
        }
        if (components.length === 0) {
            alert('لا يمكن إتمام العملية: الصنف المختار ليس له مكونات (BOM).');
            return;
        }

        setLoading(true);
        try {
            const assembly = {
                type,
                parent_item_id: parentItem.id,
                quantity: quantity,
                warehouse_id: warehouseId,
                date: date,
                notes: notes
            };

            const result = await window.electronAPI.inventory.createAssembly(assembly);
            if (result.success) {
                alert(`تمت العملية بنجاح! رقم المستند: ${result.code}`);
                // Simple Reset
                setParentItem(null);
                setSearchTerm('');
                setQuantity(1);
                setComponents([]);
            }
        } catch (error: any) {
            console.error(error);
            alert('فشل العملية: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-indigo-700">تجميع / تفكيك أصناف (Assembly / Kitting)</h1>

            {/* Header */}
            <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t-4 border-indigo-500">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع العملية</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value as any)}
                            className={`w-full border rounded p-2 font-bold ${type === 'BUILD' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
                        >
                            <option value="BUILD">تجميع (Build) - إنتاج</option>
                            <option value="UNBUILD">تفكيك (Unbuild) - عكس التجميع</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">تاريخ العملية</label>
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
            </div>

            {/* Parent Item Selection */}
            <div className="bg-white p-6 rounded shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2 relative">
                        <label className="block text-sm font-medium mb-1">الصنف المجمع (Kit Item)</label>
                        <input
                            type="text"
                            placeholder="ابحث عن الصنف المجمع..."
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setIsPickerOpen(true); }}
                            onFocus={() => setIsPickerOpen(true)}
                        />
                        {isPickerOpen && searchTerm && (
                            <div className="absolute top-16 left-0 right-0 bg-white border rounded shadow-xl z-20 max-h-60 overflow-y-auto">
                                {filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="p-2 hover:bg-indigo-50 cursor-pointer border-b flex justify-between"
                                        onClick={() => handleSelectParent(item)}
                                    >
                                        <span>{item.name_ar}</span>
                                        <span className="text-gray-500 text-sm">{item.code}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الكمية المراد {type === 'BUILD' ? 'إنتاجها' : 'تفكيكها'}</label>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                            className="w-full border p-2 rounded text-center font-bold text-lg"
                        />
                    </div>
                </div>

                {/* BOM Preview */}
                {parentItem && (
                    <div className="mt-4 border-t pt-4">
                        <h4 className="font-bold text-sm text-gray-500 mb-2">مكونات الصنف (BOM):</h4>
                        {components.length > 0 ? (
                            <table className="w-full text-sm text-right bg-indigo-50 rounded">
                                <thead>
                                    <tr>
                                        <th className="p-2">المكون</th>
                                        <th className="p-2">الكمية لكل وحدة</th>
                                        <th className="p-2">إجمالي الكمية المطلوبة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {components.map((c, idx) => (
                                        <tr key={idx} className="border-t border-indigo-100">
                                            <td className="p-2 font-medium">{c.child_item_name || c.name_ar}</td>
                                            <td className="p-2">{c.quantity}</td>
                                            <td className="p-2 font-bold">{(c.quantity * quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-red-500 text-sm">لم يتم تعريف مكونات لهذا الصنف. يرجى تعريفها في بطاقة الصنف أولاً.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={loading || !parentItem || components.length === 0}
                    className={`px-8 py-3 rounded text-white font-bold shadow ${loading || !parentItem || components.length === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                >
                    {loading ? 'جاري التنفيذ...' : (type === 'BUILD' ? 'تنفيذ التجميع' : 'تنفيذ التفكيك')}
                </button>
            </div>
        </div>
    );
};

export default AssemblyPage;
