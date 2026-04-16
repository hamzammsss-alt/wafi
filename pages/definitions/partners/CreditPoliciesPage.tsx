import React, { useEffect, useState } from 'react';
import {
    ShieldCheck,
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    X,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';

interface CreditPolicyRow {
    id: string;
    code?: string;
    name_ar: string;
    name_en?: string;
    name_he?: string;
    currency_id?: string;
    max_credit_limit?: number;
    max_checks_limit?: number;
    personal_check_limit?: number;
    facilitation_days?: number;
    facilitation_from_month_end?: number | boolean;
    allow_over_limit?: number | boolean;
    overdue_check_days?: number;
    check_validation_type?: string;
    include_collection_checks?: number | boolean;
    include_open_sales_orders?: number | boolean;
    allowed_check_due_days?: number;
    override_max_credit_limit?: number | boolean;
    override_max_checks_limit?: number | boolean;
    override_personal_check_limit?: number | boolean;
    override_facilitation_days?: number | boolean;
    override_facilitation_from_month_end?: number | boolean;
    override_allow_over_limit?: number | boolean;
    override_overdue_check_days?: number | boolean;
    override_check_validation_type?: number | boolean;
    override_include_collection_checks?: number | boolean;
    override_include_open_sales_orders?: number | boolean;
    override_allowed_check_due_days?: number | boolean;
    is_active?: number | boolean;
}

const defaultForm: CreditPolicyRow = {
    id: '',
    code: '',
    name_ar: '',
    name_en: '',
    name_he: '',
    currency_id: '',
    max_credit_limit: 0,
    max_checks_limit: 0,
    personal_check_limit: 0,
    facilitation_days: 0,
    facilitation_from_month_end: 0,
    allow_over_limit: 0,
    overdue_check_days: 0,
    check_validation_type: 'NONE',
    include_collection_checks: 0,
    include_open_sales_orders: 0,
    allowed_check_due_days: 0,
    override_max_credit_limit: 1,
    override_max_checks_limit: 1,
    override_personal_check_limit: 1,
    override_facilitation_days: 1,
    override_facilitation_from_month_end: 1,
    override_allow_over_limit: 1,
    override_overdue_check_days: 1,
    override_check_validation_type: 1,
    override_include_collection_checks: 1,
    override_include_open_sales_orders: 1,
    override_allowed_check_due_days: 1,
    is_active: 1
};

const toBool = (v: any) => v === 1 || v === true || v === '1';

export const CreditPoliciesPage: React.FC = () => {
    const [rows, setRows] = useState<CreditPolicyRow[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<CreditPolicyRow>(defaultForm);

    const loadRows = async () => {
        try {
            setLoading(true);
            const [policies, curr] = await Promise.all([
                window.electronAPI.partner.getCreditPolicies(),
                window.electronAPI.currency.getCurrencies()
            ]);
            setRows(policies || []);
            setCurrencies(curr || []);
        } catch (err) {
            console.error(err);
            setError('تعذر تحميل سياسات الائتمان');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRows();
    }, []);

    const resetForm = () => {
        setForm(defaultForm);
        setEditingId(null);
    };

    const openCreate = () => {
        resetForm();
        setIsOpen(true);
        setError(null);
    };

    useCreateIntent(openCreate);

    const openEdit = (row: CreditPolicyRow) => {
        setForm({
            ...defaultForm,
            ...row
        });
        setEditingId(row.id);
        setIsOpen(true);
        setError(null);
    };

    const setFlag = (key: keyof CreditPolicyRow, checked: boolean) => {
        setForm((prev) => ({ ...prev, [key]: checked ? 1 : 0 }));
    };

    const onSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!String(form.name_ar || '').trim()) {
            setError('اسم السياسة بالعربية مطلوب');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...form,
                is_active: toBool(form.is_active) ? 1 : 0
            };
            if (editingId) {
                await window.electronAPI.partner.saveCreditPolicy({ ...payload, id: editingId });
            } else {
                await window.electronAPI.partner.saveCreditPolicy(payload);
            }
            setIsOpen(false);
            resetForm();
            await loadRows();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || 'فشل حفظ سياسة الائتمان');
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (id: string) => {
        if (!confirm('هل تريد حذف سياسة الائتمان؟')) return;
        try {
            await window.electronAPI.partner.deleteCreditPolicy(id);
            await loadRows();
        } catch (err: any) {
            alert(err?.message || 'تعذر حذف السياسة');
        }
    };

    const filtered = rows.filter((row) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            String(row.name_ar || '').toLowerCase().includes(q) ||
            String(row.name_en || '').toLowerCase().includes(q) ||
            String(row.code || '').toLowerCase().includes(q)
        );
    });

    const currencyName = (id?: string) => {
        if (!id) return '-';
        const item = currencies.find((c) => c.id === id || c.code === id);
        return item?.code || item?.name_ar || id;
    };

    const overrideFields: Array<{ key: keyof CreditPolicyRow; label: string }> = [
        { key: 'override_max_credit_limit', label: 'حد أقصى' },
        { key: 'override_max_checks_limit', label: 'حد أقصى للشيكات' },
        { key: 'override_personal_check_limit', label: 'شيك شخصي' },
        { key: 'override_facilitation_days', label: 'تسهيلات/يوم' },
        { key: 'override_facilitation_from_month_end', label: 'تسهيلات من نهاية الشهر' },
        { key: 'override_allow_over_limit', label: 'السماح بتجاوز الحد الأقصى' },
        { key: 'override_overdue_check_days', label: 'فحص رصيد غير مسدد' },
        { key: 'override_check_validation_type', label: 'نوع الفحص' },
        { key: 'override_include_collection_checks', label: 'اشمل شيكات برسم التحصيل' },
        { key: 'override_include_open_sales_orders', label: 'اشمل طلبات المبيعات' },
        { key: 'override_allowed_check_due_days', label: 'الأيام المسموحة لاستحقاق الشيك' }
    ];

    return (
        <div className="app-page" dir="rtl">
            <WorkspaceHeader
                icon={<ShieldCheck size={24} />}
                title="سياسات الائتمان"
                subtitle="تعريف وإدارة قواعد الائتمان الافتراضية"
                badges={[
                    { label: `الإجمالي ${rows.length}`, tone: 'warning' },
                    { label: `المعروض ${filtered.length}`, tone: 'success' },
                    { label: `العملات ${currencies.length}`, tone: 'info' },
                ]}
                actions={
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        <Plus size={18} />
                        سياسة جديدة
                    </button>
                }
                className="mb-6"
            />
            <div className="hidden flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 rounded-lg text-cyan-700">
                            <ShieldCheck size={24} />
                        </div>
                        سياسات الائتمان
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">تعريف وإدارة قواعد الائتمان الافتراضية</p>
                </div>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={18} />
                    سياسة جديدة
                </button>
            </div>

            <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        الإجمالي: <span className="text-blue-600 font-bold">{filtered.length}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                        <p>جارٍ التحميل...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="dense-table w-full text-right">
                            <thead className="bg-[#f8fafc] text-gray-600 font-semibold text-sm border-b">
                                <tr>
                                    <th className="px-6 py-4">الاسم</th>
                                    <th className="px-6 py-4">الرمز</th>
                                    <th className="px-6 py-4">عملة</th>
                                    <th className="px-6 py-4">حد أقصى</th>
                                    <th className="px-6 py-4">تسهيلات</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.length > 0 ? (
                                    filtered.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800">{row.name_ar}</td>
                                            <td className="px-6 py-4">{row.code || '-'}</td>
                                            <td className="px-6 py-4">{currencyName(row.currency_id)}</td>
                                            <td className="px-6 py-4">{Number(row.max_credit_limit || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4">{row.facilitation_days || 0} يوم</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${toBool(row.is_active) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {toBool(row.is_active) ? 'فعال' : 'غير فعال'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(row)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => onDelete(row.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-gray-400">لا توجد بيانات</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[92vh] flex flex-col" dir="rtl">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h2 className="font-bold text-lg text-gray-800">{editingId ? 'تعديل سياسة ائتمان' : 'إضافة سياسة ائتمان'}</h2>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={onSave} className="p-6 overflow-y-auto space-y-6">
                            {error && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 border border-red-100">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الرقم</label>
                                    <input type="text" value={form.code || ''} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم عربي</label>
                                    <input type="text" value={form.name_ar || ''} onChange={(e) => setForm((p) => ({ ...p, name_ar: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">عملة</label>
                                    <select value={form.currency_id || ''} onChange={(e) => setForm((p) => ({ ...p, currency_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 bg-white">
                                        <option value="">افتراضي</option>
                                        {currencies.map((c) => (
                                            <option key={c.id || c.code} value={c.id}>{c.code || c.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم EN</label>
                                    <input type="text" value={form.name_en || ''} onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))} className="w-full border rounded-lg px-3 py-2" dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم HE</label>
                                    <input type="text" value={form.name_he || ''} onChange={(e) => setForm((p) => ({ ...p, name_he: e.target.value }))} className="w-full border rounded-lg px-3 py-2" dir="rtl" />
                                </div>
                                <div className="flex items-center gap-2 mt-7">
                                    <input id="credit-policy-active" type="checkbox" checked={toBool(form.is_active)} onChange={(e) => setFlag('is_active', e.target.checked)} />
                                    <label htmlFor="credit-policy-active" className="text-sm text-gray-700">فعال</label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">حد أقصى</label>
                                    <input type="number" value={form.max_credit_limit || 0} onChange={(e) => setForm((p) => ({ ...p, max_credit_limit: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">حد أقصى للشيكات</label>
                                    <input type="number" value={form.max_checks_limit || 0} onChange={(e) => setForm((p) => ({ ...p, max_checks_limit: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">شيك شخصي</label>
                                    <input type="number" value={form.personal_check_limit || 0} onChange={(e) => setForm((p) => ({ ...p, personal_check_limit: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">تسهيلات/يوم</label>
                                    <input type="number" value={form.facilitation_days || 0} onChange={(e) => setForm((p) => ({ ...p, facilitation_days: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">فحص رصيد غير مسدد (أيام)</label>
                                    <input type="number" value={form.overdue_check_days || 0} onChange={(e) => setForm((p) => ({ ...p, overdue_check_days: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع الفحص</label>
                                    <select value={form.check_validation_type || 'NONE'} onChange={(e) => setForm((p) => ({ ...p, check_validation_type: e.target.value }))} className="w-full border rounded-lg px-3 py-2 bg-white">
                                        <option value="NONE">بدون</option>
                                        <option value="WARNING">تحذير</option>
                                        <option value="BLOCK">منع</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">عدد الأيام المسموحة لاستحقاق الشيك</label>
                                    <input type="number" value={form.allowed_check_due_days || 0} onChange={(e) => setForm((p) => ({ ...p, allowed_check_due_days: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 border rounded-xl p-4">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={toBool(form.facilitation_from_month_end)} onChange={(e) => setFlag('facilitation_from_month_end', e.target.checked)} />
                                    تسهيلات من نهاية الشهر
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={toBool(form.allow_over_limit)} onChange={(e) => setFlag('allow_over_limit', e.target.checked)} />
                                    السماح بتجاوز الحد الأقصى
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={toBool(form.include_collection_checks)} onChange={(e) => setFlag('include_collection_checks', e.target.checked)} />
                                    اشمل شيكات برسم التحصيل
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={toBool(form.include_open_sales_orders)} onChange={(e) => setFlag('include_open_sales_orders', e.target.checked)} />
                                    اشمل طلبات المبيعات عند الترحيل
                                </label>
                            </div>

                            <div className="border rounded-xl p-4">
                                <h3 className="font-semibold text-gray-800 mb-3">حقول تعتمد على الزبون (حسب الزبون)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {overrideFields.map((entry) => (
                                        <label key={String(entry.key)} className="flex items-center gap-2 text-sm text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={toBool(form[entry.key])}
                                                onChange={(e) => setFlag(entry.key, e.target.checked)}
                                            />
                                            {entry.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t">
                                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

