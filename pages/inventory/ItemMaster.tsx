import React, { useDeferredValue, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckSquare, Columns3, Copy, Edit, FileSpreadsheet, Filter, RotateCcw, Search, SlidersHorizontal, Square, Star, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Item } from '../../types';
import ItemForm from './ItemForm';
import ItemMasterToolbar from './ItemMasterToolbar';
import ItemMasterContextMenu from './ItemMasterContextMenu';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FilterDrawer from '../../src/components/ui/FilterDrawer';
import { useBesanHotkeys } from '../../src/hooks/useBesanHotkeys';
import { getVisibleColumns, useScreenViewManager } from '../../src/hooks/useScreenViewManager';
import { getFloatingMenuPositionFromRect } from '../../src/lib/floatingMenu';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ItemMasterProps {
    defaultType?: 'Goods' | 'Service' | 'Raw Material' | 'Finished Good' | 'Asset';
    pickerMode?: boolean;
    onPickItem?: (item: Item) => void;
    startInCreateMode?: boolean;
}

export type ColumnFilterOperator =
    | 'contains'
    | 'equals'
    | 'startsWith'
    | 'endsWith'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'isEmpty'
    | 'notEmpty';

export interface ColumnFilterState {
    operator: ColumnFilterOperator;
    value: string;
}

export interface GridContextMenuState {
    x: number;
    y: number;
    columnKey: string;
    rowId?: string;
    cellValue?: string;
    source: 'header' | 'cell';
}

type ExportFormat = 'excel' | 'html' | 'delimited' | 'json' | 'pdf';

type QuickSearchOperator = 'contains' | 'startsWith' | 'equals' | 'notContains';
type ItemTypeFilter = 'all' | 'stock' | 'service' | 'raw_material' | 'finished_good' | 'asset';

interface ColumnResizeState {
    columnKey: string;
    startX: number;
    startWidth: number;
}

interface ActiveCellState {
    rowIndex: number;
    columnKey: string;
}

interface ActiveColumnMenuState {
    key: string;
    position: {
        top: number;
        left: number;
        maxHeight: number;
        transformOrigin: string;
    };
}

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const SCREEN_KEY = 'definitions.items.list';

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

const COLUMN_FALLBACK_LABELS: Record<string, string> = {
    code: 'الرمز',
    name_ar: 'الاسم العربي',
    name_en: 'الاسم الإنجليزي',
    category_name: 'المجموعة',
    brand_name: 'الماركة',
    type: 'النوع',
    base_unit_name: 'الوحدة الأساسية',
    current_stock: 'الرصيد الحالي',
    min_stock_level: 'الحد الأدنى',
    reorder_point: 'نقطة إعادة الطلب',
    sale_price: 'سعر البيع',
    is_active: 'الحالة',
};

const COLUMN_LABELS: Record<string, string> = {
    ...COLUMN_FALLBACK_LABELS,
    code: 'الرقم',
    barcode: 'الباركود',
    name_ar: 'الاسم',
    name_en: 'الاسم English',
    name_he: 'الاسم بالعبرية',
    trade_name: 'الاسم التجاري',
    category_name: 'مجموعة الصنف',
    brand_name: 'العلامة التجارية',
    type: 'نوع الصنف',
    base_unit_name: 'الوحدة الأساسية',
    default_supplier_name: 'المورد الافتراضي',
    default_warehouse_name: 'المستودع الافتراضي',
    production_line: 'خط الإنتاج',
    grade: 'الدرجة',
    warranty_info: 'الكفالة',
    costing_method: 'طريقة التكلفة',
    current_stock: 'رصيد مخزون',
    cost_price: 'سعر التكلفة',
    standard_cost: 'التكلفة المعيارية',
    min_stock_level: 'الحد الأدنى',
    max_stock: 'الحد الأعلى',
    reorder_point: 'حد إعادة الطلب',
    sale_price: 'سعر البيع',
    min_price: 'أقل سعر',
    floor_price: 'سعر الأرضية',
    wholesale_price: 'سعر الجملة',
    tax_type: 'نوع الضريبة',
    tax_included: 'شامل الضريبة',
    has_expiry: 'له صلاحية',
    has_serial: 'له مسلسل',
    shelf_life_days: 'أيام الصلاحية',
    inventory_account_name: 'حساب المخزون',
    sales_account_name: 'حساب المبيعات',
    cogs_account_name: 'حساب التكلفة',
    description: 'الوصف',
    is_active: 'فعال',
};

const NUMERIC_COLUMN_KEYS = new Set([
    'current_stock',
    'cost_price',
    'standard_cost',
    'min_stock_level',
    'max_stock',
    'reorder_point',
    'sale_price',
    'min_price',
    'floor_price',
    'wholesale_price',
    'shelf_life_days',
]);

const MONEY_COLUMN_KEYS = new Set([
    'cost_price',
    'standard_cost',
    'sale_price',
    'min_price',
    'floor_price',
    'wholesale_price',
]);

const BOOLEAN_COLUMN_KEYS = new Set([
    'is_active',
    'tax_included',
    'has_expiry',
    'has_serial',
]);

const ITEM_TYPE_OPTIONS: Array<{
    value: ItemTypeFilter;
    label: string;
    hint: string;
    createType: Item['type'];
    rawValues: string[];
}> = [
    { value: 'all', label: 'الكل', hint: 'كل الأصناف والخدمات', createType: 'Goods', rawValues: [] },
    { value: 'stock', label: 'صنف مخزون', hint: 'بضاعة وخدمات', createType: 'Goods', rawValues: ['STOCK', 'GOODS', 'GOODS SERVICES', 'GOODS/SERVICES'] },
    { value: 'service', label: 'خدمي', hint: 'خدمات غير مخزنية', createType: 'Service', rawValues: ['SERVICE', 'SERVICES'] },
    { value: 'raw_material', label: 'مواد أولية', hint: 'مواد خام للإنتاج', createType: 'Raw Material', rawValues: ['RAW MATERIAL', 'RAW MATERIALS', 'RAW_MATERIAL'] },
    { value: 'finished_good', label: 'منتج تام', hint: 'صنف مصنع أو مجمّع', createType: 'Finished Good', rawValues: ['FINISHED GOOD', 'FINISHED_GOOD'] },
    { value: 'asset', label: 'موجودات ثابتة', hint: 'أصول ومعدات', createType: 'Asset', rawValues: ['ASSET', 'FIXED ASSET', 'FIXED_ASSET'] },
];

function normalizeItemType(raw: string | null | undefined): ItemTypeFilter {
    const normalized = String(raw || '')
        .trim()
        .toUpperCase()
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ');

    if (!normalized) return 'stock';

    const match = ITEM_TYPE_OPTIONS.find((option) => option.value !== 'all' && option.rawValues.includes(normalized));
    return match?.value || 'stock';
}

function matchesItemTypeFilter(raw: string | null | undefined, filter: ItemTypeFilter | string): boolean {
    if (filter === 'all') return true;
    return normalizeItemType(raw) === normalizeItemType(filter);
}

function getCreateType(filter: ItemTypeFilter | string, fallback?: ItemMasterProps['defaultType']): Item['type'] {
    if (fallback) return fallback;
    const normalizedFilter = normalizeItemType(filter);
    return ITEM_TYPE_OPTIONS.find((option) => option.value === normalizedFilter)?.createType || 'Goods';
}

function getItemTypeLabel(raw: string | null | undefined): string {
    const normalized = normalizeItemType(raw);
    return ITEM_TYPE_OPTIONS.find((option) => option.value === normalized)?.label || String(raw || '-');
}

function getBooleanBadgeLabel(columnKey: string, value: unknown): string {
    const enabled = Number(value ?? 0) === 1;
    switch (columnKey) {
        case 'tax_included':
            return enabled ? 'شامل' : 'غير شامل';
        case 'has_expiry':
        case 'has_serial':
            return enabled ? 'مفعّل' : 'غير مفعّل';
        case 'is_active':
        default:
            return enabled ? 'فعال' : 'غير فعال';
    }
}

