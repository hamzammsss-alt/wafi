import { useEffect } from 'react';

type Handler = (() => void) | undefined;

export interface UseBisanDocumentKeyboardParams {
    disabled?: boolean;
    onNew?: Handler;         // F3
    onSave?: Handler;        // F4
    onPost?: Handler;        // F9
    onFocusGrid?: Handler;   // F6
    onFocusHeader?: Handler; // fallback
    onOpenLookup?: Handler;  // F2
    onEscape?: Handler;      // Esc
}

function isEditableElement(el: Element | null) {
    if (!el) return false;
    const tag = el.tagName?.toUpperCase?.() || '';
    if (tag === 'TEXTAREA') return true;

    if (tag === 'INPUT') {
        const input = el as HTMLInputElement;
        // allow most inputs
        return !input.readOnly && !input.disabled;
    }

    // contenteditable
    const anyEl = el as HTMLElement;
    if (anyEl.isContentEditable) return true;

    return false;
}

function allowNativeKeys(el: Element | null) {
    if (!el) return false;
    const anyEl = el as HTMLElement;
    return anyEl.getAttribute?.('data-allow-native-keys') === 'true';
}

export function useBisanDocumentKeyboard(params: UseBisanDocumentKeyboardParams) {
    const {
        disabled = false,
        onNew,
        onSave,
        onPost,
        onFocusGrid,
        onFocusHeader,
        onOpenLookup,
        onEscape
    } = params;

    useEffect(() => {
        if (disabled) return;

        const onKeyDown = (e: KeyboardEvent) => {
            // Don't hijack browser/devtools shortcuts
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const target = e.target as Element | null;

            // If textarea OR user explicitly wants native keys, ignore
            if (target?.tagName?.toUpperCase?.() === 'TEXTAREA') return;
            if (allowNativeKeys(target)) return;

            // If user is actively typing in an input, still allow function keys / Esc / F6
            // (Bisan style) — but keep safe by not breaking normal text behavior.
            const isTyping = isEditableElement(target);

            switch (e.key) {
                case 'F2':
                    e.preventDefault();
                    onOpenLookup?.();
                    return;

                case 'F3':
                    e.preventDefault();
                    onNew?.();
                    return;

                case 'F4':
                    e.preventDefault();
                    onSave?.();
                    return;

                case 'F6':
                    e.preventDefault();
                    (onFocusGrid || onFocusHeader)?.();
                    return;

                case 'F9':
                    e.preventDefault();
                    onPost?.();
                    return;

                case 'Escape':
                    // Esc should work always even during typing
                    e.preventDefault();
                    onEscape?.();
                    return;

                default:
                    // If typing, do nothing for other keys
                    if (isTyping) return;
                    return;
            }
        };

        window.addEventListener('keydown', onKeyDown, { passive: false });
        return () => window.removeEventListener('keydown', onKeyDown as any);
    }, [disabled, onNew, onSave, onPost, onFocusGrid, onFocusHeader, onOpenLookup, onEscape]);
}
