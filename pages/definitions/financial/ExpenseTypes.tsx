import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Edit,
    Link2,
    Loader2,
    Plus,
    ReceiptText,
    Trash2,
    X,
} from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';
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
const getCategory = (row: ExpenseTypeRow) => normalizeText(row.category) || 'تشغيلي';
const getAccountDisplayName = (row: ExpenseTypeRow) => normalizeText(row.account_name) || normalizeText(row.account_id);
const isLinkedToAccount = (row: ExpenseTypeRow) => Boolean(normalizeText(row.account_id));

export const ExpenseTypes = () => {
    const [types, setTypes] = useState<ExpenseTypeRow[]>([]);
    const [accounts, setAccounts] = useState<AccountRow[]>([]);
    const [loading, setLoading] = useState(true);
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
            category: getCategory(type),
            account_id: normalizeText(type.account_id),
            account_name: normalizeText(type.account_name),
        });
        setEditingId(String(type.id || ''));
        setError(null);
        setIsAdding(true);
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
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

    const handleDeleteRows = async (rows: ExpenseTypeRow[]) => {
        const ids = rows.map((row) => String(row.id || '').trim()).filter(Boolean);
        if (ids.length === 0) return;
        const message = ids.length === 1
            ? 'هل أنت متأكد من حذف هذا النوع؟'
            : `هل أنت متأكد من حذف ${ids.length} أنواع مصاريف؟`;
        if (!confirm(message)) return;

        try {
            for (const id of ids) {
                await api.crudOperation({ operation: 'DELETE', table: 'expense_types', id });
            }
            await loadTypes();
        } catch (err) {
            console.error(err);
            setError('فشل في حذف أنواع المصاريف المحددة.');
        }
    };

    const linkedTypesCount = useMemo(
        () => types.filter((row) => isLinkedToAccount(row)).length,
        [types],
    );

    const categoryOptions = useMemo(
        () => CATEGORY_OPTIONS.map((category) => ({ value: category, label: category })),
        [],
    );

    const columns = useMemo<DefinitionListColumn<ExpenseTypeRow>[]>(() => [
        {
            key: 'code',
            label: 'الكود',
            width: 130,
            defaultVisible: true,
            getDisplayValue: (row) => normalizeText(row.code) || '-',
            renderCell: (row) => (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                    {normalizeText(row.code) || '-'}
                </span>
            ),
        },
        {
            key: 'name_ar',
            label: 'الاسم (عربي)',
            width: 260,
            defaultVisible: true,
            getValue: getExpenseNameAr,
            getSearchValue: (row) => `${getExpenseNameAr(row)} ${normalizeText(row.name_en)} ${normalizeText(row.code)}`,
            renderCell: (row) => (
                <span className="font-semibold text-slate-800">
                    {getExpenseNameAr(row) || '-'}
                </span>
            ),
        },
        {
            key: 'name_en',
            label: 'الاسم (English)',
            width: 220,
            defaultVisible: true,
            getDisplayValue: (row) => normalizeText(row.name_en) || '-',
        },
        {
            key: 'category',
            label: 'التصنيف',
            type: 'enum',
            filterType: 'enum',
            width: 150,
            defaultVisible: true,
            options: categoryOptions,
            getValue: getCategory,
            getDisplayValue: getCategory,
            renderCell: (row) => {
                const category = getCategory(row);
                return (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        category === 'إداري'
                            ? 'bg-purple-100 text-purple-700'
                            : category === 'تسويقي'
                                ? 'bg-sky-100 text-sky-700'
                                : category === 'تمويلي'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                    }`}>
                        {category}
                    </span>
                );
            },
        },
        {
            key: 'account_status',
            label: 'حالة الربط',
            type: 'enum',
            filterType: 'enum',
            width: 150,
            defaultVisible: true,
            options: [
                { value: 'linked', label: 'مرتبط بحساب' },
                { value: 'unlinked', label: 'غير مرتبط' },
            ],
            getValue: (row) => isLinkedToAccount(row) ? 'linked' : 'unlinked',
            getDisplayValue: (row) => isLinkedToAccount(row) ? 'مرتبط بحساب' : 'غير مرتبط',
            renderCell: (row) => isLinkedToAccount(row) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <Link2 size={12} />
                    مرتبط بحساب
                </span>
            ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    غير مرتبط
                </span>
            ),
        },
        {
            key: 'account_name',
            label: 'الحساب المرتبط',
            width: 280,
            defaultVisible: true,
            getSearchValue: (row) => `${getAccountDisplayName(row)} ${normalizeText(row.account_id)}`,
            getDisplayValue: (row) => getAccountDisplayName(row) || '-',
            renderCell: (row) => getAccountDisplayName(row) ? (
                <div className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                    <Link2 size={14} className="shrink-0 text-sky-600" />
                    <span className="truncate">{getAccountDisplayName(row)}</span>
                </div>
            ) : (
                <span className="text-sm text-slate-400">غير مرتبط</span>
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
            renderCell: (row) => (
                <div className="flex justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        title="تعديل"
                    >
                        <Edit size={18} />
                    </button>
                    {row.id && (
                        <button
                            type="button"
                            onClick={() => handleDelete(String(row.id))}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            title="حذف"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            ),
        },
    ], [categoryOptions]);

    return (
        <div className="h-full bg-gray-50 p-4 md:p-6" dir="rtl">

            {error && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)} className="mr-auto rounded-md p-1 hover:bg-rose-100">
                        <X size={16} />
                    </button>
                </div>
            )}

            <DefinitionMasterList
                headerIcon={<ReceiptText size={24} />}
                headerTitle="أنواع المصاريف"
                headerSubtitle="جدول منظم لأنواع المصاريف مع فلترة وربط مباشر بالحسابات."
                headerBadges={[
                    { label: `${types.length} نوع`, tone: 'info' },
                    { label: `${linkedTypesCount} مرتبط بحساب`, tone: 'success' },
                    { label: `${Math.max(types.length - linkedTypesCount, 0)} غير مرتبط`, tone: 'warning' },
                ]}
                screenKey="definitions.expense_types"
                data={types}
                loading={loading}
                columns={columns}
                rowKey={(row) => String(row.id || row.code || getExpenseNameAr(row))}
                searchPlaceholder="بحث بالاسم أو الكود أو الحساب"
                emptyMessage="لا توجد أنواع مصاريف مطابقة للمعايير الحالية"
                createLabel="إضافة نوع"
                onCreate={openCreate}
                onEdit={handleEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadTypes}
                onRowDoubleClick={handleEdit}
                defaultSort={{ key: 'code', direction: 'asc' }}
            />

            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                {editingId ? <Edit className="text-blue-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                                {editingId ? 'تعديل نوع مصروف' : 'إضافة نوع جديد'}
                            </h3>
                            <button type="button" onClick={handleClose} className="text-gray-400 transition-colors hover:text-gray-600">
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
                                        onChange={(event) => setFormData({ ...formData, code: event.target.value.toUpperCase() })}
                                        className="w-full rounded-lg border px-3 py-2 font-mono outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="EXP-001"
                                        dir="ltr"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">التصنيف</label>
                                    <select
                                        value={formData.category}
                                        onChange={(event) => setFormData({ ...formData, category: event.target.value })}
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
                                        onChange={(event) => setFormData({ ...formData, name_ar: event.target.value })}
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
                                        onChange={(event) => setFormData({ ...formData, name_en: event.target.value })}
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
                                    onChange={(event) => {
                                        const selected = accounts.find((account) => account.id === event.target.value);
                                        setFormData({
                                            ...formData,
                                            account_id: event.target.value,
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
