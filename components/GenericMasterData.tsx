import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowDown,
    ArrowUp,
    Edit,
    Eye,
    EyeOff,
    FileText,
    Filter,
    LayoutTemplate,
    Plus,
    Save,
    Search,
    Trash2,
} from 'lucide-react';
import { useEnterNavigation } from '../src/hooks/useEnterNavigation';
import { getFloatingMenuPositionFromRect } from '../src/lib/floatingMenu';
import { authService } from '../services/authService';

interface Column {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'boolean';
}

interface GenericMasterDataProps {
    title: string;
    icon?: React.ReactNode;
    subtitle?: string;
    columns: Column[];
    tableName?: string;
    initialData?: any[];
}

type SortDirection = 'asc' | 'desc';
type Density = 'compact' | 'normal' | 'comfortable';

interface ViewTemplateSettings {
    columnOrder: string[];
    hiddenColumns: string[];
    sortBy: string | null;
    sortDirection: SortDirection;
    groupBy: string | null;
    density: Density;
    pageSize: number;
    tableHeight: number;
}

interface ViewTemplate {
    id: string;
    name: string;
    isDefault: boolean;
    settings: ViewTemplateSettings;
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

const VIEW_STORE_KEY = 'wafi.masterDataViewTemplates.v1';

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const translated = i18n.t(key);
        if (translated && translated !== key) return translated;
    }
    return fallback || key;
}

function safeParse<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

function normalizeColumnOrder(columns: Column[], maybeOrder: string[]): string[] {
    const valid = maybeOrder.filter((key) => columns.some((column) => column.key === key));
    const missing = columns.map((column) => column.key).filter((key) => !valid.includes(key));
    return [...valid, ...missing];
}

function getScopeKey(tableName: string | undefined, title: string): string {
    const user = authService.getCurrentUser();
    const userId = user?.username || user?.email || user?.role_name || 'guest';
    const tableKey = tableName || `title:${title}`;
    return `${userId}::${tableKey}`;
}

