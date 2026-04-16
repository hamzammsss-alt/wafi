import { useState, useCallback, useRef, useEffect } from 'react';

export type CellPosition = { row: number; col: number } | null;

export interface ColumnDef<T> {
    key: keyof T | 'actions';
    title: string;
    width?: string;
    type?: 'text' | 'number' | 'item' | 'date' | 'select' | 'readonly';
    options?: any[];
    isReadonly?: boolean;
}

interface UseSmartGridProps<T> {
    initialRows?: T[];
    columns: ColumnDef<T>[];
    defaultRow: T;
    onItemSelect?: (rowId: string | number, item: any) => void;
    isLocked?: boolean;

    // NEW (Bisan-Pro)
    onOpenItemLookup?: (rowIndex: number) => void; // F2
    onEscape?: () => void; // Esc
}

export function useSmartGrid<T extends { id: string | number }>({
    initialRows = [],
    columns,
    defaultRow,
    onItemSelect,
    isLocked = false,
    onOpenItemLookup,
    onEscape
}: UseSmartGridProps<T>) {
    const [rows, setRows] = useState<T[]>(initialRows);
    const [activeCell, setActiveCell] = useState<CellPosition>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (rows.length === 0) {
            setRows([{ ...defaultRow, id: Date.now() }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getEditableColumns = useCallback(() => {
        return columns.filter(c => !c.isReadonly && c.type !== 'readonly' && c.key !== 'actions');
    }, [columns]);

    const editableCols = getEditableColumns();

    const focusCell = useCallback(
        (rowIdx: number, colIdx: number) => {
            if (isLocked) return;
            setActiveCell({ row: rowIdx, col: colIdx });

            requestAnimationFrame(() => {
                if (!gridRef.current) return;
                const refKey = `cell-${rowIdx}-${colIdx}`;
                const el = gridRef.current.querySelector(`[data-cell-id="${refKey}"]`) as HTMLElement | null;
                el?.focus?.();
            });
        },
        [isLocked]
    );

    const addRow = useCallback(() => {
        if (isLocked) return;
        let newLen = rows.length;
        setRows(prev => {
            newLen = prev.length + 1;
            return [...prev, { ...defaultRow, id: Date.now() }];
        });
        return newLen - 1; // Return the index of the newly added row
    }, [isLocked, defaultRow, rows.length]);

    const removeRow = useCallback(
        (index: number) => {
            if (isLocked) return;
            const newRows = [...rows];
            newRows.splice(index, 1);
            if (newRows.length === 0) newRows.push({ ...defaultRow, id: Date.now() });
            setRows(newRows);

            if (activeCell?.row === index) setActiveCell(null);
            else if (activeCell && activeCell.row > index) setActiveCell({ ...activeCell, row: activeCell.row - 1 });
        },
        [rows, activeCell, defaultRow, isLocked]
    );

    const updateRow = useCallback(
        (rowIndex: number, field: keyof T, value: any) => {
            if (isLocked) return;
            setRows(prev => {
                const next = [...prev];
                next[rowIndex] = { ...next[rowIndex], [field]: value };
                return next;
            });
        },
        [isLocked]
    );

    const moveDown = useCallback(() => {
        if (!activeCell || isLocked) return;
        const { row, col } = activeCell;
        if (row < rows.length - 1) focusCell(row + 1, col);
        else {
            const newIdx = addRow();
            if (newIdx !== undefined) focusCell(newIdx, col);
        }
    }, [activeCell, rows.length, addRow, focusCell, isLocked]);

    const moveUp = useCallback(() => {
        if (!activeCell || isLocked) return;
        const { row, col } = activeCell;
        if (row > 0) focusCell(row - 1, col);
    }, [activeCell, focusCell, isLocked]);

    const moveRight = useCallback(() => {
        if (!activeCell || isLocked) return;
        const { row, col } = activeCell;
        if (col < editableCols.length - 1) focusCell(row, col + 1);
    }, [activeCell, editableCols.length, focusCell, isLocked]);

    const moveLeft = useCallback(() => {
        if (!activeCell || isLocked) return;
        const { row, col } = activeCell;
        if (col > 0) focusCell(row, col - 1);
    }, [activeCell, focusCell, isLocked]);

    const handleEnter = useCallback((shiftKey = false) => {
        if (!activeCell || isLocked) return;
        const { row, col } = activeCell;

        if (shiftKey) {
            // Move backwards
            if (col > 0) {
                focusCell(row, col - 1);
            } else if (row > 0) {
                focusCell(row - 1, editableCols.length - 1);
            }
            return;
        }

        // Move forwards
        if (col < editableCols.length - 1) {
            focusCell(row, col + 1);
            return;
        }

        if (row < rows.length - 1) focusCell(row + 1, 0);
        else {
            const newIdx = addRow();
            if (newIdx !== undefined) focusCell(newIdx, 0);
        }
    }, [activeCell, editableCols.length, rows.length, focusCell, addRow, isLocked]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
            if (isLocked) return;

            // Bisan-Pro: Open item lookup
            if (e.key === 'F2') {
                e.preventDefault();
                e.stopPropagation();
                onOpenItemLookup?.(rowIndex);
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                onEscape?.();
                return;
            }

            // Bisan-Pro: Delete Row
            if (e.key === 'Delete' && e.ctrlKey) {
                e.preventDefault();
                removeRow(rowIndex);
                return;
            }

            // Bisan-Pro: Tab Navigation
            if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) moveLeft();
                else moveRight();
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                handleEnter(e.shiftKey);
                return;
            }

            if (e.key === 'ArrowDown') {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'SELECT') {
                    e.preventDefault();
                    moveDown();
                }
                return;
            }

            if (e.key === 'ArrowUp') {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'SELECT') {
                    e.preventDefault();
                    moveUp();
                }
                return;
            }
        },
        [isLocked, onOpenItemLookup, onEscape, handleEnter, moveDown, moveUp, moveLeft, moveRight, removeRow]
    );

    const handleItemSet = useCallback(
        (
            rowIndex: number,
            item: any,
            options: { priceColKey?: keyof T; qtyColKey?: keyof T; unitColKey?: keyof T }
        ) => {
            if (isLocked) return;

            setRows(prev => {
                const next = [...prev];
                const target = { ...next[rowIndex] };

                onItemSelect?.(target.id, item);

                if (options.qtyColKey) target[options.qtyColKey] = 1 as any;
                if (options.unitColKey && item.base_unit_id) target[options.unitColKey] = item.base_unit_id as any;
                if (options.priceColKey && item.default_price) target[options.priceColKey] = item.default_price as any;

                next[rowIndex] = target;
                return next;
            });

            const targetColKey = options.priceColKey || options.qtyColKey;
            if (targetColKey) {
                const idx = editableCols.findIndex(c => c.key === targetColKey);
                if (idx >= 0) focusCell(rowIndex, idx);
            }
        },
        [isLocked, onItemSelect, editableCols, focusCell]
    );

    return {
        gridRef,
        rows,
        setRows,
        activeCell,
        focusCell,
        addRow,
        removeRow,
        updateRow,
        handleKeyDown,
        handleEnter,
        moveRight,
        moveLeft,
        moveDown,
        moveUp,
        handleItemSet,
        activeRowIndex: activeCell?.row ?? null,
        editableCols
    };
}