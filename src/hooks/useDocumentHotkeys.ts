import { useEffect, useCallback } from 'react';

interface DocumentHotkeysProps {
    onNew?: () => void;
    onSave?: () => void;
    onPost?: () => void;
    onItemLookup?: () => void;
    onAddRow?: () => void;
    isEnabled?: boolean;
}

export const useDocumentHotkeys = ({
    onNew,
    onSave,
    onPost,
    onItemLookup,
    onAddRow,
    isEnabled = true
}: DocumentHotkeysProps) => {

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isEnabled) return;

        // F2 - Item Lookup (Only when inside grid/table)
        if (e.key === 'F2') {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            const isInGrid = activeTag === 'input' || activeTag === 'select' || activeTag === 'td';

            if (isInGrid && onItemLookup) {
                e.preventDefault();
                onItemLookup();
            }
        }

        // F3 - New Document
        if (e.key === 'F3') {
            if (onNew) {
                e.preventDefault();
                onNew();
            }
        }

        // F4 - Save Document
        if (e.key === 'F4') {
            if (onSave) {
                e.preventDefault();
                onSave();
            }
        }

        // F9 - Post Document
        if (e.key === 'F9') {
            if (onPost) {
                e.preventDefault();
                onPost();
            }
        }

        // ArrowDown - Add new row (Only if focused inside the last grid row)
        if (e.key === 'ArrowDown') {
            const activeEl = document.activeElement as HTMLElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
                // Determine if we are on the last row by checking ID pattern (e.g. quantity-5)
                const id = activeEl.id;
                if (id) {
                    const parts = id.split('-');
                    const indexStr = parts[parts.length - 1];
                    const index = parseInt(indexStr, 10);

                    if (!isNaN(index)) {
                        // We need a way to know the total rows to see if we're on the last one.
                        // We can query selector all inputs with the same prefix to find the max index.
                        const prefix = parts.slice(0, -1).join('-');
                        const siblings = document.querySelectorAll(`[id^="${prefix}-"]`);

                        let maxIndex = -1;
                        siblings.forEach(el => {
                            const elId = el.id;
                            const elIndex = parseInt(elId.split('-').pop() || '-1', 10);
                            if (elIndex > maxIndex) maxIndex = elIndex;
                        });

                        if (index === maxIndex && onAddRow) {
                            e.preventDefault(); // Stop native scrolling
                            onAddRow();
                        }
                    }
                }
            }
        }

    }, [onNew, onSave, onPost, onItemLookup, onAddRow, isEnabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};
