import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownAZ, ArrowUpAZ, Copy, EyeOff, Filter, FilterX, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { FilterValueType } from '../../config/screenRegistry';
import type {
    ColumnSchema,
    FilterOperator,
    FilterSchema,
    LookupOption,
} from '../../config/screenRegistry';
import type {
    SavedScreenView,
    ScreenColumnStateItem,
    ScreenFilterStateItem,
    ScreenSortStateItem,
} from '../../hooks/useScreenViewManager';
import { getFloatingMenuPositionFromPoint, getFloatingMenuPositionFromRect } from '../../lib/floatingMenu';
import FilterDrawer from '../ui/FilterDrawer';
import MasterListToolbar from './MasterListToolbar';
import { WafiColumnDef, WafiDataGrid, WafiDataGridHandle } from '../../../pages/treasury/operations/WafiDataGrid';

type QuickSearchOperator = 'contains' | 'startsWith' | 'equals' | 'notContains';

export interface DefinitionListColumn<T> {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'enum' | 'boolean';
    filterType?: FilterValueType;
    options?: LookupOption[];
    width?: number;
    defaultVisible?: boolean;
    sortable?: boolean;
    filterable?: boolean;
    searchable?: boolean;
    align?: 'left' | 'right' | 'center';
    getValue?: (row: T) => unknown;
    getSearchValue?: (row: T) => string;
    getDisplayValue?: (row: T) => string;
    renderCell?: (row: T) => React.ReactNode;
}

interface DefinitionMasterListProps<T> {
    screenKey: string;
    data: T[];
    loading?: boolean;
    columns: DefinitionListColumn<T>[];
    rowKey: (row: T) => string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    createLabel?: string;
    onCreate?: () => void;
    onEdit?: (row: T) => void;
    onDuplicate?: (row: T) => void;
    onDelete?: (rows: T[]) => Promise<void> | void;
    onRefresh?: () => Promise<void> | void;
    toolbarExtraActions?: React.ReactNode;
    defaultSort?: { key: string; direction: 'asc' | 'desc' };
    onRowDoubleClick?: (row: T) => void;
    summaryBadges?: React.ReactNode;
    className?: string;
}

type PersistedState = {
    filters?: ScreenFilterStateItem[];
    columns?: ScreenColumnStateItem[];
    sort?: ScreenSortStateItem[];
    rowDensity?: 'comfortable' | 'compact';
    columnWidths?: Record<string, number>;
    quickSearchField?: string;
    quickSearchOperator?: QuickSearchOperator;
};

type ColumnMenuState = {
    key: string;
    label: string;
    source: 'header' | 'cell';
    position: {
        top: number;
        left: number;
        maxHeight: number;
        transformOrigin: string;
    };
    rowId?: string;
    cellValue?: string;
};

type DraftColumnFilter = {
    operator: FilterOperator;
    value?: unknown;
    valueTo?: unknown;
};

const EMPTY_VIEWS: SavedScreenView[] = [];

function storageKey(screenKey: string) {
    return `definition-master-list:${screenKey}`;
}

function toColumnState<T>(columns: DefinitionListColumn<T>[]): ScreenColumnStateItem[] {
    return columns.map((column, index) => ({
        key: column.key,
        visible: column.defaultVisible !== false,
        order: index,
        width: column.width || 140,
    }));
}

function toColumnWidths<T>(columns: DefinitionListColumn<T>[]): Record<string, number> {
    return columns.reduce<Record<string, number>>((acc, column) => {
        acc[column.key] = column.width || 140;
        return acc;
    }, {});
}

function normalizeColumnState<T>(raw: unknown, columns: DefinitionListColumn<T>[]): ScreenColumnStateItem[] {
    const defaults = toColumnState(columns);
    if (!Array.isArray(raw)) return defaults;

    const defaultMap = new Map(defaults.map((item) => [item.key, item]));
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const key = String((item as any).key || '').trim();
        if (!defaultMap.has(key)) continue;
        const base = defaultMap.get(key)!;
        defaultMap.set(key, {
            key,
            visible: (item as any).visible !== false,
            order: Number.isFinite(Number((item as any).order)) ? Math.max(0, Number((item as any).order)) : base.order,
            width: Number.isFinite(Number((item as any).width)) ? Number((item as any).width) : base.width,
        });
    }

    return Array.from(defaultMap.values())
        .sort((a, b) => a.order - b.order)
        .map((item, index) => ({ ...item, order: index }));
}

