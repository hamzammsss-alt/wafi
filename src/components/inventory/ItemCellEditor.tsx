import React, { useRef, useState } from "react";
import { Plus } from "lucide-react";

type Item = { id: number; code: string; name: string; uom: string };

export function ItemCellEditor(props: {
    value?: string;
    onPick: (item: Item) => void;
    onOpenPicker: () => void; // يفتح شاشة اختيار صنف الكبيرة + زر إضافة
}) {
    const [q, setQ] = useState(props.value ?? "");
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Item[]>([]);
    const [active, setActive] = useState(0);
    const t = useRef<number | null>(null);

    async function runSuggest(text: string) {
        const s = text.trim();
        if (!s) { setItems([]); setOpen(false); return; }

        const api = (window as any).electronAPI;
        if (api?.inventory?.suggestItems) {
            const res = await api.inventory.suggestItems(s, 20);
            setItems(res || []);
            setActive(0);
            setOpen((res || []).length > 0);
        } else {
            console.error("electronAPI.inventory.suggestItems is not defined");
            setItems([]);
            setOpen(false);
        }
    }

    function debounceSuggest(text: string) {
        if (t.current) window.clearTimeout(t.current);
        t.current = window.setTimeout(() => runSuggest(text), 120);
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        // F2 يفتح شاشة اختيار صنف كبيرة
        if (e.key === "F2") {
            e.preventDefault();
            props.onOpenPicker();
            return;
        }

        if (!open) return;

        if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
        if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            if (items[active]) {
                props.onPick(items[active]);
                setQ(items[active].code);
            }
            setOpen(false);
        }
    }

    return (
        <div className="relative w-full">
            <input
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    debounceSuggest(e.target.value);
                }}
                onKeyDown={onKeyDown}
                placeholder="رقم الصنف"
                className="w-full px-2 py-1.5 bg-transparent border border-transparent rounded-md text-sm text-center font-medium text-slate-800 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />

            {open && items.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 z-[9999] max-h-[260px] overflow-auto shadow-lg rounded-b-md mt-1">
                    {items.map((it, idx) => (
                        <div
                            key={it.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                props.onPick(it);
                                setQ(it.code);
                                setOpen(false);
                            }}
                            className={`px-3 py-2 cursor-pointer flex justify-between items-center gap-3 border-b border-slate-50 last:border-b-0 transition-colors ${idx === active ? 'bg-indigo-50/70 border-l-2 border-indigo-600' : 'hover:bg-slate-50 border-l-2 border-transparent'}`}
                        >
                            <span className="text-sm font-medium text-slate-800 truncate">{it.name}</span>
                            <span className="text-xs text-slate-500 font-mono bg-slate-100/50 px-2 py-0.5 rounded shrink-0">{it.code}</span>
                        </div>
                    ))}

                    <div className="border-t border-slate-200 p-2 bg-slate-50 sticky bottom-0">
                        <button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                props.onOpenPicker();
                                setOpen(false);
                            }}
                            className="w-full flex justify-center items-center gap-2 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors rounded"
                        >
                            <Plus className="w-4 h-4" />
                            المزيد… / إضافة صنف
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
