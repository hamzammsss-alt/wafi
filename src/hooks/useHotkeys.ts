import { useEffect } from 'react';

/**
 * useHotkeys
 * 
 * Binds a specific key combination to a callback.
 * 
 * @param key - The key to listen for (e.g., 'F2', 'Enter', 'Escape', 'Control+s')
 * @param callback - The function to execute
 * @param deps - Dependencies array for the effect
 */
export const useHotkeys = (key: string, callback: (e: KeyboardEvent) => void, deps: any[] = []) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input field, textarea, or select
            const target = e.target as HTMLElement;
            const isInputField = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable;

            // Don't intercept if user is in an input field
            if (isInputField) {
                return;
            }

            if (e.key === key) {
                e.preventDefault();
                callback(e);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [key, ...deps]);
};
