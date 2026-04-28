import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, Edit, Trash2, X, Save, ArrowLeft, Package, DollarSign, CheckCircle2 } from 'lucide-react';
import { WorkspaceHeader } from '../../src/components/workspace/WorkspaceHeader';
import { useCreateIntent } from '../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../src/components/definitions/DefinitionMasterList';

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
        if (!confirm('هل أنت متأكد من حذف قائمة الأسعار؟')) return;
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
        if (!confirm('هل تريد حذف هذا الصنف من القائمة؟')) return;
        await (window as any).electronAPI.partner.deletePriceListItem(id);
        loadListItems(selectedListId!);
    };

    const openCreate = () => {
        setCurrentList({ name_ar: '', currency_id: 'ILS', is_active: 1 });
        setIsModalOpen(true);
    };

    useCreateIntent(openCreate);

    const filteredLists = priceLists.filter(p => p.name_ar.includes(searchTerm));

    const openListEdit = (list: any) => {
        setCurrentList(list);
        setIsModalOpen(true);
    };

    const openItemEdit = (item: any) => {
        setCurrentItem(item);
        setShowItemModal(true);
    };

    const handleDeleteListRows = async (rows: any[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد من حذف قائمة الأسعار؟' : `هل أنت متأكد من حذف ${rows.length} قوائم أسعار؟`)) return;

        for (const row of rows) {
            await (window as any).electronAPI.partner.deletePriceList(row.id);
        }
        await loadData();
        if (rows.some((row) => row.id === selectedListId)) setSelectedListId(null);
    };

    const handleDeleteItemRows = async (rows: any[]) => {
        if (!selectedListId || rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل تريد حذف هذا الصنف من القائمة؟' : `هل تريد حذف ${rows.length} أصناف من القائمة؟`)) return;

        for (const row of rows) {
            await (window as any).electronAPI.partner.deletePriceListItem(row.id);
        }
        await loadListItems(selectedListId);
    };

    const priceListColumns = React.useMemo<DefinitionListColumn<any>[]>(() => [
        {
            key: 'name_ar',
            label: 'اسم القائمة',
            width: 260,
            defaultVisible: true,
            getSearchValue: (list) => `${list.name_ar || ''} ${list.name_en || ''} ${list.currency_id || ''}`,
            renderCell: (list) => (
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-800">{list.name_ar || '-'}</div>
                    <div className="truncate text-xs text-slate-400">{list.name_en || '-'}</div>
                </div>
            ),
        },
        {
            key: 'currency_id',
            label: 'العملة',
            type: 'enum',
            filterType: 'enum',
            width: 130,
            defaultVisible: true,
            options: [
                { value: 'ILS', label: 'شيكل' },
                { value: 'USD', label: 'دولار' },
                { value: 'JOD', label: 'دينار' },
            ],
            getDisplayValue: (list) => list.currency_id || '-',
            renderCell: (list) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    <DollarSign size={12} />
                    {list.currency_id || '-'}
                </span>
            ),
        },
        {
            key: 'items_count',
            label: 'عدد الأصناف',
            type: 'number',
            filterType: 'number',
            width: 130,
            defaultVisible: false,
            getValue: (list) => Number(list.items_count || list.itemsCount || 0),
            getDisplayValue: (list) => Number(list.items_count || list.itemsCount || 0).toLocaleString('en-US'),
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 130,
            defaultVisible: true,
            getValue: (list) => (list.is_active ? 1 : 0),
            renderCell: (list) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${list.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {list.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                    {list.is_active ? 'فعال' : 'غير فعال'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 150,
            sortable: false,
            filterable: false,
            searchable: false,
            defaultVisible: true,
            align: 'center',
            renderCell: (list) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => setSelectedListId(list.id)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="فتح الأصناف">
                        <Package size={18} />
                    </button>
                    <button onClick={() => openListEdit(list)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="تعديل">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => handleDeleteList(list.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [priceLists, selectedListId]);

    const priceListItemColumns = React.useMemo<DefinitionListColumn<any>[]>(() => [
        {
            key: 'item_code',
            label: 'رقم الصنف',
            width: 150,
            defaultVisible: true,
            getDisplayValue: (item) => item.item_code || '-',
            renderCell: (item) => item.item_code ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">{item.item_code}</span>
            ) : '-',
        },
        {
            key: 'item_name',
            label: 'اسم الصنف',
            width: 260,
            defaultVisible: true,
            getSearchValue: (item) => `${item.item_code || ''} ${item.item_name || ''} ${item.unit_name || ''}`,
            renderCell: (item) => <span className="font-bold text-slate-800">{item.item_name || '-'}</span>,
        },
        {
            key: 'unit_name',
            label: 'الوحدة',
            width: 140,
            defaultVisible: true,
            getDisplayValue: (item) => item.unit_name || '-',
        },
        {
            key: 'price',
            label: 'السعر',
            type: 'number',
            filterType: 'number',
            width: 140,
            defaultVisible: true,
            getValue: (item) => Number(item.price || 0),
            getDisplayValue: (item) => Number(item.price || 0).toLocaleString('en-US'),
            renderCell: (item) => (
                <span className="font-mono font-bold text-emerald-700">
                    {Number(item.price || 0).toLocaleString('en-US')}
                </span>
            ),
        },
        {
            key: 'min_quantity',
            label: 'أقل كمية',
            type: 'number',
            filterType: 'number',
            width: 130,
            defaultVisible: true,
            getValue: (item) => Number(item.min_quantity || 0),
            getDisplayValue: (item) => Number(item.min_quantity || 0).toLocaleString('en-US'),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 120,
            sortable: false,
            filterable: false,
            searchable: false,
            defaultVisible: true,
            align: 'center',
            renderCell: (item) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => openItemEdit(item)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="تعديل">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [listItems, selectedListId]);

    if (selectedListId) {
        // Items View
        const list = priceLists.find(p => p.id === selectedListId);
        return (
            <div className="app-page h-full" dir="rtl">
                <div className="max-w-6xl mx-auto">
                    <WorkspaceHeader
                        icon={<Tag size={24} />}
                        title={list?.name_ar || 'قائمة أسعار'}
                        subtitle="إدارة أصناف القائمة السعرية"
                        badges={[
                            { label: `الأصناف ${listItems.length}`, tone: 'warning' },
                            { label: `الوحدات ${units.length}`, tone: 'info' },
                        ]}
                        actions={
                            <>
                                <button onClick={() => setSelectedListId(null)} className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100">
                                    <ArrowLeft size={20} />
                                </button>
                                <button onClick={() => setShowItemModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2">
                                    <Plus size={18} /> إضافة صنف
                                </button>
                            </>
                        }
                        className="mb-6"
                    />
                    <div className="hidden items-center gap-4 mb-6">
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

                    <DefinitionMasterList
                        screenKey={`definitions.price-list-items.${selectedListId}`}
                        data={listItems}
                        loading={isLoading}
                        columns={priceListItemColumns}
                        rowKey={(item) => String(item.id)}
                        searchPlaceholder="بحث في أصناف القائمة..."
                        emptyMessage="لا توجد أصناف مضافة في هذه القائمة"
                        createLabel="إضافة صنف"
                        onCreate={() => { setCurrentItem({ price: 0, min_quantity: 1 }); setShowItemModal(true); }}
                        onEdit={openItemEdit}
                        onDelete={handleDeleteItemRows}
                        onRefresh={() => loadListItems(selectedListId)}
                        defaultSort={{ key: 'item_code', direction: 'asc' }}
                    />

                    {false && (
                    <div className="card overflow-hidden">
                        <table className="dense-table w-full text-right">
                            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="p-4">رقم الصنف</th>
                                    <th className="p-4">اسم الصنف</th>
                                    <th className="p-4">الوحدة</th>
                                    <th className="p-4">السعر</th>
                                    <th className="p-4">أقل كمية</th>
                                    <th className="p-4">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
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
                    )}
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
        <div className="app-page h-full" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <WorkspaceHeader
                    icon={<Tag size={24} />}
                    title="قوائم الأسعار"
                    subtitle="إدارة القوائم السعرية للعملاء"
                    badges={[
                        { label: `الإجمالي ${priceLists.length}`, tone: 'warning' },
                        { label: `المعروض ${filteredLists.length}`, tone: 'info' },
                    ]}
                    actions={
                        <>
                            <div className="relative group">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="بحث عن قائمة..."
                                    className="input w-full md:w-64 pr-10 pl-4 py-2.5 rounded-xl"
                                />
                            </div>
                            <button onClick={openCreate} className="btn btn-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-200 hover:brightness-105 transition">
                                <Plus size={18} /> قائمة جديدة
                            </button>
                        </>
                    }
                    className="mb-6"
                />
                <div className="hidden card p-6 mb-6 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-100 p-3 rounded-xl">
                            <Tag className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">قوائم الأسعار</h1>
                            <p className="text-sm text-gray-500">إدارة القوائم السعرية للعملاء</p>
                        </div>
                    </div>
                    <button onClick={() => { setCurrentList({ name_ar: '', currency_id: 'ILS', is_active: 1 }); setIsModalOpen(true); }} className="btn btn-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-200 hover:brightness-105 transition">
                        <Plus size={18} /> قائمة جديدة
                    </button>
                </div>

                <DefinitionMasterList
                    screenKey="definitions.price-lists"
                    data={filteredLists}
                    loading={isLoading}
                    columns={priceListColumns}
                    rowKey={(list) => String(list.id)}
                    searchPlaceholder="بحث عن قائمة أسعار..."
                    emptyMessage="لا توجد قوائم أسعار مطابقة للمعايير الحالية"
                    createLabel="قائمة جديدة"
                    onCreate={openCreate}
                    onEdit={openListEdit}
                    onDelete={handleDeleteListRows}
                    onRefresh={loadData}
                    onRowDoubleClick={(list) => setSelectedListId(list.id)}
                    defaultSort={{ key: 'name_ar', direction: 'asc' }}
                />

                {false && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLists.map(list => (
                        <div key={list.id} className="card p-6 hover:shadow-md transition cursor-pointer" onClick={() => setSelectedListId(list.id)}>
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
                )}
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

