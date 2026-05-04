import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Edit, FileSpreadsheet } from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../components/definitions/DefinitionMasterList';

type BudgetRow = {
    id: string;
    name?: string;
    fiscal_year?: number;
    year?: number;
    description?: string;
    status?: string;
    is_active?: number | boolean;
    totalBudget?: number;
    total_budget?: number;
    lines?: any[];
};

function toNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown) {
    return toNumber(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getFiscalYear(budget: BudgetRow) {
    return Number(budget.fiscal_year || budget.year || new Date().getFullYear());
}

function getTotalBudget(budget: BudgetRow) {
    if (budget.totalBudget !== undefined) return toNumber(budget.totalBudget);
    if (budget.total_budget !== undefined) return toNumber(budget.total_budget);
    if (Array.isArray(budget.lines)) {
        return budget.lines.reduce((sum, line) => sum + toNumber(line.amount || line.totalAllocation), 0);
    }
    return 0;
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

function isActive(value: unknown) {
    return value !== 0 && value !== false;
}

export function BudgetList() {
    const [budgets, setBudgets] = useState<BudgetRow[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const loadBudgets = useCallback(async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.budgets.list();
            setBudgets(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load budgets', error);
            setBudgets([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadBudgets();
    }, [loadBudgets]);

    const openBudget = useCallback((budget: BudgetRow) => {
        if (!budget.id) return;
        navigate(`/financials/budgets/${budget.id}`);
    }, [navigate]);

    const headerStats = useMemo(() => {
        const approved = budgets.filter((budget) => String(budget.status || '').toUpperCase() === 'APPROVED').length;
        const draft = budgets.filter((budget) => String(budget.status || 'DRAFT').toUpperCase() === 'DRAFT').length;
        const total = budgets.reduce((sum, budget) => sum + getTotalBudget(budget), 0);
        return { approved, draft, total };
    }, [budgets]);

    const columns = useMemo<DefinitionListColumn<BudgetRow>[]>(() => [
        {
            key: 'name',
            label: 'اسم الموازنة',
            type: 'text',
            filterType: 'text',
            width: 260,
            defaultVisible: true,
            align: 'right',
            getValue: (budget) => budget.name || '',
            getDisplayValue: (budget) => budget.name || '-',
            getSearchValue: (budget) => `${budget.name || ''} ${getFiscalYear(budget)} ${budget.description || ''}`,
            renderCell: (budget) => <span className="font-bold text-slate-800">{budget.name || '-'}</span>,
        },
        {
            key: 'fiscal_year',
            label: 'السنة المالية',
            type: 'number',
            filterType: 'number',
            width: 140,
            defaultVisible: true,
            align: 'center',
            getValue: getFiscalYear,
            getDisplayValue: (budget) => String(getFiscalYear(budget)),
            renderCell: (budget) => <span className="font-mono font-bold text-slate-700">{getFiscalYear(budget)}</span>,
        },
        {
            key: 'total_budget',
            label: 'إجمالي الموازنة',
            type: 'number',
            filterType: 'number',
            width: 170,
            defaultVisible: true,
            align: 'center',
            getValue: getTotalBudget,
            getDisplayValue: (budget) => formatMoney(getTotalBudget(budget)),
            renderCell: (budget) => <span className="font-mono font-bold text-slate-800">{formatMoney(getTotalBudget(budget))}</span>,
        },
        {
            key: 'lines_count',
            label: 'عدد البنود',
            type: 'number',
            filterType: 'number',
            width: 125,
            defaultVisible: true,
            align: 'center',
            getValue: (budget) => budget.lines?.length || 0,
            getDisplayValue: (budget) => String(budget.lines?.length || 0),
            renderCell: (budget) => (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {budget.lines?.length || 0} بند
                </span>
            ),
        },
        {
            key: 'status',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            width: 135,
            defaultVisible: true,
            align: 'center',
            options: [
                { value: 'DRAFT', label: 'مسودة' },
                { value: 'APPROVED', label: 'معتمدة' },
                { value: 'POSTED', label: 'مرحلة' },
                { value: 'CLOSED', label: 'مغلقة' },
            ],
            getValue: (budget) => String(budget.status || 'DRAFT').toUpperCase(),
            getDisplayValue: (budget) => getStatusLabel(budget.status),
            renderCell: (budget) => (
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(budget.status)}`}>
                    {getStatusLabel(budget.status)}
                </span>
            ),
        },
        {
            key: 'is_active',
            label: 'فعالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 110,
            defaultVisible: false,
            align: 'center',
            getValue: (budget) => (isActive(budget.is_active) ? 1 : 0),
            getDisplayValue: (budget) => (isActive(budget.is_active) ? 'نعم' : 'لا'),
        },
        {
            key: 'actions',
            label: 'الإجراءات',
            width: 120,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (budget) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        openBudget(budget);
                    }}
                    className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                    title="فتح الموازنة"
                    aria-label="فتح الموازنة"
                >
                    <Edit size={16} />
                </button>
            ),
        },
    ], [openBudget]);

    return (
        <div className="h-full overflow-auto bg-slate-50 p-6" dir="rtl">
            <DefinitionMasterList
                headerIcon={<FileSpreadsheet className="h-5 w-5" />}
                headerTitle="الموازنات التقديرية"
                headerSubtitle="إدارة الموازنات المالية والتوقعات مع خصائص الجداول الموحدة."
                headerBadges={[
                    { label: `${budgets.length} موازنة`, tone: 'info', mono: true },
                    { label: `${headerStats.draft} مسودة`, tone: 'warning', mono: true },
                    { label: `${headerStats.approved} معتمدة`, tone: 'success', mono: true },
                    { label: `الإجمالي ${formatMoney(headerStats.total)}`, tone: 'neutral', mono: true },
                ]}
                screenKey="financials.budgets"
                data={budgets}
                loading={loading}
                columns={columns}
                rowKey={(budget) => String(budget.id)}
                searchPlaceholder="بحث باسم الموازنة أو السنة المالية..."
                emptyMessage="لا توجد موازنات مطابقة للمعايير الحالية"
                createLabel="موازنة جديدة"
                onCreate={() => navigate('/financials/budgets/new')}
                onEdit={openBudget}
                onRowDoubleClick={openBudget}
                onRefresh={loadBudgets}
                defaultSort={{ key: 'fiscal_year', direction: 'desc' }}
                toolbarExtraActions={(
                    <button
                        type="button"
                        onClick={() => navigate('/reports/financial/budget-variance')}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                    >
                        <BarChart3 size={16} />
                        <span>تقرير الأداء</span>
                    </button>
                )}
            />
        </div>
    );
}
