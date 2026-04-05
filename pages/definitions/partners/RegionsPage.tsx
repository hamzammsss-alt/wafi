import React, { useState, useEffect } from 'react';
import {
    Map,
    Plus,
    Search,
    Trash2,
    Edit,
    Save,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    MapPin
} from 'lucide-react';
import { Region } from '../../../types';

export const RegionsPage = () => {
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name_ar: '',
        name_en: '',
        code: '',
        parent_id: '',
        is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRegions();
    }, []);

    const loadRegions = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.partner.getRegions();
            setRegions(data);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل المناطق');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (region: Region) => {
        setFormData({
            name_ar: region.name_ar,
            name_en: region.name_en || '',
            code: region.code || '',
            parent_id: region.parent_id || '',
            is_active: region.is_active ? true : false
        });
        setEditingId(region.id);
        setIsAdding(true);
    };

    const handleClose = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({
            name_ar: '',
            name_en: '',
            code: '',
            parent_id: '',
            is_active: true
        });
        setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name_ar) {
            setError('اسم المنطقة (عربي) مطلوب');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                is_active: formData.is_active ? 1 : 0
            };

            if (editingId) {
                await window.electronAPI.partner.updateRegion({ id: editingId, ...payload });
            } else {
                await window.electronAPI.partner.createRegion(payload);
            }

            // Success
            handleClose();
            loadRegions();
        } catch (err: any) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه المنطقة؟')) return;

        try {
            await window.electronAPI.partner.deleteRegion(id);
            loadRegions();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const filteredRegions = regions.filter(r =>
        r.name_ar?.toLowerCase().includes(search.toLowerCase()) ||
        r.name_en?.toLowerCase().includes(search.toLowerCase()) ||
        r.code?.toLowerCase().includes(search.toLowerCase())
    );

    // Get Parent Name Helper
    const getParentName = (parentId?: string) => {
        if (!parentId) return '-';
        const parent = regions.find(r => r.id === parentId);
        return parent ? parent.name_ar : '-';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
                            <Map size={24} />
                        </div>
                        إدارة المناطق
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">تعريف المناطق الجغرافية للتوزيع والمبيعات</p>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة منطقة جديدة
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
                            placeholder="بحث عن منطقة..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        الإجمالي: <span className="text-blue-600 font-bold">{regions.length}</span>
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
                                    <th className="px-6 py-4">اسم المنطقة (عربي)</th>
                                    <th className="px-6 py-4">اسم المنطقة (EN)</th>
                                    <th className="px-6 py-4">الرمز</th>
                                    <th className="px-6 py-4">المنطقة الأم</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRegions.length > 0 ? (
                                    regions.map((region, index) => (
                                        <tr key={region.id || `region-${index}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800">{region.name_ar}</td>
                                            <td className="px-6 py-4 text-gray-600">{region.name_en || '-'}</td>
                                            <td className="px-6 py-4">
                                                {region.code ? (
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">
                                                        {region.code}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {region.parent_id ? (
                                                    <span className="flex items-center gap-1 text-sm bg-gray-50 px-2 py-1 rounded">
                                                        <MapPin size={12} />
                                                        {getParentName(region.parent_id)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${region.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {region.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                                                    {region.is_active ? 'فعال' : 'غير فعال'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(region)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(region.id)}
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
                                                <p>لا توجد مناطق مطابقة للبحث</p>
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
                                {editingId ? 'تعديل منطقة' : 'إضافة منطقة جديدة'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم (عربي) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name_ar}
                                        onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-right"
                                        placeholder="مثال: المنطقة الوسطى"
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
                                        placeholder="e.g. Central Region"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الرمز (Code)</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value?.toUpperCase() })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono uppercase"
                                        placeholder="R-01"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">المنطقة الأم</label>
                                    <select
                                        value={formData.parent_id}
                                        onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                                    >
                                        <option value="">(لا يوجد)</option>
                                        {regions
                                            .filter(r => r.id !== editingId) // Prevent selecting self as parent
                                            .map(r => (
                                                <option key={r.id} value={r.id}>{r.name_ar}</option>
                                            ))
                                        }
                                    </select>
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
                                    {editingId ? 'حفظ التعديلات' : 'إضافة المنطقة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
