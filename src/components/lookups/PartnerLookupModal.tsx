import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Users } from 'lucide-react';

/* ────────────────────────── Types ────────────────────────── */

export interface LookupPartner {
    id: string;
    code?: string;
    partner_code?: string;
    name_ar?: string;
    name_en?: string;
    name?: string;
    [key: string]: any;
}

interface PartnerLookupModalProps {
    open: boolean;
    partners: LookupPartner[];
    partnerType?: 'SUPPLIER' | 'CUSTOMER' | 'ALL';
    onSelect: (partner: LookupPartner) => void;
    onClose: () => void;
}

/* ────────────────────────── Helpers ────────────────────────── */

const normalize = (s: string) =>
    s.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').trim();

/* ────────────────────────── Component ────────────────────────── */

export const PartnerLookupModal: React.FC<PartnerLookupModalProps> = ({
    open,
    partners,
    partnerType = 'ALL',
    onSelect,
    onClose,
}) => {
    const [query, setQuery] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filtered = partners.filter((p) => {
        if (!query) return true;
        const q = normalize(query);
        return (
            normalize(p.code || p.partner_code || '').includes(q) ||
            normalize(p.name_ar || '').includes(q) ||
            normalize(p.name_en || p.name || '').includes(q)
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

    const label = partnerType === 'SUPPLIER' ? 'بحث عن مورد' : partnerType === 'CUSTOMER' ? 'بحث عن عميل' : 'بحث عن شريك تجاري';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3">
                    <Users className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`${label}...`}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                        dir="auto"
                    />
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div ref={listRef} className="overflow-y-auto flex-1 divide-y divide-slate-50">
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">لا توجد نتائج</div>
                    )}
                    {filtered.map((p, idx) => (
                        <button
                            key={p.id}
                            onClick={() => { setHighlightIndex(idx); onSelect(p); }}
                            className={`w-full text-right px-4 py-3 flex items-center justify-between transition-colors text-sm ${idx === highlightIndex ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                        >
                            <span className="font-medium truncate">{p.name_ar || p.name_en || p.name}</span>
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded ml-3 flex-shrink-0">
                                {p.code || p.partner_code || '-'}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/80 text-xs text-slate-400 flex gap-4">
                    <span>↑↓ تنقل</span><span>Enter اختيار</span><span>Esc إغلاق</span>
                    <span className="mr-auto font-mono">{filtered.length} نتيجة</span>
                </div>
            </div>
        </div>
    );
};
