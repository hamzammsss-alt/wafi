import { useEffect, useCallback } from 'react';
import { KEYMAP, isTypingTarget } from '../keyboard/keymap';

interface UseBesanHotkeysProps {
    onNew?: () => void;
    onSave?: () => void;
    onPost?: () => void;
    onClose?: () => void;
    onLookup?: () => void;   // F2 fallback (if grid didn't handle it)
    onFocusGrid?: () => void; // F6 jump to grid
    disabled?: boolean;
}

/**
 * Besan Pro — Document-level hotkeys.
 * Runs in the CAPTURE phase so function-keys work even when
 * focus is inside an <input>, <select> or <textarea>.
 *
 * F3 = New   |  F4 = Save  |  F9 = Post  |  Esc = Close  |  F2 = Lookup fallback
 */
export function useBesanHotkeys({
    onNew,
    onSave,
    onPost,
    onClose,
    onLookup,
    onFocusGrid,
    disabled = false,
}: UseBesanHotkeysProps) {
    const handler = useCallback(
        (e: KeyboardEvent) => {
            if (disabled) return;

            const key = e.key;

            // ─── Function keys fire regardless of focus target ───
            if (key === KEYMAP.NEW_DOC && onNew) {
                e.preventDefault();
                onNew();
                return;
            }

            if (key === KEYMAP.SAVE_DOC && onSave) {
                e.preventDefault();
                onSave();
                return;
            }

            if (key === KEYMAP.POST_DOC && onPost) {
                e.preventDefault();
                onPost();
                return;
            }

            if (key === KEYMAP.LOOKUP_ITEM && onLookup) {
                e.preventDefault();
                onLookup();
                return;
            }

            // ─── F6: Jump to primary grid ───
            if (key === KEYMAP.FOCUS_GRID && onFocusGrid) {
                e.preventDefault();
                onFocusGrid();
                return;
            }

            // ─── Esc: always allowed ───
            if (key === KEYMAP.CLOSE && onClose) {
                e.preventDefault();
                onClose();
                return;
            }

            // ─── Ctrl+S alias for Save ───
            if (e.ctrlKey && key === 's' && onSave) {
                e.preventDefault();
                onSave();
                return;
            }
        },
        [onNew, onSave, onPost, onClose, onLookup, onFocusGrid, disabled],
    );

    useEffect(() => {
        window.addEventListener('keydown', handler, true); // capture phase
        return () => window.removeEventListener('keydown', handler, true);
    }, [handler]);
}