function normalizeSort(raw: unknown, fallback?: { key: string; direction: 'asc' | 'desc' }): ScreenSortStateItem[] {
    if (Array.isArray(raw) && raw.length > 0) {
        return raw
            .filter((item) => item && typeof item === 'object' && String((item as any).key || '').trim())
            .map((item) => ({
                key: String((item as any).key || '').trim(),
                direction: String((item as any).direction || '').toLowerCase() === 'desc' ? 'desc' : 'asc',
            }));
    }

    if (!fallback?.key) return [];
    return [{ key: fallback.key, direction: fallback.direction }];
}

function normalizeFilters(raw: unknown): ScreenFilterStateItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((item) => item && typeof item === 'object' && String((item as any).key || '').trim())
        .map((item) => ({
            key: String((item as any).key || '').trim(),
            operator: String((item as any).operator || 'contains').toLowerCase() as FilterOperator,
            value: (item as any).value,
            valueTo: (item as any).valueTo,
            enabled: (item as any).enabled !== false,
        }));
}

function getOperatorLabel(operator: FilterOperator) {
    switch (operator) {
        case 'eq':
            return 'يساوي';
        case 'neq':
            return 'لا يساوي';
        case 'starts_with':
            return 'يبدأ بـ';
        case 'ends_with':
            return 'ينتهي بـ';
        case 'gt':
            return 'أكبر من';
        case 'gte':
            return 'أكبر أو يساوي';
        case 'lt':
            return 'أصغر من';
        case 'lte':
            return 'أصغر أو يساوي';
        case 'between':
            return 'بين';
        case 'in':
            return 'ضمن';
        case 'is_null':
            return 'فارغ';
        case 'not_null':
            return 'غير فارغ';
        case 'contains':
        default:
            return 'يحتوي على';
    }
}

function operatorNeedsValue(operator: FilterOperator) {
    return operator !== 'is_null' && operator !== 'not_null';
}

function operatorNeedsSecondValue(operator: FilterOperator) {
    return operator === 'between';
}

function getBooleanLabel(value: unknown) {
    return Number(value || 0) === 1 || value === true ? 'نعم' : 'لا';
}

function formatDateValue(value: unknown) {
    if (!value) return '-';
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString('en-GB');
}

function parseComparableDate(value: unknown) {
    if (!value) return Number.NaN;
    const parsed = new Date(String(value));
    return parsed.getTime();
}

function isNilLike(value: unknown) {
    return value == null || String(value).trim() === '' || String(value).trim() === '-';
}

function defaultFilterType<T>(column: DefinitionListColumn<T>): FilterValueType {
    if (column.filterType) return column.filterType;
    if (column.type === 'number') return 'number';
    if (column.type === 'date') return 'date';
    if (column.type === 'boolean') return 'boolean';
    if (column.type === 'enum') return column.options?.length ? 'enum' : 'text';
    return column.options?.length ? 'lookup' : 'text';
}

function buildColumnSchema<T>(columns: DefinitionListColumn<T>[]): ColumnSchema[] {
    return columns.map((column) => ({
        key: column.key,
        labelI18nKey: column.label,
        field: column.key,
        type: column.type || 'text',
        defaultVisible: column.defaultVisible !== false,
        width: column.width || 140,
        sortable: column.sortable !== false,
    }));
}

function buildFilterSchema<T>(columns: DefinitionListColumn<T>[]): FilterSchema[] {
    return columns
        .filter((column) => column.filterable !== false)
        .map((column) => {
            const type = defaultFilterType(column);
            let operatorSet: FilterOperator[] = ['contains', 'eq', 'starts_with', 'ends_with', 'is_null', 'not_null'];

            if (type === 'number') {
                operatorSet = ['eq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_null', 'not_null'];
            } else if (type === 'date') {
                operatorSet = ['eq', 'gte', 'lte', 'between', 'is_null', 'not_null'];
            } else if (type === 'enum' || type === 'lookup' || type === 'boolean') {
                operatorSet = ['eq', 'neq', 'in', 'is_null', 'not_null'];
            }

            return {
                key: column.key,
                labelI18nKey: column.label,
                field: column.key,
                type,
                operatorSet,
                defaultOperator: operatorSet[0],
                options: column.options,
            };
        });
}

function getOptionLabel(options: LookupOption[] | undefined, value: unknown) {
    const stringValue = String(value ?? '').trim();
    if (!stringValue || !options?.length) return null;
    return options.find((option) => option.value === stringValue)?.label || null;
}

function compareText(left: string, right: string) {
    return left.localeCompare(right, 'ar', { numeric: true, sensitivity: 'base' });
}

function toNumber(value: unknown) {
    const result = Number(value ?? 0);
    return Number.isFinite(result) ? result : 0;
}

