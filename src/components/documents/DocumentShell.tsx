import React, { useEffect } from 'react';
import { CheckCircle2, Command, FilePlus2, Printer, Save, Send } from 'lucide-react';
import { DocumentStatus } from '../../types/approval';
import { DocumentStatusBadge } from '../ui/DocumentStatusBadge';
import { DocumentAuditTimeline } from './DocumentAuditTimeline';

interface DocumentShellProps {
    title: string;
    status: DocumentStatus | string;
    isEditable: boolean;
    onNew: () => void;
    onSave: () => void;
    onPost: () => void;
    onPrint?: () => void;
    onReject?: () => void;
    onReopen?: () => void;
    docType?: string;
    docId?: string | number | null;
    docNo?: string | number;
    children: React.ReactNode;
    hotkeysHint?: string;
    lastAction?: string;
    showHotkeysBar?: boolean;
    primaryHeaderRef?: React.RefObject<HTMLElement>;
    focusPrimaryGrid?: () => void;
    onEscape?: () => void;
    saveDisabled?: boolean;
    postDisabled?: boolean;
    printDisabled?: boolean;
}

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

const DEFAULT_HINT = 'F2 Lookup | F3 New | F4 Save | F9 Post/Submit | F10 Print | Esc Close';

export const DocumentShell: React.FC<DocumentShellProps> = ({
    title,
    status,
    isEditable,
    onNew,
    onSave,
    onPost,
    onPrint,
    onReject,
    onReopen,
    docType,
    docId,
    docNo,
    children,
    hotkeysHint = DEFAULT_HINT,
    lastAction,
    showHotkeysBar = true,
    primaryHeaderRef,
    saveDisabled = false,
    postDisabled = false,
    printDisabled = false,
}) => {
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'ltr';

    useEffect(() => {
        if (primaryHeaderRef?.current) {
            setTimeout(() => {
                try {
                    primaryHeaderRef.current?.focus?.();
                } catch {
                    // ignore focus failures
                }
            }, 0);
        }
    }, [primaryHeaderRef]);

    return (
        <div className="document-shell min-h-screen p-4 md:p-6" dir={currentDir}>
            <div className="app-elevated mb-4 overflow-hidden p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-sky-500 text-white shadow-md">
                            <CheckCircle2 size={18} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-xl font-extrabold text-slate-900 md:text-2xl">{title}</h2>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                {docNo !== undefined && (
                                    <span className="rounded-lg border border-slate-200 bg-white/85 px-2 py-1 font-mono">
                                        {tr('doc.common.number', 'No')}: {String(docNo)}
                                    </span>
                                )}
                                {docId && (
                                    <span className="rounded-lg border border-slate-200 bg-white/85 px-2 py-1 font-mono">
                                        ID: {String(docId)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <DocumentStatusBadge status={status} className="px-3 py-1 text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onNew}
                            className="app-toolbar-btn app-focus-ring"
                        >
                            <FilePlus2 size={16} />
                            <span>F3</span>
                            <span>{tr('doc.common.new', 'New')}</span>
                        </button>
                        <button
                            onClick={onSave}
                            disabled={!isEditable || saveDisabled}
                            className="app-toolbar-btn app-focus-ring disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            <Save size={16} />
                            <span>F4</span>
                            <span>{tr('doc.common.save', 'Save')}</span>
                        </button>
                        {onPrint && (
                            <button
                                onClick={onPrint}
                                disabled={printDisabled}
                                className="app-toolbar-btn app-focus-ring disabled:cursor-not-allowed disabled:opacity-55"
                            >
                                <Printer size={16} />
                                <span>F10</span>
                                <span>{tr('doc.common.print', 'Print')}</span>
                            </button>
                        )}
                        <button
                            onClick={onPost}
                            disabled={postDisabled || (status !== 'DRAFT' && status !== 'PENDING_APPROVAL' && status !== 'REJECTED')}
                            className="rounded-xl bg-gradient-to-r from-teal-600 to-sky-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/20 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            <span className="inline-flex items-center gap-2">
                                <Send size={15} />
                                <span>F9</span>
                                <span>{tr('doc.common.post', 'Post/Submit')}</span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {showHotkeysBar && (
                <div className="mb-4 flex flex-col justify-between gap-2 rounded-xl border border-slate-200/90 bg-white/75 px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">F2 {tr('doc.common.lookup', 'Lookup')}</span>
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">Del {tr('doc.common.delete_line', 'Delete line')}</span>
                        {onPrint && <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">F10 {tr('doc.common.print', 'Print')}</span>}
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">Alt+T {tr('audit.timeline.title', 'Timeline')}</span>
                    </div>
                    {lastAction ? (
                        <div className="text-xs text-slate-600">
                            <span className="font-semibold">{tr('doc.common.last_action', 'Last action')}:</span> {lastAction}
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Command size={12} />
                            <span>{hotkeysHint}</span>
                        </div>
                    )}
                </div>
            )}

            <div className={`document-body rounded-2xl border p-4 shadow-sm transition-all md:p-6 ${!isEditable ? 'border-amber-200 bg-amber-50/30 shadow-inner' : 'border-slate-200 bg-white/90'}`}>
                {children}
            </div>

            {(onReject || onReopen) && (
                <div className="mt-3 flex items-center justify-end gap-3">
                    {onReject && status === 'PENDING_APPROVAL' && (
                        <button
                            onClick={onReject}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                            {tr('doc.common.reject', 'Reject')}
                        </button>
                    )}
                    {onReopen && status === 'REJECTED' && (
                        <button
                            onClick={onReopen}
                            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                        >
                            {tr('doc.common.reopen', 'Reopen')}
                        </button>
                    )}
                </div>
            )}

            {docType && docId && <DocumentAuditTimeline docType={docType} docId={docId} />}
        </div>
    );
};
