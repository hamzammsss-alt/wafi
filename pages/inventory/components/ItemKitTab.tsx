import React, { useState, useEffect } from 'react';
import { Item } from '../../../types';

interface Props {
    data: Partial<Item>;
    onChange: (data: Partial<Item>) => void;
}

const ItemKitTab: React.FC<Props> = ({ data, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [allItems, setAllItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // State for temporary line input
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [qty, setQty] = useState(1);

    useEffect(() => {
        const loadItems = async () => {
            const items = await window.electronAPI.inventory.getItems();
            setAllItems(items.filter(i => i.id !== data.id)); // Exclude self
        };
        loadItems();
    }, [data.id]);

    useEffect(() => {
        if (searchTerm) {
            setFilteredItems(allItems.filter(i =>
                i.name_ar.includes(searchTerm) ||
                (i.code && i.code.includes(searchTerm))
            ).slice(0, 10));
        } else {
            setFilteredItems([]);
        }
    }, [searchTerm, allItems]);

    const handleAddItem = () => {
        if (!selectedItem) return;

        const currentKits = data.kit_items || [];
        // Check duplicate
        if (currentKits.find(k => k.child_item_id === selectedItem.id)) {
            alert('هذا الصنف مضاف مسبقاً');
            return;
        }

        const newKitItem = {
            child_item_id: selectedItem.id,
            child_item_name: selectedItem.name_ar, // For display
            quantity: qty
        };

        onChange({
            ...data,
            kit_items: [...currentKits, newKitItem]
        });

        // Reset inputs
        setSelectedItem(null);
        setSearchTerm('');
        setQty(1);
        setIsPickerOpen(false);
    };

    const handleRemoveItem = (childId: string) => {
        onChange({
            ...data,
            kit_items: (data.kit_items || []).filter(k => k.child_item_id !== childId)
        });
    };

    const handleUpdateQty = (childId: string, newQty: number) => {
        onChange({
            ...data,
            kit_items: (data.kit_items || []).map(k =>
                k.child_item_id === childId ? { ...k, quantity: newQty } : k
            )
        });
    };

    // Calculate Estimated Cost
    const calculateTotalCost = () => {
        if (!data.kit_items) return 0;
        return data.kit_items.reduce((sum, k) => {
            const refItem = allItems.find(i => i.id === k.child_item_id);
            return sum + ((refItem?.cost_price || 0) * k.quantity);
        }, 0);
    };

    return (
        <div className="p-4">
            <h3 className="text-lg font-bold mb-4 text-gray-700">مكونات الصنف (للتجميع/Kitting)</h3>
            <p className="text-sm text-gray-500 mb-6">حدد المكونات التي تدخل في تكوين هذا الصنف في عمليات التجميع.</p>

            {/* Add New Component */}
            <div className="bg-gray-50 p-4 rounded border mb-6 flex gap-4 items-end">
                <div className="flex-1 relative">
                    <label className="block text-sm font-medium mb-1">بحث عن صنف (مكون)</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setIsPickerOpen(true); }}
                        onFocus={() => setIsPickerOpen(true)}
                        placeholder="ابحث عن المادة الخام..."
                        className="w-full border rounded p-2"
                    />
                    {isPickerOpen && searchTerm && (
                        <div className="absolute top-16 left-0 right-0 bg-white border rounded shadow-xl z-20 max-h-48 overflow-y-auto">
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    className="p-2 hover:bg-blue-50 cursor-pointer border-b flex justify-between"
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setSearchTerm(item.name_ar);
                                        setIsPickerOpen(false);
                                    }}
                                >
                                    <span>{item.name_ar}</span>
                                    <span className="text-gray-500 text-sm">{item.code}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="w-24">
                    <label className="block text-sm font-medium mb-1">الكمية</label>
                    <input
                        type="number"
                        min="0.1" // Allow fractional
                        step="0.1"
                        value={qty}
                        onChange={e => setQty(parseFloat(e.target.value))}
                        className="w-full border rounded p-2 text-center"
                    />
                </div>
                <button
                    onClick={handleAddItem}
                    disabled={!selectedItem}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                    إضافة
                </button>
            </div>

            {/* List */}
            <table className="w-full text-right border-collapse">
                <thead>
                    <tr className="bg-gray-100 border-b">
                        <th className="p-3">م</th>
                        <th className="p-3">الصنف</th>
                        <th className="p-3 w-32">الكمية المطلوبة</th>
                        <th className="p-3 w-32">التكلفة التقديرية</th>
                        <th className="p-3 w-20">إجراء</th>
                    </tr>
                </thead>
                <tbody>
                    {(data.kit_items || []).map((kit, index) => {
                        const refItem = allItems.find(i => i.id === kit.child_item_id); // Look up for display
                        return (
                            <tr key={kit.child_item_id} className="border-b">
                                <td className="p-3">{index + 1}</td>
                                <td className="p-3">{kit.child_item_name || refItem?.name_ar || 'جاري التحميل...'}</td>
                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        value={kit.quantity}
                                        onChange={e => handleUpdateQty(kit.child_item_id, parseFloat(e.target.value) || 0)}
                                        className="w-full border rounded p-1 text-center"
                                    />
                                </td>
                                <td className="p-3 text-gray-500">
                                    {((refItem?.cost_price || 0) * kit.quantity).toFixed(2)}
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => handleRemoveItem(kit.child_item_id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-50 font-bold">
                        <td colSpan={3} className="p-3 text-left pl-8">إجمالي التكلفة المتوقعة:</td>
                        <td className="p-3">{calculateTotalCost().toFixed(2)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default ItemKitTab;
