import { RefObject, useEffect } from 'react';

export type ExcelLikeNavigationOptions = {
    enabled?: boolean;
    selector?: string;
    captureTab?: boolean;
    wrap?: boolean;
    includeTextareas?: boolean;
    selectTextOnFocus?: boolean;
    onEscape?: () => void;
    onCommit?: () => void;
};

const DEFAULT_SELECTOR = [
    'input:not([disabled]):not([type="hidden"]):not([data-excel-nav="skip"])',
    'select:not([disabled]):not([data-excel-nav="skip"])',
    'textarea:not([disabled]):not([data-excel-nav="skip"])',
    '[contenteditable="true"]:not([data-excel-nav="skip"])',
].join(', ');

function isVisibleElement(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden'
        && style.display !== 'none'
        && (element.offsetParent !== null || style.position === 'fixed');
}

function shouldSelectInputText(element: HTMLElement): element is HTMLInputElement {
    if (!(element instanceof HTMLInputElement)) return false;

    const blockedTypes = new Set([
        'button',
        'checkbox',
        'color',
        'date',
        'datetime-local',
        'file',
        'hidden',
        'image',
        'month',
        'radio',
        'range',
        'submit',
        'time',
        'week',
    ]);

    return !blockedTypes.has((element.type || '').toLowerCase());
}

function focusElement(element: HTMLElement, selectTextOnFocus: boolean): void {
    element.focus();

    if (!selectTextOnFocus) return;

    if (shouldSelectInputText(element)) {
        requestAnimationFrame(() => {
            try {
                element.select();
            } catch {
                // ignore selection failures
            }
        });
        return;
    }

    if (element instanceof HTMLTextAreaElement) {
        requestAnimationFrame(() => {
            try {
                element.select();
            } catch {
                // ignore selection failures
            }
        });
    }
}

function isManualNavigationTarget(target: HTMLElement | null): boolean {
    return Boolean(target?.closest('[data-enter-nav="manual"], [data-excel-nav="manual"]'));
}

export function useExcelLikeNavigation(
    containerRef: RefObject<HTMLElement>,
    options: ExcelLikeNavigationOptions = {},
) {
    const {
        enabled = true,
        selector = DEFAULT_SELECTOR,
        captureTab = false,
        wrap = false,
        includeTextareas = false,
        selectTextOnFocus = true,
        onEscape,
        onCommit,
    } = options;

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !enabled) return;

        const getNavigableElements = () =>
            Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((element) => {
                if (!isVisibleElement(element)) return false;
                if (element.getAttribute('aria-hidden') === 'true') return false;
                if ((element as HTMLInputElement).readOnly && element.getAttribute('data-excel-allow-readonly') !== 'true') return false;
                return true;
            });

        const focusByOffset = (target: HTMLElement, offset: number) => {
            const elements = getNavigableElements();
            if (!elements.length) return;

            const index = elements.indexOf(target);
            if (index === -1) return;

            let nextIndex = index + offset;

            if (wrap) {
                nextIndex = (nextIndex + elements.length) % elements.length;
            }

            if (nextIndex < 0 || nextIndex >= elements.length) return;
            focusElement(elements[nextIndex], selectTextOnFocus);
        };

        const focusBoundary = (direction: 'first' | 'last') => {
            const elements = getNavigableElements();
            if (!elements.length) return;
            const target = direction === 'first' ? elements[0] : elements[elements.length - 1];
            focusElement(target, selectTextOnFocus);
        };

        const handleFocusIn = (event: FocusEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !container.contains(target)) return;
            if (isManualNavigationTarget(target)) return;
            focusElement(target, selectTextOnFocus);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !container.contains(target)) return;
            if (isManualNavigationTarget(target)) return;

            const tag = String(target.tagName || '').toUpperCase();
            const isButton = tag === 'BUTTON' || (target instanceof HTMLInputElement && ['button', 'submit'].includes((target.type || '').toLowerCase()));

            if (event.key === 'Escape' && onEscape) {
                event.preventDefault();
                onEscape();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && onCommit) {
                event.preventDefault();
                onCommit();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'Home') {
                event.preventDefault();
                focusBoundary('first');
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'End') {
                event.preventDefault();
                focusBoundary('last');
                return;
            }

            if (isButton) return;

            if (event.key === 'Tab' && captureTab) {
                event.preventDefault();
                focusByOffset(target, event.shiftKey ? -1 : 1);
                return;
            }

            if (event.key !== 'Enter') return;
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            if (target instanceof HTMLTextAreaElement && !includeTextareas) return;

            event.preventDefault();
            focusByOffset(target, event.shiftKey ? -1 : 1);
        };

        container.addEventListener('focusin', handleFocusIn);
        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('focusin', handleFocusIn);
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        captureTab,
        containerRef,
        enabled,
        includeTextareas,
        onCommit,
        onEscape,
        selectTextOnFocus,
        selector,
        wrap,
    ]);
}
