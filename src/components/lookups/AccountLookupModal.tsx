import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, BookOpen } from 'lucide-react';

/* ────────────────────────── Types ────────────────────────── */

export interface LookupAccount {
    id: string;
    code: string;
    name_ar?: string;
    name_en?: string;
    name?: string;
    account_type?: string;
    [key: string]: any;
}

interface AccountLookupModalProps {
    open: boolean;
    accounts: LookupAccount[];
    onSelect: (account: LookupAccount) => void;
    onClose: () => void;
}

/* ────────────────────────── Helpers ────────────────────────── */

const normalize = (s: string) =>
    s.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').trim();

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

/* ────────────────────────── Component ────────────────────────── */

export const AccountLookupModal: React.FC<AccountLookupModalProps> = ({
    open,
    accounts,
    onSelect,
    onClose,
}) => {
    const [query, setQuery] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'ltr';

    const filtered = accounts.filter((a) => {
        if (!query) return true;
        const q = normalize(query);
        return (
            normalize(a.code || '').includes(q) ||
            normalize(a.name_ar || '').includes(q) ||
            normalize(a.name_en || a.name || '').includes(q)
        );
    });

    useEffect(() => {
        if (open) {
            setQuery('');
            setHighlightIndex(0);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    useEffect(() => { setHighlightIndex(0); }, [query]);

    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const el = list.children[highlightIndex] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [highlightIndex]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlightIndex]) onSelect(filtered[highlightIndex]); }
            else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
        },
        [filtered, highlightIndex, onSelect, onClose],
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose} dir={currentDir}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={tr('lookup.accounts.search_placeholder', 'Search by account code or name...')}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                        dir="auto"
                    />
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div ref={listRef} className="overflow-y-auto flex-1 divide-y divide-slate-50">
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">{tr('lookup.common.no_results', 'No results found')}</div>
                    )}
                    {filtered.map((a, idx) => (
                        <button
                            key={a.id}
                            onClick={() => { setHighlightIndex(idx); onSelect(a); }}
                            className={`w-full text-right px-4 py-3 flex items-center justify-between transition-colors text-sm ${idx === highlightIndex ? 'bg-amber-50 text-amber-900' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{a.name_ar || a.name_en || a.name}</span>
                                {a.account_type && <span className="text-xs text-slate-400 mt-0.5">{a.account_type}</span>}
                            </div>
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded ml-3 flex-shrink-0">
                                {a.code}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/80 text-xs text-slate-400 flex gap-4">
                    <span>{tr('lookup.common.hint_nav', 'Up/Down navigate')}</span>
                    <span>{tr('lookup.common.hint_enter', 'Enter select')}</span>
                    <span>{tr('lookup.common.hint_esc', 'Esc close')}</span>
                    <span className="mr-auto font-mono">{filtered.length} {tr('lookup.common.results', 'results')}</span>
                </div>
            </div>
        </div>
    );
};
