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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="h-full bg-slate-50 p-6 overflow-auto" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Find & Add Header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                                <Package size={24} className="text-slate-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">بطاقة صنف</h1>
                                <p className="text-sm text-slate-500">إدارة الأصناف والمنتجات</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setIsModalOpen(true); setNewItem({ code: '', name_ar: '', type: 'Goods', cost_price: 0, sale_price: 0, is_active: 1, tax_included: 0 }); }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                        >
                            <Plus size={18} />
                            صنف جديد
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="بحث عن صنف (الاسم، الرمز)..."
                            className="w-full pr-11 pl-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                        />
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="text-center py-20 text-slate-400">جاري التحميل...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-slate-400">
                        <Package size={56} className="mb-4 text-slate-200" />
                        <p className="text-lg">لا توجد أصناف مطابقة</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition group relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-sky-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800 mb-1 line-clamp-1" title={item.name_ar}>{item.name_ar}</h3>
                                        {item.name_en && <p className="text-xs text-slate-500 line-clamp-1">{item.name_en}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); setNewItem(item); }} className="text-slate-400 hover:text-sky-600 transition-colors"><Edit size={16} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm border-t pt-3 border-dashed border-slate-200 mt-2">
                                    <div className="flex justify-between items-center text-slate-600">
                                        <span className="text-xs font-medium">السعر</span>
                                        <span className="font-bold text-slate-800">
                                            {Number(item.sale_price).toLocaleString()} ₪
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-600">
                                        <span className="text-xs font-medium">المخزون</span>
                                        <span className={`font-bold ${((item.min_stock || 0) > 0 && (item.current_stock || 0) <= (item.min_stock || 0)) ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {(item.current_stock || 0).toLocaleString()} {units.find(u => u.id === item.base_unit_id)?.name_ar}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-600">
                                        <span className="text-xs font-medium">التصنيف</span>
                                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
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
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-2xl">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Package className="text-slate-500" />
                                {newItem.id ? 'تعديل صنف' : 'إضافة صنف جديد'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-rose-50 hover:text-rose-600 p-1.5 rounded-lg transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 border-b border-slate-200 bg-slate-50/50 px-5 py-3 overflow-x-auto">
                            <TabButton id="general" label="بيانات عامة" icon={<FileText size={16} />} />
                            <TabButton id="units" label="الوحدات والأسعار" icon={<Ruler size={16} />} />
                            <TabButton id="financial" label="الحسابات المالية" icon={<DollarSign size={16} />} />
                            <TabButton id="stock" label="ضبط المخزون" icon={<Layers size={16} />} />
                            <TabButton id="images" label="الصور" icon={<Image size={16} />} />
                            <TabButton id="attributes" label="السمات (المقاس/اللون)" icon={<Tag size={16} />} />
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {feedback && (
                                <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium mb-4 border ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                                    {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    {feedback.message}
                                </div>
                            )}

                            {/* General Tab */}
                            {activeTab === 'general' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">نوع الصنف</label>
                                        <select
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">مجموعة الصنف</label>
                                        <select
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">الماركة (Brand)</label>
                                        <select
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">رمز الصنف <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                            value={newItem.code || ''}
                                            onChange={e => setNewItem({ ...newItem, code: e.target.value })}
                                            placeholder="SKU-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">الباركود</label>
                                        <div className="relative">
                                            <Barcode className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-left dir-ltr"
                                                value={newItem.barcode || ''}
                                                onChange={e => setNewItem({ ...newItem, barcode: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">اسم الصنف (عربي) <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                            value={newItem.name_ar || ''}
                                            onChange={e => setNewItem({ ...newItem, name_ar: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">اسم الصنف (إنجليزي)</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-left dir-ltr"
                                            value={newItem.name_en || ''}
                                            onChange={e => setNewItem({ ...newItem, name_en: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 flex gap-6 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-sky-500 transition focus:ring-2 focus:ring-sky-500/20"
                                                checked={!!newItem.is_active}
                                                onChange={e => setNewItem({ ...newItem, is_active: e.target.checked ? 1 : 0 })}
                                            />
                                            <span className="text-sm font-medium text-slate-700">فعال (Active)</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Units Tab */}
                            {activeTab === 'units' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-3">وحدة القياس الأساسية</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">وحدة القياس (Unit)</label>
                                                <select
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                                        className="w-4 h-4 rounded border-slate-300 text-sky-500 transition focus:ring-2 focus:ring-sky-500/20"
                                                        checked={!!newItem.tax_included}
                                                        onChange={e => setNewItem({ ...newItem, tax_included: e.target.checked ? 1 : 0 })}
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">الأسعار شاملة الضريبة</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Multi-Units Table */}
                                    <div>
                                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Layers size={18} /> وحدات التعبئة والتحويل (Conversions)</h3>
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-sm text-right">
                                                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold">
                                                    <tr>
                                                        <th className="p-3">الوحدة الكبيرة</th>
                                                        <th className="p-3">المعامل (Conversion)</th>
                                                        <th className="p-3">الوحدة الأساسية</th>
                                                        <th className="p-3">الباركود</th>
                                                        <th className="p-3">سعر البيع</th>
                                                        <th className="p-3"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(newItem as any).uom_conversions?.map((conv: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                            <td className="p-3">
                                                                <select
                                                                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                                                    className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                                                    value={conv.factor}
                                                                    onChange={e => {
                                                                        const updated = [...((newItem as any).uom_conversions || [])];
                                                                        updated[idx].factor = Number(e.target.value);
                                                                        setNewItem({ ...newItem, uom_conversions: updated } as any);
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="p-3 text-slate-500 font-medium">
                                                                = 1 {units.find(u => u.id === newItem.base_unit_id)?.name_ar}
                                                            </td>
                                                            <td className="p-3">
                                                                <input
                                                                    type="text"
                                                                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                                                    className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                                                    className="text-slate-400 hover:text-rose-600 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50/50">
                                                        <td colSpan={6} className="p-2 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    const updated = [...((newItem as any).uom_conversions || [])];
                                                                    updated.push({ from_unit_id: '', to_unit_id: newItem.base_unit_id || '', factor: 1, barcode: '', sale_price: 0 });
                                                                    setNewItem({ ...newItem, uom_conversions: updated } as any);
                                                                }}
                                                                className="inline-flex items-center justify-center gap-1 w-full text-slate-700 font-medium hover:bg-slate-100 rounded-lg px-3 py-2 transition-colors"
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
                                        <div className="bg-amber-50 p-4 rounded-xl text-sm text-amber-800 border border-amber-200/60 font-medium">
                                            يتم توجيه القيود المحاسبية لهذه الحسابات عند البيع والشراء والجرد.
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">حساب الإيرادات (Sales Account)</label>
                                                <select
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">حساب التكلفة (COGS Account)</label>
                                                <select
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">حساب المخزون (Inventory Account)</label>
                                                <select
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">حد الطلب (Minimum Stock)</label>
                                                <input
                                                    type="number"
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                                    value={newItem.min_stock || 0}
                                                    onChange={e => setNewItem({ ...newItem, min_stock: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">نقطة إعادة الطلب (Reorder Point)</label>
                                                <input
                                                    type="number"
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                                    value={newItem.reorder_point || 0}
                                                    onChange={e => setNewItem({ ...newItem, reorder_point: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">الحد الأقصى (Max Stock)</label>
                                                <input
                                                    type="number"
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                                    value={newItem.max_stock || 0}
                                                    onChange={e => setNewItem({ ...newItem, max_stock: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        </div >

                        <div className="p-4 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl flex justify-end gap-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                            >
                                إغلاق
                            </button>
                            <button
                                onClick={handleSave}
                                className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
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
