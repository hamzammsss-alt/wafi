export interface FloatingMenuLayout {
    top: number;
    left: number;
    maxHeight: number;
    transformOrigin: string;
}

interface FloatingMenuOptions {
    menuWidth: number;
    menuHeight?: number;
    offset?: number;
    margin?: number;
    minHeight?: number;
    preferredAlign?: 'left' | 'right';
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function resolveVerticalLayout(anchorTop: number, anchorBottom: number, options: Required<Pick<FloatingMenuOptions, 'offset' | 'margin' | 'minHeight'>> & Pick<FloatingMenuOptions, 'menuHeight'>) {
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - anchorBottom - options.margin;
    const spaceAbove = anchorTop - options.margin;

    let top = anchorBottom + options.offset;
    let maxHeight = Math.max(options.minHeight, viewportHeight - top - options.margin);
    let verticalOrigin = 'top';

    if (spaceBelow < options.minHeight && spaceAbove > spaceBelow) {
        const desiredHeight = Math.min(options.menuHeight || Math.max(options.minHeight, spaceAbove), Math.max(options.minHeight, spaceAbove));
        top = Math.max(options.margin, anchorTop - desiredHeight - options.offset);
        maxHeight = Math.max(options.minHeight, spaceAbove - options.offset);
        verticalOrigin = 'bottom';
    }

    return { top, maxHeight, verticalOrigin };
}

export function getFloatingMenuPositionFromPoint(x: number, y: number, options: FloatingMenuOptions): FloatingMenuLayout {
    const margin = options.margin ?? 12;
    const offset = options.offset ?? 10;
    const minHeight = options.minHeight ?? 180;
    const menuWidth = options.menuWidth;
    const preferredAlign = options.preferredAlign ?? 'left';
    const viewportWidth = window.innerWidth;

    let left = preferredAlign === 'right' ? x - menuWidth : x;
    left = clamp(left, margin, Math.max(margin, viewportWidth - menuWidth - margin));

    const { top, maxHeight, verticalOrigin } = resolveVerticalLayout(y, y, {
        offset,
        margin,
        minHeight,
        menuHeight: options.menuHeight,
    });

    const horizontalOrigin = preferredAlign === 'right' ? 'right' : 'left';

    return {
        top,
        left,
        maxHeight,
        transformOrigin: `${horizontalOrigin} ${verticalOrigin}`,
    };
}

export function getFloatingMenuPositionFromRect(rect: DOMRect, options: FloatingMenuOptions): FloatingMenuLayout {
    const margin = options.margin ?? 12;
    const offset = options.offset ?? 10;
    const minHeight = options.minHeight ?? 180;
    const menuWidth = options.menuWidth;
    const preferredAlign = options.preferredAlign ?? 'right';
    const viewportWidth = window.innerWidth;

    let left = preferredAlign === 'right' ? rect.right - menuWidth : rect.left;
    left = clamp(left, margin, Math.max(margin, viewportWidth - menuWidth - margin));

    const { top, maxHeight, verticalOrigin } = resolveVerticalLayout(rect.top, rect.bottom, {
        offset,
        margin,
        minHeight,
        menuHeight: options.menuHeight,
    });

    const horizontalOrigin = preferredAlign === 'right' ? 'right' : 'left';

    return {
        top,
        left,
        maxHeight,
        transformOrigin: `${horizontalOrigin} ${verticalOrigin}`,
    };
}