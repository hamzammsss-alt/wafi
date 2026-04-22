import React, { useState, useEffect } from 'react';
import {
    Percent,
    Plus,
    Search,
    Trash2,
    Edit,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    DollarSign,
    Hash
} from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

export const Taxes = () => {
    const [taxes, setTaxes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name_ar: '',
        name_en: '',
        rate: 0,
        amount: 0,
        is_fixed: 0, // 0: Percentage, 1: Fixed
        type: 'إضافة' // or 'خصم'
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = (window as any).electronAPI;

    useEffect(() => {
        loadTaxes();
    }, []);

    const loadTaxes = async () => {
        try {
            setLoading(true);
            const data = await api.crudOperation({ operation: 'READ', table: 'taxes' });
            setTaxes(data);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (tax: any) => {
        setFormData({
            name_ar: tax.name_ar || '',
            name_en: tax.name_en || '',
            rate: tax.rate || 0,
            amount: tax.amount || 0,
            is_fixed: tax.is_fixed || 0,
            type: tax.type || 'إضافة'
        });
        setEditingId(tax.id);
        setIsAdding(true);
    };

    const handleClose = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({
            name_ar: '',
            name_en: '',
            rate: 0,
            amount: 0,
            is_fixed: 0,
            type: 'إضافة'
        });
        setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name_ar) {
            setError('الاسم العربي مطلوب');
            return;
        }

        try {
            setSaving(true);

            // Sanitize input based on type
            const dataToSave = {
                ...formData,
                rate: formData.is_fixed ? 0 : formData.rate,
                amount: formData.is_fixed ? formData.amount : 0
            };

            if (editingId) {
                await api.crudOperation({
                    operation: 'UPDATE',
                    table: 'taxes',
                    data: dataToSave,
                    id: editingId
                });
            } else {
                await api.crudOperation({
                    operation: 'CREATE',
                    table: 'taxes',
                    data: dataToSave
                });
            }

            handleClose();
            loadTaxes();
        } catch (err: any) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;

        try {
            await api.crudOperation({ operation: 'DELETE', table: 'taxes', id });
            loadTaxes();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const filteredTaxes = taxes.filter(t =>
        (t.name_ar || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.name_en || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleDeleteRows = async (rows: any[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد من الحذف؟' : `هل أنت متأكد من حذف ${rows.length} ضرائب/رسوم؟`)) return;

        try {
            for (const row of rows) {
                await api.crudOperation({ operation: 'DELETE', table: 'taxes', id: row.id });
            }
            await loadTaxes();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const columns = React.useMemo<DefinitionListColumn<any>[]>(() => [
        {
            key: 'name_ar',
            label: 'الاسم',
            width: 220,
            defaultVisible: true,
            getSearchValue: (tax) => `${tax.name_ar || ''} ${tax.name_en || ''}`,
            renderCell: (tax) => (
                <div>
                    <div className="font-medium text-gray-800">{tax.name_ar}</div>
                    {tax.name_en ? <div className="text-xs text-gray-400">{tax.name_en}</div> : null}
                </div>
            ),
        },
        {
            key: 'is_fixed',
            label: 'النوع',
            type: 'enum',
            filterType: 'enum',
            width: 170,
            defaultVisible: true,
            options: [
                { value: '0', label: 'نسبة مئوية' },
                { value: '1', label: 'مبلغ ثابت' },
            ],
            getValue: (tax) => Number(tax.is_fixed || 0),
            getDisplayValue: (tax) => Number(tax.is_fixed || 0) === 1 ? 'مبلغ ثابت' : 'نسبة مئوية',
            renderCell: (tax) => Number(tax.is_fixed || 0) === 1 ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    <DollarSign size={12} /> مبلغ ثابت
                </span>
            ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-100 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                    <Percent size={12} /> نسبة مئوية
                </span>
            ),
        },
        {
            key: 'amount_or_rate',
            label: 'القيمة / النسبة',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            getValue: (tax) => Number(Number(tax.is_fixed || 0) === 1 ? tax.amount || 0 : tax.rate || 0),
            getDisplayValue: (tax) => Number(tax.is_fixed || 0) === 1 ? String(tax.amount?.toLocaleString?.() || tax.amount || '-') : `${tax.rate || 0}%`,
            renderCell: (tax) => (
                <span className="rounded bg-gray-100 px-3 py-1 font-mono font-bold tracking-tight text-gray-700">
                    {Number(tax.is_fixed || 0) === 1 ? (tax.amount?.toLocaleString?.() || tax.amount || '-') : `${tax.rate || 0}%`}
                </span>
            ),
        },
        {
            key: 'type',
            label: 'التأثير',
            type: 'enum',
            filterType: 'enum',
            width: 140,
            defaultVisible: true,
            options: [
                { value: 'إضافة', label: 'إضافة' },
                { value: 'خصم', label: 'خصم' },
            ],
            getDisplayValue: (tax) => tax.type || 'إضافة',
            renderCell: (tax) => (
                <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${tax.type === 'خصم' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {tax.type || 'إضافة'}
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
            renderCell: (tax) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(tax)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="تعديل">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(tax.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [taxes]);

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <Percent size={24} />
                        </div>
                        الضرائب والرسوم
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">إدارة ضرائب القيمة المضافة والرسوم الثابتة</p>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة جديد
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
                screenKey="definitions.taxes"
                data={taxes}
                loading={loading}
                columns={columns}
                rowKey={(tax) => String(tax.id)}
                searchPlaceholder="بحث في الضرائب والرسوم..."
                emptyMessage="لا توجد ضرائب أو رسوم مطابقة"
                createLabel="إضافة جديد"
                onCreate={() => setIsAdding(true)}
                onEdit={handleEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadTaxes}
            />

            {false && (
            <>
            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث في الضرائب والرسوم..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        الإجمالي: <span className="text-emerald-600 font-bold">{filteredTaxes.length}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-emerald-500" />
                        <p>جاري تحميل البيانات...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-[#f8fafc] text-gray-600 font-semibold text-sm uppercase tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-4">الاسم</th>
                                    <th className="px-6 py-4">النوع</th>
                                    <th className="px-6 py-4">القيمة / النسبة</th>
                                    <th className="px-6 py-4">التأثير</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredTaxes.length > 0 ? (
                                    filteredTaxes.map((tax, index) => (
                                        <tr key={tax.id || index} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                {tax.name_ar}
                                                {tax.name_en && <span className="block text-xs text-gray-400 font-normal">{tax.name_en}</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {tax.is_fixed === 1 ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                                        <DollarSign size={12} /> مبلغ ثابت
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                                                        <Percent size={12} /> نسبة مئوية
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono bg-gray-100 px-3 py-1 rounded text-gray-700 font-bold tracking-tight">
                                                    {tax.is_fixed === 1 ? tax.amount?.toLocaleString() : `${tax.rate}%`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${tax.type === 'إضافة'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {tax.type || 'إضافة'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(tax)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tax.id)}
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
                                        <td colSpan={5} className="py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-gray-50 p-4 rounded-full">
                                                    <Search size={32} className="text-gray-300" />
                                                </div>
                                                <p>لا توجد بيانات</p>
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

            {/* Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {editingId ? <Edit className="text-emerald-600" size={20} /> : <Plus className="text-emerald-600" size={20} />}
                                {editingId ? 'تعديل البيانات' : 'إضافة جديد'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {/* Names */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم (عربي) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name_ar}
                                        onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-right"
                                        placeholder="مثال: ضريبة القيمة المضافة"
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
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="e.g. VAT"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            {/* Type Toggle */}
                            <div className="p-1 bg-gray-100 rounded-lg flex gap-1">
                                <button
                                    type="button"
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.is_fixed === 0 ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setFormData({ ...formData, is_fixed: 0 })}
                                >
                                    <Percent size={14} /> Percentage نسبة
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.is_fixed === 1 ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setFormData({ ...formData, is_fixed: 1 })}
                                >
                                    <DollarSign size={14} /> Fixed Amount مبلغ
                                </button>
                            </div>

                            {/* Values */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        {formData.is_fixed === 0 ? 'النسبة (%)' : 'المبلغ'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.is_fixed === 0 ? formData.rate : formData.amount}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (formData.is_fixed === 0) {
                                                    setFormData({ ...formData, rate: val });
                                                } else {
                                                    setFormData({ ...formData, amount: val });
                                                }
                                            }}
                                            className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                            placeholder="0"
                                        />
                                        <div className="absolute right-3 top-2.5 text-gray-400">
                                            {formData.is_fixed === 0 ? <Percent size={16} /> : <Hash size={16} />}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">التأثير</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    >
                                        <option value="إضافة">إضافة (Added)</option>
                                        <option value="خصم">خصم (Deducted)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 flex gap-3 border-t mt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm shadow-emerald-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
                                >
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    {editingId ? 'حفظ التعديلات' : 'إضافة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

