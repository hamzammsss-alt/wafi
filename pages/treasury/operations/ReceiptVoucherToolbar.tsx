import React from 'react';
import { Plus, Download, Printer, SlidersHorizontal, Trash2, Edit, Copy, RefreshCw, ChevronDown, CheckSquare } from 'lucide-react';
import { FloatingDropdown } from '../../../src/components/ui/FloatingDropdown';

interface ReceiptVoucherToolbarProps {
    selectedRowsCount: number;
    rowDensity: 'comfortable' | 'compact';
    onNew: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onExport: (format: 'excel' | 'pdf') => void;
    onPrint: () => void;
    onOpenFilters: () => void;
    onRefresh: () => void;
    onSetRowDensity: (density: 'comfortable' | 'compact') => void;
    groupBy?: string | null;
    onSetGroupBy?: (key: string | null) => void;
    groupableColumns?: { key: string; label: string }[];
}

const ReceiptVoucherToolbar: React.FC<ReceiptVoucherToolbarProps> = ({
    selectedRowsCount,
    rowDensity,
    onNew,
    onEdit,
    onDuplicate,
    onDelete,
    onExport,
    onPrint,
    onOpenFilters,
    onRefresh,
    onSetRowDensity,
    groupBy,
    onSetGroupBy,
    groupableColumns
}) => {
    const [openMenu, setOpenMenu] = React.useState<'export' | 'properties' | null>(null);
    const exportItemClass = 'flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800';

    return (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
            <button
                type="button"
                onClick={onNew}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:brightness-105"
            >
                <Plus size={16} />
                <span>جديد</span>
            </button>

            <button
                type="button"
                onClick={onEdit}
                disabled={selectedRowsCount !== 1}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Edit size={16} />
                <span>تعديل</span>
            </button>

            <button
                type="button"
                onClick={onDuplicate}
                disabled={selectedRowsCount !== 1}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Copy size={16} />
                <span>نسخ</span>
            </button>

            <button
                type="button"
                onClick={onDelete}
                disabled={selectedRowsCount === 0}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Trash2 size={16} />
                <span>حذف</span>
            </button>

            <div className="mx-1 hidden h-6 w-px bg-slate-200 md:block" />

            <button
                type="button"
                onClick={onPrint}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
            >
                <Printer size={16} />
                <span>طباعة</span>
            </button>

            <FloatingDropdown
                isOpen={openMenu === 'export'}
                onClose={() => setOpenMenu(null)}
                menuWidth={160}
                title="تصدير"
                trigger={
                    <button
                        type="button"
                        onClick={() => setOpenMenu((prev) => (prev === 'export' ? null : 'export'))}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                    >
                        <Download size={16} />
                        <span>تصدير</span>
                        <ChevronDown size={14} />
                    </button>
                }
            >
                <button
                    type="button"
                    role="menuitem"
                    className={exportItemClass}
                    onClick={() => {
                        onExport('excel');
                        setOpenMenu(null);
                    }}
                >
                    <span>Excel</span>
                </button>
                <button
                    type="button"
                    role="menuitem"
                    className={exportItemClass}
                    onClick={() => {
                        onExport('pdf');
                        setOpenMenu(null);
                    }}
                >
                    <span>PDF</span>
                </button>
            </FloatingDropdown>

            <button
                type="button"
                onClick={onOpenFilters}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
            >
                <SlidersHorizontal size={16} />
                <span>تصفية</span>
            </button>

            <button
                type="button"
                onClick={onRefresh}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
            >
                <RefreshCw size={16} />
                <span>تحديث</span>
            </button>

            <FloatingDropdown
                isOpen={openMenu === 'properties'}
                onClose={() => setOpenMenu(null)}
                menuWidth={250}
                title="خصائص العرض"
                trigger={
                    <button
                        type="button"
                        onClick={() => setOpenMenu((prev) => (prev === 'properties' ? null : 'properties'))}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                    >
                        <SlidersHorizontal size={16} />
                        <span>خصائص</span>
                        <ChevronDown size={14} />
                    </button>
                }
            >
                <div className="px-3 py-2">
                    <div className="mb-2 text-xs font-bold text-slate-500">كثافة الصفوف</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => onSetRowDensity('comfortable')}
                            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${rowDensity === 'comfortable' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-700'}`}
                        >
                            مريحة
                        </button>
                        <button
                            type="button"
                            onClick={() => onSetRowDensity('compact')}
                            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${rowDensity === 'compact' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-700'}`}
                        >
                            مدمجة
                        </button>
                    </div>
                    {groupableColumns && groupableColumns.length > 0 && onSetGroupBy && (
                        <>
                            <div className="mb-2 mt-4 text-xs font-bold text-slate-500">تجميع حسب</div>
                            <select
                                value={groupBy || ''}
                                onChange={(e) => onSetGroupBy(e.target.value || null)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
                            >
                                <option value="">بدون تجميع</option>
                                {groupableColumns.map(c => (
                                    <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
            </FloatingDropdown>

            <div className="mr-auto inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <CheckSquare size={14} />
                <span>{selectedRowsCount} محدد</span>
            </div>
        </div>
    );
};

export default ReceiptVoucherToolbar;
