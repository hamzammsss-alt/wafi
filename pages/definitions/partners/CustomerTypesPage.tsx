import React, { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Search,
    Trash2,
    Edit,
    Save,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Percent
} from 'lucide-react';
import { CustomerType } from '../../../types';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

export const CustomerTypesPage = () => {
    const [types, setTypes] = useState<CustomerType[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<any>(null); // Id can be string or number

    // Form State
    const [formData, setFormData] = useState({
        name_ar: '',
        name_en: '',
        code: '',
        discount: 0,
        description: '',
        is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.partner.getCustomerTypes();
            setTypes(data);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل تصنيفات العملاء');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (type: CustomerType) => {
        setFormData({
            name_ar: type.name_ar,
            name_en: type.name_en || '',
            code: type.code || '',
            discount: type.discount || 0,
            description: type.description || '',
            is_active: type.is_active ? true : false
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
            code: '',
            discount: 0,
            description: '',
            is_active: true
        });
        setError(null);
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
            setError('الاسم (عربي) مطلوب');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                is_active: formData.is_active ? 1 : 0
            };

            if (editingId) {
                await window.electronAPI.partner.saveCustomerType({ id: editingId, ...payload });
            } else {
                await window.electronAPI.partner.saveCustomerType(payload);
            }

            // Success
            handleClose();
            loadTypes();
        } catch (err: any) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: any) => {
        if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;

        try {
            await window.electronAPI.partner.deleteCustomerType(id);
            loadTypes();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const filteredTypes = types.filter(t =>
        t.name_ar?.toLowerCase().includes(search.toLowerCase()) ||
        t.name_en?.toLowerCase().includes(search.toLowerCase()) ||
        t.code?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDeleteRows = async (rows: CustomerType[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد من حذف هذا التصنيف؟' : `هل أنت متأكد من حذف ${rows.length} تصنيفات؟`)) return;

        try {
            for (const row of rows) {
                await window.electronAPI.partner.deleteCustomerType(row.id);
            }
            await loadTypes();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const columns = React.useMemo<DefinitionListColumn<CustomerType>[]>(() => [
        {
            key: 'name_ar',
            label: 'اسم التصنيف',
            width: 240,
            defaultVisible: true,
            getSearchValue: (type) => `${type.name_ar || ''} ${type.name_en || ''} ${type.code || ''}`,
            renderCell: (type) => (
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-800">{type.name_ar || '-'}</div>
                    <div className="truncate text-xs text-slate-400">{type.name_en || '-'}</div>
                </div>
            ),
        },
        {
            key: 'code',
            label: 'الرمز',
            width: 120,
            defaultVisible: true,
            getDisplayValue: (type) => type.code || '-',
            renderCell: (type) => type.code ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">{type.code}</span>
            ) : '-',
        },
        {
            key: 'discount',
            label: 'نسبة الخصم',
            type: 'number',
            filterType: 'number',
            width: 140,
            defaultVisible: true,
            getValue: (type) => Number(type.discount || 0),
            getDisplayValue: (type) => type.discount ? `${type.discount}%` : '-',
            renderCell: (type) => (
                <span className="font-semibold text-emerald-700">
                    {type.discount ? `${type.discount}%` : '-'}
                </span>
            ),
        },
        {
            key: 'description',
            label: 'ملاحظات',
            width: 260,
            defaultVisible: true,
            getDisplayValue: (type) => type.description || '-',
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 140,
            defaultVisible: true,
            getValue: (type) => (type.is_active ? 1 : 0),
            renderCell: (type) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${type.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {type.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                    {type.is_active ? 'فعال' : 'غير فعال'}
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
            renderCell: (type) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(type)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="تعديل">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(type.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [types]);

    return (
        <div className="app-page" dir="rtl">
                        {/* Header */}
            <div className="hidden flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Users size={24} />
                        </div>
                        تصنيفات العملاء
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">إدارة فئات العملاء ونسب الخصم</p>
                </div>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة تصنيف جديد
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
                headerIcon={<Users size={24} />}
                headerTitle="تصنيفات العملاء"
                headerSubtitle="إدارة فئات العملاء ونسب الخصم"
                headerBadges={[
                    { label: `الإجمالي ${types.length}`, tone: 'warning' },
                    { label: `المعروض ${filteredTypes.length}`, tone: 'info' },
                ]}

                screenKey="definitions.customer-types"
                data={types}
                loading={loading}
                columns={columns}
                rowKey={(type) => String(type.id)}
                searchPlaceholder="بحث عن تصنيف عميل..."
                emptyMessage="لا توجد تصنيفات عملاء مطابقة للمعايير الحالية"
                createLabel="إضافة تصنيف جديد"
                onCreate={openCreate}
                onEdit={handleEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadTypes}
                defaultSort={{ key: 'name_ar', direction: 'asc' }}
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
                            placeholder="بحث عن تصنيف..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        الإجمالي: <span className="text-blue-600 font-bold">{types.length}</span>
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
                                    <th className="px-6 py-4">اسم التصنيف</th>
                                    <th className="px-6 py-4">الرمز</th>
                                    <th className="px-6 py-4">نسبة الخصم</th>
                                    <th className="px-6 py-4">ملاحظات</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTypes.length > 0 ? (
                                    types.map((type, index) => (
                                        <tr key={type.id || `type-${index}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800">{type.name_ar}</td>
                                            <td className="px-6 py-4">
                                                {type.code ? (
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">
                                                        {type.code}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-green-600">
                                                {type.discount ? `${type.discount}%` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{type.description || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${type.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {type.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                                                    {type.is_active ? 'فعال' : 'غير فعال'}
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
                                        <td colSpan={6} className="py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-gray-50 p-4 rounded-full">
                                                    <Search size={32} className="text-gray-300" />
                                                </div>
                                                <p>لا توجد تصنيفات مطابقة للبحث</p>
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
                                {editingId ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}
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
                                        placeholder="مثال: جملة"
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
                                        placeholder="e.g. Wholesale"
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
                                        placeholder="CODE"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">نسبة الخصم %</label>
                                    <div className="relative">
                                        <Percent className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        <input
                                            type="number"
                                            value={formData.discount}
                                            onChange={e => setFormData({ ...formData, discount: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="0"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-20"
                                    placeholder="ملاحظات إضافية..."
                                />
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
                                    {editingId ? 'حفظ التعديلات' : 'إضافة التصنيف'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

