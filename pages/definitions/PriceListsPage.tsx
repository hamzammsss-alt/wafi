import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, Edit, Trash2, X, Save, ArrowLeft, Package, DollarSign } from 'lucide-react';

export const PriceListsPage: React.FC = () => {
    const [priceLists, setPriceLists] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentList, setCurrentList] = useState<any>({ name_ar: '', currency_id: 'ILS', is_active: 1 });

    // Items View State
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [listItems, setListItems] = useState<any[]>([]);
    const [showItemModal, setShowItemModal] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>({ price: 0, min_quantity: 1 });

    // Lookups
    const [items, setItems] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedListId) {
            loadListItems(selectedListId);
        }
    }, [selectedListId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const api = (window as any).electronAPI;
            if (api) {
                const lists = await api.partner.getPriceLists();
                setPriceLists(lists || []);

                // Load lookups for items
                const allItems = await api.inventory.getItems();
                setItems(allItems || []);
                const allUnits = await api.inventory.getUnits();
                setUnits(allUnits || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadListItems = async (listId: string) => {
        const api = (window as any).electronAPI;
        if (api) {
            const items = await api.partner.getPriceListItems(listId);
            setListItems(items || []);
        }
    };

    const handleSaveList = async () => {
        try {
            await (window as any).electronAPI.partner.savePriceList(currentList);
            setIsModalOpen(false);
            loadData();
            setCurrentList({ name_ar: '', currency_id: 'ILS', is_active: 1 });
        } catch (error) {
            console.error(error);
            alert('Failed to save price list');
        }
    };

    const handleDeleteList = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        await (window as any).electronAPI.partner.deletePriceList(id);
        loadData();
        if (selectedListId === id) setSelectedListId(null);
    };

    const handleSaveItem = async () => {
        try {
            await (window as any).electronAPI.partner.savePriceListItem({ ...currentItem, price_list_id: selectedListId });
            setShowItemModal(false);
            loadListItems(selectedListId!);
            setCurrentItem({ price: 0, min_quantity: 1 });
        } catch (error) {
            console.error(error);
            alert('Failed to save item');
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('Remove this item?')) return;
        await (window as any).electronAPI.partner.deletePriceListItem(id);
        loadListItems(selectedListId!);
    };

    const filteredLists = priceLists.filter(p => p.name_ar.includes(searchTerm));

    if (selectedListId) {
        // Items View
        const list = priceLists.find(p => p.id === selectedListId);
        return (
            <div className="p-6 bg-gray-50 h-full" dir="rtl">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setSelectedListId(null)} className="p-2 hover:bg-gray-200 rounded-lg">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{list?.name_ar}</h1>
                            <p className="text-sm text-gray-500">إدارة أصناف القائمة</p>
                        </div>
                        <div className="mr-auto">
                            <button onClick={() => setShowItemModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                <Plus size={18} /> إضافة صنف
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="p-4">رقم الصنف</th>
                                    <th className="p-4">اسم الصنف</th>
                                    <th className="p-4">الوحدة</th>
                                    <th className="p-4">السعر</th>
                                    <th className="p-4">أقل كمية</th>
                                    <th className="p-4">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {listItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="p-4">{item.item_code}</td>
                                        <td className="p-4 font-bold text-gray-800">{item.item_name}</td>
                                        <td className="p-4">{item.unit_name}</td>
                                        <td className="p-4 text-green-600 font-bold">{item.price}</td>
                                        <td className="p-4">{item.min_quantity}</td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => { setCurrentItem(item); setShowItemModal(true); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16} /></button>
                                            <button onClick={() => handleDeleteItem(item.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {listItems.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد أصناف مضافة في هذه القائمة</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Item Modal */}
                {showItemModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                            <h3 className="text-xl font-bold mb-4">إضافة/تعديل سعر صنف</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm mb-1">الصنف</label>
                                    <select
                                        className="w-full border p-2 rounded"
                                        value={currentItem.item_id || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, item_id: e.target.value })}
                                    >
                                        <option value=""> اختر صنف </option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.name_ar}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">الوحدة</label>
                                    <select
                                        className="w-full border p-2 rounded"
                                        value={currentItem.unit_id || ''}
                                        onChange={e => setCurrentItem({ ...currentItem, unit_id: e.target.value })}
                                    >
                                        <option value=""> اختر وحدة </option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm mb-1">السعر</label>
                                        <input
                                            type="number"
                                            className="w-full border p-2 rounded"
                                            value={currentItem.price}
                                            onChange={e => setCurrentItem({ ...currentItem, price: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">أقل كمية</label>
                                        <input
                                            type="number"
                                            className="w-full border p-2 rounded"
                                            value={currentItem.min_quantity}
                                            onChange={e => setCurrentItem({ ...currentItem, min_quantity: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-gray-600">إلغاء</button>
                                <button onClick={handleSaveItem} className="px-4 py-2 bg-blue-600 text-white rounded">حفظ</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 p-6" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-100 p-3 rounded-xl">
                            <Tag className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">قوائم الأسعار</h1>
                            <p className="text-sm text-gray-500">إدارة القوائم السعرية للعملاء</p>
                        </div>
                    </div>
                    <button onClick={() => { setCurrentList({ name_ar: '', currency_id: 'ILS', is_active: 1 }); setIsModalOpen(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition">
                        <Plus size={18} /> قائمة جديدة
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLists.map(list => (
                        <div key={list.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer" onClick={() => setSelectedListId(list.id)}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-gray-800">{list.name_ar}</h3>
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); setCurrentList(list); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-blue-600"><Edit size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                <DollarSign size={14} />
                                <span>العملة: {list.currency_id}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Package size={14} />
                                <span>عدد الأصناف: -</span>
                            </div>
                            <div className={`mt-4 text-xs font-bold px-2 py-1 rounded inline-block ${list.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {list.is_active ? 'فعال' : 'غير فعال'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* List Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">{currentList.id ? 'تعديل قائمة' : 'قائمة جديدة'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm mb-1">اسم القائمة (عربي)</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={currentList.name_ar}
                                    onChange={e => setCurrentList({ ...currentList, name_ar: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">العملة</label>
                                <select
                                    className="w-full border p-2 rounded"
                                    value={currentList.currency_id}
                                    onChange={e => setCurrentList({ ...currentList, currency_id: e.target.value })}
                                >
                                    <option value="ILS">شيكل</option>
                                    <option value="USD">دولار</option>
                                    <option value="JOD">دينار</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={currentList.is_active === 1}
                                    onChange={e => setCurrentList({ ...currentList, is_active: e.target.checked ? 1 : 0 })}
                                />
                                <label className="text-sm">فعال</label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600">إلغاء</button>
                            <button onClick={handleSaveList} className="px-4 py-2 bg-blue-600 text-white rounded">حفظ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
