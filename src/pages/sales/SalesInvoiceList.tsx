import React from 'react';
import { FileText, Filter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FilterDrawer from '../../components/ui/FilterDrawer';
import { DocumentStatusBadge } from '../../components/ui/DocumentStatusBadge';
import { useSalesInvoiceList } from '../../hooks/useSalesInvoiceList';
import { useExcelListNavigation } from '../../hooks/useExcelListNavigation';

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

export default function SalesInvoiceList() {
    const navigate = useNavigate();
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'ltr';

    const {
        screenKey,
        definition,
        drawerOpen,
        setDrawerOpen,
        canRead,
        canCreate,
        canCreateReturn,
        createDeniedReason,
        readDeniedReason,
        lookupErrorKey,
        rows,
        filters,
        setFilters,
        columns,
        setColumns,
        sort,
        setSort,
        views,
        activeViewId,
        isApplying,
        visibleColumns,
        filterSchema,
        fallbackColumnLabels,
        apply,
        resetState,
        applySavedView,
        saveCurrentView,
        setDefaultView,
        deleteView,
    } = useSalesInvoiceList();

    const {
        tableRef,
        selectedIndex,
        setSelectedIndex,
    } = useExcelListNavigation({
        rows,
        enabled: canRead,
        modalOpen: drawerOpen,
        onOpenFilters: () => setDrawerOpen(true),
        onOpenRow: (row: any) => navigate(`/sales/invoices/${row.id}`),
        onCreate: () => {
            if (canCreate) navigate('/sales/invoices/new');
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
                {tr(readDeniedReason || 'error.permission_denied', 'Permission denied')}
            </div>
        );
    }

    return (
        <div className="app-page h-full flex flex-col gap-4" dir={currentDir}>
            <div className="flex justify-between items-center bg-white/90 p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{tr('doc.sales_invoice.title', 'Sales Invoices')}</h1>
                        <p className="text-xs text-gray-500">{tr('doc.sales_invoice.subtitle', 'Customer invoice register')}</p>
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
                        onClick={() => canCreate && navigate('/sales/invoices/new')}
                        disabled={!canCreate}
                        title={!canCreate ? tr(createDeniedReason || 'error.permission_denied', 'Permission denied') : undefined}
                        className="btn btn-primary text-white px-4 py-2 font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} /> {tr('doc.sales_invoice.new', 'New Sales Invoice')}
                    </button>
                </div>
            </div>

            <div ref={tableRef} tabIndex={-1} className="card flex-1 overflow-hidden flex flex-col outline-none">
                {lookupErrorKey && (
                    <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {tr(lookupErrorKey, 'Some filter lookups failed to load.')}
                    </div>
                )}

                <div className="overflow-auto flex-1">
                    <table className="dense-table w-full text-start">
                        <thead className="bg-slate-50 text-slate-600 font-bold text-xs sticky top-0">
                            <tr>
                                {visibleColumns.map((column) => (
                                    <th key={column.key} className="p-3">
                                        {tr(column.labelI18nKey, fallbackColumnLabels[column.key] || column.key)}
                                    </th>
                                ))}
                                <th className="p-3 text-center">{tr('ui.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {rows.map((row: any, index: number) => {
                                const rowStatus = String(row.status || 'DRAFT');
                                return (
                                    <tr
                                        key={String(row.id)}
                                        className={`cursor-pointer transition-colors ${selectedIndex === index ? 'bg-indigo-50/70' : 'hover:bg-indigo-50/40'}`}
                                        onClick={() => {
                                            setSelectedIndex(index);
                                            navigate(`/sales/invoices/${row.id}`);
                                        }}
                                    >
                                        {visibleColumns.map((column) => {
                                            const rawValue = row[column.key as keyof typeof row];

                                            if (column.key === 'status') {
                                                return (
                                                    <td key={column.key} className="p-3">
                                                        <DocumentStatusBadge status={rowStatus} />
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

                                        <td className="p-3 text-center">
                                            {rowStatus === 'POSTED' && canCreateReturn ? (
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
                                                    className="text-xs bg-rose-50 text-rose-600 px-2 py-1 rounded hover:bg-rose-100 border border-rose-100 transition-colors"
                                                >
                                                    {tr('doc.sales_invoice.action.create_return', 'Create Return')}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {rows.length === 0 && !isApplying && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <FileText size={48} className="mb-2 opacity-20" />
                            <p>{tr('doc.sales_invoice.empty', 'No invoices match current filters')}</p>
                        </div>
                    )}
                </div>
            </div>

            <FilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                screenKey={screenKey}
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