function getManagedColumnOptions(columnKey: string): Array<{ value: string; label: string }> {
    if (columnKey === 'type') {
        return ITEM_TYPE_OPTIONS
            .filter((option) => option.value !== 'all')
            .map((option) => ({ value: option.rawValues[0], label: option.label }));
    }

    if (BOOLEAN_COLUMN_KEYS.has(columnKey)) {
        return [
            { value: '1', label: getBooleanBadgeLabel(columnKey, 1) },
            { value: '0', label: getBooleanBadgeLabel(columnKey, 0) },
        ];
    }

    return [];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ItemMaster: React.FC<ItemMasterProps> = ({ defaultType, pickerMode = false, onPickItem, startInCreateMode = false }) => {
    
    // --- 1. State & Refs ---
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const [selectedItem, setSelectedItem] = useState<Partial<Item> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [queryCreateHandled, setQueryCreateHandled] = useState(false);
    const [initialCreateHandled, setInitialCreateHandled] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterState>>({});
    const [activeColumnMenu, setActiveColumnMenu] = useState<ActiveColumnMenuState | null>(null);
    const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);
    const [gridContextMenu, setGridContextMenu] = useState<GridContextMenuState | null>(null);
    const [columnWidthInput, setColumnWidthInput] = useState('180');
    const [columnChooserOpen, setColumnChooserOpen] = useState(false);
    const columnChooserBtnRef = useRef<HTMLButtonElement>(null);
    const columnChooserMenuRef = useRef<HTMLDivElement>(null);
    const [columnChooserLayout, setColumnChooserLayout] = useState<{ top: number; left: number; maxHeight: number; transformOrigin: string } | null>(null);
    const [quickSearch, setQuickSearch] = useState('');
    const [quickSearchField, setQuickSearchField] = useState<'all' | string>('all');
    const [quickSearchOperator, setQuickSearchOperator] = useState<QuickSearchOperator>('contains');
    const [itemTypeFilter, setItemTypeFilter] = useState<string>(defaultType || 'all');
    const [pinFirstColumn, setPinFirstColumn] = useState(false);
    const [quickFilterColumnKey, setQuickFilterColumnKey] = useState('name_ar');
    const [quickFilterOperator, setQuickFilterOperator] = useState<ColumnFilterOperator>('contains');
    const [quickFilterValue, setQuickFilterValue] = useState('');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [rowDensity, setRowDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [zoom, setZoom] = useState(1);
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [columnResizeState, setColumnResizeState] = useState<ColumnResizeState | null>(null);
    const [activeCell, setActiveCell] = useState<ActiveCellState | null>(null);
    const [clientSort, setClientSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const deferredQuickSearch = useDeferredValue(quickSearch);

    // --- 2. Data & View Management (Hooks) ---
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

    // --- 3. Memoized Data & Computed Values ---
    const items = useMemo(() => {
        const rows = Array.isArray(result?.rows) ? result!.rows : [];
        const normalized = rows.map((row: any) => ({
            ...row,
            is_active: Number(row.is_active ?? 1),
            tax_included: Number(row.tax_included ?? 0),
            has_expiry: Number(row.has_expiry ?? 0),
            has_serial: Number(row.has_serial ?? 0),
            current_stock: Number(row.current_stock ?? 0),
            cost_price: Number(row.cost_price ?? 0),
            sale_price: Number(row.sale_price ?? 0),
            min_price: Number(row.min_price ?? 0),
            floor_price: Number(row.floor_price ?? 0),
            wholesale_price: Number(row.wholesale_price ?? 0),
            min_stock_level: Number(row.min_stock_level ?? 0),
            max_stock: Number(row.max_stock ?? 0),
            reorder_point: Number(row.reorder_point ?? 0),
            standard_cost: Number(row.standard_cost ?? 0),
            shelf_life_days: Number(row.shelf_life_days ?? 0),
        }));

        if (!defaultType) return normalized;
        return normalized.filter((item: any) => matchesItemTypeFilter(item.type, normalizeItemType(defaultType)));
    }, [result, defaultType]);

    const visibleColumns = useMemo(() => {
        if (!definition) return [];
        return getVisibleColumns(definition, columns).filter((col) => col.key !== 'id');
    }, [definition, columns]);

    const availableColumns = useMemo(() => {
        if (!definition) return [];
        return definition.columnSchema.filter((column) => column.key !== 'id');
    }, [definition]);

    const defaultVisibleColumnKeys = useMemo(() => {
        if (!definition) return [];
        return definition.columnSchema
            .filter((column) => column.key !== 'id' && column.defaultVisible)
            .map((column) => column.key);
    }, [definition]);

    const visibleColumnKeys = useMemo(() => visibleColumns.map((column) => column.key), [visibleColumns]);

    const getColumnLabel = React.useCallback((columnKey: string) => {
        const schema = definition?.columnSchema.find((item) => item.key === columnKey);
        return tr(schema?.labelI18nKey || `columns.${columnKey}`, COLUMN_LABELS[columnKey] || columnKey);
    }, [definition]);

    const filteredItems = useMemo(() => {
        const normalizedSearch = deferredQuickSearch.trim().toLowerCase();
        const filterEntries = Object.entries(columnFilters).filter(([, filter]) => {
            if (!filter) return false;
            if (filter.operator === 'isEmpty' || filter.operator === 'notEmpty') return true;
            return String(filter.value || '').trim().length > 0;
        });

        const applySearchOperator = (value: string): boolean => {
            if (!normalizedSearch) return true;
            const normalizedValue = value.toLowerCase();
            switch (quickSearchOperator) {
                case 'startsWith':
                    return normalizedValue.startsWith(normalizedSearch);
                case 'equals':
                    return normalizedValue === normalizedSearch;
                case 'notContains':
                    return !normalizedValue.includes(normalizedSearch);
                case 'contains':
                default:
                    return normalizedValue.includes(normalizedSearch);
            }
        };

        const getSearchValue = (item: any, columnKey: string): string => {
            const rawValue = item?.[columnKey];
            if (columnKey === 'type') {
                return `${String(rawValue || '')} ${getItemTypeLabel(String(rawValue || ''))}`;
            }
            if (BOOLEAN_COLUMN_KEYS.has(columnKey)) {
                return getBooleanBadgeLabel(columnKey, rawValue);
            }
            return String(rawValue ?? '');
        };

        const baseRows = (filterEntries.length === 0 && !normalizedSearch && itemTypeFilter === 'all')
            ? items
            : items.filter((item: any) => {
            const matchesType = matchesItemTypeFilter(item.type, itemTypeFilter);
            if (!matchesType) return false;

            const matchesQuickSearch = !normalizedSearch || (quickSearchField === 'all'
                ? availableColumns.some((column) => applySearchOperator(getSearchValue(item, column.key)))
                : applySearchOperator(getSearchValue(item, quickSearchField)));

            if (!matchesQuickSearch) return false;

            return filterEntries.every(([columnKey, filter]) => {
                const rawValue = item?.[columnKey as keyof typeof item];
                const textValue = String(rawValue ?? '').trim();
                const normalizedTextValue = textValue.toLowerCase();
                const normalizedFilterValue = String(filter.value || '').trim().toLowerCase();

                if (filter.operator === 'isEmpty') {
                    return textValue.length === 0 || textValue === '-';
                }

                if (filter.operator === 'notEmpty') {
                    return textValue.length > 0 && textValue !== '-';
                }

                if (NUMERIC_COLUMN_KEYS.has(columnKey)) {
                    const numericValue = Number(rawValue ?? 0);
                    const compareValue = Number(filter.value ?? 0);
                    if (!Number.isFinite(compareValue)) return true;

                    switch (filter.operator) {
                        case 'equals':
                            return numericValue === compareValue;
                        case 'gt':
                            return numericValue > compareValue;
                        case 'gte':
                            return numericValue >= compareValue;
                        case 'lt':
                            return numericValue < compareValue;
                        case 'lte':
                            return numericValue <= compareValue;
                        default:
                            return String(numericValue).includes(String(compareValue));
                    }
                }

                switch (filter.operator) {
                    case 'equals':
                        return normalizedTextValue === normalizedFilterValue;
                    case 'startsWith':
                        return normalizedTextValue.startsWith(normalizedFilterValue);
                    case 'endsWith':
                        return normalizedTextValue.endsWith(normalizedFilterValue);
                    case 'contains':
                    default:
                        return normalizedTextValue.includes(normalizedFilterValue);
                }
            });
        });

        const sortedRows = !clientSort ? baseRows : [...baseRows].sort((left: any, right: any) => {
            const first = left?.[clientSort.key];
            const second = right?.[clientSort.key];

            if (first == null && second == null) return 0;
            if (first == null) return clientSort.direction === 'asc' ? -1 : 1;
            if (second == null) return clientSort.direction === 'asc' ? 1 : -1;

            if (NUMERIC_COLUMN_KEYS.has(clientSort.key)) {
                const a = Number(first || 0);
                const b = Number(second || 0);
                return clientSort.direction === 'asc' ? a - b : b - a;
            }

            const a = String(first).toLowerCase();
            const b = String(second).toLowerCase();
            return clientSort.direction === 'asc'
                ? a.localeCompare(b, 'ar')
                : b.localeCompare(a, 'ar');
        });

        if (!showLowStockOnly) return sortedRows;

        return sortedRows.filter((item: any) => {
            const stock = Number(item.current_stock ?? 0);
            const threshold = Number(item.reorder_point ?? item.min_stock_level ?? 0);
            return threshold > 0 && stock <= threshold;
        });
    }, [availableColumns, clientSort, columnFilters, deferredQuickSearch, itemTypeFilter, items, quickSearchField, quickSearchOperator, showLowStockOnly]);

    const hasAnyColumnFilter = useMemo(() => {
        return Object.values(columnFilters).some((filter) => {
            if (!filter) return false;
            if (filter.operator === 'isEmpty' || filter.operator === 'notEmpty') return true;
            return String(filter.value || '').trim().length > 0;
        });
    }, [columnFilters]);

    const activeClientFilters = useMemo(() => {
        return Object.entries(columnFilters).filter(([, filter]) => {
            if (!filter) return false;
            if (filter.operator === 'isEmpty' || filter.operator === 'notEmpty') return true;
            return String(filter.value || '').trim().length > 0;
        });
    }, [columnFilters]);

    const isValueLessOperator = (operator?: ColumnFilterOperator) => operator === 'isEmpty' || operator === 'notEmpty';

    const isColumnFilterActive = (columnKey: string) => {
        const filter = columnFilters[columnKey];
        if (!filter) return false;
        if (isValueLessOperator(filter.operator)) return true;
        return String(filter.value || '').trim().length > 0;
    };

    const selectedRows = useMemo(() => {
        if (selectedRowIds.length === 0) return [];
        const selectedSet = new Set(selectedRowIds);
        return filteredItems.filter((item: any) => selectedSet.has(String(item.id)));
    }, [filteredItems, selectedRowIds]);

    const allFilteredRowsSelected = useMemo(() => {
        if (filteredItems.length === 0) return false;
        return filteredItems.every((item: any) => selectedRowIds.includes(String(item.id)));
    }, [filteredItems, selectedRowIds]);

    const listStats = useMemo(() => {
        const lowStock = filteredItems.filter((item: any) => {
            const stock = Number(item.current_stock ?? 0);
            const threshold = Number(item.reorder_point ?? item.min_stock_level ?? 0);
            return threshold > 0 && stock <= threshold;
        }).length;

        const inactive = filteredItems.filter((item: any) => Number(item.is_active ?? 1) !== 1).length;
        const totalValue = filteredItems.reduce((sum: number, item: any) => (
            sum + (Number(item.current_stock ?? 0) * Number(item.cost_price ?? 0))
        ), 0);

        return {
            total: filteredItems.length,
            lowStock,
            inactive,
            totalValue,
        };
    }, [filteredItems]);

    const typeStats = useMemo(() => {
        return ITEM_TYPE_OPTIONS
            .filter((option) => option.value !== 'all')
            .map((option) => ({
                key: option.value,
                label: option.label,
                count: filteredItems.filter((item: any) => normalizeItemType(item.type) === option.value).length,
            }));
    }, [filteredItems]);

    const filterSchema = useMemo(() => {
        if (!definition) return [];
        return definition.filterSchema.map((schema) => {
            if (schema.key === 'type') {
                return {
                    ...schema,
                    options: ITEM_TYPE_OPTIONS.filter((option) => option.value !== 'all').map((option) => ({
                        value: option.rawValues[0],
                        label: option.label,
                    })),
                };
            }
            if (BOOLEAN_COLUMN_KEYS.has(schema.key)) {
                return {
                    ...schema,
                    options: [
                        { value: '1', label: getBooleanBadgeLabel(schema.key, 1) },
                        { value: '0', label: getBooleanBadgeLabel(schema.key, 0) },
                    ],
                };
            }
            return schema;
        });
    }, [definition]);

    const refreshItems = async () => {
        await apply({ page: 1 });
    };

    // --- 4. Effects ---
    React.useEffect(() => {
        if (queryCreateHandled) return;
        if (searchParams.get('new') !== '1') return;

        setSelectedItem({ type: getCreateType(itemTypeFilter, defaultType), is_active: 1 });
        setIsEditing(true);
        setQueryCreateHandled(true);
    }, [defaultType, itemTypeFilter, queryCreateHandled, searchParams]);

    React.useEffect(() => {
        if (initialCreateHandled) return;
        if (!startInCreateMode) return;

        setSelectedItem({ type: getCreateType(itemTypeFilter, defaultType), is_active: 1 });
        setIsEditing(true);
        setInitialCreateHandled(true);
    }, [defaultType, initialCreateHandled, itemTypeFilter, startInCreateMode]);

    React.useEffect(() => {
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const insideMenu = target.closest('[data-column-filter-menu="1"]');
            const insideTrigger = target.closest('[data-column-filter-trigger="1"]');
            const insideGridMenu = target.closest('[data-grid-context-menu="1"]');
            const insideColumnChooser = Boolean(
                columnChooserBtnRef.current?.contains(target)
                || columnChooserMenuRef.current?.contains(target),
            );
            if (!insideMenu && !insideTrigger) {
                setActiveColumnMenu(null);
            }
            if (!insideGridMenu) {
                setGridContextMenu(null);
            }
            if (!insideColumnChooser) {
                setColumnChooserOpen(false);
                setColumnChooserLayout(null);
            }
        };

        const onEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setActiveColumnMenu(null);
            setGridContextMenu(null);
            setColumnChooserOpen(false);
            setColumnChooserLayout(null);
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onEscape);
        };
    }, []);

    React.useEffect(() => {
        if (!activeColumnMenu) return;

        const closeMenu = () => setActiveColumnMenu(null);

        window.addEventListener('resize', closeMenu);
        window.addEventListener('scroll', closeMenu, true);

        return () => {
            window.removeEventListener('resize', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
        };
    }, [activeColumnMenu]);

    React.useEffect(() => {
        if (!columnResizeState) return;

        const onMouseMove = (event: MouseEvent) => {
            const delta = columnResizeState.startX - event.clientX;
            const nextWidth = Math.max(90, Math.min(700, Math.floor(columnResizeState.startWidth + delta)));
            setColumnsWidth([columnResizeState.columnKey], nextWidth);
        };

        const onMouseUp = () => {
            setColumnResizeState(null);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [columnResizeState]);

    React.useEffect(() => {
        setSelectedRowIds((previous) => previous.filter((id) => filteredItems.some((item: any) => String(item.id) === id)));
    }, [filteredItems]);

    React.useEffect(() => {
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            setZoom((prev) => {
                const delta = e.deltaY > 0 ? -0.05 : 0.05;
                return Math.min(2, Math.max(0.5, Math.round((prev + delta) * 100) / 100));
            });
        };
        window.addEventListener('wheel', onWheel, { passive: false });
        return () => window.removeEventListener('wheel', onWheel);
    }, []);

    React.useEffect(() => {
        if (!activeCell) return;
        if (activeCell.rowIndex >= filteredItems.length) {
            setActiveCell(null);
            return;
        }
        if (!visibleColumnKeys.includes(activeCell.columnKey)) {
            setActiveCell(null);
        }
    }, [activeCell, filteredItems.length, visibleColumnKeys]);

    // --- 5. Handlers & Actions ---
    const getDefaultOperator = (columnKey: string): ColumnFilterOperator => {
        if (NUMERIC_COLUMN_KEYS.has(columnKey)) return 'equals';
        return 'contains';
    };

    const getColumnOperators = (columnKey: string): Array<{ value: ColumnFilterOperator; label: string }> => {
        if (NUMERIC_COLUMN_KEYS.has(columnKey)) {
            return [
                { value: 'equals', label: 'يساوي' },
                { value: 'gt', label: 'أكبر من' },
                { value: 'gte', label: 'أكبر أو يساوي' },
                { value: 'lt', label: 'أصغر من' },
                { value: 'lte', label: 'أصغر أو يساوي' },
                { value: 'isEmpty', label: 'فارغ' },
                { value: 'notEmpty', label: 'غير فارغ' },
            ];
        }

        return [
            { value: 'contains', label: 'يحتوي' },
            { value: 'equals', label: 'يساوي' },
            { value: 'startsWith', label: 'يبدأ بـ' },
            { value: 'endsWith', label: 'ينتهي بـ' },
            { value: 'isEmpty', label: 'فارغ' },
            { value: 'notEmpty', label: 'غير فارغ' },
        ];
    };

    const getColumnOptions = (columnKey: string): Array<{ value: string; label: string }> => {
        if (columnKey === 'type') {
            return [
                { value: 'Goods', label: 'بضاعة وخدمات' },
                { value: 'Service', label: 'خدمي' },
                { value: 'Raw Material', label: 'مواد أولية' },
                { value: 'Finished Good', label: 'صنف ثابت' },
                { value: 'Asset', label: 'أصل' },
            ];
        }

        if (columnKey === 'is_active') {
            return [
                { value: '1', label: 'نشط' },
                { value: '0', label: 'غير نشط' },
            ];
        }

        return [];
    };

    const setColumnFilter = (columnKey: string, patch: Partial<ColumnFilterState>) => {
        setColumnFilters((previous) => {
            const current = previous[columnKey] || {
                operator: getDefaultOperator(columnKey),
                value: '',
            };
            const next = { ...current, ...patch };

            const shouldClear =
                next.operator !== 'isEmpty' &&
                next.operator !== 'notEmpty' &&
                String(next.value || '').trim().length === 0;

            if (shouldClear) {
                const { [columnKey]: _removed, ...rest } = previous;
                return rest;
            }

            return {
                ...previous,
                [columnKey]: next,
            };
        });
    };

    const clearColumnFilter = (columnKey: string) => {
        setColumnFilters((previous) => {
            const { [columnKey]: _removed, ...rest } = previous;
            return rest;
        });
    };

    const getColumnWidth = (columnKey: string): number | undefined => {
        const fromState = columns.find((item) => item.key === columnKey)?.width;
        if (Number.isFinite(Number(fromState)) && Number(fromState) > 0) return Number(fromState);
        const fromSchema = definition.columnSchema.find((item) => item.key === columnKey)?.width;
        if (Number.isFinite(Number(fromSchema)) && Number(fromSchema) > 0) return Number(fromSchema);
        return undefined;
    };

    const estimateAutoWidth = (columnKey: string): number => {
        const fallbackLabel = COLUMN_LABELS[columnKey] || columnKey;
        const headerLabel = tr(`columns.${columnKey}`, fallbackLabel);

        const sample = items.slice(0, 120).map((item: any) => String(item?.[columnKey] ?? ''));
        const longest = sample.reduce((max, value) => Math.max(max, value.length), headerLabel.length);
        const estimated = longest * 9 + 56;
        return Math.max(120, Math.min(520, estimated));
    };

    const setColumnsWidth = (keys: string[], width: number) => {
        const nextWidth = Math.max(90, Math.min(700, Math.floor(width)));
        setColumns((previous) => previous.map((column) => (
            keys.includes(column.key)
                ? { ...column, width: nextWidth }
                : column
        )));
    };

    const adjustColumnsWidth = (keys: string[], delta: number) => {
        setColumns((previous) => previous.map((column) => {
            if (!keys.includes(column.key)) return column;
            const currentWidth = Number(column.width || getColumnWidth(column.key) || 160);
            const nextWidth = Math.max(90, Math.min(700, currentWidth + delta));
            return { ...column, width: nextWidth };
        }));
    };

    const autoFitColumnsWidth = (keys: string[]) => {
        setColumns((previous) => previous.map((column) => {
            if (!keys.includes(column.key)) return column;
            return { ...column, width: estimateAutoWidth(column.key) };
        }));
    };

    const getTargetColumnKeys = (columnKey: string): string[] => {
        if (selectedColumnKeys.includes(columnKey) && selectedColumnKeys.length > 1) {
            return selectedColumnKeys;
        }
        return [columnKey];
    };

    const toggleColumnSelection = (columnKey: string, multiSelect: boolean) => {
        setSelectedColumnKeys((previous) => {
            if (!multiSelect) return [columnKey];
            if (previous.includes(columnKey)) {
                return previous.filter((key) => key !== columnKey);
            }
            return [...previous, columnKey];
        });
    };

    const applyFilterToColumns = (keys: string[], operator: ColumnFilterOperator, value: string) => {
        setColumnFilters((previous) => {
            const next = { ...previous };
            keys.forEach((columnKey) => {
                const shouldClear =
                    operator !== 'isEmpty' &&
                    operator !== 'notEmpty' &&
                    String(value || '').trim().length === 0;

                if (shouldClear) {
                    delete next[columnKey];
                } else {
                    next[columnKey] = { operator, value };
                }
            });
            return next;
        });
    };

    const hideColumns = (keys: string[]) => {
        setColumns((previous) => {
            const currentlyVisible = previous.filter((column) => column.visible);
            if (currentlyVisible.length <= 1) return previous;

            const remainingVisible = currentlyVisible.filter((column) => !keys.includes(column.key));
            if (remainingVisible.length === 0) return previous;

            return previous.map((column) => (
                keys.includes(column.key)
                    ? { ...column, visible: false }
                    : column
            ));
        });
        setSelectedColumnKeys((previous) => previous.filter((key) => !keys.includes(key)));
    };

    const showAllColumns = () => {
        setColumns((previous) => previous.map((column) => ({ ...column, visible: true })));
    };

    const restoreDefaultColumns = () => {
        setColumns((previous) => previous.map((column, index) => ({
            ...column,
            order: index,
            visible: column.key === 'id' ? false : defaultVisibleColumnKeys.includes(column.key),
        })));
    };

    const toggleColumnVisibility = (columnKey: string) => {
        let becameVisible = false;
        setColumns((previous) => {
            const currentlyVisible = previous.filter((column) => column.visible && column.key !== 'id');
            return previous.map((column) => {
                if (column.key !== columnKey) return column;
                if (column.visible && currentlyVisible.length <= 1) return column;
                if (!column.visible) {
                    becameVisible = true;
                }
                return { ...column, visible: !column.visible };
            });
        });

        if (becameVisible) {
            requestAnimationFrame(() => {
                const grid = gridContainerRef.current;
                if (!grid) return;
                const header = grid.querySelector(`th[data-column-key="${columnKey}"]`) as HTMLElement | null;
                header?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            });
        }
    };

    const clearAllClientFilters = () => {
        setColumnFilters({});
        setQuickSearch('');
        setQuickSearchField('all');
        setQuickSearchOperator('contains');
        setItemTypeFilter('all');
    };

    const toggleRowSelection = (id: string, multiSelect = false) => {
        setSelectedRowIds((previous) => {
            if (!multiSelect) {
                return previous.includes(id) && previous.length === 1 ? [] : [id];
            }
            if (previous.includes(id)) {
                return previous.filter((currentId) => currentId !== id);
            }
            return [...previous, id];
        });
    };

    const toggleSelectAllFilteredRows = () => {
        if (allFilteredRowsSelected) {
            setSelectedRowIds([]);
            return;
        }
        setSelectedRowIds(filteredItems.map((item: any) => String(item.id)));
    };

    const applyQuickFilter = () => {
        if (!quickFilterColumnKey) return;
        setColumnFilter(quickFilterColumnKey, {
            operator: quickFilterOperator,
            value: quickFilterOperator === 'isEmpty' || quickFilterOperator === 'notEmpty' ? '' : quickFilterValue,
        });
        if (quickFilterOperator !== 'isEmpty' && quickFilterOperator !== 'notEmpty') {
            setQuickFilterValue('');
        }
    };

    const openGridContextMenu = (
        event: React.MouseEvent,
        columnKey: string,
        source: 'header' | 'cell',
        cellValue?: string,
        rowId?: string,
    ) => {
        event.preventDefault();
        const hasMultipleSelection = selectedColumnKeys.length > 1 && selectedColumnKeys.includes(columnKey);
        if (!hasMultipleSelection) {
            setSelectedColumnKeys([columnKey]);
        }
        setActiveColumnMenu(null);
        setColumnWidthInput(String(getColumnWidth(columnKey) || 180));
        setGridContextMenu({
            x: event.clientX,
            y: event.clientY,
            columnKey,
            rowId,
            cellValue,
            source,
        });
    };

    const openColumnFilterMenu = (columnKey: string, triggerElement?: HTMLElement | null) => {
        const trigger = triggerElement || document.querySelector<HTMLElement>(`[data-column-filter-trigger-key="${columnKey}"]`);
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const position = getFloatingMenuPositionFromRect(rect, {
            menuWidth: 304,
            menuHeight: 420,
            preferredAlign: 'right',
            offset: 10,
            margin: 14,
            minHeight: 220,
        });

        setActiveColumnMenu({ key: columnKey, position });
    };

    const getCellTextValue = (item: any, columnKey: string): string => {
        if (!item) return '';
        if (columnKey === 'type') return getItemTypeLabel(item[columnKey]);
        if (BOOLEAN_COLUMN_KEYS.has(columnKey)) return getBooleanBadgeLabel(columnKey, item[columnKey]);
        if (NUMERIC_COLUMN_KEYS.has(columnKey)) {
            const numericValue = Number(item[columnKey] ?? 0);
            return MONEY_COLUMN_KEYS.has(columnKey)
                ? numericValue.toFixed(2)
                : numericValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        }
        if (columnKey === 'is_active') return Number(item[columnKey] ?? 1) === 1 ? 'نشط' : 'غير نشط';
        return String(item[columnKey] ?? '');
    };

    const copySelectedCell = async () => {
        if (!activeCell) return;
        const row = filteredItems[activeCell.rowIndex];
        if (!row) return;
        const text = getCellTextValue(row, activeCell.columnKey);
        await navigator.clipboard.writeText(text);
    };

    const copySelectedRowsAsTsv = async () => {
        if (selectedRows.length === 0) return;
        const header = visibleColumns.map((column) => getColumnLabel(column.key)).join('\t');
        const body = selectedRows
            .map((row: any) => visibleColumns.map((column) => getCellTextValue(row, column.key)).join('\t'))
            .join('\n');
        await navigator.clipboard.writeText(`${header}\n${body}`);
    };

    const exportVisible = (format: ExportFormat) => {
        const headers = visibleColumns.map((column) => getColumnLabel(column.key));
        const records = filteredItems.map((row: any) => {
            const obj: Record<string, string> = {};
            visibleColumns.forEach((column) => {
                obj[getColumnLabel(column.key)] = getCellTextValue(row, column.key);
            });
            return obj;
        });

        const downloadBlob = (blob: Blob, fileName: string) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
        };

        if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(records);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Items');
            XLSX.writeFile(wb, 'items-export.xlsx');
            return;
        }

        if (format === 'html' || format === 'pdf') {
            const escapeHtml = (value: string) => String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            const tableHeader = headers.map((h) => `<th style="border:1px solid #dbeafe;padding:8px;background:#f8fafc">${escapeHtml(h)}</th>`).join('');
            const tableBody = filteredItems.map((row: any) => {
                const cells = visibleColumns
                    .map((column) => `<td style="border:1px solid #dbeafe;padding:8px">${escapeHtml(getCellTextValue(row, column.key))}</td>`)
                    .join('');
                return `<tr>${cells}</tr>`;
            }).join('');

            const htmlDoc = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>Items Export</title></head><body style="font-family:Segoe UI,Tahoma,Arial,sans-serif;padding:16px"><h3 style="margin:0 0 12px">تصدير الأصناف</h3><table style="border-collapse:collapse;width:100%;font-size:12px"><thead><tr>${tableHeader}</tr></thead><tbody>${tableBody}</tbody></table></body></html>`;

            if (format === 'html') {
                downloadBlob(new Blob([htmlDoc], { type: 'text/html;charset=utf-8' }), 'items-export.html');
                return;
            }

            const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');
            if (!printWindow) return;
            printWindow.document.write(htmlDoc);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            return;
        }

        if (format === 'json') {
            downloadBlob(new Blob([JSON.stringify(records, null, 2)], { type: 'application/json;charset=utf-8' }), 'items-export.json');
            return;
        }

        const rows = filteredItems.map((row: any) => visibleColumns.map((column) => getCellTextValue(row, column.key).replace(/\t/g, ' ')).join('\t'));
        const content = ['\uFEFF' + headers.join('\t'), ...rows].join('\r\n');
        downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), 'items-export.txt');
    };

    const exportVisibleToCsv = () => {
        exportVisible('delimited');
    };

    const getContextMenuRow = () => {
        if (!gridContextMenu?.rowId) return null;
        return filteredItems.find((row: any) => String(row.id) === String(gridContextMenu.rowId)) || null;
    };

    const openEditFromContextMenu = async () => {
        const row = getContextMenuRow();
        if (!row) return;
        navigate(`/reports/inventory/movement?itemId=${encodeURIComponent(String(row.id))}`);
        setGridContextMenu(null);
    };

    const openDuplicateFromContextMenu = async () => {
        const row = getContextMenuRow();
        if (!row) return;
        await handleDuplicate(row);
        setGridContextMenu(null);
    };

    const openDeleteFromContextMenu = async () => {
        const row = getContextMenuRow();
        if (!row) return;
        await handleDelete(String(row.id));
        setGridContextMenu(null);
    };

    const openStockByWarehouseFromContextMenu = async () => {
        const row = getContextMenuRow();
        if (!row) return;
        navigate(`/reports/inventory/quantity-by-warehouse?itemId=${encodeURIComponent(String(row.id))}`);
        setGridContextMenu(null);
    };

    const handleGridKeyboard = async (event: React.KeyboardEvent<HTMLDivElement>) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            if (event.shiftKey) {
                await copySelectedRowsAsTsv();
            } else {
                await copySelectedCell();
            }
            return;
        }

        if (!activeCell || filteredItems.length === 0 || visibleColumns.length === 0) return;

        const currentColumnIndex = visibleColumns.findIndex((column) => column.key === activeCell.columnKey);
        if (currentColumnIndex < 0) return;

        switch (event.key) {
            case 'ArrowDown': {
                event.preventDefault();
                const nextRowIndex = Math.min(filteredItems.length - 1, activeCell.rowIndex + 1);
                setActiveCell({ rowIndex: nextRowIndex, columnKey: activeCell.columnKey });
                break;
            }
            case 'ArrowUp': {
                event.preventDefault();
                const nextRowIndex = Math.max(0, activeCell.rowIndex - 1);
                setActiveCell({ rowIndex: nextRowIndex, columnKey: activeCell.columnKey });
                break;
            }
            case 'Home': {
                event.preventDefault();
                setActiveCell({ rowIndex: 0, columnKey: activeCell.columnKey });
                break;
            }
            case 'End': {
                event.preventDefault();
                setActiveCell({ rowIndex: Math.max(0, filteredItems.length - 1), columnKey: activeCell.columnKey });
                break;
            }
            case 'ArrowRight': {
                event.preventDefault();
                const nextColumnIndex = Math.max(0, currentColumnIndex - 1);
                setActiveCell({ rowIndex: activeCell.rowIndex, columnKey: visibleColumns[nextColumnIndex].key });
                break;
            }
            case 'ArrowLeft': {
                event.preventDefault();
                const nextColumnIndex = Math.min(visibleColumns.length - 1, currentColumnIndex + 1);
                setActiveCell({ rowIndex: activeCell.rowIndex, columnKey: visibleColumns[nextColumnIndex].key });
                break;
            }
            case 'Enter': {
                event.preventDefault();
                if (event.ctrlKey || event.metaKey) {
                    const row = filteredItems[activeCell.rowIndex];
                    if (row) {
                        await handleEdit(row);
                    }
                    return;
                }
                const nextRowIndex = Math.min(filteredItems.length - 1, activeCell.rowIndex + 1);
                setActiveCell({ rowIndex: nextRowIndex, columnKey: activeCell.columnKey });
                break;
            }
            case 'F2': {
                event.preventDefault();
                const row = filteredItems[activeCell.rowIndex];
                if (row) {
                    await handleEdit(row);
                }
                break;
            }
            case 'Tab': {
                event.preventDefault();
                const direction = event.shiftKey ? -1 : 1;
                const nextColumnIndex = Math.min(
                    visibleColumns.length - 1,
                    Math.max(0, currentColumnIndex - direction)
                );
                setActiveCell({ rowIndex: activeCell.rowIndex, columnKey: visibleColumns[nextColumnIndex].key });
                break;
            }
            default:
                break;
        }
    };

    const startColumnResize = (event: React.MouseEvent, columnKey: string) => {
        event.preventDefault();
        event.stopPropagation();

        setColumnResizeState({
            columnKey,
            startX: event.clientX,
            startWidth: Number(getColumnWidth(columnKey) || 160),
        });
    };

    const autoFitColumnByEdgeDoubleClick = (event: React.MouseEvent, columnKey: string) => {
        event.preventDefault();
        event.stopPropagation();
        autoFitColumnsWidth([columnKey]);
    };

    const handleCreate = () => {
        setSelectedItem({ type: getCreateType(itemTypeFilter, defaultType), is_active: 1 });
        setIsEditing(true);
    };

    const handleEdit = async (item: Item) => {
        try {
            const details = await window.electronAPI.inventory.getItemDetails(item.id);
            setSelectedItem(details);
            setIsEditing(true);
        } catch (error: any) {
            console.error('Error fetching item details:', error);
            alert('Error fetching details: ' + (error?.message || 'Unknown error'));
        }
    };

    const handleDuplicate = async (item: Item) => {
        try {
            const details = await window.electronAPI.inventory.getItemDetails(item.id);
            if (details) {
                const copy: Partial<Item> = {
                    ...details,
                    id: undefined,
                    code: `${details.code}-copy`,
                    name_ar: `${details.name_ar} (نسخة)`,
                    name_en: details.name_en ? `${details.name_en} (copy)` : '',
                };
                setSelectedItem(copy);
                setIsEditing(true);
            }
        } catch (error) {
            console.error(error);
            alert('Error duplicating item');
        }
    };

    const handleSave = async (itemData: Partial<Item>) => {
        try {
            if (selectedItem && selectedItem.id) {
                await window.electronAPI.inventory.saveItem({ ...itemData, id: selectedItem.id });
                console.log('[ItemMaster] Item updated successfully:', itemData.code);
            } else {
                await window.electronAPI.inventory.createItem(itemData);
                console.log('[ItemMaster] Item created successfully:', itemData.code);
            }
            setIsEditing(false);
            await refreshItems();
        } catch (error: any) {
            console.error('[ItemMaster] Save error:', error);
            alert('خطأ في حفظ الصنف:\n' + (error?.message || String(error)));
            // Don't close the form on error - keep it open for correction
        }
    };

    const handlePick = (item: Item) => {
        if (!pickerMode) return;
        onPickItem?.(item);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
        const result: any = await window.electronAPI.inventory.deleteItem(id);
        if (result && result.success === false) {
            alert(result.error || 'فشل الحذف');
            return;
        }
        setSelectedRowIds((previous) => previous.filter((currentId) => currentId !== id));
        await refreshItems();
    };

    const handleDeleteSelected = async () => {
        if (selectedRows.length === 0) return;
        if (!window.confirm(`هل أنت متأكد من حذف ${selectedRows.length} صنف/أصناف؟`)) return;
        const errors: string[] = [];
        for (const item of selectedRows) {
            const result: any = await window.electronAPI.inventory.deleteItem(item.id);
            if (result && result.success === false) {
                errors.push(`${item.name_ar || item.code}: ${result.error}`);
            }
        }
        setSelectedRowIds([]);
        await refreshItems();
        if (errors.length > 0) {
            alert(`تعذّر حذف ${errors.length} صنف بسبب وجود حركات:\n${errors.join('\n')}`);
        }
    };

    const handleEditSelected = async () => {
        if (selectedRows.length !== 1) return;
        await handleEdit(selectedRows[0]);
    };

    const handleDuplicateSelected = async () => {
        if (selectedRows.length !== 1) return;
        await handleDuplicate(selectedRows[0]);
    };

    useBesanHotkeys({
        disabled: isEditing,
        onNew: handleCreate,
        onFocusGrid: () => gridContainerRef.current?.focus(),
        onClose: () => {
            setActiveColumnMenu(null);
            setGridContextMenu(null);
            setColumnChooserOpen(false);
            setColumnChooserLayout(null);
        },
    });

    // --- 6. Render ---
    if (isEditing) {
        return (
            <div className="p-4 pb-10">
                <ItemForm
                    item={selectedItem || undefined}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                    onDelete={async (id) => {
                        setSelectedRowIds((prev) => prev.filter((rid) => rid !== id));
                        await refreshItems();
                        setIsEditing(false);
                    }}
                />
            </div>
        );
    }

    if (!definition) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-6" dir="rtl">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 shadow-sm">
                    {tr('error.views.screen_not_registered', 'Screen definition is not registered.')}
                </div>
            </div>
        );
    }

    return (
        <div className="relative z-10 flex min-h-full flex-col p-6 pb-12" dir="rtl" style={{ zoom }}>
            <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_12%_8%,rgba(14,165,233,0.13),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.10),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#ffffff_58%)]" />

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="mb-4 shrink-0 rounded-[24px] border border-sky-100 bg-gradient-to-l from-white via-sky-50/70 to-cyan-50/80 p-4 shadow-sm"
            >
                <ItemMasterToolbar
                    selectedRowsCount={selectedRows.length}
                    activeViewId={activeViewId || null}
                    views={views}
                    onCreate={handleCreate}
                    onEditSelected={() => void handleEditSelected()}
                    onDuplicateSelected={() => void handleDuplicateSelected()}
                    onDeleteSelected={() => void handleDeleteSelected()}
                    onExport={exportVisible}
                    onOpenFilters={() => setDrawerOpen(true)}
                    onSelectView={(viewId) => {
                        applySavedView(viewId);
                        void apply({ page: 1 });
                    }}
                    onResetView={() => {
                        resetState();
                        void apply({ page: 1 });
                    }}
                    onSetDefaultView={async (viewId) => {
                        if (viewId) {
                            void setDefaultView(viewId);
                        } else {
                            const saved = await saveCurrentView({ name: 'الافتراضي', scope: 'user', isDefault: true });
                            if (saved) await apply({ page: 1 });
                        }
                    }}
                    onOpenMovementReport={() => {
                        if (selectedRows.length !== 1) return;
                        navigate(`/reports/inventory/movement?itemId=${encodeURIComponent(String(selectedRows[0].id))}`);
                    }}
                    onOpenWarehouseReport={() => {
                        if (selectedRows.length !== 1) return;
                        navigate(`/reports/inventory/quantity-by-warehouse?itemId=${encodeURIComponent(String(selectedRows[0].id))}`);
                    }}
                    onPrintBarcode={() => {
                        if (selectedRows.length !== 1) return;
                        navigate(`/items/labels?itemId=${encodeURIComponent(String(selectedRows[0].id))}`);
                    }}
                    onPrint={() => {
                        try {
                            // Prefer Chromium print preview dialog in renderer.
                            window.print();
                        } catch (_err) {
                            window.electronAPI.print.preview().catch((error) => {
                                console.error('Print failed:', error);
                                alert('فشل الطباعة: ' + error.message);
                            });
                        }
                    }}
                    pinFirstColumn={pinFirstColumn}
                    rowDensity={rowDensity}
                    zoom={zoom}
                    onTogglePinFirstColumn={() => setPinFirstColumn((prev) => !prev)}
                    onSetRowDensity={(density) => setRowDensity(density)}
                    onSetZoom={(nextZoom) => setZoom(Math.min(2, Math.max(0.5, nextZoom)))}
                    onResetZoom={() => setZoom(1)}
                />

                <div className="mb-2 text-[11px] text-slate-500">
                    اختصارات: <span className="font-semibold">Ctrl+C</span> نسخ الخلية المحددة، <span className="font-semibold">Ctrl+Shift+C</span> نسخ الصفوف المحددة، الأسهم أو <span className="font-semibold">Tab</span> للتنقل، <span className="font-semibold">Enter</span> للنزول سطر، <span className="font-semibold">Ctrl+Enter</span>/<span className="font-semibold">F2</span> لتعديل الصف.
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowLowStockOnly((prev) => !prev)}
                        className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${showLowStockOnly ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-700'}`}
                    >
                        <Filter size={14} />
                        <span>{showLowStockOnly ? 'إظهار كل الأصناف' : 'عرض المنخفض فقط'}</span>
                    </button>

                </div>

            <div className="mb-4 grid gap-3 md:grid-cols-4">
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">الإجمالي</div>
                    <div className="mt-1 text-2xl font-black text-slate-800">{listStats.total}</div>
                    <div className="text-xs text-slate-500">عدد السجلات بعد الفلترة</div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-500">Low Stock</div>
                    <div className="mt-1 text-2xl font-black text-amber-600">{listStats.lowStock}</div>
                    <div className="text-xs text-slate-500">أصناف عند حد إعادة الطلب</div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">Inactive</div>
                    <div className="mt-1 text-2xl font-black text-rose-600">{listStats.inactive}</div>
                    <div className="text-xs text-slate-500">سجلات غير فعالة</div>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500">Value</div>
                    <div className="mt-1 text-2xl font-black text-emerald-600">{listStats.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-slate-500">قيمة المخزون التقديرية</div>
                </motion.div>
            </div>

                <div className="mb-3 flex flex-wrap gap-2">
                    {typeStats.map((type) => (
                        <button
                            key={type.key}
                            type="button"
                            onClick={() => setItemTypeFilter(type.key)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${normalizeItemType(itemTypeFilter) === type.key ? 'border-sky-300 bg-sky-100 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700'}`}
                        >
                            {type.label} • {type.count}
                        </button>
                    ))}
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-3">
                    <select
                        value={itemTypeFilter}
                        onChange={(event) => setItemTypeFilter(event.target.value as typeof itemTypeFilter)}
                        className="h-11 min-w-[190px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        {ITEM_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <div className="relative min-w-[260px] flex-1">
                        <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={quickSearch}
                            onChange={(event) => setQuickSearch(event.target.value)}
                            placeholder="بحث سريع"
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                    </div>

                    <select
                        value={quickSearchField}
                        onChange={(event) => setQuickSearchField(event.target.value)}
                        className="h-11 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        <option value="all">بحث في كل الحقول</option>
                        {availableColumns.map((column) => (
                            <option key={column.key} value={column.key}>{getColumnLabel(column.key)}</option>
                        ))}
                    </select>

                    <select
                        value={quickSearchOperator}
                        onChange={(event) => setQuickSearchOperator(event.target.value as QuickSearchOperator)}
                        className="h-11 min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        <option value="contains">يحتوي</option>
                        <option value="startsWith">يبدأ بـ</option>
                        <option value="equals">يساوي</option>
                        <option value="notContains">لا يحتوي</option>
                    </select>

                    <div data-column-chooser="1">
                        <button
                            ref={columnChooserBtnRef}
                            type="button"
                            onClick={() => {
                                if (columnChooserOpen) {
                                    setColumnChooserOpen(false);
                                    setColumnChooserLayout(null);
                                } else {
                                    const rect = columnChooserBtnRef.current?.getBoundingClientRect();
                                    if (rect) {
                                        setColumnChooserLayout(getFloatingMenuPositionFromRect(rect, { menuWidth: 320, menuHeight: 480, minHeight: 200, offset: 6 }));
                                    }
                                    setColumnChooserOpen(true);
                                }
                            }}
                            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                        >
                            <Columns3 size={16} />
                            <span>الأعمدة</span>
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{visibleColumns.length}/{availableColumns.length}</span>
                        </button>

                        {columnChooserOpen && columnChooserLayout && createPortal(
                            <div
                                ref={columnChooserMenuRef}
                                data-column-chooser="1"
                                className="fixed z-[200] w-[320px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-slate-900/5"
                                style={{ top: columnChooserLayout.top, left: columnChooserLayout.left, maxHeight: columnChooserLayout.maxHeight, transformOrigin: columnChooserLayout.transformOrigin }}
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">إدارة الأعمدة</div>
                                        <div className="text-[11px] text-slate-500">اعرض الأعمدة الافتراضية أو فعّل أي عمود إضافي.</div>
                                    </div>
                                </div>
                                <div className="mb-3 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
                                    <button type="button" onClick={restoreDefaultColumns} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">الافتراضي</button>
                                    <button type="button" onClick={showAllColumns} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">إظهار الكل</button>
                                    <button type="button" onClick={() => hideColumns(visibleColumnKeys.slice(1))} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">عمود واحد فقط</button>
                                </div>
                                <div className="custom-scrollbar space-y-0.5 overflow-y-auto pr-1" style={{ maxHeight: Math.max(100, columnChooserLayout.maxHeight - 120) }}>
                                    {availableColumns.map((column) => {
                                        const state = columns.find((item) => item.key === column.key);
                                        const checked = Boolean(state?.visible);
                                        return (
                                            <label key={column.key} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-slate-50">
                                                <div>
                                                    <div className={`text-sm font-medium ${checked ? 'text-slate-900' : 'text-slate-600'}`}>{getColumnLabel(column.key)}</div>
                                                    <div className={`text-[10px] ${checked ? 'text-sky-600 font-medium' : 'text-slate-400'}`}>{checked ? 'ظاهر الآن' : 'عمود إضافي'}</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleColumnVisibility(column.key)}
                                                    className="h-4 w-4 rounded border-slate-300 text-sky-500 transition focus:ring-2 focus:ring-sky-500/20"
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => void refreshItems()}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                    >
                        <RotateCcw size={16} />
                        <span>تحديث</span>
                    </button>


                </div>

                <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
                    <select
                        value={quickFilterColumnKey}
                        onChange={(event) => {
                            const nextKey = event.target.value;
                            setQuickFilterColumnKey(nextKey);
                            setQuickFilterOperator(getDefaultOperator(nextKey));
                            setQuickFilterValue('');
                        }}
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        {availableColumns.map((column) => (
                            <option key={column.key} value={column.key}>{getColumnLabel(column.key)}</option>
                        ))}
                    </select>

                    <select
                        value={quickFilterOperator}
                        onChange={(event) => setQuickFilterOperator(event.target.value as ColumnFilterOperator)}
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        {getColumnOperators(quickFilterColumnKey).map((operator) => (
                            <option key={operator.value} value={operator.value}>{operator.label}</option>
                        ))}
                    </select>

                    {getManagedColumnOptions(quickFilterColumnKey).length > 0 && quickFilterOperator !== 'isEmpty' && quickFilterOperator !== 'notEmpty' ? (
                        <select
                            value={quickFilterValue}
                            onChange={(event) => setQuickFilterValue(event.target.value)}
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        >
                            <option value="">اختر قيمة</option>
                            {getManagedColumnOptions(quickFilterColumnKey).map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type={NUMERIC_COLUMN_KEYS.has(quickFilterColumnKey) ? 'number' : 'text'}
                            value={quickFilterValue}
                            onChange={(event) => setQuickFilterValue(event.target.value)}
                            disabled={quickFilterOperator === 'isEmpty' || quickFilterOperator === 'notEmpty'}
                            placeholder={quickFilterOperator === 'isEmpty' || quickFilterOperator === 'notEmpty' ? 'لا يحتاج قيمة' : 'أدخل قيمة الفلتر'}
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                    )}

                    <button
                        type="button"
                        onClick={applyQuickFilter}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 text-sm font-bold text-white shadow-lg shadow-sky-900/15 transition hover:brightness-105"
                    >
                        <Filter size={16} />
                        <span>تطبيق</span>
                    </button>
                </div>

                {(activeClientFilters.length > 0 || quickSearch.trim().length > 0 || itemTypeFilter !== 'all') && (
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
                        {itemTypeFilter !== 'all' && (
                            <button
                                type="button"
                                onClick={() => setItemTypeFilter('all')}
                                className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                            >
                                التصنيف: {getItemTypeLabel(itemTypeFilter)} ×
                            </button>
                        )}
                        {activeClientFilters.map(([columnKey, filter]) => (
                            <button
                                key={columnKey}
                                type="button"
                                onClick={() => clearColumnFilter(columnKey)}
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                                {getColumnLabel(columnKey)}: {getColumnOperators(columnKey).find((item) => item.value === filter.operator)?.label || filter.operator}
                                {filter.operator !== 'isEmpty' && filter.operator !== 'notEmpty' ? ` • ${String(filter.value || '')}` : ''} ×
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                <div className="no-print border-b border-slate-200 bg-gradient-to-l from-sky-50 to-blue-50 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900">قائمة الأصناف</h2>
                    <p className="text-sm text-slate-600">إجمالي الأصناف: <span className="font-semibold">{filteredItems.length}</span></p>
                </div>
                <div ref={gridContainerRef} className="overflow-x-auto overflow-y-visible" tabIndex={0} onKeyDown={(event) => { void handleGridKeyboard(event); }}>
                    <table id="printable-table" className="w-full border-separate border-spacing-0 text-right text-[13px] text-slate-700">
                        <thead className="sticky top-0 z-20 bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider font-bold shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                            <tr>
                                <th className="w-14 border-b border-l border-slate-200 bg-slate-50 p-2 text-center first:border-r">
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllFilteredRows}
                                        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100"
                                        title="تحديد الكل"
                                    >
                                        {allFilteredRowsSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                    </button>
                                </th>
                                {visibleColumns.map((column, visibleIndex) => (
                                    <th
                                        key={column.key}
                                        data-column-key={column.key}
                                        className={`relative min-w-[150px] border-b border-l border-slate-200 bg-slate-50 p-3 align-middle ${selectedColumnKeys.includes(column.key) ? 'bg-sky-50' : ''} ${pinFirstColumn && visibleIndex === 0 ? 'sticky right-14 z-30 shadow-[-1px_0_0_0_#e2e8f0]' : ''}`}
                                        style={{ width: getColumnWidth(column.key) }}
                                        onClick={(event) => toggleColumnSelection(column.key, event.ctrlKey || event.metaKey)}
                                        onContextMenu={(event) => openGridContextMenu(event, column.key, 'header')}
                                    >
                                        <span
                                            onMouseDown={(event) => startColumnResize(event, column.key)}
                                            onDoubleClick={(event) => autoFitColumnByEdgeDoubleClick(event, column.key)}
                                            className="absolute left-0 top-0 z-30 h-full w-1.5 cursor-col-resize border-l border-transparent transition hover:border-sky-400 hover:bg-sky-200/50"
                                            title="اسحب لتغيير العرض أو اضغط مرتين للضبط التلقائي"
                                        />
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <span className="block truncate text-[12px] font-bold text-slate-700">
                                                    {getColumnLabel(column.key)}
                                                </span>
                                                {isColumnFilterActive(column.key) && (
                                                    <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                                                        {getColumnOperators(column.key).find((item) => item.value === columnFilters[column.key]?.operator)?.label || 'فلتر'}
                                                        {!isValueLessOperator(columnFilters[column.key]?.operator) && columnFilters[column.key]?.value
                                                            ? ` • ${String(columnFilters[column.key]?.value || '')}`
                                                            : ''}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                data-column-filter-trigger="1"
                                                data-column-filter-trigger-key={column.key}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setGridContextMenu(null);
                                                    if (activeColumnMenu?.key === column.key) {
                                                        setActiveColumnMenu(null);
                                                        return;
                                                    }
                                                    openColumnFilterMenu(column.key, event.currentTarget);
                                                }}
                                                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${isColumnFilterActive(column.key)
                                                    ? 'border-sky-300 bg-sky-100 text-sky-700 shadow-sm shadow-sky-100/80'
                                                    : 'border-slate-200 bg-white/90 text-slate-500 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'}`}
                                                title={`تصفية عمود ${getColumnLabel(column.key)}`}
                                                aria-label={`تصفية عمود ${getColumnLabel(column.key)}`}
                                            >
                                                <Filter size={14} />
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                        {activeColumnMenu?.key === column.key && (
                                            <motion.div
                                                data-column-filter-menu="1"
                                                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.98, y: 4 }}
                                                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                                                className="fixed z-[88] w-[19rem] overflow-hidden rounded-[22px] border border-sky-100/80 bg-white/95 text-right shadow-[0_24px_60px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/5 backdrop-blur-xl"
                                                style={{
                                                    top: activeColumnMenu.position.top,
                                                    left: activeColumnMenu.position.left,
                                                    maxHeight: activeColumnMenu.position.maxHeight,
                                                    transformOrigin: activeColumnMenu.position.transformOrigin,
                                                }}
                                            >
                                                <div className="border-b border-slate-100 bg-gradient-to-l from-sky-50/90 via-white to-cyan-50/80 px-4 py-3.5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-extrabold text-slate-800">
                                                                {tr(column.labelI18nKey, COLUMN_LABELS[column.key] || column.key)}
                                                            </div>
                                                            <div className="mt-1 text-[11px] text-slate-500">
                                                                فلترة سريعة مباشرة على هذا العمود بنفس نمط بقية القوائم.
                                                            </div>
                                                        </div>
                                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isColumnFilterActive(column.key) ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            {isColumnFilterActive(column.key) ? 'مفلتر' : 'بدون فلتر'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 p-4">
                                                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                                                        <label className="mb-1.5 block text-[11px] font-bold text-slate-500">طريقة التصفية</label>
                                                        <select
                                                            value={columnFilters[column.key]?.operator || getDefaultOperator(column.key)}
                                                            onChange={(event) => {
                                                                const operator = event.target.value as ColumnFilterOperator;
                                                                const keepValue =
                                                                    isValueLessOperator(operator)
                                                                        ? ''
                                                                        : columnFilters[column.key]?.value || '';
                                                                setColumnFilter(column.key, { operator, value: keepValue });
                                                            }}
                                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                        >
                                                            {getColumnOperators(column.key).map((operator) => (
                                                                <option key={operator.value} value={operator.value}>
                                                                    {operator.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {!isValueLessOperator(columnFilters[column.key]?.operator || getDefaultOperator(column.key)) &&
                                                        getManagedColumnOptions(column.key).length > 0 && (
                                                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                                                                <label className="mb-1.5 block text-[11px] font-bold text-slate-500">القيمة</label>
                                                                <select
                                                                    value={columnFilters[column.key]?.value || ''}
                                                                    onChange={(event) => {
                                                                        setColumnFilter(column.key, { value: event.target.value });
                                                                    }}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                                >
                                                                    <option value="">الكل</option>
                                                                    {getManagedColumnOptions(column.key).map((option) => (
                                                                        <option key={option.value} value={option.value}>
                                                                            {option.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}

                                                    {!isValueLessOperator(columnFilters[column.key]?.operator || getDefaultOperator(column.key)) &&
                                                        getManagedColumnOptions(column.key).length === 0 && (
                                                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                                                                <label className="mb-1.5 block text-[11px] font-bold text-slate-500">القيمة</label>
                                                                <input
                                                                    type={NUMERIC_COLUMN_KEYS.has(column.key) ? 'number' : 'text'}
                                                                    value={columnFilters[column.key]?.value || ''}
                                                                    onChange={(event) => {
                                                                        setColumnFilter(column.key, { value: event.target.value });
                                                                    }}
                                                                    placeholder="اكتب قيمة التصفية"
                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                                />
                                                            </div>
                                                        )}

                                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => clearColumnFilter(column.key)}
                                                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100"
                                                        >
                                                            مسح الفلتر
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveColumnMenu(null)}
                                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                                                        >
                                                            إغلاق
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item: any, rowIndex: number) => (
                                <tr
                                    key={item.id}
                                    onClick={(event) => toggleRowSelection(String(item.id), event.ctrlKey || event.metaKey)}
                                    onDoubleClick={() => {
                                        if (pickerMode) {
                                            handlePick(item);
                                            return;
                                        }
                                        void handleEdit(item);
                                    }}
                                    className={`transition ${pickerMode ? 'cursor-pointer' : ''} ${selectedRowIds.includes(String(item.id)) ? 'bg-sky-100/90' : 'bg-white hover:-translate-y-[1px] hover:bg-sky-50 hover:shadow-[inset_0_0_0_1px_rgba(125,211,252,0.35)]'}`}
                                >
                                    <td className="border border-[#d7e9fb] bg-white p-2 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedRowIds.includes(String(item.id))}
                                            onChange={(event) => {
                                                event.stopPropagation();
                                                toggleRowSelection(String(item.id), true);
                                            }}
                                            onClick={(event) => event.stopPropagation()}
                                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                                        />
                                    </td>
                                    {visibleColumns.map((column, visibleIndex) => {
                                        const rawValue = item[column.key as keyof typeof item];
                                        const isPinnedCell = pinFirstColumn && visibleIndex === 0;
                                        const pinnedClass = isPinnedCell ? 'sticky right-14 z-10 shadow-[-1px_0_0_0_#d7e9fb]' : '';
                                        const isActiveCell = activeCell?.rowIndex === rowIndex && activeCell?.columnKey === column.key;

                                        if (BOOLEAN_COLUMN_KEYS.has(column.key)) {
                                            const enabled = Number(rawValue ?? 0) === 1;
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={`border border-[#d7e9fb] bg-white px-3 ${rowDensity === 'compact' ? 'py-1.5' : 'py-2'} ${pinnedClass} ${isActiveCell ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                    style={{ width: getColumnWidth(column.key) }}
                                                    onContextMenu={(event) => openGridContextMenu(event, column.key, 'cell', getBooleanBadgeLabel(column.key, rawValue), String(item.id))}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setActiveCell({ rowIndex, columnKey: column.key });
                                                    }}
                                                >
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                                        {getBooleanBadgeLabel(column.key, rawValue)}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        if (column.key === 'type') {
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={`border border-[#d7e9fb] bg-white px-3 ${rowDensity === 'compact' ? 'py-1.5' : 'py-2'} ${pinnedClass} ${isActiveCell ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                    style={{ width: getColumnWidth(column.key) }}
                                                    onContextMenu={(event) => openGridContextMenu(event, column.key, 'cell', getItemTypeLabel(String(rawValue || '')), String(item.id))}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setActiveCell({ rowIndex, columnKey: column.key });
                                                    }}
                                                >
                                                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">
                                                        {getItemTypeLabel(String(rawValue || ''))}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        if (MONEY_COLUMN_KEYS.has(column.key)) {
                                            const amount = Number(rawValue || 0);
                                            const isSalesPrice = column.key === 'sale_price' || column.key === 'wholesale_price';
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={`border border-[#d7e9fb] bg-white px-3 ${rowDensity === 'compact' ? 'py-1.5' : 'py-2'} font-bold ${isSalesPrice ? 'text-emerald-700' : 'text-slate-700'} ${pinnedClass} ${isActiveCell ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                    style={{ width: getColumnWidth(column.key) }}
                                                    onContextMenu={(event) => openGridContextMenu(event, column.key, 'cell', amount.toFixed(2), String(item.id))}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setActiveCell({ rowIndex, columnKey: column.key });
                                                    }}
                                                >
                                                    {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            );
                                        }

                                        if (NUMERIC_COLUMN_KEYS.has(column.key)) {
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={`border border-[#d7e9fb] bg-white px-3 ${rowDensity === 'compact' ? 'py-1.5' : 'py-2'} font-semibold text-slate-700 ${pinnedClass} ${isActiveCell ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                    style={{ width: getColumnWidth(column.key) }}
                                                    onContextMenu={(event) => openGridContextMenu(event, column.key, 'cell', String(Number(rawValue || 0)), String(item.id))}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setActiveCell({ rowIndex, columnKey: column.key });
                                                    }}
                                                >
                                                    {Number(rawValue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </td>
                                            );
                                        }

                                        if (column.key === 'is_active') {
                                            const active = Number(rawValue ?? 1) === 1;
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={`border border-[#d7e9fb] bg-white px-3 ${rowDensity === 'compact' ? 'py-1.5' : 'py-2'} ${pinnedClass} ${isActiveCell ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                    style={{ width: getColumnWidth(column.key) }}
                                                    onContextMenu={(event) => openGridContextMenu(event, column.key, 'cell', active ? 'نشط' : 'غير نشط', String(item.id))}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setActiveCell({ rowIndex, columnKey: column.key });
                                                    }}
                                                >
                                                    <span className={`px-2 py-1 rounded text-xs ${active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {active ? 'نشط' : 'غير نشط'}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        if (NUMERIC_COLUMN_KEYS.has(column.key)) {
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={`border border-[#d7e9fb] bg-white px-3 ${rowDensity === 'compact' ? 'py-1.5' : 'py-2'} font-semibold text-slate-700 ${pinnedClass} ${isActiveCell ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                    style={{ width: getColumnWidth(column.key) }}
                                                    onContextMenu={(event) => openGridContextMenu(event, column.key, 'cell', String(Number(rawValue || 0)), String(item.id))}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setActiveCell({ rowIndex, columnKey: column.key });
                                                    }}
                                                >
                                                    {Number(rawValue || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </td>
                                            );
                                        }

                                        if (column.key === 'sale_price') {
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={`border border-[#d7e9fb] bg-white px-3 ${rowDensity === 'compact' ? 'py-1.5' : 'py-2'} font-bold text-green-600 ${pinnedClass} ${isActiveCell ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                    style={{ width: getColumnWidth(column.key) }}
                                                    onContextMenu={(event) => openGridContextMenu(event, column.key, 'cell', String(Number(rawValue || 0).toFixed(2)), String(item.id))}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setActiveCell({ rowIndex, columnKey: column.key });
                                                    }}
                                                >
                                                    {Number(rawValue || 0).toFixed(2)}
                                                </td>
                                            );
                                        }

                                        if (column.key === 'type') {
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={`border border-[#d7e9fb] bg-white px-3 ${rowDensity === 'compact' ? 'py-1.5' : 'py-2'} ${pinnedClass} ${isActiveCell ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                    style={{ width: getColumnWidth(column.key) }}
                                                    onContextMenu={(event) => openGridContextMenu(event, column.key, 'cell', String(rawValue || '-'), String(item.id))}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setActiveCell({ rowIndex, columnKey: column.key });
                                                    }}
                                                >
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                                        {String(rawValue || '-')}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        return (
                                            <td
                                                key={column.key}
                                                className={`border border-[#d7e9fb] bg-white px-3 ${rowDensity === 'compact' ? 'py-1.5' : 'py-2'} ${pinnedClass} ${isActiveCell ? 'ring-2 ring-inset ring-sky-400' : ''}`}
                                                style={{ width: getColumnWidth(column.key) }}
                                                onContextMenu={(event) => openGridContextMenu(event, column.key, 'cell', String(rawValue ?? '-'), String(item.id))}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setActiveCell({ rowIndex, columnKey: column.key });
                                                }}
                                            >
                                                {String(rawValue ?? '-')}
                                            </td>
                                        );
                                    })}

                                </tr>
                            ))}
                            {filteredItems.length === 0 && !isApplying && (
                                <tr>
                                    <td colSpan={visibleColumns.length + 2} className="border border-[#d7e9fb] bg-white p-8 text-center text-gray-400">
                                        لا توجد أصناف مطابقة للفلاتر
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
            {gridContextMenu && (
                <ItemMasterContextMenu
                    contextMenu={gridContextMenu}
                    selectedColumnKeys={selectedColumnKeys}
                    columnWidthInput={columnWidthInput}
                    visibleColumnKeys={visibleColumnKeys}
                    onClose={() => setGridContextMenu(null)}
                    getColumnLabel={getColumnLabel}
                    getTargetColumnKeys={getTargetColumnKeys}
                    onEditRecord={() => void openEditFromContextMenu()}
                    onOpenStockByWarehouse={() => void openStockByWarehouseFromContextMenu()}
                    onDuplicateRecord={() => void openDuplicateFromContextMenu()}
                    onDeleteRecord={() => void openDeleteFromContextMenu()}
                    onSort={(key, direction) => {
                        setClientSort({ key, direction });
                        setGridContextMenu(null);
                    }}
                    onClearSort={() => {
                        setClientSort(null);
                        setGridContextMenu(null);
                    }}
                    onApplyFilter={(keys, operator, value) => {
                        applyFilterToColumns(keys, operator, value);
                        setGridContextMenu(null);
                    }}
                    onClearFilter={(keys) => {
                        keys.forEach((key) => clearColumnFilter(key));
                        setGridContextMenu(null);
                    }}
                    onOpenAdvancedFilter={(key) => {
                        openColumnFilterMenu(key);
                        setGridContextMenu(null);
                    }}
                    onHideColumns={(keys) => {
                        hideColumns(keys);
                        setGridContextMenu(null);
                    }}
                    onShowAllColumns={() => {
                        showAllColumns();
                        setGridContextMenu(null);
                    }}
                    onSelectAllVisibleColumns={() => {
                        setSelectedColumnKeys(visibleColumnKeys.length > 0 ? [...visibleColumnKeys] : []);
                        setGridContextMenu(null);
                    }}
                    onClearColumnSelection={() => {
                        setSelectedColumnKeys([]);
                        setGridContextMenu(null);
                    }}
                    onAdjustWidth={(keys, delta) => {
                        adjustColumnsWidth(keys, delta);
                        setGridContextMenu(null);
                    }}
                    onAutoFitWidth={(keys) => {
                        autoFitColumnsWidth(keys);
                        setGridContextMenu(null);
                    }}
                    setColumnWidthInput={setColumnWidthInput}
                    onSetExactWidth={(keys, width) => {
                        setColumnsWidth(keys, width);
                        setGridContextMenu(null);
                    }}
                    onRefresh={() => {
                        void refreshItems();
                        setGridContextMenu(null);
                    }}
                    onExportCsv={() => {
                        exportVisibleToCsv();
                        setGridContextMenu(null);
                    }}
                    onCopySelectedRows={() => {
                        void copySelectedRowsAsTsv();
                        setGridContextMenu(null);
                    }}
                />
            )}
            </AnimatePresence>

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
};

export default ItemMaster;
