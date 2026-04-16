import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Filter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FilterDrawer from '../../components/ui/FilterDrawer';
import { DocumentStatusBadge } from '../../components/ui/DocumentStatusBadge';
import { useScreenViewManager, getVisibleColumns } from '../../hooks/useScreenViewManager';
import { useExcelListNavigation } from '../../hooks/useExcelListNavigation';
import { useMyPermissions } from '../../hooks/useMyPermissions';

const SCREEN_KEY = 'inventory.stock_transfer.list';

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

const COLUMN_FALLBACK_LABELS: Record<string, string> = {
    doc_no: 'Transfer No',
    doc_date: 'Date',
    from_warehouse_name: 'From Warehouse',
    to_warehouse_name: 'To Warehouse',
    status: 'Status',
    total_qty: 'Total Qty',
    branch_id: 'Branch',
};

export default function StockTransferList() {
    const navigate = useNavigate();
    const { can, whyNot } = useMyPermissions();
    const canRead = can('inventory.stock_transfer.read');
    const canCreate = can('inventory.stock_transfer.create');
    const createDeniedReason = whyNot('inventory.stock_transfer.create');
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

    const {
        tableRef,
        selectedIndex,
        setSelectedIndex,
    } = useExcelListNavigation({
        rows,
        enabled: canRead,
        modalOpen: drawerOpen,
        onOpenFilters: () => setDrawerOpen(true),
        onOpenRow: (row: any) => navigate(`/inventory/stock-transfers/${row.id}`),
        onCreate: () => {
            if (canCreate) navigate('/inventory/stock-transfers/new');
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
                {tr(whyNot('inventory.stock_transfer.read') || 'error.permission_denied', 'Permission denied')}
            </div>
        );
    }

    return (
        <div className="app-page h-full flex flex-col gap-4" dir={currentDir}>
            <div className="flex justify-between items-center bg-white/90 p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
                        <ArrowRightLeft size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{tr('doc.stock_transfer.title', 'Stock Transfers')}</h1>
                        <p className="text-xs text-gray-500">{tr('doc.stock_transfer.subtitle', 'Warehouse movement documents')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="app-toolbar-btn"
                    >
                        <Filter size={16} />
                        {tr('ui.filters.title', 'Filters')}
                    </button>
                    <button
                        onClick={() => canCreate && navigate('/inventory/stock-transfers/new')}
                        disabled={!canCreate}
                        title={!canCreate ? tr(createDeniedReason || 'error.permission_denied', 'Permission denied') : undefined}
                        className="btn btn-primary text-white px-4 py-2 font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} /> {tr('doc.stock_transfer.new', 'New Transfer')}
                    </button>
                </div>
            </div>

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
                                    className={`cursor-pointer transition-colors ${selectedIndex === index ? 'bg-cyan-50/70' : 'hover:bg-cyan-50/40'}`}
                                    onClick={() => {
                                        setSelectedIndex(index);
                                        navigate(`/inventory/stock-transfers/${row.id}`);
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
                            <ArrowRightLeft size={48} className="mb-2 opacity-20" />
                            <p>{tr('doc.stock_transfer.empty', 'No stock transfers match current filters')}</p>
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
