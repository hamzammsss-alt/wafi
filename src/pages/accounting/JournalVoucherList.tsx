import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Filter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FilterDrawer from '../../components/ui/FilterDrawer';
import { DocumentStatusBadge } from '../../components/ui/DocumentStatusBadge';
import { DocumentSupportDock } from '../../components/workspace/DocumentSupportDock';
import { WorkspaceHeader } from '../../components/workspace/WorkspaceHeader';
import { buildDocumentSupportSections } from '../../components/workspace/documentSupportSections';
import { useScreenViewManager, getVisibleColumns } from '../../hooks/useScreenViewManager';
import { useExcelListNavigation } from '../../hooks/useExcelListNavigation';
import { useMyPermissions } from '../../hooks/useMyPermissions';
import { JournalVoucherDefinition } from './JournalVoucherDefinition';

const SCREEN_KEY = 'accounting.journal_voucher.list';

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

const COLUMN_FALLBACK_LABELS: Record<string, string> = {
    doc_no: 'رقم القيد',
    voucher_no: 'رقم القيد',
    doc_date: 'التاريخ',
    reference_no: 'المرجع',
    status: 'الحالة',
    total_debit: 'إجمالي المدين',
    branch_id: 'الفرع',
};

export default function JournalVoucherList() {
    const navigate = useNavigate();
    const { can, whyNot } = useMyPermissions();
    const canRead = can('accounting.journal_voucher.read');
    const canCreate = can('accounting.journal_voucher.create');
    const createDeniedReason = whyNot('accounting.journal_voucher.create');
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'ltr';

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([]);

    const {
        definition,
        filters,
        setFilters,
        columns,
        setColumns,
        sort,
        setSort,
        views,
        activeViewId,
        result,
        isApplying,
        apply,
        resetState,
        applySavedView,
        saveCurrentView,
        setDefaultView,
        deleteView,
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

    const filterSchema = useMemo(() => {
        if (!definition) return [];
        return definition.filterSchema.map((item) => {
            if (item.key === 'branch_id') {
                return { ...item, options: branchOptions };
            }
            return item;
        });
    }, [branchOptions, definition]);

    const rows = useMemo(() => (Array.isArray(result?.rows) ? result.rows : []), [result?.rows]);

    const visibleColumns = useMemo(() => {
        if (!definition) return [];
        return getVisibleColumns(definition, columns).filter((col) => col.key !== 'id');
    }, [definition, columns]);
    const helperSections = useMemo(() => buildDocumentSupportSections(JournalVoucherDefinition), []);

    const {
        tableRef,
        selectedIndex,
        setSelectedIndex,
    } = useExcelListNavigation({
        rows,
        enabled: canRead,
        modalOpen: drawerOpen,
        onOpenFilters: () => setDrawerOpen(true),
        onOpenRow: (row: any) => navigate(`/gl/journal-vouchers/${row.id}`),
        onCreate: () => {
            if (canCreate) navigate('/gl/journal-vouchers/new');
        },
        onRefresh: () => {
            void apply({ page: 1 });
        },
    });

    if (!definition) {
        return (
            <div className="p-6 text-rose-600" dir={currentDir}>
                {tr('error.views.screen_not_registered', 'Screen definition is not registered.')}
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className="p-6 text-rose-600" dir={currentDir}>
                {tr(whyNot('accounting.journal_voucher.read') || 'error.permission_denied', 'Permission denied')}
            </div>
        );
    }

    return (
        <div className="app-page h-full flex flex-col gap-4" dir={currentDir}>
            <WorkspaceHeader
                icon={<BookOpenText size={22} />}
                title={tr('doc.journal_voucher.title', 'سندات القيد')}
                subtitle={tr('doc.journal_voucher.subtitle', 'سجل القيود اليومية مع نفس أسلوب السندات الموحدة في النظام')}
                badges={[
                    { label: `${rows.length} قيود`, tone: 'info' },
                    { label: 'F3 جديد', tone: 'neutral' },
                    { label: 'Enter فتح', tone: 'neutral', mono: true },
                ]}
                actions={(
                    <>
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="app-toolbar-btn app-focus-ring"
                        >
                            <Filter size={16} />
                            <span>{tr('ui.filters.title', 'الفلاتر')}</span>
                        </button>
                        <button
                            onClick={() => canCreate && navigate('/gl/journal-vouchers/new')}
                            disabled={!canCreate}
                            title={!canCreate ? tr(createDeniedReason || 'error.permission_denied', 'Permission denied') : undefined}
                            className="rounded-xl bg-gradient-to-r from-teal-600 to-sky-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/15 transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="inline-flex items-center gap-2">
                                <Plus size={16} />
                                <span>{tr('doc.journal_voucher.new', 'قيد جديد')}</span>
                            </span>
                        </button>
                    </>
                )}
            />

            <DocumentSupportDock
                sections={helperSections}
                title="تعريفات سند القيد"
                description="افتح دليل الحسابات والتعريفات المالية ومراكز التكلفة فوق قائمة القيود أو داخل سند القيد نفسه."
            />

            <div ref={tableRef} tabIndex={-1} className="card flex-1 overflow-hidden flex flex-col outline-none">
                <div className="overflow-auto flex-1">
                    <table className="dense-table w-full text-start">
                        <thead className="bg-slate-50 text-slate-600 font-bold text-xs sticky top-0">
                            <tr>
                                {visibleColumns.map((column) => (
                                    <th key={column.key} className="p-3">
                                        {tr(column.labelI18nKey, COLUMN_FALLBACK_LABELS[column.key] || column.key)}
                                    </th>
                                ))}
                                <th className="p-3 text-center">{tr('ui.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {rows.map((row: any, index: number) => (
                                <tr
                                    key={row.id}
                                    className={`cursor-pointer transition-colors ${selectedIndex === index ? 'bg-emerald-50/70' : 'hover:bg-emerald-50/40'}`}
                                    onClick={() => {
                                        setSelectedIndex(index);
                                        navigate(`/gl/journal-vouchers/${row.id}`);
                                    }}
                                >
                                    {visibleColumns.map((column) => {
                                        const rawValue = row[column.key as keyof typeof row];

                                        if (column.key === 'status') {
                                            return (
                                                <td key={column.key} className="p-3">
                                                    <DocumentStatusBadge status={String(rawValue || 'DRAFT')} />
                                                </td>
                                            );
                                        }

                                        const value = column.type === 'number'
                                            ? Number(rawValue || 0).toFixed(2)
                                            : String(rawValue ?? '');

                                        return (
                                            <td key={column.key} className={`p-3 ${column.type === 'number' ? 'font-mono font-semibold text-emerald-700' : 'text-gray-700'}`}>
                                                {value || '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 text-center text-xs text-slate-400">-</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {rows.length === 0 && !isApplying && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <BookOpenText size={48} className="mb-2 opacity-20" />
                            <p>{tr('doc.journal_voucher.empty', 'No vouchers match current filters')}</p>
                        </div>
                    )}
                </div>
            </div>

            <FilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                screenKey={SCREEN_KEY}
                filterSchema={filterSchema}
                columnSchema={definition.columnSchema}
                filters={filters}
                columns={columns}
                sort={sort}
                views={views}
                activeViewId={activeViewId}
                isApplying={isApplying}
                onFiltersChange={setFilters}
                onColumnsChange={setColumns}
                onSortChange={setSort}
                onApply={async () => {
                    await apply({ page: 1 });
                    setDrawerOpen(false);
                }}
                onReset={resetState}
                onApplyView={(viewId) => applySavedView(viewId)}
                onSaveView={async (payload) => {
                    await saveCurrentView(payload);
                    await apply({ page: 1 });
                }}
                onSetDefaultView={async (viewId) => setDefaultView(viewId)}
                onDeleteView={async (viewId) => {
                    await deleteView(viewId);
                    await apply({ page: 1 });
                }}
            />
        </div>
    );
}
