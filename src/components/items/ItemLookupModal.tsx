import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { searchItemsByInput, ItemLike } from '../../../utils/itemLookup';

const getName = (i: ItemLike) => i.name_ar || i.name || i.name_en || '';

export function ItemLookupModal({
    open,
    items,
    initialQuery = '',
    onClose,
    onSelect
}: {
    open: boolean;
    items: ItemLike[];
    initialQuery?: string;
    onClose: () => void;
    onSelect: (item: ItemLike) => void;
}) {
    const [q, setQ] = useState(initialQuery);
    const [hi, setHi] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setQ(initialQuery || '');
        setHi(0);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [open, initialQuery]);

    const results = useMemo(() => {
        if (!open) return [];
        const list = q.trim()
            ? searchItemsByInput(items, q, 30)
            : [...items].slice(0, 30);
        return list;
    }, [open, q, items]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHi((p) => (results.length ? (p + 1) % results.length : 0));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHi((p) => (results.length ? (p - 1 + results.length) % results.length : 0));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const it = results[hi] || results[0];
                if (it) onSelect(it);
                return;
            }
        };
        window.addEventListener('keydown', onKey as unknown as EventListener, { passive: false });
        return () => window.removeEventListener('keydown', onKey as unknown as EventListener);
    }, [open, results, hi, onClose, onSelect]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[14000] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="font-bold text-slate-700">بحث الأصناف (F2)</div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setHi(0);
                        }}
                        placeholder="ابحث بالكود / الباركود / الاسم..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                        autoComplete="off"
                    />
                    <div className="mt-2 text-xs text-slate-500">
                        Enter اختيار | ↑↓ تنقل | Esc إغلاق
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-auto">
                    {results.length ? (
                        results.map((it, idx) => (
                            <button
                                key={it.id}
                                type="button"
                                onClick={() => onSelect(it)}
                                className={`w-full px-4 py-3 flex items-center justify-between text-right border-b border-slate-100 last:border-b-0 ${idx === hi ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                            >
                                <div className="min-w-0">
                                    <div className="font-medium truncate">{getName(it) || '-'}</div>
                                    <div className="text-xs text-slate-500 truncate">{it.description || ''}</div>
                                </div>
                                <div className="font-mono text-xs text-slate-600 mr-3 whitespace-nowrap">
                                    {it.barcode ? `${it.code || ''} | ${it.barcode}` : (it.code || '')}
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-6 text-center text-slate-500">لا توجد نتائج</div>
                    )}
                </div>
            </div>
        </div>
    );
}
