import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DefinitionMasterList, { DefinitionListColumn } from '../../components/definitions/DefinitionMasterList';
import { useScreenViewManager } from '../../hooks/useScreenViewManager';
import { useMyPermissions } from '../../hooks/useMyPermissions';
import type { ColumnSchema } from '../../config/screenRegistry';

const SCREEN_KEY = 'purchases.invoice.list';

const AR_LABELS: Record<string, string> = {
    'column.purchases.invoice.doc_no': 'رقم الفاتورة',
    'column.purchases.invoice.doc_date': 'التاريخ',
    'column.purchases.invoice.partner_name': 'المورد',
    'column.purchases.invoice.status': 'الحالة',
    'column.purchases.invoice.total': 'الإجمالي',
    'column.purchases.invoice.branch_id': 'الفرع',
    'filter.purchases.invoice.doc_no': 'رقم الفاتورة',
    'filter.purchases.invoice.doc_date': 'التاريخ',
    'filter.purchases.invoice.partner_name': 'المورد',
    'filter.purchases.invoice.status': 'الحالة',
    'filter.purchases.invoice.total': 'الإجمالي',
    'filter.purchases.invoice.branch_id': 'الفرع',
    'doc.purchase_invoice.title': 'فواتير المشتريات',
    'doc.purchase_invoice.subtitle': 'سجل فواتير الموردين',
    'doc.purchase_invoice.empty': 'لا توجد فواتير تطابق عوامل التصفية الحالية',
    'doc.purchase_invoice.new': 'فاتورة مشتريات جديدة',
    'ui.actions': 'إجراءات',
    'ui.list.open': 'فتح',
    'ui.list.records': 'سجل',
    'ui.list.search_placeholder': 'بحث...',
    'error.views.screen_not_registered': 'تعريف الشاشة غير مسجل.',
    'error.permission_denied': 'لا توجد صلاحية للوصول.',
    'status.draft': 'مسودة',
    'status.posted': 'مرحل',
    'status.void': 'ملغى',
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

const COLUMN_FALLBACK_LABELS: Record<string, string> = {
    doc_no: 'رقم الفاتورة',
    doc_date: 'التاريخ',
    partner_name: 'المورد',
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

export default function PurchaseInvoiceList() {
    const navigate = useNavigate();
    const { can, whyNot } = useMyPermissions();
    const canRead = can('purchase.invoice.read');
    const canCreate = can('purchase.invoice.create');
    const createDeniedReason = whyNot('purchase.invoice.create');
    const readDeniedReason = whyNot('purchase.invoice.read');
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'rtl';

    const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([]);

    const {
        definition,
        result,
        isApplying,
        apply,
    } = useScreenViewManager(SCREEN_KEY, { autoApply: true, pageSize: 200 });

    useEffect(() => {
        let mounted = true;
        const loadBranches = async () => {
            try {
                const rows = await (window as any)?.electronAPI?.branch?.getBranches?.();
                if (!mounted || !Array.isArray(rows)) return;
                const options = rows.map((row: any) => ({
                    value: String(row.id || ''),
                    label: String(row.name_ar || row.name_en || row.name || row.id || ''),
                })).filter((item: any) => item.value);
                setBranchOptions(options);
            } catch {
                // best effort only
            }
        };
        void loadBranches();
        return () => {
            mounted = false;
        };
    }, []);

    const rows = useMemo(() => (Array.isArray(result?.rows) ? result.rows : []), [result?.rows]);

    const openInvoice = useCallback((row: any) => {
        const id = String(row?.id || '').trim();
        if (id) navigate(`/purchases/invoices/${id}`);
    }, [navigate]);

    const statusOptions = useMemo(() => (
        definition?.filterSchema.find((item) => item.key === 'status')?.options || []
    ).map((option) => ({
        value: option.value,
        label: getStatusLabel(option.value || option.label),
    })), [definition]);

    const branchLabelById = useMemo(
        () => new Map(branchOptions.map((option) => [option.value, option.label])),
        [branchOptions],
    );

    const listColumns = useMemo<DefinitionListColumn<any>[]>(() => {
        if (!definition) return [];

        const mappedColumns = definition.columnSchema
            .filter((column: ColumnSchema) => column.key !== 'id')
            .map<DefinitionListColumn<any>>((column) => {
                const label = tr(column.labelI18nKey, COLUMN_FALLBACK_LABELS[column.key] || column.key);
                const isStatus = column.key === 'status';
                const isBranch = column.key === 'branch_id';

                return {
                    key: column.key,
                    label,
                    type: isBranch ? 'enum' : column.type,
                    filterType: isBranch ? 'enum' : column.type === 'enum' ? 'enum' : column.type,
                    options: isStatus ? statusOptions : isBranch ? branchOptions : undefined,
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
                        if (isBranch) return branchLabelById.get(String(value || '')) || String(value || '-');
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
                        if (isBranch) return branchLabelById.get(String(value || '')) || String(value || '-');
                        if (column.type === 'number') {
                            return <span className="font-mono font-semibold text-emerald-700">{formatNumber(value)}</span>;
                        }
                        if (column.type === 'date') return <span className="font-mono text-slate-600">{formatDate(value)}</span>;
                        if (column.key === 'doc_no') {
                            return <span className="font-mono font-bold text-amber-700">{String(value || '-')}</span>;
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
                        openInvoice(row);
                    }}
                    className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                >
                    {tr('ui.list.open', 'فتح')}
                </button>
            ),
        });

        return mappedColumns;
    }, [branchLabelById, branchOptions, definition, openInvoice, statusOptions]);

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
            <DefinitionMasterList
                headerIcon={<FileText className="h-5 w-5" />}
                headerTitle={tr('doc.purchase_invoice.title', 'فواتير المشتريات')}
                headerSubtitle={tr('doc.purchase_invoice.subtitle', 'سجل فواتير الموردين')}
                headerBadges={[{ label: `${rows.length} ${tr('ui.list.records', 'سجل')}`, tone: 'info', mono: true }]}
                screenKey={SCREEN_KEY}
                data={rows}
                loading={isApplying}
                columns={listColumns}
                rowKey={(row) => String(row.id)}
                searchPlaceholder={tr('ui.list.search_placeholder', 'بحث...')}
                emptyMessage={tr('doc.purchase_invoice.empty', 'لا توجد فواتير تطابق عوامل التصفية الحالية')}
                createLabel={tr('doc.purchase_invoice.new', 'فاتورة مشتريات جديدة')}
                onCreate={canCreate ? () => navigate('/purchases/invoices/new') : undefined}
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
