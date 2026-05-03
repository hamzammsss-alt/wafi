import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Edit, Loader2, Save, Trash2, Wallet, X } from 'lucide-react';
import { AccountPicker } from '../../../components/AccountPicker';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';

type CurrencyRow = {
    id: string;
    code: string;
    name_ar?: string | null;
    name_en?: string | null;
};

type CashBoxRow = {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string | null;
    currency_id?: string | null;
    currency_code?: string | null;
    currency_name?: string | null;
    gl_account_id?: string | null;
    gl_account_code?: string | null;
    gl_account_name?: string | null;
    note?: string | null;
    is_active?: number | boolean;
};

type CashBoxForm = {
    id?: string;
    code: string;
    name_ar: string;
    name_en: string;
    currency_id: string;
    currency_code: string;
    gl_account_id: string;
    gl_account_code: string;
    gl_account_name: string;
    note: string;
    is_active: boolean;
};

const buildEmptyForm = (currencies: CurrencyRow[]): CashBoxForm => {
    const preferredCurrency =
        currencies.find((row) => String(row.code || '').toUpperCase() === 'ILS') ||
        currencies.find((row) => String(row.code || '').toUpperCase() === 'NIS') ||
        currencies[0];

    return {
        code: '',
        name_ar: '',
        name_en: '',
        currency_id: preferredCurrency?.id || '',
        currency_code: preferredCurrency?.code || 'ILS',
        gl_account_id: '',
        gl_account_code: '',
        gl_account_name: '',
        note: '',
        is_active: true,
    };
};

const getCurrencyLabel = (currency?: CurrencyRow | null) => {
    if (!currency) return '';
    return currency.name_ar || currency.name_en || currency.code;
};

const isCashBoxActive = (row: Partial<CashBoxRow> | null | undefined) =>
    row?.is_active === false || row?.is_active === 0 ? false : true;

