import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
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

    const deferredSearchValue = useDeferredValue(quickSearch);

    const columnSchema = useMemo(() => buildColumnSchema(columns), [columns]);
    const filterSchema = useMemo(() => buildFilterSchema(columns), [columns]);
    const columnMap = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns]);

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

    const activeFilters = useMemo(() => {
        return filters.filter((filter) => {
            if (filter.enabled === false) return false;
            if (filter.operator === 'is_null' || filter.operator === 'not_null') return true;
            return String(filter.value ?? '').trim() !== '';
        });
    }, [filters]);

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
    }, [
        activeFilters,
        columnMap,
        data,
        deferredSearchValue,
        quickSearchField,
        quickSearchOperator,
        searchableColumns,
        sort,
    ]);

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

    const wafiColumns = useMemo<WafiColumnDef<T>[]>(() => {
        return columns.map((column) => ({
            key: column.key,
            label: column.label,
            align: column.align,
            getValue: (row: T) => getDisplayValue(column, row),
            renderCell: column.renderCell ? (row: T) => column.renderCell!(row) : undefined,
        }));
    }, [columns]);

    const resetState = () => {
        setQuickSearch('');
        setQuickSearchField('all');
        setQuickSearchOperator('contains');
        setFilters([]);
        setColumnsState(defaultColumnsState);
        setSort(normalizeSort([], defaultSort));
        setColumnWidths(defaultColumnWidths);
        setRowDensity('comfortable');
    };

    const handleRefresh = async () => {
        await onRefresh?.();
    };

    const handleDelete = async () => {
        if (!onDelete || selectedRows.length === 0) return;
        await onDelete(selectedRows);
        setSelectedRowIds([]);
    };

    const activeQuickFilter = quickSearch.trim();

    return (
        <div className={className}>
            <MasterListToolbar
                createLabel={createLabel}
                selectedRowsCount={selectedRows.length}
                rowDensity={rowDensity}
                onCreate={onCreate}
                onEdit={onEdit && selectedRows.length === 1 ? () => onEdit(selectedRows[0]) : undefined}
                onDuplicate={onDuplicate && selectedRows.length === 1 ? () => onDuplicate(selectedRows[0]) : undefined}
                onDelete={onDelete ? handleDelete : undefined}
                onExport={(format) => {
                    if (format === 'excel') {
                        gridRef.current?.exportToExcel(`${screenKey}.xlsx`, 'Data');
                        return;
                    }
                    gridRef.current?.exportToPdf(screenKey);
                }}
                onPrint={() => gridRef.current?.exportToPdf(screenKey)}
                onOpenFilters={() => setFiltersOpen(true)}
                onRefresh={onRefresh ? handleRefresh : undefined}
                onSetRowDensity={setRowDensity}
                extraActions={toolbarExtraActions}
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[280px] flex-1">
                    <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={quickSearch}
                        onChange={(event) => setQuickSearch(event.target.value)}
                        placeholder={searchPlaceholder}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                </div>

                <select
                    value={quickSearchField}
                    onChange={(event) => setQuickSearchField(event.target.value)}
                    className="h-11 min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
                    className="h-11 min-w-[160px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                    <option value="contains">يحتوي على</option>
                    <option value="startsWith">يبدأ بـ</option>
                    <option value="equals">يساوي</option>
                    <option value="notContains">لا يحتوي</option>
                </select>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                    الإجمالي: <span className="text-slate-900">{data.length}</span>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                    المعروض: <span>{filteredRows.length}</span>
                </div>

                {summaryBadges}
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
                        const value = filter.operator === 'is_null'
                            ? 'فارغ'
                            : filter.operator === 'not_null'
                                ? 'غير فارغ'
                                : String(filter.value ?? '');

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

            <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
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
                    onVisibleColumnsChange={(next) => {
                        const nextKeys = typeof next === 'function' ? next(visibleColumns) : next;
                        setColumnsState((prev) => prev.map((item) => ({
                            ...item,
                            visible: nextKeys.includes(item.key),
                        })));
                    }}
                    columnWidths={columnWidths}
                    onColumnWidthsChange={setColumnWidths}
                    sortKey={sort[0]?.key || ''}
                    sortDir={sort[0]?.direction || 'asc'}
                    onSortChange={(key, direction) => setSort(key ? [{ key, direction }] : [])}
                    rowDensity={rowDensity}
                    onRowDoubleClick={onRowDoubleClick || onEdit}
                    showRowNumbers
                />
            </div>

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
