import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileMinus, FilePlus, ReceiptText, Save, Send, X } from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

type NoteType = 'CREDIT' | 'DEBIT';
type NoteStatus = 'DRAFT' | 'POSTED' | 'VOID';

type SelectOption = {
    value: string;
    label: string;
};

type CreditDebitNoteRow = {
    id: string;
    note_no: string;
    note_type: NoteType;
    note_date: string;
    customer_id: string;
    customer_name: string;
    invoice_no: string;
    reason: string;
    currency_code: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: NoteStatus;
    notes: string;
    created_at: string;
};

type NoteFormState = {
    id?: string;
    note_no: string;
    note_type: NoteType;
    note_date: string;
    customer_id: string;
    customer_name: string;
    invoice_no: string;
    reason: string;
    currency_code: string;
    subtotal: string;
    tax_amount: string;
    notes: string;
};

const STORAGE_KEY = 'wafi:sales-credit-debit-notes:v1';
const DEFAULT_CURRENCIES: SelectOption[] = [
    { value: 'ILS', label: 'ILS' },
    { value: 'USD', label: 'USD' },
    { value: 'JOD', label: 'JOD' },
    { value: 'EUR', label: 'EUR' },
];

const REASON_OPTIONS: SelectOption[] = [
    { value: 'RETURN', label: 'مرتجع مبيعات' },
    { value: 'PRICE_DIFF', label: 'فرق سعر' },
    { value: 'DISCOUNT', label: 'خصم إضافي' },
    { value: 'TAX_CORRECTION', label: 'تصحيح ضريبي' },
    { value: 'MANUAL', label: 'تسوية يدوية' },
];

