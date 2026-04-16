import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Banknote, FileText, Search, Filter, RotateCcw, Columns3, ChevronDown, Bookmark, Star, Trash2, ArrowDownAZ, ArrowUpZA, Copy, Maximize2, RefreshCw, Pencil, FolderOpen, CheckCircle2 } from 'lucide-react';
import { useTabs } from '../../../src/contexts/TabsContext';
import { AnimatePresence, motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import PaymentVoucherToolbar from './PaymentVoucherToolbar';
import { FloatingDropdown } from '../../../src/components/ui/FloatingDropdown';
import { FloatingMenuLayout, getFloatingMenuPositionFromPoint, getFloatingMenuPositionFromRect } from '../../../src/lib/floatingMenu';

interface Payment {
    id: string;
    voucher_no: string;
    date: string;
    payee_name?: string;
    description?: string;
    amount: number;
    currency_id: string;
    status: string;
}

type QuickSearchOperator = 'contains' | 'startsWith' | 'equals' | 'notContains';
type QuickSearchField = 'all' | 'voucher_no' | 'payee_name' | 'description' | 'currency_id';
type FilterColumn = 'voucher_no' | 'payee_name' | 'description' | 'status' | 'currency_id' | 'date';
type PaymentColumnKey = 'voucher_no' | 'date' | 'status' | 'payee_name' | 'description' | 'amount' | 'currency_id';

interface PaymentColumnDef {
    key: PaymentColumnKey;
    label: string;
    align?: 'left' | 'right' | 'center';
}

interface PaymentSavedView {
    id: string;
    name: string;
    isDefault?: boolean;
    state: {
        visibleColumns: PaymentColumnKey[];
        columnWidths?: Record<string, number>;
        sortKey: PaymentColumnKey;
        sortDir: 'asc' | 'desc';
        rowDensity: 'comfortable' | 'compact';
        quickSearch: string;
        quickSearchField: QuickSearchField;
        quickSearchOperator: QuickSearchOperator;
        statusFilter: 'all' | 'POSTED' | 'DRAFT';
        columnFilters: ColumnFilters;
    };
}

interface ColumnFilters {
    voucher_no: string;
    date: string;
    status: 'all' | 'POSTED' | 'DRAFT';
    payee_name: string;
    description: string;
    currency_id: string;
    amount: string;
    amountOperator: 'equals' | 'greaterThan' | 'lessThan';
}

interface PaymentContextMenuState {
    colKey: PaymentColumnKey;
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
    payee_name: '',
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

const RECEIPT_COLUMNS: PaymentColumnDef[] = [
    { key: 'voucher_no', label: 'رقم السند' },
    { key: 'date', label: 'التاريخ' },
    { key: 'status', label: 'الحالة' },
    { key: 'payee_name', label: 'المستلم منه' },
    { key: 'description', label: 'البيان' },
    { key: 'amount', label: 'المبلغ', align: 'right' },
    { key: 'currency_id', label: 'العملة', align: 'center' },
];

const DEFAULT_VISIBLE_COLUMNS: PaymentColumnKey[] = RECEIPT_COLUMNS.map((c) => c.key);
const RECEIPT_VIEWS_STORAGE_KEY = 'wafi.views.treasury.payment.list';

export const PaymentVoucherList = () => {
    const [vouchers, setVouchers] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'POSTED' | 'DRAFT'>('all');
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [rowDensity, setRowDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [quickSearch, setQuickSearch] = useState('');
    const [quickSearchField, setQuickSearchField] = useState<QuickSearchField>('all');
    const [quickSearchOperator, setQuickSearchOperator] = useState<QuickSearchOperator>('contains');
    const [quickFilterColumn, setQuickFilterColumn] = useState<FilterColumn>('payee_name');
    const [quickFilterValue, setQuickFilterValue] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>(DEFAULT_COLUMN_FILTERS);
    const [visibleColumns, setVisibleColumns] = useState<PaymentColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
    const [openMenu, setOpenMenu] = useState<'columns' | 'views' | null>(null);
    const [sortKey, setSortKey] = useState<PaymentColumnKey>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [draggedCol, setDraggedCol] = useState<PaymentColumnKey | null>(null);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [activeColumnMenu, setActiveColumnMenu] = useState<PaymentContextMenuState | null>(null);
    const [savedViews, setSavedViews] = useState<PaymentSavedView[]>([]);
    const [activeViewId, setActiveViewId] = useState<string | null>(null);
    const { navigateInTab } = useTabs();
    const api = (window as any).electronAPI?.treasury;

    useEffect(() => {
        loadVouchers();
    }, []);

    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return; // منع إغلاق القائمة نهائياً إلا إذا كان النقر بالزر الأيسر للماوس
            const target = e.target as HTMLElement;
            if (!target.closest('[data-payment-context-menu="1"]') && !target.closest('[data-column-filter-trigger="1"]')) {
                setActiveColumnMenu(null);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveColumnMenu(null);
        };
        document.addEventListener('mousedown', onMouseDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('mousedown', onMouseDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, []);

    useEffect(() => {
        if (!activeColumnMenu) return;

        const closeMenu = () => setActiveColumnMenu(null);
        window.addEventListener('resize', closeMenu);
        window.addEventListener('scroll', closeMenu, true);
        return () => {
            window.removeEventListener('resize', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
        };
    }, [activeColumnMenu]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(RECEIPT_VIEWS_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as PaymentSavedView[];
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
            setStatusFilter(s.statusFilter || 'all');
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
        if (!api) return;
        setLoading(true);
        try {
            const data = await api.getPayments();
            setVouchers(data || []);
        } catch (error) {
            console.error("Failed to load payment vouchers", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVouchers = useMemo(() => {
        const rows = vouchers.filter(v => {
            const quickSource = {
                voucher_no: String(v.voucher_no || ''),
                payee_name: String(v.payee_name || ''),
                description: String(v.description || ''),
                currency_id: String(v.currency_id || ''),
            };

            const matchesQuickSearch = (() => {
                const term = quickSearch.trim();
                if (!term) return true;

                if (quickSearchField === 'all') {
                    return Object.values(quickSource).some((value) => matchesWithOperator(value, term, quickSearchOperator));
                }

                return matchesWithOperator(quickSource[quickSearchField], term, quickSearchOperator);
            })();

            const matchesLegacySearch =
                !searchTerm ||
                (v.voucher_no && v.voucher_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (v.payee_name && v.payee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (v.description && v.description.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesColumnFilters =
                (!columnFilters.voucher_no || String(v.voucher_no || '').toLowerCase().includes(columnFilters.voucher_no.toLowerCase())) &&
                (!columnFilters.date || String(v.date || '').toLowerCase().includes(columnFilters.date.toLowerCase())) &&
                (columnFilters.status === 'all' || v.status === columnFilters.status) &&
                (!columnFilters.payee_name || String(v.payee_name || '').toLowerCase().includes(columnFilters.payee_name.toLowerCase())) &&
                (!columnFilters.description || String(v.description || '').toLowerCase().includes(columnFilters.description.toLowerCase())) &&
                (!columnFilters.currency_id || String(v.currency_id || '').toLowerCase().includes(columnFilters.currency_id.toLowerCase())) &&
                (!columnFilters.amount || (() => {
                    const filterAmount = Number(columnFilters.amount);
                    if (isNaN(filterAmount)) return true;
                    const rowAmount = Number(v.amount);
                    switch (columnFilters.amountOperator) {
                        case 'greaterThan': return rowAmount > filterAmount;
                        case 'lessThan': return rowAmount < filterAmount;
                        case 'equals': default: return rowAmount === filterAmount;
                    }
                })());

            const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

            return matchesQuickSearch && matchesLegacySearch && matchesColumnFilters && matchesStatus;
        });

        const sorted = [...rows].sort((a, b) => {
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

    const getColumnLabel = (key: PaymentColumnKey) => RECEIPT_COLUMNS.find((column) => column.key === key)?.label || key;

    const getVoucherById = (id?: string | null) => {
        if (!id) return null;
        return vouchers.find((voucher) => voucher.id === id) || null;
    };

    const getCellTextValue = (voucher: Payment, key: PaymentColumnKey): string => {
        switch (key) {
            case 'voucher_no':
                return voucher.voucher_no || '-';
            case 'date':
                return voucher.date || '-';
            case 'status':
                return voucher.status === 'POSTED' ? 'مرحل' : voucher.status === 'DRAFT' ? 'مسودة' : String(voucher.status || '-');
            case 'payee_name':
                return voucher.payee_name || '-';
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
        navigateInTab(`/treasury/payment/${voucher.id}`, `تعديل سند صرف ${voucher.voucher_no}`);
    };

    const duplicateVoucherById = async (id?: string | null) => {
        const voucher = getVoucherById(id);
        if (!voucher) return;
        navigateInTab('/treasury/payment/new', 'سند صرف جديد');
    };

    const deletePaymentIds = async (ids: string[]) => {
        if (ids.length === 0) return;
        if (!confirm(`هل تريد حذف ${ids.length} سند صرف؟`)) return;

        try {
            for (const id of ids) {
                if (api?.deletePayment) {
                    await api.deletePayment(id);
                }
            }
            await loadVouchers();
            setSelectedRowIds((prev) => prev.filter((id) => !ids.includes(id)));
        } catch (error) {
            console.error("Failed to delete payment", error);
            alert('فشل حذف سند الصرف');
        }
    };

    const postPaymentIds = async (ids: string[]) => {
        if (ids.length === 0) return;

        const draftIds = ids.filter((id) => {
            const voucher = vouchers.find((row) => row.id === id);
            return voucher?.status === 'DRAFT';
        });

        if (draftIds.length === 0) {
            alert('كل السندات المحددة مرحلة مسبقًا.');
            return;
        }

        if (!confirm(`هل أنت متأكد من ترحيل ${draftIds.length} سند صرف؟`)) return;

        setLoading(true);
        try {
            for (const id of draftIds) {
                if (api?.postPayment) await api.postPayment(id);
                else if (api?.updatePaymentStatus) await api.updatePaymentStatus(id, 'POSTED');
            }
            await loadVouchers();
            setSelectedRowIds((prev) => prev.filter((id) => !draftIds.includes(id)));
        } catch (error) {
            console.error("Failed to post payments", error);
            alert('حدث خطأ أثناء ترحيل السندات.');
        } finally {
            setLoading(false);
        }
    };

    const clearSort = () => {
        setSortKey('date');
        setSortDir('desc');
    };

    const setContextMenuSort = (key: PaymentColumnKey, direction: 'asc' | 'desc') => {
        setSortKey(key);
        setSortDir(direction);
        setActiveColumnMenu(null);
    };

    const hideColumn = (key: PaymentColumnKey) => {
        setVisibleColumns((prev) => (prev.length <= 1 ? prev : prev.filter((column) => column !== key)));
        setActiveColumnMenu(null);
    };

    const adjustColumnWidth = (key: PaymentColumnKey, delta: number) => {
        setColumnWidths((prev) => {
            const nextWidth = Math.max(90, Math.min(460, Number(prev[key] || 180) + delta));
            return { ...prev, [key]: nextWidth };
        });
        setActiveColumnMenu(null);
    };

    const autoFitColumnWidth = (key: PaymentColumnKey) => {
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

    const handleDuplicate = async () => {
        if (selectedRowIds.length !== 1) return;
        await duplicateVoucherById(selectedRowIds[0]);
    };

    const handleDelete = async () => {
        await deletePaymentIds(selectedRowIds);
    };

    const handleBulkPost = async () => {
        await postPaymentIds(selectedRowIds);
    };

    const handleExport = (format: 'excel' | 'pdf') => {
        const headers = ['رقم السند', 'التاريخ', 'الحالة', 'المستلم منه', 'البيان', 'المبلغ', 'العملة'];
        const records = filteredVouchers.map(v => ({
            'رقم السند': v.voucher_no,
            'التاريخ': v.date,
            'الحالة': v.status === 'POSTED' ? 'مرحل' : v.status,
            'المستلم منه': v.payee_name || '-',
            'البيان': v.description || '',
            'المبلغ': Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            'العملة': v.currency_id,
        }));

        if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(records);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'سندات الصرف');
            XLSX.writeFile(wb, 'سندات-الصرف.xlsx');
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
        setStatusFilter('all');
        setQuickSearch('');
        setQuickSearchField('all');
        setQuickSearchOperator('contains');
        setColumnFilters(DEFAULT_COLUMN_FILTERS);
    };

    const persistViews = (next: PaymentSavedView[]) => {
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

        const view: PaymentSavedView = {
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
        setSortKey('date');
        setSortDir('desc');
        setRowDensity('comfortable');
        clearAllFilters();
        setActiveViewId(null);
    };

    const handleResizeStart = (e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        const th = (e.target as HTMLElement).closest('th');
        if (!th) return;
        const startX = e.clientX;
        const startWidth = th.getBoundingClientRect().width;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const delta = startX - moveEvent.clientX; // حركة الماوس لليسار تزيد العرض في RTL
            const newWidth = Math.max(60, startWidth + delta);
            setColumnWidths(prev => ({ ...prev, [key]: newWidth }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const openFilterMenu = (
        e: React.MouseEvent,
        colKey: PaymentColumnKey,
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
            console.warn('ط§ط³طھط®ط¯ط§ظ… ط§ظ„ظ…ظˆقع الافتراضي لقائمة الفلترة:', error);
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

    const clearFilter = (colKey: PaymentColumnKey) => {
        setColumnFilters(prev => {
            const n = { ...prev };
            if (colKey === 'status') n.status = 'all';
            else if (colKey === 'amount') { n.amount = ''; n.amountOperator = 'equals'; }
            else n[colKey as any] = '';
            return n as ColumnFilters;
        });
        setActiveColumnMenu(null);
    };

    const toggleColumnVisibility = (key: PaymentColumnKey) => {
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

    const handleSort = (key: PaymentColumnKey) => {
        setSortKey((prevKey) => {
            if (prevKey === key) {
                setSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
                return prevKey;
            }
            setSortDir('asc');
            return key;
        });
    };

    const handleCellDoubleClick = (e: React.MouseEvent, text: string) => {
        e.stopPropagation();
        if (!text || text === '-') return;
        navigator.clipboard.writeText(text).catch(() => {});
        const el = e.currentTarget as HTMLElement;
        const prevBg = el.style.backgroundColor;
        el.style.backgroundColor = '#ffe4e6'; // ظ„ظˆظ† ط£ط®ط¶ط± ظپط§طھط­ ظ„طھط£ظƒيد النسخ
        el.style.transition = 'background-color 0.3s ease';
        setTimeout(() => {
            el.style.backgroundColor = prevBg;
            setTimeout(() => { el.style.transition = ''; }, 300);
        }, 300);
    };

    const hasActiveFilters =
        quickSearch.trim().length > 0 ||
        statusFilter !== 'all' ||
        searchTerm.trim().length > 0 ||
        columnFilters.voucher_no.trim().length > 0 ||
        columnFilters.date.trim().length > 0 ||
        columnFilters.status !== 'all' ||
        columnFilters.payee_name.trim().length > 0 ||
        columnFilters.description.trim().length > 0 ||
        columnFilters.currency_id.trim().length > 0 ||
        columnFilters.amount.trim().length > 0;

    const rowClass = rowDensity === 'compact' ? 'px-3 py-1.5' : 'px-3 py-2.5';
    const thCls = `${rowClass} border-b border-l border-slate-200 bg-slate-50 align-middle first:border-r`;
    const filterThCls = `${rowClass} border-b border-l border-slate-200 bg-white align-middle first:border-r`;
    const tdCls = `${rowClass} border border-[#d7e9fb] text-[13px]`;
    const contextMenuSectionTitle = 'px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400';
    const contextMenuItemClass = 'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-[12px] font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800';
    const contextMenuDangerItemClass = 'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-[12px] font-semibold text-rose-700 transition hover:bg-rose-50 hover:text-rose-800';
    const contextMenuPayment = activeColumnMenu?.rowId ? getVoucherById(activeColumnMenu.rowId) : null;
    const contextMenuCanPost = contextMenuPayment?.status === 'DRAFT';

    return (
        <div className="p-6 bg-[#f8fafc] h-full flex flex-col gap-4 overflow-y-auto" dir="rtl">
            {/* Header with Icon */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                            <Banknote size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">سندات الصرف</h1>
                            <p className="text-sm text-slate-500">إدارة المدفوعات النقدية والشيكات</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigateInTab('/treasury/payment/new', 'سند صرف جديد')}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors h-fit"
                    >
                        <Plus size={18} /> سند صرف جديد
                    </button>
                </div>
            </motion.div>

            {/* Toolbar */}
            <PaymentVoucherToolbar
                selectedRowsCount={selectedRowIds.length}
                rowDensity={rowDensity}
                onNew={() => navigateInTab('/treasury/payment/new', 'سند صرف جديد')}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onExport={handleExport}
                onPrint={() => window.print()}
                onOpenFilters={() => setShowFilters(!showFilters)}
                onRefresh={loadVouchers}
                onSetRowDensity={setRowDensity}
            />

            {/* Stats Cards */}
            <div className="grid gap-3 md:grid-cols-4">
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
                        <option value="payee_name">المستلم منه</option>
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
                            <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50" onClick={showAllColumns}>ط¥ط¸ظ‡ط§ط± ط§ظ„ظƒل</button>
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
                        title="ط¹ط±ظˆط¶ ط§ظ„ط¬ط¯ظˆل"
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
                                            title="طھط¹ظٹظٹظ† ظƒافتراضي"
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
                                ط¥ط¹ط§ط¯ط© ط¶ط¨ط· ط§ظ„ط¬ط¯ظˆل
                            </button>
                        </div>
                    </FloatingDropdown>
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
                        <option value="payee_name">المستلم منه</option>
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
                                بحث: {quickSearch} أ—
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
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full border-separate border-spacing-0 text-right text-[13px] text-slate-700">
                        <thead className="sticky top-0 z-20 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                            <tr>
                                <th className={`${thCls} text-center w-12`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRowIds.length === filteredVouchers.length && filteredVouchers.length > 0}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 rounded border-slate-300 text-sky-600"
                                    />
                                </th>
                                {visibleColumns.map((colKey) => {
                                    const column = RECEIPT_COLUMNS.find(c => c.key === colKey);
                                    if (!column) return null;
                                    const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : '';
                                    const activeSort = sortKey === column.key;
                                    const isFilterable = true;
                                    const columnFilterValue = columnFilters[column.key];
                                    const hasFilter = isFilterable && columnFilterValue && columnFilterValue !== 'all';

                                    return (
                                        <th
                                            key={column.key}
                                            draggable
                                            onDragStart={() => setDraggedCol(column.key)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                if (!draggedCol || draggedCol === column.key) return;
                                                setVisibleColumns((prev) => {
                                                    const newCols = [...prev];
                                                    const draggedIdx = newCols.indexOf(draggedCol);
                                                    const targetIdx = newCols.indexOf(column.key);
                                                    newCols.splice(draggedIdx, 1);
                                                    newCols.splice(targetIdx, 0, draggedCol);
                                                    return newCols;
                                                });
                                                setDraggedCol(null);
                                            }}
                                            onDragEnd={() => setDraggedCol(null)}
                                            className={`group relative ${thCls} text-xs font-bold text-slate-600 ${alignClass} cursor-move select-none hover:bg-sky-50 hover:text-sky-700 ${draggedCol === column.key ? 'opacity-50 bg-sky-100' : ''}`}
                                            style={{ width: columnWidths[column.key], minWidth: columnWidths[column.key] }}
                                            onClick={() => handleSort(column.key)}
                                            onMouseDown={(e) => {
                                                if (e.button === 2 && isFilterable) {
                                                    openFilterMenu(e, column.key, column.label, 'header');
                                                }
                                            }}
                                            onContextMenu={(e) => e.preventDefault()}
                                        >
                                            <div
                                                className="absolute top-0 left-0 h-full w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100 bg-sky-300 hover:bg-sky-500 active:bg-sky-600 z-10 transition-opacity"
                                                onMouseDown={(e) => handleResizeStart(e, column.key)}
                                                onClick={(e) => e.stopPropagation()}
                                                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                            />
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="inline-flex items-center gap-1">
                                                    {column.label}
                                                    {activeSort && <span className="text-[10px] text-sky-600">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                                                </span>
                                                {isFilterable && (
                                                    <button
                                                        type="button"
                                                        data-column-filter-trigger="1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (activeColumnMenu?.colKey === column.key && activeColumnMenu.source === 'header' && !activeColumnMenu.rowId) {
                                                                setActiveColumnMenu(null);
                                                                return;
                                                            }
                                                            openFilterMenu(e, column.key, column.label, 'header');
                                                        }}
                                                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${hasFilter ? 'border-sky-300 bg-sky-100 text-sky-700 shadow-sm' : 'border-transparent text-slate-400 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'}`}
                                                    >
                                                        <Filter size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className={`${tdCls} py-8 text-center text-slate-500`}>جاري التحميل...</td>
                                </tr>
                            ) : filteredVouchers.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className={`${tdCls} py-12 text-center text-slate-400`}>
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText size={48} className="mb-2 opacity-20" />
                                            <p>لا توجد سندات صرف</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredVouchers.map((v, idx) => (
                                    <tr
                                        key={v.id}
                                        onClick={(e) => {
                                            if ((e.target as any).type !== 'checkbox') {
                                                toggleRowSelection(v.id, e.ctrlKey || e.metaKey);
                                            }
                                        }}
                                        className={`cursor-pointer transition-colors ${selectedRowIds.includes(v.id) ? 'bg-sky-50' : 'bg-white hover:bg-sky-50/60'}`}
                                        onDoubleClick={() => navigateInTab(`/treasury/payment/${v.id}`, `سند صرف ${v.voucher_no}`)}
                                    >
                                        <td className={`${tdCls} text-center`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRowIds.includes(v.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleRowSelection(v.id, true);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-4 w-4 rounded border-slate-300 text-sky-600"
                                            />
                                        </td>
                                        {visibleColumns.map((colKey) => {
                                            const label = getColumnLabel(colKey);
                                            const cellText = getCellTextValue(v, colKey);
                                            const handleContextMenu = (e: React.MouseEvent) => {
                                                if (e.button === 2) {
                                                    openFilterMenu(e, colKey, label, 'cell', cellText, v.id);
                                                }
                                            };
                                            const handleDoubleClick = (e: React.MouseEvent, text: string) => handleCellDoubleClick(e, text);
                                            switch (colKey) {
                                                case 'voucher_no': return <td key={colKey} onContextMenu={handleContextMenu} onDoubleClick={(e) => handleDoubleClick(e, v.voucher_no)} className={`${tdCls} font-mono text-rose-600 font-bold cursor-context-menu hover:bg-rose-50/50`} title="نقر مزدوج للنسخ">{v.voucher_no}</td>;
                                                case 'date': return <td key={colKey} onContextMenu={handleContextMenu} onDoubleClick={(e) => handleDoubleClick(e, v.date)} className={`${tdCls} text-slate-600 font-mono text-xs cursor-context-menu hover:bg-slate-50/80`} title="نقر مزدوج للنسخ">{v.date}</td>;
                                                case 'status': return <td key={colKey} onContextMenu={handleContextMenu} onDoubleClick={(e) => handleDoubleClick(e, v.status === 'POSTED' ? 'مرحل' : 'مسودة')} className={`${tdCls} cursor-context-menu hover:bg-slate-50/80`} title="نقر مزدوج للنسخ"><span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${v.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{v.status === 'POSTED' ? 'مرحل' : 'مسودة'}</span></td>;
                                                case 'payee_name': return <td key={colKey} onContextMenu={handleContextMenu} onDoubleClick={(e) => handleDoubleClick(e, v.payee_name || '')} className={`${tdCls} font-medium text-slate-700 cursor-context-menu hover:bg-slate-50/80`} title="نقر مزدوج للنسخ">{v.payee_name || '-'}</td>;
                                                case 'description': return <td key={colKey} onContextMenu={handleContextMenu} onDoubleClick={(e) => handleDoubleClick(e, v.description || '')} className={`${tdCls} text-slate-600 text-sm max-w-xs truncate cursor-context-menu hover:bg-slate-50/80`} title={`نقر مزدوج للنسخ\n${v.description || ''}`}>{v.description || '-'}</td>;
                                                case 'amount': return <td key={colKey} onContextMenu={handleContextMenu} onDoubleClick={(e) => handleDoubleClick(e, String(v.amount))} className={`${tdCls} font-bold text-slate-800 font-mono text-right cursor-context-menu hover:bg-slate-50/80`} title="نقر مزدوج للنسخ">{Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                case 'currency_id': return <td key={colKey} onContextMenu={handleContextMenu} onDoubleClick={(e) => handleDoubleClick(e, v.currency_id || '')} className={`${tdCls} text-center text-xs text-slate-600 cursor-context-menu hover:bg-slate-50/80`} title="نقر مزدوج للنسخ">{v.currency_id || '-'}</td>;
                                                default: return null;
                                            }
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
                {activeColumnMenu && createPortal(
                    <motion.div
                        data-payment-context-menu="1"
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
                                                void postPaymentIds(activeColumnMenu.rowId ? [activeColumnMenu.rowId] : []);
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
                                            void deletePaymentIds(activeColumnMenu.rowId ? [activeColumnMenu.rowId] : []);
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
                                        <span>ظپطھط­ ظ„ظˆحة التصفية</span>
                                        <Pencil size={14} className="text-slate-400" />
                                    </button>
                                </div>
                            )}

                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                                <div className={contextMenuSectionTitle}>الأعمدة</div>
                                <button type="button" className={contextMenuItemClass} onClick={() => hideColumn(activeColumnMenu.colKey)}>
                                    <span>ط¥ط®ظپط§ط، ط§ظ„ط¹ظ…ظˆد</span>
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
                                    <span>ط¥ط¸ظ‡ط§ط± ظƒل الأعمدة</span>
                                    <Columns3 size={14} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                                <div className={contextMenuSectionTitle}>ط¹ط±ط¶ ط§ظ„ط¹ظ…ظˆد</div>
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
                                <div className={contextMenuSectionTitle}>ط£ظˆامر عامة</div>
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
                                        <option value="all">ط§ظ„ظƒل</option>
                                        <option value="DRAFT">ظ…ط³ظˆدة</option>
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
                    </motion.div>,
                    document.body
                )}
            </AnimatePresence>
        </div>
    );
};
