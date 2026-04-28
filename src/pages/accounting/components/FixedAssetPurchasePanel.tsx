import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, PackagePlus } from 'lucide-react';
import { DocumentAddonContext } from '../../../types/DocumentDefinition';
import {
    accountLabel,
    buildFixedAssetClearanceLines,
    buildFixedAssetPurchaseLines,
    PurchaseAccount,
    PurchaseSupplier,
    supplierLabel,
    supplierPayableAccountId,
    toMoney,
    unwrapIpcRows,
    validateFixedAssetPurchaseInput,
} from '../../../lib/fixedAssetPurchase';

type DepreciationMethod = 'StraightLine' | 'DecliningBalance';

type AssetCategory = {
    id: string;
    code?: string;
    name_ar?: string;
    name_en?: string;
    depreciation_method?: string;
    asset_account_id?: string;
    accumulated_depreciation_account_id?: string;
    depreciation_expense_account_id?: string;
};

type Draft = {
    code: string;
    name: string;
    categoryId: string;
    purchaseDate: string;
    supplierId: string;
    supplierInvoiceNo: string;
    supplierInvoiceAmount: string;
    clearanceCost: string;
    assetAccountId: string;
    supplierAccountId: string;
    clearanceAccountId: string;
    salvageValue: string;
    lifeYears: string;
    depreciationMethod: DepreciationMethod;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyDraft = (): Draft => ({
    code: '',
    name: '',
    categoryId: '',
    purchaseDate: today(),
    supplierId: '',
    supplierInvoiceNo: '',
    supplierInvoiceAmount: '',
    clearanceCost: '0',
    assetAccountId: '',
    supplierAccountId: '',
    clearanceAccountId: '',
    salvageValue: '0',
    lifeYears: '5',
    depreciationMethod: 'StraightLine',
});

const INPUT = 'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/40 disabled:bg-slate-50';

export function FixedAssetPurchasePanel(context: DocumentAddonContext<any, any>) {
    const [draft, setDraft] = useState<Draft>(() => emptyDraft());
    const [categories, setCategories] = useState<AssetCategory[]>([]);
    const [accounts, setAccounts] = useState<PurchaseAccount[]>([]);
    const [suppliers, setSuppliers] = useState<PurchaseSupplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const api = (window as any).electronAPI;
                const [categoryRows, accountRows, supplierRows] = await Promise.all([
                    api?.getAssetCategories ? api.getAssetCategories() : Promise.resolve([]),
                    api?.getAccounts ? api.getAccounts() : Promise.resolve([]),
                    api?.vendor?.list ? api.vendor.list({ search: '', isActive: true, limit: 200, offset: 0 }) : Promise.resolve([]),
                ]);
                if (cancelled) return;
                setCategories(unwrapIpcRows<AssetCategory>(categoryRows));
                setAccounts(unwrapIpcRows<PurchaseAccount>(accountRows));
                setSuppliers(unwrapIpcRows<PurchaseSupplier>(supplierRows));
            } catch (err) {
                console.error('Failed to load fixed asset purchase lookups', err);
                if (!cancelled) setError('تعذر تحميل بيانات شراء الأصل.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, []);

    const accountMap = useMemo(() => new Map(accounts.map((account) => [String(account.id || ''), account])), [accounts]);
    const supplierMap = useMemo(() => new Map(suppliers.map((supplier) => [String(supplier.id || ''), supplier])), [suppliers]);
    const selectedSupplier = supplierMap.get(draft.supplierId) || null;
    const selectedCategory = categories.find((category) => category.id === draft.categoryId) || null;
    const supplierAmount = Math.max(0, toMoney(draft.supplierInvoiceAmount));
    const clearanceAmount = Math.max(0, toMoney(draft.clearanceCost));
    const totalCost = supplierAmount + clearanceAmount;
    const previewInput = {
        assetCode: draft.code.trim(),
        assetName: draft.name.trim(),
        purchaseDate: draft.purchaseDate,
        assetAccountId: draft.assetAccountId,
        assetAccount: accountMap.get(draft.assetAccountId),
        supplierId: draft.supplierId,
        supplier: selectedSupplier,
        supplierAccountId: draft.supplierAccountId,
        supplierAccount: accountMap.get(draft.supplierAccountId),
        supplierInvoiceNo: draft.supplierInvoiceNo,
        supplierInvoiceAmount: supplierAmount,
        clearanceCost: clearanceAmount,
        clearanceAccountId: draft.clearanceAccountId || null,
        clearanceAccount: accountMap.get(draft.clearanceAccountId),
    };
    const purchaseLines = buildFixedAssetPurchaseLines(previewInput);
    const clearanceLines = buildFixedAssetClearanceLines(previewInput);

    const setField = (field: keyof Draft, value: string) => {
        setDraft((prev) => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (categoryId: string) => {
        const category = categories.find((item) => item.id === categoryId);
        setDraft((prev) => ({
            ...prev,
            categoryId,
            depreciationMethod: normalizeMethod(category?.depreciation_method || prev.depreciationMethod),
            assetAccountId: category?.asset_account_id || prev.assetAccountId,
        }));
    };

    const handleSupplierChange = (supplierId: string) => {
        const supplier = supplierMap.get(supplierId);
        setDraft((prev) => ({
            ...prev,
            supplierId,
            supplierAccountId: supplierPayableAccountId(supplier) || prev.supplierAccountId,
        }));
    };

    const resetDraft = () => {
        setDraft(emptyDraft());
    };

    const createAssetOnly = async () => {
        if (context.isReadOnly) return;
        setError('');
        setMessage('');

        const validation = validateFixedAssetPurchaseInput(previewInput);
        if (validation) {
            setError(validation);
            return;
        }

        try {
            setSaving(true);
            await (window as any).electronAPI.fixedAssets.create({
                code: draft.code.trim(),
                name: draft.name.trim(),
                categoryId: draft.categoryId || null,
                purchaseDate: draft.purchaseDate,
                purchaseCost: totalCost,
                supplierId: draft.supplierId || null,
                supplierAccountId: draft.supplierAccountId || null,
                supplierInvoiceNo: draft.supplierInvoiceNo || null,
                supplierInvoiceAmount: supplierAmount,
                clearanceCost: clearanceAmount,
                clearanceAccountId: draft.clearanceAccountId || null,
                assetAccountId: draft.assetAccountId || null,
                accumulatedDepAccountId: selectedCategory?.accumulated_depreciation_account_id || null,
                depExpenseAccountId: selectedCategory?.depreciation_expense_account_id || null,
                salvageValue: toMoney(draft.salvageValue),
                lifeYears: Math.max(1, toMoney(draft.lifeYears)),
                depreciationMethod: draft.depreciationMethod,
                purchaseJournalId: context.docId || null,
                purchaseJournalNo: context.header?.voucher_no || null,
            });
            setMessage(`تم إنشاء الأصل ${draft.code}.`);
            resetDraft();
        } catch (err: any) {
            setError(err?.message || 'تعذر إنشاء الأصل.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm" dir="rtl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><PackagePlus size={18} /></span>
                    <div>
                        <h2 className="text-sm font-extrabold text-slate-900">تعريف أصل ثابت داخل سند القيد</h2>
                        <p className="text-xs font-medium text-slate-500">إجمالي تكلفة الأصل: <span className="font-mono text-slate-900">{totalCost.toFixed(2)}</span></p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={createAssetOnly}
                    disabled={context.isReadOnly || loading || saving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
                    إنشاء الأصل
                </button>
            </div>

            {error && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
            {message && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-700">
                    <CheckCircle2 size={16} />
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="رمز الأصل">
                    <input className={INPUT} value={draft.code} disabled={context.isReadOnly || loading} onChange={(event) => setField('code', event.target.value.toUpperCase())} dir="ltr" placeholder="AST-0001" />
                </Field>
                <Field label="اسم الأصل">
                    <input className={INPUT} value={draft.name} disabled={context.isReadOnly || loading} onChange={(event) => setField('name', event.target.value)} />
                </Field>
                <Field label="مجموعة الأصل">
                    <select className={INPUT} value={draft.categoryId} disabled={context.isReadOnly || loading} onChange={(event) => handleCategoryChange(event.target.value)}>
                        <option value="">بدون مجموعة</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>{[category.code, category.name_ar || category.name_en].filter(Boolean).join(' - ')}</option>
                        ))}
                    </select>
                </Field>
                <Field label="تاريخ الشراء">
                    <input type="date" className={INPUT} value={draft.purchaseDate} disabled={context.isReadOnly || loading} onChange={(event) => setField('purchaseDate', event.target.value)} />
                </Field>
                <Field label="المورد">
                    <select className={INPUT} value={draft.supplierId} disabled={context.isReadOnly || loading} onChange={(event) => handleSupplierChange(event.target.value)}>
                        <option value="">اختر المورد</option>
                        {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>{supplierLabel(supplier)}</option>
                        ))}
                    </select>
                </Field>
                <Field label="رقم فاتورة المورد">
                    <input className={INPUT} value={draft.supplierInvoiceNo} disabled={context.isReadOnly || loading} onChange={(event) => setField('supplierInvoiceNo', event.target.value)} />
                </Field>
                <Field label="قيمة فاتورة المورد">
                    <input type="number" min="0" step="0.01" className={INPUT} value={draft.supplierInvoiceAmount} disabled={context.isReadOnly || loading} onChange={(event) => setField('supplierInvoiceAmount', event.target.value)} />
                </Field>
                <Field label="مصاريف التخليص">
                    <input type="number" min="0" step="0.01" className={INPUT} value={draft.clearanceCost} disabled={context.isReadOnly || loading} onChange={(event) => setField('clearanceCost', event.target.value)} />
                </Field>
                <Field label="حساب الأصل">
                    <select className={INPUT} value={draft.assetAccountId} disabled={context.isReadOnly || loading} onChange={(event) => setField('assetAccountId', event.target.value)}>
                        <option value="">اختر الحساب</option>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
                    </select>
                </Field>
                <Field label="حساب المورد الدائن">
                    <select className={INPUT} value={draft.supplierAccountId} disabled={context.isReadOnly || loading} onChange={(event) => setField('supplierAccountId', event.target.value)}>
                        <option value="">اختر الحساب</option>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
                    </select>
                </Field>
                <Field label="حساب دائن التخليص">
                    <select className={INPUT} value={draft.clearanceAccountId} disabled={context.isReadOnly || loading} onChange={(event) => setField('clearanceAccountId', event.target.value)}>
                        <option value="">بدون تخليص</option>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
                    </select>
                </Field>
                <Field label="العمر الإنتاجي/سنة">
                    <input type="number" min="1" step="1" className={INPUT} value={draft.lifeYears} disabled={context.isReadOnly || loading} onChange={(event) => setField('lifeYears', event.target.value)} />
                </Field>
            </div>

            <div className="mt-5 space-y-4">
                <JournalPreviewTable title="جدول قيد شراء الأصل" rows={purchaseLines} />
                <JournalPreviewTable title="جدول قيد مصاريف التخليص مستقل" rows={clearanceLines} emptyMessage="لا توجد مصاريف تخليص." />
            </div>
        </section>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
            {children}
        </label>
    );
}

function JournalPreviewTable({ title, rows, emptyMessage }: { title: string; rows: any[]; emptyMessage?: string }) {
    const totalDebit = rows.reduce((sum, row) => sum + toMoney(row?.debit), 0);
    const totalCredit = rows.reduce((sum, row) => sum + toMoney(row?.credit), 0);

    return (
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
            <div className="border-b border-amber-100 bg-amber-100/60 px-3 py-2 text-sm font-black text-slate-800">{title}</div>
            {rows.length === 0 ? (
                <div className="px-3 py-5 text-center text-sm text-slate-400">{emptyMessage || 'لا توجد بيانات.'}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[840px] border-collapse text-right text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                            <tr>
                                <th className="border border-slate-200 px-2 py-2">رقم الحساب</th>
                                <th className="border border-slate-200 px-2 py-2">اسم الحساب</th>
                                <th className="border border-slate-200 px-2 py-2">المرجع</th>
                                <th className="border border-slate-200 px-2 py-2">البيان</th>
                                <th className="border border-slate-200 px-2 py-2">مدين</th>
                                <th className="border border-slate-200 px-2 py-2">دائن</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={`${row.account_id}-${index}`}>
                                    <td className="border border-slate-200 px-2 py-2 font-mono">{row.account_code_lookup || row.account_id || '-'}</td>
                                    <td className="border border-slate-200 px-2 py-2">{row.account_name || '-'}</td>
                                    <td className="border border-slate-200 px-2 py-2 font-mono">{row.invoice_ref || '-'}</td>
                                    <td className="border border-slate-200 px-2 py-2">{row.description || '-'}</td>
                                    <td className="border border-slate-200 px-2 py-2 font-mono font-bold">{row.debit ? toMoney(row.debit).toFixed(2) : ''}</td>
                                    <td className="border border-slate-200 px-2 py-2 font-mono font-bold">{row.credit ? toMoney(row.credit).toFixed(2) : ''}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 font-black">
                                <td className="border border-slate-200 px-2 py-2" colSpan={4}>الإجمالي</td>
                                <td className="border border-slate-200 px-2 py-2 font-mono">{totalDebit.toFixed(2)}</td>
                                <td className="border border-slate-200 px-2 py-2 font-mono">{totalCredit.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function normalizeMethod(value?: string): DepreciationMethod {
    if (value === 'Declining Balance' || value === 'DecliningBalance') return 'DecliningBalance';
    return 'StraightLine';
}