const STATUS_OPTIONS: Array<{ value: NoteStatus; label: string }> = [
    { value: 'DRAFT', label: 'مسودة' },
    { value: 'POSTED', label: 'مرحل' },
    { value: 'VOID', label: 'ملغى' },
];

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function makeId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown) {
    return toNumber(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: unknown) {
    if (!value) return '-';
    const raw = String(value);
    return raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || raw;
}

function getTypeLabel(type: unknown) {
    return String(type || '').toUpperCase() === 'DEBIT' ? 'إشعار مدين' : 'إشعار دائن';
}

function getStatusLabel(status: unknown) {
    const value = String(status || '').toUpperCase();
    return STATUS_OPTIONS.find((option) => option.value === value)?.label || String(status || '-') || '-';
}

function getStatusClass(status: unknown) {
    const value = String(status || '').toUpperCase();
    if (value === 'POSTED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (value === 'VOID') return 'bg-stone-100 text-stone-700 border-stone-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
}

function getReasonLabel(reason: unknown) {
    const value = String(reason || '');
    return REASON_OPTIONS.find((option) => option.value === value)?.label || value || '-';
}

function readStoredRows(): CreditDebitNoteRow[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStoredRows(rows: CreditDebitNoteRow[]) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function nextNoteNo(rows: CreditDebitNoteRow[], type: NoteType) {
    const prefix = type === 'DEBIT' ? 'DN' : 'CN';
    const year = new Date().getFullYear();
    const maxSequence = rows.reduce((max, row) => {
        const match = String(row.note_no || '').match(new RegExp(`^${prefix}-${year}-(\\d+)$`));
        return match ? Math.max(max, Number(match[1] || 0)) : max;
    }, 0);
    return `${prefix}-${year}-${String(maxSequence + 1).padStart(4, '0')}`;
}

function createEmptyForm(rows: CreditDebitNoteRow[], type: NoteType = 'CREDIT'): NoteFormState {
    return {
        note_no: nextNoteNo(rows, type),
        note_type: type,
        note_date: todayIso(),
        customer_id: '',
        customer_name: '',
        invoice_no: '',
        reason: 'RETURN',
        currency_code: 'ILS',
        subtotal: '',
        tax_amount: '',
        notes: '',
    };
}

function rowToForm(row: CreditDebitNoteRow): NoteFormState {
    return {
        id: row.id,
        note_no: row.note_no,
        note_type: row.note_type,
        note_date: row.note_date,
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        invoice_no: row.invoice_no,
        reason: row.reason,
        currency_code: row.currency_code,
        subtotal: String(row.subtotal || ''),
        tax_amount: String(row.tax_amount || ''),
        notes: row.notes || '',
    };
}

function normalizeForm(form: NoteFormState, status: NoteStatus): CreditDebitNoteRow {
    const subtotal = toNumber(form.subtotal);
    const taxAmount = toNumber(form.tax_amount);
    return {
        id: form.id || makeId(),
        note_no: String(form.note_no || '').trim(),
        note_type: form.note_type,
        note_date: form.note_date || todayIso(),
        customer_id: String(form.customer_id || '').trim(),
        customer_name: String(form.customer_name || '').trim(),
        invoice_no: String(form.invoice_no || '').trim(),
        reason: String(form.reason || 'MANUAL').trim(),
        currency_code: String(form.currency_code || 'ILS').trim().toUpperCase(),
        subtotal,
        tax_amount: taxAmount,
        total_amount: subtotal + taxAmount,
        status,
        notes: String(form.notes || '').trim(),
        created_at: new Date().toISOString(),
    };
}

function FormField({
    label,
    children,
    className = '',
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <label className={`grid gap-1.5 text-sm font-semibold text-slate-700 ${className}`}>
            <span>{label}</span>
            {children}
        </label>
    );
}

export default function CreditDebitNotesPage() {
    const [rows, setRows] = useState<CreditDebitNoteRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<SelectOption[]>([]);
    const [currencies, setCurrencies] = useState<SelectOption[]>(DEFAULT_CURRENCIES);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<NoteFormState>(() => createEmptyForm([]));

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            setRows(readStoredRows());
            const [partnerRows, currencyRows] = await Promise.all([
                (window as any)?.electronAPI?.partner?.getPartners?.('CUSTOMER').catch?.(() => []) || Promise.resolve([]),
                (window as any)?.electronAPI?.currency?.getCurrencies?.().catch?.(() => []) || Promise.resolve([]),
            ]);

            if (Array.isArray(partnerRows)) {
                setCustomers(partnerRows
                    .map((row: any) => ({
                        value: String(row.id || ''),
                        label: String(row.name_ar || row.customer_name_ar || row.name_en || row.name || row.code || ''),
                    }))
                    .filter((option: SelectOption) => option.value && option.label));
            }

            if (Array.isArray(currencyRows) && currencyRows.length > 0) {
                const nextCurrencies = currencyRows
                    .map((row: any) => {
                        const code = String(row.code || row.currency_code || row.id || '').trim().toUpperCase();
                        return code ? { value: code, label: code } : null;
                    })
                    .filter(Boolean) as SelectOption[];
                if (nextCurrencies.length > 0) setCurrencies(nextCurrencies);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const totals = useMemo(() => {
        const activeRows = rows.filter((row) => row.status !== 'VOID');
        return {
            credit: activeRows.filter((row) => row.note_type === 'CREDIT').reduce((sum, row) => sum + row.total_amount, 0),
            debit: activeRows.filter((row) => row.note_type === 'DEBIT').reduce((sum, row) => sum + row.total_amount, 0),
            draft: rows.filter((row) => row.status === 'DRAFT').length,
        };
    }, [rows]);

    const persistRows = useCallback((nextRows: CreditDebitNoteRow[]) => {
        setRows(nextRows);
        writeStoredRows(nextRows);
    }, []);

    const openCreateForm = useCallback(() => {
        setForm(createEmptyForm(rows));
        setFormOpen(true);
    }, [rows]);

    const openEditForm = useCallback((row: CreditDebitNoteRow) => {
        setForm(rowToForm(row));
        setFormOpen(true);
    }, []);

    const saveForm = useCallback((status: NoteStatus) => {
        if (!form.note_no.trim()) {
            alert('رقم الإشعار مطلوب.');
            return;
        }
        if (!form.customer_name.trim()) {
            alert('اسم العميل مطلوب.');
            return;
        }
        if (toNumber(form.subtotal) <= 0 && toNumber(form.tax_amount) <= 0) {
            alert('أدخل مبلغ الإشعار.');
            return;
        }

        const normalized = normalizeForm(form, status);
        const nextRows = rows.some((row) => row.id === normalized.id)
            ? rows.map((row) => (row.id === normalized.id ? { ...normalized, created_at: row.created_at } : row))
            : [normalized, ...rows];

        persistRows(nextRows);
        setFormOpen(false);
    }, [form, persistRows, rows]);

    const voidNote = useCallback(() => {
        if (!form.id) return;
        if (!confirm('هل تريد إلغاء هذا الإشعار؟')) return;
        const nextRows = rows.map((row) => row.id === form.id ? { ...row, status: 'VOID' as NoteStatus } : row);
        persistRows(nextRows);
        setFormOpen(false);
    }, [form.id, persistRows, rows]);

    const deleteRows = useCallback((selectedRows: CreditDebitNoteRow[]) => {
        if (selectedRows.length === 0) return;
        if (!confirm(`سيتم حذف ${selectedRows.length} إشعار. هل تريد المتابعة؟`)) return;
        const selectedIds = new Set(selectedRows.map((row) => row.id));
        persistRows(rows.filter((row) => !selectedIds.has(row.id)));
    }, [persistRows, rows]);

    const updateForm = useCallback((patch: Partial<NoteFormState>) => {
        setForm((previous) => {
            const next = { ...previous, ...patch };
            if (patch.note_type && !previous.id) {
                next.note_no = nextNoteNo(rows, patch.note_type);
            }
            if (patch.customer_id) {
                const customer = customers.find((option) => option.value === patch.customer_id);
                next.customer_name = customer?.label || next.customer_name;
            }
            return next;
        });
    }, [customers, rows]);

    const columns = useMemo<DefinitionListColumn<CreditDebitNoteRow>[]>(() => [
        {
            key: 'note_no',
            label: 'رقم الإشعار',
            type: 'text',
            filterType: 'text',
            width: 160,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.note_no,
            getDisplayValue: (row) => row.note_no,
            renderCell: (row) => <span className="font-mono font-bold text-indigo-700">{row.note_no}</span>,
        },
        {
            key: 'note_type',
            label: 'النوع',
            type: 'enum',
            filterType: 'enum',
            width: 140,
            defaultVisible: true,
            align: 'center',
            options: [
                { value: 'CREDIT', label: 'إشعار دائن' },
                { value: 'DEBIT', label: 'إشعار مدين' },
            ],
            getValue: (row) => row.note_type,
            getDisplayValue: (row) => getTypeLabel(row.note_type),
            renderCell: (row) => (
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${row.note_type === 'CREDIT' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                    {row.note_type === 'CREDIT' ? <FileMinus className="h-3.5 w-3.5" /> : <FilePlus className="h-3.5 w-3.5" />}
                    {getTypeLabel(row.note_type)}
                </span>
            ),
        },
        {
            key: 'note_date',
            label: 'التاريخ',
            type: 'date',
            filterType: 'date',
            width: 130,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.note_date,
            getDisplayValue: (row) => formatDate(row.note_date),
            renderCell: (row) => <span className="font-mono text-slate-600">{formatDate(row.note_date)}</span>,
        },
        {
            key: 'customer_name',
            label: 'العميل',
            type: 'text',
            filterType: 'text',
            width: 220,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.customer_name,
            getDisplayValue: (row) => row.customer_name || '-',
        },
        {
            key: 'invoice_no',
            label: 'الفاتورة المرجعية',
            type: 'text',
            filterType: 'text',
            width: 160,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.invoice_no,
            getDisplayValue: (row) => row.invoice_no || '-',
        },
        {
            key: 'reason',
            label: 'السبب',
            type: 'enum',
            filterType: 'enum',
            width: 150,
            defaultVisible: true,
            align: 'right',
            options: REASON_OPTIONS,
            getValue: (row) => row.reason,
            getDisplayValue: (row) => getReasonLabel(row.reason),
        },
        {
            key: 'total_amount',
            label: 'الإجمالي',
            type: 'number',
            filterType: 'number',
            width: 140,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.total_amount,
            getDisplayValue: (row) => `${formatNumber(row.total_amount)} ${row.currency_code}`,
            renderCell: (row) => <span className="font-mono font-bold text-emerald-700">{formatNumber(row.total_amount)} {row.currency_code}</span>,
        },
        {
            key: 'status',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            width: 120,
            defaultVisible: true,
            align: 'center',
            options: STATUS_OPTIONS,
            getValue: (row) => row.status,
            getDisplayValue: (row) => getStatusLabel(row.status),
            renderCell: (row) => (
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(row.status)}`}>
                    {getStatusLabel(row.status)}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            type: 'text',
            filterType: 'text',
            width: 110,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (row) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        openEditForm(row);
                    }}
                    className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                >
                    فتح
                </button>
            ),
        },
    ], [openEditForm]);

    const totalInForm = toNumber(form.subtotal) + toNumber(form.tax_amount);
    const inputClass = 'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';

    return (
        <div className="app-page h-full" dir="rtl">
            <DefinitionMasterList
                headerIcon={<ReceiptText className="h-5 w-5" />}
                headerTitle="إشعارات دائن / مدين"
                headerSubtitle="إدارة إشعارات العملاء المرتبطة بفواتير المبيعات والتسويات"
                headerBadges={[
                    { label: `${rows.length} سجل`, tone: 'info', mono: true },
                    { label: `${formatNumber(totals.credit)} دائن`, tone: 'info', mono: true },
                    { label: `${formatNumber(totals.debit)} مدين`, tone: 'warning', mono: true },
                    { label: `${totals.draft} مسودة`, tone: 'neutral', mono: true },
                ]}
                screenKey="trade.sales.credit-debit-notes"
                data={rows}
                loading={loading}
                columns={columns}
                rowKey={(row) => row.id}
                searchPlaceholder="بحث برقم الإشعار أو العميل أو الفاتورة..."
                emptyMessage="لا توجد إشعارات دائن أو مدين"
                createLabel="إشعار جديد"
                onCreate={openCreateForm}
                onEdit={openEditForm}
                onDelete={deleteRows}
                onRefresh={loadData}
                onRowDoubleClick={openEditForm}
                defaultSort={{ key: 'note_date', direction: 'desc' }}
            />

            {formOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
                    dir="rtl"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setFormOpen(false);
                    }}
                >
                    <div className="w-full max-w-4xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${form.note_type === 'CREDIT' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {form.note_type === 'CREDIT' ? <FileMinus className="h-5 w-5" /> : <FilePlus className="h-5 w-5" />}
                                </span>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">{form.id ? 'تعديل إشعار' : 'إشعار جديد'}</h2>
                                    <p className="text-xs font-semibold text-slate-500">{form.note_no || 'رقم جديد'}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-white hover:text-slate-900"
                                aria-label="إغلاق"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid max-h-[70vh] gap-5 overflow-y-auto p-5">
                            <div className="grid gap-4 md:grid-cols-4">
                                <FormField label="نوع الإشعار">
                                    <select className={inputClass} value={form.note_type} onChange={(event) => updateForm({ note_type: event.target.value as NoteType })}>
                                        <option value="CREDIT">إشعار دائن</option>
                                        <option value="DEBIT">إشعار مدين</option>
                                    </select>
                                </FormField>
                                <FormField label="رقم الإشعار">
                                    <input className={`${inputClass} font-mono`} value={form.note_no} onChange={(event) => updateForm({ note_no: event.target.value })} />
                                </FormField>
                                <FormField label="التاريخ">
                                    <input type="date" className={inputClass} value={form.note_date} onChange={(event) => updateForm({ note_date: event.target.value })} />
                                </FormField>
                                <FormField label="العملة">
                                    <select className={inputClass} value={form.currency_code} onChange={(event) => updateForm({ currency_code: event.target.value })}>
                                        {currencies.map((currency) => (
                                            <option key={currency.value} value={currency.value}>{currency.label}</option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <FormField label="العميل">
                                    {customers.length > 0 ? (
                                        <select className={inputClass} value={form.customer_id} onChange={(event) => updateForm({ customer_id: event.target.value })}>
                                            <option value="">اختر العميل...</option>
                                            {customers.map((customer) => (
                                                <option key={customer.value} value={customer.value}>{customer.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input className={inputClass} value={form.customer_name} onChange={(event) => updateForm({ customer_name: event.target.value })} placeholder="اسم العميل" />
                                    )}
                                </FormField>
                                {customers.length > 0 && (
                                    <FormField label="اسم العميل">
                                        <input className={inputClass} value={form.customer_name} onChange={(event) => updateForm({ customer_name: event.target.value })} placeholder="اسم العميل" />
                                    </FormField>
                                )}
                                <FormField label="الفاتورة المرجعية">
                                    <input className={`${inputClass} font-mono`} value={form.invoice_no} onChange={(event) => updateForm({ invoice_no: event.target.value })} placeholder="رقم الفاتورة" />
                                </FormField>
                                <FormField label="السبب">
                                    <select className={inputClass} value={form.reason} onChange={(event) => updateForm({ reason: event.target.value })}>
                                        {REASON_OPTIONS.map((reason) => (
                                            <option key={reason.value} value={reason.value}>{reason.label}</option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <FormField label="المبلغ قبل الضريبة">
                                    <input type="number" min="0" step="0.01" className={`${inputClass} font-mono`} value={form.subtotal} onChange={(event) => updateForm({ subtotal: event.target.value })} />
                                </FormField>
                                <FormField label="الضريبة">
                                    <input type="number" min="0" step="0.01" className={`${inputClass} font-mono`} value={form.tax_amount} onChange={(event) => updateForm({ tax_amount: event.target.value })} />
                                </FormField>
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                    <div className="text-xs font-bold text-emerald-700">الإجمالي</div>
                                    <div className="mt-2 font-mono text-2xl font-black text-emerald-800">{formatNumber(totalInForm)} {form.currency_code}</div>
                                </div>
                            </div>

                            <FormField label="ملاحظات">
                                <textarea
                                    rows={4}
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                    value={form.notes}
                                    onChange={(event) => updateForm({ notes: event.target.value })}
                                    placeholder="ملاحظات الإشعار..."
                                />
                            </FormField>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
                            <div>
                                {form.id && (
                                    <button
                                        type="button"
                                        onClick={voidNote}
                                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
                                    >
                                        إلغاء الإشعار
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormOpen(false)}
                                    className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                                >
                                    تراجع
                                </button>
                                <button
                                    type="button"
                                    onClick={() => saveForm('DRAFT')}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                                >
                                    <Save className="h-4 w-4" />
                                    حفظ مسودة
                                </button>
                                <button
                                    type="button"
                                    onClick={() => saveForm('POSTED')}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                                >
                                    <Send className="h-4 w-4" />
                                    حفظ وترحيل
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
