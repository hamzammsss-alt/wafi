import React, { useEffect } from 'react';

interface PostConfirmDialogProps {
    open: boolean;
    message?: string;
    onConfirm: () => void;
    onCancel: () => void;
    onDraft?: () => void;
    onConfirmNoPrint?: () => void;
}

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

const DEFAULT_WARNING_TITLE = '\u062a\u062d\u0630\u064a\u0631';
const DEFAULT_POST_MESSAGE = '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u063a\u064a\u064a\u0631 \u0623\u064a \u0645\u0633\u062a\u0646\u062f \u0628\u0639\u062f \u0623\u0646 \u064a\u0637\u0628\u0639.\n\u0647\u0644 \u062a\u0631\u064a\u062f \u0627\u0644\u0627\u0633\u062a\u0645\u0631\u0627\u0631\u061f';
const DEFAULT_POST_WITHOUT_PRINT = '\u0631\u062d\u0644 \u062f\u0648\u0646 \u0637\u0628\u0627\u0639\u0629';
const DEFAULT_DRAFT = '\u0645\u0633\u0648\u062f\u0629';
const DEFAULT_NO = '\u0644\u0627';
const DEFAULT_YES = '\u0646\u0639\u0645';

const PostConfirmDialog: React.FC<PostConfirmDialogProps> = ({
    open,
    message,
    onConfirm,
    onCancel,
    onDraft,
    onConfirmNoPrint,
}) => {
    useEffect(() => {
        if (!open) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                onConfirm();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onCancel, onConfirm]);

    if (!open) return null;

    const currentDir = ((typeof document !== 'undefined' && document?.documentElement?.dir) || 'ltr') as 'ltr' | 'rtl';
    const resolvedMessage = message || tr('doc.common.confirm_post', DEFAULT_POST_MESSAGE);
    const actionCount = 2 + Number(Boolean(onDraft)) + Number(Boolean(onConfirmNoPrint));
    const actionGridClass = actionCount >= 4 ? 'grid-cols-4' : actionCount === 3 ? 'grid-cols-3' : 'grid-cols-2';

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: 'rgba(15, 23, 42, 0.28)' }}
            onClick={onCancel}
        >
            <div
                role="dialog"
                aria-modal="true"
                data-esc-lock="true"
                className="relative overflow-hidden rounded-md border border-sky-500 bg-white shadow-2xl"
                style={{ width: 372, direction: currentDir, fontFamily: 'Tahoma, Arial, sans-serif' }}
                onClick={(event) => event.stopPropagation()}
            >
                <div
                    className="flex items-center justify-between px-3 py-1.5"
                    style={{ background: '#1296db' }}
                >
                    <button
                        onClick={onCancel}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-white transition hover:bg-white/35"
                        aria-label={tr('ui.close', 'Close')}
                    >
                        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                            <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                        </svg>
                    </button>
                    <span className="text-sm font-bold text-white">
                        {tr('ui.dialog.warning', DEFAULT_WARNING_TITLE)}
                    </span>
                    <div className="w-5" />
                </div>

                <div className="bg-white px-5 py-6">
                    <div className="flex flex-row-reverse items-start gap-4">
                        <div
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-2xl font-bold text-slate-500"
                            aria-hidden="true"
                        >
                            ?
                        </div>
                        <p className="flex-1 whitespace-pre-line pt-1 text-center text-[15px] leading-8 text-slate-900">
                            {resolvedMessage}
                        </p>
                    </div>
                </div>

                <div className={`grid ${actionGridClass} gap-[6px] border-t border-slate-200 bg-[#f7fafc] px-[6px] py-[6px]`}>
                    {onConfirmNoPrint && (
                        <button
                            onClick={onConfirmNoPrint}
                            className="rounded-[3px] border border-[#69b96f] bg-[#76c66e] px-1 py-2 text-[13px] font-bold text-white transition hover:brightness-95"
                        >
                            {tr('doc.common.post_without_print', DEFAULT_POST_WITHOUT_PRINT)}
                        </button>
                    )}
                    {onDraft && (
                        <button
                            onClick={onDraft}
                            className="rounded-[3px] border border-[#69b96f] bg-[#76c66e] px-1 py-2 text-[13px] font-bold text-white transition hover:brightness-95"
                        >
                            {tr('doc.common.save_as_draft', DEFAULT_DRAFT)}
                        </button>
                    )}
                    <button
                        onClick={onCancel}
                        className="rounded-[3px] border border-[#69b96f] bg-[#76c66e] px-1 py-2 text-[13px] font-bold text-white transition hover:brightness-95"
                    >
                        {tr('ui.no', DEFAULT_NO)}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="rounded-[3px] border border-[#2d79c7] bg-[#76c66e] px-1 py-2 text-[13px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(45,121,199,0.45)] transition hover:brightness-95"
                        autoFocus
                    >
                        {tr('ui.yes', DEFAULT_YES)}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostConfirmDialog;
