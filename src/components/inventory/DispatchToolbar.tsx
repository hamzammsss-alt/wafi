import React, { useEffect } from "react";

export type DispatchStatus = "محفوظ" | "عالق" | "مرحل";

export function DispatchToolbar(props: {
    status: DispatchStatus;
    onNew: () => void;
    onSave: () => void;
    onSearch: () => void;
    onPrint: () => void;

    onPostToPending: () => void;         // محفوظ -> عالق
    onInvoiceFromDispatch: () => void;   // عالق -> مرحل
}) {
    // اختصارات كيبورد
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F2") props.onNew();
            if (e.key === "F3") props.onSearch();

            if (e.ctrlKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                props.onSave();
            }
            if (e.ctrlKey && e.key.toLowerCase() === "p") {
                e.preventDefault();
                props.onPrint();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [props]);

    const canEdit = props.status !== "مرحل" && props.status !== "عالق";
    const canPostToPending = props.status === "محفوظ";
    const canInvoice = props.status === "عالق";

    return (
        <div className="flex gap-2 items-center px-4 py-2 border-b border-slate-200 bg-white shadow-sm sticky top-0 z-20">
            <button
                onClick={props.onNew}
                className="px-4 py-1.5 text-sm font-medium border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
                جديد (F2)
            </button>

            <button
                onClick={props.onSave}
                disabled={!canEdit}
                className="px-4 py-1.5 text-sm font-medium border border-slate-300 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                حفظ (Ctrl+S)
            </button>

            <button
                onClick={props.onSearch}
                className="px-4 py-1.5 text-sm font-medium border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
                بحث (F3)
            </button>

            <button
                onClick={props.onPrint}
                className="px-4 py-1.5 text-sm font-medium border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
                طباعة (Ctrl+P)
            </button>

            {/* Separator */}
            <div className="w-px h-6 bg-slate-300 mx-1" />

            {/* ترحيل أولي */}
            <button
                onClick={props.onPostToPending}
                disabled={!canPostToPending}
                className="px-4 py-1.5 text-sm font-medium border border-slate-300 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                ترحيل إلى عالق
            </button>

            {/* Dropdown تحويل */}
            <div className="relative group/dropdown">
                <details className="relative [&_summary::-webkit-details-marker]:hidden">
                    <summary className="cursor-pointer list-none px-4 py-1.5 text-sm font-medium border border-slate-300 rounded flex items-center gap-1 hover:bg-slate-50 transition-colors">
                        تحويل ▾
                    </summary>
                    <div className="absolute top-[120%] right-0 bg-white border border-slate-200 min-w-[180px] z-[9999] shadow-lg rounded py-1 flex flex-col">
                        <button
                            className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!canInvoice}
                            onClick={(e) => {
                                const details = e.currentTarget.closest('details');
                                if (details) details.removeAttribute('open');
                                props.onInvoiceFromDispatch();
                            }}
                        >
                            فاتورة (من العالق)
                        </button>
                        <button
                            className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled
                        >
                            سند استلام (لاحقاً)
                        </button>
                    </div>
                </details>
            </div>

            <div className="mr-auto">
                <span className={`px-4 py-1 rounded-full text-sm font-bold text-white tracking-wide
            ${props.status === "محفوظ" ? "bg-blue-500" : props.status === "عالق" ? "bg-amber-500" : "bg-green-600"}
        `}>
                    {props.status || "محفوظ"}
                </span>
            </div>
        </div>
    );
}
