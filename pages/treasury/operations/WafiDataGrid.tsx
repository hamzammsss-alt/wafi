import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Filter, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface WafiColumnDef<T> {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    getValue?: (row: T) => string;
    renderCell?: (row: T) => React.ReactNode;
    renderFooter?: (data: T[]) => React.ReactNode;
}

interface WafiDataGridProps<T> {
    data: T[];
    columns: WafiColumnDef<T>[];
    keyExtractor: (row: T) => string;
    loading?: boolean;
    emptyMessage?: string;

    selectedRowIds: string[];
    onSelectionChange: (ids: string[] | ((prev: string[]) => string[])) => void;

    visibleColumns: string[];
    onVisibleColumnsChange: (cols: string[] | ((prev: string[]) => string[])) => void;

    columnWidths: Record<string, number>;
    onColumnWidthsChange: (widths: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;

    sortKey: string;
    sortDir: 'asc' | 'desc';
    onSortChange: (key: string, dir: 'asc' | 'desc') => void;

    rowDensity?: 'comfortable' | 'compact';

    onHeaderContextMenu?: (e: React.MouseEvent, colKey: string, label: string) => void;
    onCellContextMenu?: (e: React.MouseEvent, colKey: string, label: string, cellValue: string, rowId: string) => void;
    onRowDoubleClick?: (row: T) => void;

    columnFilters?: Record<string, any>;
    onFilterClick?: (e: React.MouseEvent, colKey: string, label: string) => void;
    activeFilterColumn?: string | null;
    groupBy?: string | null;
    virtualized?: boolean;
    onRowReorder?: (sourceId: string, targetId: string) => void;
    showRowNumbers?: boolean;
}

export interface WafiDataGridHandle {
    exportToExcel: (filename?: string, sheetName?: string) => void;
    exportToPdf: (title?: string) => void;
}

const WafiDataGridInner = <T extends unknown>(
    {
        data, columns, keyExtractor, loading, emptyMessage = 'لا توجد بيانات',
        selectedRowIds, onSelectionChange, visibleColumns, onVisibleColumnsChange,
        columnWidths, onColumnWidthsChange, sortKey, sortDir, onSortChange,
        rowDensity = 'comfortable', onHeaderContextMenu, onCellContextMenu,
        onRowDoubleClick, columnFilters = {}, onFilterClick, activeFilterColumn,
        groupBy, virtualized = false, onRowReorder, showRowNumbers = false
    }: WafiDataGridProps<T>,
    ref: React.ForwardedRef<WafiDataGridHandle>
) => {
    const [draggedCol, setDraggedCol] = useState<string | null>(null);
    const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
    const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const toggleGroup = (groupVal: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupVal]: prev[groupVal] === false ? true : false }));
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (virtualized) {
            setScrollTop(e.currentTarget.scrollTop);
        }
    };

    const groupedData = React.useMemo(() => {
        if (!groupBy) return null;
        const groups: Record<string, T[]> = {};
        data.forEach(row => {
            const col = columns.find(c => c.key === groupBy);
            const groupVal = col?.getValue ? col.getValue(row) : String((row as any)[groupBy] || '-');
            const safeGroupVal = groupVal || '-';
            if (!groups[safeGroupVal]) groups[safeGroupVal] = [];
            groups[safeGroupVal].push(row);
        });
        return groups;
    }, [data, groupBy, columns]);

    useImperativeHandle(ref, () => ({
        exportToExcel: (filename = 'تصدير_البيانات.xlsx', sheetName = 'البيانات') => {
            const records = data.map(row => {
                const record: Record<string, string> = {};
                visibleColumns.forEach(colKey => {
                    const col = columns.find(c => c.key === colKey);
                    if (col) {
                        record[col.label] = col.getValue ? col.getValue(row) : String((row as any)[colKey] || '');
                    }
                });
                return record;
            });

            const ws = XLSX.utils.json_to_sheet(records);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            XLSX.writeFile(wb, filename);
        },
        exportToPdf: (title = 'البيانات') => {
            const escapeHtml = (value: string) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            const activeCols = visibleColumns.map(colKey => columns.find(c => c.key === colKey)).filter(Boolean) as WafiColumnDef<T>[];
            const headerRow = activeCols.map(col => `<th>${escapeHtml(col.label)}</th>`).join('');
            
            const bodyRows = data.map(row => {
                const cells = activeCols.map(col => {
                    const cellText = col.getValue ? col.getValue(row) : String((row as any)[col.key] || '');
                    return `<td>${escapeHtml(cellText)}</td>`;
                }).join('');
                return `<tr>${cells}</tr>`;
            }).join('');

            const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:system-ui, sans-serif;padding:24px;color:#0f172a;}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;}th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:right;}th{background:#f8fafc;font-weight:700;color:#334155;}tr:nth-child(even){background:#f8fafc;}h1{font-size:24px;margin-bottom:8px;color:#0f172a;}@media print{body{padding:0;}@page{margin:1.5cm;}}</style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
            
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => printWindow.print(), 250);
            }
        }
    }));

    const rowClass = rowDensity === 'compact' ? 'px-3 py-1.5' : 'px-3 py-2.5';
    const thCls = `${rowClass} border-b border-l border-slate-200 bg-slate-50 align-middle first:border-r`;
    const tdCls = `${rowClass} border border-[#d7e9fb] text-[13px]`;

    const handleResizeStart = (e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        const th = (e.target as HTMLElement).closest('th');
        if (!th) return;
        const startX = e.clientX;
        const startWidth = th.getBoundingClientRect().width;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const delta = startX - moveEvent.clientX; // RTL support
            const newWidth = Math.max(60, startWidth + delta);
            onColumnWidthsChange((prev: Record<string, number>) => ({ ...prev, [key]: newWidth }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleSort = (key: string) => {
        if (sortKey === key) {
            onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            onSortChange(key, 'asc');
        }
    };

    const toggleSelectAll = () => {
        if (selectedRowIds.length === data.length && data.length > 0) {
            onSelectionChange([]);
        } else {
            onSelectionChange(data.map(keyExtractor));
        }
    };

    const toggleRowSelection = (id: string, multiSelect: boolean) => {
        onSelectionChange((prev: string[]) => {
            if (!multiSelect) return prev.includes(id) && prev.length === 1 ? [] : [id];
            return prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id];
        });
    };

    const handleCellDoubleClick = (e: React.MouseEvent, text: string) => {
        e.stopPropagation();
        if (!text || text === '-') return;
        navigator.clipboard.writeText(text).catch(() => {});
        const el = e.currentTarget as HTMLElement;
        const prevBg = el.style.backgroundColor;
        el.style.backgroundColor = '#dcfce7'; // تأثير النسخ الناجح
        el.style.transition = 'background-color 0.3s ease';
        setTimeout(() => {
            el.style.backgroundColor = prevBg;
            setTimeout(() => { el.style.transition = ''; }, 300);
        }, 300);
    };

    const hasFooter = visibleColumns.some(colKey => columns.find(c => c.key === colKey)?.renderFooter);

    type FlatItem = 
        | { type: 'group'; groupVal: string; groupRows: T[] }
        | { type: 'row'; row: T; index: number };

    const flatItems: FlatItem[] = React.useMemo(() => {
        let runningIndex = 0;
        if (groupedData) {
            const flat: FlatItem[] = [];
            Object.entries(groupedData).forEach(([groupVal, groupRows]) => {
                flat.push({ type: 'group', groupVal, groupRows });
                if (expandedGroups[groupVal] !== false) {
                    groupRows.forEach(row => flat.push({ type: 'row', row, index: runningIndex++ }));
                }
            });
            return flat;
        }
        return data.map(row => ({ type: 'row', row, index: runningIndex++ }));
    }, [data, groupedData, expandedGroups]);

    const ROW_HEIGHT = rowDensity === 'compact' ? 36 : 46;
    const OVERSCAN = 15;
    const VISIBLE_ROWS = 30;

    const startIndex = virtualized ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
    const endIndex = virtualized ? Math.min(flatItems.length - 1, startIndex + VISIBLE_ROWS + (OVERSCAN * 2)) : flatItems.length - 1;

    const visibleItems = flatItems.slice(startIndex, endIndex + 1);
    const paddingTop = virtualized ? startIndex * ROW_HEIGHT : 0;
    const paddingBottom = virtualized ? Math.max(0, (flatItems.length - 1 - endIndex) * ROW_HEIGHT) : 0;

    return (
        <div ref={containerRef} className="overflow-auto custom-scrollbar flex-1 min-h-0" onScroll={handleScroll}>
            <table className="w-full border-separate border-spacing-0 text-right text-[13px] text-slate-700">
                <thead className="sticky top-0 z-20 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                    <tr>
                        <th className={`${thCls} text-center w-12`}>
                            <input
                                type="checkbox"
                                checked={selectedRowIds.length === data.length && data.length > 0}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600"
                            />
                        </th>
                        {showRowNumbers && <th className={`${thCls} text-center w-10 text-slate-400 font-bold`}>#</th>}
                        {visibleColumns.map((colKey) => {
                            const column = columns.find(c => c.key === colKey);
                            if (!column) return null;
                            const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : '';
                            const activeSort = sortKey === column.key;
                            const columnFilterValue = columnFilters[column.key];
                            const hasFilter = columnFilterValue && columnFilterValue !== 'all' && columnFilterValue !== '';

                            return (
                                <th
                                    key={column.key}
                                    draggable
                                    onDragStart={() => setDraggedCol(column.key)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (!draggedCol || draggedCol === column.key) return;
                                        onVisibleColumnsChange((prev: string[]) => {
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
                                    onContextMenu={(e) => onHeaderContextMenu?.(e, column.key, column.label)}
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
                                        <button
                                            type="button"
                                            data-column-filter-trigger="1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onFilterClick?.(e, column.key, column.label);
                                            }}
                                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${hasFilter || activeFilterColumn === column.key ? 'border-sky-300 bg-sky-100 text-sky-700 shadow-sm' : 'border-transparent text-slate-400 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'}`}
                                        >
                                            <Filter size={12} />
                                        </button>
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={visibleColumns.length + 1 + (showRowNumbers ? 1 : 0)} className={`${tdCls} py-8 text-center text-slate-500`}>
                                جاري التحميل...
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={visibleColumns.length + 1 + (showRowNumbers ? 1 : 0)} className={`${tdCls} py-12 text-center text-slate-400`}>
                                <div className="flex flex-col items-center justify-center">
                                    <FileText size={48} className="mb-2 opacity-20" />
                                    <p>{emptyMessage}</p>
                                </div>
                            </td>
                        </tr>
                ) : (
                    <>
                        {paddingTop > 0 && (
                            <tr style={{ height: paddingTop }}>
                                <td colSpan={visibleColumns.length + 1 + (showRowNumbers ? 1 : 0)} style={{ padding: 0, border: 0 }}></td>
                            </tr>
                        )}
                        {visibleItems.map((item, idx) => {
                            if (item.type === 'group') {
                                const { groupVal, groupRows } = item;
                                const groupHeaderCells: React.ReactNode[] = [];
                                let titleSpan = 1 + (showRowNumbers ? 1 : 0);
                                let titleRendered = false;

                                const renderTitleCell = (span: number) => (
                                    <td key="group-title" colSpan={span} className={`${tdCls} font-bold text-slate-700 bg-slate-100/80`}>
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="text-slate-500 text-[10px] w-3">{expandedGroups[groupVal] === false ? '▶' : '▼'}</span>
                                            <span className="text-sky-700">{columns.find(c => c.key === groupBy)?.label}:</span>
                                            <span>{groupVal}</span>
                                            <span className="text-slate-400 font-normal text-xs mr-2">({groupRows.length})</span>
                                        </div>
                                    </td>
                                );

                                for (let i = 0; i < visibleColumns.length; i++) {
                                    const colKey = visibleColumns[i];
                                    const column = columns.find(c => c.key === colKey);
                                    const hasFooter = !!column?.renderFooter;

                                    if (hasFooter) {
                                        if (!titleRendered) {
                                            groupHeaderCells.push(renderTitleCell(titleSpan));
                                            titleRendered = true;
                                        }
                                        const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : '';
                                        groupHeaderCells.push(
                                            <td key={colKey} className={`${tdCls} bg-slate-100/80 ${alignClass}`}>
                                                {column.renderFooter!(groupRows)}
                                            </td>
                                        );
                                    } else {
                                        if (!titleRendered) titleSpan++;
                                        else groupHeaderCells.push(<td key={colKey} className={`${tdCls} bg-slate-100/80`}></td>);
                                    }
                                }

                                if (!titleRendered) groupHeaderCells.push(renderTitleCell(titleSpan));

                                return (
                                    <tr key={`group-${groupVal}`} className="bg-slate-100/60 cursor-pointer hover:bg-slate-100/90 transition-colors shadow-[inset_0_1px_0_rgba(203,213,225,0.4)]" onClick={() => toggleGroup(groupVal)}>
                                        {groupHeaderCells}
                                    </tr>
                                );
                            }

                            const row = item.row;
                            const rowId = keyExtractor(row);
                            const isSelected = selectedRowIds.includes(rowId);
                            const isRowDraggable = !!onRowReorder && !groupBy;
                            return (
                                <tr
                                    key={rowId}
                                    draggable={isRowDraggable}
                                    onDragStart={(e) => {
                                        if (!isRowDraggable) return;
                                        setDraggedRowId(rowId);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', rowId);
                                    }}
                                    onDragOver={(e) => {
                                        if (!isRowDraggable || !draggedRowId || draggedRowId === rowId) return;
                                        e.preventDefault();
                                        setDragOverRowId(rowId);
                                    }}
                                    onDragLeave={() => {
                                        if (dragOverRowId === rowId) setDragOverRowId(null);
                                    }}
                                    onDrop={(e) => {
                                        if (!isRowDraggable || !draggedRowId) return;
                                        e.preventDefault();
                                        if (draggedRowId !== rowId) {
                                            onRowReorder(draggedRowId, rowId);
                                        }
                                        setDraggedRowId(null);
                                        setDragOverRowId(null);
                                    }}
                                    onDragEnd={() => {
                                        setDraggedRowId(null);
                                        setDragOverRowId(null);
                                    }}
                                    onClick={(e) => {
                                        if ((e.target as HTMLElement).tagName !== 'INPUT') {
                                            toggleRowSelection(rowId, e.ctrlKey || e.metaKey);
                                        }
                                    }}
                                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-sky-50' : 'bg-white hover:bg-sky-50/60'} ${draggedRowId === rowId ? 'opacity-40' : ''} ${dragOverRowId === rowId ? 'shadow-[inset_0_2px_0_#0ea5e9] bg-sky-50/80 z-10 relative' : ''}`}
                                    onDoubleClick={() => onRowDoubleClick?.(row)}
                                >
                                    <td className={`${tdCls} text-center`}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleRowSelection(rowId, true);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-4 w-4 rounded border-slate-300 text-sky-600"
                                        />
                                    </td>
                                {showRowNumbers && (
                                    <td className={`${tdCls} text-center text-slate-400 font-mono text-xs select-none`} onClick={(e) => e.stopPropagation()}>
                                        {item.index + 1}
                                    </td>
                                )}
                                    {visibleColumns.map((colKey) => {
                                        const column = columns.find(c => c.key === colKey);
                                        if (!column) return null;

                                        const cellText = column.getValue ? column.getValue(row) : '';
                                        const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : '';

                                        return (
                                            <td
                                                key={colKey}
                                                onContextMenu={(e) => onCellContextMenu?.(e, colKey, column.label, cellText, rowId)}
                                                onDoubleClick={(e) => handleCellDoubleClick(e, cellText)}
                                                className={`${tdCls} ${alignClass} cursor-context-menu hover:bg-slate-50/80`}
                                                title="نقر مزدوج للنسخ"
                                            >
                                                {column.renderCell ? column.renderCell(row) : cellText}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        {paddingBottom > 0 && (
                            <tr style={{ height: paddingBottom }}>
                                <td colSpan={visibleColumns.length + 1 + (showRowNumbers ? 1 : 0)} style={{ padding: 0, border: 0 }}></td>
                            </tr>
                        )}
                    </>
                    )}
                </tbody>
                {hasFooter && data.length > 0 && (
                    <tfoot className="sticky bottom-0 z-20 bg-slate-100 shadow-[0_-1px_0_0_rgba(226,232,240,1)] text-[13px] text-slate-700">
                        <tr>
                            <td className={`${tdCls} bg-slate-100`}></td>
                            {showRowNumbers && <td className={`${tdCls} bg-slate-100`}></td>}
                            {visibleColumns.map((colKey) => {
                                const column = columns.find(c => c.key === colKey);
                                if (!column) return null;
                                const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : '';
                                return (
                                    <td key={colKey} className={`${tdCls} bg-slate-100 ${alignClass}`}>
                                        {column.renderFooter ? column.renderFooter(data) : null}
                                    </td>
                                );
                            })}
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
};

export const WafiDataGrid = forwardRef(WafiDataGridInner) as <T>(
    props: WafiDataGridProps<T> & { ref?: React.ForwardedRef<WafiDataGridHandle> }
) => React.ReactElement;