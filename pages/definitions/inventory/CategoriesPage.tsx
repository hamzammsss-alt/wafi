import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Layers,
    Plus,
    Search,
    Trash2,
    Edit,
    Save,
    X,
    Folder,
    FolderOpen,
    Loader2,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';

interface Category {
    id: string;
    name_ar: string;
    name_en?: string;
    parent_id?: string;
    description?: string;
    code?: string;
    is_active?: number | boolean;
}

export const CategoriesPage = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Category>>({
        name_ar: '',
        name_en: '',
        parent_id: '',
        description: '',
        code: '',
        is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.inventory.getCategories();
            // Ensure is_active is treated as boolean for UI usually, or 0/1
            setCategories(data);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name_ar) {
            setError('اسم المجموعة (عربي) مطلوب');
            return;
        }

        try {
            setSaving(true);
            if (editingId) {
                await window.electronAPI.inventory.updateCategory({ ...formData, id: editingId });
            } else {
                await window.electronAPI.inventory.createCategory(formData);
            }

            // Success
            setIsAdding(false);
            setEditingId(null);
            setFormData({ name_ar: '', name_en: '', parent_id: '', description: '', code: '', is_active: true });
            loadCategories();
        } catch (err: any) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟ قد تؤثر على الأصناف المرتبطة بها.')) return;

        try {
            await window.electronAPI.inventory.deleteCategory(id);
            loadCategories();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const handleEdit = (cat: Category) => {
        setFormData({
            name_ar: cat.name_ar,
            name_en: cat.name_en,
            parent_id: cat.parent_id || '',
            description: cat.description,
            code: cat.code || '',
            is_active: cat.is_active === 1 || cat.is_active === true
        });
        setEditingId(cat.id);
        setIsAdding(true);
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({ name_ar: '', name_en: '', parent_id: '', description: '', code: '', is_active: true });
        setError(null);
        setIsAdding(true);
    };

    useCreateIntent(openCreate);

    const filteredCategories = categories.filter(c =>
        c.name_ar?.toLowerCase().includes(search.toLowerCase()) ||
        c.name_en?.toLowerCase().includes(search.toLowerCase()) ||
        c.code?.toLowerCase().includes(search.toLowerCase())
    );

    // Helper to get parent name
    const getParentName = (parentId?: string) => {
        if (!parentId) return null;
        return categories.find(c => c.id === parentId)?.name_ar;
    };

    return (
        <div className="app-page" dir="rtl">
            {/* Header */}
            <WorkspaceHeader
                icon={<Layers size={22} />}
                title="مجموعات الأصناف"
                subtitle="تصنيف الأصناف في مجموعات وعائلات لتسهيل الإدارة والتقارير."
                badges={[
                    { label: `${categories.length} مجموعات`, tone: 'info' },
                    { label: `${filteredCategories.length} مطابق`, tone: 'neutral' },
                ]}
                actions={(
                    <button
                        onClick={openCreate}
                        className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/15 transition hover:brightness-105"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Plus size={16} />
                            <span>إضافة مجموعة جديدة</span>
                        </span>
                    </button>
                )}
                className="mb-8"
            />

            <div className="hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
                            <Layers size={24} />
                        </div>
                        مجموعات الأصناف
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">تصنيف الأصناف في مجموعات وعائلات لتسهيل الإدارة والتقارير</p>
                </div>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة مجموعة جديدة
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

            {/* Search & Content */}
            <div className="card overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث عن مجموعة (الاسم، الرمز)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        إجمالي المجموعات: <span className="text-teal-600 font-bold">{categories.length}</span>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-teal-500" />
                        <p>جاري تحميل البيانات...</p>
                    </div>
                ) : (
                    /* Table */
                    <div className="overflow-x-auto">
                        <table className="dense-table w-full text-right">
                            <thead className="bg-[#f8fafc] text-gray-600 font-semibold text-sm uppercase tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-4">اسم المجموعة</th>
                                    <th className="px-6 py-4">الرمز</th>
                                    <th className="px-6 py-4">تتبع لـ (الأب)</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4">ملاحظات</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCategories.length > 0 ? (
                                    filteredCategories.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-teal-50/30 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800 flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${cat.parent_id ? 'bg-gray-100 text-gray-500' : 'bg-teal-50 text-teal-600'}`}>
                                                    {cat.parent_id ? <Folder size={18} /> : <FolderOpen size={18} />}
                                                </div>
                                                <div>
                                                    <div>{cat.name_ar}</div>
                                                    <div className="text-xs text-gray-400">{cat.name_en}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {cat.code ? (
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">
                                                        {cat.code}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {cat.parent_id ? (
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit">
                                                        <Layers size={12} />
                                                        {getParentName(cat.parent_id)}
                                                    </span>
                                                ) : <span className="text-gray-400 text-xs">- رئيسي -</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {cat.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                                                    {cat.is_active ? 'فعال' : 'غير فعال'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate">
                                                {cat.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(cat)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
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
                                                <p>لا توجد مجموعات أصناف</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isAdding && createPortal(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" dir="rtl">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {editingId ? <Edit className="text-teal-600" size={20} /> : <Plus className="text-teal-600" size={20} />}
                                {editingId ? 'تعديل المجموعة' : 'إضافة مجموعة جديدة'}
                            </h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم المجموعة (عربي) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name_ar}
                                    onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all placeholder:text-right"
                                    placeholder="مثال: إلكترونيات"
                                    dir="rtl"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم (English)</label>
                                    <input
                                        type="text"
                                        value={formData.name_en}
                                        onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                        placeholder="e.g. Electronics"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الرمز</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value?.toUpperCase() })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-mono uppercase text-center"
                                        placeholder="CODE"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">تتبع لـ (المجموعة الأب)</label>
                                <select
                                    value={formData.parent_id}
                                    onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                >
                                    <option value="">-- رئيسي (بدون أب) --</option>
                                    {categories
                                        .filter(c => c.id !== editingId) // Prevent self-parenting
                                        .map(c => (
                                            <option key={c.id} value={c.id}>{c.name_ar}</option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all h-20 resize-none"
                                    placeholder="وصف تفصيلي للمجموعة..."
                                />
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">فعال</span>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-sm shadow-teal-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
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


