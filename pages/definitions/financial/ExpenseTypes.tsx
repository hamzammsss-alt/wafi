import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Banknote,
    Edit,
    Link2,
    Loader2,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';

type ExpenseTypeRow = {
    id?: string;
    code?: string;
    name?: string;
    name_ar?: string;
    name_en?: string;
    category?: string;
    account_id?: string;
    account_name?: string;
};

type AccountRow = {
    id: string;
    name?: string;
    name_ar?: string;
    accountCode?: string;
    accountType?: string;
    type?: string;
    category?: string;
    accountCategory?: string;
    postingAllowed?: boolean;
};

const CATEGORY_OPTIONS = [
    'تشغيلي',
    'إداري',
    'تسويقي',
    'تمويلي',
];

const emptyForm = {
    code: '',
    name_ar: '',
    name_en: '',
    category: 'تشغيلي',
    account_id: '',
    account_name: '',
};

const normalizeText = (value: unknown) => String(value || '').trim();

const getExpenseNameAr = (row: ExpenseTypeRow) => normalizeText(row.name_ar || row.name);

export const ExpenseTypes = () => {
    const [types, setTypes] = useState<ExpenseTypeRow[]>([]);
    const [accounts, setAccounts] = useState<AccountRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
    const [linkedFilter, setLinkedFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = (window as any).electronAPI;

    const loadTypes = async () => {
        try {
            setLoading(true);
            const data = await api.crudOperation({ operation: 'READ', table: 'expense_types' });
            setTypes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل أنواع المصاريف.');
        } finally {
            setLoading(false);
        }
    };

    const loadAccounts = async () => {
        try {
            const list =
                (await api?.account?.getAccounts?.()) ||
                (await api?.getAccounts?.()) ||
                [];

            const normalized = (Array.isArray(list) ? list : []).filter((account: AccountRow) => {
                const postingAllowed = account.postingAllowed ?? true;
                const accountType = normalizeText(account.accountType || account.type).toUpperCase();
                const accountCategory = normalizeText(account.accountCategory || account.category).toUpperCase();
                const isExpenseAccount =
                    accountType === 'EXPENSE' ||
                    accountCategory === 'EXPENSE' ||
                    accountCategory === 'OPERATING_EXPENSE' ||
                    accountCategory === 'OTHER_EXPENSE';

                return postingAllowed && isExpenseAccount;
            });

            setAccounts(normalized);
        } catch (err) {
            console.error('Failed to load accounts', err);
            setAccounts([]);
        }
    };

    useEffect(() => {
        void Promise.all([loadTypes(), loadAccounts()]);
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setFormData(emptyForm);
        setError(null);
        setIsAdding(true);
    };

    const handleClose = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData(emptyForm);
        setError(null);
    };

    useCreateIntent(openCreate);

    const handleEdit = (type: ExpenseTypeRow) => {
        setFormData({
            code: normalizeText(type.code),
            name_ar: getExpenseNameAr(type),
            name_en: normalizeText(type.name_en),
            category: normalizeText(type.category) || 'تشغيلي',
            account_id: normalizeText(type.account_id),
            account_name: normalizeText(type.account_name),
        });
        setEditingId(String(type.id || ''));
        setError(null);
        setIsAdding(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!normalizeText(formData.name_ar)) {
            setError('اسم نوع المصروف مطلوب.');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                name: formData.name_ar,
            };

            if (editingId) {
                await api.crudOperation({
                    operation: 'UPDATE',
                    table: 'expense_types',
                    data: payload,
                    id: editingId,
                });
            } else {
                await api.crudOperation({
                    operation: 'CREATE',
                    table: 'expense_types',
                    data: payload,
                });
            }

            handleClose();
            await loadTypes();
        } catch (err) {
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
            await loadTypes();
        } catch (err) {
            console.error(err);
            setError('فشل في حذف نوع المصروف.');
        }
    };

    const filteredTypes = useMemo(() => {
        const query = search.trim().toLowerCase();

        return types.filter((row) => {
            const matchesSearch =
                !query ||
                getExpenseNameAr(row).toLowerCase().includes(query) ||
                normalizeText(row.name_en).toLowerCase().includes(query) ||
                normalizeText(row.code).toLowerCase().includes(query) ||
                normalizeText(row.account_name).toLowerCase().includes(query);

            if (!matchesSearch) return false;

            if (categoryFilter !== 'all' && normalizeText(row.category || 'تشغيلي') !== categoryFilter) {
                return false;
            }

            const linked = Boolean(normalizeText(row.account_id));
            if (linkedFilter === 'linked' && !linked) return false;
            if (linkedFilter === 'unlinked' && linked) return false;

            return true;
        });
    }, [types, search, categoryFilter, linkedFilter]);

    return (
        <div className="app-page" dir="rtl">
            <WorkspaceHeader
                icon={<Banknote size={22} />}
                title="أنواع المصاريف"
                subtitle="جدول منظم لأنواع المصاريف مع فلترة وربط مباشر بالحسابات."
                badges={[
                    { label: `${types.length} نوع`, tone: 'info' },
                    { label: `${filteredTypes.length} نتيجة`, tone: 'neutral' },
                    { label: `${types.filter((row) => normalizeText(row.account_id)).length} مرتبط بحساب`, tone: 'success' },
                ]}
                actions={(
                    <button
                        onClick={openCreate}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:brightness-105"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Plus size={16} />
                            <span>إضافة نوع جديد</span>
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

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[260px] flex-1">
                    <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالاسم أو الكود أو الحساب..."
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                </div>

                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-11 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                    <option value="all">كل التصنيفات</option>
                    {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>

                <select
                    value={linkedFilter}
                    onChange={(e) => setLinkedFilter(e.target.value as typeof linkedFilter)}
                    className="h-11 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                    <option value="all">كل الحالات</option>
                    <option value="linked">مرتبطة بحساب</option>
                    <option value="unlinked">غير مرتبطة</option>
                </select>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-gradient-to-l from-sky-50 to-blue-50 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900">قائمة أنواع المصاريف</h2>
                    <p className="text-sm text-slate-600">
                        عدد السجلات الحالية: <span className="font-semibold">{filteredTypes.length}</span>
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
                                    <th className="w-[70px] border-b border-l border-slate-200 bg-slate-50 p-3 text-center">الرقم</th>
                                    <th className="min-w-[120px] border-b border-l border-slate-200 bg-slate-50 p-3">الكود</th>
                                    <th className="min-w-[220px] border-b border-l border-slate-200 bg-slate-50 p-3">الاسم (عربي)</th>
                                    <th className="min-w-[220px] border-b border-l border-slate-200 bg-slate-50 p-3">الاسم (English)</th>
                                    <th className="min-w-[130px] border-b border-l border-slate-200 bg-slate-50 p-3">التصنيف</th>
                                    <th className="min-w-[260px] border-b border-l border-slate-200 bg-slate-50 p-3">الحساب المرتبط</th>
                                    <th className="w-[120px] border-b border-slate-200 bg-slate-50 p-3 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTypes.length > 0 ? (
                                    filteredTypes.map((type, index) => (
                                        <tr key={type.id || `${type.code}-${index}`} className="group">
                                            <td className="border-b border-l border-slate-200 bg-white p-3 text-center font-mono font-bold text-slate-500 transition group-hover:bg-sky-50/40">
                                                {String(index + 1).padStart(2, '0')}
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 transition group-hover:bg-sky-50/40">
                                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                                                    {normalizeText(type.code) || '-'}
                                                </span>
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 font-medium text-slate-800 transition group-hover:bg-sky-50/40">
                                                {getExpenseNameAr(type)}
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 font-mono text-sm text-slate-600 transition group-hover:bg-sky-50/40">
                                                {normalizeText(type.name_en) || '-'}
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 transition group-hover:bg-sky-50/40">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    normalizeText(type.category) === 'إداري'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {normalizeText(type.category) || 'تشغيلي'}
                                                </span>
                                            </td>
                                            <td className="border-b border-l border-slate-200 bg-white p-3 transition group-hover:bg-sky-50/40">
                                                {normalizeText(type.account_id) ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <Link2 size={14} className="text-sky-600" />
                                                        <span className="truncate">
                                                            {normalizeText(type.account_name) || normalizeText(type.account_id)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">غير مرتبط</span>
                                                )}
                                            </td>
                                            <td className="border-b border-slate-200 bg-white p-3 transition group-hover:bg-sky-50/40">
                                                <div className="flex justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        onClick={() => handleEdit(type)}
                                                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                                        title="تعديل"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    {type.id && (
                                                        <button
                                                            onClick={() => handleDelete(String(type.id))}
                                                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                                            title="حذف"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="border-b border-slate-200 bg-white py-16 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <Search size={28} className="text-slate-300" />
                                                <p>لا توجد أنواع مصاريف مطابقة للفلاتر الحالية.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                {editingId ? <Edit className="text-blue-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                                {editingId ? 'تعديل نوع مصروف' : 'إضافة نوع جديد'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 transition-colors hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 p-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الكود</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full rounded-lg border px-3 py-2 font-mono outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="EXP-001"
                                        dir="ltr"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">التصنيف</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        {CATEGORY_OPTIONS.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        الاسم (عربي) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name_ar}
                                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="مثال: كهرباء ومياه"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم (English)</label>
                                    <input
                                        type="text"
                                        value={formData.name_en}
                                        onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="e.g. Electricity & Water"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">ربط بالحساب</label>
                                <select
                                    value={formData.account_id}
                                    onChange={(e) => {
                                        const selected = accounts.find((account) => account.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            account_id: e.target.value,
                                            account_name: selected
                                                ? `${normalizeText(selected.accountCode)} - ${normalizeText(selected.name_ar || selected.name)}`
                                                : '',
                                        });
                                    }}
                                    className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">بدون ربط</option>
                                    {accounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {`${normalizeText(account.accountCode)} - ${normalizeText(account.name_ar || account.name)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-70"
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
