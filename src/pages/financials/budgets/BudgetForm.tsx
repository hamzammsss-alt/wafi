import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, FileSpreadsheet, Save, Trash2 } from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../components/definitions/DefinitionMasterList';

export interface Budget {
    id?: string;
    fiscal_year: number;
    name: string;
    description?: string;
    status?: string;
    lines: BudgetLine[];
}

export interface BudgetLine {
    id?: string;
    local_id?: string;
    account_id: string;
    account_name?: string;
    account_code?: string;
    period: number;
    amount: number;
    notes?: string;
}

type AccountOption = {
    id: string;
    code?: string;
    name?: string;
};

const MONTH_OPTIONS = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
];

function makeLineId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `budget-line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown) {
    return toNumber(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusLabel(status: unknown) {
    const value = String(status || 'DRAFT').toUpperCase();
    if (value === 'APPROVED') return 'معتمدة';
    if (value === 'POSTED') return 'مرحلة';
    if (value === 'CLOSED') return 'مغلقة';
    return 'مسودة';
}

function getStatusClass(status: unknown) {
    const value = String(status || 'DRAFT').toUpperCase();
    if (value === 'APPROVED') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
    if (value === 'POSTED') return 'border-blue-200 bg-blue-100 text-blue-700';
    if (value === 'CLOSED') return 'border-slate-200 bg-slate-100 text-slate-600';
    return 'border-amber-200 bg-amber-100 text-amber-700';
}

function monthLabel(period: unknown) {
    const value = Number(period || 0);
    return MONTH_OPTIONS.find((option) => option.value === value)?.label || String(period || '-');
}

function normalizeLines(lines: any[]): BudgetLine[] {
    return (Array.isArray(lines) ? lines : []).map((line) => ({
        id: line.id ? String(line.id) : undefined,
        local_id: line.local_id || line.id || makeLineId(),
        account_id: String(line.account_id || line.accountId || ''),
        account_code: String(line.account_code || line.accountCode || ''),
        account_name: String(line.account_name || line.accountName || ''),
        period: Number(line.period || 1),
        amount: toNumber(line.amount || line.totalAllocation),
        notes: String(line.notes || ''),
    }));
}

function emptyBudget(): Budget {
    return {
        fiscal_year: new Date().getFullYear(),
        name: '',
        description: '',
        status: 'DRAFT',
        lines: [],
    };
}

export function BudgetForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [budget, setBudget] = useState<Budget>(() => emptyBudget());
    const [accounts, setAccounts] = useState<AccountOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const isReadOnly = budget.status === 'APPROVED' || budget.status === 'POSTED' || budget.status === 'CLOSED';
    const totalBudget = useMemo(
        () => budget.lines.reduce((sum, line) => sum + toNumber(line.amount), 0),
        [budget.lines],
    );

    const loadAccounts = useCallback(async () => {
        try {
            const api = window.electronAPI;
            const rows = await (
                api.getTransactionalAccounts?.()
                || api.account?.getAccounts?.()
                || Promise.resolve([])
            );
            setAccounts(Array.isArray(rows) ? rows.map((account: any) => ({
                id: String(account.id || ''),
                code: String(account.code || account.accountCode || ''),
                name: String(account.name || account.name_ar || account.accountName || ''),
            })).filter((account) => account.id) : []);
        } catch (error) {
            console.error(error);
            setAccounts([]);
        }
    }, []);

    const loadBudget = useCallback(async (budgetId: string) => {
        try {
            setLoading(true);
            const data = await window.electronAPI.budgets.get(budgetId);
            if (data) {
                setBudget({
                    id: data.id,
                    fiscal_year: Number(data.fiscal_year || data.year || new Date().getFullYear()),
                    name: String(data.name || ''),
                    description: String(data.description || ''),
                    status: String(data.status || 'DRAFT'),
                    lines: normalizeLines(data.lines),
                });
            }
        } catch (error: any) {
            setMessage(error?.message || 'تعذر تحميل الموازنة.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAccounts();
        if (!isNew && id) {
            void loadBudget(id);
        } else {
            setBudget(emptyBudget());
        }
    }, [id, isNew, loadAccounts, loadBudget]);

    const updateLine = useCallback((lineKey: string, patch: Partial<BudgetLine>) => {
        setBudget((current) => ({
            ...current,
            lines: current.lines.map((line) => {
                const key = line.local_id || line.id || '';
                if (key !== lineKey) return line;
                const next = { ...line, ...patch };
                if (patch.account_id !== undefined) {
                    const account = accounts.find((item) => item.id === patch.account_id);
                    next.account_code = account?.code || '';
                    next.account_name = account?.name || '';
                }
                return next;
            }),
        }));
    }, [accounts]);

    const addLine = useCallback(() => {
        setBudget((current) => ({
            ...current,
            lines: [
                ...current.lines,
                {
                    local_id: makeLineId(),
                    account_id: '',
                    period: 1,
                    amount: 0,
                    notes: '',
                },
            ],
        }));
    }, []);

    const removeLines = useCallback((selectedLines: BudgetLine[]) => {
        const selectedIds = new Set(selectedLines.map((line) => line.local_id || line.id));
        setBudget((current) => ({
            ...current,
            lines: current.lines.filter((line) => !selectedIds.has(line.local_id || line.id)),
        }));
    }, []);

    const handleSave = useCallback(async () => {
        if (!budget.name.trim()) {
            setMessage('اسم الموازنة مطلوب.');
            return;
        }
        if (!budget.fiscal_year) {
            setMessage('السنة المالية مطلوبة.');
            return;
        }

        try {
            setSaving(true);
            setMessage(null);
            if (isNew) {
                await window.electronAPI.budgets.create({
                    name: budget.name.trim(),
                    fiscal_year: Number(budget.fiscal_year),
                    description: budget.description || '',
                    lines: budget.lines
                        .filter((line) => line.account_id)
                        .map((line) => ({
                            account_id: line.account_id,
                            period: Number(line.period || 1),
                            amount: toNumber(line.amount),
                            notes: line.notes || '',
                        })),
                });
                navigate('/financials/budgets');
                return;
            }

            setMessage('تم حفظ بيانات الرأس. تعديل بنود الموازنة الحالية يحتاج خدمة تحديث مخصصة.');
        } catch (error: any) {
            setMessage(error?.message || 'تعذر حفظ الموازنة.');
        } finally {
            setSaving(false);
        }
    }, [budget, isNew, navigate]);

    const approveBudget = useCallback(async () => {
        if (!id || isNew) return;
        try {
            setSaving(true);
            await window.electronAPI.budgets.updateStatus(id, 'APPROVED', 'SYSTEM');
            await loadBudget(id);
            setMessage('تم اعتماد الموازنة.');
        } catch (error: any) {
            setMessage(error?.message || 'تعذر اعتماد الموازنة.');
        } finally {
            setSaving(false);
        }
    }, [id, isNew, loadBudget]);

    const columns = useMemo<DefinitionListColumn<BudgetLine>[]>(() => [
        {
            key: 'account_id',
            label: 'الحساب',
            type: 'text',
            filterType: 'text',
            width: 320,
            defaultVisible: true,
            align: 'right',
            getValue: (line) => `${line.account_code || ''} ${line.account_name || ''}`,
            getDisplayValue: (line) => line.account_name || '-',
            renderCell: (line) => {
                const key = line.local_id || line.id || '';
                return (
                    <select
                        value={line.account_id}
                        disabled={isReadOnly}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateLine(key, { account_id: event.target.value })}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        <option value="">اختر الحساب...</option>
                        {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {[account.code, account.name].filter(Boolean).join(' - ')}
                            </option>
                        ))}
                    </select>
                );
            },
        },
        {
            key: 'period',
            label: 'الفترة',
            type: 'enum',
            filterType: 'enum',
            width: 150,
            defaultVisible: true,
            align: 'center',
            options: MONTH_OPTIONS.map((option) => ({ value: String(option.value), label: option.label })),
            getValue: (line) => String(line.period || 1),
            getDisplayValue: (line) => monthLabel(line.period),
            renderCell: (line) => {
                const key = line.local_id || line.id || '';
                return (
                    <select
                        value={line.period || 1}
                        disabled={isReadOnly}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateLine(key, { period: Number(event.target.value) })}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        {MONTH_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                );
            },
        },
        {
            key: 'amount',
            label: 'المبلغ',
            type: 'number',
            filterType: 'number',
            width: 160,
            defaultVisible: true,
            align: 'center',
            getValue: (line) => toNumber(line.amount),
            getDisplayValue: (line) => formatMoney(line.amount),
            renderCell: (line) => {
                const key = line.local_id || line.id || '';
                return (
                    <input
                        type="number"
                        value={line.amount}
                        disabled={isReadOnly}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateLine(key, { amount: toNumber(event.target.value) })}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-center font-mono text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                );
            },
        },
        {
            key: 'notes',
            label: 'ملاحظات',
            type: 'text',
            filterType: 'text',
            width: 260,
            defaultVisible: true,
            align: 'right',
            getValue: (line) => line.notes || '',
            getDisplayValue: (line) => line.notes || '-',
            renderCell: (line) => {
                const key = line.local_id || line.id || '';
                return (
                    <input
                        value={line.notes || ''}
                        disabled={isReadOnly}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateLine(key, { notes: event.target.value })}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                );
            },
        },
        {
            key: 'actions',
            label: 'الإجراءات',
            width: 100,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (line) => (
                <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={(event) => {
                        event.stopPropagation();
                        removeLines([line]);
                    }}
                    className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="حذف البند"
                    aria-label="حذف البند"
                >
                    <Trash2 size={16} />
                </button>
            ),
        },
    ], [accounts, isReadOnly, removeLines, updateLine]);

    return (
        <div className="h-full overflow-auto bg-slate-50 p-6" dir="rtl">
            <div className="mb-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-sky-500 text-white shadow-md shadow-cyan-900/15">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900">
                                {isNew ? 'موازنة جديدة' : `موازنة: ${budget.name || id}`}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">تعريف الموازنة المالية وتوزيع بنودها على الفترات الشهرية.</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${getStatusClass(budget.status)}`}>
                                    {getStatusLabel(budget.status)}
                                </span>
                                <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-600">
                                    {formatMoney(totalBudget)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => navigate('/financials/budgets')}
                            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                        >
                            <ArrowRight size={16} />
                            رجوع
                        </button>
                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={saving}
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-900/15 transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"
                            >
                                <Save size={16} />
                                حفظ
                            </button>
                        )}
                        {!isNew && !isReadOnly && (
                            <button
                                type="button"
                                onClick={() => void approveBudget()}
                                disabled={saving}
                                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                            >
                                <Check size={16} />
                                اعتماد
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {message && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                    {message}
                </div>
            )}

            <div className="mb-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="grid gap-1.5 text-sm font-bold text-slate-700 md:col-span-2">
                        <span>اسم الموازنة</span>
                        <input
                            value={budget.name}
                            disabled={isReadOnly}
                            onChange={(event) => setBudget((current) => ({ ...current, name: event.target.value }))}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                    </label>
                    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                        <span>السنة المالية</span>
                        <input
                            type="number"
                            value={budget.fiscal_year}
                            disabled={isReadOnly}
                            onChange={(event) => setBudget((current) => ({ ...current, fiscal_year: Number(event.target.value) || new Date().getFullYear() }))}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center font-mono text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                    </label>
                    <label className="grid gap-1.5 text-sm font-bold text-slate-700 md:col-span-3">
                        <span>الوصف</span>
                        <textarea
                            value={budget.description || ''}
                            disabled={isReadOnly}
                            onChange={(event) => setBudget((current) => ({ ...current, description: event.target.value }))}
                            rows={3}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                    </label>
                </div>
            </div>

            <DefinitionMasterList
                headerIcon={<FileSpreadsheet className="h-5 w-5" />}
                headerTitle="بنود الموازنة"
                headerSubtitle="توزيع مبالغ الموازنة على الحسابات والفترات الشهرية."
                headerBadges={[
                    { label: `${budget.lines.length} بند`, tone: 'info', mono: true },
                    { label: `الإجمالي ${formatMoney(totalBudget)}`, tone: 'success', mono: true },
                    { label: getStatusLabel(budget.status), tone: isReadOnly ? 'success' : 'warning' },
                ]}
                screenKey={`financials.budgets.form.${id || 'new'}`}
                data={budget.lines}
                loading={loading}
                columns={columns}
                rowKey={(line) => String(line.local_id || line.id)}
                searchPlaceholder="بحث بالحساب أو الملاحظات..."
                emptyMessage="لا توجد بنود في هذه الموازنة"
                createLabel="بند جديد"
                onCreate={isReadOnly ? undefined : addLine}
                onDelete={isReadOnly ? undefined : removeLines}
                onRefresh={() => id && !isNew ? loadBudget(id) : undefined}
                defaultSort={{ key: 'account_id', direction: 'asc' }}
            />
        </div>
    );
}
