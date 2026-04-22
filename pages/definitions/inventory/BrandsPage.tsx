import React, { useState, useEffect, useRef } from 'react';
import {
    Tag,
    Plus,
    Search,
    Trash2,
    Edit,
    Save,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Upload
} from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { Brand } from '../../../types';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

export const BrandsPage = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name_ar: '',
        name_en: '',
        code: '',
        origin_country: '',
        description: '',
        is_active: true,
        image_url: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadBrands();
    }, []);

    const loadBrands = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.inventory.getBrands();
            setBrands(data);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل الماركات');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (brand: Brand) => {
        setFormData({
            name_ar: brand.name_ar,
            name_en: brand.name_en || '',
            code: brand.code || '',
            origin_country: brand.origin_country || '',
            description: brand.description || '',
            is_active: brand.is_active ? true : false,
            image_url: (brand as any).image_url || ''
        });
        setEditingId(brand.id);
        setIsAdding(true);
    };

    const handleClose = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({
            name_ar: '',
            name_en: '',
            code: '',
            origin_country: '',
            description: '',
            is_active: true,
            image_url: ''
        });
        setError(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (window.electronAPI?.system?.saveImage) {
                const buffer = await file.arrayBuffer();
                const res = await window.electronAPI.system.saveImage(buffer, file.name);
                if (res.success) {
                    setFormData({ ...formData, image_url: res.path });
                } else {
                    throw new Error('Failed to save image path');
                }
            } else {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData({ ...formData, image_url: reader.result as string });
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            setError('حدث خطأ أثناء رفع الصورة.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const openCreate = () => {
        handleClose();
        setIsAdding(true);
    };

    useCreateIntent(openCreate);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name_ar) {
            setError('اسم الماركة (عربي) مطلوب');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                is_active: formData.is_active ? 1 : 0
            };

            if (editingId) {
                await window.electronAPI.inventory.updateBrand({ id: editingId, ...payload });
            } else {
                await window.electronAPI.inventory.createBrand(payload);
            }

            // Success
            handleClose();
            loadBrands();
        } catch (err: any) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه الماركة؟')) return;

        try {
            await window.electronAPI.inventory.deleteBrand(id);
            loadBrands();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const handleDeleteRows = async (rows: Brand[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد من حذف هذه الماركة؟' : `هل أنت متأكد من حذف ${rows.length} ماركات؟`)) return;

        try {
            for (const row of rows) {
                await window.electronAPI.inventory.deleteBrand(row.id);
            }
            await loadBrands();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const filteredBrands = brands.filter(b =>
        b.name_ar?.toLowerCase().includes(search.toLowerCase()) ||
        b.name_en?.toLowerCase().includes(search.toLowerCase()) ||
        b.code?.toLowerCase().includes(search.toLowerCase())
    );

    const columns = React.useMemo<DefinitionListColumn<Brand>[]>(() => [
        {
            key: 'name_ar',
            label: 'الماركة',
            width: 260,
            defaultVisible: true,
            getSearchValue: (brand) => `${brand.name_ar || ''} ${brand.name_en || ''}`,
            renderCell: (brand) => (
                <div className="flex items-center gap-3">
                    {(brand as any).image_url ? (
                        <img src={(brand as any).image_url} alt={brand.name_ar} className="h-10 w-10 rounded-lg border border-gray-200 bg-white object-cover" />
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 font-bold text-purple-600">
                            {brand.name_ar?.charAt(0) || '#'}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-800">{brand.name_ar}</div>
                        <div className="truncate text-xs text-slate-400">{brand.name_en || '-'}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'name_en',
            label: 'الاسم الإنجليزي',
            width: 200,
            defaultVisible: true,
            getDisplayValue: (brand) => brand.name_en || '-',
        },
        {
            key: 'code',
            label: 'الرمز',
            width: 120,
            defaultVisible: true,
            getDisplayValue: (brand) => brand.code || '-',
            renderCell: (brand) => brand.code ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">{brand.code}</span>
            ) : '-',
        },
        {
            key: 'origin_country',
            label: 'بلد المنشأ',
            width: 160,
            defaultVisible: true,
            getDisplayValue: (brand) => brand.origin_country || '-',
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 140,
            defaultVisible: true,
            getValue: (brand) => (brand.is_active ? 1 : 0),
            renderCell: (brand) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${brand.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {brand.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                    {brand.is_active ? 'فعال' : 'غير فعال'}
                </span>
            ),
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
            renderCell: (brand) => (
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => handleEdit(brand)}
                        className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                        title="تعديل"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={() => handleDelete(brand.id)}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                        title="حذف"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [brands]);

    return (
        <div className="app-page" dir="rtl">
            {/* Header */}
            <WorkspaceHeader
                icon={<Tag size={22} />}
                title="إدارة الماركات"
                subtitle="تجهيز العلامات التجارية وربطها بالأصناف داخل نفس تجربة العمل الموحدة."
                badges={[
                    { label: `${brands.length} ماركات`, tone: 'info' },
                    { label: `${filteredBrands.length} مطابق`, tone: 'neutral' },
                ]}
                actions={(
                    <button
                        onClick={openCreate}
                        className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-purple-900/15 transition hover:brightness-105"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Plus size={16} />
                            <span>إضافة ماركة جديدة</span>
                        </span>
                    </button>
                )}
                className="mb-8"
            />

            <div className="hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <Tag size={24} />
                        </div>
                        إدارة الماركات
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">تعريف العلامات التجارية للأصناف</p>
                </div>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة ماركة جديدة
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    {error}
                    <button onClick={() => setError(null)} className="mr-auto hover:bg-red-100 p-1 rounded">
                        <X size={16} />
                    </button>
                </div>
            )}

            <DefinitionMasterList
                screenKey="definitions.brands"
                data={brands}
                loading={loading}
                columns={columns}
                rowKey={(brand) => String(brand.id)}
                searchPlaceholder="بحث عن ماركة..."
                emptyMessage="لا توجد ماركات مطابقة للمعايير الحالية"
                createLabel="إضافة ماركة جديدة"
                onCreate={openCreate}
                onEdit={handleEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadBrands}
            />

            {false && (
            <>
            {/* Search & Content */}
            <div className="card overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث عن ماركة..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        إجمالي الماركات: <span className="text-blue-600 font-bold">{brands.length}</span>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                        <p>جاري تحميل البيانات...</p>
                    </div>
                ) : (
                    /* Table */
                    <div className="overflow-x-auto">
                        <table className="dense-table w-full text-right">
                            <thead className="bg-[#f8fafc] text-gray-600 font-semibold text-sm uppercase tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-4">اسم الماركة (عربي)</th>
                                    <th className="px-6 py-4">اسم الماركة (EN)</th>
                                    <th className="px-6 py-4">الرمز</th>
                                    <th className="px-6 py-4">بلد المنشأ</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredBrands.length > 0 ? (
                                    brands.map((brand, index) => (
                                        <tr key={brand.id || `brand-${index}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                <div className="flex items-center gap-3">
                                                    {(brand as any).image_url ? (
                                                        <img src={(brand as any).image_url} alt={brand.name_ar} className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-100 shrink-0">
                                                            {brand.name_ar.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span>{brand.name_ar}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{brand.name_en || '-'}</td>
                                            <td className="px-6 py-4">
                                                {brand.code ? (
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">
                                                        {brand.code}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{brand.origin_country || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${brand.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {brand.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                                                    {brand.is_active ? 'فعال' : 'غير فعال'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(brand)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(brand.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-gray-50 p-4 rounded-full">
                                                    <Search size={32} className="text-gray-300" />
                                                </div>
                                                <p>لا توجد ماركات مطابقة للبحث</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            </>
            )}

            {/* Add/Edit Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {editingId ? <Edit className="text-blue-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                                {editingId ? 'تعديل ماركة' : 'إضافة ماركة جديدة'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم (عربي) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name_ar}
                                        onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-right"
                                        placeholder="مثال: سوني"
                                        dir="rtl"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم (English)</label>
                                    <input
                                        type="text"
                                        value={formData.name_en}
                                        onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="e.g. Sony"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الرمز (Code)</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value?.toUpperCase() })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono uppercase"
                                        placeholder="CODE"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">بلد المنشأ</label>
                                    <input
                                        type="text"
                                        value={formData.origin_country}
                                        onChange={e => setFormData({ ...formData, origin_country: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="مثال: اليابان"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">صورة الماركة</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.image_url}
                                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-left"
                                            placeholder="رابط URL أو قم برفع صورة..."
                                            dir="ltr"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-lg flex items-center gap-2 transition-colors shrink-0 font-medium"
                                        >
                                            <Upload size={18} />
                                            رفع صورة
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                    {formData.image_url && (
                                        <div className="mt-3 flex items-start gap-3">
                                            <img src={formData.image_url} alt="Preview" className="h-16 w-16 rounded-lg border border-gray-200 object-cover bg-white" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, image_url: '' });
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                                className="p-1.5 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all mt-1"
                                                title="إزالة الصورة"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">وصف / ملاحظات</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-20"
                                        placeholder="ملاحظات إضافية..."
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">فعال</span>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm shadow-blue-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
                                >
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    {editingId ? 'حفظ التعديلات' : 'إضافة الماركة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
