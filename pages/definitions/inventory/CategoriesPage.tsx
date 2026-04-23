import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertCircle,
    CheckCircle2,
    Edit,
    Folder,
    FolderOpen,
    Layers,
    Loader2,
    Plus,
    Search,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

interface Category {
    id: string;
    name_ar: string;
    name_en?: string;
    parent_id?: string;
    description?: string;
    code?: string;
    is_active?: number | boolean;
    image_url?: string;
}

const emptyForm: Partial<Category> = {
    name_ar: '',
    name_en: '',
    parent_id: '',
    description: '',
    code: '',
    is_active: true,
    image_url: '',
};

export const CategoriesPage = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Category>>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        void loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.inventory.getCategories();
            setCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل مجموعات الأصناف.');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData(emptyForm);
        setError(null);
        setIsAdding(true);
    };

    const closeModal = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData(emptyForm);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    useCreateIntent(openCreate);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!String(formData.name_ar || '').trim()) {
            setError('اسم المجموعة بالعربية مطلوب.');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                is_active: formData.is_active ? 1 : 0,
            };

            if (editingId) {
                await window.electronAPI.inventory.updateCategory({ ...payload, id: editingId });
            } else {
                await window.electronAPI.inventory.createCategory(payload);
            }

            closeModal();
            await loadCategories();
        } catch (err) {
            console.error(err);
            setError('حدث خطأ أثناء حفظ المجموعة.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟ قد يؤثر ذلك على الأصناف المرتبطة بها.')) return;

        try {
            await window.electronAPI.inventory.deleteCategory(id);
            await loadCategories();
        } catch (err) {
            console.error(err);
            setError('تعذر حذف المجموعة.');
        }
    };

    const handleEdit = (category: Category) => {
        setEditingId(category.id);
        setFormData({
            name_ar: category.name_ar,
            name_en: category.name_en || '',
            parent_id: category.parent_id || '',
            description: category.description || '',
            code: category.code || '',
            is_active: category.is_active === 1 || category.is_active === true,
            image_url: category.image_url || '',
        });
        setError(null);
        setIsAdding(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (window.electronAPI?.system?.saveImage) {
                const buffer = await file.arrayBuffer();
                const result = await window.electronAPI.system.saveImage(buffer, file.name);
                if (!result?.success) throw new Error('saveImage failed');
                setFormData((prev) => ({ ...prev, image_url: result.path }));
            } else {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFormData((prev) => ({ ...prev, image_url: reader.result as string }));
                };
                reader.readAsDataURL(file);
            }
        } catch (err) {
            console.error(err);
            setError('حدث خطأ أثناء رفع الصورة.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const filteredCategories = categories.filter((category) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;

        return (
            String(category.name_ar || '').toLowerCase().includes(query) ||
            String(category.name_en || '').toLowerCase().includes(query) ||
            String(category.code || '').toLowerCase().includes(query)
        );
    });

    const getParentName = (parentId?: string) => {
        if (!parentId) return 'رئيسية';
        return categories.find((item) => item.id === parentId)?.name_ar || 'غير محدد';
    };

    const handleDeleteRows = async (rows: Category[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد من حذف هذه المجموعة؟' : `هل أنت متأكد من حذف ${rows.length} مجموعات؟`)) return;

        try {
            for (const row of rows) {
                await window.electronAPI.inventory.deleteCategory(row.id);
            }
            await loadCategories();
        } catch (err) {
            console.error(err);
            setError('تعذر حذف المجموعات المحددة.');
        }
    };

    const columns = React.useMemo<DefinitionListColumn<Category>[]>(() => [
        {
            key: 'name_ar',
            label: 'المجموعة',
            width: 280,
            defaultVisible: true,
            getSearchValue: (category) => `${category.name_ar || ''} ${category.name_en || ''}`,
            renderCell: (category) => (
                <div className="flex items-center gap-3">
                    {category.image_url ? (
                        <img src={category.image_url} alt={category.name_ar} className="h-10 w-10 rounded-xl border border-slate-200 object-cover" />
                    ) : (
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${category.parent_id ? 'bg-slate-100 text-slate-500' : 'bg-sky-100 text-sky-700'}`}>
                            {category.parent_id ? <Folder size={18} /> : <FolderOpen size={18} />}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-800">{category.name_ar}</div>
                        <div className="truncate text-xs text-slate-400">{category.name_en || '-'}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'code',
            label: 'الرمز',
            width: 120,
            defaultVisible: true,
            getDisplayValue: (category) => category.code || '-',
            renderCell: (category) => category.code ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">{category.code}</span>
            ) : '-',
        },
        {
            key: 'parent_id',
            label: 'المجموعة الأب',
            width: 190,
            defaultVisible: true,
            getDisplayValue: (category) => getParentName(category.parent_id),
            renderCell: (category) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    <Layers size={12} />
                    {getParentName(category.parent_id)}
                </span>
            ),
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 140,
            defaultVisible: true,
            getValue: (category) => (category.is_active ? 1 : 0),
            renderCell: (category) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${category.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {category.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                    {category.is_active ? 'فعال' : 'غير فعال'}
                </span>
            ),
        },
        {
            key: 'description',
            label: 'الوصف',
            width: 240,
            defaultVisible: true,
            getDisplayValue: (category) => category.description || '-',
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
            renderCell: (category) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(category)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="تعديل">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(category.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [categories]);

    return (
        <div className="app-page" dir="rtl">
            <WorkspaceHeader
                icon={<Layers size={22} />}
                title="مجموعات الأصناف"
                subtitle="عرض جدولي منظم بنفس أسلوب شاشة الأصناف."
                badges={[
                    { label: `${categories.length} مجموعة`, tone: 'info' },
                    { label: `${categories.filter((category) => !category.parent_id).length} رئيسية`, tone: 'neutral' },
                ]}
                actions={(
                    <button
                        onClick={openCreate}
                        className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-sky-900/15 transition hover:brightness-105"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Plus size={16} />
                            <span>إضافة مجموعة</span>
                        </span>
                    </button>
                )}
                className="mb-6"
            />

            {error && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="mr-auto rounded-md p-1 hover:bg-rose-100">
                        <X size={16} />
                    </button>
                </div>
            )}

            <DefinitionMasterList
                screenKey="definitions.categories"
                data={categories}
                loading={loading}
                columns={columns}
                rowKey={(category) => String(category.id)}
                searchPlaceholder="بحث سريع في مجموعات الأصناف"
                emptyMessage="لا توجد مجموعات أصناف مطابقة"
                createLabel="إضافة مجموعة"
                onCreate={openCreate}
                onEdit={handleEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadCategories}
            />

            {false && (
            <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[280px] flex-1">
                    <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث سريع في مجموعات الأصناف"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                    إجمالي المجموعات: <span className="text-slate-900">{categories.length}</span>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                    المعروض: <span>{filteredCategories.length}</span>
                </div>
            </div>

            {search.trim() && (
                <div className="mb-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800"
                    >
                        بحث: {search} ×
                    </button>
                </div>
            )}

            <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-gradient-to-l from-sky-50 to-blue-50 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900">قائمة مجموعات الأصناف</h2>
                    <p className="text-sm text-slate-600">
                        عدد السجلات الحالية: <span className="font-semibold">{filteredCategories.length}</span>
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-14 text-slate-400">
                        <Loader2 size={36} className="mb-3 animate-spin text-sky-500" />
                        <p>جاري تحميل البيانات...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-0 text-right text-[13px] text-slate-700">
                            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                                <tr>
                                    <th className="min-w-[260px] border-b border-l border-slate-200 bg-slate-50 p-3">المجموعة</th>
                                    <th className="min-w-[120px] border-b border-l border-slate-200 bg-slate-50 p-3">الرمز</th>
                                    <th className="min-w-[170px] border-b border-l border-slate-200 bg-slate-50 p-3">المجموعة الأب</th>
                                    <th className="min-w-[120px] border-b border-l border-slate-200 bg-slate-50 p-3">الحالة</th>
                                    <th className="min-w-[220px] border-b border-l border-slate-200 bg-slate-50 p-3">الوصف</th>
                                    <th className="w-[120px] border-b border-slate-200 bg-slate-50 p-3 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.length > 0 ? (
                                    filteredCategories.map((category) => (
                                        <tr key={category.id} className="group">
                                            <td className="border-b border-l border-slate-200 bg-white p-3 align-middle transition group-hover:bg-sky-50/40">
                                                <div className="flex items-center gap-3">
                                                    {category.image_url ? (
                                                        <img
                                                            src={category.image_url}
                                                            alt={category.name_ar}
                                                            className="h-10 w-10 rounded-xl border border-slate-200 object-cover"
                                                        />
                                                    ) : (
                                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${category.parent_id ? 'bg-slate-100 text-slate-500' : 'bg-sky-100 text-sky-700'}`}>
                                                            {category.parent_id ? <Folder size={18} /> : <FolderOpen size={18} />}
                                                        </div>
                                                    )}

                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-bold text-slate-800">{category.name_ar}</div>
                                                        <div className="truncate text-xs text-slate-400">{category.name_en || '-'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="border-b border-l border-slate-200 bg-white p-3 align-middle transition group-hover:bg-sky-50/40">
                                                {category.code ? (
                                                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">
                                                        {category.code}
                                                    </span>
                                                ) : '-'}
                                            </td>

                                            <td className="border-b border-l border-slate-200 bg-white p-3 align-middle transition group-hover:bg-sky-50/40">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                    <Layers size={12} />
                                                    {getParentName(category.parent_id)}
                                                </span>
                                            </td>

                                            <td className="border-b border-l border-slate-200 bg-white p-3 align-middle transition group-hover:bg-sky-50/40">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${category.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {category.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                                                    {category.is_active ? 'فعال' : 'غير فعال'}
                                                </span>
                                            </td>

                                            <td className="border-b border-l border-slate-200 bg-white p-3 align-middle text-sm text-slate-500 transition group-hover:bg-sky-50/40">
                                                <div className="max-w-xs truncate">{category.description || '-'}</div>
                                            </td>

                                            <td className="border-b border-slate-200 bg-white p-3 align-middle transition group-hover:bg-sky-50/40">
                                                <div className="flex justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        onClick={() => handleEdit(category)}
                                                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                                        title="تعديل"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(category.id)}
                                                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="border-b border-slate-200 bg-white py-16 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="rounded-full bg-slate-50 p-4">
                                                    <Search size={28} className="text-slate-300" />
                                                </div>
                                                <p>لا توجد مجموعات أصناف مطابقة.</p>
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

            {isAdding && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" dir="rtl">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                {editingId ? <Edit className="text-sky-600" size={20} /> : <Plus className="text-sky-600" size={20} />}
                                {editingId ? 'تعديل المجموعة' : 'إضافة مجموعة جديدة'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 transition-colors hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 p-6">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    اسم المجموعة (عربي) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name_ar || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, name_ar: e.target.value }))}
                                    className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="مثال: إلكترونيات"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم بالإنجليزية</label>
                                    <input
                                        type="text"
                                        value={formData.name_en || ''}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, name_en: e.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                        dir="ltr"
                                    />
                                </div>

                                <div className="w-1/3">
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الرمز</label>
                                    <input
                                        type="text"
                                        value={formData.code || ''}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        className="w-full rounded-lg border px-3 py-2 text-center font-mono uppercase outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">المجموعة الأب</label>
                                    <select
                                        value={formData.parent_id || ''}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, parent_id: e.target.value }))}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                    >
                                        <option value="">رئيسية</option>
                                        {categories
                                            .filter((item) => item.id !== editingId)
                                            .map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name_ar}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="flex-1">
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">صورة المجموعة</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.image_url || ''}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                                            className="flex-1 rounded-lg border px-3 py-2 text-left outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                            dir="ltr"
                                            placeholder="URL"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700 hover:bg-gray-200"
                                        >
                                            <Upload size={18} />
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">الوصف</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                    className="h-20 w-full resize-none rounded-lg border px-3 py-2 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                />
                            </div>

                            <div className="pt-1">
                                <label className="flex cursor-pointer items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={!!formData.is_active}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">المجموعة فعالة</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-700 disabled:opacity-70"
                                >
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
