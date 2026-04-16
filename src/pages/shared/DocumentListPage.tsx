import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, RefreshCcw } from 'lucide-react';
import { DocumentDefinition } from '../../types/DocumentDefinition';
import { DocumentStatusBadge } from '../../components/ui/DocumentStatusBadge';
import { useEnterNavigation } from '../../hooks/useEnterNavigation';

interface DocumentListPageProps {
    definition: DocumentDefinition<any, any>;
    hideFilterBar?: boolean;
}

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const translated = i18n.t(key);
        if (translated && translated !== key) return translated;
    }
    return fallback || key;
}

export default function DocumentListPage({ definition, hideFilterBar }: DocumentListPageProps) {
    const navigate = useNavigate();
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'rtl';

    const [rows, setRows] = useState<any[]>([]);
    const [cursor, setCursor] = useState<any>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const tableRef = useRef<HTMLDivElement>(null);
    const filtersRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const loadData = async (reset = false) => {
        try {
            setLoading(true);
            const currentCursor = reset ? null : cursor;

            const result = await definition.client.list({
                search,
                status: statusFilter,
                dateFrom,
                dateTo,
                cursor: currentCursor,
                limit: 50,
            });

            if (!result.ok) return;

            if (reset) {
                setRows(result.data.rows);
                setSelectedIndex(0);
            } else {
                setRows((prev) => [...prev, ...result.data.rows]);
            }

            setCursor(result.data.next_cursor);
            setHasMore(Boolean(result.data.next_cursor));
        } catch (error) {
            console.error('Failed to load list', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            void loadData(true);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search, statusFilter, dateFrom, dateTo, definition.docType]);

    useEnterNavigation(filtersRef, { enabled: true });

    const handleCreate = async () => {
        try {
            setLoading(true);
            const result = await definition.client.createDraft();
            if (result.ok) {
                navigate(definition.docRoute.replace(':id', result.data.id));
            } else {
                alert(`Error creating draft: ${result.error?.message}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = async (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
                return;
            }

            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
                if (event.key === 'Escape') {
                    (event.target as HTMLElement).blur();
                    tableRef.current?.focus();
                }
                return;
            }

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, rows.length - 1));
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (rows[selectedIndex]) {
                        navigate(definition.docRoute.replace(':id', rows[selectedIndex].id));
                    }
                    break;
                case 'F3':
                    event.preventDefault();
                    void handleCreate();
                    break;
                case 'F5':
                    event.preventDefault();
                    void loadData(true);
                    break;
                case 'F6':
                    event.preventDefault();
                    tableRef.current?.focus();
                    break;
                case 'PageDown':
                    event.preventDefault();
                    if (hasMore && !loading) {
                        void loadData(false);
                    }
                    break;
                case 'Escape':
                    event.preventDefault();
                    navigate(-1);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [definition, hasMore, loading, navigate, rows, selectedIndex]);

    return (
        <div className="app-page relative flex h-full flex-col gap-4 outline-none" tabIndex={-1} ref={tableRef} dir={currentDir}>
            <div className="z-10 flex min-h-[64px] flex-shrink-0 items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm md:px-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-extrabold text-slate-800">{definition.title}</h1>
                    <div className="h-6 w-px bg-slate-200/80" />
                    <span className="hidden text-sm text-slate-500 sm:inline-block">
                        <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">↑↓</kbd> {tr('ui.list.navigate', 'Navigate')}
                        <kbd className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">Enter</kbd> {tr('ui.list.open', 'Open')}
                        <kbd className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">F3</kbd> {tr('ui.list.new', 'New')}
                        <kbd className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">F5</kbd> {tr('ui.list.refresh', 'Refresh')}
                        <kbd className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">F6</kbd> {tr('ui.list.focus_table', 'Focus Table')}
                        <kbd className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">PgDn</kbd> {tr('ui.list.more', 'More')}
                        <kbd className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">Ctrl+F</kbd> {tr('ui.list.search', 'Search')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => void loadData(true)} className="app-toolbar-btn">
                        <RefreshCcw className="h-5 w-5" />
                    </button>
                    <button onClick={() => void handleCreate()} className="btn btn-primary inline-flex items-center gap-2 px-4 py-2 text-white shadow-sm transition-all hover:brightness-105">
                        <Plus className="h-4 w-4" /> (F3) {tr('ui.list.new', 'New')}
                    </button>
                </div>
            </div>

            <div ref={filtersRef} className={`z-0 flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur md:p-4 ${
                (hideFilterBar || definition.docType === 'RECEIPT' || definition.title?.includes('قبض')) ? 'hidden' : ''
            }`}>
                <div className="relative max-w-md flex-1">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={tr('ui.list.search_placeholder', 'Search...')}
                        className="input w-full rounded-xl py-2 pl-4 pr-10 text-right"
                        dir={currentDir}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="input rounded-xl py-2 pl-8 pr-4 text-right"
                        dir={currentDir}
                    >
                        <option value="ALL">{tr('ui.list.status.all', 'All statuses')}</option>
                        <option value="DRAFT">{tr('status.draft', 'Draft')}</option>
                        <option value="PENDING_APPROVAL_L1">{tr('status.pending_approval', 'Pending approval')}</option>
                        <option value="POSTED">{tr('status.posted', 'Posted')}</option>
                        <option value="REJECTED">{tr('status.rejected', 'Rejected')}</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                        className="input rounded-xl px-3 py-2"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                        className="input rounded-xl px-3 py-2"
                    />
                </div>
            </div>

            <div className="card relative flex-1 overflow-auto rounded-2xl">
                <table className="dense-table w-full border-collapse bg-white" dir={currentDir}>
                    <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                        <tr>
                            <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold text-slate-600 md:px-6">#</th>
                            {definition.listColumns.map((column) => (
                                <th key={column.key} style={{ width: column.width }} className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold text-slate-600 md:px-6">
                                    {column.label}
                                </th>
                            ))}
                            <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold text-slate-600 md:px-6">
                                {tr('status.label', 'Status')}
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {rows.map((row, index) => {
                            const isSelected = index === selectedIndex;

                            return (
                                <tr
                                    key={row.id}
                                    onClick={() => {
                                        setSelectedIndex(index);
                                        navigate(definition.docRoute.replace(':id', row.id));
                                    }}
                                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50/70'}`}
                                >
                                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 md:px-6">{index + 1}</td>
                                    {definition.listColumns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={`whitespace-nowrap px-4 py-3 text-sm text-slate-700 md:px-6 ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}`}
                                        >
                                            {column.render ? column.render(row[column.key], row) : row[column.key]}
                                        </td>
                                    ))}
                                    <td className="whitespace-nowrap px-4 py-3 md:px-6">
                                        <DocumentStatusBadge status={row.status} />
                                    </td>
                                </tr>
                            );
                        })}

                        {loading && (
                            <tr>
                                <td colSpan={definition.listColumns.length + 2} className="px-6 py-8 text-center text-slate-500">
                                    {tr('ui.list.loading', 'Loading...')}
                                </td>
                            </tr>
                        )}

                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={definition.listColumns.length + 2} className="px-6 py-8 text-center text-slate-500">
                                    {tr('ui.list.empty', 'No records found')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {hasMore && !loading && (
                    <div className="p-4 text-center">
                        <button
                            onClick={() => void loadData(false)}
                            className="rounded-xl bg-sky-50 px-4 py-2 text-sm text-sky-700 transition-colors hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-2"
                        >
                            {tr('ui.list.load_more', 'Load More')} (PageDown)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
