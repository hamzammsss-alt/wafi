import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { DocumentDefinition, ColumnConfig } from '../../types/DocumentDefinition';
import { DocumentStatusBadge } from '../../components/ui/DocumentStatusBadge';
import { DefinitionMasterList, type DefinitionListColumn } from '../../components/definitions/DefinitionMasterList';
import { getDocumentStatusConfig, getDocumentStatusOptions } from '../../constants/documentStatus';

interface DocumentListPageProps {
    definition: DocumentDefinition<any, any>;
    hideFilterBar?: boolean;
}

type DocumentRow = Record<string, any>;

const NUMBER_KEY_PATTERN = /(amount|balance|count|credit|debit|discount|grand|price|qty|quantity|rate|subtotal|tax|total|value)/i;
const DATE_KEY_PATTERN = /(date|time|created|updated)/i;

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const translated = i18n.t(key);
        if (translated && translated !== key) return translated;
    }
    return fallback || key;
}

function getColumnWidth(width: ColumnConfig['width'], fallback = 150): number {
    if (typeof width === 'number' && Number.isFinite(width)) return width;
    if (typeof width === 'string') {
        if (width.trim().endsWith('%')) return fallback;
        const parsed = Number.parseInt(width, 10);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return fallback;
}

function getColumnType(column: ColumnConfig): DefinitionListColumn<DocumentRow>['type'] {
    const key = String(column.key || '').toLowerCase();
    if (key === 'status') return 'enum';
    if (column.inputType === 'number') return 'number';
    if (column.inputType === 'date') return 'date';
    if (column.inputType === 'select' || column.options?.length) return 'enum';
    if (DATE_KEY_PATTERN.test(key)) return 'date';
    if (NUMBER_KEY_PATTERN.test(key)) return 'number';
    return 'text';
}

function formatNumber(value: unknown): string {
    if (value == null || String(value).trim() === '') return '-';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return String(value);
    return parsed.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

function formatDate(value: unknown): string {
    if (!value) return '-';
    const raw = String(value).trim();
    if (!raw) return '-';
    const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (isoDate) return isoDate;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toISOString().slice(0, 10);
}

function formatCellValue(type: DefinitionListColumn<DocumentRow>['type'], value: unknown): string {
    if (type === 'number') return formatNumber(value);
    if (type === 'date') return formatDate(value);
    if (value == null || String(value).trim() === '') return '-';
    return String(value);
}

function getStatusDisplayValue(status: unknown, statusOptions: ReturnType<typeof getDocumentStatusOptions>): string {
    const raw = String(status || '').trim();
    const direct = statusOptions.find((option) => option.value === raw);
    const config = direct || getDocumentStatusConfig(raw);
    return tr(config.labelI18nKey, config.label);
}

function getColumnOptions(column: ColumnConfig) {
    return (column.options || [])
        .map((option) => {
            const value = String(option.value ?? option.id ?? '').trim();
            const label = String(option.label ?? option.name ?? option.value ?? option.id ?? '').trim();
            return value ? { value, label: label || value } : null;
        })
        .filter(Boolean) as Array<{ value: string; label: string }>;
}

export default function DocumentListPage({ definition }: DocumentListPageProps) {
    const navigate = useNavigate();
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'rtl';

    const [rows, setRows] = useState<DocumentRow[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedRows, setSelectedRows] = useState<DocumentRow[]>([]);

    const pageRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<any>(null);
    const statusOptions = useMemo(() => getDocumentStatusOptions(definition.statusRules), [definition.statusRules]);
    const statusFilterOptions = useMemo(
        () => statusOptions.map((option) => ({
            value: option.value,
            label: tr(option.labelI18nKey, option.label),
        })),
        [statusOptions],
    );
    const hasStatusColumn = useMemo(
        () => definition.listColumns.some((column) => String(column.key || '').toLowerCase() === 'status'),
        [definition.listColumns],
    );

    const openDocument = useCallback((row: DocumentRow) => {
        const id = String(row?.id || '').trim();
        if (!id) return;
        navigate(definition.docRoute.replace(':id', id));
    }, [definition.docRoute, navigate]);

    const loadData = useCallback(async (reset = false) => {
        try {
            setLoading(true);
            const currentCursor = reset ? null : cursorRef.current;

            const result = await definition.client.list({
                search: '',
                status: 'ALL',
                dateFrom: '',
                dateTo: '',
                cursor: currentCursor,
                limit: 50,
            });

            if (!result.ok) return;

            const nextRows = result.data.rows || [];
            if (reset) {
                setRows(nextRows);
                setSelectedRows([]);
                setSelectedIndex(0);
            } else {
                setRows((previousRows) => [...previousRows, ...nextRows]);
            }

            cursorRef.current = result.data.next_cursor;
            setHasMore(Boolean(result.data.next_cursor));
        } catch (error) {
            console.error('Failed to load list', error);
        } finally {
            setLoading(false);
        }
    }, [definition.client]);

    useEffect(() => {
        cursorRef.current = null;
        void loadData(true);
    }, [definition.docType, loadData]);

    const handleCreate = useCallback(async () => {
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
    }, [definition.client, definition.docRoute, navigate]);

    const handleSelectedRowsChange = useCallback((nextRows: DocumentRow[]) => {
        setSelectedRows(nextRows);
        const selectedId = String(nextRows[0]?.id || '').trim();
        if (!selectedId) return;
        const nextIndex = rows.findIndex((row) => String(row?.id || '') === selectedId);
        if (nextIndex >= 0) setSelectedIndex(nextIndex);
    }, [rows]);

    const listColumns = useMemo<DefinitionListColumn<DocumentRow>[]>(() => {
        const mappedColumns = definition.listColumns.map<DefinitionListColumn<DocumentRow>>((column) => {
            const key = String(column.key || '');
            const normalizedKey = key.toLowerCase();
            const type = getColumnType(column);
            const isStatusColumn = normalizedKey === 'status';
            const options = isStatusColumn ? statusFilterOptions : getColumnOptions(column);

            return {
                key,
                label: column.label,
                type,
                filterType: type === 'enum' ? 'enum' : type,
                options,
                width: getColumnWidth(column.width),
                defaultVisible: true,
                sortable: true,
                filterable: true,
                searchable: true,
                align: column.align || (type === 'number' ? 'right' : 'right'),
                getValue: (row) => row?.[key],
                getSearchValue: (row) => {
                    if (isStatusColumn) return getStatusDisplayValue(row?.[key], statusOptions);
                    return formatCellValue(type, row?.[key]);
                },
                getDisplayValue: (row) => {
                    if (isStatusColumn) return getStatusDisplayValue(row?.[key], statusOptions);
                    return formatCellValue(type, row?.[key]);
                },
                renderCell: (row) => {
                    if (isStatusColumn) return <DocumentStatusBadge status={row?.[key]} />;
                    if (column.render) return column.render(row?.[key], row);

                    const displayValue = formatCellValue(type, row?.[key]);
                    if (normalizedKey === 'code' || normalizedKey.endsWith('_no') || normalizedKey.endsWith('_number')) {
                        return <span className="font-mono text-[13px] font-semibold text-sky-700">{displayValue}</span>;
                    }
                    if (type === 'number') {
                        return <span className="font-mono tabular-nums">{displayValue}</span>;
                    }
                    return displayValue;
                },
            };
        });

        if (!hasStatusColumn) {
            mappedColumns.push({
                key: 'status',
                label: tr('status.label', 'الحالة'),
                type: 'enum',
                filterType: 'enum',
                options: statusFilterOptions,
                width: 140,
                defaultVisible: true,
                sortable: true,
                filterable: true,
                searchable: true,
                align: 'center',
                getValue: (row) => row?.status,
                getSearchValue: (row) => getStatusDisplayValue(row?.status, statusOptions),
                getDisplayValue: (row) => getStatusDisplayValue(row?.status, statusOptions),
                renderCell: (row) => <DocumentStatusBadge status={row?.status} />,
            });
        }

        mappedColumns.push({
            key: 'actions',
            label: tr('ui.actions', 'إجراءات'),
            type: 'text',
            filterType: 'text',
            width: 110,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (row) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        openDocument(row);
                    }}
                    className="inline-flex h-8 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                >
                    {tr('ui.list.open', 'فتح')}
                </button>
            ),
        });

        return mappedColumns;
    }, [definition.listColumns, hasStatusColumn, openDocument, statusFilterOptions, statusOptions]);

    const headerBadges = useMemo(() => {
        const badges = [
            {
                label: `${rows.length} ${tr('ui.list.records', 'سجل')}`,
                tone: 'info' as const,
                mono: true,
            },
        ];

        if (hasMore) {
            badges.push({
                label: tr('ui.list.has_more', 'يوجد المزيد'),
                tone: 'warning' as const,
                mono: false,
            });
        }

        return badges;
    }, [hasMore, rows.length]);

    const defaultSort = useMemo(() => {
        const dateColumn = definition.listColumns.find((column) => DATE_KEY_PATTERN.test(String(column.key || '')));
        const fallbackColumn = dateColumn || definition.listColumns[0];
        return {
            key: String(fallbackColumn?.key || 'id'),
            direction: dateColumn ? 'desc' as const : 'asc' as const,
        };
    }, [definition.listColumns]);

    const toolbarExtraActions = useMemo(() => {
        if (!hasMore) return null;
        return (
            <button
                type="button"
                onClick={() => void loadData(false)}
                disabled={loading}
                className="inline-flex h-11 items-center rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {tr('ui.list.load_more', 'تحميل المزيد')} (PageDown)
            </button>
        );
    }, [hasMore, loadData, loading]);

    const getRowKey = useCallback((row: DocumentRow) => String(row?.id || ''), []);

    useEffect(() => {
        const handleKeyDown = async (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                const searchInput = pageRef.current?.querySelector<HTMLInputElement>('input[type="text"]');
                searchInput?.focus();
                searchInput?.select();
                return;
            }

            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
                if (event.key === 'Escape') {
                    (event.target as HTMLElement).blur();
                    pageRef.current?.focus();
                }
                return;
            }

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setSelectedIndex((previousIndex) => Math.min(previousIndex + 1, rows.length - 1));
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setSelectedIndex((previousIndex) => Math.max(previousIndex - 1, 0));
                    break;
                case 'Enter': {
                    event.preventDefault();
                    const selectedRow = selectedRows[0] || rows[selectedIndex];
                    if (selectedRow) openDocument(selectedRow);
                    break;
                }
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
                    pageRef.current?.focus();
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
    }, [handleCreate, hasMore, loadData, loading, navigate, openDocument, rows, selectedIndex, selectedRows]);

    return (
        <div className="app-page relative flex h-full flex-col gap-4 outline-none" tabIndex={-1} ref={pageRef} dir={currentDir}>
            <DefinitionMasterList
                headerIcon={<FileText className="h-5 w-5" />}
                headerTitle={definition.title}
                headerSubtitle={tr('ui.list.document_subtitle', 'إدارة المستندات والبحث والتصفية حسب الأعمدة.')}
                headerBadges={headerBadges}
                screenKey={definition.screenKey || `${definition.docType}.list`}
                data={rows}
                loading={loading}
                columns={listColumns}
                rowKey={getRowKey}
                searchPlaceholder={tr('ui.list.search_placeholder', 'Search...')}
                emptyMessage={tr('ui.list.empty', 'No records found')}
                createLabel={`(F3) ${tr('ui.list.new', 'New')}`}
                onCreate={handleCreate}
                onEdit={openDocument}
                onRefresh={() => loadData(true)}
                toolbarExtraActions={toolbarExtraActions}
                defaultSort={defaultSort}
                onRowDoubleClick={openDocument}
                onSelectedRowsChange={handleSelectedRowsChange}
                className="min-h-0"
            />
        </div>
    );
}
