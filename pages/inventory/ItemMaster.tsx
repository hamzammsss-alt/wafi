import React, { useState, useEffect } from 'react';
import { Item } from '../../types';
import ItemForm from './ItemForm';

interface ItemMasterProps {
    defaultType?: 'Goods' | 'Service' | 'Raw Material' | 'Finished Good' | 'Asset';
}

const ItemMaster: React.FC<ItemMasterProps> = ({ defaultType }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [selectedItem, setSelectedItem] = useState<Partial<Item> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.inventory.getItems();
            setItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleCreate = () => {
        setSelectedItem({ type: defaultType || 'Goods', is_active: 1 });
        setIsEditing(true);
    };

    const handleEdit = async (item: Item) => {
        // Fetch full details
        try {
            const details = await window.electronAPI.inventory.getItemDetails(item.id);
            setSelectedItem(details);
            setIsEditing(true);
        } catch (e) {
            console.error("Error fetching item details:", e);
            alert("Error fetching details: " + (e.message || "Unknown error"));
        }
    };

    const handleDuplicate = async (item: Item) => {
        try {
            const details = await window.electronAPI.inventory.getItemDetails(item.id);
            if (details) {
                // Create copy
                const copy: Partial<Item> = {
                    ...details,
                    id: undefined, // Clear ID
                    code: `${details.code}-copy`,
                    name_ar: `${details.name_ar} (نسخة)`,
                    name_en: details.name_en ? `${details.name_en} (copy)` : '',
                };
                setSelectedItem(copy);
                setIsEditing(true);
            }
        } catch (e) {
            console.error(e);
            alert("Error duplicating item");
        }
    };

    const handleSave = async (itemData: Partial<Item>) => {
        if (selectedItem && selectedItem.id) {
            // Update Existing
            await window.electronAPI.inventory.saveItem({ ...itemData, id: selectedItem.id });
        } else {
            // Create New (Fresh or Duplicate)
            await window.electronAPI.inventory.createItem(itemData);
        }
        setIsEditing(false);
        fetchItems();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
            await window.electronAPI.inventory.deleteItem(id);
            fetchItems();
        }
    };

    if (isEditing) {
        return (
            <div className="p-4 h-full">
                <ItemForm
                    item={selectedItem || undefined}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                />
            </div>
        );
    }

    const filteredItems = items.filter(i => {
        const matchesSearch = i.name_ar.includes(search) ||
            i.code.includes(search) ||
            (i.name_en && i.name_en.toLowerCase().includes(search.toLowerCase()));

        const matchesType = defaultType ? i.type === defaultType : true;

        return matchesSearch && matchesType;
    });

    return (
        <div className="p-6 h-full flex flex-col" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">
                    {defaultType === 'Service' ? 'الأصناف الخدمية' : 'بطاقة الصنف'}
                </h1>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow"
                >
                    <span className="text-xl ml-2">+</span> إضافة صنف جديد
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <input
                    type="text"
                    placeholder="بحث عن صنف (الاسم، الرمز...)"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden flex-1">
                <div className="overflow-x-auto h-full">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0">
                            <tr>
                                <th className="p-4 border-b">الرمز</th>
                                <th className="p-4 border-b">الاسم العربي</th>
                                <th className="p-4 border-b">الاسم الإنجليزي</th>
                                <th className="p-4 border-b">النوع</th>
                                <th className="p-4 border-b">الوحدة الأساسية</th>
                                <th className="p-4 border-b">سعر البيع</th>
                                <th className="p-4 border-b">الحالة</th>
                                <th className="p-4 border-b text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="p-4">{item.code}</td>
                                    <td className="p-4 font-medium">{item.name_ar}</td>
                                    <td className="p-4 text-gray-500">{item.name_en || '-'}</td>
                                    <td className="p-4">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="p-4">{item.base_unit_name || '-'}</td>
                                    <td className="p-4 font-bold text-green-600">{item.sale_price}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.is_active ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center space-x-2 space-x-reverse">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            تعديل
                                        </button>
                                        <button
                                            onClick={() => handleDuplicate(item)}
                                            className="text-green-600 hover:text-green-800"
                                        >
                                            نسخ
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            حذف
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">
                                        لا توجد أصناف مطابقة للبحث
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ItemMaster;
