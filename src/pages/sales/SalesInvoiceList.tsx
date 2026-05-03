import React, { useCallback, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DefinitionMasterList, { DefinitionListColumn } from '../../components/definitions/DefinitionMasterList';
import { useSalesInvoiceList } from '../../hooks/useSalesInvoiceList';
import type { ColumnSchema } from '../../config/screenRegistry';

const AR_LABELS: Record<string, string> = {
    'column.sales.invoice.doc_no': 'رقم الفاتورة',
    'column.sales.invoice.doc_date': 'التاريخ',
    'column.sales.invoice.due_date': 'تاريخ الاستحقاق',
    'column.sales.invoice.partner_name': 'العميل',
    'column.sales.invoice.status': 'الحالة',
    'column.sales.invoice.total': 'الإجمالي',
    'column.sales.invoice.branch_id': 'الفرع',
    'filter.sales.invoice.doc_no': 'رقم الفاتورة',
    'filter.sales.invoice.doc_date': 'التاريخ',
    'filter.sales.invoice.due_date': 'تاريخ الاستحقاق',
    'filter.sales.invoice.partner_name': 'العميل',
    'filter.sales.invoice.status': 'الحالة',
    'filter.sales.invoice.total': 'الإجمالي',
    'filter.sales.invoice.branch_id': 'الفرع',
    'doc.sales_invoice.title': 'فواتير المبيعات',
    'doc.sales_invoice.subtitle': 'سجل فواتير العملاء',
    'doc.sales_invoice.empty': 'لا توجد فواتير تطابق عوامل التصفية الحالية',
    'doc.sales_invoice.new': 'فاتورة مبيعات جديدة',
    'doc.sales_invoice.action.create_return': 'إنشاء مرتجع',
    'ui.actions': 'إجراءات',
    'ui.list.open': 'فتح',
    'ui.list.records': 'سجل',
    'ui.list.search_placeholder': 'بحث...',
    'error.views.screen_not_registered': 'تعريف الشاشة غير مسجل.',
    'error.permission_denied': 'لا توجد صلاحية للوصول.',
    'error.sales_invoice.branch_lookup_failed': 'تعذر تحميل قائمة الفروع.',
};

function tr(key: string, fallback?: string): string {
    if (AR_LABELS[key]) return AR_LABELS[key];
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key && !/^[A-Za-z0-9\s._-]+$/.test(value)) return value;
    }
    return fallback || key;
}

const SALES_COLUMN_FALLBACK_LABELS: Record<string, string> = {
    doc_no: 'رقم الفاتورة',
    doc_date: 'التاريخ',
    due_date: 'تاريخ الاستحقاق',
    partner_name: 'العميل',
    status: 'الحالة',
    total: 'الإجمالي',
    branch_id: 'الفرع',
};

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'مسودة',
    POSTED: 'مرحل',
    VOID: 'ملغى',
    VOIDED: 'ملغى',
    CANCELLED: 'ملغى',
    CANCELED: 'ملغى',
};

function getStatusLabel(status: unknown) {
    const value = String(status || '').trim().toUpperCase();
    return STATUS_LABELS[value] || String(status || '').trim() || '-';
}

