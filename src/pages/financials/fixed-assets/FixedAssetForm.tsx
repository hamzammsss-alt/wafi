import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    Calculator,
    CheckCircle2,
    CreditCard,
    FilePlus2,
    Landmark,
    List,
    Loader2,
    Package,
    Save,
    TrendingDown,
} from 'lucide-react';
import { Account } from '../../../../types';
import {
    PurchaseSupplier,
    supplierLabel,
    supplierPayableAccountId,
    unwrapIpcRows,
} from '../../../lib/fixedAssetPurchase';

type DepreciationMethod = 'StraightLine' | 'DecliningBalance';
type AssetStatus = 'Active' | 'Disposed' | 'FullyDepreciated';

type AssetCategory = {
    id: string;
    code?: string;
    name_ar?: string;
    name_en?: string;
    depreciation_method?: string;
    depreciation_rate?: number;
    asset_account_id?: string;
    accumulated_depreciation_account_id?: string;
    depreciation_expense_account_id?: string;
};

interface FormData {
    code: string;
    name: string;
    categoryId: string;
    purchaseDate: string;
    purchaseCost: string;
    supplierId: string;
    supplierAccountId: string;
    supplierInvoiceNo: string;
    supplierInvoiceAmount: string;
    clearanceCost: string;
    clearanceAccountId: string;
    purchaseJournalNo: string;
    clearanceJournalNo: string;
    salvageValue: string;
    lifeYears: string;
    depreciationMethod: DepreciationMethod;
    assetAccountId: string;
    accumulatedDepAccountId: string;
    depExpenseAccountId: string;
    status: AssetStatus;
}

type Tab = 'definition' | 'schedule';

const today = () => new Date().toISOString().split('T')[0];

const EMPTY: FormData = {
    code: '',
    name: '',
    categoryId: '',
    purchaseDate: today(),
    purchaseCost: '',
    supplierId: '',
    supplierAccountId: '',
    supplierInvoiceNo: '',
    supplierInvoiceAmount: '',
    clearanceCost: '0',
    clearanceAccountId: '',
    purchaseJournalNo: '',
    clearanceJournalNo: '',
    salvageValue: '0',
    lifeYears: '',
    depreciationMethod: 'StraightLine',
    assetAccountId: '',
    accumulatedDepAccountId: '',
    depExpenseAccountId: '',
    status: 'Active',
};

const STATUS_LABEL: Record<AssetStatus, string> = {
    Active: 'فعال',
    Disposed: 'مستبعد',
    FullyDepreciated: 'مستهلك بالكامل',
};

const METHOD_LABEL: Record<DepreciationMethod, string> = {
    StraightLine: 'القسط الثابت',
    DecliningBalance: 'القسط المتناقص',
};

const fmt = (value: number) =>
    Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseAmount = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMethod = (value?: string): DepreciationMethod => {
    if (value === 'Declining Balance' || value === 'DecliningBalance') return 'DecliningBalance';
    return 'StraightLine';
};

const formatNumberInput = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return '';
    const rounded = Number(value.toFixed(2));
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const lifeYearsFromRate = (rate?: number) => {
    const parsedRate = Number(rate || 0);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) return '';
    return formatNumberInput(100 / parsedRate);
};

const accountDisplay = (account?: Account) => {
    if (!account) return '';
    const code = account.account_code || account.code || '';
    const name = account.name_ar || account.name || '';
    return [code, name].filter(Boolean).join(' - ');
};

const accountCodeDisplay = (account?: Account, fallback = '') => account?.account_code || account?.code || fallback;
const accountNameDisplay = (account?: Account) => account?.name_ar || account?.name || account?.name_en || '';