function getDisplayValue<T>(column: DefinitionListColumn<T>, row: T) {
    if (column.getDisplayValue) return column.getDisplayValue(row);

    const raw = column.getValue ? column.getValue(row) : (row as any)?.[column.key];
    const optionLabel = getOptionLabel(column.options, raw);
    if (optionLabel) return optionLabel;

    if (column.type === 'boolean') return getBooleanLabel(raw);
    if (column.type === 'date') return formatDateValue(raw);
    if (column.type === 'number') {
        if (isNilLike(raw)) return '-';
        return toNumber(raw).toLocaleString('en-US');
    }

    if (isNilLike(raw)) return '-';
    return String(raw);
}

function getSearchValue<T>(column: DefinitionListColumn<T>, row: T) {
    if (column.getSearchValue) return column.getSearchValue(row);
    return getDisplayValue(column, row);
}

function matchesFilter<T>(row: T, column: DefinitionListColumn<T>, filter: ScreenFilterStateItem) {
    const raw = column.getValue ? column.getValue(row) : (row as any)?.[column.key];
    const filterType = defaultFilterType(column);

    if (filter.operator === 'is_null') return isNilLike(raw);
    if (filter.operator === 'not_null') return !isNilLike(raw);

    if (filterType === 'number') {
        const value = toNumber(raw);
        const compare = Number(filter.value ?? 0);
        const compareTo = Number(filter.valueTo ?? 0);
        switch (filter.operator) {
            case 'eq':
                return value === compare;
            case 'gt':
                return value > compare;
            case 'gte':
                return value >= compare;
            case 'lt':
                return value < compare;
            case 'lte':
                return value <= compare;
            case 'between':
                return value >= compare && value <= compareTo;
            default:
                return String(value).includes(String(compare));
        }
    }

    if (filterType === 'date') {
        const value = parseComparableDate(raw);
        const compare = parseComparableDate(filter.value);
        const compareTo = parseComparableDate(filter.valueTo);
        if (Number.isNaN(value)) return false;
        switch (filter.operator) {
            case 'eq':
                return value === compare;
            case 'gte':
                return value >= compare;
            case 'lte':
                return value <= compare;
            case 'between':
                return value >= compare && value <= compareTo;
            default:
                return formatDateValue(raw).includes(String(filter.value || ''));
        }
    }

    const textValue = String(raw ?? '').trim().toLowerCase();
    const normalizedFilterValue = String(filter.value ?? '').trim().toLowerCase();
    switch (filter.operator) {
        case 'eq':
            return textValue === normalizedFilterValue;
        case 'neq':
            return textValue !== normalizedFilterValue;
        case 'starts_with':
            return textValue.startsWith(normalizedFilterValue);
        case 'ends_with':
            return textValue.endsWith(normalizedFilterValue);
        case 'in':
            return textValue === normalizedFilterValue;
        case 'contains':
        default:
            return textValue.includes(normalizedFilterValue);
    }
}

