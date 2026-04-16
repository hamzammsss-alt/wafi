export const KEYMAP = {
    LOOKUP_ITEM: 'F2',

    NEW: 'F3',
    SAVE: 'F4',
    POST: 'F9',

    // Optional later mapping
    APPROVE: 'F8',
    PRINT: 'F10',

    CLOSE: 'Escape',

    // Legacy mappings
    NEW_DOC: 'F3',
    SAVE_DOC: 'F4',
    POST_DOC: 'F9',
    FOCUS_GRID: 'F6'
} as const;

export function isTypingTarget(e: Event | React.KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    const tag = (t?.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!t?.isContentEditable;
}