export function FixedAssetForm() {
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();

    const [form, setForm] = useState<FormData>(EMPTY);
    const [assetMeta, setAssetMeta] = useState<any>(null);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [categories, setCategories] = useState<AssetCategory[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [suppliers, setSuppliers] = useState<PurchaseSupplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('definition');
    const [calcResult, setCalcResult] = useState<{ yearly: string; monthly: string } | null>(null);
    const [postAmount, setPostAmount] = useState('');
    const [postDate, setPostDate] = useState(today());
    const [postLoading, setPostLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        let cancelled = false;

        const loadLookups = async () => {
            const api = window.electronAPI as any;
            const [categoryRows, accountRows, supplierRows] = await Promise.all([
                api.getAssetCategories ? api.getAssetCategories() : Promise.resolve([]),
                api.getAccounts ? api.getAccounts() : Promise.resolve([]),
                api.vendor?.list ? api.vendor.list({ search: '', isActive: true, limit: 200, offset: 0 }) : Promise.resolve([]),
            ]);

            if (cancelled) return;
            setCategories(unwrapIpcRows<AssetCategory>(categoryRows));
            setAccounts(unwrapIpcRows<Account>(accountRows));
            setSuppliers(unwrapIpcRows<PurchaseSupplier>(supplierRows));
        };

        const loadAsset = async () => {
            if (!id) return;
            const [asset, sched] = await Promise.all([
                window.electronAPI.fixedAssets.get(id),
                window.electronAPI.fixedAssets.getSchedule(id),
            ]);

            if (cancelled) return;
            setAssetMeta(asset);
            setSchedule(Array.isArray(sched) ? sched : []);
            setForm({
                code: asset.code || '',
                name: asset.name || '',
                categoryId: asset.categoryId || '',
                purchaseDate: asset.purchaseDate || today(),
                purchaseCost: String(asset.purchaseCost ?? ''),
                supplierId: asset.supplierId || '',
                supplierAccountId: asset.supplierAccountId || '',
                supplierInvoiceNo: asset.supplierInvoiceNo || '',
                supplierInvoiceAmount: String(asset.supplierInvoiceAmount ?? ''),
                clearanceCost: String(asset.clearanceCost ?? '0'),
                clearanceAccountId: asset.clearanceAccountId || '',
                purchaseJournalNo: asset.purchaseJournalNo || '',
                clearanceJournalNo: asset.clearanceJournalNo || '',
                salvageValue: String(asset.salvageValue ?? '0'),
                lifeYears: asset.lifeYears ? String(asset.lifeYears) : '',
                depreciationMethod: normalizeMethod(asset.depreciationMethod),
                assetAccountId: asset.assetAccountId || '',
                accumulatedDepAccountId: asset.accumulatedDepAccountId || '',
                depExpenseAccountId: asset.depExpenseAccountId || '',
                status: asset.status || 'Active',
            });

            if (asset.purchaseCost && Number(asset.lifeYears) > 0) {
                const result = await window.electronAPI.fixedAssets.calcDepreciation(id);
                if (!cancelled) {
                    setCalcResult(result);
                    setPostAmount(result.monthly);
                }
            }
        };

        const loadPage = async () => {
            setLoading(true);
            setError('');
            try {
                await Promise.all([loadLookups(), loadAsset()]);
            } catch (err) {
                console.error('Failed to load fixed asset page', err);
                setError('تعذر تحميل بيانات شاشة الأصل الثابت.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void loadPage();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const selectedCategory = useMemo(
        () => categories.find((category) => category.id === form.categoryId) || null,
        [categories, form.categoryId],
    );
    const selectedSupplier = useMemo(
        () => suppliers.find((supplier) => supplier.id === form.supplierId) || null,
        [suppliers, form.supplierId],
    );
    const accountById = useMemo(
        () => new Map(accounts.map((account) => [String(account.id || ''), account])),
        [accounts],
    );

    const purchaseCost = parseAmount(form.purchaseCost);
    const clearanceCost = parseAmount(form.clearanceCost);
    const enteredSupplierInvoiceAmount = parseAmount(form.supplierInvoiceAmount);
    const supplierInvoiceAmount = enteredSupplierInvoiceAmount > 0
        ? enteredSupplierInvoiceAmount
        : Math.max(0, purchaseCost - clearanceCost);
    const salvageValue = parseAmount(form.salvageValue);
    const rawLifeYears = parseAmount(form.lifeYears);
    const hasDepreciationDetails = Boolean(form.categoryId);
    const lifeYears = hasDepreciationDetails && rawLifeYears > 0 ? rawLifeYears : 0;
    const depreciationRate = lifeYears > 0 ? Number((100 / lifeYears).toFixed(2)) : 0;
    const categoryRate = Number(selectedCategory?.depreciation_rate || 0);
    const depreciableAmount = Math.max(0, purchaseCost - salvageValue);
    const estimatedAnnual = hasDepreciationDetails && lifeYears > 0
        ? (form.depreciationMethod === 'DecliningBalance'
            ? purchaseCost * (2 / lifeYears)
            : depreciableAmount / lifeYears)
        : 0;
    const estimatedMonthly = estimatedAnnual / 12;
    const netBookValue = Number(assetMeta?.bookValue ?? purchaseCost);
    const accumulatedDepreciation = Number(assetMeta?.accumulatedDepreciation ?? 0);
    const purchaseJournalRows = [
        {
            accountId: accountCodeDisplay(accountById.get(form.assetAccountId), form.assetAccountId),
            accountName: accountNameDisplay(accountById.get(form.assetAccountId)),
            referenceNo: form.supplierInvoiceNo || form.code || '-',
            referenceName: form.name || '-',
            currency: 'NIS',
            value: supplierInvoiceAmount,
            debit: supplierInvoiceAmount,
            credit: 0,
        },
        {
            accountId: accountCodeDisplay(accountById.get(form.supplierAccountId), form.supplierAccountId),
            accountName: accountNameDisplay(accountById.get(form.supplierAccountId)),
            referenceNo: form.supplierInvoiceNo || form.code || '-',
            referenceName: supplierLabel(selectedSupplier) || 'المورد',
            currency: 'NIS',
            value: supplierInvoiceAmount,
            debit: 0,
            credit: supplierInvoiceAmount,
        },
    ];
    const clearanceJournalRows = clearanceCost > 0 ? [
        {
            accountId: accountCodeDisplay(accountById.get(form.assetAccountId), form.assetAccountId),
            accountName: accountNameDisplay(accountById.get(form.assetAccountId)),
            referenceNo: form.supplierInvoiceNo || form.code || '-',
            referenceName: form.name || '-',
            currency: 'NIS',
            value: clearanceCost,
            debit: clearanceCost,
            credit: 0,
        },
        {
            accountId: accountCodeDisplay(accountById.get(form.clearanceAccountId), form.clearanceAccountId),
            accountName: accountNameDisplay(accountById.get(form.clearanceAccountId)),
            referenceNo: form.supplierInvoiceNo || form.code || '-',
            referenceName: 'مصاريف التخليص',
            currency: 'NIS',
            value: clearanceCost,
            debit: 0,
            credit: clearanceCost,
        },
    ] : [];

    const setField = (field: keyof FormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (['categoryId', 'purchaseCost', 'salvageValue', 'lifeYears', 'depreciationMethod'].includes(field)) {
            setCalcResult(null);
        }
    };

    const handleCategoryChange = (categoryId: string) => {
        const category = categories.find((item) => item.id === categoryId);
        setForm((prev) => ({
            ...prev,
            categoryId,
            depreciationMethod: category ? normalizeMethod(category.depreciation_method) : prev.depreciationMethod,
            lifeYears: category && !prev.lifeYears ? lifeYearsFromRate(category.depreciation_rate) : prev.lifeYears,
            assetAccountId: category?.asset_account_id || prev.assetAccountId,
            accumulatedDepAccountId: category?.accumulated_depreciation_account_id || prev.accumulatedDepAccountId,
            depExpenseAccountId: category?.depreciation_expense_account_id || prev.depExpenseAccountId,
        }));
        setCalcResult(null);
    };

    const applyCategoryDepreciation = () => {
        if (!selectedCategory) return;
        setForm((prev) => ({
            ...prev,
            depreciationMethod: normalizeMethod(selectedCategory.depreciation_method),
            lifeYears: lifeYearsFromRate(selectedCategory.depreciation_rate) || prev.lifeYears,
        }));
        setCalcResult(null);
    };

    const handleDepreciationRateChange = (value: string) => {
        const rate = Number(value);
        setForm((prev) => ({
            ...prev,
            lifeYears: Number.isFinite(rate) && rate > 0 ? formatNumberInput(100 / rate) : '',
        }));
        setCalcResult(null);
    };

    const handleSupplierChange = (supplierId: string) => {
        const supplier = suppliers.find((item) => item.id === supplierId);
        setForm((prev) => ({
            ...prev,
            supplierId,
            supplierAccountId: supplierPayableAccountId(supplier) || prev.supplierAccountId,
        }));
    };

    const validate = () => {
        if (!form.code.trim()) return 'رمز الأصل مطلوب.';
        if (!form.name.trim()) return 'اسم الأصل مطلوب.';
        if (!form.purchaseDate) return 'تاريخ الشراء مطلوب.';
        if (purchaseCost <= 0) return 'تكلفة الشراء يجب أن تكون أكبر من صفر.';
        if (clearanceCost < 0) return 'مصاريف التخليص لا يمكن أن تكون سالبة.';
        if (clearanceCost > purchaseCost) return 'مصاريف التخليص لا يمكن أن تتجاوز تكلفة الأصل.';
        if (enteredSupplierInvoiceAmount > 0 && Math.abs((enteredSupplierInvoiceAmount + clearanceCost) - purchaseCost) > 0.0001) {
            return 'قيمة فاتورة المورد ومصاريف التخليص يجب أن تساوي تكلفة الأصل المرسملة.';
        }
        if (salvageValue < 0) return 'القيمة التخريدية لا يمكن أن تكون سالبة.';
        if (salvageValue > purchaseCost) return 'القيمة التخريدية لا يمكن أن تتجاوز تكلفة الشراء.';
        if (form.lifeYears.trim() && rawLifeYears <= 0) return 'العمر الإنتاجي يجب أن يكون أكبر من صفر.';
        return '';
    };

    const handleSave = async () => {
        const validationError = validate();
        setError(validationError);
        setSuccess('');
        if (validationError) return;

        try {
            setSaving(true);
            const payload = {
                ...form,
                categoryId: form.categoryId || null,
                assetAccountId: form.assetAccountId || null,
                accumulatedDepAccountId: form.accumulatedDepAccountId || null,
                depExpenseAccountId: form.depExpenseAccountId || null,
                purchaseCost,
                supplierId: form.supplierId || null,
                supplierAccountId: form.supplierAccountId || null,
                supplierInvoiceNo: form.supplierInvoiceNo || null,
                supplierInvoiceAmount,
                clearanceCost,
                clearanceAccountId: form.clearanceAccountId || null,
                purchaseJournalNo: form.purchaseJournalNo || null,
                clearanceJournalNo: form.clearanceJournalNo || null,
                salvageValue,
                lifeYears,
            };

            if (isEdit && id) {
                await window.electronAPI.fixedAssets.update(id, payload);
                setSuccess('تم حفظ تعديلات الأصل بنجاح.');
                const [loadedAsset, sched] = await Promise.all([
                    window.electronAPI.fixedAssets.get(id),
                    window.electronAPI.fixedAssets.getSchedule(id),
                ]);
                setAssetMeta(loadedAsset);
                setSchedule(Array.isArray(sched) ? sched : []);
            } else {
                const asset = await window.electronAPI.fixedAssets.create(payload);
                setSuccess('تم إنشاء تعريف الأصل بنجاح.');
                navigate(`/assets/register/${asset.id}`, { replace: true });
            }
        } catch (err: any) {
            setError(err?.message || 'تعذر حفظ تعريف الأصل.');
        } finally {
            setSaving(false);
        }
    };

    const handleCalc = async () => {
        if (!hasDepreciationDetails || lifeYears <= 0) {
            setError('أدخل العمر الإنتاجي أو احتسبه حسب نسبة مجموعة الأصول.');
            return;
        }

        setError('');

        if (!id) {
            setCalcResult({
                yearly: estimatedAnnual.toFixed(2),
                monthly: estimatedMonthly.toFixed(2),
            });
            return;
        }

        try {
            const result = await window.electronAPI.fixedAssets.calcDepreciation(id);
            setCalcResult(result);
            setPostAmount(result.monthly);
        } catch (err: any) {
            setError(err?.message || 'تعذر احتساب الإهلاك.');
        }
    };

    const handlePostDepreciation = async () => {
        if (!id || !postAmount || !postDate) return;
        const amount = Number(postAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('أدخل مبلغ إهلاك صحيح أكبر من صفر.');
            return;
        }

        try {
            setPostLoading(true);
            setError('');
            const updated = await window.electronAPI.fixedAssets.postDepreciation(id, amount, postDate);
            const newSchedule = await window.electronAPI.fixedAssets.getSchedule(id);
            setAssetMeta(updated);
            setSchedule(Array.isArray(newSchedule) ? newSchedule : []);
            setSuccess(`تم ترحيل إهلاك بقيمة ${fmt(amount)} بتاريخ ${postDate}.`);
        } catch (err: any) {
            setError(err?.message || 'تعذر ترحيل قيد الإهلاك.');
        } finally {
            setPostLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={36} />
            </div>
        );
    }

    return (
        <div className="app-page" dir="rtl">

            {error && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 size={18} />
                    <span>{success}</span>
                </div>
            )}

            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-900">
                            {isEdit ? 'تعديل تعريف أصل ثابت' : 'تعريف أصل ثابت جديد'}
                        </h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            إدخال بيانات الأصل وقيمته وربط الحسابات وسياسة الإهلاك من شاشة واحدة.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                                تكلفة الشراء {fmt(purchaseCost)}
                            </span>
                            <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                القيمة الدفترية {fmt(netBookValue)}
                            </span>
                            {isEdit && (
                                <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                                    {STATUS_LABEL[form.status]}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => navigate('/assets/register')}
                            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            <ArrowRight size={16} />
                            <span>رجوع للسجل</span>
                        </button>
                        <button
                            id="btn-save"
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-70"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ الأصل'}</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <TabButton active={activeTab === 'definition'} onClick={() => setActiveTab('definition')} icon={<Package size={16} />} label="بيانات الأصل" />
                    <TabButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<TrendingDown size={16} />} label={`جدول الإهلاك (${schedule.length})`} disabled={!isEdit} />
                </div>
            </div>

            {activeTab === 'definition' && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-5">
                        <Section title="البيانات الأساسية" icon={<Package size={18} />}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="رمز الأصل" required>
                                    <input id="field-code" className={INPUT} value={form.code} onChange={(event) => setField('code', event.target.value.toUpperCase())} placeholder="AST-0001" dir="ltr" />
                                </Field>
                                <Field label="اسم الأصل" required>
                                    <input id="field-name" className={INPUT} value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="مثال: جهاز حاسوب إداري" />
                                </Field>
                                <Field label="مجموعة الأصل">
                                    <select className={INPUT} value={form.categoryId} onChange={(event) => handleCategoryChange(event.target.value)}>
                                        <option value="">بدون مجموعة</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {[category.code, category.name_ar || category.name_en].filter(Boolean).join(' - ')}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                {isEdit && (
                                    <Field label="الحالة">
                                        <select className={INPUT} value={form.status} onChange={(event) => setField('status', event.target.value as AssetStatus)}>
                                            <option value="Active">فعال</option>
                                            <option value="Disposed">مستبعد</option>
                                            <option value="FullyDepreciated">مستهلك بالكامل</option>
                                        </select>
                                    </Field>
                                )}
                            </div>
                        </Section>

                        <Section title="الشراء والإهلاك" icon={<Calculator size={18} />}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <Field label="تاريخ الشراء" required>
                                    <input id="field-purchase-date" type="date" className={INPUT} value={form.purchaseDate} onChange={(event) => setField('purchaseDate', event.target.value)} />
                                </Field>
                                <Field label="تكلفة الشراء" required>
                                    <input id="field-purchase-cost" type="number" min="0" step="0.01" className={INPUT} value={form.purchaseCost} onChange={(event) => setField('purchaseCost', event.target.value)} placeholder="0.00" />
                                </Field>
                                <Field label="القيمة التخريدية">
                                    <input id="field-salvage" type="number" min="0" step="0.01" className={INPUT} value={form.salvageValue} onChange={(event) => setField('salvageValue', event.target.value)} placeholder="0.00" />
                                </Field>
                            </div>
                            {hasDepreciationDetails && (
                                <div className="mt-5 border-t border-slate-100 pt-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-sm font-black text-slate-800">تفاصيل الإهلاك</h3>
                                        <span className="text-xs font-bold text-slate-500">
                                            نسبة المجموعة {formatNumberInput(categoryRate) || '0'}%
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                                        <Field label="طريقة الإهلاك">
                                            <select id="field-method" className={INPUT} value={form.depreciationMethod} onChange={(event) => setField('depreciationMethod', event.target.value as DepreciationMethod)}>
                                                <option value="StraightLine">القسط الثابت</option>
                                                <option value="DecliningBalance">القسط المتناقص</option>
                                            </select>
                                        </Field>
                                        <Field label="العمر الإنتاجي/سنة">
                                            <input id="field-life" type="number" min="0" step="0.01" className={INPUT} value={form.lifeYears} onChange={(event) => setField('lifeYears', event.target.value)} placeholder="0" />
                                        </Field>
                                        <Field label="نسبة الإهلاك %">
                                            <input type="number" min="0" step="0.01" className={INPUT} value={depreciationRate ? formatNumberInput(depreciationRate) : ''} onChange={(event) => handleDepreciationRateChange(event.target.value)} placeholder={formatNumberInput(categoryRate) || '0.00'} />
                                        </Field>
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={applyCategoryDepreciation}
                                                disabled={!selectedCategory || categoryRate <= 0}
                                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Calculator size={16} />
                                                حسب نسبة المجموعة
                                            </button>
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                id="btn-calc"
                                                onClick={handleCalc}
                                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                                            >
                                                <Calculator size={16} />
                                                احتساب الإهلاك
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Section>

                        <Section title="جداول القيود اليدوية" icon={<FilePlus2 size={18} />}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Field label="المورد">
                                    <select className={INPUT} value={form.supplierId} onChange={(event) => handleSupplierChange(event.target.value)}>
                                        <option value="">بدون مورد</option>
                                        {suppliers.map((supplier) => (
                                            <option key={supplier.id} value={supplier.id}>{supplierLabel(supplier)}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="رقم فاتورة المورد">
                                    <input className={INPUT} value={form.supplierInvoiceNo} onChange={(event) => setField('supplierInvoiceNo', event.target.value)} placeholder="INV-0001" />
                                </Field>
                                <Field label="قيمة فاتورة المورد">
                                    <input type="number" min="0" step="0.01" className={INPUT} value={form.supplierInvoiceAmount} onChange={(event) => setField('supplierInvoiceAmount', event.target.value)} placeholder={fmt(Math.max(0, purchaseCost - clearanceCost))} />
                                </Field>
                                <Field label="مصاريف التخليص">
                                    <input type="number" min="0" step="0.01" className={INPUT} value={form.clearanceCost} onChange={(event) => setField('clearanceCost', event.target.value)} placeholder="0.00" />
                                </Field>
                                <Field label="حساب المورد الدائن">
                                    <select className={INPUT} value={form.supplierAccountId} onChange={(event) => setField('supplierAccountId', event.target.value)}>
                                        <option value="">غير محدد</option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>{accountDisplay(account)}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="حساب دائن التخليص">
                                    <select className={INPUT} value={form.clearanceAccountId} onChange={(event) => setField('clearanceAccountId', event.target.value)}>
                                        <option value="">بدون تخليص</option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>{accountDisplay(account)}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="رقم قيد شراء الأصل">
                                    <input className={INPUT} value={form.purchaseJournalNo} onChange={(event) => setField('purchaseJournalNo', event.target.value)} placeholder="JV-0001" dir="ltr" />
                                </Field>
                                <Field label="رقم قيد التخليص">
                                    <input className={INPUT} value={form.clearanceJournalNo} onChange={(event) => setField('clearanceJournalNo', event.target.value)} placeholder="JV-0002" dir="ltr" />
                                </Field>
                            </div>
                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                <Metric label="قيمة فاتورة المورد" value={fmt(supplierInvoiceAmount)} />
                                <Metric label="مصاريف التخليص" value={fmt(clearanceCost)} tone="blue" />
                                <Metric label="إجمالي تكلفة الأصل" value={fmt(supplierInvoiceAmount + clearanceCost)} tone={(Math.abs((supplierInvoiceAmount + clearanceCost) - purchaseCost) > 0.0001) ? 'red' : 'green'} />
                            </div>
                            <div className="mt-5 space-y-4">
                                <JournalPreviewTable title="جدول قيد شراء الأصل" rows={purchaseJournalRows} />
                                <JournalPreviewTable title="جدول قيد مصاريف التخليص مستقل" rows={clearanceJournalRows} emptyMessage="لا توجد مصاريف تخليص مسجلة لهذا الأصل." />
                            </div>
                        </Section>

                        <Section title="ربط الحسابات" icon={<Landmark size={18} />}>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <Field label="حساب الأصل">
                                    <select className={INPUT} value={form.assetAccountId} onChange={(event) => setField('assetAccountId', event.target.value)}>
                                        <option value="">غير محدد</option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>{accountDisplay(account)}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="حساب مجمع الإهلاك">
                                    <select className={INPUT} value={form.accumulatedDepAccountId} onChange={(event) => setField('accumulatedDepAccountId', event.target.value)}>
                                        <option value="">غير محدد</option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>{accountDisplay(account)}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="حساب مصروف الإهلاك">
                                    <select className={INPUT} value={form.depExpenseAccountId} onChange={(event) => setField('depExpenseAccountId', event.target.value)}>
                                        <option value="">غير محدد</option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>{accountDisplay(account)}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        </Section>
                    </div>

                    <aside className="space-y-5">
                        <Section title="ملخص الأصل" icon={<CreditCard size={18} />}>
                            <div className="space-y-3">
                                {hasDepreciationDetails && (
                                    <>
                                        <Metric label="القيمة القابلة للإهلاك" value={fmt(depreciableAmount)} />
                                        <Metric label="الإهلاك السنوي المتوقع" value={fmt(Number(calcResult?.yearly ?? estimatedAnnual))} tone="blue" />
                                        <Metric label="الإهلاك الشهري المتوقع" value={fmt(Number(calcResult?.monthly ?? estimatedMonthly))} tone="blue" />
                                        <Metric label="مجمع الإهلاك" value={fmt(accumulatedDepreciation)} tone="red" />
                                    </>
                                )}
                                <Metric label="القيمة الدفترية الحالية" value={fmt(netBookValue)} tone="green" />
                                {form.purchaseJournalNo && <Metric label="قيد شراء الأصل" value={form.purchaseJournalNo} tone="blue" />}
                                {form.clearanceJournalNo && <Metric label="قيد التخليص" value={form.clearanceJournalNo} tone="blue" />}
                            </div>
                        </Section>

                        {selectedCategory && (
                            <Section title="بيانات المجموعة" icon={<List size={18} />}>
                                <div className="space-y-2 text-sm text-slate-600">
                                    <div className="font-bold text-slate-800">{selectedCategory.name_ar || selectedCategory.name_en || '-'}</div>
                                    <div>الرمز: <span className="font-mono">{selectedCategory.code || '-'}</span></div>
                                    <div>طريقة الإهلاك: {METHOD_LABEL[normalizeMethod(selectedCategory.depreciation_method)]}</div>
                                    <div>نسبة المجموعة: {Number(selectedCategory.depreciation_rate || 0)}%</div>
                                </div>
                            </Section>
                        )}

                        {isEdit && (
                            <Section title="ترحيل الإهلاك" icon={<TrendingDown size={18} />}>
                                <div className="space-y-4">
                                    <Field label="تاريخ الفترة">
                                        <input type="date" className={INPUT} value={postDate} onChange={(event) => setPostDate(event.target.value)} />
                                    </Field>
                                    <Field label="مبلغ الإهلاك">
                                        <input type="number" min="0" step="0.01" className={INPUT} value={postAmount} onChange={(event) => setPostAmount(event.target.value)} placeholder="0.00" />
                                    </Field>
                                    <button
                                        type="button"
                                        onClick={handlePostDepreciation}
                                        disabled={postLoading || !postAmount || !postDate}
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-60"
                                    >
                                        {postLoading ? <Loader2 size={16} className="animate-spin" /> : <TrendingDown size={16} />}
                                        ترحيل قيد الإهلاك
                                    </button>
                                </div>
                            </Section>
                        )}
                    </aside>
                </div>
            )}

            {activeTab === 'schedule' && (
                <Section title="جدول الإهلاك المرحل" icon={<TrendingDown size={18} />}>
                    {schedule.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <List size={36} className="mb-2 opacity-40" />
                            <p>لا توجد قيود إهلاك مرحلة لهذا الأصل.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="dense-table w-full text-right">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3">#</th>
                                        <th className="px-4 py-3">تاريخ الفترة</th>
                                        <th className="px-4 py-3">المبلغ</th>
                                        <th className="px-4 py-3">تاريخ الإنشاء</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {schedule.map((row, index) => (
                                        <tr key={row.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                                            <td className="px-4 py-3 font-medium text-slate-800">{row.periodDate}</td>
                                            <td className="px-4 py-3 font-mono font-bold text-red-600">{fmt(Number(row.amount || 0))}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{String(row.createdAt || '').split('T')[0]}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-50 font-bold">
                                        <td className="px-4 py-3" colSpan={2}>الإجمالي</td>
                                        <td className="px-4 py-3 font-mono text-red-700">{fmt(schedule.reduce((sum, row) => sum + Number(row.amount || 0), 0))}</td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>
            )}
        </div>
    );
}

const INPUT = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </span>
            {children}
        </label>
    );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="text-blue-600">{icon}</span>
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'blue' | 'green' | 'red' }) {
    const colorClass = {
        slate: 'text-slate-900',
        blue: 'text-blue-700',
        green: 'text-emerald-700',
        red: 'text-red-600',
    }[tone];

    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold text-slate-500">{label}</div>
            <div className={`mt-1 font-mono text-lg font-black ${colorClass}`}>{value}</div>
        </div>
    );
}

type JournalPreviewRow = {
    accountId: string;
    accountName: string;
    referenceNo: string;
    referenceName: string;
    currency: string;
    value: number;
    debit: number;
    credit: number;
};

function JournalPreviewTable({ title, rows, emptyMessage }: { title: string; rows: JournalPreviewRow[]; emptyMessage?: string }) {
    const totalDebit = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
    const totalCredit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-800">{title}</div>
            {rows.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-400">{emptyMessage || 'لا توجد بيانات.'}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[840px] border-collapse text-right text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                            <tr>
                                <th className="border border-slate-200 px-2 py-2">رقم الحساب</th>
                                <th className="border border-slate-200 px-2 py-2">اسم الحساب</th>
                                <th className="border border-slate-200 px-2 py-2">رقم المرجع</th>
                                <th className="border border-slate-200 px-2 py-2">اسم المرجع</th>
                                <th className="border border-slate-200 px-2 py-2">العملة</th>
                                <th className="border border-slate-200 px-2 py-2">القيمة</th>
                                <th className="border border-slate-200 px-2 py-2">مدين</th>
                                <th className="border border-slate-200 px-2 py-2">دائن</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={`${row.accountId}-${index}`} className="bg-white">
                                    <td className="border border-slate-200 px-2 py-2 font-mono">{row.accountId || '-'}</td>
                                    <td className="border border-slate-200 px-2 py-2">{row.accountName || '-'}</td>
                                    <td className="border border-slate-200 px-2 py-2 font-mono">{row.referenceNo || '-'}</td>
                                    <td className="border border-slate-200 px-2 py-2">{row.referenceName || '-'}</td>
                                    <td className="border border-slate-200 px-2 py-2 font-mono">{row.currency}</td>
                                    <td className="border border-slate-200 px-2 py-2 font-mono">{fmt(row.value)}</td>
                                    <td className="border border-slate-200 px-2 py-2 font-mono font-bold">{row.debit ? fmt(row.debit) : ''}</td>
                                    <td className="border border-slate-200 px-2 py-2 font-mono font-bold">{row.credit ? fmt(row.credit) : ''}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 font-black">
                                <td className="border border-slate-200 px-2 py-2" colSpan={6}>الإجمالي</td>
                                <td className="border border-slate-200 px-2 py-2 font-mono">{fmt(totalDebit)}</td>
                                <td className="border border-slate-200 px-2 py-2 font-mono">{fmt(totalCredit)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function TabButton({ active, disabled, icon, label, onClick }: { active: boolean; disabled?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}
