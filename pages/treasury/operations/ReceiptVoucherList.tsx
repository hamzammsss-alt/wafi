import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Banknote, Search, Filter, RotateCcw, Columns3, ChevronDown, Bookmark, Star, Trash2, ArrowDownAZ, ArrowUpZA, Copy, Maximize2, RefreshCw, Pencil, FolderOpen, CheckCircle2 } from 'lucide-react';
import { useTabs } from '../../../src/contexts/TabsContext';
import { AnimatePresence, motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import ReceiptVoucherToolbar from './ReceiptVoucherToolbar';
import { FloatingDropdown } from '../../../src/components/ui/FloatingDropdown';
import { FloatingMenuLayout, getFloatingMenuPositionFromPoint, getFloatingMenuPositionFromRect } from '../../../src/lib/floatingMenu';
import { WafiDataGrid, WafiColumnDef, WafiDataGridHandle } from './WafiDataGrid';

interface Receipt {
    id: string;
    voucher_no: string;
    date: string;
    payer_name?: string;
    description?: string;
    amount: number;
    currency_id: string;
    status: string;
}

type QuickSearchOperator = 'contains' | 'startsWith' | 'equals' | 'notContains';
type QuickSearchField = 'all' | 'voucher_no' | 'payer_name' | 'description' | 'currency_id';
type FilterColumn = 'voucher_no' | 'payer_name' | 'description' | 'status' | 'currency_id' | 'date';
type ReceiptColumnKey = 'voucher_no' | 'date' | 'status' | 'payer_name' | 'description' | 'amount' | 'currency_id';

interface ReceiptColumnDef {
    key: ReceiptColumnKey;
    label: string;
    align?: 'left' | 'right' | 'center';
}

interface ReceiptSavedView {
    id: string;
    name: string;
    isDefault?: boolean;
    state: {
        visibleColumns: ReceiptColumnKey[];
        columnWidths?: Record<string, number>;
        sortKey: ReceiptColumnKey;
        sortDir: 'asc' | 'desc';
        rowDensity: 'comfortable' | 'compact';
        quickSearch: string;
        quickSearchField: QuickSearchField;
        quickSearchOperator: QuickSearchOperator;
        statusFilter: 'all' | 'POSTED' | 'DRAFT';
        columnFilters: ColumnFilters;
        groupBy?: string | null;
    };
}

interface ColumnFilters {
    voucher_no: string;
    date: string;
    status: 'all' | 'POSTED' | 'DRAFT';
    payer_name: string;
    description: string;
    currency_id: string;
    amount: string;
    amountOperator: 'equals' | 'greaterThan' | 'lessThan';
}

interface ReceiptContextMenuState {
    colKey: ReceiptColumnKey;
    label: string;
    position: FloatingMenuLayout;
    source: 'header' | 'cell';
    rowId?: string;
    cellValue?: string;
}

const DEFAULT_COLUMN_FILTERS: ColumnFilters = {
    voucher_no: '',
    date: '',
    status: 'all',
    payer_name: '',
    description: '',
    currency_id: '',
    amount: '',
    amountOperator: 'equals',
};

function matchesWithOperator(source: string, query: string, op: QuickSearchOperator): boolean {
    const value = source.toLowerCase();
    const term = query.toLowerCase();

    if (!term) return true;

    switch (op) {
        case 'startsWith':
            return value.startsWith(term);
        case 'equals':
            return value === term;
        case 'notContains':
            return !value.includes(term);
        case 'contains':
        default:
            return value.includes(term);
    }
}

function renderHighlightedText(text: string | number, highlight: string) {
    if (!highlight || !highlight.trim() || text === null || text === undefined) return <>{text}</>;
    const strText = String(text);
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = strText.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 shadow-sm font-bold">{part}</mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

const RECEIPT_COLUMNS: ReceiptColumnDef[] = [
    { key: 'voucher_no', label: 'رقم السند' },
    { key: 'date', label: 'التاريخ' },
    { key: 'status', label: 'الحالة' },
    { key: 'payer_name', label: 'المستلم منه' },
    { key: 'description', label: 'البيان' },
    { key: 'amount', label: 'المبلغ', align: 'right' },
    { key: 'currency_id', label: 'العملة', align: 'center' },
];

const DEFAULT_VISIBLE_COLUMNS: ReceiptColumnKey[] = RECEIPT_COLUMNS.map((c) => c.key);
const RECEIPT_VIEWS_STORAGE_KEY = 'wafi.views.treasury.receipt.list';

export const ReceiptVoucherList = () => {
    const [vouchers, setVouchers] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'POSTED' | 'DRAFT'>('DRAFT');
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [rowDensity, setRowDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [quickSearch, setQuickSearch] = useState('');
    const [quickSearchField, setQuickSearchField] = useState<QuickSearchField>('all');
    const [quickSearchOperator, setQuickSearchOperator] = useState<QuickSearchOperator>('contains');
    const [quickFilterColumn, setQuickFilterColumn] = useState<FilterColumn>('payer_name');
    const [quickFilterValue, setQuickFilterValue] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>(DEFAULT_COLUMN_FILTERS);
    const [visibleColumns, setVisibleColumns] = useState<ReceiptColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
    const [openMenu, setOpenMenu] = useState<'columns' | 'views' | null>(null);
    const [groupBy, setGroupBy] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<ReceiptColumnKey>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [activeColumnMenu, setActiveColumnMenu] = useState<ReceiptContextMenuState | null>(null);
    const [savedViews, setSavedViews] = useState<ReceiptSavedView[]>([]);
    const [activeViewId, setActiveViewId] = useState<string | null>(null);
    const { navigateInTab } = useTabs();
    const gridRef = useRef<WafiDataGridHandle>(null);
    const api = (window as any).electronAPI?.treasury;

    useEffect(() => {
        loadVouchers();
    }, []);

    useEffect(() => {
        const shouldCloseMenu = (target: HTMLElement | null) => {
            return target
                ? !target.closest('[data-receipt-context-menu="1"]') && !target.closest('[data-column-filter-trigger="1"]')
                : true;
        };

        const onPointerDown = (e: MouseEvent) => {
            if (e.button !== 0) return; // منع إغلاق القائمة نهائياً إلا إذا كان النقر بالزر الأيسر للماوس
            const target = e.target as HTMLElement;
            if (shouldCloseMenu(target)) setActiveColumnMenu(null);
        };

        const onClick = (e: MouseEvent) => {
            if (e.button !== 0) return;
            const target = e.target as HTMLElement;
            if (shouldCloseMenu(target)) setActiveColumnMenu(null);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveColumnMenu(null);
        };

        document.addEventListener('mousedown', onPointerDown, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown, true);
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, []);

    useEffect(() => {
        if (!activeColumnMenu) return;

        const closeMenu = (e: Event) => {
            if (e.type === 'scroll') {
                const target = (e.target as Document).documentElement || e.target;
                if ((target as HTMLElement).closest && (target as HTMLElement).closest('[data-receipt-context-menu="1"]')) return;
            }
            setActiveColumnMenu(null);
        };

        const timer = setTimeout(() => {
            window.addEventListener('resize', closeMenu);
            window.addEventListener('scroll', closeMenu, true);
        }, 50);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
        };
    }, [activeColumnMenu]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(RECEIPT_VIEWS_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as ReceiptSavedView[];
            if (!Array.isArray(parsed) || parsed.length === 0) return;

            setSavedViews(parsed);

            const defaultView = parsed.find((v) => v.isDefault) || parsed[0];
            if (!defaultView) return;

            setActiveViewId(defaultView.id);
            const s = defaultView.state;
            setVisibleColumns(s.visibleColumns || DEFAULT_VISIBLE_COLUMNS);
            setSortKey(s.sortKey || 'date');
            setSortDir(s.sortDir || 'desc');
            setRowDensity(s.rowDensity || 'comfortable');
            setQuickSearch(s.quickSearch || '');
            setQuickSearchField(s.quickSearchField || 'all');
            setQuickSearchOperator(s.quickSearchOperator || 'contains');
            setStatusFilter(s.statusFilter || 'DRAFT');
            setGroupBy(s.groupBy || null);
            setColumnWidths(s.columnWidths || {});
            setColumnFilters({
                ...DEFAULT_COLUMN_FILTERS,
                ...(s.columnFilters || {})
            });
        } catch {
            // Ignore corrupt storage and continue with defaults.
        }
    }, []);

    const loadVouchers = async () => {
        setLoading(true);
        try {
            if (!api) {
                setVouchers([]);
                return;
            }
            const data = await api.getReceipts();
            setVouchers(data || []);
        } catch (error) {
            console.error("Failed to load receipt vouchers", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVouchers = useMemo(() => {
        // --- Pre-computation of filter values for performance ---
        const quickSearchTerm = quickSearch.trim();
        const legacySearchTerm = searchTerm.trim().toLowerCase();
        const lowerColumnFilters = {
            voucher_no: columnFilters.voucher_no.toLowerCase(),
            date: columnFilters.date.toLowerCase(),
            payer_name: columnFilters.payer_name.toLowerCase(),
            description: columnFilters.description.toLowerCase(),
            currency_id: columnFilters.currency_id.toLowerCase(),
        };
        const amountFilterValue = Number(columnFilters.amount);
        const isAmountFilterNumeric = !isNaN(amountFilterValue);

        const rows = vouchers.filter((v) => {
            // --- Filtering Logic ---
            // By using early returns (if ... return false), we stop checking as soon as a voucher fails a condition.

            // 1. Status Filter (cheap check, do it first)
            if (statusFilter !== 'all' && v.status !== statusFilter) {
                return false;
            }

            // 2. Quick Search
            if (quickSearchTerm) {
                const fieldsToSearch: QuickSearchField[] = quickSearchField === 'all'
                    ? ['voucher_no', 'payer_name', 'description', 'currency_id']
                    : [quickSearchField];

                const matches = fieldsToSearch.some(field =>
                    matchesWithOperator(String(v[field as keyof Receipt] ?? ''), quickSearchTerm, quickSearchOperator)
                );
                if (!matches) return false;
            }

            // 3. Legacy Search
            if (legacySearchTerm) {
                const matches =
                    (v.voucher_no && v.voucher_no.toLowerCase().includes(legacySearchTerm)) ||
                    (v.payer_name && v.payer_name.toLowerCase().includes(legacySearchTerm)) ||
                    (v.description && v.description.toLowerCase().includes(legacySearchTerm));
                if (!matches) return false;
            }

            // 4. Column-specific Filters
            if (lowerColumnFilters.voucher_no && !String(v.voucher_no || '').toLowerCase().includes(lowerColumnFilters.voucher_no)) return false;
            if (lowerColumnFilters.date && !String(v.date || '').toLowerCase().includes(lowerColumnFilters.date)) return false;
            if (columnFilters.status !== 'all' && v.status !== columnFilters.status) return false;
            if (lowerColumnFilters.payer_name && !String(v.payer_name || '').toLowerCase().includes(lowerColumnFilters.payer_name)) return false;
            if (lowerColumnFilters.description && !String(v.description || '').toLowerCase().includes(lowerColumnFilters.description)) return false;
            if (lowerColumnFilters.currency_id && !String(v.currency_id || '').toLowerCase().includes(lowerColumnFilters.currency_id)) return false;

            if (columnFilters.amount && isAmountFilterNumeric) {
                const rowAmount = Number(v.amount);
                let amountMatch = false;
                switch (columnFilters.amountOperator) {
                    case 'greaterThan': amountMatch = rowAmount > amountFilterValue; break;
                    case 'lessThan': amountMatch = rowAmount < amountFilterValue; break;
                    case 'equals': default: amountMatch = rowAmount === amountFilterValue; break;
                }
                if (!amountMatch) return false;
            }

            return true; // All filters passed
        });

        const sorted = [...rows].sort((a, b) => {
            if (sortKey === ('manual' as any)) return 0;
            const aVal = (() => {
                if (sortKey === 'amount') return Number(a.amount || 0);
                return String((a as any)[sortKey] || '').toLowerCase();
            })();
            const bVal = (() => {
                if (sortKey === 'amount') return Number(b.amount || 0);
                return String((b as any)[sortKey] || '').toLowerCase();
            })();

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [vouchers, searchTerm, statusFilter, quickSearch, quickSearchField, quickSearchOperator, columnFilters, sortKey, sortDir]);

    const stats = useMemo(() => {
        return {
            total: filteredVouchers.length,
            posted: filteredVouchers.filter(v => v.status === 'POSTED').length,
            draft: filteredVouchers.filter(v => v.status === 'DRAFT').length,
            totalAmount: filteredVouchers.reduce((sum, v) => sum + Number(v.amount), 0),
        };
    }, [filteredVouchers]);

    const selectedVouchers = useMemo(
        () => vouchers.filter((voucher) => selectedRowIds.includes(voucher.id)),
        [vouchers, selectedRowIds]
    );

    const getColumnLabel = (key: ReceiptColumnKey) => RECEIPT_COLUMNS.find((column) => column.key === key)?.label || key;

    const getVoucherById = (id?: string | null) => {
        if (!id) return null;
        return vouchers.find((voucher) => voucher.id === id) || null;
    };

    const getCellTextValue = (voucher: Receipt, key: ReceiptColumnKey): string => {
        switch (key) {
            case 'voucher_no':
                return voucher.voucher_no || '-';
            case 'date':
                return voucher.date || '-';
            case 'status':
                return voucher.status === 'POSTED' ? 'مرحل' : voucher.status === 'DRAFT' ? 'مسودة' : String(voucher.status || '-');
            case 'payer_name':
                return voucher.payer_name || '-';
            case 'description':
                return voucher.description || '-';
            case 'amount':
                return Number(voucher.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            case 'currency_id':
                return voucher.currency_id || '-';
            default:
                return '-';
        }
    };

    const normalizeAmountValue = (value: string) => value.replace(/,/g, '').replace(/[^\d.-]/g, '');

    const copySelectedRowsAsTsv = async () => {
        if (selectedVouchers.length === 0) return;
        const header = visibleColumns.map((column) => getColumnLabel(column)).join('\t');
        const body = selectedVouchers
            .map((voucher) => visibleColumns.map((column) => getCellTextValue(voucher, column).replace(/\t/g, ' ')).join('\t'))
            .join('\n');
        await navigator.clipboard.writeText(`${header}\n${body}`).catch(() => {});
    };

    const toggleRowSelection = (id: string, multiSelect = false) => {
        setSelectedRowIds((prev) => {
            if (!multiSelect) {
                return prev.includes(id) && prev.length === 1 ? [] : [id];
            }
            if (prev.includes(id)) {
                return prev.filter((rid) => rid !== id);
            }
            return [...prev, id];
        });
    };

    const toggleSelectAll = () => {
        if (selectedRowIds.length === filteredVouchers.length) {
            setSelectedRowIds([]);
        } else {
            setSelectedRowIds(filteredVouchers.map(v => v.id));
        }
    };

    const openVoucherById = (id?: string | null) => {
        const voucher = getVoucherById(id);
        if (!voucher) return;
        navigateInTab(`/treasury/receipt/${voucher.id}`, `تعديل سند قبض ${voucher.voucher_no}`);
    };

    const duplicateVoucherById = async (id?: string | null) => {
        const voucher = getVoucherById(id);
        if (!voucher) return;
        navigateInTab('/treasury/receipt/new', 'سند قبض جديد');
    };

    const deleteReceiptIds = async (ids: string[]) => {
        if (ids.length === 0) return;
        if (!confirm(`هل تريد حذف ${ids.length} سند قبض؟`)) return;

        try {
            for (const id of ids) {
                if (api?.deleteReceipt) {
                    await api.deleteReceipt(id);
                }
            }
            await loadVouchers();
            setSelectedRowIds((prev) => prev.filter((id) => !ids.includes(id)));
        } catch (error) {
            console.error("Failed to delete receipt", error);
            alert('فشل حذف سند القبض');
        }
    };

    const postReceiptIds = async (ids: string[]) => {
        if (ids.length === 0) return;

        const draftIds = ids.filter((id) => {
            const voucher = vouchers.find((row) => row.id === id);
            return voucher?.status === 'DRAFT';
        });

        if (draftIds.length === 0) {
            alert('كل السندات المحددة مرحلة مسبقًا.');
            return;
        }

        if (!confirm(`هل أنت متأكد من ترحيل ${draftIds.length} سند قبض؟`)) return;

        setLoading(true);
        try {
            for (const id of draftIds) {
                if (api?.postReceipt) await api.postReceipt(id);
                else if (api?.updateReceiptStatus) await api.updateReceiptStatus(id, 'POSTED');
            }
            await loadVouchers();
            setSelectedRowIds((prev) => prev.filter((id) => !draftIds.includes(id)));
        } catch (error) {
            console.error("Failed to post receipts", error);
            alert('حدث خطأ أثناء ترحيل السندات.');
        } finally {
            setLoading(false);
        }
    };

    const clearSort = () => {
        setSortKey('date');
        setSortDir('desc');
    };

    const setContextMenuSort = (key: ReceiptColumnKey, direction: 'asc' | 'desc') => {
        setSortKey(key);
        setSortDir(direction);
        setActiveColumnMenu(null);
    };

    const hideColumn = (key: ReceiptColumnKey) => {
        setVisibleColumns((prev) => (prev.length <= 1 ? prev : prev.filter((column) => column !== key)));
        setActiveColumnMenu(null);
    };

    const adjustColumnWidth = (key: ReceiptColumnKey, delta: number) => {
        setColumnWidths((prev) => {
            const nextWidth = Math.max(90, Math.min(460, Number(prev[key] || 180) + delta));
            return { ...prev, [key]: nextWidth };
        });
        setActiveColumnMenu(null);
    };

    const autoFitColumnWidth = (key: ReceiptColumnKey) => {
        const sampleValues = filteredVouchers.slice(0, 40).map((voucher) => getCellTextValue(voucher, key));
        const maxLength = Math.max(getColumnLabel(key).length, ...sampleValues.map((value) => value.length), 12);
        const estimatedWidth = Math.max(110, Math.min(420, 48 + (maxLength * 8)));
        setColumnWidths((prev) => ({ ...prev, [key]: estimatedWidth }));
        setActiveColumnMenu(null);
    };

    const applyFilterFromCellValue = (mode: 'equals' | 'greaterThan' | 'lessThan' = 'equals') => {
        if (!activeColumnMenu?.cellValue) return;

        const value = activeColumnMenu.cellValue.trim();
        if (!value || value === '-') return;

        setColumnFilters((prev) => {
            if (activeColumnMenu.colKey === 'status') {
                const normalized = value.toUpperCase();
                const status =
                    normalized === 'POSTED' || value.includes('مرحل')
                        ? 'POSTED'
                        : normalized === 'DRAFT' || value.includes('مسودة')
                            ? 'DRAFT'
                            : prev.status;
                return { ...prev, status };
            }

            if (activeColumnMenu.colKey === 'amount') {
                return {
                    ...prev,
                    amount: normalizeAmountValue(value),
                    amountOperator: mode,
                };
            }

            return {
                ...prev,
                [activeColumnMenu.colKey]: value,
            };
        });

        setActiveColumnMenu(null);
    };

    const handleEdit = () => {
        if (selectedRowIds.length !== 1) return;
        openVoucherById(selectedRowIds[0]);
    };

    const handleRowReorder = (sourceId: string, targetId: string) => {
        setSortKey('manual' as any); // تجميد الترتيب التلقائي للحفاظ على الترتيب اليدوي
        setVouchers(prev => {
            const newVouchers = [...prev];
            const sourceIndex = newVouchers.findIndex(v => v.id === sourceId);
            const targetIndex = newVouchers.findIndex(v => v.id === targetId);
            if (sourceIndex === -1 || targetIndex === -1) return prev;

            const [removed] = newVouchers.splice(sourceIndex, 1);
            newVouchers.splice(targetIndex, 0, removed);
            return newVouchers;
        });
    };

    const handleDuplicate = async () => {
        if (selectedRowIds.length !== 1) return;
        await duplicateVoucherById(selectedRowIds[0]);
    };

    const handleDelete = async () => {
        await deleteReceiptIds(selectedRowIds);
    };

    const handleBulkPost = async () => {
        await postReceiptIds(selectedRowIds);
    };

    const handleExport = (format: 'excel' | 'pdf') => {
        if (format === 'excel') {
            gridRef.current?.exportToExcel('سندات-القبض.xlsx', 'سندات القبض');
            return;
        }

        if (format === 'pdf') {
            gridRef.current?.exportToPdf('سندات القبض');
            return;
        }
    };

    const applyQuickFilter = () => {
        const value = quickFilterValue.trim();
        if (!value) return;

        setColumnFilters((prev) => {
            if (quickFilterColumn === 'status') {
                const normalized = value.toUpperCase();
                const status = normalized === 'POSTED' || normalized === 'DRAFT' ? normalized : prev.status;
                return { ...prev, status } as ColumnFilters;
            }

            return {
                ...prev,
                [quickFilterColumn]: value,
            } as ColumnFilters;
        });

        setQuickFilterValue('');
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setStatusFilter('DRAFT');
        setQuickSearch('');
        setQuickSearchField('all');
        setQuickSearchOperator('contains');
        setColumnFilters(DEFAULT_COLUMN_FILTERS);
    };

    const persistViews = (next: ReceiptSavedView[]) => {
        setSavedViews(next);
        localStorage.setItem(RECEIPT_VIEWS_STORAGE_KEY, JSON.stringify(next));
    };

    const applySavedView = (viewId: string) => {
        const view = savedViews.find((v) => v.id === viewId);
        if (!view) return;
        setActiveViewId(viewId);
        const s = view.state;
        setVisibleColumns(s.visibleColumns || DEFAULT_VISIBLE_COLUMNS);
        setSortKey(s.sortKey || 'date');
        setSortDir(s.sortDir || 'desc');
        setRowDensity(s.rowDensity || 'comfortable');
        setQuickSearch(s.quickSearch || '');
        setQuickSearchField(s.quickSearchField || 'all');
        setQuickSearchOperator(s.quickSearchOperator || 'contains');
        setStatusFilter(s.statusFilter || 'all');
        setColumnWidths(s.columnWidths || {});
        setColumnFilters({
            ...DEFAULT_COLUMN_FILTERS,
            ...(s.columnFilters || {}),
        });
    };

    const saveCurrentView = () => {
        const name = window.prompt('اسم العرض');
        if (!name || !name.trim()) return;

        const view: ReceiptSavedView = {
            id: `${Date.now()}`,
            name: name.trim(),
            isDefault: false,
            state: {
                visibleColumns,
                columnWidths,
                sortKey,
                sortDir,
                rowDensity,
                quickSearch,
                quickSearchField,
                quickSearchOperator,
                statusFilter,
                columnFilters,
                groupBy,
            },
        };

        const next = [...savedViews, view];
        persistViews(next);
        setActiveViewId(view.id);
    };

    const setDefaultView = (id?: string) => {
        const targetId = id ?? activeViewId;
        if (!targetId) return;
        const next = savedViews.map((v) => ({ ...v, isDefault: v.id === targetId }));
        persistViews(next);
    };

    const deleteView = (id: string) => {
        const next = savedViews.filter((v) => v.id !== id);
        persistViews(next);
        if (activeViewId === id) setActiveViewId(null);
    };

    const resetTableView = () => {
        setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
        setColumnWidths({});
        setGroupBy(null);
        setSortKey('date');
        setSortDir('desc');
        setRowDensity('comfortable');
        clearAllFilters();
        setActiveViewId(null);
    };

    const openFilterMenu = (
        e: React.MouseEvent,
        colKey: ReceiptColumnKey,
        label: string,
        source: 'header' | 'cell' = 'header',
        cellValue?: string,
        rowId?: string,
    ) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            let position: FloatingMenuLayout;
            if ((e.type === 'contextmenu' || e.nativeEvent?.type === 'contextmenu') && e.clientX && e.clientY) {
                position = getFloatingMenuPositionFromPoint(e.clientX, e.clientY, { menuWidth: 320, menuHeight: 560, preferredAlign: 'right', offset: 8, margin: 14, minHeight: 220 });
            } else {
                const target = e.currentTarget as HTMLElement;
                position = getFloatingMenuPositionFromRect(target.getBoundingClientRect(), { menuWidth: 320, menuHeight: 560, preferredAlign: 'right', offset: 8, margin: 14, minHeight: 220 });
            }

            if (!position) throw new Error("Position is undefined");
            setActiveColumnMenu({ colKey, label, position, source, rowId, cellValue });
        } catch (error) {
            console.warn('استخدام الموقع الافتراضي لقائمة الفلترة:', error);
            setActiveColumnMenu({
                colKey,
                label,
                source,
                rowId,
                cellValue,
                position: { top: e.clientY || 100, left: e.clientX || 100, maxHeight: 520, transformOrigin: 'top right' }
            });
        }
    };

    const clearFilter = (colKey: ReceiptColumnKey) => {
        setColumnFilters(prev => {
            const n = { ...prev };
            if (colKey === 'status') n.status = 'all';
            else if (colKey === 'amount') { n.amount = ''; n.amountOperator = 'equals'; }
            else n[colKey as any] = '';
            return n as ColumnFilters;
        });
        setActiveColumnMenu(null);
    };

    const toggleColumnVisibility = (key: ReceiptColumnKey) => {
        setVisibleColumns((prev) => {
            if (prev.includes(key)) {
                if (prev.length === 1) return prev;
                return prev.filter((k) => k !== key);
            }
            return [...prev, key];
        });
    };

    const restoreDefaultColumns = () => {
        setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    };

    const showAllColumns = () => {
        setVisibleColumns(RECEIPT_COLUMNS.map((c) => c.key));
    };

    const handleSort = (key: ReceiptColumnKey) => {
        setSortKey((prevKey) => {
            if (prevKey === key) {
                setSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
                return prevKey;
            }
            setSortDir('asc');
            return key;
        });
    };

    const hasActiveFilters =
        quickSearch.trim().length > 0 ||
        statusFilter !== 'all' ||
        searchTerm.trim().length > 0 ||
        columnFilters.voucher_no.trim().length > 0 ||
        columnFilters.date.trim().length > 0 ||
        columnFilters.status !== 'all' ||
        columnFilters.payer_name.trim().length > 0 ||
        columnFilters.description.trim().length > 0 ||
        columnFilters.currency_id.trim().length > 0 ||
        columnFilters.amount.trim().length > 0;

    const contextMenuSectionTitle = 'px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400';
    const contextMenuItemClass = 'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-[12px] font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800';
    const contextMenuDangerItemClass = 'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-[12px] font-semibold text-rose-700 transition hover:bg-rose-50 hover:text-rose-800';
    const contextMenuReceipt = activeColumnMenu?.rowId ? getVoucherById(activeColumnMenu.rowId) : null;
    const contextMenuCanPost = contextMenuReceipt?.status === 'DRAFT';

    const gridColumns: WafiColumnDef<Receipt>[] = RECEIPT_COLUMNS.map(col => ({
        key: col.key,
        label: col.label,
        align: col.align,
        getValue: (v) => getCellTextValue(v, col.key),
        renderCell: (v) => {
            const text = getCellTextValue(v, col.key);
            const activeSearch = quickSearch.trim() || searchTerm.trim();
            const highlighted = renderHighlightedText(text, activeSearch);

            switch (col.key) {
                    case 'voucher_no':
                    return (
                        <span
                            className="font-mono text-emerald-600 font-bold cursor-pointer"
                            title="نقر مزدوج لفتح سند القبض"
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                openVoucherById(v.id);
                            }}
                        >
                            {highlighted}
                        </span>
                    );
                case 'date': return <span className="text-slate-600 font-mono text-xs">{highlighted}</span>;
                case 'status': return <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${v.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{v.status === 'POSTED' ? renderHighlightedText('مرحل', activeSearch) : renderHighlightedText('مسودة', activeSearch)}</span>;
                case 'payer_name': return <span className="font-medium text-slate-700">{highlighted}</span>;
                case 'description': return <span className="text-slate-600 text-sm max-w-xs truncate block" title={v.description}>{highlighted}</span>;
                case 'amount': return <span className="font-bold text-slate-800 font-mono">{renderHighlightedText(Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }), activeSearch)}</span>;
                case 'currency_id': return <span className="text-center text-xs text-slate-600">{highlighted}</span>;
                default: return <span>{highlighted}</span>;
            }
        },
        renderFooter: col.key === 'amount'
            ? (rows) => <span className="text-emerald-700 font-black font-mono text-sm">{rows.reduce((sum, r) => sum + Number(r.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            : col.key === 'description'
            ? () => <span className="text-slate-500 font-bold">الإجمالي:</span>
            : undefined
    }));

    return (
        <div className="p-6 bg-[#f8fafc] h-full min-h-0 flex flex-col gap-4 overflow-x-hidden overflow-y-auto lg:overflow-hidden" dir="rtl">
            {/* Header with Icon */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Banknote size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">سندات القبض</h1>
                            <p className="text-sm text-slate-500">إدارة المقبوضات النقدية والشيكات</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigateInTab('/treasury/receipt/new', 'سند قبض جديد')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors h-fit"
                    >
                        <Plus size={18} /> سند قبض جديد
                    </button>
                </div>
            </motion.div>

            {/* Toolbar */}
            <ReceiptVoucherToolbar
                selectedRowsCount={selectedRowIds.length}
                rowDensity={rowDensity}
                onNew={() => navigateInTab('/treasury/receipt/new', 'سند قبض جديد')}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onExport={handleExport}
                onPrint={() => window.print()}
                onOpenFilters={() => setShowFilters(!showFilters)}
                onRefresh={loadVouchers}
                onSetRowDensity={setRowDensity}
                groupBy={groupBy}
                onSetGroupBy={setGroupBy}
                groupableColumns={[
                    { key: 'status', label: 'الحالة' },
                    { key: 'currency_id', label: 'العملة' },
                    { key: 'date', label: 'التاريخ' },
                    { key: 'payer_name', label: 'المستلم منه' }
                ]}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">الإجمالي</div>
                    <div className="mt-1 text-2xl font-black text-slate-800">{stats.total}</div>
                    <div className="text-xs text-slate-500">عدد السندات</div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500">مرحل</div>
                    <div className="mt-1 text-2xl font-black text-emerald-600">{stats.posted}</div>
                    <div className="text-xs text-slate-500">سندات مرحلة</div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-500">مسودة</div>
                    <div className="mt-1 text-2xl font-black text-amber-600">{stats.draft}</div>
                    <div className="text-xs text-slate-500">سندات في المسودة</div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-500">المبلغ</div>
                    <div className="mt-1 text-2xl font-black text-sky-600">{stats.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-slate-500">إجمالي المبالغ</div>
                </motion.div>
            </div>

            {/* Filters Bar */}
            <div className="rounded-2xl border border-sky-100 bg-[#f5fbff] p-3 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={loadVouchers}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                    >
                        <RotateCcw size={16} />
                        <span>تحديث</span>
                    </button>

                    <select
                        value={quickSearchOperator}
                        onChange={(event) => setQuickSearchOperator(event.target.value as QuickSearchOperator)}
                        className="h-10 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        <option value="contains">يحتوي</option>
                        <option value="startsWith">يبدأ بـ</option>
                        <option value="equals">يساوي</option>
                        <option value="notContains">لا يحتوي</option>
                    </select>

                    <select
                        value={quickSearchField}
                        onChange={(event) => setQuickSearchField(event.target.value as QuickSearchField)}
                        className="h-10 min-w-[180px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        <option value="all">بحث في كل الحقول</option>
                        <option value="voucher_no">رقم السند</option>
                        <option value="payer_name">المستلم منه</option>
                        <option value="description">البيان</option>
                        <option value="currency_id">العملة</option>
                    </select>

                    <div className="relative min-w-[260px] flex-1">
                        <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={quickSearch}
                            onChange={(event) => setQuickSearch(event.target.value)}
                            placeholder="بحث سريع"
                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                    </div>

                    <FloatingDropdown
                        isOpen={openMenu === 'columns'}
                        onClose={() => setOpenMenu(null)}
                        menuWidth={320}
                        title="إدارة الأعمدة"
                        trigger={
                            <button
                                type="button"
                                onClick={() => setOpenMenu((prev) => (prev === 'columns' ? null : 'columns'))}
                                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                            >
                                <Columns3 size={16} />
                                <span>الأعمدة</span>
                                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{visibleColumns.length}/{RECEIPT_COLUMNS.length}</span>
                                <ChevronDown size={14} />
                            </button>
                        }
                    >
                        <div className="mb-2 flex flex-wrap gap-1.5 border-b border-slate-100 pb-2">
                            <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50" onClick={restoreDefaultColumns}>الافتراضي</button>
                            <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50" onClick={showAllColumns}>إظهار الكل</button>
                        </div>
                        <div className="space-y-1">
                            {RECEIPT_COLUMNS.map((column) => {
                                const checked = visibleColumns.includes(column.key);
                                return (
                                    <label key={column.key} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                                        <span className={`text-sm ${checked ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>{column.label}</span>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleColumnVisibility(column.key)}
                                            className="h-4 w-4 rounded border-slate-300 text-sky-500"
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    </FloatingDropdown>

                    <FloatingDropdown
                        isOpen={openMenu === 'views'}
                        onClose={() => setOpenMenu(null)}
                        menuWidth={290}
                        title="عروض الجدول"
                        trigger={
                            <button
                                type="button"
                                onClick={() => setOpenMenu((prev) => (prev === 'views' ? null : 'views'))}
                                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                            >
                                <Bookmark size={15} />
                                <span className="max-w-[120px] truncate">
                                    {activeViewId ? (savedViews.find((v) => v.id === activeViewId)?.name ?? 'العروض') : 'العروض'}
                                </span>
                                {savedViews.length > 0 && (
                                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{savedViews.length}</span>
                                )}
                                <ChevronDown size={14} />
                            </button>
                        }
                    >
                        {savedViews.length === 0 ? (
                            <p className="py-3 text-center text-xs text-slate-400">لا توجد عروض محفوظة</p>
                        ) : (
                            <div className="mb-2 space-y-0.5">
                                {savedViews.map((view) => (
                                    <div
                                        key={view.id}
                                        className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${
                                            activeViewId === view.id ? 'bg-sky-50' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => { applySavedView(view.id); setOpenMenu(null); }}
                                            className="flex-1 text-right text-sm font-medium text-slate-800 truncate"
                                        >
                                            {view.name}
                                            {view.isDefault && (
                                                <span className="mr-1.5 text-[10px] font-bold text-amber-600">افتراضي</span>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            title="تعيين كافتراضي"
                                            onClick={() => setDefaultView(view.id)}
                                            className={`rounded p-1 transition ${
                                                view.isDefault
                                                    ? 'text-amber-500 hover:text-amber-700'
                                                    : 'text-slate-300 hover:text-amber-500'
                                            }`}
                                        >
                                            <Star size={13} fill={view.isDefault ? 'currentColor' : 'none'} />
                                        </button>
                                        <button
                                            type="button"
                                            title="حذف"
                                            onClick={() => deleteView(view.id)}
                                            className="rounded p-1 text-slate-300 transition hover:text-red-500"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="space-y-1 border-t border-slate-100 pt-2">
                            <button
                                type="button"
                                onClick={() => { saveCurrentView(); setOpenMenu(null); }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                            >
                                <Plus size={14} />
                                حفظ العرض الحالي
                            </button>
                            <button
                                type="button"
                                onClick={() => { resetTableView(); setOpenMenu(null); }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                            >
                                <RotateCcw size={14} />
                                إعادة ضبط الجدول
                            </button>
                        </div>
                    </FloatingDropdown>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                    {[
                        { value: 'DRAFT', label: 'محفوظ' },
                        { value: 'POSTED', label: 'مرحل' },
                        { value: 'all', label: 'الكل' },
                    ].map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setStatusFilter(option.value as 'all' | 'POSTED' | 'DRAFT')}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                statusFilter === option.value
                                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/10'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <select
                        value={quickFilterColumn}
                        onChange={(event) => setQuickFilterColumn(event.target.value as FilterColumn)}
                        className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        <option value="voucher_no">رقم السند</option>
                        <option value="date">التاريخ</option>
                        <option value="status">الحالة</option>
                        <option value="payer_name">المستلم منه</option>
                        <option value="description">البيان</option>
                        <option value="currency_id">العملة</option>
                    </select>

                    <input
                        type="text"
                        value={quickFilterValue}
                        onChange={(event) => setQuickFilterValue(event.target.value)}
                        placeholder="أدخل قيمة الفلتر"
                        className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        <option value="all">كل الحالات</option>
                        <option value="DRAFT">مسودة</option>
                        <option value="POSTED">مرحل</option>
                    </select>

                    <button
                        type="button"
                        onClick={applyQuickFilter}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 text-sm font-bold text-white shadow-lg shadow-sky-900/15 transition hover:brightness-105"
                    >
                        <Filter size={16} />
                        <span>تطبيق</span>
                    </button>
                </div>

                {hasActiveFilters && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {quickSearch.trim().length > 0 && (
                            <button
                                type="button"
                                onClick={() => setQuickSearch('')}
                                className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800"
                            >
                                بحث: {quickSearch} ×
                            </button>
                        )}
                        {statusFilter !== 'all' && (
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                            >
                                الحالة: {statusFilter === 'POSTED' ? 'مرحل' : 'مسودة'} ×
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                            مسح جميع الفلاتر
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3"
                    >
                        <div className="flex gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-[250px]">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="بحث برقم السند أو الاسم..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            >
                                <option value="all">كل الحالات</option>
                                <option value="DRAFT">مسودة</option>
                                <option value="POSTED">مرحل</option>
                            </select>
                            <button
                                onClick={() => {
                                    clearAllFilters();
                                }}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <RotateCcw size={16} /> مسح
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Table */}
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 flex-1 min-h-[18rem] lg:min-h-0 overflow-hidden flex flex-col">
                <WafiDataGrid
                    ref={gridRef}
                    data={filteredVouchers}
                    columns={gridColumns}
                    keyExtractor={(v) => v.id}
                    loading={loading}
                    selectedRowIds={selectedRowIds}
                    onSelectionChange={setSelectedRowIds as any}
                    visibleColumns={visibleColumns as string[]}
                    onVisibleColumnsChange={setVisibleColumns as any}
                    columnWidths={columnWidths}
                    onColumnWidthsChange={setColumnWidths}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSortChange={(key, dir) => { setSortKey(key as any); setSortDir(dir); }}
                    rowDensity={rowDensity}
                    onHeaderContextMenu={(e, colKey, label) => openFilterMenu(e, colKey as any, label, 'header')}
                    onCellContextMenu={(e, colKey, label, val, rowId) => openFilterMenu(e, colKey as any, label, 'cell', val, rowId)}
                    onRowDoubleClick={(v) => navigateInTab(`/treasury/receipt/${v.id}`, `سند قبض ${v.voucher_no}`)}
                    emptyMessage="لا توجد سندات قبض"
                    columnFilters={columnFilters}
                    onFilterClick={(e, colKey, label) => {
                        if (activeColumnMenu?.colKey === colKey && activeColumnMenu.source === 'header' && !activeColumnMenu.rowId) {
                            setActiveColumnMenu(null);
                        } else {
                            openFilterMenu(e, colKey as any, label, 'header');
                        }
                    }}
                    activeFilterColumn={activeColumnMenu?.source === 'header' ? activeColumnMenu.colKey : null}
                    groupBy={groupBy}
                    virtualized={true}
                    onRowReorder={handleRowReorder}
                    showRowNumbers={true}
                />
                <div className="bg-slate-50/80 border-t border-slate-200 px-5 py-3 flex justify-between items-center text-xs font-bold text-slate-600 shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2">
                            عدد السندات المعروضة: <span className="text-emerald-600 text-sm">{stats.total}</span>
                        </span>
                        {selectedRowIds.length > 0 && (
                            <>
                                <div className="h-4 w-px bg-slate-300"></div>
                                <span className="flex items-center gap-2">
                                    السندات المحددة: <span className="text-sky-600 text-sm">{selectedRowIds.length}</span>
                                </span>
                                <button
                                    onClick={handleBulkPost}
                                    className="rounded-lg bg-emerald-100 px-3 py-1 text-emerald-700 transition hover:bg-emerald-200 mr-2"
                                >
                                    ترحيل السندات المحددة
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span>إجمالي المبالغ المعروضة:</span>
                        <span className="text-emerald-600 font-mono text-sm">{stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {activeColumnMenu && (
                    <motion.div
                        data-receipt-context-menu="1"
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 4 }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed z-[9999] flex w-[20rem] flex-col overflow-hidden rounded-[20px] border border-sky-100/80 bg-white/95 text-right shadow-[0_24px_60px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/5 backdrop-blur-xl"
                        style={{
                            top: activeColumnMenu.position.top,
                            left: activeColumnMenu.position.left,
                            maxHeight: activeColumnMenu.position.maxHeight,
                            transformOrigin: activeColumnMenu.position.transformOrigin,
                        }}
                        dir="rtl"
                        onContextMenu={(event) => event.preventDefault()}
                    >
                        <div className="border-b border-slate-100 bg-gradient-to-l from-sky-50/90 via-white to-cyan-50/80 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-extrabold text-slate-800">{activeColumnMenu.label}</div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">
                                        {activeColumnMenu.source === 'cell' ? 'أوامر سريعة على الخلية والسند الحالي.' : 'إدارة الفرز والفلترة والعمود الحالي.'}
                                    </div>
                                    {activeColumnMenu.source === 'cell' && activeColumnMenu.cellValue && activeColumnMenu.cellValue !== '-' && (
                                        <div className="mt-2 max-w-[220px] truncate rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-700">
                                            {activeColumnMenu.cellValue}
                                        </div>
                                    )}
                                    <div className="mt-0.5 text-[11px] text-slate-500">اكتب قيمة لتصفية هذا العمود مباشرة.</div>
                                </div>
                            </div>
                        </div>
                        <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                            {activeColumnMenu.source === 'cell' && (
                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                                    <div className={contextMenuSectionTitle}>عمليات السند</div>
                                    <button
                                        type="button"
                                        className={contextMenuItemClass}
                                        onClick={() => {
                                            openVoucherById(activeColumnMenu.rowId);
                                            setActiveColumnMenu(null);
                                        }}
                                    >
                                        <span>فتح السند</span>
                                        <FolderOpen size={14} className="text-slate-400" />
                                    </button>
                                    <button
                                        type="button"
                                        className={contextMenuItemClass}
                                        onClick={() => {
                                            void duplicateVoucherById(activeColumnMenu.rowId);
                                            setActiveColumnMenu(null);
                                        }}
                                    >
                                        <span>نسخ السند</span>
                                        <Copy size={14} className="text-slate-400" />
                                    </button>
                                    {contextMenuCanPost && (
                                        <button
                                            type="button"
                                            className={contextMenuItemClass}
                                            onClick={() => {
                                                void postReceiptIds(activeColumnMenu.rowId ? [activeColumnMenu.rowId] : []);
                                                setActiveColumnMenu(null);
                                            }}
                                        >
                                            <span>ترحيل السند</span>
                                            <CheckCircle2 size={14} className="text-slate-400" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className={contextMenuDangerItemClass}
                                        onClick={() => {
                                            void deleteReceiptIds(activeColumnMenu.rowId ? [activeColumnMenu.rowId] : []);
                                            setActiveColumnMenu(null);
                                        }}
                                    >
                                        <span>حذف السند</span>
                                        <Trash2 size={14} className="text-rose-400" />
                                    </button>
                                    {activeColumnMenu.cellValue && activeColumnMenu.cellValue !== '-' && (
                                        <button
                                            type="button"
                                            className={contextMenuItemClass}
                                            onClick={() => {
                                                void navigator.clipboard.writeText(activeColumnMenu.cellValue || '');
                                                setActiveColumnMenu(null);
                                            }}
                                        >
                                            <span>نسخ قيمة الخلية</span>
                                            <Copy size={14} className="text-slate-400" />
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                                <div className={contextMenuSectionTitle}>الترتيب</div>
                                <button type="button" className={contextMenuItemClass} onClick={() => setContextMenuSort(activeColumnMenu.colKey, 'asc')}>
                                    <span>ترتيب تصاعدي</span>
                                    <ArrowDownAZ size={14} className="text-slate-400" />
                                </button>
                                <button type="button" className={contextMenuItemClass} onClick={() => setContextMenuSort(activeColumnMenu.colKey, 'desc')}>
                                    <span>ترتيب تنازلي</span>
                                    <ArrowUpZA size={14} className="text-slate-400" />
                                </button>
                                <button
                                    type="button"
                                    className={contextMenuItemClass}
                                    onClick={() => {
                                        clearSort();
                                        setActiveColumnMenu(null);
                                    }}
                                >
                                    <span>إلغاء الترتيب</span>
                                    <RefreshCw size={14} className="text-slate-400" />
                                </button>
                            </div>

                            {activeColumnMenu.source === 'cell' && activeColumnMenu.cellValue && activeColumnMenu.cellValue !== '-' && (
                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                                    <div className={contextMenuSectionTitle}>الفلترة السريعة</div>
                                    <button type="button" className={contextMenuItemClass} onClick={() => applyFilterFromCellValue('equals')}>
                                        <span>تصفية بهذه القيمة</span>
                                        <Filter size={14} className="text-slate-400" />
                                    </button>
                                    {activeColumnMenu.colKey === 'amount' && (
                                        <>
                                            <button type="button" className={contextMenuItemClass} onClick={() => applyFilterFromCellValue('greaterThan')}>
                                                <span>أكبر من هذه القيمة</span>
                                                <Filter size={14} className="text-slate-400" />
                                            </button>
                                            <button type="button" className={contextMenuItemClass} onClick={() => applyFilterFromCellValue('lessThan')}>
                                                <span>أصغر من هذه القيمة</span>
                                                <Filter size={14} className="text-slate-400" />
                                            </button>
                                        </>
                                    )}
                                    <button type="button" className={contextMenuItemClass} onClick={() => clearFilter(activeColumnMenu.colKey)}>
                                        <span>مسح فلتر العمود</span>
                                        <Filter size={14} className="text-slate-400" />
                                    </button>
                                    <button
                                        type="button"
                                        className={contextMenuItemClass}
                                        onClick={() => {
                                            setShowFilters(true);
                                            setActiveColumnMenu(null);
                                        }}
                                    >
                                        <span>فتح لوحة التصفية</span>
                                        <Pencil size={14} className="text-slate-400" />
                                    </button>
                                </div>
                            )}

                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                                <div className={contextMenuSectionTitle}>الأعمدة</div>
                                <button type="button" className={contextMenuItemClass} onClick={() => hideColumn(activeColumnMenu.colKey)}>
                                    <span>إخفاء العمود</span>
                                    <Columns3 size={14} className="text-slate-400" />
                                </button>
                                <button
                                    type="button"
                                    className={contextMenuItemClass}
                                    onClick={() => {
                                        showAllColumns();
                                        setActiveColumnMenu(null);
                                    }}
                                >
                                    <span>إظهار كل الأعمدة</span>
                                    <Columns3 size={14} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                                <div className={contextMenuSectionTitle}>عرض العمود</div>
                                <button type="button" className={contextMenuItemClass} onClick={() => adjustColumnWidth(activeColumnMenu.colKey, 20)}>
                                    <span>زيادة العرض 20px</span>
                                    <Maximize2 size={14} className="text-slate-400" />
                                </button>
                                <button type="button" className={contextMenuItemClass} onClick={() => adjustColumnWidth(activeColumnMenu.colKey, -20)}>
                                    <span>تقليل العرض 20px</span>
                                    <Maximize2 size={14} className="text-slate-400" />
                                </button>
                                <button type="button" className={contextMenuItemClass} onClick={() => autoFitColumnWidth(activeColumnMenu.colKey)}>
                                    <span>ملاءمة تلقائية</span>
                                    <Maximize2 size={14} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                                <div className={contextMenuSectionTitle}>أوامر عامة</div>
                                <button
                                    type="button"
                                    className={contextMenuItemClass}
                                    onClick={() => {
                                        void loadVouchers();
                                        setActiveColumnMenu(null);
                                    }}
                                >
                                    <span>تحديث القائمة</span>
                                    <RefreshCw size={14} className="text-slate-400" />
                                </button>
                                <button
                                    type="button"
                                    className={contextMenuItemClass}
                                    onClick={() => {
                                        handleExport('excel');
                                        setActiveColumnMenu(null);
                                    }}
                                >
                                    <span>تصدير Excel</span>
                                    <Copy size={14} className="text-slate-400" />
                                </button>
                                <button
                                    type="button"
                                    className={contextMenuItemClass}
                                    onClick={() => {
                                        void copySelectedRowsAsTsv();
                                        setActiveColumnMenu(null);
                                    }}
                                >
                                    <span>نسخ السجلات المحددة</span>
                                    <Copy size={14} className="text-slate-400" />
                                </button>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                                <label className="mb-1.5 block text-[11px] font-bold text-slate-500">قيمة التصفية</label>
                                {activeColumnMenu.colKey === 'status' ? (
                                    <select
                                        autoFocus
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        value={columnFilters.status}
                                        onChange={(e) => setColumnFilters(prev => ({ ...prev, status: e.target.value as any }))}
                                    >
                                        <option value="all">الكل</option>
                                        <option value="DRAFT">مسودة</option>
                                        <option value="POSTED">مرحل</option>
                                    </select>
                                ) : activeColumnMenu.colKey === 'amount' ? (
                                    <div className="flex gap-2">
                                        <select
                                            className="w-1/3 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                            value={columnFilters.amountOperator}
                                            onChange={(e) => setColumnFilters(prev => ({ ...prev, amountOperator: e.target.value as any }))}
                                        >
                                            <option value="equals">=</option>
                                            <option value="greaterThan">&gt;</option>
                                            <option value="lessThan">&lt;</option>
                                        </select>
                                        <input
                                            autoFocus
                                            type="number"
                                            className="w-2/3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                            placeholder="المبلغ..."
                                            value={columnFilters.amount}
                                            onChange={(e) => setColumnFilters(prev => ({ ...prev, amount: e.target.value }))}
                                        />
                                    </div>
                                ) : (
                                    <input
                                        autoFocus
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        placeholder={`تصفية ${activeColumnMenu.label}...`}
                                        value={columnFilters[activeColumnMenu.colKey] || ''}
                                        onChange={(e) => setColumnFilters(prev => ({ ...prev, [activeColumnMenu.colKey]: e.target.value }))}
                                    />
                                )}
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                <button type="button" onClick={() => clearFilter(activeColumnMenu.colKey)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100">مسح</button>
                                <button type="button" onClick={() => setActiveColumnMenu(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900">إغلاق</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
