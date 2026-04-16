import { Dispatch, RefObject, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';

type ExcelListNavigationOptions<T> = {
    rows: T[];
    enabled?: boolean;
    modalOpen?: boolean;
    onOpenRow: (row: T, index: number) => void;
    onCreate?: () => void;
    onRefresh?: () => void;
    onOpenFilters?: () => void;
};

type ExcelListNavigationResult = {
    tableRef: RefObject<HTMLDivElement | null>;
    selectedIndex: number;
    setSelectedIndex: Dispatch<SetStateAction<number>>;
};

export function useExcelListNavigation<T>(
    options: ExcelListNavigationOptions<T>,
): ExcelListNavigationResult {
    const {
        rows,
        enabled = true,
        modalOpen = false,
        onOpenRow,
        onCreate,
        onRefresh,
        onOpenFilters,
    } = options;

    const [selectedIndex, setSelectedIndex] = useState(0);
    const tableRef = useRef<HTMLDivElement | null>(null);

    const maxIndex = useMemo(() => Math.max(0, rows.length - 1), [rows.length]);

    useEffect(() => {
        setSelectedIndex((prev) => Math.min(prev, maxIndex));
    }, [maxIndex]);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (modalOpen) return;

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                onOpenFilters?.();
                return;
            }

            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
                if (event.key === 'Escape') {
                    (event.target as HTMLElement).blur();
                    tableRef.current?.focus();
                }
                return;
            }

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, maxIndex));
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (rows[selectedIndex]) {
                        onOpenRow(rows[selectedIndex], selectedIndex);
                    }
                    break;
                case 'F3':
                    if (!onCreate) break;
                    event.preventDefault();
                    onCreate();
                    break;
                case 'F5':
                    if (!onRefresh) break;
                    event.preventDefault();
                    onRefresh();
                    break;
                case 'F6':
                    event.preventDefault();
                    tableRef.current?.focus();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, maxIndex, modalOpen, onCreate, onOpenFilters, onOpenRow, onRefresh, rows, selectedIndex]);

    return {
        tableRef,
        selectedIndex,
        setSelectedIndex,
    };
}
