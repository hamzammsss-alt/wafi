import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, Calculator, Edit, Plus, Save, Send, Trash2, Truck, X } from 'lucide-react';
import { useCreateIntent } from '../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../src/components/definitions/DefinitionMasterList';

type SettlementStatus = 'DRAFT' | 'REVIEWED' | 'POSTED' | 'VOID';
type SettlementLineType = 'INVOICE' | 'RETURN' | 'CASH' | 'CHEQUE' | 'DEPOSIT' | 'EXPENSE' | 'SHORTAGE' | 'OVERAGE';

type LookupOption = {
    value: string;
    label: string;
    code?: string;
};

type SettlementLine = {
    id: string;
    type: SettlementLineType;
    reference_no: string;
    description: string;
    amount: number;
    notes: string;
};

type SalesRepSettlement = {
    id: string;
    settlement_no: string;
    settlement_date: string;
    sales_rep_name: string;
    vehicle_no: string;
    route_name: string;
    currency_code: string;
    opening_balance: number;
    status: SettlementStatus;
    notes: string;
    lines: SettlementLine[];
    created_at: string;
    updated_at: string;
};

type FormLine = Omit<SettlementLine, 'amount'> & {
    amount: string;
};

type FormState = Omit<SalesRepSettlement, 'id' | 'opening_balance' | 'lines' | 'created_at' | 'updated_at'> & {
    id?: string;
    opening_balance: string;
    lines: FormLine[];
};

const STORAGE_KEY = 'wafi:distribution-sales-rep-settlements:v1';

const DEFAULT_CURRENCIES: LookupOption[] = [
    { value: 'ILS', label: 'ILS' },
    { value: 'USD', label: 'USD' },
    { value: 'JOD', label: 'JOD' },
    { value: 'EUR', label: 'EUR' },
];

const STATUS_OPTIONS: Array<{ value: SettlementStatus; label: string }> = [
    { value: 'DRAFT', label: 'مسودة' },
    { value: 'REVIEWED', label: 'تمت المراجعة' },
    { value: 'POSTED', label: 'مرحلة' },
    { value: 'VOID', label: 'ملغاة' },
];

const LINE_TYPE_OPTIONS: Array<{ value: SettlementLineType; label: string }> = [
    { value: 'INVOICE', label: 'فاتورة مبيعات' },
    { value: 'RETURN', label: 'مرتجع مبيعات' },
    { value: 'CASH', label: 'تحصيل نقدي' },
    { value: 'CHEQUE', label: 'شيكات مستلمة' },
    { value: 'DEPOSIT', label: 'إيداع/توريد' },
    { value: 'EXPENSE', label: 'مصروف مندوب' },
    { value: 'SHORTAGE', label: 'عجز على المندوب' },
    { value: 'OVERAGE', label: 'زيادة مع المندوب' },
];

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function makeId(prefix = 'rep-settlement') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown, currency = '') {
    const formatted = toNumber(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency ? `${formatted} ${currency}` : formatted;
}

function formatDate(value: unknown) {
    if (!value) return '-';
    return String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0] || String(value);
}

function getStatusLabel(status: unknown) {
    const value = String(status || '').toUpperCase();
    return STATUS_OPTIONS.find((option) => option.value === value)?.label || '-';
}

function getLineTypeLabel(type: unknown) {
    const value = String(type || '').toUpperCase();
    return LINE_TYPE_OPTIONS.find((option) => option.value === value)?.label || '-';
}

function getStatusClass(status: unknown) {
    const value = String(status || '').toUpperCase();
    if (value === 'POSTED') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
    if (value === 'REVIEWED') return 'border-sky-200 bg-sky-100 text-sky-700';
    if (value === 'VOID') return 'border-stone-200 bg-stone-100 text-stone-600';
    return 'border-amber-200 bg-amber-100 text-amber-700';
}

function getLookupLabel(row: any, fields: string[]) {
    for (const field of fields) {
        const value = String(row?.[field] || '').trim();
        if (value) return value;
    }
    return '';
}

