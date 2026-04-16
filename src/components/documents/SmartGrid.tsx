import React from 'react';
import { Trash2 } from 'lucide-react';
import { ColumnDef, CellPosition } from '../../hooks/useSmartGridPro';

interface SmartGridProps<T> {
    gridRef: React.RefObject<HTMLDivElement>;
    rows: T[];
    columns: ColumnDef<T>[];
    activeCell: CellPosition;
    isLocked?: boolean;

    onFocusCell: (row: number, col: number) => void;
    onKeyDown: (e: React.KeyboardEvent, row: number, col: number) => void;
    onUpdateRow: (row: number, field: keyof T, value: any) => void;

    onRemoveRow: (row: number) => void;
    onAddRow?: () => number | void;

    renderCellHook?: (
        row: T,
        col: ColumnDef<T>,
        rowIndex: number,
        colIndex: number
    ) => React.ReactNode;
}

export function SmartGrid<T extends { id: string | number }>({
    gridRef,
    rows,
    columns,
    activeCell,
    isLocked = false,
    onFocusCell,
    onKeyDown,
    onUpdateRow,
    onRemoveRow,
    renderCellHook
}: SmartGridProps<T>) {
    const handleFocusCell = (r: number, c: number) => {
        onFocusCell(r, c);
    };

    const renderInputCell = (row: T, col: ColumnDef<T>, rowIndex: number, colIndex: number) => {
        // custom render hook
        if (renderCellHook) {
            const custom = renderCellHook(row, col, rowIndex, colIndex);
            if (custom) return custom;
        }

        if (col.key === 'actions') {
            return (
                <button
                    tabIndex={-1}
                    onClick={() => onRemoveRow(rowIndex)}
                    disabled={isLocked || rows.length === 1}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            );
        }

        const value = (row as any)[col.key];
        const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;
        const cellId = `cell-${rowIndex}-${colIndex}`;

        const inputClasses = `
      w-full bg-transparent px-3 py-2.5 text-sm outline-none transition-all
      ${isActive ? 'bg-sky-50/70' : 'focus:bg-slate-50/80'}
      ${col.type === 'number' ? 'text-left' : 'text-right'}
      ${col.isReadonly || isLocked ? 'text-slate-500 cursor-not-allowed bg-slate-50/60' : 'text-slate-800'}
    `;

        if (col.type === 'select' && col.options) {
            return (
                <select
                    data-cell-id={cellId}
                    data-cell-input="true"
                    value={value ?? ''}
                    onChange={(e) => onUpdateRow(rowIndex, col.key as keyof T, e.target.value)}
                    onFocus={() => handleFocusCell(rowIndex, colIndex)}
                    onKeyDown={(e) => onKeyDown(e, rowIndex, colIndex)}
                    disabled={col.isReadonly}
                    className={`${inputClasses} appearance-none cursor-pointer disabled:cursor-not-allowed ${isLocked ? 'pointer-events-none' : ''}`}
                >
                    <option value="">...</option>
                    {col.options.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label || opt.name_ar || opt.name || opt.id}</option>
                    ))}
                </select>
            );
        }

        // default input
        return (
            <input
                type={col.type === 'number' ? 'number' : 'text'}
                data-cell-id={cellId}
                data-cell-input="true"
                value={value ?? ''}
                onChange={(e) => {
                    const val = col.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value;
                    onUpdateRow(rowIndex, col.key as keyof T, val);
                }}
                onFocus={(e) => {
                    handleFocusCell(rowIndex, colIndex);
                    (e.currentTarget as HTMLInputElement).select?.();
                }}
                onKeyDown={(e) => onKeyDown(e, rowIndex, colIndex)}
                readOnly={col.isReadonly || isLocked}
                className={inputClasses}
                min={col.type === 'number' ? '0' : undefined}
            />
        );
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm" ref={gridRef} data-enter-nav="manual" data-excel-nav="manual">
            <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                    <thead>
                        <tr className="sticky top-0 z-[2] border-b border-slate-200 bg-gradient-to-r from-slate-100/85 via-slate-50 to-slate-100/85 backdrop-blur">
                            <th className="w-12 border-l border-slate-200/60 bg-slate-100/70 px-4 py-3 text-center font-bold text-slate-600">#</th>
                            {columns.map((col) => (
                                <th
                                    key={String(col.key)}
                                    style={{ width: col.width }}
                                    className="border-l border-slate-200/60 px-3 py-3 font-bold text-slate-600 last:border-0"
                                >
                                    {col.title}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {rows.map((row, rowIndex) => (
                            <tr
                                key={row.id}
                                className={`transition-colors ${activeCell?.row === rowIndex ? 'bg-sky-50/40' : 'hover:bg-slate-50/55'}`}
                            >
                                <td className="border-l border-slate-100 bg-slate-50/35 px-4 py-2 text-center font-medium text-slate-400">
                                    {rowIndex + 1}
                                </td>

                                {columns.map((col, colIndex) => {
                                    const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;
                                    const isAction = col.key === 'actions';
                                    const isReadonly = !!col.isReadonly || col.type === 'readonly';

                                    return (
                                        <td
                                            key={String(col.key)}
                                            className="p-0 border-l border-slate-100 relative group last:border-0"
                                        >
                                            {/* ✅ Cell container gets focus + keydown (Besan Pro style) */}
                                            <div
                                                tabIndex={-1}
                                                data-cell-container-id={`cell-${rowIndex}-${colIndex}`}
                                                onFocus={() => handleFocusCell(rowIndex, colIndex)}
                                                onKeyDown={(e) => onKeyDown(e, rowIndex, colIndex)}
                                                onMouseDown={(e) => {
                                                    const t = e.target as HTMLElement;
                                                    const tag = (t.tagName || '').toUpperCase();
                                                    const isField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
                                                    if (isField) return;
                                                    handleFocusCell(rowIndex, colIndex);
                                                    requestAnimationFrame(() => {
                                                        const nextTarget = e.currentTarget.querySelector('[data-cell-input="true"]') as HTMLElement | null;
                                                        nextTarget?.focus();
                                                    });
                                                }}
                                                className="outline-none"
                                            >
                                                {renderInputCell(row, col, rowIndex, colIndex)}
                                            </div>

                                            {/* Focus ring */}
                                            {isActive && !isLocked && !isReadonly && !isAction && (
                                                <div className="pointer-events-none absolute inset-0 z-10 rounded-sm border-2 border-sky-500/45 transition-all duration-150" />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
