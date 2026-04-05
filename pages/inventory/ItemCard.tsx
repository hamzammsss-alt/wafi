import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, Barcode, DollarSign, Tag, CheckCircle2, AlertCircle, X, Layers, Activity, Ruler, FileText, Image } from 'lucide-react';
import { Item, Unit, Account } from '../../types';

export const ItemCard: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'units' | 'financial' | 'stock' | 'images' | 'attributes'>('general');
    const [newItem, setNewItem] = useState<Partial<Item>>({
        code: '',
        name_ar: '',
        name_en: '',
        type: 'Goods',
        cost_price: 0,
        sale_price: 0,
        min_stock: 0,
        is_active: 1,
        tax_included: 0,
        additional_units: []
    });
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                const api = (window.electronAPI as any);
                const [fetchedItems, fetchedUnits, fetchedCats, fetchedBrands, fetchedAccounts] = await Promise.all([
                    api.inventory.getItems(),
                    api.inventory.getUnits(),
                    api.inventory.getCategories(),
                    api.inventory.getBrands(),
                    api.getAccounts()
                ]);
                setItems(fetchedItems || []);
                setUnits(fetchedUnits || []);
                setCategories(fetchedCats || []);
                setBrands(fetchedBrands || []);
                setAccounts(fetchedAccounts?.filter((a: Account) => a.is_transactional) || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newItem.code || !newItem.name_ar || !newItem.base_unit_id) {
            setFeedback({ type: 'error', message: 'يرجى تعبئة الحقول الإجبارية (الرمز، الاسم، الوحدة الأساسية)' });
            return;
        }

        try {
            await (window.electronAPI as any).inventory.saveItem(newItem);
            setFeedback({ type: 'success', message: 'تم حفظ الصنف بنجاح' });
            loadData();
            setTimeout(() => {
                setIsModalOpen(false);
                setNewItem({
                    code: '', name_ar: '', type: 'Goods', cost_price: 0, sale_price: 0,
                    is_active: 1, tax_included: 0, additional_units: []
                });
                setFeedback(null);
                setActiveTab('general');
            }, 1000);
        } catch (error: any) {
            setFeedback({ type: 'error', message: 'حدث خطأ: ' + error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
        try {
            await (window.electronAPI as any).inventory.deleteItem(id);
            setFeedback({ type: 'success', message: 'تم حذف الصنف بنجاح' });
            loadData();
        } catch (error: any) {
            setFeedback({ type: 'error', message: 'فشل الحذف: ' + error.message });
        }
    };

    const filteredItems = items.filter(item =>
        item.name_ar.includes(searchTerm) ||
        item.code.includes(searchTerm) ||
        (item.name_en && item.name_en.includes(searchTerm))
    );

    // Helper for tabs
    const TabButton = ({ id, label, icon }: { id: any, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === id ? 'border-purple-600 text-purple-700 font-bold bg-purple-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="h-full bg-gray-50 p-6 overflow-auto" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Find & Add Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Package size={24} className="text-purple-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">بطاقة صنف</h1>
                                <p className="text-sm text-gray-500">إدارة الأصناف والمنتجات</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setIsModalOpen(true); setNewItem({ code: '', name_ar: '', type: 'Goods', cost_price: 0, sale_price: 0, is_active: 1, tax_included: 0 }); }}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 shadow-lg shadow-purple-200"
                        >
                            <Plus size={18} />
                            صنف جديد
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="بحث عن صنف (الاسم، الرمز)..."
                            className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-50 outline-none transition"
                        />
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="text-center py-20 text-gray-400">جاري التحميل...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-gray-400">
                        <Package size={64} className="mb-4 opacity-20" />
                        <p className="text-lg">لا توجد أصناف مطابقة</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition group relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 mb-1 line-clamp-1" title={item.name_ar}>{item.name_ar}</h3>
                                        {item.name_en && <p className="text-xs text-gray-400 line-clamp-1">{item.name_en}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); setNewItem(item); }} className="text-gray-400 hover:text-blue-500"><Edit size={16} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm border-t pt-3 border-dashed border-gray-100">
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span className="text-xs">السعر</span>
                                        <span className="font-bold text-gray-800">
                                            {Number(item.sale_price).toLocaleString()} ₪
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span className="text-xs">المخزون</span>
                                        <span className={`font-bold ${((item.min_stock || 0) > 0 && (item.current_stock || 0) <= (item.min_stock || 0)) ? 'text-red-500' : 'text-green-600'}`}>
                                            {(item.current_stock || 0).toLocaleString()} {units.find(u => u.id === item.base_unit_id)?.name_ar}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span className="text-xs">التصنيف</span>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            {categories.find(c => c.id === item.category_id)?.name_ar || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Package className="text-purple-600" />
                                {newItem.id ? 'تعديل صنف' : 'إضافة صنف جديد'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b bg-gray-50 px-6">
                            <TabButton id="general" label="بيانات عامة" icon={<FileText size={16} />} />
                            <TabButton id="units" label="الوحدات والأسعار" icon={<Ruler size={16} />} />
                            <TabButton id="financial" label="الحسابات المالية" icon={<DollarSign size={16} />} />
                            <TabButton id="stock" label="ضبط المخزون" icon={<Layers size={16} />} />
                            <TabButton id="images" label="الصور" icon={<Image size={16} />} />
                            <TabButton id="attributes" label="السمات (المقاس/اللون)" icon={<Tag size={16} />} />
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {feedback && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-bold mb-4 ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    {feedback.message}
                                </div>
                            )}

                            {/* General Tab */}
                            {activeTab === 'general' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">نوع الصنف</label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                            value={newItem.type}
                                            // @ts-ignore
                                            onChange={e => setNewItem({ ...newItem, type: e.target.value as any })}
                                        >
                                            <option value="STOCK">مخزني (Stock)</option>
                                            <option value="SERVICE">خدمي (Service)</option>
                                            <option value="KIT">مجمع (Kit)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                            value={newItem.category_id || ''}
                                            onChange={e => setNewItem({ ...newItem, category_id: e.target.value })}
                                        >
                                            <option value="">-- اختر المجموعة --</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الماركة (Brand)</label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                            value={(newItem as any).brand_id || ''}
                                            onChange={e => setNewItem({ ...newItem, brand_id: e.target.value } as any)}
                                        >
                                            <option value="">-- اختر الماركة --</option>
                                            {brands.map(b => (
                                                <option key={b.id} value={b.id}>{b.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">رمز الصنف <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                            value={newItem.code || ''}
                                            onChange={e => setNewItem({ ...newItem, code: e.target.value })}
                                            placeholder="SKU-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الباركود</label>
                                        <div className="relative">
                                            <Barcode className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                className="w-full border rounded-lg pl-10 pr-3 py-2 outline-none focus:border-purple-500 text-left dir-ltr"
                                                value={newItem.barcode || ''}
                                                onChange={e => setNewItem({ ...newItem, barcode: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف (عربي) <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                            value={newItem.name_ar || ''}
                                            onChange={e => setNewItem({ ...newItem, name_ar: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف (إنجليزي)</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500 text-left dir-ltr"
                                            value={newItem.name_en || ''}
                                            onChange={e => setNewItem({ ...newItem, name_en: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 flex gap-6 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-purple-600 rounded"
                                                checked={!!newItem.is_active}
                                                onChange={e => setNewItem({ ...newItem, is_active: e.target.checked ? 1 : 0 })}
                                            />
                                            <span className="text-gray-700">فعال (Active)</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Units Tab */}
                            {activeTab === 'units' && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-4 rounded-lg border">
                                        <h3 className="font-bold text-gray-800 mb-3">وحدة القياس الأساسية</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">وحدة القياس (Unit)</label>
                                                <select
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                                    value={newItem.base_unit_id || ''}
                                                    onChange={e => setNewItem({ ...newItem, base_unit_id: e.target.value })}
                                                >
                                                    <option value="">اختر الوحدة...</option>
                                                    {units.map((u: any) => (
                                                        <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-center pt-6">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-purple-600 rounded"
                                                        checked={!!newItem.tax_included}
                                                        onChange={e => setNewItem({ ...newItem, tax_included: e.target.checked ? 1 : 0 })}
                                                    />
                                                    <span className="text-gray-700 text-sm">الأسعار شاملة الضريبة</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Multi-Units Table */}
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Layers size={18} /> وحدات التعبئة والتحويل (Conversions)</h3>
                                        <div className="border rounded-lg overflow-hidden">
                                            <table className="w-full text-sm text-right">
                                                <thead className="bg-gray-50 text-gray-600 font-medium">
                                                    <tr>
                                                        <th className="p-3">الوحدة الكبيرة</th>
                                                        <th className="p-3">المعامل (Conversion)</th>
                                                        <th className="p-3">الوحدة الأساسية</th>
                                                        <th className="p-3">الباركود</th>
                                                        <th className="p-3">سعر البيع</th>
                                                        <th className="p-3"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {(newItem as any).uom_conversions?.map((conv: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="p-3">
                                                                <select
                                                                    className="w-full bg-transparent outline-none border-b border-dashed focus:border-purple-500"
                                                                    value={conv.from_unit_id}
                                                                    onChange={e => {
                                                                        const updated = [...((newItem as any).uom_conversions || [])];
                                                                        updated[idx].from_unit_id = e.target.value;
                                                                        setNewItem({ ...newItem, uom_conversions: updated } as any);
                                                                    }}
                                                                >
                                                                    <option value="">اختر...</option>
                                                                    {units.filter(u => u.id !== newItem.base_unit_id).map(u => (
                                                                        <option key={u.id} value={u.id}>{u.name_ar}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="p-3">
                                                                <input
                                                                    type="number"
                                                                    className="w-20 bg-transparent outline-none border-b border-dashed focus:border-purple-500"
                                                                    value={conv.factor}
                                                                    onChange={e => {
                                                                        const updated = [...((newItem as any).uom_conversions || [])];
                                                                        updated[idx].factor = Number(e.target.value);
                                                                        setNewItem({ ...newItem, uom_conversions: updated } as any);
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="p-3 text-gray-400">
                                                                = 1 {units.find(u => u.id === newItem.base_unit_id)?.name_ar}
                                                            </td>
                                                            <td className="p-3">
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-transparent outline-none border-b border-dashed focus:border-purple-500"
                                                                    placeholder="SCAN..."
                                                                    value={conv.barcode || ''}
                                                                    onChange={e => {
                                                                        const updated = [...((newItem as any).uom_conversions || [])];
                                                                        updated[idx].barcode = e.target.value;
                                                                        setNewItem({ ...newItem, uom_conversions: updated } as any);
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <input
                                                                    type="number"
                                                                    className="w-24 bg-transparent outline-none border-b border-dashed focus:border-purple-500"
                                                                    value={conv.sale_price || ''}
                                                                    onChange={e => {
                                                                        const updated = [...((newItem as any).uom_conversions || [])];
                                                                        updated[idx].sale_price = Number(e.target.value);
                                                                        setNewItem({ ...newItem, uom_conversions: updated } as any);
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <button
                                                                    onClick={() => {
                                                                        const updated = [...((newItem as any).uom_conversions || [])];
                                                                        updated.splice(idx, 1);
                                                                        setNewItem({ ...newItem, uom_conversions: updated } as any);
                                                                    }}
                                                                    className="text-red-400 hover:text-red-600"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={6} className="p-2 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    const updated = [...((newItem as any).uom_conversions || [])];
                                                                    updated.push({ from_unit_id: '', to_unit_id: newItem.base_unit_id || '', factor: 1, barcode: '', sale_price: 0 });
                                                                    setNewItem({ ...newItem, uom_conversions: updated } as any);
                                                                }}
                                                                className="text-purple-600 font-bold hover:underline flex items-center justify-center gap-1 w-full"
                                                            >
                                                                <Plus size={16} /> إضافة وحدة جديدة
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )
                            }

                            {/* Financial Tab */}
                            {
                                activeTab === 'financial' && (
                                    <div className="space-y-6">
                                        <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-800 border-r-4 border-yellow-400">
                                            يتم توجيه القيود المحاسبية لهذه الحسابات عند البيع والشراء والجرد.
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">حساب الإيرادات (Sales Account)</label>
                                                <select
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                                    value={newItem.sales_account_id || ''}
                                                    onChange={e => setNewItem({ ...newItem, sales_account_id: e.target.value })}
                                                >
                                                    <option value="">-- الافتراضي --</option>
                                                    {accounts.filter(a => a.account_type === 'Revenue').map(a => (
                                                        <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">حساب التكلفة (COGS Account)</label>
                                                <select
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                                    value={newItem.cogs_account_id || ''}
                                                    onChange={e => setNewItem({ ...newItem, cogs_account_id: e.target.value })}
                                                >
                                                    <option value="">-- الافتراضي --</option>
                                                    {accounts.filter(a => a.account_type === 'Expense').map(a => (
                                                        <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">حساب المخزون (Inventory Account)</label>
                                                <select
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                                    value={newItem.inventory_account_id || ''}
                                                    onChange={e => setNewItem({ ...newItem, inventory_account_id: e.target.value })}
                                                >
                                                    <option value="">-- الافتراضي --</option>
                                                    {accounts.filter(a => a.account_type === 'Asset').map(a => (
                                                        <option key={a.id} value={a.id}>{a.account_code} - {a.name_ar}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }

                            {/* Stock Tab */}
                            {
                                activeTab === 'stock' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">حد الطلب (Minimum Stock)</label>
                                                <input
                                                    type="number"
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                                    value={newItem.min_stock || 0}
                                                    onChange={e => setNewItem({ ...newItem, min_stock: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">نقطة إعادة الطلب (Reorder Point)</label>
                                                <input
                                                    type="number"
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                                    value={newItem.reorder_point || 0}
                                                    onChange={e => setNewItem({ ...newItem, reorder_point: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى (Max Stock)</label>
                                                <input
                                                    type="number"
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                                    value={newItem.max_stock || 0}
                                                    onChange={e => setNewItem({ ...newItem, max_stock: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        </div >

                        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                            >
                                إغلاق
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold shadow-lg shadow-purple-200 transition"
                            >
                                حفظ الصنف
                            </button>
                        </div>
                    </div >
                </div >
            )}
        </div >
    );
};
