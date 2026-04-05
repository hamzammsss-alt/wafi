import React, { useState, useEffect } from 'react';
import {
    Banknote,
    Plus,
    Search,
    Trash2,
    Edit,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';

export const ExpenseTypes = () => {
    const [types, setTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name_ar: '',
        name_en: '',
        category: 'تشغيلي' // Default
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = (window as any).electronAPI;

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        try {
            setLoading(true);
            const data = await api.crudOperation({ operation: 'READ', table: 'expense_types' });
            setTypes(data);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل أنواع المصاريف');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (type: any) => {
        setFormData({
            name_ar: type.name_ar || type.name || '',
            name_en: type.name_en || '',
            category: type.category || 'تشغيلي'
        });
        setEditingId(type.id);
        setIsAdding(true);
    };

    const handleClose = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({
            name_ar: '',
            name_en: '',
            category: 'تشغيلي'
        });
        setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name_ar) {
            setError('اسم النوع مطلوب');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                name: formData.name_ar // Fallback for legacy 'name' column if needed
            };

            if (editingId) {
                await api.crudOperation({
                    operation: 'UPDATE',
                    table: 'expense_types',
                    data: payload,
                    id: editingId
                });
            } else {
                await api.crudOperation({
                    operation: 'CREATE',
                    table: 'expense_types',
                    data: payload
                });
            }

            handleClose();
            loadTypes();
        } catch (err: any) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا النوع؟')) return;

        try {
            await api.crudOperation({ operation: 'DELETE', table: 'expense_types', id });
            loadTypes();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const filteredTypes = types.filter(t =>
        (t.name_ar || t.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.name_en || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <Banknote size={24} />
                        </div>
                        أنواع المصاريف (Expense Types)
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">إدارة تصنيفات المصاريف الإدارية والتشغيلية</p>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة نوع جديد
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث باسم المصروف..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        الإجمالي: <span className="text-blue-600 font-bold">{filteredTypes.length}</span>
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
                        <table className="w-full text-right">
                            <thead className="bg-[#f8fafc] text-gray-600 font-semibold text-sm uppercase tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-4">الاسم (عربي)</th>
                                    <th className="px-6 py-4">الاسم (English)</th>
                                    <th className="px-6 py-4">التصنيف</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTypes.length > 0 ? (
                                    filteredTypes.map((type, index) => (
                                        <tr key={type.id || index} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                {type.name_ar || type.name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                                                {type.name_en || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${type.category === 'إداري'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {type.category || 'تشغيلي'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(type)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(type.id)}
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
                                        <td colSpan={4} className="py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-gray-50 p-4 rounded-full">
                                                    <Search size={32} className="text-gray-300" />
                                                </div>
                                                <p>لا توجد أنواع مصاريف مطابقة للبحث</p>
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
            {isAdding && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {editingId ? <Edit className="text-blue-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                                {editingId ? 'تعديل نوع مصروف' : 'إضافة نوع جديد'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم (عربي) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name_ar}
                                    onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-right"
                                    placeholder="مثال: كهرباء ومياه"
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
                                    placeholder="e.g. Electricity & Water"
                                    dir="ltr"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">التصنيف</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="تشغيلي">تشغيلي (Operational)</option>
                                    <option value="إداري">إداري (Administrative)</option>
                                    <option value="تسويقي">تسويقي (Marketing)</option>
                                    <option value="تمويلي">تمويلي (Financial)</option>
                                </select>
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
                                    {editingId ? 'حفظ التعديلات' : 'إضافة النوع'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
