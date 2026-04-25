import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns2, Filter, Save, Search, Trash2, X, ChevronUp, ChevronDown, ListFilter } from 'lucide-react';
import { ColumnSchema, FilterOperator, FilterSchema } from '../../config/screenRegistry';
import {
    SavedScreenView,
    ScreenColumnStateItem,
    ScreenFilterStateItem,
    ScreenSortStateItem,
} from '../../hooks/useScreenViewManager';
import { useMyPermissions } from '../../hooks/useMyPermissions';
import { useEnterNavigation } from '../../hooks/useEnterNavigation';

type SaveViewPayload = {
    id?: string;
    name: string;
    scope: 'user' | 'branch' | 'company';
    isDefault?: boolean;
    isShared?: boolean;
};

type FilterDrawerProps = {
    open: boolean;
    onClose: () => void;
    screenKey: string;
    hideSavedViews?: boolean;
    filterSchema: FilterSchema[];
    columnSchema: ColumnSchema[];
    filters: ScreenFilterStateItem[];
    columns: ScreenColumnStateItem[];
    sort: ScreenSortStateItem[];
    views: SavedScreenView[];
    activeViewId: string | null;
    isApplying?: boolean;
    onFiltersChange: (next: ScreenFilterStateItem[]) => void;
    onColumnsChange: (next: ScreenColumnStateItem[]) => void;
    onSortChange: (next: ScreenSortStateItem[]) => void;
    onApply: () => void;
    onReset: () => void;
    onApplyView: (viewId: string) => void;
    onSaveView: (payload: SaveViewPayload) => Promise<void> | void;
    onSetDefaultView: (viewId: string) => Promise<void> | void;
    onDeleteView: (viewId: string) => Promise<void> | void;
};

const OPERATOR_LABELS: Record<FilterOperator, string> = {
    eq: 'op.eq',
    neq: 'op.neq',
    contains: 'op.contains',
    starts_with: 'op.starts_with',
    ends_with: 'op.ends_with',
    gt: 'op.gt',
    gte: 'op.gte',
    lt: 'op.lt',
    lte: 'op.lte',
    between: 'op.between',
    in: 'op.in',
    is_null: 'op.is_null',
    not_null: 'op.not_null',
};

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

function normalizeFilterItem(schema: FilterSchema, item?: ScreenFilterStateItem): ScreenFilterStateItem {
    return {
        key: schema.key,
        operator: (item?.operator || schema.defaultOperator || schema.operatorSet[0] || 'eq') as FilterOperator,
        value: item?.value,
        valueTo: item?.valueTo,
        enabled: item?.enabled !== false,
    };
}

