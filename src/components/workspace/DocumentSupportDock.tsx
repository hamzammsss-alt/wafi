import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Layers3, ListTree, Settings2, X } from 'lucide-react';

const DOCUMENT_SUPPORT_DOCK_ENABLED = false;

export type DocumentSupportSection = {
    id: string;
    label: string;
    description?: string;
    group?: 'definitions' | 'lists';
    render: () => React.ReactNode;
};

interface DocumentSupportDockProps {
    title?: string;
    description?: string;
    sections: DocumentSupportSection[];
    defaultSectionId?: string;
    quickOpenLimit?: number;
    className?: string;
}

const GROUP_META: Record<'definitions' | 'lists', { label: string; icon: React.ReactNode }> = {
    definitions: {
        label: 'التعريفات',
        icon: <Settings2 size={14} />,
    },
    lists: {
        label: 'القوائم',
        icon: <ListTree size={14} />,
    },
};

function dedupeSections(sections: DocumentSupportSection[]): DocumentSupportSection[] {
    const seen = new Set<string>();
    return sections.filter((section) => {
        if (!section?.id || seen.has(section.id)) return false;
        seen.add(section.id);
        return true;
    });
}

export function DocumentSupportDock({
    title = 'لوحة التعريفات والقوائم',
    description = 'يمكنك إدارة التعريفات أو مراجعة القوائم من فوق السند مباشرة دون مغادرة الشاشة.',
    sections,
    defaultSectionId,
    quickOpenLimit = 5,
    className = '',
}: DocumentSupportDockProps) {
    const normalizedSections = useMemo(() => dedupeSections(sections || []), [sections]);
    const [open, setOpen] = useState(false);
    const [activeId, setActiveId] = useState<string>(defaultSectionId || normalizedSections[0]?.id || '');

    useEffect(() => {
        if (!normalizedSections.length) return;
        if (normalizedSections.some((section) => section.id === activeId)) return;
        setActiveId(defaultSectionId || normalizedSections[0]?.id || '');
    }, [activeId, defaultSectionId, normalizedSections]);

    useEffect(() => {
        if (!open) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    const activeSection = normalizedSections.find((section) => section.id === activeId) || normalizedSections[0];
    const quickSections = normalizedSections.slice(0, quickOpenLimit);
    const groupedSections = normalizedSections.reduce<Record<string, DocumentSupportSection[]>>((acc, section) => {
        const groupKey = section.group || 'definitions';
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(section);
        return acc;
    }, {});

    if (!DOCUMENT_SUPPORT_DOCK_ENABLED || !normalizedSections.length) return null;

    return (
        <>
            <div className={`app-elevated mb-4 p-4 ${className}`} dir="rtl">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-sky-500 text-white shadow-lg shadow-sky-900/20">
                                <Layers3 size={20} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-extrabold text-slate-900">{title}</h3>
                                <p className="mt-1 text-sm text-slate-500">{description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {quickSections.map((section) => (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => {
                                    setActiveId(section.id);
                                    setOpen(true);
                                }}
                                className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-sm"
                            >
                                {section.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setOpen(true)}
                            className="rounded-xl bg-gradient-to-r from-teal-600 to-sky-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-900/15 transition hover:brightness-105"
                        >
                            فتح اللوحة
                        </button>
                    </div>
                </div>
            </div>

            {open && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[95] bg-slate-950/30 p-4 backdrop-blur-sm md:p-6" dir="rtl">
                    <div className="mx-auto flex h-full max-w-[1680px] overflow-hidden rounded-[30px] border border-slate-200 bg-[#eef3fb] shadow-2xl shadow-slate-900/20">
                        <aside className="hidden w-80 shrink-0 border-l border-slate-200 bg-white/85 p-4 backdrop-blur md:flex md:flex-col">
                            <div className="mb-4 border-b border-slate-100 pb-4">
                                <div className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">Workspace</div>
                                <h3 className="mt-2 text-xl font-extrabold text-slate-900">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                            </div>

                            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                                {(Object.entries(groupedSections) as Array<[keyof typeof GROUP_META, DocumentSupportSection[]]>).map(([groupKey, groupSections]) => (
                                    <div key={groupKey} className="space-y-2">
                                        <div className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                            {GROUP_META[groupKey]?.icon}
                                            <span>{GROUP_META[groupKey]?.label || groupKey}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {groupSections.map((section) => {
                                                const active = activeSection?.id === section.id;
                                                return (
                                                    <button
                                                        key={section.id}
                                                        type="button"
                                                        onClick={() => setActiveId(section.id)}
                                                        className={`w-full rounded-2xl border px-4 py-3 text-right transition ${
                                                            active
                                                                ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm'
                                                                : 'border-slate-200 bg-white/80 text-slate-700 hover:border-sky-100 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className="text-sm font-extrabold">{section.label}</div>
                                                        {section.description && (
                                                            <div className="mt-1 text-xs leading-5 text-slate-500">{section.description}</div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </aside>

                        <div className="flex min-w-0 flex-1 flex-col">
                            <div className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur md:px-6">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                            <span>{activeSection?.group === 'lists' ? 'القوائم' : 'التعريفات'}</span>
                                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                                            <span>{normalizedSections.length} أقسام</span>
                                        </div>
                                        <h4 className="mt-2 truncate text-2xl font-extrabold text-slate-900">{activeSection?.label}</h4>
                                        {activeSection?.description && (
                                            <p className="mt-1 text-sm text-slate-500">{activeSection.description}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-wrap gap-2 md:hidden">
                                            {quickSections.map((section) => (
                                                <button
                                                    key={section.id}
                                                    type="button"
                                                    onClick={() => setActiveId(section.id)}
                                                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                                        activeSection?.id === section.id
                                                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                            : 'border-slate-200 bg-white text-slate-600'
                                                    }`}
                                                >
                                                    {section.label}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setOpen(false)}
                                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-rose-600"
                                            aria-label="إغلاق"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-auto bg-[#eef3fb] p-3 md:p-5">
                                <div className="min-h-full overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                                    {activeSection ? activeSection.render() : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
