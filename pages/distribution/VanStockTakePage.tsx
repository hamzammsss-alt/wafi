import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardCheck, Edit, PackageSearch, Plus, Save, Send, Trash2, Truck, X } from 'lucide-react';
import { useCreateIntent } from '../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../src/components/definitions/DefinitionMasterList';

type VanStockStatus = 'DRAFT' | 'COUNTED' | 'POSTED' | 'VOID';

type LookupOption = {
    value: string;
    label: string;
    code?: string;
    unit?: string;
};

type VanStockLine = {
    id: string;
    item_id?: string;
    item_code: string;
    item_name: string;
    unit_name: string;
    expected_qty: number;
    counted_qty: number;
    notes: string;
};

type VanStockSession = {
    id: string;
    session_no: string;
    stock_date: string;
    sales_rep_name: string;
    vehicle_no: string;
    route_name: string;
    warehouse_name: string;
    status: VanStockStatus;
    notes: string;
    lines: VanStockLine[];
    created_at: string;
    updated_at: string;
};

type FormLine = Omit<VanStockLine, 'expected_qty' | 'counted_qty'> & {
    expected_qty: string;
    counted_qty: string;
};

type FormState = Omit<VanStockSession, 'id' | 'lines' | 'created_at' | 'updated_at'> & {
    id?: string;
    lines: FormLine[];
};

const STORAGE_KEY = 'wafi:distribution-van-stock-take:v1';

const STATUS_OPTIONS: Array<{ value: VanStockStatus; label: string }> = [
    { value: 'DRAFT', label: 'مسودة' },
    { value: 'COUNTED', label: 'تم الجرد' },
    { value: 'POSTED', label: 'مرحل' },
    { value: 'VOID', label: 'ملغى' },
];

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function makeId(prefix = 'van-stock') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown) {
    return toNumber(value).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

function formatDate(value: unknown) {
    if (!value) return '-';
    return String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0] || String(value);
}

function getLineDifference(line: Pick<VanStockLine, 'expected_qty' | 'counted_qty'>) {
    return toNumber(line.counted_qty) - toNumber(line.expected_qty);
}

function getSessionTotals(session: Pick<VanStockSession, 'lines'>) {
    return session.lines.reduce(
        (totals, line) => ({
            expected: totals.expected + toNumber(line.expected_qty),
            counted: totals.counted + toNumber(line.counted_qty),
            difference: totals.difference + getLineDifference(line),
        }),
        { expected: 0, counted: 0, difference: 0 },
    );
}

function getStatusLabel(status: unknown) {
    const value = String(status || '').toUpperCase();
    return STATUS_OPTIONS.find((option) => option.value === value)?.label || '-';
}

function getStatusClass(status: unknown) {
    const value = String(status || '').toUpperCase();
    if (value === 'POSTED') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
    if (value === 'COUNTED') return 'border-sky-200 bg-sky-100 text-sky-700';
    if (value === 'VOID') return 'border-stone-200 bg-stone-100 text-stone-600';
    return 'border-amber-200 bg-amber-100 text-amber-700';
}

