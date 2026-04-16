import { useEffect } from 'react';
import { KEYMAP } from '../keyboard/keymap';
import { ActiveGridRegistry } from './grid/activeGridRegistry';

type Options = {
    enabled: boolean;

    /** إذا في مودال/بحث مفتوح: لا تنفذ اختصارات السند */
    modalOpen?: boolean;

    onNew?: () => void;    // F3
    onSave?: () => void;   // F4
    onPost?: () => void;   // F9
    onApprove?: () => void; // F8 اختياري
    onPrint?: () => void;  // F10 اختياري
    onFocusGrid?: () => void; // F6 للقفز للشبكة

    /** Esc: اغلاق مودال أو رجوع */
    onClose?: () => void;
};

export function useDocumentKeyboardPro(opts: Options) {
    const {
        enabled,
        modalOpen = false,
        onNew,
        onSave,
        onPost,
        onApprove,
        onPrint,
        onFocusGrid,
        onClose
    } = opts;

    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (e: KeyboardEvent) => {
            // إذا في مودال مفتوح: فقط Esc (وإلا دع المودال يتعامل)
            if (modalOpen) {
                if (e.key === KEYMAP.CLOSE) {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose?.();
                }
                return;
            }

            // Delete / Ctrl+Delete (global)
            if (e.key === 'Delete' && !e.shiftKey && !e.altKey) {
                const grid = ActiveGridRegistry.get();
                if (!grid) return;

                // Ctrl+Delete => حذف السطر دائماً
                if (e.ctrlKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    grid.deleteRowForce();
                    return;
                }

                // Delete => ذكي (داخل input = طبيعي، خارج = حذف سطر)
                const el = document.activeElement as HTMLElement | null;
                const tag = (el?.tagName || '').toUpperCase();
                const isEditingField =
                    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable;

                if (isEditingField) return;

                e.preventDefault();
                e.stopPropagation();
                grid.deleteSmart();
                return;
            }

            // F2 (global lookup)
            if (e.key === KEYMAP.LOOKUP_ITEM) {
                const grid = ActiveGridRegistry.get();
                if (!grid) return;

                e.preventDefault();
                e.stopPropagation();
                grid.requestLookup();
                return;
            }

            // لا تسرق المفاتيح إذا المستخدم يكتب داخل input/textarea/select
            const t = e.target as HTMLElement | null;
            const tag = (t?.tagName || '').toUpperCase();
            const isTyping =
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                !!t?.isContentEditable;

            // بيسان عادة يسمح F-Keys حتى أثناء الكتابة
            // لذلك لا نمنع هنا بسبب isTyping، نخليها تعمل دائماً

            if (e.key === KEYMAP.NEW) {
                e.preventDefault(); e.stopPropagation();
                onNew?.();
                return;
            }

            if (e.key === KEYMAP.SAVE) {
                e.preventDefault(); e.stopPropagation();
                onSave?.();
                return;
            }

            if (e.key === KEYMAP.POST) {
                e.preventDefault(); e.stopPropagation();
                onPost?.();
                return;
            }

            if (e.key === KEYMAP.APPROVE) {
                if (!onApprove) return;
                e.preventDefault(); e.stopPropagation();
                onApprove();
                return;
            }

            if (e.key === KEYMAP.PRINT) {
                if (!onPrint) return;
                e.preventDefault(); e.stopPropagation();
                onPrint();
                return;
            }

            if (e.key === KEYMAP.FOCUS_GRID) {
                if (!onFocusGrid) return;
                e.preventDefault(); e.stopPropagation();
                onFocusGrid();
                return;
            }

            if (e.key === KEYMAP.CLOSE) {
                // Esc في الوضع العادي: اغلاق/رجوع
                onClose?.();
            }
        };

        window.addEventListener('keydown', onKeyDown, { passive: false });
        return () => window.removeEventListener('keydown', onKeyDown as any);
    }, [enabled, modalOpen, onNew, onSave, onPost, onApprove, onPrint, onFocusGrid, onClose]);
}
