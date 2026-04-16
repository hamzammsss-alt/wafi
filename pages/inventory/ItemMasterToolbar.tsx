import React from 'react';
import { BarChart2, Barcode, CheckSquare, ChevronDown, Copy, Download, Edit, Package, Plus, Printer, SlidersHorizontal, Star, Store, Trash2 } from 'lucide-react';
import { FloatingDropdown } from '../../src/components/ui/FloatingDropdown';

export interface ViewDefinition {
    id: string;
    name: string;
    isDefault?: boolean;
    [key: string]: any;
}

interface ItemMasterToolbarProps {
    selectedRowsCount: number;
    activeViewId: string | null;
    views: ViewDefinition[];
    onCreate: () => void;
    onEditSelected: () => void;
    onDuplicateSelected: () => void;
    onDeleteSelected: () => void;
    onExport: (format: 'excel' | 'html' | 'delimited' | 'json' | 'pdf') => void;
    onOpenFilters: () => void;
    onSelectView: (viewId: string) => void;
    onResetView: () => void;
    onSetDefaultView: (viewId: string | null) => void;
    onOpenMovementReport: () => void;
    onOpenWarehouseReport: () => void;
    onPrintBarcode: () => void;
    onPrint: () => void;
    pinFirstColumn: boolean;
    rowDensity: 'comfortable' | 'compact';
    zoom: number;
    onTogglePinFirstColumn: () => void;
    onSetRowDensity: (density: 'comfortable' | 'compact') => void;
    onSetZoom: (nextZoom: number) => void;
    onResetZoom: () => void;
}

const ItemMasterToolbar: React.FC<ItemMasterToolbarProps> = ({
    selectedRowsCount,
    activeViewId,
    views,
    onCreate,
    onEditSelected,
    onDuplicateSelected,
    onDeleteSelected,
    onExport,
    onOpenFilters,
    onSelectView,
    onResetView,
    onSetDefaultView,
    onOpenMovementReport,
    onOpenWarehouseReport,
    onPrintBarcode,
    onPrint,
    pinFirstColumn,
    rowDensity,
    zoom,
    onTogglePinFirstColumn,
    onSetRowDensity,
    onSetZoom,
    onResetZoom,
}) => {
    const [openMenu, setOpenMenu] = React.useState<'export' | 'reports' | 'properties' | null>(null);
    const exportItemClass = 'flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800';

    return (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
            <button
                type="button"
                onClick={onCreate}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:brightness-105"
            >
                <Plus size={16} />
                <span>جديد</span>
            </button>
            <button
                type="button"
                onClick={onEditSelected}
                disabled={selectedRowsCount !== 1}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Edit size={16} />
                <span>تعديل</span>
            </button>
            <button
                type="button"
                onClick={onDuplicateSelected}
                disabled={selectedRowsCount !== 1}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Copy size={16} />
                <span>نسخ</span>
            </button>
            <button
                type="button"
                onClick={onDeleteSelected}
                disabled={selectedRowsCount === 0}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Trash2 size={16} />
                <span>حذف</span>
            </button>

            <FloatingDropdown
                isOpen={openMenu === 'export'}
                onClose={() => setOpenMenu(null)}
                menuWidth={210}
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
                <button type="button" role="menuitem" className={exportItemClass} onClick={() => { onExport('excel'); setOpenMenu(null); }}><span>Excel</span></button>
                <button type="button" role="menuitem" className={exportItemClass} onClick={() => { onExport('html'); setOpenMenu(null); }}><span>HTML</span></button>
                <button type="button" role="menuitem" className={exportItemClass} onClick={() => { onExport('delimited'); setOpenMenu(null); }}><span>Delimited text</span></button>
                <button type="button" role="menuitem" className={exportItemClass} onClick={() => { onExport('json'); setOpenMenu(null); }}><span>JSON</span></button>
                <button type="button" role="menuitem" className={exportItemClass} onClick={() => { onExport('pdf'); setOpenMenu(null); }}><span>PDF</span></button>
            </FloatingDropdown>

            <div className="mx-1 hidden h-6 w-px bg-slate-200 md:block" />

            <FloatingDropdown
                isOpen={openMenu === 'reports'}
                onClose={() => setOpenMenu(null)}
                menuWidth={240}
                title="تقارير الصنف"
                trigger={
                    <button
                        type="button"
                        onClick={() => setOpenMenu((prev) => (prev === 'reports' ? null : 'reports'))}
                        disabled={selectedRowsCount !== 1}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <BarChart2 size={16} />
                        <span>تقارير</span>
                        <ChevronDown size={14} />
                    </button>
                }
            >
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => { onOpenMovementReport(); setOpenMenu(null); }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800"
                >
                    <span>كرت الصنف</span>
                    <Package size={14} className="text-slate-400" />
                </button>
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => { onOpenWarehouseReport(); setOpenMenu(null); }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800"
                >
                    <span>الكمية حسب المستودع</span>
                    <Store size={14} className="text-slate-400" />
                </button>
            </FloatingDropdown>

            <button
                type="button"
                onClick={onPrintBarcode}
                disabled={selectedRowsCount !== 1}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Barcode size={16} />
                <span>طباعة باركود</span>
            </button>

            <button
                type="button"
                onClick={onPrint}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50"
            >
                <Printer size={16} />
                <span>طباعة</span>
            </button>

            <FloatingDropdown
                isOpen={openMenu === 'properties'}
                onClose={() => setOpenMenu(null)}
                menuWidth={280}
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
                <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={pinFirstColumn}
                    onClick={onTogglePinFirstColumn}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-800"
                >
                    <span>تثبيت أول عمود</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${pinFirstColumn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {pinFirstColumn ? 'مفعل' : 'معطل'}
                    </span>
                </button>

                <div className="my-1 h-px bg-slate-100" />

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
                </div>

                <div className="my-1 h-px bg-slate-100" />

                <div className="px-3 py-2">
                    <div className="mb-2 text-xs font-bold text-slate-500">التكبير</div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onSetZoom(Math.max(0.5, Number((zoom - 0.1).toFixed(2))))}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                        >
                            -
                        </button>
                        <div className="min-w-[64px] text-center text-xs font-bold text-slate-600">{Math.round(zoom * 100)}%</div>
                        <button
                            type="button"
                            onClick={() => onSetZoom(Math.min(2, Number((zoom + 0.1).toFixed(2))))}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                        >
                            +
                        </button>
                        <button
                            type="button"
                            onClick={onResetZoom}
                            className="mr-auto rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
                        >
                            افتراضي
                        </button>
                    </div>
                </div>
            </FloatingDropdown>

            <div className="mx-1 hidden h-6 w-px bg-slate-200 md:block" />

            <select
                value={activeViewId || ''}
                onChange={(event) => {
                    const viewId = event.target.value;
                    if (!viewId) {
                        onResetView();
                        return;
                    }
                    onSelectView(viewId);
                }}
                className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
                <option value="">العرض الحالي</option>
                {views.map((view) => (
                    <option key={view.id} value={view.id}>
                        {view.name}{view.isDefault ? ' • افتراضي' : ''}
                    </option>
                ))}
            </select>
            <button
                type="button"
                onClick={() => onSetDefaultView(activeViewId)}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50"
            >
                <Star size={16} />
                <span>تعيين كافتراضي</span>
            </button>

            <div className="mr-auto inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <CheckSquare size={14} />
                <span>{selectedRowsCount} محدد</span>
            </div>
        </div>
    );
};

export default ItemMasterToolbar;