function readStoredRows(): VanStockSession[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStoredRows(rows: VanStockSession[]) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function nextSessionNo(rows: VanStockSession[]) {
    const year = new Date().getFullYear();
    const maxSequence = rows.reduce((max, row) => {
        const match = String(row.session_no || '').match(new RegExp(`^VST-${year}-(\\d+)$`));
        return match ? Math.max(max, Number(match[1] || 0)) : max;
    }, 0);
    return `VST-${year}-${String(maxSequence + 1).padStart(4, '0')}`;
}

function blankLine(): FormLine {
    return {
        id: makeId('line'),
        item_id: '',
        item_code: '',
        item_name: '',
        unit_name: '',
        expected_qty: '',
        counted_qty: '',
        notes: '',
    };
}

function createEmptyForm(rows: VanStockSession[]): FormState {
    return {
        session_no: nextSessionNo(rows),
        stock_date: todayIso(),
        sales_rep_name: '',
        vehicle_no: '',
        route_name: '',
        warehouse_name: '',
        status: 'DRAFT',
        notes: '',
        lines: [blankLine()],
    };
}

function rowToForm(row: VanStockSession): FormState {
    return {
        id: row.id,
        session_no: row.session_no,
        stock_date: row.stock_date,
        sales_rep_name: row.sales_rep_name || '',
        vehicle_no: row.vehicle_no || '',
        route_name: row.route_name || '',
        warehouse_name: row.warehouse_name || '',
        status: row.status || 'DRAFT',
        notes: row.notes || '',
        lines: row.lines.length > 0
            ? row.lines.map((line) => ({
                ...line,
                expected_qty: String(line.expected_qty || ''),
                counted_qty: String(line.counted_qty || ''),
            }))
            : [blankLine()],
    };
}

function normalizeForm(form: FormState, status: VanStockStatus): VanStockSession {
    const now = new Date().toISOString();
    const lines = form.lines
        .filter((line) => String(line.item_code || line.item_name).trim())
        .map<VanStockLine>((line) => ({
            id: line.id || makeId('line'),
            item_id: String(line.item_id || '').trim(),
            item_code: String(line.item_code || '').trim(),
            item_name: String(line.item_name || '').trim(),
            unit_name: String(line.unit_name || '').trim(),
            expected_qty: toNumber(line.expected_qty),
            counted_qty: toNumber(line.counted_qty),
            notes: String(line.notes || '').trim(),
        }));

    return {
        id: form.id || makeId(),
        session_no: String(form.session_no || '').trim(),
        stock_date: form.stock_date || todayIso(),
        sales_rep_name: String(form.sales_rep_name || '').trim(),
        vehicle_no: String(form.vehicle_no || '').trim(),
        route_name: String(form.route_name || '').trim(),
        warehouse_name: String(form.warehouse_name || '').trim(),
        status,
        notes: String(form.notes || '').trim(),
        lines,
        created_at: now,
        updated_at: now,
    };
}

function getLookupLabel(row: any, fields: string[]) {
    for (const field of fields) {
        const value = String(row?.[field] || '').trim();
        if (value) return value;
    }
    return '';
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

export default function VanStockTakePage() {
    const [rows, setRows] = useState<VanStockSession[]>(() => readStoredRows());
    const [loading, setLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<FormState>(() => createEmptyForm([]));
    const [message, setMessage] = useState<string | null>(null);
    const [salesReps, setSalesReps] = useState<LookupOption[]>([]);
    const [vehicles, setVehicles] = useState<LookupOption[]>([]);
    const [warehouses, setWarehouses] = useState<LookupOption[]>([]);
    const [items, setItems] = useState<LookupOption[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const api = (window as any)?.electronAPI;
            const [repRows, vehicleRows, warehouseRows, itemRows] = await Promise.all([
                safeRows(api?.partner?.getSalesReps),
                safeRows(api?.logistics?.getVehicles),
                safeRows(api?.inventory?.getWarehouses || api?.getWarehouses),
                safeRows(api?.inventory?.getItems || api?.getItems),
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

            setWarehouses(warehouseRows.map((row) => ({
                value: String(row.id || row.code || getLookupLabel(row, ['name_ar', 'name_en', 'name'])),
                label: getLookupLabel(row, ['name_ar', 'name_en', 'name', 'code']) || String(row.id || ''),
                code: String(row.code || ''),
            })).filter((option) => option.label));

            setItems(itemRows.map((row) => ({
                value: String(row.id || row.item_id || row.code || row.item_code || row.sku || ''),
                label: getLookupLabel(row, ['name_ar', 'name_en', 'name', 'item_name']) || String(row.code || row.item_code || ''),
                code: String(row.code || row.item_code || row.sku || ''),
                unit: String(row.unit_name || row.unit || row.unit_code || ''),
            })).filter((option) => option.label || option.code));

            setRows(readStoredRows());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const persistRows = useCallback((nextRows: VanStockSession[]) => {
        setRows(nextRows);
        writeStoredRows(nextRows);
    }, []);

    const openCreate = useCallback(() => {
        setMessage(null);
        setForm(createEmptyForm(rows));
        setFormOpen(true);
    }, [rows]);

    useCreateIntent(openCreate);

    const openEdit = useCallback((row: VanStockSession) => {
        setMessage(null);
        setForm(rowToForm(row));
        setFormOpen(true);
    }, []);

    const duplicateRow = useCallback((row: VanStockSession) => {
        const draft = rowToForm({
            ...row,
            id: '',
            session_no: nextSessionNo(rows),
            stock_date: todayIso(),
            status: 'DRAFT',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        setMessage(null);
        setForm(draft);
        setFormOpen(true);
    }, [rows]);

    const closeModal = useCallback(() => {
        setFormOpen(false);
        setMessage(null);
    }, []);

    const handleDeleteRows = useCallback((selectedRows: VanStockSession[]) => {
        if (selectedRows.length === 0) return;
        const text = selectedRows.length === 1
            ? 'هل تريد حذف جلسة الجرد المحددة؟'
            : `هل تريد حذف ${selectedRows.length} جلسات جرد محددة؟`;
        if (!window.confirm(text)) return;
        const selectedIds = new Set(selectedRows.map((row) => row.id));
        persistRows(rows.filter((row) => !selectedIds.has(row.id)));
    }, [persistRows, rows]);

    const findItem = useCallback((value: string) => {
        const normalized = value.trim().toLowerCase();
        if (!normalized) return undefined;
        return items.find((item) => (
            item.value.toLowerCase() === normalized
            || String(item.code || '').toLowerCase() === normalized
            || item.label.toLowerCase() === normalized
        ));
    }, [items]);

    const updateLine = useCallback((lineId: string, patch: Partial<FormLine>) => {
        setForm((current) => ({
            ...current,
            lines: current.lines.map((line) => line.id === lineId ? { ...line, ...patch } : line),
        }));
    }, []);

    const updateLineWithItem = useCallback((lineId: string, field: 'item_code' | 'item_name', value: string) => {
        const matched = findItem(value);
        if (matched) {
            updateLine(lineId, {
                item_id: matched.value,
                item_code: matched.code || value,
                item_name: matched.label,
                unit_name: matched.unit || '',
            });
            return;
        }
        updateLine(lineId, { [field]: value } as Partial<FormLine>);
    }, [findItem, updateLine]);

    const addLine = useCallback(() => {
        setForm((current) => ({ ...current, lines: [...current.lines, blankLine()] }));
    }, []);

    const removeLine = useCallback((lineId: string) => {
        setForm((current) => ({
            ...current,
            lines: current.lines.length > 1 ? current.lines.filter((line) => line.id !== lineId) : [blankLine()],
        }));
    }, []);

    const saveForm = useCallback((status: VanStockStatus) => {
        const normalized = normalizeForm(form, status);
        if (!normalized.session_no) {
            setMessage('رقم جلسة الجرد مطلوب.');
            return;
        }
        if (!normalized.sales_rep_name) {
            setMessage('اسم المندوب مطلوب.');
            return;
        }
        if (!normalized.vehicle_no) {
            setMessage('رقم السيارة مطلوب.');
            return;
        }
        if (status !== 'DRAFT' && normalized.lines.length === 0) {
            setMessage('أضف صنفًا واحدًا على الأقل قبل اعتماد الجرد.');
            return;
        }

        const existing = rows.find((row) => row.id === normalized.id);
        const rowToSave: VanStockSession = {
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

    const headerStats = useMemo(() => {
        const draft = rows.filter((row) => row.status === 'DRAFT').length;
        const counted = rows.filter((row) => row.status === 'COUNTED' || row.status === 'POSTED').length;
        const totalDifference = rows.reduce((sum, row) => sum + Math.abs(getSessionTotals(row).difference), 0);
        return { draft, counted, totalDifference };
    }, [rows]);

    const formTotals = useMemo(() => {
        return form.lines.reduce(
            (totals, line) => {
                const expected = toNumber(line.expected_qty);
                const counted = toNumber(line.counted_qty);
                return {
                    expected: totals.expected + expected,
                    counted: totals.counted + counted,
                    difference: totals.difference + counted - expected,
                };
            },
            { expected: 0, counted: 0, difference: 0 },
        );
    }, [form.lines]);

    const columns = useMemo<DefinitionListColumn<VanStockSession>[]>(() => [
        {
            key: 'session_no',
            label: 'رمز الجرد',
            type: 'text',
            filterType: 'text',
            width: 160,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.session_no,
            getDisplayValue: (row) => row.session_no,
            renderCell: (row) => <span className="font-mono font-bold text-teal-700">{row.session_no}</span>,
        },
        {
            key: 'stock_date',
            label: 'تاريخ الجرد',
            type: 'date',
            filterType: 'date',
            width: 140,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.stock_date,
            getDisplayValue: (row) => formatDate(row.stock_date),
            renderCell: (row) => <span className="font-mono text-slate-600">{formatDate(row.stock_date)}</span>,
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
            width: 150,
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
            width: 180,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.route_name,
            getDisplayValue: (row) => row.route_name || '-',
        },
        {
            key: 'warehouse_name',
            label: 'مستودع السيارة',
            type: 'text',
            filterType: 'text',
            width: 180,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.warehouse_name,
            getDisplayValue: (row) => row.warehouse_name || '-',
        },
        {
            key: 'items_count',
            label: 'عدد الأصناف',
            type: 'number',
            filterType: 'number',
            width: 130,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.lines.length,
            getDisplayValue: (row) => String(row.lines.length),
            renderCell: (row) => (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {row.lines.length} صنف
                </span>
            ),
        },
        {
            key: 'expected_total',
            label: 'إجمالي المتوقع',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => getSessionTotals(row).expected,
            getDisplayValue: (row) => formatNumber(getSessionTotals(row).expected),
            renderCell: (row) => <span className="font-mono text-slate-500">{formatNumber(getSessionTotals(row).expected)}</span>,
        },
        {
            key: 'counted_total',
            label: 'إجمالي الفعلي',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => getSessionTotals(row).counted,
            getDisplayValue: (row) => formatNumber(getSessionTotals(row).counted),
            renderCell: (row) => <span className="font-mono font-bold text-slate-800">{formatNumber(getSessionTotals(row).counted)}</span>,
        },
        {
            key: 'difference',
            label: 'فرق الجرد',
            type: 'number',
            filterType: 'number',
            width: 130,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => getSessionTotals(row).difference,
            getDisplayValue: (row) => formatNumber(getSessionTotals(row).difference),
            renderCell: (row) => {
                const diff = getSessionTotals(row).difference;
                return (
                    <span className={`font-mono font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
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
            width: 130,
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
                                <Truck className="text-teal-600" size={22} />
                                {form.id ? 'تعديل جلسة جرد سيارة' : 'جلسة جرد سيارة جديدة'}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">تسجيل رصيد السيارة المتوقع والعد الفعلي لكل صنف.</p>
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
                            <Field label="رقم الجلسة">
                                <input
                                    value={form.session_no}
                                    onChange={(event) => setForm((current) => ({ ...current, session_no: event.target.value }))}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="تاريخ الجرد">
                                <input
                                    type="date"
                                    value={form.stock_date}
                                    onChange={(event) => setForm((current) => ({ ...current, stock_date: event.target.value }))}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="اسم المندوب">
                                <input
                                    list="van-stock-reps"
                                    value={form.sales_rep_name}
                                    onChange={(event) => setForm((current) => ({ ...current, sales_rep_name: event.target.value }))}
                                    placeholder="اختر أو اكتب اسم المندوب..."
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="السيارة">
                                <input
                                    list="van-stock-vehicles"
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
                            <Field label="مستودع السيارة">
                                <input
                                    list="van-stock-warehouses"
                                    value={form.warehouse_name}
                                    onChange={(event) => setForm((current) => ({ ...current, warehouse_name: event.target.value }))}
                                    placeholder="اختر أو اكتب المستودع..."
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                            <Field label="الحالة">
                                <select
                                    value={form.status}
                                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as VanStockStatus }))}
                                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </Field>
                            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs font-bold text-slate-600">
                                <span>
                                    المتوقع
                                    <strong className="mt-1 block font-mono text-base text-slate-900">{formatNumber(formTotals.expected)}</strong>
                                </span>
                                <span>
                                    الفعلي
                                    <strong className="mt-1 block font-mono text-base text-slate-900">{formatNumber(formTotals.counted)}</strong>
                                </span>
                                <span>
                                    الفرق
                                    <strong className={`mt-1 block font-mono text-base ${formTotals.difference < 0 ? 'text-red-600' : formTotals.difference > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        {formTotals.difference > 0 ? `+${formatNumber(formTotals.difference)}` : formatNumber(formTotals.difference)}
                                    </strong>
                                </span>
                            </div>
                            <Field label="ملاحظات" className="lg:col-span-4">
                                <textarea
                                    value={form.notes}
                                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                                    placeholder="ملاحظات الجرد أو سبب الفروقات..."
                                    rows={3}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                />
                            </Field>
                        </div>

                        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                                <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-800">
                                    <PackageSearch size={18} className="text-teal-600" />
                                    أصناف السيارة
                                </h3>
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-teal-200 transition hover:bg-teal-700"
                                >
                                    <Plus size={16} />
                                    إضافة صنف
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-[980px] w-full border-collapse text-sm">
                                    <thead className="bg-slate-100 text-xs font-extrabold text-slate-600">
                                        <tr>
                                            <th className="w-12 px-3 py-3 text-center">#</th>
                                            <th className="w-32 px-3 py-3 text-right">رمز الصنف</th>
                                            <th className="min-w-56 px-3 py-3 text-right">الصنف</th>
                                            <th className="w-28 px-3 py-3 text-center">الوحدة</th>
                                            <th className="w-32 px-3 py-3 text-center">المتوقع</th>
                                            <th className="w-32 px-3 py-3 text-center">الفعلي</th>
                                            <th className="w-28 px-3 py-3 text-center">الفرق</th>
                                            <th className="min-w-48 px-3 py-3 text-right">ملاحظات</th>
                                            <th className="w-16 px-3 py-3 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.lines.map((line, index) => {
                                            const difference = toNumber(line.counted_qty) - toNumber(line.expected_qty);
                                            return (
                                                <tr key={line.id} className="border-t border-slate-100">
                                                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-400">{index + 1}</td>
                                                    <td className="px-3 py-3">
                                                        <input
                                                            list="van-stock-item-codes"
                                                            value={line.item_code}
                                                            onChange={(event) => updateLineWithItem(line.id, 'item_code', event.target.value)}
                                                            className="h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <input
                                                            list="van-stock-items"
                                                            value={line.item_name}
                                                            onChange={(event) => updateLineWithItem(line.id, 'item_name', event.target.value)}
                                                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <input
                                                            value={line.unit_name}
                                                            onChange={(event) => updateLine(line.id, { unit_name: event.target.value })}
                                                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-center text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <input
                                                            type="number"
                                                            value={line.expected_qty}
                                                            onChange={(event) => updateLine(line.id, { expected_qty: event.target.value })}
                                                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-center font-mono text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <input
                                                            type="number"
                                                            value={line.counted_qty}
                                                            onChange={(event) => updateLine(line.id, { counted_qty: event.target.value })}
                                                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-center font-mono text-sm font-bold outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`font-mono font-bold ${difference < 0 ? 'text-red-600' : difference > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            {difference > 0 ? `+${formatNumber(difference)}` : formatNumber(difference)}
                                                        </span>
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
                                                            aria-label="حذف الصنف"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <datalist id="van-stock-reps">
                            {salesReps.map((option) => <option key={option.value} value={option.label}>{option.code || option.label}</option>)}
                        </datalist>
                        <datalist id="van-stock-vehicles">
                            {vehicles.map((option) => <option key={option.value} value={option.label}>{option.code || option.label}</option>)}
                        </datalist>
                        <datalist id="van-stock-warehouses">
                            {warehouses.map((option) => <option key={option.value} value={option.label}>{option.code || option.label}</option>)}
                        </datalist>
                        <datalist id="van-stock-items">
                            {items.map((option) => <option key={`${option.value}-name`} value={option.label}>{option.code || option.label}</option>)}
                        </datalist>
                        <datalist id="van-stock-item-codes">
                            {items.map((option) => <option key={`${option.value}-code`} value={option.code || option.label}>{option.label}</option>)}
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
                                onClick={() => saveForm('COUNTED')}
                                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-teal-700"
                            >
                                <ClipboardCheck size={16} />
                                اعتماد الجرد
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
                headerIcon={<Truck className="h-5 w-5" />}
                headerTitle="جرد سيارة المندوب"
                headerSubtitle="إدارة جلسات جرد مخزون سيارات المندوبين ومطابقة الرصيد المتوقع مع العد الفعلي."
                headerBadges={[
                    { label: `${rows.length} جلسة`, tone: 'info', mono: true },
                    { label: `${headerStats.draft} مسودة`, tone: 'warning', mono: true },
                    { label: `${headerStats.counted} معتمدة`, tone: 'success', mono: true },
                    { label: `فرق ${formatNumber(headerStats.totalDifference)}`, tone: 'neutral', mono: true },
                ]}
                screenKey="trade.distribution.van-stock"
                data={rows}
                loading={loading}
                columns={columns}
                rowKey={(row) => row.id}
                searchPlaceholder="بحث برقم الجلسة أو المندوب أو السيارة أو المسار..."
                emptyMessage="لا توجد جلسات جرد سيارة مطابقة للمعايير الحالية"
                createLabel="جلسة جرد جديدة"
                onCreate={openCreate}
                onEdit={openEdit}
                onDuplicate={duplicateRow}
                onDelete={handleDeleteRows}
                onRefresh={loadData}
                onRowDoubleClick={openEdit}
                defaultSort={{ key: 'stock_date', direction: 'desc' }}
            />
            {modal}
        </div>
    );
}