function normalizeColumns(columns: ScreenColumnStateItem[]): ScreenColumnStateItem[] {
    return [...columns]
        .sort((a, b) => a.order - b.order)
        .map((item, index) => ({ ...item, order: index }));
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
    open,
    onClose,
    hideSavedViews = false,
    filterSchema,
    columnSchema,
    filters,
    columns,
    sort,
    views,
    activeViewId,
    isApplying,
    onFiltersChange,
    onColumnsChange,
    onSortChange,
    onApply,
    onReset,
    onApplyView,
    onSaveView,
    onSetDefaultView,
    onDeleteView,
}) => {
    const { can } = useMyPermissions();
    const canManageViews = can('view.manage');
    const canShareViews = can('view.share');
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'ltr';

    const [searchText, setSearchText] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [saveScope, setSaveScope] = useState<'user' | 'branch' | 'company'>('user');
    const [saveAsDefault, setSaveAsDefault] = useState(false);
    const [saveBusy, setSaveBusy] = useState(false);
    const [selectedViewId, setSelectedViewId] = useState<string>('');

    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const navigationRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setSelectedViewId(activeViewId || '');
    }, [open, activeViewId]);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (!open) return;

            const target = event.target as HTMLElement | null;
            const tag = String(target?.tagName || '').toUpperCase();
            const isTypingTarget = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target?.isContentEditable;

            if (event.key === '/' && !isTypingTarget) {
                event.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
                return;
            }

            if (event.ctrlKey && (event.key === 'r' || event.key === 'R')) {
                event.preventDefault();
                onReset();
                return;
            }

            if (event.ctrlKey && (event.key === 's' || event.key === 'S')) {
                event.preventDefault();
                if (canManageViews) {
                    setShowSaveForm(true);
                }
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                onApply();
                return;
            }

            if (event.key === 'Enter' && !isTypingTarget) {
                event.preventDefault();
                onApply();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onApply, onReset, canManageViews]);

    useEnterNavigation(navigationRef, {
        enabled: open,
        onEscape: onClose,
        onCommit: onApply,
    });

    const visibleFilterSchema = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) return filterSchema;
        return filterSchema.filter((item) =>
            item.key.toLowerCase().includes(q) ||
            item.labelI18nKey.toLowerCase().includes(q),
        );
    }, [filterSchema, searchText]);

    const visibleColumnSchema = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) return columnSchema;
        return columnSchema.filter((item) =>
            item.key.toLowerCase().includes(q) ||
            item.labelI18nKey.toLowerCase().includes(q),
        );
    }, [columnSchema, searchText]);

    const columnMap = useMemo(() => {
        return new Map(columns.map((item) => [item.key, item]));
    }, [columns]);

    const currentSort = sort[0] || { key: '', direction: 'asc' as const };

    const updateFilterItem = (key: string, updater: (prev: ScreenFilterStateItem) => ScreenFilterStateItem) => {
        const schema = filterSchema.find((item) => item.key === key);
        if (!schema) return;
        const current = filters.find((item) => item.key === key);
        const next = updater(normalizeFilterItem(schema, current));

        const map = new Map(filters.map((item) => [item.key, item]));
        map.set(key, next);
        const ordered = filterSchema
            .map((item) => map.get(item.key))
            .filter(Boolean) as ScreenFilterStateItem[];
        onFiltersChange(ordered);
    };

    const toggleFilterEnabled = (schema: FilterSchema) => {
        updateFilterItem(schema.key, (prev) => ({
            ...prev,
            enabled: !(prev.enabled !== false),
        }));
    };

    const updateColumn = (key: string, updater: (prev: ScreenColumnStateItem) => ScreenColumnStateItem) => {
        const next = normalizeColumns(
            columns.map((item) => (item.key === key ? updater(item) : item)),
        );
        onColumnsChange(next);
    };

    const moveColumn = (key: string, delta: number) => {
        const sorted = normalizeColumns(columns);
        const index = sorted.findIndex((item) => item.key === key);
        if (index < 0) return;
        const nextIndex = index + delta;
        if (nextIndex < 0 || nextIndex >= sorted.length) return;

        const swapped = [...sorted];
        const current = swapped[index];
        swapped[index] = swapped[nextIndex];
        swapped[nextIndex] = current;
        onColumnsChange(normalizeColumns(swapped));
    };

    const setAllColumnsVisibility = (visible: boolean) => {
        const next = normalizeColumns(columns.map((item) => ({ ...item, visible })));
        onColumnsChange(next);
    };

    const handleSave = async () => {
        if (!canManageViews || saveBusy) return;
        const name = saveName.trim();
        if (!name) return;

        const payload: SaveViewPayload = {
            name,
            scope: saveScope,
            isDefault: saveAsDefault,
            isShared: saveScope !== 'user',
        };

        setSaveBusy(true);
        try {
            await onSaveView(payload);
            setSaveName('');
            setSaveAsDefault(false);
            setShowSaveForm(false);
        } finally {
            setSaveBusy(false);
        }
    };

    const activeView = views.find((item) => item.id === selectedViewId) || null;

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9998] bg-black/35">
            <div className="absolute inset-y-0 end-0 w-full max-w-2xl bg-white shadow-2xl border-s border-slate-200 flex flex-col" dir={currentDir}>
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <ListFilter className="w-5 h-5 text-blue-600" />
                        <span>{tr('ui.filters.title', 'Filters and Views')}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                        aria-label={tr('ui.filters.close', 'Close')}
                    >
                        <X className="w-4 h-4 mx-auto" />
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                        ref={searchInputRef}
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        placeholder={tr('ui.filters.search_placeholder', 'Search filters and columns')}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>

                <div ref={navigationRef} className="flex-1 overflow-auto p-5 space-y-6">
                    {!hideSavedViews && (
                        <section className="rounded-xl border border-slate-200 p-4 bg-white">
                            <div className="flex items-center gap-2 mb-3 text-slate-800 font-medium">
                                <Save className="w-4 h-4 text-emerald-600" />
                                <span>{tr('ui.views.title', 'Saved Views')}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                                <select
                                    value={selectedViewId}
                                    onChange={(event) => setSelectedViewId(event.target.value)}
                                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">{tr('ui.views.none', 'No saved view')}</option>
                                    {views.map((view) => (
                                        <option key={view.id} value={view.id}>
                                            {view.name}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => selectedViewId && onApplyView(selectedViewId)}
                                    disabled={!selectedViewId}
                                    className="border border-blue-200 text-blue-700 rounded-lg px-3 py-2 text-sm disabled:opacity-40"
                                >
                                    {tr('ui.views.apply', 'Apply View')}
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                <button
                                    onClick={() => setShowSaveForm((prev) => !prev)}
                                    disabled={!canManageViews}
                                    className="border border-emerald-200 text-emerald-700 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
                                    title={!canManageViews ? tr('error.permission_denied.view.manage') : ''}
                                >
                                    {tr('ui.filters.save', 'Save View')}
                                </button>
                                <button
                                    onClick={() => activeView && onSetDefaultView(activeView.id)}
                                    disabled={!canManageViews || !activeView}
                                    className="border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
                                >
                                    {tr('ui.views.default', 'Set Default')}
                                </button>
                                <button
                                    onClick={() => activeView && onDeleteView(activeView.id)}
                                    disabled={!canManageViews || !activeView}
                                    className="border border-red-200 text-red-700 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40 inline-flex items-center gap-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {tr('ui.views.delete', 'Delete')}
                                </button>
                            </div>

                            {showSaveForm && (
                                <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                                    <input
                                        value={saveName}
                                        onChange={(event) => setSaveName(event.target.value)}
                                        placeholder={tr('ui.views.name_placeholder', 'View name')}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    />

                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <label className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-2 bg-white">
                                            <input
                                                type="radio"
                                                name="view_scope"
                                                checked={saveScope === 'user'}
                                                onChange={() => setSaveScope('user')}
                                            />
                                            <span>{tr('ui.views.scope.user', 'User')}</span>
                                        </label>
                                        <label className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-2 bg-white">
                                            <input
                                                type="radio"
                                                name="view_scope"
                                                checked={saveScope === 'branch'}
                                                disabled={!canShareViews}
                                                onChange={() => setSaveScope('branch')}
                                            />
                                            <span>{tr('ui.views.scope.branch', 'Branch')}</span>
                                        </label>
                                        <label className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-2 bg-white">
                                            <input
                                                type="radio"
                                                name="view_scope"
                                                checked={saveScope === 'company'}
                                                disabled={!canShareViews}
                                                onChange={() => setSaveScope('company')}
                                            />
                                            <span>{tr('ui.views.scope.company', 'Company')}</span>
                                        </label>
                                    </div>

                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={saveAsDefault}
                                            onChange={(event) => setSaveAsDefault(event.target.checked)}
                                        />
                                        <span>{tr('ui.views.default', 'Set Default')}</span>
                                    </label>

                                    <button
                                        onClick={handleSave}
                                        disabled={!saveName.trim() || saveBusy || !canManageViews}
                                        className="w-full bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40"
                                    >
                                        {tr('ui.filters.save', 'Save View')}
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    <section className="rounded-xl border border-slate-200 p-4 bg-white">
                        <div className="flex items-center gap-2 mb-3 text-slate-800 font-medium">
                            <Filter className="w-4 h-4 text-blue-600" />
                            <span>{tr('ui.filters.title', 'Filters')}</span>
                        </div>

                        <div className="space-y-3">
                            {visibleFilterSchema.map((schema) => {
                                const current = normalizeFilterItem(
                                    schema,
                                    filters.find((item) => item.key === schema.key),
                                );
                                const enabled = current.enabled !== false;
                                const showValue = !['is_null', 'not_null'].includes(current.operator);
                                const showValueTo = current.operator === 'between';

                                const options = schema.options || [];

                                return (
                                    <div key={schema.key} className="border border-slate-200 rounded-lg p-3 bg-slate-50/40 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-sm font-medium text-slate-700">{tr(schema.labelI18nKey, schema.labelI18nKey || schema.key)}</label>
                                            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    checked={enabled}
                                                    onChange={() => toggleFilterEnabled(schema)}
                                                />
                                                {tr('ui.filters.enabled', 'Enabled')}
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <select
                                                value={current.operator}
                                                onChange={(event) => updateFilterItem(schema.key, (prev) => ({
                                                    ...prev,
                                                    operator: event.target.value as FilterOperator,
                                                }))}
                                                className="border border-slate-200 rounded-lg px-2 py-2 text-sm"
                                                disabled={!enabled}
                                            >
                                                {schema.operatorSet.map((op) => (
                                                    <option key={op} value={op}>{tr(OPERATOR_LABELS[op], op)}</option>
                                                ))}
                                            </select>

                                            {showValue && (
                                                <FilterValueEditor
                                                    schema={schema}
                                                    value={current.value}
                                                    disabled={!enabled}
                                                    onChange={(value) => updateFilterItem(schema.key, (prev) => ({ ...prev, value }))}
                                                    options={options}
                                                />
                                            )}

                                            {showValueTo && (
                                                <FilterValueEditor
                                                    schema={schema}
                                                    value={current.valueTo}
                                                    disabled={!enabled}
                                                    onChange={(value) => updateFilterItem(schema.key, (prev) => ({ ...prev, valueTo: value }))}
                                                    options={options}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-slate-800 font-medium">
                                <Columns2 className="w-4 h-4 text-purple-600" />
                                <span>{tr('ui.columns.title', 'Columns')}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAllColumnsVisibility(true)}
                                    className="border border-slate-200 rounded px-2 py-1 text-xs"
                                >
                                    {tr('ui.columns.show_all', 'Show All')}
                                </button>
                                <button
                                    onClick={() => setAllColumnsVisibility(false)}
                                    className="border border-slate-200 rounded px-2 py-1 text-xs"
                                >
                                    {tr('ui.columns.hide_all', 'Hide All')}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {visibleColumnSchema.map((schema) => {
                                const state = columnMap.get(schema.key) || {
                                    key: schema.key,
                                    visible: schema.defaultVisible,
                                    order: 999,
                                    width: schema.width,
                                };

                                return (
                                    <div key={schema.key} className="border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 bg-slate-50/40">
                                        <input
                                            type="checkbox"
                                            checked={state.visible}
                                            onChange={(event) => updateColumn(schema.key, (prev) => ({ ...prev, visible: event.target.checked }))}
                                        />
                                        <span className="flex-1 text-sm text-slate-700">{tr(schema.labelI18nKey, schema.labelI18nKey || schema.key)}</span>
                                        <span className="text-xs text-slate-400">{schema.key}</span>
                                        <button
                                            onClick={() => moveColumn(schema.key, -1)}
                                            className="h-7 w-7 rounded border border-slate-200 text-slate-500"
                                            aria-label={tr('ui.columns.move_up', 'Move up')}
                                        >
                                            <ChevronUp className="w-4 h-4 mx-auto" />
                                        </button>
                                        <button
                                            onClick={() => moveColumn(schema.key, 1)}
                                            className="h-7 w-7 rounded border border-slate-200 text-slate-500"
                                            aria-label={tr('ui.columns.move_down', 'Move down')}
                                        >
                                            <ChevronDown className="w-4 h-4 mx-auto" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4 bg-white">
                        <div className="text-slate-800 font-medium mb-3">{tr('ui.sort.title', 'Sorting')}</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <select
                                value={currentSort.key}
                                onChange={(event) => onSortChange([
                                    {
                                        key: event.target.value,
                                        direction: currentSort.direction || 'asc',
                                    },
                                ])}
                                className="border border-slate-200 rounded-lg px-2 py-2 text-sm"
                            >
                                <option value="">{tr('ui.sort.none', 'No sort')}</option>
                                {columnSchema.filter((col) => col.sortable).map((col) => (
                                    <option key={col.key} value={col.key}>{tr(col.labelI18nKey, col.labelI18nKey || col.key)}</option>
                                ))}
                            </select>

                            <select
                                value={currentSort.direction || 'asc'}
                                onChange={(event) => onSortChange([
                                    {
                                        key: currentSort.key,
                                        direction: event.target.value === 'desc' ? 'desc' : 'asc',
                                    },
                                ])}
                                className="border border-slate-200 rounded-lg px-2 py-2 text-sm"
                                disabled={!currentSort.key}
                            >
                                <option value="asc">{tr('ui.sort.asc', 'Ascending')}</option>
                                <option value="desc">{tr('ui.sort.desc', 'Descending')}</option>
                            </select>
                        </div>
                    </section>
                </div>

                <div className="p-4 border-t border-slate-200 bg-white flex gap-2">
                    <button
                        onClick={onApply}
                        disabled={isApplying}
                        className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2.5 font-semibold disabled:opacity-40"
                    >
                        {tr('ui.filters.apply', 'Apply')}
                    </button>
                    <button
                        onClick={onReset}
                        className="flex-1 border border-slate-300 text-slate-700 rounded-lg px-4 py-2.5 font-semibold"
                    >
                        {tr('ui.filters.reset', 'Reset')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

const FilterValueEditor: React.FC<{
    schema: FilterSchema;
    value: unknown;
    disabled?: boolean;
    onChange: (value: unknown) => void;
    options: Array<{ value: string; label: string; labelI18nKey?: string }>;
}> = ({ schema, value, disabled, onChange, options }) => {
    if (schema.type === 'number') {
        return (
            <input
                type="number"
                value={value as any}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm"
            />
        );
    }

    if (schema.type === 'date') {
        return (
            <input
                type="date"
                value={value as any}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm"
            />
        );
    }

    if (schema.type === 'boolean') {
        return (
            <select
                value={String(value ?? '')}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm"
            >
                <option value="">{tr('ui.filters.any', 'Any')}</option>
                <option value="1">{tr('ui.filters.true', 'True')}</option>
                <option value="0">{tr('ui.filters.false', 'False')}</option>
            </select>
        );
    }

    if ((schema.type === 'enum' || schema.type === 'lookup') && options.length > 0) {
        return (
            <select
                value={String(value ?? '')}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm"
            >
                <option value="">{tr('ui.filters.any', 'Any')}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {tr(option.labelI18nKey || '', option.label || option.value)}
                    </option>
                ))}
            </select>
        );
    }

    return (
        <input
            type="text"
            value={String(value ?? '')}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-2 text-sm"
        />
    );
};

export default FilterDrawer;
