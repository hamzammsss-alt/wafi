import { useRef, useCallback, KeyboardEvent } from 'react';

export const useKeyboardNavigation = (rowCount: number, colCount: number, onAddRow: () => void) => {
    const gridRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent, rowIndex: number, colIndex: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            // Move Right
            const nextCol = colIndex + 1;

            // If we are at the last column, move to next row first column
            if (nextCol >= colCount) {
                if (rowIndex + 1 < rowCount) {
                    focusCell(rowIndex + 1, 0);
                } else {
                    // Add new row if we are at the very end
                    onAddRow();
                    // We need to wait for render to focus, but purely usually React handles state updates.
                    // We might need a small timeout or effect to focus the new row.
                    setTimeout(() => focusCell(rowIndex + 1, 0), 50);
                }
            } else {
                focusCell(rowIndex, nextCol);
            }
        }

        // Arrow Keys Support (Optional)
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (rowIndex + 1 < rowCount) focusCell(rowIndex + 1, colIndex);
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (rowIndex > 0) focusCell(rowIndex - 1, colIndex);
        }
    }, [rowCount, colCount, onAddRow]);

    const focusCell = (row: number, col: number) => {
        // We assume inputs have IDs `cell-${row}-${col}`
        const el = document.getElementById(`cell-${row}-${col}`) as HTMLInputElement;
        if (el) {
            el.focus();
            el.select();
        }
    };

    return { handleKeyDown };
};