function getStatusClass(status: unknown) {
    const value = String(status || '').trim().toUpperCase();
    if (value === 'POSTED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (value === 'VOID' || value === 'VOIDED' || value === 'CANCELLED' || value === 'CANCELED') {
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatDate(value: unknown) {
    if (!value) return '-';
    const raw = String(value);
    const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    return isoDate || raw;
}

function formatNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
}

export default function SalesInvoiceList() {
    const navigate = useNavigate();
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'rtl';

    const {
        screenKey,
        definition,
        canRead,
        canCreate,
        canCreateReturn,
        createDeniedReason,
        readDeniedReason,
        lookupErrorKey,
        rows,
        isApplying,
        filterSchema,
        fallbackColumnLabels,
        apply,
    } = useSalesInvoiceList();

    const openInvoice = useCallback((row: any) => {
        const id = String(row?.id || '').trim();
        if (id) navigate(`/sales/invoices/${id}`);
    }, [navigate]);

    const statusOptions = useMemo(() => (
        filterSchema.find((item) => item.key === 'status')?.options || []
    ).map((option) => ({
        value: option.value,
        label: getStatusLabel(option.value || option.label),
    })), [filterSchema]);

    const listColumns = useMemo<DefinitionListColumn<any>[]>(() => {
        if (!definition) return [];

        const mappedColumns = definition.columnSchema
            .filter((column: ColumnSchema) => column.key !== 'id')
            .map<DefinitionListColumn<any>>((column) => {
                const label = tr(column.labelI18nKey, SALES_COLUMN_FALLBACK_LABELS[column.key] || fallbackColumnLabels[column.key] || column.key);
                const isStatus = column.key === 'status';

                return {
                    key: column.key,
                    label,
                    type: column.type,
                    filterType: column.type === 'enum' ? 'enum' : column.type,
                    options: isStatus ? statusOptions : undefined,
                    width: column.width || 140,
                    defaultVisible: column.defaultVisible,
                    sortable: column.sortable,
                    filterable: true,
                    searchable: true,
                    align: column.type === 'number' ? 'right' : column.type === 'date' ? 'center' : 'right',
                    getValue: (row) => row?.[column.key],
                    getDisplayValue: (row) => {
                        const value = row?.[column.key];
                        if (isStatus) {
                            const match = statusOptions.find((option) => option.value === String(value || ''));
                            return match?.label || String(value || '-');
                        }
                        if (column.type === 'number') return formatNumber(value);
                        if (column.type === 'date') return formatDate(value);
                        return String(value ?? '') || '-';
                    },
                    renderCell: (row) => {
                        const value = row?.[column.key];
                        if (isStatus) {
                            return (
                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(value)}`}>
                                    {getStatusLabel(value)}
                                </span>
                            );
                        }
                        if (column.type === 'number') {
                            return <span className="font-mono font-semibold text-emerald-700">{formatNumber(value)}</span>;
                        }
                        if (column.type === 'date') return <span className="font-mono text-slate-600">{formatDate(value)}</span>;
                        if (column.key === 'doc_no') {
                            return <span className="font-mono font-bold text-indigo-700">{String(value || '-')}</span>;
                        }
                        return String(value ?? '') || '-';
                    },
                };
            });

        mappedColumns.push({
            key: 'actions',
            label: tr('ui.actions', 'إجراءات'),
            type: 'text',
            filterType: 'text',
            width: 150,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (row) => {
                const rowStatus = String(row?.status || 'DRAFT');
                if (rowStatus === 'POSTED' && canCreateReturn) {
                    return (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                navigate('/sales/returns/new', {
                                    state: {
                                        sourceInvoiceId: row.id,
                                        customerId: row.partner_id,
                                    },
                                });
                            }}
                            className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                        >
                            {tr('doc.sales_invoice.action.create_return', 'إنشاء مرتجع')}
                        </button>
                    );
                }

                return (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            openInvoice(row);
                        }}
                        className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                    >
                        {tr('ui.list.open', 'فتح')}
                    </button>
                );
            },
        });

        return mappedColumns;
    }, [canCreateReturn, definition, fallbackColumnLabels, navigate, openInvoice, statusOptions]);

    if (!definition) {
        return (
            <div className="p-6 text-rose-600" dir={currentDir}>
                {tr('error.views.screen_not_registered', 'تعريف الشاشة غير مسجل.')}
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className="p-6 text-rose-600" dir={currentDir}>
                {tr(readDeniedReason || 'error.permission_denied', 'لا توجد صلاحية للوصول.')}
            </div>
        );
    }

    return (
        <div className="app-page h-full" dir={currentDir}>
            {lookupErrorKey && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {tr(lookupErrorKey, 'تعذر تحميل بعض قوائم الفلاتر.')}
                </div>
            )}

            <DefinitionMasterList
                headerIcon={<FileText className="h-5 w-5" />}
                headerTitle={tr('doc.sales_invoice.title', 'فواتير المبيعات')}
                headerSubtitle={tr('doc.sales_invoice.subtitle', 'سجل فواتير العملاء')}
                headerBadges={[{ label: `${rows.length} ${tr('ui.list.records', 'سجل')}`, tone: 'info', mono: true }]}
                screenKey={screenKey}
                data={rows}
                loading={isApplying}
                columns={listColumns}
                rowKey={(row) => String(row.id)}
                searchPlaceholder={tr('ui.list.search_placeholder', 'بحث...')}
                emptyMessage={tr('doc.sales_invoice.empty', 'لا توجد فواتير تطابق عوامل التصفية الحالية')}
                createLabel={tr('doc.sales_invoice.new', 'فاتورة مبيعات جديدة')}
                onCreate={canCreate ? () => navigate('/sales/invoices/new') : undefined}
                onEdit={openInvoice}
                onRowDoubleClick={openInvoice}
                onRefresh={() => apply({ page: 1 })}
                defaultSort={{ key: 'doc_date', direction: 'desc' }}
                toolbarExtraActions={!canCreate && createDeniedReason ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        {tr(createDeniedReason, 'لا توجد صلاحية')}
                    </span>
                ) : null}
            />
        </div>
    );
}