export function CashBoxesPage() {
    const electronApi = (window as any).electronAPI;
    const masterDataApi = electronApi?.masterData;
    const currencyApi = electronApi?.currency;

    const [cashBoxes, setCashBoxes] = useState<CashBoxRow[]>([]);
    const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accountPickerOpen, setAccountPickerOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<CashBoxForm>(buildEmptyForm([]));

    const selectedCurrency = useMemo(
        () =>
            currencies.find(
                (row) =>
                    row.id === formData.currency_id ||
                    String(row.code || '').toUpperCase() === String(formData.currency_code || '').toUpperCase(),
            ) || null,
        [currencies, formData.currency_code, formData.currency_id],
    );

    const currencyFilterOptions = useMemo(
        () =>
            currencies
                .filter((currency) => currency.code)
                .map((currency) => ({
                    value: currency.code,
                    label: `${getCurrencyLabel(currency)} (${currency.code})`,
                })),
        [currencies],
    );

    const activeCashBoxesCount = useMemo(
        () => cashBoxes.filter((row) => isCashBoxActive(row)).length,
        [cashBoxes],
    );

    const linkedCashBoxesCount = useMemo(
        () => cashBoxes.filter((row) => row.gl_account_id || row.gl_account_code).length,
        [cashBoxes],
    );

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [boxes, currencyRows] = await Promise.all([
                masterDataApi?.getCashBoxes?.() || [],
                currencyApi?.getCurrencies?.() || electronApi?.getCurrencies?.() || [],
            ]);

            const normalizedCurrencies = Array.isArray(currencyRows) ? currencyRows : [];
            setCashBoxes(Array.isArray(boxes) ? boxes : []);
            setCurrencies(normalizedCurrencies);
            setFormData((prev) => (prev.currency_id || prev.currency_code ? prev : buildEmptyForm(normalizedCurrencies)));
        } catch (err) {
            console.error(err);
            setError('تعذر تحميل بيانات الصناديق. حاول مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openCreate = () => {
        setError(null);
        setFormData(buildEmptyForm(currencies));
        setIsModalOpen(true);
    };

    useCreateIntent(openCreate);

    const closeModal = () => {
        setIsModalOpen(false);
        setAccountPickerOpen(false);
        setError(null);
        setFormData(buildEmptyForm(currencies));
    };

    const handleEdit = (row: CashBoxRow) => {
        const matchedCurrency =
            currencies.find(
                (currency) =>
                    currency.id === row.currency_id ||
                    String(currency.code || '').toUpperCase() === String(row.currency_code || '').toUpperCase(),
            ) || null;

        setError(null);
        setFormData({
            id: row.id,
            code: row.code || '',
            name_ar: row.name_ar || '',
            name_en: row.name_en || '',
            currency_id: matchedCurrency?.id || row.currency_id || '',
            currency_code: matchedCurrency?.code || row.currency_code || '',
            gl_account_id: row.gl_account_id || '',
            gl_account_code: row.gl_account_code || '',
            gl_account_name: row.gl_account_name || '',
            note: row.note || '',
            is_active: row.is_active === false || row.is_active === 0 ? false : true,
        });
        setIsModalOpen(true);
    };

    const handleCurrencyChange = (value: string) => {
        const nextCurrency =
            currencies.find((currency) => currency.id === value || currency.code === value) || null;

        setFormData((prev) => {
            const nextCurrencyId = nextCurrency?.id || value;
            const shouldResetAccount = prev.currency_id && prev.currency_id !== nextCurrencyId;
            return {
                ...prev,
                currency_id: nextCurrencyId,
                currency_code: nextCurrency?.code || prev.currency_code,
                ...(shouldResetAccount
                    ? { gl_account_id: '', gl_account_code: '', gl_account_name: '' }
                    : {}),
            };
        });
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        if (!formData.code.trim()) {
            setError('رمز الصندوق مطلوب.');
            return;
        }

        if (!formData.name_ar.trim()) {
            setError('اسم الصندوق مطلوب.');
            return;
        }

        if (!formData.gl_account_id) {
            setError('يجب اختيار حساب صندوق مرتبط من شجرة الحسابات.');
            return;
        }

        try {
            setSaving(true);
            await masterDataApi.saveCashBox({
                ...formData,
                is_active: formData.is_active ? 1 : 0,
            });
            closeModal();
            await loadData();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || 'تعذر حفظ بيانات الصندوق.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل تريد تعطيل هذا الصندوق؟')) return;

        try {
            await masterDataApi.deleteCashBox(id);
            await loadData();
        } catch (err) {
            console.error(err);
            setError('تعذر حذف الصندوق.');
        }
    };

    const handleDeleteRows = async (rows: CashBoxRow[]) => {
        const rowsToDelete = rows.filter((row) => row.id);
        if (rowsToDelete.length === 0) return;

        const message = rowsToDelete.length === 1
            ? 'هل تريد تعطيل هذا الصندوق؟'
            : `هل تريد تعطيل ${rowsToDelete.length} صناديق؟`;

        if (!confirm(message)) return;

        try {
            for (const row of rowsToDelete) {
                await masterDataApi.deleteCashBox(row.id);
            }
            await loadData();
        } catch (err) {
            console.error(err);
            setError('تعذر حذف الصندوق.');
        }
    };

    const columns = useMemo<DefinitionListColumn<CashBoxRow>[]>(() => [
        {
            key: 'code',
            label: 'الرمز',
            width: 110,
            defaultVisible: true,
            getDisplayValue: (row) => row.code || '-',
            renderCell: (row) => (
                <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-sky-700">
                    {row.code || '-'}
                </span>
            ),
        },
        {
            key: 'name_ar',
            label: 'اسم الصندوق',
            width: 230,
            defaultVisible: true,
            getSearchValue: (row) => `${row.code || ''} ${row.name_ar || ''} ${row.name_en || ''}`,
            renderCell: (row) => (
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-800">{row.name_ar || '-'}</div>
                    {row.name_en && <div className="truncate text-xs text-slate-400">{row.name_en}</div>}
                </div>
            ),
        },
        {
            key: 'currency_code',
            label: 'العملة',
            type: 'enum',
            filterType: 'enum',
            options: currencyFilterOptions,
            width: 170,
            defaultVisible: true,
            getValue: (row) => row.currency_code || row.currency_id || '',
            getDisplayValue: (row) => row.currency_name || row.currency_code || '-',
            renderCell: (row) => (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {row.currency_name || row.currency_code || '-'}
                </span>
            ),
        },
        {
            key: 'gl_account_code',
            label: 'الحساب المرتبط',
            width: 230,
            defaultVisible: true,
            getSearchValue: (row) => `${row.gl_account_code || ''} ${row.gl_account_name || ''} ${row.gl_account_id || ''}`,
            getDisplayValue: (row) =>
                [row.gl_account_code, row.gl_account_name].filter(Boolean).join(' - ') || '-',
            renderCell: (row) => (
                <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-semibold text-sky-700">{row.gl_account_code || '-'}</div>
                    <div className="truncate text-xs text-slate-700">{row.gl_account_name || '-'}</div>
                </div>
            ),
        },
        {
            key: 'note',
            label: 'ملاحظة',
            width: 220,
            defaultVisible: true,
            getDisplayValue: (row) => row.note || '-',
            renderCell: (row) => (
                <span className="line-clamp-2 text-slate-600">{row.note || '-'}</span>
            ),
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            width: 120,
            defaultVisible: true,
            options: [
                { value: 'active', label: 'فعال' },
                { value: 'inactive', label: 'غير فعال' },
            ],
            getValue: (row) => (isCashBoxActive(row) ? 'active' : 'inactive'),
            getDisplayValue: (row) => (isCashBoxActive(row) ? 'فعال' : 'غير فعال'),
            renderCell: (row) => (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                    isCashBoxActive(row)
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                }`}>
                    {isCashBoxActive(row) ? 'فعال' : 'غير فعال'}
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
            renderCell: (row) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                        title="تعديل"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                        title="تعطيل"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ], [currencyFilterOptions, handleDelete, handleEdit]);

    return (
        <div className="h-full bg-gray-50 p-4 md:p-6" dir="rtl">

            {error && !isModalOpen && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            <DefinitionMasterList
                headerIcon={<Wallet size={24} />}
                headerTitle="الصناديق"
                headerSubtitle="تعريف صناديق القبض والصرف وربط كل صندوق بالحساب والعملة بنفس خصائص جدول العملات وأسعار الصرف."
                headerBadges={[
                    { label: `الإجمالي ${cashBoxes.length}`, tone: 'warning' },
                    { label: `الفعالة ${activeCashBoxesCount}`, tone: 'success' },
                    { label: `المرتبطة ${linkedCashBoxesCount}`, tone: 'info' },
                ]}
                screenKey="definitions.cash-boxes"
                data={cashBoxes}
                loading={loading}
                columns={columns}
                rowKey={(row) => String(row.id || row.code)}
                searchPlaceholder="بحث برمز الصندوق أو اسمه أو العملة أو الحساب..."
                emptyMessage="لا توجد صناديق مطابقة للمعايير الحالية"
                createLabel="إضافة صندوق"
                onCreate={openCreate}
                onEdit={handleEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadData}
                defaultSort={{ key: 'code', direction: 'asc' }}
            />

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/45 p-4 pt-8 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                        >
                            <div className="flex items-center justify-between bg-gradient-to-l from-sky-600 to-cyan-500 px-5 py-4 text-white">
                                <div>
                                    <div className="text-lg font-extrabold">{formData.id ? 'تعديل صندوق' : 'إضافة صندوق'}</div>
                                    <div className="text-xs text-white/85">اختر العملة أولًا ثم اربط الصندوق بحساب صندوق مطابق من مجموعة 111.</div>
                                </div>
                                <button onClick={closeModal} className="rounded-full p-2 transition hover:bg-white/15">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-5 p-5">
                                {error && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                        {error}
                                    </div>
                                )}

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-slate-600">رمز الصندوق</label>
                                        <input
                                            value={formData.code}
                                            onChange={(event) =>
                                                setFormData((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                                            }
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500"
                                            placeholder="مثال: CASH-NIS-01"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-slate-600">العملة</label>
                                        <select
                                            value={formData.currency_id || formData.currency_code}
                                            onChange={(event) => handleCurrencyChange(event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-500"
                                        >
                                            {currencies.map((currency) => (
                                                <option key={currency.id} value={currency.id}>
                                                    {getCurrencyLabel(currency)} ({currency.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-slate-600">اسم الصندوق</label>
                                        <input
                                            value={formData.name_ar}
                                            onChange={(event) => setFormData((prev) => ({ ...prev, name_ar: event.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500"
                                            placeholder="اسم الصندوق بالعربية"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-slate-600">الاسم بالإنجليزية</label>
                                        <input
                                            value={formData.name_en}
                                            onChange={(event) => setFormData((prev) => ({ ...prev, name_en: event.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500"
                                            placeholder="Cash box name"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="mb-3 text-sm font-bold text-slate-700">الحساب المرتبط</div>
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                        <button
                                            type="button"
                                            onClick={() => setAccountPickerOpen(true)}
                                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm transition hover:border-sky-300 hover:bg-sky-50/50"
                                        >
                                            {formData.gl_account_id ? (
                                                <div className="space-y-1">
                                                    <div className="font-mono text-xs text-sky-700">{formData.gl_account_code || formData.gl_account_id}</div>
                                                    <div className="font-medium text-slate-700">{formData.gl_account_name || 'حساب صندوق مختار'}</div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">اختر حساب الصندوق من شجرة الحسابات...</span>
                                            )}
                                        </button>
                                        {formData.gl_account_id && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        gl_account_id: '',
                                                        gl_account_code: '',
                                                        gl_account_name: '',
                                                    }))
                                                }
                                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                                            >
                                                مسح الربط
                                            </button>
                                        )}
                                    </div>
                                    <p className="mt-3 text-xs text-slate-500">
                                        سيُنشأ هذا الصندوق كحساب فرعي تلقائيًا تحت الحساب المحدد، ويجب أن تكون عملة الحساب مطابقة لعملة الصندوق.
                                    </p>
                                    {selectedCurrency && (
                                        <p className="mt-1 text-xs font-medium text-cyan-700">
                                            العملة الحالية: {getCurrencyLabel(selectedCurrency)} ({selectedCurrency.code})
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-bold text-slate-600">ملاحظة</label>
                                    <textarea
                                        value={formData.note}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
                                        rows={4}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500"
                                        placeholder="أي تفاصيل إضافية عن هذا الصندوق"
                                    />
                                </div>

                                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(event) => setFormData((prev) => ({ ...prev, is_active: event.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    الصندوق فعال
                                </label>

                                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        حفظ الصندوق
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AccountPicker
                isOpen={accountPickerOpen}
                onClose={() => setAccountPickerOpen(false)}
                onSelect={(account: any) => {
                    setFormData((prev) => ({
                        ...prev,
                        gl_account_id: account.id,
                        gl_account_code: account.account_code || account.code || '',
                        gl_account_name: account.name_ar || account.name || account.name_en || '',
                    }));
                    setAccountPickerOpen(false);
                }}
                allowedPrefixes={['111']}
                currencyId={selectedCurrency?.code || formData.currency_code || formData.currency_id || null}
            />
        </div>
    );
}
