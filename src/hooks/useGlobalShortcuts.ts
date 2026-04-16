import { useEffect } from 'react';

type GlobalShortcutMap = {
    onSave?: () => void;      // F2
    onNew?: () => void;       // F4
    onPrint?: () => void;     // F9
    onDraft?: () => void;     // F10
    onPost?: () => void;      // F12
    onCancel?: () => void;    // Esc
    onSearch?: () => void;    // F3 - Global logic if needed, but usually grid specific
};

export const useGlobalShortcuts = (handlers: GlobalShortcutMap) => {
    useEffect(() => {
        const hasEscapeLock = (): boolean => {
            if (typeof document === 'undefined') return false;
            return Boolean(document.querySelector('[data-esc-lock="true"], [aria-modal="true"], [role="dialog"]'));
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input field, textarea, or select
            const target = e.target as HTMLElement;
            const isInputField = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable;

            if (isInputField && e.key === 'Escape') {
                target.blur();
                return;
            }

            // Don't intercept if user is in an input field
            if (isInputField) {
                return;
            }

            switch (e.key) {
                case 'F2':
                    if (handlers.onSave) {
                        e.preventDefault();
                        handlers.onSave();
                    }
                    break;
                case 'F4':
                    if (handlers.onNew) {
                        e.preventDefault();
                        handlers.onNew();
                    }
                    break;
                case 'F9':
                    if (handlers.onPrint) {
                        e.preventDefault();
                        handlers.onPrint();
                    }
                    break;
                case 'F10':
                    if (handlers.onDraft) {
                        e.preventDefault();
                        handlers.onDraft();
                    }
                    break;
                case 'F12':
                    if (handlers.onPost) {
                        e.preventDefault();
                        handlers.onPost();
                    }
                    break;
                case 'Escape':
                    if (handlers.onCancel) {
                        window.setTimeout(() => {
                            if (e.defaultPrevented || hasEscapeLock()) return;
                            handlers.onCancel?.();
                        }, 0);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers]);
};
