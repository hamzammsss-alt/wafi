/**
 * FloatingDropdown — reusable, glassmorphic, keyboard-navigable dropdown.
 *
 * Usage:
 *   <FloatingDropdown
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     trigger={<button onClick={() => setOpen(o => !o)}>Open</button>}
 *     menuWidth={220}
 *     title="قائمة الخيارات"
 *   >
 *     <button role="menuitem" onClick={doSomething}>خيار 1</button>
 *     <button role="menuitem" onClick={doOther}>خيار 2</button>
 *   </FloatingDropdown>
 *
 * Keyboard nav:
 *   ArrowDown / ArrowUp  → move between [role="menuitem"] elements
 *   Home / End           → jump to first / last item
 *   Escape               → close and return focus to trigger
 *   Tab                  → close
 */
import React, { useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getFloatingMenuPositionFromRect } from '../../lib/floatingMenu';

export interface FloatingDropdownProps {
    /** Whether the menu is open */
    isOpen: boolean;
    /** Called when menu should close (click-outside, Escape, scroll, resize) */
    onClose: () => void;
    /** The trigger element rendered beside the dropdown (e.g. a button) */
    trigger: React.ReactElement;
    /** Menu items — mark interactive items with role="menuitem" for keyboard nav */
    children: React.ReactNode;
    /** Preferred pixel width of the floating menu (default: 220) */
    menuWidth?: number;
    /** Optional section header title shown at the top of the menu */
    title?: string;
    /** Preferred horizontal alignment relative to trigger (default: "right") */
    align?: 'left' | 'right';
    /** Extra classes applied to the floating panel */
    className?: string;
}

export const FloatingDropdown: React.FC<FloatingDropdownProps> = ({
    isOpen,
    onClose,
    trigger,
    children,
    menuWidth = 220,
    title,
    align = 'right',
    className = '',
}) => {
    const anchorRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // ── position state (only computed when opening) ──────────────────────────
    const [pos, setPos] = React.useState<{ top: number; left: number; maxHeight: number; transformOrigin: string } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (!anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        const layout = getFloatingMenuPositionFromRect(rect, {
            menuWidth,
            menuHeight: 400,
            preferredAlign: align,
            offset: 6,
            margin: 10,
        });
        setPos(layout);
    }, [isOpen, menuWidth, align]);

    // ── focus first item when opened ─────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            const first = menuRef.current?.querySelector<HTMLElement>(
                '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])'
            );
            first?.focus();
        }, 60);
        return () => clearTimeout(timer);
    }, [isOpen]);

    // ── click-outside close ───────────────────────────────────────────────────
    const handleOutside = useCallback(
        (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node)) return;
            if (anchorRef.current?.contains(e.target as Node)) return;
            onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isOpen, handleOutside]);

    // ── close on resize / scroll ──────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('resize', onClose);
        window.addEventListener('scroll', onClose, true);
        return () => {
            window.removeEventListener('resize', onClose);
            window.removeEventListener('scroll', onClose, true);
        };
    }, [isOpen, onClose]);

    // ── keyboard navigation ───────────────────────────────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const container = menuRef.current;
        if (!container) return;
        const items = Array.from(
            container.querySelectorAll<HTMLElement>(
                '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])'
            )
        );
        if (items.length === 0) return;

        const current = document.activeElement as HTMLElement;
        const idx = items.indexOf(current);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                items[(idx + 1) % items.length]?.focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                items[(idx - 1 + items.length) % items.length]?.focus();
                break;
            case 'Home':
                e.preventDefault();
                items[0]?.focus();
                break;
            case 'End':
                e.preventDefault();
                items[items.length - 1]?.focus();
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                // Return focus to trigger button
                anchorRef.current?.querySelector<HTMLElement>('button,[tabindex="0"]')?.focus();
                break;
            case 'Tab':
                onClose();
                break;
        }
    };

    // ── portal ────────────────────────────────────────────────────────────────
    const portal =
        typeof document !== 'undefined'
            ? ReactDOM.createPortal(
                <AnimatePresence>
                    {isOpen && pos ? (
                        <motion.div
                            ref={menuRef}
                            role="menu"
                            dir="rtl"
                            onKeyDown={handleKeyDown}
                            style={{
                                position: 'fixed',
                                top: pos.top,
                                left: pos.left,
                                width: menuWidth,
                                maxHeight: pos.maxHeight,
                                transformOrigin: pos.transformOrigin,
                                zIndex: 10000,
                            }}
                            initial={{ opacity: 0, scale: 0.95, y: 6 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] },
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.97,
                                y: 4,
                                transition: { duration: 0.1 },
                            }}
                            className={`overflow-hidden rounded-[20px] border border-sky-100/80 bg-white/97 backdrop-blur-xl shadow-[0_20px_50px_rgba(15,23,42,0.16)] ${className}`}
                        >
                            {/* Optional header */}
                            {title && (
                                <div className="border-b border-slate-100/80 bg-gradient-to-l from-sky-50/90 via-white to-cyan-50/80 px-4 py-2.5">
                                    <span className="text-[12px] font-semibold text-slate-700">{title}</span>
                                </div>
                            )}

                            {/* Menu content */}
                            <div
                                className="custom-scrollbar overflow-y-auto p-1.5"
                                style={{ maxHeight: pos.maxHeight - (title ? 44 : 0) }}
                            >
                                {children}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>,
                document.body
            )
            : null;

    return (
        <>
            <div ref={anchorRef} className="relative inline-block">
                {trigger}
            </div>
            {portal}
        </>
    );
};

/** Convenience item style — apply to each button inside FloatingDropdown */
export const floatingMenuItemClass =
    'w-full text-right px-3 py-2.5 text-[13px] text-slate-700 flex items-center gap-2 rounded-xl hover:bg-sky-50 hover:text-sky-700 transition-colors focus:outline-none focus:bg-sky-50 focus:text-sky-700';

/** Divider between sections */
export const FloatingMenuDivider: React.FC = () => (
    <div className="my-1 h-px bg-slate-100" />
);
