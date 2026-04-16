import { useCallback, useEffect, useRef, useState } from 'react';
import { KEYMAP } from '../keyboard/keymap';
import { ActiveGridRegistry } from './grid/activeGridRegistry';

export type CellPosition = { row: number; col: number } | null;

export interface ColumnDef<T> {
    key: keyof T | 'actions';
    title: string;
    width?: string;
    type?: 'text' | 'number' | 'item' | 'date' | 'select' | 'readonly';
    options?: any[];
    isReadonly?: boolean;
}

export type LookupRequest = {
    rowIndex: number;
    colKey: string;
    colIndex: number;
};

export type GridCellCtx<T> = {
    rowIndex: number;
    colIndex: number;
    colKey: string;
    row: T;
};

interface UseSmartGridProProps<T> {
    initialRows?: T[];
    columns: ColumnDef<T>[];
    defaultRow: T;
    isLocked?: boolean;
    onRequestLookup?: (ctx: LookupRequest) => void;
    onItemSelect?: (rowId: string | number, item: any) => void;
    onEnterCell?: (ctx: GridCellCtx<T>) => boolean;
}

export function useSmartGridPro<T extends { id: string | number }>(
    props: UseSmartGridProProps<T>,
) {
    const {
        initialRows = [],
        columns,
        defaultRow,
        isLocked = false,
        onRequestLookup,
        onItemSelect,
        onEnterCell,
    } = props;

    const [rows, setRows] = useState<T[]>(initialRows);
    const [activeCell, setActiveCell] = useState<CellPosition>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const originFocusRef = useRef<CellPosition>(null);
    const focusCellRef = useRef<(rowIdx: number, colIdx: number) => void>(() => undefined);

    const editableCols = columns.filter(
        (column) => !column.isReadonly && column.type !== 'readonly' && column.key !== 'actions',
    );

    useEffect(() => {
        if (rows.length === 0) {
            setRows([{ ...defaultRow, id: Date.now() }]);
        }

        return () => {
            if (ActiveGridRegistry.get()) {
                ActiveGridRegistry.clear();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const addRow = useCallback(() => {
        if (isLocked) return undefined;

        let newIndex = 0;
        setRows((prev) => {
            newIndex = prev.length;
            return [...prev, { ...defaultRow, id: Date.now() }];
        });

        return newIndex;
    }, [defaultRow, isLocked]);

    const removeRow = useCallback((index: number) => {
        if (isLocked) return;

        setRows((prev) => {
            if (prev.length <= 1) return prev;
            const next = [...prev];
            next.splice(index, 1);
            return next.length > 0 ? next : [{ ...defaultRow, id: Date.now() }];
        });

        setActiveCell((prev) => {
            if (!prev) return prev;
            if (prev.row === index) return null;
            if (prev.row > index) return { row: prev.row - 1, col: prev.col };
            return prev;
        });
    }, [defaultRow, isLocked]);

    const updateRow = useCallback((rowIndex: number, field: keyof T, value: any) => {
        if (isLocked) return;

        setRows((prev) => {
            const next = [...prev];
            next[rowIndex] = { ...next[rowIndex], [field]: value };
            return next;
        });
    }, [isLocked]);

    const restoreFocus = useCallback(() => {
        const origin = originFocusRef.current;
        if (!origin) return;
        focusCellRef.current(origin.row, origin.col);
        originFocusRef.current = null;
    }, []);

    const saveOriginFocus = useCallback(() => {
        originFocusRef.current = activeCell;
    }, [activeCell]);

    const requestLookupFromCell = useCallback((rowIndex: number, colIndex: number) => {
        if (!onRequestLookup || isLocked) return;
        const colKey = String(columns[colIndex]?.key ?? '');
        saveOriginFocus();
        onRequestLookup({ rowIndex, colIndex, colKey });
    }, [columns, isLocked, onRequestLookup, saveOriginFocus]);

    const requestLookupFromActive = useCallback(() => {
        if (!activeCell) return;
        requestLookupFromCell(activeCell.row, activeCell.col);
    }, [activeCell, requestLookupFromCell]);

    const deleteActiveRow = useCallback((overrideRowIndex?: number) => {
        if (isLocked) return;

        const rowToDelete = overrideRowIndex ?? activeCell?.row;
        if (rowToDelete === undefined) return;
        if (rows.length <= 1) return;

        removeRow(rowToDelete);

        const nextRow = Math.min(rowToDelete, rows.length - 2);
        const nextCol = Math.min(activeCell?.col ?? 0, Math.max(0, editableCols.length - 1));

        requestAnimationFrame(() => {
            focusCellRef.current(nextRow, nextCol);
        });
    }, [activeCell, editableCols.length, isLocked, removeRow, rows.length]);

    const deleteRowForce = useCallback(() => {
        deleteActiveRow();
    }, [deleteActiveRow]);

    const deleteSmart = useCallback(() => {
        const activeElement = document.activeElement as HTMLElement | null;
        const tag = String(activeElement?.tagName || '').toUpperCase();
        const isEditingField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!activeElement?.isContentEditable;

        if (isEditingField) return;
        deleteActiveRow();
    }, [deleteActiveRow]);

    const registerActiveGrid = useCallback(() => {
        ActiveGridRegistry.set({
            hasActiveCell: () => true,
            deleteSmart,
            deleteRowForce,
            requestLookup: requestLookupFromActive,
            restoreFocus,
        });
    }, [deleteRowForce, deleteSmart, requestLookupFromActive, restoreFocus]);

    const focusCell = useCallback((rowIdx: number, colIdx: number) => {
        setActiveCell({ row: rowIdx, col: colIdx });

        requestAnimationFrame(() => {
            const root = gridRef.current;
            if (!root) return;
            const target = root.querySelector(`[data-cell-id="cell-${rowIdx}-${colIdx}"]`) as HTMLElement | null;
            target?.focus();
        });

        registerActiveGrid();
    }, [registerActiveGrid]);

    useEffect(() => {
        focusCellRef.current = focusCell;
    }, [focusCell]);

    useEffect(() => {
        if (!activeCell) return;
        registerActiveGrid();
    }, [activeCell, registerActiveGrid]);

    const moveRight = useCallback(() => {
        if (!activeCell) return;
        const { row, col } = activeCell;
        if (col < editableCols.length - 1) {
            focusCell(row, col + 1);
        }
    }, [activeCell, editableCols.length, focusCell]);

    const moveLeft = useCallback(() => {
        if (!activeCell) return;
        const { row, col } = activeCell;
        if (col > 0) {
            focusCell(row, col - 1);
        }
    }, [activeCell, focusCell]);

    const moveUp = useCallback(() => {
        if (!activeCell) return;
        const { row, col } = activeCell;
        if (row > 0) {
            focusCell(row - 1, col);
        }
    }, [activeCell, focusCell]);

    const moveDown = useCallback((forceAddOnLastRow = true) => {
        if (!activeCell) return;
        const { row, col } = activeCell;

        if (row < rows.length - 1) {
            focusCell(row + 1, col);
            return;
        }

        if (forceAddOnLastRow && !isLocked) {
            const newIdx = addRow();
            if (newIdx !== undefined) {
                focusCell(newIdx, col);
            }
        }
    }, [activeCell, addRow, focusCell, isLocked, rows.length]);

    const moveToRowBoundary = useCallback((direction: 'start' | 'end') => {
        if (!activeCell || editableCols.length === 0) return;
        focusCell(activeCell.row, direction === 'start' ? 0 : editableCols.length - 1);
    }, [activeCell, editableCols.length, focusCell]);

    const moveToGridBoundary = useCallback((direction: 'start' | 'end') => {
        if (editableCols.length === 0 || rows.length === 0) return;
        const targetRow = direction === 'start' ? 0 : rows.length - 1;
        const targetCol = direction === 'start' ? 0 : editableCols.length - 1;
        focusCell(targetRow, targetCol);
    }, [editableCols.length, focusCell, rows.length]);

    const handleEnter = useCallback(() => {
        if (!activeCell) return;
        const { row, col } = activeCell;

        if (col < editableCols.length - 1) {
            focusCell(row, col + 1);
            return;
        }

        if (row < rows.length - 1) {
            focusCell(row + 1, 0);
            return;
        }

        if (!isLocked) {
            const newIdx = addRow();
            if (newIdx !== undefined) {
                focusCell(newIdx, 0);
            }
        }
    }, [activeCell, addRow, editableCols.length, focusCell, isLocked, rows.length]);

    const handleBackwardEnter = useCallback(() => {
        if (!activeCell) return;
        const { row, col } = activeCell;

        if (col > 0) {
            focusCell(row, col - 1);
            return;
        }

        if (row > 0) {
            focusCell(row - 1, Math.max(0, editableCols.length - 1));
        }
    }, [activeCell, editableCols.length, focusCell]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
        if (event.key === 'Delete' && !event.shiftKey && !event.altKey) {
            const target = event.target as HTMLElement;
            const tag = String(target?.tagName || '').toUpperCase();
            const isEditingField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target?.isContentEditable;

            if (event.ctrlKey) {
                if (isLocked) return;
                event.preventDefault();
                event.stopPropagation();
                deleteActiveRow(rowIndex);
                return;
            }

            if (isEditingField) return;

            if (isLocked) return;
            event.preventDefault();
            event.stopPropagation();
            deleteActiveRow(rowIndex);
            return;
        }

        if (event.key === KEYMAP.LOOKUP_ITEM || event.key === 'F2') {
            if (isLocked) return;
            event.preventDefault();
            event.stopPropagation();
            if (!activeCell || activeCell.row !== rowIndex || activeCell.col !== colIndex) {
                setActiveCell({ row: rowIndex, col: colIndex });
            }
            requestLookupFromCell(rowIndex, colIndex);
            return;
        }

        const enterContext: GridCellCtx<T> = {
            rowIndex,
            colIndex,
            colKey: String(columns[colIndex]?.key ?? ''),
            row: rows[rowIndex] as T,
        };

        if (event.key === 'Enter') {
            if (onEnterCell && onEnterCell(enterContext)) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            event.preventDefault();
            if (event.shiftKey) {
                handleBackwardEnter();
            } else {
                handleEnter();
            }
            return;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            if (event.shiftKey) {
                handleBackwardEnter();
            } else {
                handleEnter();
            }
            return;
        }

        if (event.key === 'Home') {
            event.preventDefault();
            if (event.ctrlKey) {
                moveToGridBoundary('start');
            } else {
                moveToRowBoundary('start');
            }
            return;
        }

        if (event.key === 'End') {
            event.preventDefault();
            if (event.ctrlKey) {
                moveToGridBoundary('end');
            } else {
                moveToRowBoundary('end');
            }
            return;
        }

        if (event.key === 'Insert' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
            if (isLocked) return;
            event.preventDefault();
            const newIdx = addRow();
            if (newIdx !== undefined) {
                focusCell(newIdx, Math.min(colIndex, Math.max(0, editableCols.length - 1)));
            }
            return;
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveRight();
            return;
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveLeft();
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveUp();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveDown(true);
            return;
        }

        if (event.key === 'Escape') {
            setActiveCell(null);
        }
    }, [
        activeCell,
        addRow,
        columns,
        deleteActiveRow,
        editableCols.length,
        handleBackwardEnter,
        handleEnter,
        isLocked,
        moveDown,
        moveLeft,
        moveRight,
        moveToGridBoundary,
        moveToRowBoundary,
        moveUp,
        onEnterCell,
        requestLookupFromCell,
        rows,
        focusCell,
    ]);

    const handleItemSet = useCallback((
        rowIndex: number,
        item: any,
        options: {
            priceColKey?: keyof T;
            qtyColKey?: keyof T;
            unitColKey?: keyof T;
        },
    ) => {
        if (isLocked) return;

        setRows((prev) => {
            const next = [...prev];
            const target = { ...next[rowIndex] };

            if (onItemSelect) {
                onItemSelect(target.id, item);
            }

            if (options.qtyColKey) {
                target[options.qtyColKey] = 1 as any;
            }
            if (options.unitColKey && item.base_unit_id) {
                target[options.unitColKey] = item.base_unit_id as any;
            }
            if (options.priceColKey && (item.default_price ?? item.cost_price) != null) {
                target[options.priceColKey] = (item.default_price ?? item.cost_price) as any;
            }

            next[rowIndex] = target;
            return next;
        });

        const goKey = options.qtyColKey || options.priceColKey;
        if (!goKey) return;

        const nextColIndex = editableCols.findIndex((column) => column.key === goKey);
        if (nextColIndex >= 0) {
            focusCell(rowIndex, nextColIndex);
        }
    }, [editableCols, focusCell, isLocked, onItemSelect]);

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
        handleBackwardEnter,
        handleItemSet,
        editableCols,
        saveOriginFocus,
        restoreFocus,
        moveRight,
        moveLeft,
        moveUp,
        moveDown,
        moveToRowBoundary,
        moveToGridBoundary,
    };
}
