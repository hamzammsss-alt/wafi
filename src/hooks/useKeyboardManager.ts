import { useEffect, useCallback } from 'react';

export type DocumentStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type DocumentMode = 'NEW' | 'EDIT' | 'VIEW';

interface KeyboardManagerProps {
    status: DocumentStatus;
    mode: DocumentMode;
    onF2Lookup?: () => void;
    onF3New?: () => void;
    onF4Save?: () => void;
    onF9Post?: () => void;
    onEscape?: () => void;
    isLookupOpen?: boolean;
}

export function useKeyboardManager({
    status,
    mode,
    onF2Lookup,
    onF3New,
    onF4Save,
    onF9Post,
    onEscape,
    isLookupOpen = false
}: KeyboardManagerProps) {

    const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
        // If a modal is open, let Escape handle closing it. Don't block F keys.
        if (isLookupOpen && e.key === 'Escape') {
            e.preventDefault();
            onEscape?.();
            return;
        }

        // F2: Item Lookup (Only active if not locked / in draft)
        if (e.key === 'F2') {
            e.preventDefault();
            if (status === 'DRAFT' && onF2Lookup) {
                onF2Lookup();
            }
        }

        // F3: New Document (Always active)
        else if (e.key === 'F3') {
            e.preventDefault();
            if (onF3New) {
                onF3New();
            }
        }

        // F4: Save Document (Only active if DRAFT)
        else if (e.key === 'F4') {
            e.preventDefault();
            if (status === 'DRAFT' && onF4Save) {
                onF4Save();
            }
        }

        // F9: Post Document (Only active if existing DRAFT)
        else if (e.key === 'F9') {
            e.preventDefault();
            if (status === 'DRAFT' && mode !== 'NEW' && onF9Post) {
                onF9Post();
            }
        }

        // Default Escape Behavior if not in a trapped lookup
        else if (e.key === 'Escape') {
            onEscape?.();
        }

    }, [status, mode, isLookupOpen, onF2Lookup, onF3New, onF4Save, onF9Post, onEscape]);

    useEffect(() => {
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [handleGlobalKeyDown]);

    // Hook returns locked states for components to easily consume
    const isLocked = status !== 'DRAFT';

    return { isLocked };
}