function getSettlementTotals(settlement: Pick<SalesRepSettlement, 'opening_balance' | 'lines'>) {
    return settlement.lines.reduce(
        (totals, line) => {
            const amount = toNumber(line.amount);
            if (line.type === 'INVOICE') return { ...totals, sales: totals.sales + amount };
            if (line.type === 'RETURN') return { ...totals, returns: totals.returns + amount };
            if (line.type === 'CASH') return { ...totals, cash: totals.cash + amount };
            if (line.type === 'CHEQUE') return { ...totals, cheques: totals.cheques + amount };
            if (line.type === 'DEPOSIT') return { ...totals, deposits: totals.deposits + amount };
            if (line.type === 'EXPENSE') return { ...totals, expenses: totals.expenses + amount };
            if (line.type === 'SHORTAGE') return { ...totals, shortages: totals.shortages + amount };
            if (line.type === 'OVERAGE') return { ...totals, overages: totals.overages + amount };
            return totals;
        },
        {
            opening: toNumber(settlement.opening_balance),
            sales: 0,
            returns: 0,
            cash: 0,
            cheques: 0,
            deposits: 0,
            expenses: 0,
            shortages: 0,
            overages: 0,
        },
    );
}

function getNetDue(settlement: Pick<SalesRepSettlement, 'opening_balance' | 'lines'>) {
    const totals = getSettlementTotals(settlement);
    return totals.opening
        + totals.sales
        + totals.shortages
        - totals.returns
        - totals.cash
        - totals.cheques
        - totals.deposits
        - totals.expenses
        - totals.overages;
}

function readStoredRows(): SalesRepSettlement[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.map((row) => ({
            ...row,
            opening_balance: toNumber(row?.opening_balance),
            lines: Array.isArray(row?.lines) ? row.lines.map((line: any) => ({
                id: String(line?.id || makeId('line')),
                type: String(line?.type || 'INVOICE').toUpperCase() as SettlementLineType,
                reference_no: String(line?.reference_no || ''),
                description: String(line?.description || ''),
                amount: toNumber(line?.amount),
                notes: String(line?.notes || ''),
            })) : [],
        }));
    } catch {
        return [];
    }
}

function writeStoredRows(rows: SalesRepSettlement[]) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function nextSettlementNo(rows: SalesRepSettlement[]) {
    const year = new Date().getFullYear();
    const maxSequence = rows.reduce((max, row) => {
        const match = String(row.settlement_no || '').match(new RegExp(`^RSET-${year}-(\\d+)$`));
        return match ? Math.max(max, Number(match[1] || 0)) : max;
    }, 0);
    return `RSET-${year}-${String(maxSequence + 1).padStart(4, '0')}`;
}

function blankLine(type: SettlementLineType = 'INVOICE'): FormLine {
    return {
        id: makeId('line'),
        type,
        reference_no: '',
        description: '',
        amount: '',
        notes: '',
    };
}

function createEmptyForm(rows: SalesRepSettlement[]): FormState {
    return {
        settlement_no: nextSettlementNo(rows),
        settlement_date: todayIso(),
        sales_rep_name: '',
        vehicle_no: '',
        route_name: '',
        currency_code: 'ILS',
        opening_balance: '',
        status: 'DRAFT',
        notes: '',
        lines: [blankLine('INVOICE'), blankLine('CASH')],
    };
}

function rowToForm(row: SalesRepSettlement): FormState {
    return {
        id: row.id,
        settlement_no: row.settlement_no,
        settlement_date: row.settlement_date,
        sales_rep_name: row.sales_rep_name || '',
        vehicle_no: row.vehicle_no || '',
        route_name: row.route_name || '',
        currency_code: row.currency_code || 'ILS',
        opening_balance: String(row.opening_balance || ''),
        status: row.status || 'DRAFT',
        notes: row.notes || '',
        lines: row.lines.length > 0
            ? row.lines.map((line) => ({ ...line, amount: String(line.amount || '') }))
            : [blankLine()],
    };
}