export const GenericMasterData: React.FC<GenericMasterDataProps> = ({
    title,
    icon,
    columns,
    tableName,
    initialData = [],
}) => {
    const [data, setData] = useState<any[]>(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [current, setCurrent] = useState<any>({});
    const [globalSearch, setGlobalSearch] = useState('');
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [activeColumnMenu, setActiveColumnMenu] = useState<ActiveColumnMenuState | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Array<number | string>>([]);

    const [sortBy, setSortBy] = useState<string | null>(columns[0]?.key || null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [groupBy, setGroupBy] = useState<string | null>(null);
    const [columnOrder, setColumnOrder] = useState<string[]>(columns.map((column) => column.key));
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [density, setDensity] = useState<Density>('normal');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const [tableHeight, setTableHeight] = useState(560);

    const [templates, setTemplates] = useState<ViewTemplate[]>([]);
    const [activeTemplateId, setActiveTemplateId] = useState<string>('');

    const formRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const scopeKey = useMemo(() => getScopeKey(tableName, title), [tableName, title]);

    const rowPaddingClass = density === 'compact'
        ? 'py-1 px-2 text-xs'
        : density === 'comfortable'
            ? 'py-4 px-4 text-sm'
            : 'py-2 px-3 text-sm';

    useEffect(() => {
        if (tableName) {
            void loadData();
        }
    }, [tableName]);

    useEffect(() => {
        setColumnOrder((prev) => normalizeColumnOrder(columns, prev));
        setSortBy((prev) => {
            if (!prev || !columns.some((column) => column.key === prev)) {
                return columns[0]?.key || null;
            }
            return prev;
        });
    }, [columns]);

    const loadData = async () => {
        setLoading(true);
        try {
            if ((window as any).electronAPI && tableName) {
                const rows = await (window as any).electronAPI.crudOperation({
                    operation: 'READ',
                    table: tableName,
                });
                setData(Array.isArray(rows) ? rows : []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const saveTemplates = (nextTemplates: ViewTemplate[]) => {
        const allTemplates = safeParse<Record<string, ViewTemplate[]>>(localStorage.getItem(VIEW_STORE_KEY), {});
        allTemplates[scopeKey] = nextTemplates;
        localStorage.setItem(VIEW_STORE_KEY, JSON.stringify(allTemplates));
        setTemplates(nextTemplates);
    };

    const captureSettings = (): ViewTemplateSettings => ({
        columnOrder,
        hiddenColumns,
        sortBy,
        sortDirection,
        groupBy,
        density,
        pageSize,
        tableHeight,
    });

    const applySettings = (settings: ViewTemplateSettings) => {
        setColumnOrder(normalizeColumnOrder(columns, settings.columnOrder));
        setHiddenColumns(settings.hiddenColumns.filter((key) => columns.some((column) => column.key === key)));
        setSortBy(settings.sortBy && columns.some((column) => column.key === settings.sortBy) ? settings.sortBy : columns[0]?.key || null);
        setSortDirection(settings.sortDirection || 'asc');
        setGroupBy(settings.groupBy && columns.some((column) => column.key === settings.groupBy) ? settings.groupBy : null);
        setDensity(settings.density || 'normal');
        setPageSize(Math.max(10, settings.pageSize || 25));
        setTableHeight(Math.max(320, settings.tableHeight || 560));
        setPage(1);
    };

    useEffect(() => {
        const allTemplates = safeParse<Record<string, ViewTemplate[]>>(localStorage.getItem(VIEW_STORE_KEY), {});
        const scopedTemplates = allTemplates[scopeKey] || [];
        setTemplates(scopedTemplates);

        const defaultTemplate = scopedTemplates.find((template) => template.isDefault);
        if (defaultTemplate) {
            setActiveTemplateId(defaultTemplate.id);
            applySettings(defaultTemplate.settings);
        } else {
            setActiveTemplateId('');
        }
    }, [scopeKey]);

    const createTemplate = () => {
        const name = window.prompt(tr('ui.view.prompt_name', 'Template name'), tr('ui.view.default_name', 'My View'));
        if (!name) return;

        const newTemplate: ViewTemplate = {
            id: `${Date.now()}`,
            name,
            isDefault: templates.length === 0,
            settings: captureSettings(),
        };

        const nextTemplates = [...templates, newTemplate];
        saveTemplates(nextTemplates);
        setActiveTemplateId(newTemplate.id);
    };

    const updateActiveTemplate = () => {
        if (!activeTemplateId) {
            createTemplate();
            return;
        }

        const nextTemplates = templates.map((template) => {
            if (template.id === activeTemplateId) {
                return { ...template, settings: captureSettings() };
            }
            return template;
        });

        saveTemplates(nextTemplates);
    };

    const setDefaultTemplate = () => {
        if (!activeTemplateId) return;

        const nextTemplates = templates.map((template) => ({
            ...template,
            isDefault: template.id === activeTemplateId,
        }));

        saveTemplates(nextTemplates);
    };

    const filteredData = useMemo(() => {
        const normalizedGlobalSearch = globalSearch.trim().toLowerCase();

        const rows = data.filter((item) => {
            const passesGlobal = normalizedGlobalSearch.length === 0 || Object.values(item).some((value) =>
                String(value ?? '').toLowerCase().includes(normalizedGlobalSearch),
            );

            if (!passesGlobal) return false;

            return columns.every((column) => {
                const filterValue = (columnFilters[column.key] || '').trim().toLowerCase();
                if (!filterValue) return true;
                return String(item[column.key] ?? '').toLowerCase().includes(filterValue);
            });
        });

        if (!sortBy) return rows;

        return [...rows].sort((a, b) => {
            const first = a[sortBy];
            const second = b[sortBy];

            if (first == null && second == null) return 0;
            if (first == null) return sortDirection === 'asc' ? -1 : 1;
            if (second == null) return sortDirection === 'asc' ? 1 : -1;

            if (typeof first === 'number' && typeof second === 'number') {
                return sortDirection === 'asc' ? first - second : second - first;
            }

            return sortDirection === 'asc'
                ? String(first).localeCompare(String(second), 'ar')
                : String(second).localeCompare(String(first), 'ar');
        });
    }, [data, globalSearch, columnFilters, columns, sortBy, sortDirection]);

    const pageCount = Math.max(1, Math.ceil(filteredData.length / pageSize));

    useEffect(() => {
        setPage((prev) => Math.min(prev, pageCount));
    }, [pageCount]);

    const pagedRows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, page, pageSize]);

    useEffect(() => {
        setSelectedIndex((prev) => Math.min(prev, Math.max(0, pagedRows.length - 1)));
    }, [pagedRows.length]);

    useEffect(() => {
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const insideMenu = target.closest('[data-column-filter-menu="1"]');
            const insideTrigger = target.closest('[data-column-filter-trigger="1"]');
            if (!insideMenu && !insideTrigger) {
                setActiveColumnMenu(null);
            }
        };

        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setActiveColumnMenu(null);
            }
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onEscape);

        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onEscape);
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

    const visibleColumns = useMemo(() => {
        const hidden = new Set(hiddenColumns);
        return columnOrder
            .map((key) => columns.find((column) => column.key === key))
            .filter((column): column is Column => !!column && !hidden.has(column.key));
    }, [columns, columnOrder, hiddenColumns]);

    const hasActiveColumnFilters = useMemo(() => Object.values(columnFilters).some((value) => String(value || '').trim().length > 0), [columnFilters]);

    const isColumnFilterActive = (columnKey: string) => String(columnFilters[columnKey] || '').trim().length > 0;

    const openColumnFilterMenu = (columnKey: string, triggerElement?: HTMLElement | null) => {
        const trigger = triggerElement || document.querySelector<HTMLElement>(`[data-column-filter-trigger-key="${columnKey}"]`);
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const position = getFloatingMenuPositionFromRect(rect, {
            menuWidth: 304,
            menuHeight: 260,
            preferredAlign: 'right',
            offset: 10,
            margin: 14,
            minHeight: 180,
        });

        setActiveColumnMenu({ key: columnKey, position });
    };

    const resetEditor = () => {
        setIsEditing(false);
        setCurrent({});
    };

    const handleSave = async () => {
        if (!current[columns[0].key]) return;

        try {
            if ((window as any).electronAPI && tableName) {
                if (isEditing) {
                    await (window as any).electronAPI.crudOperation({
                        operation: 'UPDATE',
                        table: tableName,
                        data: current,
                        id: current.id,
                    });
                } else {
                    await (window as any).electronAPI.crudOperation({
                        operation: 'CREATE',
                        table: tableName,
                        data: current,
                    });
                }
                await loadData();
            } else if (isEditing) {
                setData((prev) => prev.map((item) => item.id === current.id ? current : item));
            } else {
                setData((prev) => [...prev, { ...current, id: Date.now() }]);
            }
        } catch (error) {
            alert(`${tr('error.generic.save_failed', 'Save failed')}: ${error}`);
        }

        resetEditor();
    };

    const handleEdit = (item: any) => {
        setCurrent(item);
        setIsEditing(true);
    };

    const handleDelete = async (id: number | string) => {
        try {
            if ((window as any).electronAPI && tableName) {
                await (window as any).electronAPI.crudOperation({
                    operation: 'DELETE',
                    table: tableName,
                    id,
                });
                await loadData();
            } else {
                setData((prev) => prev.filter((item) => item.id !== id));
            }
        } catch (error: any) {
            alert(error.message);
        }
    };

    const deleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(tr('ui.confirm.delete_multiple', `Delete ${selectedIds.length} selected records?`))) return;

        for (const id of selectedIds) {
            await handleDelete(id);
        }
        setSelectedIds([]);
    };

    const toggleSort = (columnKey: string) => {
        if (sortBy !== columnKey) {
            setSortBy(columnKey);
            setSortDirection('asc');
            return;
        }
        setSortDirection((prev) => prev === 'asc' ? 'desc' : 'asc');
    };

    const toggleColumnVisibility = (columnKey: string) => {
        setHiddenColumns((prev) => prev.includes(columnKey)
            ? prev.filter((key) => key !== columnKey)
            : [...prev, columnKey]);
    };

    const moveColumn = (columnKey: string, direction: -1 | 1) => {
        setColumnOrder((prev) => {
            const index = prev.indexOf(columnKey);
            if (index < 0) return prev;
            const target = index + direction;
            if (target < 0 || target >= prev.length) return prev;

            const copy = [...prev];
            const [moved] = copy.splice(index, 1);
            copy.splice(target, 0, moved);
            return copy;
        });
    };

    const toggleSelectRow = (id: number | string) => {
        setSelectedIds((prev) => prev.includes(id)
            ? prev.filter((value) => value !== id)
            : [...prev, id]);
    };

    const allPageSelected = pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id));

    useEnterNavigation(formRef, {
        enabled: true,
        onCommit: () => {
            void handleSave();
        },
    });

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
                return;
            }

            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
                if (event.key === 'Escape') {
                    (event.target as HTMLElement).blur();
                    listRef.current?.focus();
                }
                return;
            }

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, pagedRows.length - 1)));
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Delete':
                    event.preventDefault();
                    if (selectedIds.length > 0) {
                        void deleteSelected();
                    } else if (pagedRows[selectedIndex]) {
                        void handleDelete(pagedRows[selectedIndex].id);
                    }
                    break;
                case 'F3':
                    event.preventDefault();
                    resetEditor();
                    requestAnimationFrame(() => {
                        const firstField = formRef.current?.querySelector('input, select, textarea') as HTMLElement | null;
                        firstField?.focus();
                    });
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [pagedRows, selectedIndex, selectedIds]);

    return (
        <div className="min-h-screen bg-[#eef1f6] p-4 md:p-6">
            <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-800">
                {icon || <FileText className="text-gray-600" />} {title}
            </h1>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div ref={formRef} className="h-fit rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 border-b pb-2 text-sm font-bold text-slate-700">
                        {isEditing ? tr('ui.master.edit_record', 'Edit Record') : tr('ui.master.new_record', 'New Record')}
                    </h2>

                    <div className="space-y-3">
                        {columns.map((column) => (
                            <div key={column.key}>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">{column.label}</label>
                                {column.type === 'boolean' ? (
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded text-emerald-600"
                                            checked={current[column.key] === 1 || current[column.key] === true}
                                            onChange={(event) => setCurrent({ ...current, [column.key]: event.target.checked ? 1 : 0 })}
                                        />
                                        <span className="text-sm text-gray-500">{tr('ui.common.active', 'Active')}</span>
                                    </div>
                                ) : (
                                    <input
                                        type={column.type || 'text'}
                                        className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                                        value={current[column.key] || ''}
                                        onChange={(event) => setCurrent({ ...current, [column.key]: event.target.value })}
                                    />
                                )}
                            </div>
                        ))}

                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => void handleSave()}
                                className="flex flex-1 items-center justify-center gap-2 rounded bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                            >
                                <Save size={17} /> {tr('ui.common.save', 'Save')}
                            </button>
                            {isEditing && (
                                <button
                                    onClick={resetEditor}
                                    className="rounded bg-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-300"
                                >
                                    {tr('ui.common.cancel', 'Cancel')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:col-span-2">
                    <div className="border-b border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <button
                                onClick={resetEditor}
                                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                <Plus size={14} /> {tr('ui.action.new', 'New')}
                            </button>
                            <button
                                disabled={selectedIds.length !== 1}
                                onClick={() => {
                                    const row = pagedRows.find((item) => item.id === selectedIds[0]);
                                    if (row) handleEdit(row);
                                }}
                                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            >
                                <Edit size={14} /> {tr('ui.action.edit', 'Edit')}
                            </button>
                            <button
                                disabled={selectedIds.length === 0}
                                onClick={() => void deleteSelected()}
                                className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                            >
                                <Trash2 size={14} /> {tr('ui.action.delete', 'Delete')} ({selectedIds.length})
                            </button>

                            <div className="mx-1 h-5 w-px bg-slate-200" />

                            <button
                                onClick={createTemplate}
                                className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                            >
                                <LayoutTemplate size={14} /> {tr('ui.view.save_new', 'Save View')}
                            </button>
                            <button
                                onClick={updateActiveTemplate}
                                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                <Save size={14} /> {tr('ui.view.update', 'Update View')}
                            </button>
                            <button
                                disabled={!activeTemplateId}
                                onClick={setDefaultTemplate}
                                className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                            >
                                {tr('ui.view.set_default', 'Set Default')}
                            </button>

                            <select
                                value={activeTemplateId}
                                onChange={(event) => {
                                    const templateId = event.target.value;
                                    setActiveTemplateId(templateId);
                                    const selectedTemplate = templates.find((template) => template.id === templateId);
                                    if (selectedTemplate) {
                                        applySettings(selectedTemplate.settings);
                                    }
                                }}
                                className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                            >
                                <option value="">{tr('ui.view.current', 'Current View')}</option>
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.name} {template.isDefault ? `(${tr('ui.view.default', 'Default')})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                            <div className="relative">
                                <input
                                    ref={searchInputRef}
                                    className="w-full rounded border border-slate-300 bg-white p-2 pr-8 text-sm"
                                    placeholder={tr('ui.list.search_placeholder', 'Search all columns...')}
                                    value={globalSearch}
                                    onChange={(event) => setGlobalSearch(event.target.value)}
                                />
                                <Search size={16} className="absolute right-2 top-2.5 text-gray-400" />
                            </div>

                            <select
                                value={groupBy || ''}
                                onChange={(event) => setGroupBy(event.target.value || null)}
                                className="rounded border border-slate-300 bg-white px-2 py-2 text-sm"
                            >
                                <option value="">{tr('ui.group.none', 'No Grouping')}</option>
                                {columns.map((column) => (
                                    <option key={column.key} value={column.key}>{column.label}</option>
                                ))}
                            </select>

                            <select
                                value={density}
                                onChange={(event) => setDensity(event.target.value as Density)}
                                className="rounded border border-slate-300 bg-white px-2 py-2 text-sm"
                            >
                                <option value="compact">{tr('ui.grid.compact', 'Compact')}</option>
                                <option value="normal">{tr('ui.grid.normal', 'Normal')}</option>
                                <option value="comfortable">{tr('ui.grid.comfortable', 'Comfortable')}</option>
                            </select>

                            <div className="flex items-center gap-2 rounded border border-slate-300 bg-white px-2">
                                <span className="text-xs font-semibold text-slate-600">{tr('ui.grid.height', 'Grid Height')}</span>
                                <input
                                    type="range"
                                    min={320}
                                    max={760}
                                    step={20}
                                    value={tableHeight}
                                    onChange={(event) => setTableHeight(Number(event.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <details className="mt-2 rounded border border-slate-200 bg-white p-2">
                            <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                                {tr('ui.columns.manage', 'Manage Columns and Order')}
                            </summary>
                            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                                {columnOrder.map((key, index) => {
                                    const column = columns.find((item) => item.key === key);
                                    if (!column) return null;
                                    const hidden = hiddenColumns.includes(key);

                                    return (
                                        <div key={key} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleColumnVisibility(key)}
                                                    className="rounded p-1 hover:bg-slate-100"
                                                    title={hidden ? tr('ui.columns.show', 'Show') : tr('ui.columns.hide', 'Hide')}
                                                >
                                                    {hidden ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-emerald-600" />}
                                                </button>
                                                <span className={`text-xs ${hidden ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{column.label}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    disabled={index === 0}
                                                    onClick={() => moveColumn(key, -1)}
                                                    className="rounded border border-slate-200 p-1 disabled:opacity-30"
                                                >
                                                    <ArrowUp size={12} />
                                                </button>
                                                <button
                                                    disabled={index === columnOrder.length - 1}
                                                    onClick={() => moveColumn(key, 1)}
                                                    className="rounded border border-slate-200 p-1 disabled:opacity-30"
                                                >
                                                    <ArrowDown size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </details>
                    </div>

                    <div
                        ref={listRef}
                        tabIndex={-1}
                        className="overflow-auto outline-none"
                        style={{ maxHeight: `${tableHeight}px` }}
                    >
                        <table className="w-full text-right">
                            <thead className="sticky top-0 z-10 border-b bg-slate-100 text-slate-700">
                                <tr>
                                    <th className={rowPaddingClass}>
                                        <input
                                            type="checkbox"
                                            checked={allPageSelected}
                                            onChange={(event) => {
                                                if (event.target.checked) {
                                                    setSelectedIds((prev) => {
                                                        const merged = new Set([...prev, ...pagedRows.map((row) => row.id)]);
                                                        return Array.from(merged);
                                                    });
                                                } else {
                                                    setSelectedIds((prev) => prev.filter((id) => !pagedRows.some((row) => row.id === id)));
                                                }
                                            }}
                                        />
                                    </th>
                                    {visibleColumns.map((column) => {
                                        const isSorted = sortBy === column.key;
                                        return (
                                            <th key={column.key} className={`${rowPaddingClass} relative cursor-pointer select-none`} onClick={() => toggleSort(column.key)}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            <span className="truncate font-bold">{column.label}</span>
                                                            {isSorted && (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                        </div>
                                                        {isColumnFilterActive(column.key) && (
                                                            <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                                                                {columnFilters[column.key]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        data-column-filter-trigger="1"
                                                        data-column-filter-trigger-key={column.key}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            if (activeColumnMenu?.key === column.key) {
                                                                setActiveColumnMenu(null);
                                                                return;
                                                            }
                                                            openColumnFilterMenu(column.key, event.currentTarget);
                                                        }}
                                                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${isColumnFilterActive(column.key)
                                                            ? 'border-sky-300 bg-sky-100 text-sky-700 shadow-sm shadow-sky-100/80'
                                                            : 'border-slate-200 bg-white/90 text-slate-500 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'}`}
                                                        title={`${tr('ui.filter.by', 'Filter by')} ${column.label}`}
                                                        aria-label={`${tr('ui.filter.by', 'Filter by')} ${column.label}`}
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
                                                                        <div className="text-sm font-extrabold text-slate-800">{column.label}</div>
                                                                        <div className="mt-1 text-[11px] text-slate-500">اكتب قيمة لتصفية هذا العمود مباشرة.</div>
                                                                    </div>
                                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isColumnFilterActive(column.key) ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                        {isColumnFilterActive(column.key) ? 'مفلتر' : 'بدون فلتر'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3 p-4">
                                                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                                                                    <label className="mb-1.5 block text-[11px] font-bold text-slate-500">قيمة التصفية</label>
                                                                    <input
                                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                                                        placeholder={`${tr('ui.filter.by', 'Filter by')} ${column.label}`}
                                                                        value={columnFilters[column.key] || ''}
                                                                        onChange={(event) => {
                                                                            setColumnFilters((prev) => ({ ...prev, [column.key]: event.target.value }));
                                                                            setPage(1);
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setColumnFilters((prev) => ({ ...prev, [column.key]: '' }));
                                                                            setPage(1);
                                                                        }}
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
                                        );
                                    })}
                                    <th className={rowPaddingClass}>{tr('ui.actions', 'Actions')}</th>
                                </tr>
                                {hasActiveColumnFilters && (
                                    <tr className="border-t bg-white/95">
                                        <th colSpan={visibleColumns.length + 2} className="px-3 py-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {visibleColumns.filter((column) => isColumnFilterActive(column.key)).map((column) => (
                                                    <button
                                                        key={`filter-chip-${column.key}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setColumnFilters((prev) => ({ ...prev, [column.key]: '' }));
                                                            setPage(1);
                                                        }}
                                                        className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800 transition hover:bg-sky-200"
                                                    >
                                                        {column.label}: {columnFilters[column.key]} ×
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setColumnFilters({});
                                                        setGlobalSearch('');
                                                        setPage(1);
                                                    }}
                                                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                                                >
                                                    {tr('ui.filter.clear', 'Clear')}
                                                </button>
                                            </div>
                                        </th>
                                    </tr>
                                )}
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={visibleColumns.length + 2} className="p-8 text-center text-gray-500">
                                            {tr('ui.list.loading', 'Loading...')}
                                        </td>
                                    </tr>
                                ) : pagedRows.length > 0 ? (
                                    pagedRows.map((item, index) => {
                                        const selected = selectedIds.includes(item.id);
                                        const previousRow = index > 0 ? pagedRows[index - 1] : null;
                                        const showGroupBreak = !!groupBy && previousRow && previousRow[groupBy] !== item[groupBy];

                                        return (
                                            <React.Fragment key={item.id}>
                                                {showGroupBreak && (
                                                    <tr className="bg-amber-50">
                                                        <td colSpan={visibleColumns.length + 2} className="px-3 py-1 text-xs font-semibold text-amber-700">
                                                            {columns.find((column) => column.key === groupBy)?.label}: {String(item[groupBy || ''] ?? '-')}
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr
                                                    onClick={() => {
                                                        setSelectedIndex(index);
                                                        toggleSelectRow(item.id);
                                                    }}
                                                    onDoubleClick={() => handleEdit(item)}
                                                    className={`border-b transition ${selected ? 'bg-sky-50' : 'hover:bg-slate-50'} ${selectedIndex === index ? 'ring-1 ring-inset ring-sky-200' : ''}`}
                                                >
                                                    <td className={rowPaddingClass}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => toggleSelectRow(item.id)}
                                                            onClick={(event) => event.stopPropagation()}
                                                        />
                                                    </td>
                                                    {visibleColumns.map((column) => (
                                                        <td key={column.key} className={rowPaddingClass}>
                                                            {column.type === 'boolean'
                                                                ? ((item[column.key] === 1 || item[column.key] === true)
                                                                    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{tr('ui.boolean.yes', 'Yes')}</span>
                                                                    : <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">{tr('ui.boolean.no', 'No')}</span>)
                                                                : item[column.key]}
                                                        </td>
                                                    ))}
                                                    <td className={rowPaddingClass}>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    handleEdit(item);
                                                                }}
                                                                className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    void handleDelete(item.id);
                                                                }}
                                                                className="rounded p-1 text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={visibleColumns.length + 2} className="p-8 text-center text-gray-400">
                                            {tr('ui.list.empty', 'No data available')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <div>
                            {tr('ui.list.count', 'Count')}: {filteredData.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <span>{tr('ui.grid.rows_per_page', 'Rows/Page')}</span>
                            <select
                                value={pageSize}
                                onChange={(event) => {
                                    setPageSize(Number(event.target.value));
                                    setPage(1);
                                }}
                                className="rounded border border-slate-300 bg-white px-2 py-1"
                            >
                                {[10, 25, 50, 100].map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
                            >
                                {tr('ui.common.prev', 'Prev')}
                            </button>
                            <span>{page} / {pageCount}</span>
                            <button
                                disabled={page >= pageCount}
                                onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                                className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
                            >
                                {tr('ui.common.next', 'Next')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
