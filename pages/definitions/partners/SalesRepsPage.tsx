import React, { useState, useEffect } from 'react';
import {
    Briefcase,
    Plus,
    Search,
    Trash2,
    Edit,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Phone,
    Target
} from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { SalesRep } from '../../../types'; // Assuming type exists or we define it locally
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

export const SalesRepsPage = () => {
    const [reps, setReps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name_ar: '',
        phone: '',
        commission_rate: 0,
        target_amount: 0,
        is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadReps();
    }, []);

    const loadReps = async () => {
        try {
            setLoading(true);
            // CORRECTION: Use partner namespace instead of inventory
            const data = await window.electronAPI.partner.getSalesReps();
            setReps(data);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل مندوبي المبيعات');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (rep: any) => {
        setFormData({
            name_ar: rep.name_ar,
            phone: rep.phone || '',
            commission_rate: rep.commission_rate || 0,
            target_amount: rep.target_amount || 0,
            is_active: rep.is_active ? true : false
        });
        setEditingId(rep.id);
        setIsAdding(true);
    };

    const handleClose = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({
            name_ar: '',
            phone: '',
            commission_rate: 0,
            target_amount: 0,
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
            setError('اسم المندوب مطلوب');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                is_active: formData.is_active ? 1 : 0
            };

            if (editingId) {
                await window.electronAPI.partner.saveSalesRep({ id: editingId, ...payload });
            } else {
                await window.electronAPI.partner.saveSalesRep(payload);
            }

            // Success
            handleClose();
            loadReps();
        } catch (err: any) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المندوب؟')) return;

        try {
            await window.electronAPI.partner.deleteSalesRep(id);
            loadReps();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const filteredReps = reps.filter(r =>
        r.name_ar?.toLowerCase().includes(search.toLowerCase()) ||
        r.phone?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDeleteRows = async (rows: any[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد من حذف هذا المندوب؟' : `هل أنت متأكد من حذف ${rows.length} مندوبين؟`)) return;

        try {
            for (const row of rows) {
                await window.electronAPI.partner.deleteSalesRep(row.id);
            }
            await loadReps();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const columns = React.useMemo<DefinitionListColumn<any>[]>(() => [
        {
            key: 'name_ar',
            label: 'اسم المندوب',
            width: 240,
            defaultVisible: true,
            renderCell: (rep) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
                        {rep.name_ar?.charAt(0) || '#'}
                    </div>
                    <span className="font-medium text-slate-800">{rep.name_ar}</span>
                </div>
            ),
        },
        {
            key: 'phone',
            label: 'الهاتف',
            width: 160,
            defaultVisible: true,
            getDisplayValue: (rep) => rep.phone || '-',
        },
        {
            key: 'commission_rate',
            label: 'نسبة العمولة',
            type: 'number',
            filterType: 'number',
            width: 140,
            defaultVisible: true,
            getValue: (rep) => Number(rep.commission_rate || 0),
            getDisplayValue: (rep) => rep.commission_rate ? `${rep.commission_rate}%` : '-',
        },
        {
            key: 'target_amount',
            label: 'الهدف البيعي',
            type: 'number',
            filterType: 'number',
            width: 160,
            defaultVisible: true,
            getValue: (rep) => Number(rep.target_amount || 0),
            getDisplayValue: (rep) => rep.target_amount ? Number(rep.target_amount).toLocaleString('en-US') : '-',
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 140,
            defaultVisible: true,
            getValue: (rep) => (rep.is_active ? 1 : 0),
            renderCell: (rep) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${rep.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {rep.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                    {rep.is_active ? 'فعال' : 'غير فعال'}
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
            renderCell: (rep) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(rep)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="تعديل">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(rep.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [reps]);

    return (
        <div className="app-page" dir="rtl">
            {/* Header */}
            <WorkspaceHeader
                icon={<Briefcase size={22} />}
                title="مندوبي المبيعات"
                subtitle="إدارة فريق المبيعات والعمولات والأهداف بنفس أسلوب الشاشات المرجعية الموحد."
                badges={[
                    { label: `${reps.length} مندوبين`, tone: 'info' },
                    { label: `${reps.filter((rep) => rep.is_active).length} نشط`, tone: 'neutral' },
                ]}
                actions={(
                    <button
                        onClick={openCreate}
                        className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-900/15 transition hover:brightness-105"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Plus size={16} />
                            <span>إضافة مندوب جديد</span>
                        </span>
                    </button>
                )}
                className="mb-8"
            />

            <div className="hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <Briefcase size={24} />
                        </div>
                        مندوبي المبيعات
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">إدارة فريق المبيعات والعمولات</p>
                </div>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة مندوب جديد
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
                screenKey="definitions.sales-reps"
                data={reps}
                loading={loading}
                columns={columns}
                rowKey={(rep) => String(rep.id)}
                searchPlaceholder="بحث عن مندوب..."
                emptyMessage="لا يوجد مندوبون مطابقون للمعايير الحالية"
                createLabel="إضافة مندوب جديد"
                onCreate={openCreate}
                onEdit={handleEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadReps}
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
                            placeholder="بحث عن مندوب..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        الإجمالي: <span className="text-blue-600 font-bold">{reps.length}</span>
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
                                    <th className="px-6 py-4">اسم المندوب</th>
                                    <th className="px-6 py-4">الهاتف</th>
                                    <th className="px-6 py-4">نسبة العمولة</th>
                                    <th className="px-6 py-4">الهدف البيعي</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredReps.length > 0 ? (
                                    filteredReps.map((rep, index) => (
                                        <tr key={rep.id || `rep-${index}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                                                    {rep.name_ar?.charAt(0)}
                                                </div>
                                                {rep.name_ar}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{rep.phone || '-'}</td>
                                            <td className="px-6 py-4 font-medium text-blue-600">
                                                {rep.commission_rate ? `${rep.commission_rate}%` : '-'}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-600">
                                                {rep.target_amount ? Number(rep.target_amount).toLocaleString() : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${rep.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {rep.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                                                    {rep.is_active ? 'فعال' : 'غير فعال'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(rep)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rep.id)}
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
                                                <p>لا يوجد مندوبين مطابقين للبحث</p>
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
                                {editingId ? 'تعديل بيانات المندوب' : 'إضافة مندوب جديد'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name_ar}
                                        onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-right"
                                        placeholder="مثال: أحمد محمد"
                                        dir="rtl"
                                        autoFocus
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
                                    <div className="relative">
                                        <Phone className="absolute right-3 top-2.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="05xxxxxxxx"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">نسبة العمولة (%)</label>
                                    <input
                                        type="number"
                                        value={formData.commission_rate}
                                        onChange={e => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الهدف البيعي (Target)</label>
                                    <div className="relative">
                                        <Target className="absolute right-3 top-2.5 text-gray-400" size={18} />
                                        <input
                                            type="number"
                                            value={formData.target_amount}
                                            onChange={e => setFormData({ ...formData, target_amount: parseFloat(e.target.value) })}
                                            className="w-full pr-10 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="0"
                                        />
                                    </div>
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
                                    {editingId ? 'حفظ التعديلات' : 'إضافة المندوب'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

