import React, { useMemo, useState } from 'react';
import { AuditAction, useDocumentAudit } from '../../hooks/useDocumentAudit';

interface DocumentAuditTimelineProps {
    docType: string;
    docId: string | number | null;
}

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const translated = i18n.t(key);
        if (translated && translated !== key) return translated;
    }
    return fallback || key;
}

const EVENT_STYLE_MAP: Record<string, { key: string; fallback: string; color: string }> = {
    'document.create': {
        key: 'audit.event.document.create',
        fallback: 'Document Created',
        color: 'text-emerald-700 bg-emerald-100',
    },
    'document.update': {
        key: 'audit.event.document.update',
        fallback: 'Document Updated',
        color: 'text-blue-700 bg-blue-100',
    },
    'document.post': {
        key: 'audit.event.document.post',
        fallback: 'Document Posted',
        color: 'text-indigo-700 bg-indigo-100',
    },
    'document.void': {
        key: 'audit.event.document.void',
        fallback: 'Document Voided',
        color: 'text-rose-700 bg-rose-100',
    },
    'permission.denied': {
        key: 'audit.event.permission.denied',
        fallback: 'Permission Denied',
        color: 'text-rose-700 bg-rose-100',
    },
    'view.save': {
        key: 'audit.event.view.save',
        fallback: 'View Saved',
        color: 'text-sky-700 bg-sky-100',
    },
};

function getEventStyle(log: AuditAction): { label: string; color: string } {
    const mapped = EVENT_STYLE_MAP[log.eventType];
    if (log.summaryI18nKey) {
        return {
            label: tr(log.summaryI18nKey, mapped?.fallback || log.eventType),
            color: mapped?.color || 'text-slate-700 bg-slate-100',
        };
    }

    if (mapped) {
        return {
            label: tr(mapped.key, mapped.fallback),
            color: mapped.color,
        };
    }

    return {
        label: log.eventType,
        color: 'text-slate-700 bg-slate-100',
    };
}

function formatDateDay(value: string): string {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    });
}

function formatDateTime(value: string): string {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString();
}

function stringifyValue(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

export const DocumentAuditTimeline: React.FC<DocumentAuditTimelineProps> = ({ docType, docId }) => {
    const { auditLog, isLoading, error } = useDocumentAudit(docType, docId);
    const [isOpen, setIsOpen] = useState(false);
    const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'ltr';

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && (e.key === 't' || e.key === 'T')) {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const grouped = useMemo(() => {
        const groups: Array<{ dayKey: string; dayLabel: string; items: AuditAction[] }> = [];
        const map = new Map<string, { dayLabel: string; items: AuditAction[] }>();

        for (const row of auditLog) {
            const dayKey = Number.isNaN(new Date(row.at).getTime())
                ? String(row.at).slice(0, 10)
                : new Date(row.at).toISOString().slice(0, 10);
            const dayLabel = formatDateDay(row.at);
            if (!map.has(dayKey)) {
                map.set(dayKey, { dayLabel, items: [] });
            }
            map.get(dayKey)!.items.push(row);
        }

        for (const [dayKey, value] of map.entries()) {
            groups.push({
                dayKey,
                dayLabel: value.dayLabel,
                items: value.items.sort((a, b) => String(b.at).localeCompare(String(a.at))),
            });
        }

        return groups.sort((a, b) => b.dayKey.localeCompare(a.dayKey));
    }, [auditLog]);

    if (!docId) return null;

    return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm" dir={currentDir}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 text-start transition-colors hover:from-slate-100 hover:to-slate-100"
            >
                <div className="flex flex-col gap-1">
                    <span className="text-lg font-extrabold text-slate-800">
                        {tr('audit.timeline.title', 'Document Audit Timeline')}
                    </span>
                    <span className="text-sm text-slate-500">
                        {tr('audit.timeline.shortcut', 'Alt+T to toggle')}
                    </span>
                </div>
                <div className={`transform rounded-full border border-slate-200 bg-white p-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <div className="p-6 border-t border-slate-200">
                    {isLoading ? (
                        <div className="text-slate-500 text-center py-4">
                            {tr('audit.timeline.loading', 'Loading audit timeline...')}
                        </div>
                    ) : error ? (
                        <div className="text-rose-600 text-center py-4">
                            {tr(error, error)}
                        </div>
                    ) : grouped.length === 0 ? (
                        <div className="text-slate-500 text-center py-4">
                            {tr('audit.timeline.empty', 'No audit events found for this document.')}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {grouped.map((group) => (
                                <div key={group.dayKey}>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                        {group.dayLabel}
                                    </div>

                                    <div className="relative border-s border-slate-200 ps-6 space-y-5">
                                        {group.items.map((log) => {
                                            const style = getEventStyle(log);
                                            const expanded = Boolean(expandedEvents[log.id]);
                                            const hasFieldChanges = Array.isArray(log.fieldChanges) && log.fieldChanges.length > 0;

                                            return (
                                                <div key={log.id} className="relative">
                                                    <div className="absolute -start-[31px] top-2 w-4 h-4 rounded-full bg-white border-4 border-slate-300" />

                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.color}`}>
                                                                {style.label}
                                                            </span>
                                                            <span className="text-sm text-slate-700">
                                                                {tr('audit.timeline.actor', 'By')}: <strong>{log.actorUserId}</strong>
                                                            </span>
                                                            <span className="text-xs text-slate-500" dir="ltr">
                                                                {formatDateTime(log.at)}
                                                            </span>
                                                        </div>

                                                        {hasFieldChanges && (
                                                            <button
                                                                onClick={() => setExpandedEvents((prev) => ({ ...prev, [log.id]: !expanded }))}
                                                                className="self-start text-xs text-blue-700 hover:text-blue-900 font-medium"
                                                            >
                                                                {expanded
                                                                    ? tr('audit.timeline.hide_changes', 'Hide Field Changes')
                                                                    : tr('audit.timeline.show_changes', 'Show Field Changes')}
                                                            </button>
                                                        )}

                                                        {expanded && hasFieldChanges && (
                                                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 overflow-auto">
                                                                <table className="w-full text-xs text-start">
                                                                    <thead>
                                                                        <tr className="text-slate-600">
                                                                            <th className="py-1 pe-2">{tr('audit.timeline.field', 'Field')}</th>
                                                                            <th className="py-1 pe-2">{tr('audit.timeline.old_value', 'Old')}</th>
                                                                            <th className="py-1">{tr('audit.timeline.new_value', 'New')}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-200">
                                                                        {log.fieldChanges.map((field) => (
                                                                            <tr key={field.id}>
                                                                                <td className="py-1 pe-2 font-mono text-slate-700">{field.fieldPath}</td>
                                                                                <td className="py-1 pe-2 text-rose-700 break-all">{stringifyValue(field.oldValue)}</td>
                                                                                <td className="py-1 text-emerald-700 break-all">{stringifyValue(field.newValue)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