function normalizeForm(form: FormState, status: SettlementStatus): SalesRepSettlement {
    const now = new Date().toISOString();
    return {
        id: form.id || makeId(),
        settlement_no: String(form.settlement_no || '').trim(),
        settlement_date: form.settlement_date || todayIso(),
        sales_rep_name: String(form.sales_rep_name || '').trim(),
        vehicle_no: String(form.vehicle_no || '').trim(),
        route_name: String(form.route_name || '').trim(),
        currency_code: String(form.currency_code || 'ILS').trim().toUpperCase(),
        opening_balance: toNumber(form.opening_balance),
        status,
        notes: String(form.notes || '').trim(),
        lines: form.lines
            .filter((line) => String(line.reference_no || line.description || line.amount).trim())
            .map<SettlementLine>((line) => ({
                id: line.id || makeId('line'),
                type: line.type,
                reference_no: String(line.reference_no || '').trim(),
                description: String(line.description || '').trim(),
                amount: toNumber(line.amount),
                notes: String(line.notes || '').trim(),
            })),
        created_at: now,
        updated_at: now,
    };
}

async function safeRows(loader?: () => Promise<any[]>): Promise<any[]> {
    if (!loader) return [];
    try {
        const rows = await loader();
        return Array.isArray(rows) ? rows : [];
    } catch {
        return [];
    }
}

function Field({
    label,
    children,
    className = '',
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <label className={`grid gap-1.5 text-sm font-bold text-slate-700 ${className}`}>
            <span>{label}</span>
            {children}
        </label>
    );
}

