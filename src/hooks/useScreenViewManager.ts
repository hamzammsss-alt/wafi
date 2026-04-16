import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ColumnSchema,
    FilterOperator,
    ScreenDefinition,
    SortDirection,
    getScreenDefinition,
} from '../config/screenRegistry';

export type ScreenFilterStateItem = {
    key: string;
    operator: FilterOperator;
    value?: unknown;
    valueTo?: unknown;
    enabled?: boolean;
};

export type ScreenColumnStateItem = {
    key: string;
    visible: boolean;
    order: number;
    width?: number;
};

export type ScreenSortStateItem = {
    key: string;
    direction: SortDirection;
};

export type SavedScreenView = {
    id: string;
    companyId: string;
    branchId: string | null;
    userId: string | null;
    screenKey: string;
    scope: 'user' | 'branch' | 'company';
    name: string;
    nameI18nKey?: string | null;
    filters: ScreenFilterStateItem[];
    columns: ScreenColumnStateItem[];
    sort: ScreenSortStateItem[];
    isDefault: boolean;
    isShared: boolean;
    createdAt: string;
    updatedAt: string;
};

export type ScreenApplyResult = {
    screenKey: string;
    rows: any[];
    total: number;
    pageSize: number;
    offset: number;
    applied: {
        filters: ScreenFilterStateItem[];
        columns: ScreenColumnStateItem[];
        sort: ScreenSortStateItem[];
    };
    summary?: Record<string, any>;
};

function toDefaultColumns(definition: ScreenDefinition): ScreenColumnStateItem[] {
    return definition.columnSchema.map((column, index) => ({
        key: column.key,
        visible: Boolean(column.defaultVisible),
        order: index,
        width: column.width,
    }));
}

function toDefaultSort(definition: ScreenDefinition): ScreenSortStateItem[] {
    return (definition.defaultSort || []).map((sort) => ({
        key: sort.key,
        direction: sort.direction,
    }));
}

function normalizeColumns(definition: ScreenDefinition, raw: any): ScreenColumnStateItem[] {
    if (!Array.isArray(raw)) return toDefaultColumns(definition);

    const defaults = toDefaultColumns(definition);
    const byKey = new Map(defaults.map((x) => [x.key, x]));

    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const key = String(item.key || '').trim();
        if (!key || !byKey.has(key)) continue;

        const previous = byKey.get(key)!;
        const next: ScreenColumnStateItem = {
            key,
            visible: item.visible !== false,
            order: Number.isFinite(Number(item.order)) ? Math.max(0, Math.floor(Number(item.order))) : previous.order,
            width: Number.isFinite(Number(item.width)) ? Math.floor(Number(item.width)) : previous.width,
        };
        byKey.set(key, next);
    }

    const merged = Array.from(byKey.values()).sort((a, b) => a.order - b.order);
    return merged.map((item, index) => ({ ...item, order: index }));
}

function normalizeSort(definition: ScreenDefinition, raw: any): ScreenSortStateItem[] {
    if (!Array.isArray(raw) || raw.length === 0) return toDefaultSort(definition);

    const allowed = new Set(
        definition.columnSchema.filter((x) => x.sortable).map((x) => x.key),
    );

    const normalized = raw
        .filter((item: any) => item && allowed.has(String(item.key || '').trim()))
        .map((item: any) => ({
            key: String(item.key || '').trim(),
            direction: String(item.direction || '').toLowerCase() === 'desc' ? 'desc' as SortDirection : 'asc' as SortDirection,
        }));

    return normalized.length ? normalized : toDefaultSort(definition);
}

function normalizeFilters(raw: any): ScreenFilterStateItem[] {
    if (!Array.isArray(raw)) return [];

    return raw
        .filter((item: any) => item && typeof item === 'object' && String(item.key || '').trim())
        .map((item: any) => ({
            key: String(item.key || '').trim(),
            operator: String(item.operator || 'eq').toLowerCase() as FilterOperator,
            value: item.value,
            valueTo: item.valueTo,
            enabled: item.enabled !== false,
        }));
}

