import { useEffect, useRef } from 'react';

export const useEnterNavigation = (containerRef: React.RefObject<HTMLElement>) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;

            // Ignore if modifier keys are pressed (e.g., Ctrl+Enter for submit)
            if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

            const target = e.target as HTMLElement;

            // Allow default behavior for buttons and textareas
            if (target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA') return;

            e.preventDefault();

            const formElements = containerRef.current?.querySelectorAll(
                'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
            );

            if (!formElements) return;

            const elementsArray = Array.from(formElements) as HTMLElement[];
            const updatedElements = elementsArray.filter(el => el.offsetParent !== null); // Filter visible elements
            const index = updatedElements.indexOf(target);

            if (index > -1 && index < updatedElements.length - 1) {
                updatedElements[index + 1].focus();
            }
        };

        const container = containerRef.current;
        if (container) {
            // Use capture phase to handle events before React synthetic events if needed, 
            // but standard bubbling usually works. 
            // However, mixing React onKeyDown and native listeners can be tricky.
            // Let's rely on a native listener on the container.
            container.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            if (container) {
                container.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [containerRef]);
};