export default function SalesRepSettlementPage() {
    const [rows, setRows] = useState<SalesRepSettlement[]>(() => readStoredRows());
    const [loading, setLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<FormState>(() => createEmptyForm([]));
    const [message, setMessage] = useState<string | null>(null);
    const [salesReps, setSalesReps] = useState<LookupOption[]>([]);
    const [vehicles, setVehicles] = useState<LookupOption[]>([]);
    const [currencies, setCurrencies] = useState<LookupOption[]>(DEFAULT_CURRENCIES);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const api = (window as any)?.electronAPI;
            const [repRows, vehicleRows, currencyRows] = await Promise.all([
                safeRows(api?.partner?.getSalesReps),
                safeRows(api?.logistics?.getVehicles),
                safeRows(api?.currency?.getCurrencies),
            ]);

            setSalesReps(repRows.map((row) => ({
                value: String(row.id || row.code || row.rep_code || getLookupLabel(row, ['name_ar', 'name_en', 'name'])),
                label: getLookupLabel(row, ['name_ar', 'name_en', 'name', 'rep_name']) || String(row.code || ''),
                code: String(row.code || row.rep_code || ''),
            })).filter((option) => option.label));

            setVehicles(vehicleRows.map((row) => ({
                value: String(row.id || row.plate_no || row.plateNo || row.vehicle_code || ''),
                label: getLookupLabel(row, ['plate_no', 'plateNo', 'vehicle_code', 'name', 'description']) || String(row.id || ''),
                code: String(row.vehicle_code || row.plate_no || row.plateNo || ''),
            })).filter((option) => option.label));

            const loadedCurrencies = currencyRows.map((row) => ({
                value: String(row.code || row.currency_code || row.id || '').toUpperCase(),
                label: String(row.code || row.currency_code || row.name_ar || row.name || '').toUpperCase(),
            })).filter((option) => option.value);
            setCurrencies(loadedCurrencies.length > 0 ? loadedCurrencies : DEFAULT_CURRENCIES);
            setRows(readStoredRows());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const persistRows = useCallback((nextRows: SalesRepSettlement[]) => {
        setRows(nextRows);
        writeStoredRows(nextRows);
    }, []);

    const openCreate = useCallback(() => {
        setMessage(null);
        setForm(createEmptyForm(rows));
        setFormOpen(true);
    }, [rows]);

    useCreateIntent(openCreate);

    const openEdit = useCallback((row: SalesRepSettlement) => {
        setMessage(null);
        setForm(rowToForm(row));
        setFormOpen(true);
    }, []);

    const duplicateRow = useCallback((row: SalesRepSettlement) => {
        setMessage(null);
        setForm(rowToForm({
            ...row,
            id: '',
            settlement_no: nextSettlementNo(rows),
            settlement_date: todayIso(),
            status: 'DRAFT',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }));
        setFormOpen(true);
    }, [rows]);

    const closeModal = useCallback(() => {
        setFormOpen(false);
        setMessage(null);
    }, []);

    const handleDeleteRows = useCallback((selectedRows: SalesRepSettlement[]) => {
        if (selectedRows.length === 0) return;
        const text = selectedRows.length === 1
            ? 'هل تريد حذف تصفية المندوب المحددة؟'
            : `هل تريد حذف ${selectedRows.length} تصفيات محددة؟`;
        if (!window.confirm(text)) return;
        const selectedIds = new Set(selectedRows.map((row) => row.id));
        persistRows(rows.filter((row) => !selectedIds.has(row.id)));
    }, [persistRows, rows]);

    const updateLine = useCallback((lineId: string, patch: Partial<FormLine>) => {
        setForm((current) => ({
            ...current,
            lines: current.lines.map((line) => line.id === lineId ? { ...line, ...patch } : line),
        }));
    }, []);

    const addLine = useCallback((type: SettlementLineType = 'INVOICE') => {
        setForm((current) => ({ ...current, lines: [...current.lines, blankLine(type)] }));
    }, []);

    const removeLine = useCallback((lineId: string) => {
        setForm((current) => ({
            ...current,
            lines: current.lines.length > 1 ? current.lines.filter((line) => line.id !== lineId) : [blankLine()],
        }));
    }, []);

    const saveForm = useCallback((status: SettlementStatus) => {
        const normalized = normalizeForm(form, status);
        if (!normalized.settlement_no) {
            setMessage('رقم التصفية مطلوب.');
            return;
        }
        if (!normalized.sales_rep_name) {
            setMessage('اسم المندوب مطلوب.');
            return;
        }
        if (status !== 'DRAFT' && normalized.lines.length === 0) {
            setMessage('أضف حركة مالية واحدة على الأقل قبل اعتماد التصفية.');
            return;
        }

        const existing = rows.find((row) => row.id === normalized.id);
        const rowToSave: SalesRepSettlement = {
            ...normalized,
            created_at: existing?.created_at || normalized.created_at,
            updated_at: new Date().toISOString(),
        };
        const nextRows = existing
            ? rows.map((row) => row.id === rowToSave.id ? rowToSave : row)
            : [rowToSave, ...rows];

        persistRows(nextRows);
        setFormOpen(false);
        setMessage(null);
    }, [form, persistRows, rows]);

    const formSettlement = useMemo<SalesRepSettlement>(() => normalizeForm(form, form.status), [form]);
    const formTotals = useMemo(() => getSettlementTotals(formSettlement), [formSettlement]);
    const formNetDue = useMemo(() => getNetDue(formSettlement), [formSettlement]);

    const headerStats = useMemo(() => {
        const draft = rows.filter((row) => row.status === 'DRAFT').length;
        const posted = rows.filter((row) => row.status === 'POSTED').length;
        const totalNetDue = rows.reduce((sum, row) => sum + getNetDue(row), 0);
        return { draft, posted, totalNetDue };
    }, [rows]);

    const columns = useMemo<DefinitionListColumn<SalesRepSettlement>[]>(() => [
        {
            key: 'settlement_no',
            label: 'رقم التصفية',
            type: 'text',
            filterType: 'text',
            width: 160,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.settlement_no,
            getDisplayValue: (row) => row.settlement_no,
            renderCell: (row) => <span className="font-mono font-bold text-teal-700">{row.settlement_no}</span>,
        },
        {
            key: 'settlement_date',
            label: 'تاريخ التصفية',
            type: 'date',
            filterType: 'date',
            width: 145,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.settlement_date,
            getDisplayValue: (row) => formatDate(row.settlement_date),
            renderCell: (row) => <span className="font-mono text-slate-600">{formatDate(row.settlement_date)}</span>,
        },
        {
            key: 'sales_rep_name',
            label: 'المندوب',
            type: 'text',
            filterType: 'text',
            width: 190,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.sales_rep_name,
            getDisplayValue: (row) => row.sales_rep_name || '-',
            renderCell: (row) => <span className="font-bold text-slate-800">{row.sales_rep_name || '-'}</span>,
        },
        {
            key: 'vehicle_no',
            label: 'السيارة',
            type: 'text',
            filterType: 'text',
            width: 145,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.vehicle_no,
            getDisplayValue: (row) => row.vehicle_no || '-',
            renderCell: (row) => <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">{row.vehicle_no || '-'}</span>,
        },
        {
            key: 'route_name',
            label: 'المسار',
            type: 'text',
            filterType: 'text',
            width: 170,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.route_name,
            getDisplayValue: (row) => row.route_name || '-',
        },
        {
            key: 'sales_total',
            label: 'إجمالي المبيعات',
            type: 'number',
            filterType: 'number',
            width: 155,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => getSettlementTotals(row).sales,
            getDisplayValue: (row) => formatMoney(getSettlementTotals(row).sales, row.currency_code),
            renderCell: (row) => <span className="font-mono text-slate-700">{formatMoney(getSettlementTotals(row).sales, row.currency_code)}</span>,
        },
        {
            key: 'returns_total',
            label: 'المرتجعات',
            type: 'number',
            filterType: 'number',
            width: 135,
            defaultVisible: false,
            align: 'center',
            getValue: (row) => getSettlementTotals(row).returns,
            getDisplayValue: (row) => formatMoney(getSettlementTotals(row).returns, row.currency_code),
        },
        {
            key: 'collections_total',
            label: 'التحصيل',
            type: 'number',
            filterType: 'number',
            width: 145,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => getSettlementTotals(row).cash + getSettlementTotals(row).cheques,
            getDisplayValue: (row) => formatMoney(getSettlementTotals(row).cash + getSettlementTotals(row).cheques, row.currency_code),
            renderCell: (row) => <span className="font-mono font-bold text-emerald-700">{formatMoney(getSettlementTotals(row).cash + getSettlementTotals(row).cheques, row.currency_code)}</span>,
        },
        {
            key: 'expenses_total',
            label: 'المصاريف',
            type: 'number',
            filterType: 'number',
            width: 135,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => getSettlementTotals(row).expenses,
            getDisplayValue: (row) => formatMoney(getSettlementTotals(row).expenses, row.currency_code),
            renderCell: (row) => <span className="font-mono text-amber-700">{formatMoney(getSettlementTotals(row).expenses, row.currency_code)}</span>,
        },
        {
            key: 'net_due',
            label: 'الرصيد النهائي',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => getNetDue(row),
            getDisplayValue: (row) => formatMoney(getNetDue(row), row.currency_code),
            renderCell: (row) => {
                const netDue = getNetDue(row);
                return (
                    <span className={`font-mono font-bold ${netDue > 0 ? 'text-red-600' : netDue < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {formatMoney(netDue, row.currency_code)}
                    </span>
                );
            },
        },
        {
            key: 'status',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            options: STATUS_OPTIONS,
            width: 135,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.status,
            getDisplayValue: (row) => getStatusLabel(row.status),
            renderCell: (row) => (
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(row.status)}`}>
                    {getStatusLabel(row.status)}
                </span>
            ),
        },
        {
            key: 'lines_count',
            label: 'عدد الحركات',
            type: 'number',
            filterType: 'number',
            width: 130,
            defaultVisible: false,
            align: 'center',
            getValue: (row) => row.lines.length,
            getDisplayValue: (row) => String(row.lines.length),
        },
        {
            key: 'actions',
            label: 'الإجراءات',
            width: 130,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (row) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            openEdit(row);
                        }}
                        className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                        title="تعديل"
                        aria-label="تعديل"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteRows([row]);
                        }}
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                        title="حذف"
                        aria-label="حذف"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ], [handleDeleteRows, openEdit]);

    const modal = formOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" dir="rtl">
                <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                        <div className="min-w-0">
                            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
                                <Banknote className="text-teal-600" size={22} />
                                {form.id ? 'تعديل تصفية مندوب' : 'تصفية مندوب جديدة'}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">مطابقة مبيعات المندوب والتحصيلات والمصاريف والتوريدات.</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                            aria-label="إغلاق"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {message && (
                            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                                {message}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                            <Field label="رقم التصفية">
                                <input
                                    value={form.settlement_no}
                                    onChange={(event) => setForm((current) => ({ ...current, settlement_no: event.target.value }))}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="تاريخ التصفية">
                                <input
                                    type="date"
                                    value={form.settlement_date}
                                    onChange={(event) => setForm((current) => ({ ...current, settlement_date: event.target.value }))}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="اسم المندوب">
                                <input
                                    list="settlement-reps"
                                    value={form.sales_rep_name}
                                    onChange={(event) => setForm((current) => ({ ...current, sales_rep_name: event.target.value }))}
                                    placeholder="اختر أو اكتب اسم المندوب..."
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="السيارة">
                                <input
                                    list="settlement-vehicles"
                                    value={form.vehicle_no}
                                    onChange={(event) => setForm((current) => ({ ...current, vehicle_no: event.target.value }))}
                                    placeholder="رقم اللوحة أو السيارة..."
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="المسار">
                                <input
                                    value={form.route_name}
                                    onChange={(event) => setForm((current) => ({ ...current, route_name: event.target.value }))}
                                    placeholder="اسم مسار التوزيع..."
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="العملة">
                                <select
                                    value={form.currency_code}
                                    onChange={(event) => setForm((current) => ({ ...current, currency_code: event.target.value }))}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                >
                                    {currencies.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="رصيد افتتاحي على المندوب">
                                <input
                                    type="number"
                                    value={form.opening_balance}
                                    onChange={(event) => setForm((current) => ({ ...current, opening_balance: event.target.value }))}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center font-mono text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="الحالة">
                                <select
                                    value={form.status}
                                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SettlementStatus }))}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <div className="text-xs font-bold text-slate-500">المبيعات</div>
                                <div className="mt-1 font-mono text-lg font-extrabold text-slate-900">{formatMoney(formTotals.sales, form.currency_code)}</div>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                                <div className="text-xs font-bold text-emerald-700">التحصيل</div>
                                <div className="mt-1 font-mono text-lg font-extrabold text-emerald-800">{formatMoney(formTotals.cash + formTotals.cheques, form.currency_code)}</div>
                            </div>
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                <div className="text-xs font-bold text-amber-700">المصاريف</div>
                                <div className="mt-1 font-mono text-lg font-extrabold text-amber-800">{formatMoney(formTotals.expenses, form.currency_code)}</div>
                            </div>
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                                <div className="text-xs font-bold text-blue-700">التوريدات</div>
                                <div className="mt-1 font-mono text-lg font-extrabold text-blue-800">{formatMoney(formTotals.deposits, form.currency_code)}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="text-xs font-bold text-slate-600">الرصيد النهائي</div>
                                <div className={`mt-1 font-mono text-lg font-extrabold ${formNetDue > 0 ? 'text-red-600' : formNetDue < 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                    {formatMoney(formNetDue, form.currency_code)}
                                </div>
                            </div>
                        </div>

                        <Field label="ملاحظات" className="mt-4">
                            <textarea
                                value={form.notes}
                                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                                placeholder="ملاحظات التصفية أو سبب الفروقات..."
                                rows={3}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                            />
                        </Field>

                        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                                <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-800">
                                    <Calculator size={18} className="text-teal-600" />
                                    حركات التصفية
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => addLine('INVOICE')}
                                        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-teal-200 transition hover:bg-teal-700"
                                    >
                                        <Plus size={16} />
                                        حركة جديدة
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addLine('CASH')}
                                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                                    >
                                        <Banknote size={16} />
                                        تحصيل
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-[920px] w-full border-collapse text-sm">
                                    <thead className="bg-slate-100 text-xs font-extrabold text-slate-600">
                                        <tr>
                                            <th className="w-12 px-3 py-3 text-center">#</th>
                                            <th className="w-44 px-3 py-3 text-right">نوع الحركة</th>
                                            <th className="w-40 px-3 py-3 text-right">رقم المرجع</th>
                                            <th className="min-w-56 px-3 py-3 text-right">البيان</th>
                                            <th className="w-36 px-3 py-3 text-center">المبلغ</th>
                                            <th className="min-w-48 px-3 py-3 text-right">ملاحظات</th>
                                            <th className="w-16 px-3 py-3 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.lines.map((line, index) => (
                                            <tr key={line.id} className="border-t border-slate-100">
                                                <td className="px-3 py-3 text-center font-mono text-xs text-slate-400">{index + 1}</td>
                                                <td className="px-3 py-3">
                                                    <select
                                                        value={line.type}
                                                        onChange={(event) => updateLine(line.id, { type: event.target.value as SettlementLineType })}
                                                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                    >
                                                        {LINE_TYPE_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        value={line.reference_no}
                                                        onChange={(event) => updateLine(line.id, { reference_no: event.target.value })}
                                                        className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        value={line.description}
                                                        onChange={(event) => updateLine(line.id, { description: event.target.value })}
                                                        placeholder={getLineTypeLabel(line.type)}
                                                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="number"
                                                        value={line.amount}
                                                        onChange={(event) => updateLine(line.id, { amount: event.target.value })}
                                                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-center font-mono text-sm font-bold outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        value={line.notes}
                                                        onChange={(event) => updateLine(line.id, { notes: event.target.value })}
                                                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                    />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(line.id)}
                                                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                                                        aria-label="حذف الحركة"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <datalist id="settlement-reps">
                            {salesReps.map((option) => <option key={option.value} value={option.label}>{option.code || option.label}</option>)}
                        </datalist>
                        <datalist id="settlement-vehicles">
                            {vehicles.map((option) => <option key={option.value} value={option.label}>{option.code || option.label}</option>)}
                        </datalist>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                        >
                            إلغاء
                        </button>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => saveForm('DRAFT')}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                            >
                                <Save size={16} />
                                حفظ كمسودة
                            </button>
                            <button
                                type="button"
                                onClick={() => saveForm('REVIEWED')}
                                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-teal-700"
                            >
                                <Calculator size={16} />
                                اعتماد المراجعة
                            </button>
                            <button
                                type="button"
                                onClick={() => saveForm('POSTED')}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
                            >
                                <Send size={16} />
                                ترحيل
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body,
        )
        : null;

    return (
        <div className="h-full overflow-auto bg-slate-50 p-6" dir="rtl">
            <DefinitionMasterList
                headerIcon={<Banknote className="h-5 w-5" />}
                headerTitle="تصفية المندوب"
                headerSubtitle="مطابقة مبيعات المندوب والتحصيلات والمصاريف والتوريدات داخل جدول موحد."
                headerBadges={[
                    { label: `${rows.length} تصفية`, tone: 'info', mono: true },
                    { label: `${headerStats.draft} مسودة`, tone: 'warning', mono: true },
                    { label: `${headerStats.posted} مرحلة`, tone: 'success', mono: true },
                    { label: `الرصيد ${formatMoney(headerStats.totalNetDue)}`, tone: 'neutral', mono: true },
                ]}
                screenKey="trade.distribution.settlement"
                data={rows}
                loading={loading}
                columns={columns}
                rowKey={(row) => row.id}
                searchPlaceholder="بحث برقم التصفية أو المندوب أو السيارة أو المسار..."
                emptyMessage="لا توجد تصفيات مندوب مطابقة للمعايير الحالية"
                createLabel="تصفية جديدة"
                onCreate={openCreate}
                onEdit={openEdit}
                onDuplicate={duplicateRow}
                onDelete={handleDeleteRows}
                onRefresh={loadData}
                onRowDoubleClick={openEdit}
                defaultSort={{ key: 'settlement_date', direction: 'desc' }}
            />
            {modal}
        </div>
    );
}