export function useScreenViewManager(screenKey: string, options?: { autoApply?: boolean; pageSize?: number }) {
    const definition = useMemo(() => getScreenDefinition(screenKey), [screenKey]);

    const [filters, setFilters] = useState<ScreenFilterStateItem[]>([]);
    const [columns, setColumns] = useState<ScreenColumnStateItem[]>(() => definition ? toDefaultColumns(definition) : []);
    const [sort, setSort] = useState<ScreenSortStateItem[]>(() => definition ? toDefaultSort(definition) : []);
    const [views, setViews] = useState<SavedScreenView[]>([]);
    const [activeViewId, setActiveViewId] = useState<string | null>(null);
    const [result, setResult] = useState<ScreenApplyResult | null>(null);
    const [isLoadingViews, setIsLoadingViews] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [errorKey, setErrorKey] = useState<string | null>(null);

    const pageSize = Number(options?.pageSize || 100);

    const resetState = useCallback(() => {
        if (!definition) return;
        setFilters([]);
        setColumns(toDefaultColumns(definition));
        setSort(toDefaultSort(definition));
        setActiveViewId(null);
    }, [definition]);

    const apply = useCallback(async (overrides?: Partial<{ filters: ScreenFilterStateItem[]; columns: ScreenColumnStateItem[]; sort: ScreenSortStateItem[]; page: number; pageSize: number }>) => {
        if (!definition) return null;
        const api = (window as any)?.electronAPI?.views;
        if (!api?.apply) {
            setErrorKey('error.views.api_missing');
            return null;
        }

        const payload = {
            screenKey,
            filters: overrides?.filters || filters,
            columns: overrides?.columns || columns,
            sort: overrides?.sort || sort,
            page: overrides?.page || 1,
            pageSize: overrides?.pageSize || pageSize,
            includeTotal: true,
        };

        setIsApplying(true);
        try {
            const nextResult = await api.apply(payload);
            setResult(nextResult || null);
            setErrorKey(null);
            return nextResult as ScreenApplyResult;
        } catch (error: any) {
            setErrorKey(String(error?.messageKey || 'error.views.apply_failed'));
            return null;
        } finally {
            setIsApplying(false);
        }
    }, [definition, screenKey, filters, columns, sort, pageSize]);

    const loadViews = useCallback(async (): Promise<SavedScreenView | null> => {
        if (!definition) return null;
        const api = (window as any)?.electronAPI?.views;
        if (!api?.list) return null;

        setIsLoadingViews(true);
        try {
            const rows = await api.list(screenKey);
            const parsed: SavedScreenView[] = (Array.isArray(rows) ? rows : []).map((row: any) => ({
                id: String(row.id),
                companyId: String(row.companyId || ''),
                branchId: row.branchId ? String(row.branchId) : null,
                userId: row.userId ? String(row.userId) : null,
                screenKey: String(row.screenKey || ''),
                scope: (row.scope || 'user') as 'user' | 'branch' | 'company',
                name: String(row.name || ''),
                nameI18nKey: row.nameI18nKey ? String(row.nameI18nKey) : null,
                filters: normalizeFilters(row.filters),
                columns: normalizeColumns(definition, row.columns),
                sort: normalizeSort(definition, row.sort),
                isDefault: Boolean(row.isDefault),
                isShared: Boolean(row.isShared),
                createdAt: String(row.createdAt || ''),
                updatedAt: String(row.updatedAt || ''),
            }));

            setViews(parsed);

            const defaultView = parsed.find((x) => x.isDefault);
            if (defaultView) {
                setFilters(defaultView.filters);
                setColumns(defaultView.columns);
                setSort(defaultView.sort);
                setActiveViewId(defaultView.id);
            }
            return defaultView || null;
        } catch (error: any) {
            setErrorKey(String(error?.messageKey || 'error.views.load_failed'));
            return null;
        } finally {
            setIsLoadingViews(false);
        }
    }, [definition, screenKey]);

    const applySavedView = useCallback((viewId: string) => {
        if (!definition) return;
        const view = views.find((x) => x.id === viewId);
        if (!view) return;
        setFilters(view.filters || []);
        setColumns(normalizeColumns(definition, view.columns || []));
        setSort(normalizeSort(definition, view.sort || []));
        setActiveViewId(view.id);
    }, [views, definition]);

    const saveCurrentView = useCallback(async (payload: {
        id?: string;
        name: string;
        scope: 'user' | 'branch' | 'company';
        isDefault?: boolean;
        isShared?: boolean;
        nameI18nKey?: string;
    }) => {
        if (!definition) return null;
        const api = (window as any)?.electronAPI?.views;
        if (!api?.save) {
            setErrorKey('error.views.api_missing');
            return null;
        }

        try {
            const saved = await api.save({
                id: payload.id,
                screenKey,
                scope: payload.scope,
                name: payload.name,
                nameI18nKey: payload.nameI18nKey,
                filters,
                columns,
                sort,
                isDefault: Boolean(payload.isDefault),
                isShared: Boolean(payload.isShared),
            });
            setActiveViewId(saved?.id || null);
            await loadViews();
            return saved;
        } catch (error: any) {
            setErrorKey(String(error?.messageKey || 'error.views.save_failed'));
            return null;
        }
    }, [definition, screenKey, filters, columns, sort, loadViews]);

    const setDefaultView = useCallback(async (viewId: string) => {
        const api = (window as any)?.electronAPI?.views;
        if (!api?.setDefault) {
            setErrorKey('error.views.api_missing');
            return;
        }
        try {
            await api.setDefault(viewId);
            setActiveViewId(viewId);
            await loadViews();
        } catch (error: any) {
            setErrorKey(String(error?.messageKey || 'error.views.set_default_failed'));
        }
    }, [loadViews]);

    const deleteView = useCallback(async (viewId: string) => {
        const api = (window as any)?.electronAPI?.views;
        if (!api?.delete) {
            setErrorKey('error.views.api_missing');
            return;
        }
        try {
            await api.delete(viewId);
            if (activeViewId === viewId) {
                setActiveViewId(null);
            }
            await loadViews();
        } catch (error: any) {
            setErrorKey(String(error?.messageKey || 'error.views.delete_failed'));
        }
    }, [activeViewId, loadViews]);

    useEffect(() => {
        if (!definition) return;
        setColumns(toDefaultColumns(definition));
        setSort(toDefaultSort(definition));
        setFilters([]);
        setResult(null);
        setActiveViewId(null);
        setErrorKey(null);
    }, [definition]);

    useEffect(() => {
        if (!definition) return;

        let mounted = true;
        const run = async () => {
            const defaultView = await loadViews();
            if (!mounted || options?.autoApply === false) return;

            const api = (window as any)?.electronAPI?.views;
            if (!api?.apply) {
                setErrorKey('error.views.api_missing');
                return;
            }

            const payload = {
                screenKey,
                filters: defaultView?.filters || [],
                columns: defaultView?.columns || toDefaultColumns(definition),
                sort: defaultView?.sort || toDefaultSort(definition),
                page: 1,
                pageSize,
                includeTotal: true,
            };

            setIsApplying(true);
            try {
                const nextResult = await api.apply(payload);
                if (mounted) {
                    setResult(nextResult || null);
                    setErrorKey(null);
                }
            } catch (error: any) {
                if (mounted) {
                    setErrorKey(String(error?.messageKey || 'error.views.apply_failed'));
                }
            } finally {
                if (mounted) {
                    setIsApplying(false);
                }
            }
        };

        run();

        return () => {
            mounted = false;
        };
    }, [definition, loadViews, options?.autoApply, pageSize, screenKey]);

    return {
        definition,
        filters,
        setFilters,
        columns,
        setColumns,
        sort,
        setSort,
        views,
        activeViewId,
        setActiveViewId,
        result,
        isLoadingViews,
        isApplying,
        errorKey,
        apply,
        loadViews,
        resetState,
        applySavedView,
        saveCurrentView,
        setDefaultView,
        deleteView,
    };
}

export function getVisibleColumns(
    definition: ScreenDefinition,
    columnsState: ScreenColumnStateItem[],
): ColumnSchema[] {
    const byKey = new Map(columnsState.map((x) => [x.key, x]));

    return definition.columnSchema
        .map((col) => ({
            schema: col,
            state: byKey.get(col.key),
        }))
        .filter(({ state, schema }) => (state ? state.visible : schema.defaultVisible))
        .sort((a, b) => {
            const leftOrder = a.state?.order ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = b.state?.order ?? Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder;
        })
        .map(({ schema }) => schema);
}