export function DefinitionMasterList<T>({
    screenKey,
    data,
    loading = false,
    columns,
    rowKey,
    searchPlaceholder = 'بحث سريع...',
    emptyMessage = 'لا توجد بيانات للعرض',
    createLabel = 'جديد',
    onCreate,
    onEdit,
    onDuplicate,
    onDelete,
    onRefresh,
    toolbarExtraActions,
    defaultSort,
    onRowDoubleClick,
    summaryBadges,
    className = '',
}: DefinitionMasterListProps<T>) {
    const gridRef = useRef<WafiDataGridHandle>(null);
    const persisted = useMemo(() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem(storageKey(screenKey));
            return raw ? (JSON.parse(raw) as PersistedState) : null;
        } catch {
            return null;
        }
    }, [screenKey]);

    const defaultColumnsState = useMemo(() => toColumnState(columns), [columns]);
    const defaultColumnWidths = useMemo(() => toColumnWidths(columns), [columns]);

    const [quickSearch, setQuickSearch] = useState('');
    const [quickSearchField, setQuickSearchField] = useState<'all' | string>(persisted?.quickSearchField || 'all');
    const [quickSearchOperator, setQuickSearchOperator] = useState<QuickSearchOperator>(persisted?.quickSearchOperator || 'contains');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [filters, setFilters] = useState<ScreenFilterStateItem[]>(() => normalizeFilters(persisted?.filters));
    const [columnsState, setColumnsState] = useState<ScreenColumnStateItem[]>(() => normalizeColumnState(persisted?.columns, columns));
    const [sort, setSort] = useState<ScreenSortStateItem[]>(() => normalizeSort(persisted?.sort, defaultSort));
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
        ...defaultColumnWidths,
        ...(persisted?.columnWidths || {}),
    });
    const [rowDensity, setRowDensity] = useState<'comfortable' | 'compact'>(persisted?.rowDensity || 'comfortable');
    const [activeColumnMenu, setActiveColumnMenu] = useState<ColumnMenuState | null>(null);
    const [draftColumnFilter, setDraftColumnFilter] = useState<DraftColumnFilter | null>(null);

    const deferredSearchValue = useDeferredValue(quickSearch);

    const columnSchema = useMemo(() => buildColumnSchema(columns), [columns]);
    const filterSchema = useMemo(() => buildFilterSchema(columns), [columns]);
    const columnMap = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns]);
    const filterSchemaMap = useMemo(() => new Map(filterSchema.map((item) => [item.key, item])), [filterSchema]);
    const searchableColumns = useMemo(
        () => columns.filter((column) => column.searchable !== false && column.key !== 'actions'),
        [columns],
    );

    const visibleColumns = useMemo(() => {
        const stateMap = new Map(columnsState.map((item) => [item.key, item]));
        return [...columns]
            .sort((left, right) => (stateMap.get(left.key)?.order || 0) - (stateMap.get(right.key)?.order || 0))
            .filter((column) => stateMap.get(column.key)?.visible !== false)
            .map((column) => column.key);
    }, [columns, columnsState]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const payload: PersistedState = {
            filters,
            columns: columnsState,
            sort,
            rowDensity,
            columnWidths,
            quickSearchField,
            quickSearchOperator,
        };
        window.localStorage.setItem(storageKey(screenKey), JSON.stringify(payload));
    }, [screenKey, filters, columnsState, sort, rowDensity, columnWidths, quickSearchField, quickSearchOperator]);

    useEffect(() => {
        setSelectedRowIds((prev) => {
            const validIds = new Set(data.map((row) => rowKey(row)));
            return prev.filter((id) => validIds.has(id));
        });
    }, [data, rowKey]);

    useEffect(() => {
        if (!activeColumnMenu) {
            setDraftColumnFilter(null);
            return;
        }

        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const insideMenu = target.closest('[data-definition-column-menu="1"]');
            const insideTrigger = target.closest('[data-column-filter-trigger="1"]');
            if (!insideMenu && !insideTrigger) {
                setActiveColumnMenu(null);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setActiveColumnMenu(null);
            }
        };

        const closeMenu = () => setActiveColumnMenu(null);
        const onScroll = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-definition-column-menu="1"]')) {
                return;
            }
            closeMenu();
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', closeMenu);
        window.addEventListener('scroll', onScroll, true);

        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', closeMenu);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [activeColumnMenu]);

    const activeFilters = useMemo(() => {
        return filters.filter((filter) => {
            if (filter.enabled === false) return false;
            if (!operatorNeedsValue(filter.operator)) return true;
            return String(filter.value ?? '').trim() !== '';
        });
    }, [filters]);

    const columnFilterValues = useMemo(() => {
        return activeFilters.reduce<Record<string, string>>((acc, filter) => {
            acc[filter.key] = !operatorNeedsValue(filter.operator)
                ? getOperatorLabel(filter.operator)
                : String(filter.value ?? '');
            return acc;
        }, {});
    }, [activeFilters]);

    const filteredRows = useMemo(() => {
        const normalizedSearch = deferredSearchValue.trim().toLowerCase();

        const searchMatches = (row: T) => {
            if (!normalizedSearch) return true;

            const matchesValue = (value: string) => {
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

            if (quickSearchField === 'all') {
                return searchableColumns.some((column) => matchesValue(getSearchValue(column, row)));
            }

            const column = columnMap.get(quickSearchField);
            return column ? matchesValue(getSearchValue(column, row)) : true;
        };

        const baseRows = data.filter((row) => {
            if (!searchMatches(row)) return false;
            return activeFilters.every((filter) => {
                const column = columnMap.get(filter.key);
                if (!column) return true;
                return matchesFilter(row, column, filter);
            });
        });

        const currentSort = sort[0];
        if (!currentSort?.key) return baseRows;
        const column = columnMap.get(currentSort.key);
        if (!column) return baseRows;

        return [...baseRows].sort((left, right) => {
            const leftValue = column.getValue ? column.getValue(left) : (left as any)?.[column.key];
            const rightValue = column.getValue ? column.getValue(right) : (right as any)?.[column.key];

            if (column.type === 'number') {
                return currentSort.direction === 'asc'
                    ? toNumber(leftValue) - toNumber(rightValue)
                    : toNumber(rightValue) - toNumber(leftValue);
            }

            if (column.type === 'date') {
                return currentSort.direction === 'asc'
                    ? parseComparableDate(leftValue) - parseComparableDate(rightValue)
                    : parseComparableDate(rightValue) - parseComparableDate(leftValue);
            }

            const first = getDisplayValue(column, left);
            const second = getDisplayValue(column, right);
            return currentSort.direction === 'asc'
                ? compareText(first, second)
                : compareText(second, first);
        });
    }, [activeFilters, columnMap, data, deferredSearchValue, quickSearchField, quickSearchOperator, searchableColumns, sort]);

    const selectedRows = useMemo(() => {
        if (selectedRowIds.length === 0) return [];
        const selected = new Set(selectedRowIds);
        return filteredRows.filter((row) => selected.has(rowKey(row)));
    }, [filteredRows, selectedRowIds, rowKey]);

    const quickSearchFields = useMemo(() => {
        return searchableColumns.map((column) => ({
            key: column.key,
            label: column.label,
        }));
    }, [searchableColumns]);

    const wafiColumns = useMemo<WafiColumnDef<T>[]>((() => {
        return columns.map((column) => ({
            key: column.key,
            label: column.label,
            align: column.align,
            getValue: (row: T) => getDisplayValue(column, row),
            renderCell: column.renderCell ? (row: T) => column.renderCell!(row) : undefined,
        }));
    }), [columns]);

    const setFilterForColumn = (columnKey: string, next: DraftColumnFilter | null) => {
        if (!filterSchemaMap.has(columnKey)) return;
        if (!next) {
            setFilters((prev) => prev.filter((item) => item.key !== columnKey));
            return;
        }

        const hasPrimaryValue = String(next.value ?? '').trim() !== '';
        const hasSecondaryValue = String(next.valueTo ?? '').trim() !== '';
        if (operatorNeedsValue(next.operator) && !hasPrimaryValue) {
            setFilters((prev) => prev.filter((item) => item.key !== columnKey));
            return;
        }
        if (operatorNeedsSecondValue(next.operator) && !hasSecondaryValue) {
            setFilters((prev) => prev.filter((item) => item.key !== columnKey));
            return;
        }

        const normalized: ScreenFilterStateItem = {
            key: columnKey,
            operator: next.operator,
            value: next.value,
            valueTo: next.valueTo,
            enabled: true,
        };

        setFilters((prev) => {
            const others = prev.filter((item) => item.key !== columnKey);
            return filterSchema
                .map((item) => {
                    if (item.key === columnKey) return normalized;
                    return others.find((entry) => entry.key === item.key) || null;
                })
                .filter(Boolean) as ScreenFilterStateItem[];
        });
    };

    const openColumnMenu = (payload: {
        key: string;
        label: string;
        source: 'header' | 'cell';
        triggerElement?: HTMLElement | null;
        clientX?: number;
        clientY?: number;
        rowId?: string;
        cellValue?: string;
    }) => {
        const schema = filterSchemaMap.get(payload.key);
        let position: ColumnMenuState['position'] | null = null;

        if (typeof payload.clientX === 'number' && typeof payload.clientY === 'number') {
            position = getFloatingMenuPositionFromPoint(payload.clientX, payload.clientY, {
                menuWidth: 320,
                menuHeight: payload.source === 'cell' ? 360 : 420,
                preferredAlign: 'right',
                offset: 10,
                margin: 14,
                minHeight: 220,
            });
        } else if (payload.triggerElement) {
            position = getFloatingMenuPositionFromRect(payload.triggerElement.getBoundingClientRect(), {
                menuWidth: 320,
                menuHeight: payload.source === 'cell' ? 360 : 420,
                preferredAlign: 'right',
                offset: 10,
                margin: 14,
                minHeight: 220,
            });
        }

        if (!position) return;
        const existing = activeFilters.find((item) => item.key === payload.key);
        setDraftColumnFilter({
            operator: (existing?.operator || schema?.defaultOperator || schema?.operatorSet?.[0] || 'contains') as FilterOperator,
            value: existing?.value ?? '',
            valueTo: existing?.valueTo ?? '',
        });
        setActiveColumnMenu({
            key: payload.key,
            label: payload.label,
            source: payload.source,
            position,
            rowId: payload.rowId,
            cellValue: payload.cellValue,
        });
    };

    const applyVisibleColumnsChange = (next: string[] | ((prev: string[]) => string[])) => {
        const nextKeys = typeof next === 'function' ? next(visibleColumns) : next;
        setColumnsState((prev) => {
            const hiddenKeys = prev.map((item) => item.key).filter((key) => !nextKeys.includes(key));
            const orderedKeys = [...nextKeys, ...hiddenKeys];
            return prev
                .map((item) => ({
                    ...item,
                    visible: nextKeys.includes(item.key),
                    order: orderedKeys.indexOf(item.key),
                }))
                .sort((left, right) => left.order - right.order);
        });
    };

    const resetState = () => {
        setQuickSearch('');
        setQuickSearchField('all');
        setQuickSearchOperator('contains');
        setFilters([]);
        setColumnsState(defaultColumnsState);
        setSort(normalizeSort([], defaultSort));
        setColumnWidths(defaultColumnWidths);
        setRowDensity('comfortable');
        setActiveColumnMenu(null);
    };

    const activeQuickFilter = quickSearch.trim();
    const activeColumnSchema = activeColumnMenu ? filterSchemaMap.get(activeColumnMenu.key) || null : null;
    const currentColumnSort = activeColumnMenu?.key && sort[0]?.key === activeColumnMenu.key ? sort[0] : null;
    const cellMenuHasValue = !!activeColumnMenu?.cellValue && activeColumnMenu.cellValue !== '-';

    const renderDraftFilterInput = () => {
        if (!activeColumnSchema || !draftColumnFilter || !operatorNeedsValue(draftColumnFilter.operator)) return null;

        const optionItems = activeColumnSchema.type === 'boolean'
            ? [
                { value: '1', label: 'نعم' },
                { value: '0', label: 'لا' },
            ]
            : activeColumnSchema.options || [];
        const inputClassName = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';
        const valueType = activeColumnSchema.type === 'number' ? 'number' : activeColumnSchema.type === 'date' ? 'date' : 'text';

        if (activeColumnSchema.type === 'enum' || activeColumnSchema.type === 'lookup' || activeColumnSchema.type === 'boolean') {
            return (
                <div className="grid gap-2">
                    <select
                        value={String(draftColumnFilter.value ?? '')}
                        onChange={(event) => setDraftColumnFilter((prev) => prev ? { ...prev, value: event.target.value } : prev)}
                        className={inputClassName}
                    >
                        <option value="">اختر قيمة</option>
                        {optionItems.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {operatorNeedsSecondValue(draftColumnFilter.operator) && (
                        <select
                            value={String(draftColumnFilter.valueTo ?? '')}
                            onChange={(event) => setDraftColumnFilter((prev) => prev ? { ...prev, valueTo: event.target.value } : prev)}
                            className={inputClassName}
                        >
                            <option value="">إلى قيمة</option>
                            {optionItems.map((option) => (
                                <option key={`${option.value}-to`} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            );
        }

        return (
            <div className="grid gap-2">
                <input
                    type={valueType}
                    value={String(draftColumnFilter.value ?? '')}
                    onChange={(event) => setDraftColumnFilter((prev) => prev ? { ...prev, value: event.target.value } : prev)}
                    className={inputClassName}
                    placeholder={`أدخل قيمة ${activeColumnMenu?.label || ''}`}
                />
                {operatorNeedsSecondValue(draftColumnFilter.operator) && (
                    <input
                        type={valueType}
                        value={String(draftColumnFilter.valueTo ?? '')}
                        onChange={(event) => setDraftColumnFilter((prev) => prev ? { ...prev, valueTo: event.target.value } : prev)}
                        className={inputClassName}
                        placeholder="إلى"
                    />
                )}
            </div>
        );
    };

    return (
        <div className={className}>
            <MasterListToolbar
                createLabel={createLabel}
                selectedRowsCount={selectedRows.length}
                totalRowsCount={data.length}
                visibleRowsCount={filteredRows.length}
                activeFiltersCount={activeFilters.length + (activeQuickFilter ? 1 : 0)}
                rowDensity={rowDensity}
                onCreate={onCreate}
                onEdit={onEdit && selectedRows.length === 1 ? () => onEdit(selectedRows[0]) : undefined}
                onDuplicate={onDuplicate && selectedRows.length === 1 ? () => onDuplicate(selectedRows[0]) : undefined}
                onDelete={onDelete && selectedRows.length > 0 ? async () => {
                    await onDelete(selectedRows);
                    setSelectedRowIds([]);
                } : undefined}
                onExport={(format) => {
                    if (format === 'excel') {
                        gridRef.current?.exportToExcel(`${screenKey}.xlsx`, 'Data');
                        return;
                    }
                    gridRef.current?.exportToPdf(screenKey);
                }}
                onPrint={() => gridRef.current?.exportToPdf(screenKey)}
                onOpenFilters={() => setFiltersOpen(true)}
                onRefresh={onRefresh}
                onSetRowDensity={setRowDensity}
                extraActions={toolbarExtraActions}
            />

            <div className="mb-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[300px] flex-1">
                        <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={quickSearch}
                            onChange={(event) => setQuickSearch(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                        />
                    </div>

                    <select
                        value={quickSearchField}
                        onChange={(event) => setQuickSearchField(event.target.value)}
                        className="h-12 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        <option value="all">كل الحقول</option>
                        {quickSearchFields.map((field) => (
                            <option key={field.key} value={field.key}>
                                {field.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={quickSearchOperator}
                        onChange={(event) => setQuickSearchOperator(event.target.value as QuickSearchOperator)}
                        className="h-12 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                        <option value="contains">يحتوي على</option>
                        <option value="startsWith">يبدأ بـ</option>
                        <option value="equals">يساوي</option>
                        <option value="notContains">لا يحتوي</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => setFiltersOpen(true)}
                        className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                    >
                        <SlidersHorizontal size={16} />
                        <span>الفلترة المتقدمة</span>
                    </button>

                    {summaryBadges}
                </div>
            </div>

            {(activeQuickFilter || activeFilters.length > 0) && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {activeQuickFilter && (
                        <button
                            type="button"
                            onClick={() => setQuickSearch('')}
                            className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800"
                        >
                            بحث: {quickSearch} ×
                        </button>
                    )}

                    {activeFilters.map((filter) => {
                        const column = columnMap.get(filter.key);
                        if (!column) return null;
                        const value = !operatorNeedsValue(filter.operator) ? getOperatorLabel(filter.operator) : String(filter.value ?? '');
                        return (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setFilters((prev) => prev.filter((item) => item.key !== filter.key))}
                                className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800"
                            >
                                <Filter size={12} />
                                <span>{column.label}: {value}</span>
                                <span>×</span>
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={resetState}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                        <RotateCcw size={12} />
                        <span>إعادة ضبط</span>
                    </button>
                </div>
            )}

            <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm md:p-4">
                <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-slate-50/40">
                    <WafiDataGrid
                        ref={gridRef}
                        data={filteredRows}
                        columns={wafiColumns}
                        keyExtractor={rowKey}
                        loading={loading}
                        emptyMessage={emptyMessage}
                        selectedRowIds={selectedRowIds}
                        onSelectionChange={setSelectedRowIds}
                        visibleColumns={visibleColumns}
                        onVisibleColumnsChange={applyVisibleColumnsChange}
                        columnWidths={columnWidths}
                        onColumnWidthsChange={setColumnWidths}
                        sortKey={sort[0]?.key || ''}
                        sortDir={sort[0]?.direction || 'asc'}
                        onSortChange={(key, direction) => setSort(key ? [{ key, direction }] : [])}
                        rowDensity={rowDensity}
                        columnFilters={columnFilterValues}
                        onHeaderContextMenu={(event, colKey, label) => {
                            openColumnMenu({
                                key: colKey,
                                label,
                                source: 'header',
                                clientX: event.clientX,
                                clientY: event.clientY,
                            });
                        }}
                        onCellContextMenu={(event, colKey, label, cellValue, rowId) => {
                            openColumnMenu({
                                key: colKey,
                                label,
                                source: 'cell',
                                clientX: event.clientX,
                                clientY: event.clientY,
                                cellValue,
                                rowId,
                            });
                        }}
                        onFilterClick={(event, colKey, label) => {
                            if (activeColumnMenu?.key === colKey && activeColumnMenu.source === 'header' && !activeColumnMenu.rowId) {
                                setActiveColumnMenu(null);
                                return;
                            }
                            openColumnMenu({
                                key: colKey,
                                label,
                                source: 'header',
                                triggerElement: event.currentTarget as HTMLElement,
                            });
                        }}
                        activeFilterColumn={activeColumnMenu?.source === 'header' ? activeColumnMenu.key : null}
                        onRowDoubleClick={onRowDoubleClick || onEdit}
                        showRowNumbers
                    />
                </div>
            </div>

            {activeColumnMenu && activeColumnSchema && draftColumnFilter && typeof document !== 'undefined' && createPortal(
                <div
                    data-definition-column-menu="1"
                    className="fixed z-[9999] flex w-[20rem] flex-col overflow-hidden rounded-[22px] border border-sky-100/80 bg-white/95 text-right shadow-[0_24px_60px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/5 backdrop-blur-xl"
                    style={{
                        top: activeColumnMenu.position.top,
                        left: activeColumnMenu.position.left,
                        maxHeight: activeColumnMenu.position.maxHeight,
                        transformOrigin: activeColumnMenu.position.transformOrigin,
                    }}
                    dir="rtl"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                >
                    <div className="border-b border-slate-100 bg-gradient-to-l from-sky-50/90 via-white to-cyan-50/80 px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-extrabold text-slate-800">{activeColumnMenu.label}</div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                    {activeColumnMenu.source === 'cell'
                                        ? 'أوامر سريعة على قيمة الخلية مع فلترة متقدمة لنفس العمود.'
                                        : 'فرز وتصفية متقدمة للعمود الحالي بنفس أسلوب شاشة الأصناف.'}
                                </div>
                                {cellMenuHasValue && (
                                    <div className="mt-2 max-w-[13rem] truncate rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                                        {activeColumnMenu.cellValue}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveColumnMenu(null)}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 overflow-auto p-4">
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                            <div className="mb-2 text-[11px] font-bold text-slate-500">الفرز</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSort([{ key: activeColumnMenu.key, direction: 'asc' }]);
                                        setActiveColumnMenu(null);
                                    }}
                                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${currentColumnSort?.direction === 'asc' ? 'border-sky-300 bg-sky-100 text-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-700'}`}
                                >
                                    <ArrowUpAZ size={14} />
                                    <span>تصاعدي</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSort([{ key: activeColumnMenu.key, direction: 'desc' }]);
                                        setActiveColumnMenu(null);
                                    }}
                                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${currentColumnSort?.direction === 'desc' ? 'border-sky-300 bg-sky-100 text-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-700'}`}
                                >
                                    <ArrowDownAZ size={14} />
                                    <span>تنازلي</span>
                                </button>
                            </div>
                        </div>

                        {activeColumnMenu.source === 'cell' && cellMenuHasValue && (
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                                <div className="mb-2 text-[11px] font-bold text-slate-500">أوامر سريعة على القيمة</div>
                                <div className="grid gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFilterForColumn(activeColumnMenu.key, {
                                                operator: activeColumnSchema.type === 'enum' || activeColumnSchema.type === 'lookup' || activeColumnSchema.type === 'boolean' ? 'eq' : 'contains',
                                                value: activeColumnMenu.cellValue || '',
                                            });
                                            setActiveColumnMenu(null);
                                        }}
                                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                                    >
                                        <span>تصفية بهذه القيمة</span>
                                        <Filter size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(activeColumnMenu.cellValue || '');
                                            setActiveColumnMenu(null);
                                        }}
                                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                                    >
                                        <span>نسخ القيمة</span>
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                            <div className="mb-2 text-[11px] font-bold text-slate-500">الفلترة المتقدمة</div>
                            <div className="grid gap-2">
                                <select
                                    value={draftColumnFilter.operator}
                                    onChange={(event) => setDraftColumnFilter((prev) => prev ? { ...prev, operator: event.target.value as FilterOperator } : prev)}
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                >
                                    {activeColumnSchema.operatorSet.map((operator) => (
                                        <option key={operator} value={operator}>
                                            {getOperatorLabel(operator)}
                                        </option>
                                    ))}
                                </select>
                                {renderDraftFilterInput()}
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilters((prev) => prev.filter((item) => item.key !== activeColumnMenu.key));
                                        setActiveColumnMenu(null);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100"
                                >
                                    <FilterX size={13} />
                                    <span>مسح الفلتر</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterForColumn(activeColumnMenu.key, draftColumnFilter);
                                        setActiveColumnMenu(null);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-bold text-sky-700 transition hover:bg-sky-100"
                                >
                                    <Filter size={13} />
                                    <span>تطبيق</span>
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                            <div className="mb-2 text-[11px] font-bold text-slate-500">العمود الحالي</div>
                            <div className="grid gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        applyVisibleColumnsChange((prev) => prev.filter((key) => key !== activeColumnMenu.key));
                                        setActiveColumnMenu(null);
                                    }}
                                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                                >
                                    <span>إخفاء العمود</span>
                                    <EyeOff size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFiltersOpen(true);
                                        setActiveColumnMenu(null);
                                    }}
                                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                                >
                                    <span>فتح لوحة الفلاتر والخصائص</span>
                                    <SlidersHorizontal size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            <FilterDrawer
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                hideSavedViews
                screenKey={screenKey}
                filterSchema={filterSchema}
                columnSchema={columnSchema}
                filters={filters}
                columns={columnsState}
                sort={sort}
                views={EMPTY_VIEWS}
                activeViewId={null}
                onFiltersChange={setFilters}
                onColumnsChange={setColumnsState}
                onSortChange={setSort}
                onApply={() => setFiltersOpen(false)}
                onReset={resetState}
                onApplyView={(_viewId) => undefined}
                onSaveView={async (_payload) => undefined}
                onSetDefaultView={async (_viewId) => undefined}
                onDeleteView={async (_viewId) => undefined}
            />
        </div>
    );
}

export default DefinitionMasterList;
