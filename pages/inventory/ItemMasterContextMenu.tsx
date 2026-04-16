import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownAZ, ArrowUpZA, ChevronLeft, Columns3, Copy, Filter, Maximize2, Package, RefreshCw, Store, Trash2 } from 'lucide-react';
import { GridContextMenuState, ColumnFilterOperator } from './ItemMaster';
import { getFloatingMenuPositionFromPoint } from '../../src/lib/floatingMenu';

interface ItemMasterContextMenuProps {
    contextMenu: GridContextMenuState;
    selectedColumnKeys: string[];
    columnWidthInput: string;
    visibleColumnKeys: string[];

    onClose: () => void;
    getColumnLabel: (key: string) => string;
    getTargetColumnKeys: (key: string) => string[];

    onEditRecord: () => void;
    onOpenStockByWarehouse: () => void;
    onDuplicateRecord: () => void;
    onDeleteRecord: () => void;

    onSort: (key: string, direction: 'asc' | 'desc') => void;
    onClearSort: () => void;

    onApplyFilter: (keys: string[], operator: ColumnFilterOperator, value: string) => void;
    onClearFilter: (keys: string[]) => void;
    onOpenAdvancedFilter: (key: string) => void;

    onHideColumns: (keys: string[]) => void;
    onShowAllColumns: () => void;
    onSelectAllVisibleColumns: () => void;
    onClearColumnSelection: () => void;

    onAdjustWidth: (keys: string[], delta: number) => void;
    onAutoFitWidth: (keys: string[]) => void;
    setColumnWidthInput: (val: string) => void;
    onSetExactWidth: (keys: string[], width: number) => void;

    onRefresh: () => void;
    onExportCsv: () => void;
    onCopySelectedRows: () => void;
}

const ItemMasterContextMenu: React.FC<ItemMasterContextMenuProps> = ({
    contextMenu,
    selectedColumnKeys,
    columnWidthInput,
    visibleColumnKeys,
    onClose,
    getColumnLabel,
    getTargetColumnKeys,
    onEditRecord,
    onOpenStockByWarehouse,
    onDuplicateRecord,
    onDeleteRecord,
    onSort,
    onClearSort,
    onApplyFilter,
    onClearFilter,
    onOpenAdvancedFilter,
    onHideColumns,
    onShowAllColumns,
    onSelectAllVisibleColumns,
    onClearColumnSelection,
    onAdjustWidth,
    onAutoFitWidth,
    setColumnWidthInput,
    onSetExactWidth,
    onRefresh,
    onExportCsv,
    onCopySelectedRows,
}) => {
    const targetColumnKeys = getTargetColumnKeys(contextMenu.columnKey);
    const contextMenuLayout = React.useMemo(() => getFloatingMenuPositionFromPoint(contextMenu.x, contextMenu.y, {
        menuWidth: 320,
        menuHeight: 560,
        preferredAlign: 'right',
        offset: 8,
        margin: 14,
        minHeight: 240,
    }), [contextMenu.x, contextMenu.y]);

    const sectionTitleClass = 'px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400';
    const itemClass = 'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-[12px] font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800';

    return (
        <motion.div
            data-grid-context-menu="1"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-[90] flex flex-col w-[320px] overflow-hidden rounded-[24px] border border-sky-100/80 bg-white/95 text-xs text-slate-700 shadow-[0_24px_60px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 backdrop-blur-xl"
            style={{
                top: contextMenuLayout.top,
                left: contextMenuLayout.left,
                maxHeight: contextMenuLayout.maxHeight,
                transformOrigin: contextMenuLayout.transformOrigin,
            }}
            onContextMenu={(event) => event.preventDefault()}
        >
            <div className="shrink-0 border-b border-slate-100 bg-gradient-to-l from-sky-50/95 via-white to-cyan-50/80 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-sm font-extrabold text-slate-800">{getColumnLabel(contextMenu.columnKey)}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                            {targetColumnKeys.length > 1
                                ? `سيتم تطبيق الأوامر على ${targetColumnKeys.length} أعمدة محددة.`
                                : contextMenu.source === 'cell'
                                    ? 'أوامر سريعة للخلية والعمود الحالي.'
                                    : 'أوامر سريعة للعمود الحالي.'}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                    >
                        إغلاق
                    </button>
                </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {contextMenu.source === 'cell' && (
                    <>
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                            <div className={sectionTitleClass}>عمليات السجل</div>
                            <button type="button" className={itemClass} onClick={onEditRecord}>
                                <span className="inline-flex items-center gap-1.5">
                                    <span>كرت الصنف</span>
                                    <ChevronLeft size={13} className="text-slate-400" />
                                </span>
                                <Package size={14} className="text-slate-400" />
                            </button>
                            <button type="button" className={itemClass} onClick={onOpenStockByWarehouse}>
                                <span className="inline-flex items-center gap-1.5">
                                    <span>كمية الصنف حسب المستودع</span>
                                    <ChevronLeft size={13} className="text-slate-400" />
                                </span>
                                <Store size={14} className="text-slate-400" />
                            </button>
                            <button type="button" className={itemClass} onClick={onDuplicateRecord}>
                                <span>نسخ السجل</span>
                                <Copy size={14} className="text-slate-400" />
                            </button>
                            <button type="button" className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-[12px] font-semibold text-rose-700 transition hover:bg-rose-50 hover:text-rose-800" onClick={onDeleteRecord}>
                                <span>حذف السجل</span>
                                <Trash2 size={14} className="text-rose-400" />
                            </button>
                            <button
                                type="button"
                                className={itemClass}
                                onClick={() => {
                                    if (contextMenu.cellValue) {
                                        void navigator.clipboard.writeText(String(contextMenu.cellValue));
                                    }
                                    onClose();
                                }}
                            >
                                <span>نسخ قيمة الخلية</span>
                                <Copy size={14} className="text-slate-400" />
                            </button>
                        </div>
                    </>
                )}

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                    <div className={sectionTitleClass}>الترتيب</div>
                    <button type="button" className={itemClass} onClick={() => onSort(contextMenu.columnKey, 'asc')}>
                        <span>ترتيب تصاعدي</span>
                        <ArrowDownAZ size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={() => onSort(contextMenu.columnKey, 'desc')}>
                        <span>ترتيب تنازلي</span>
                        <ArrowUpZA size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={onClearSort}>
                        <span>إلغاء الترتيب</span>
                        <RefreshCw size={14} className="text-slate-400" />
                    </button>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                    <div className={sectionTitleClass}>التصفية</div>
                    {contextMenu.source === 'cell' && (
                        <>
                            <button type="button" className={itemClass} onClick={() => onApplyFilter(targetColumnKeys, 'equals', String(contextMenu.cellValue ?? ''))}>
                                <span>مطابقة هذه القيمة</span>
                                <Filter size={14} className="text-slate-400" />
                            </button>
                            <button type="button" className={itemClass} onClick={() => onApplyFilter(targetColumnKeys, 'contains', String(contextMenu.cellValue ?? ''))}>
                                <span>يحتوي هذه القيمة</span>
                                <Filter size={14} className="text-slate-400" />
                            </button>
                        </>
                    )}
                    <button type="button" className={itemClass} onClick={() => onClearFilter(targetColumnKeys)}>
                        <span>مسح فلتر الأعمدة المحددة</span>
                        <Filter size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={() => onOpenAdvancedFilter(contextMenu.columnKey)}>
                        <span>فتح الفلتر المتقدم</span>
                        <Filter size={14} className="text-slate-400" />
                    </button>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                    <div className={sectionTitleClass}>الأعمدة</div>
                    <button type="button" className={itemClass} onClick={() => onHideColumns(targetColumnKeys)}>
                        <span>إخفاء العمود أو الأعمدة المحددة</span>
                        <Columns3 size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={onShowAllColumns}>
                        <span>إظهار جميع الأعمدة</span>
                        <Columns3 size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={onSelectAllVisibleColumns}>
                        <span>تحديد كل الأعمدة الظاهرة</span>
                        <Columns3 size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={onClearColumnSelection}>
                        <span>إلغاء تحديد الأعمدة</span>
                        <Columns3 size={14} className="text-slate-400" />
                    </button>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                    <div className={sectionTitleClass}>عرض العمود</div>
                    <button type="button" className={itemClass} onClick={() => onAdjustWidth(targetColumnKeys, 20)}>
                        <span>زيادة العرض بمقدار 20</span>
                        <Maximize2 size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={() => onAdjustWidth(targetColumnKeys, -20)}>
                        <span>تقليل العرض بمقدار 20</span>
                        <Maximize2 size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={() => onAutoFitWidth(targetColumnKeys)}>
                        <span>ملاءمة تلقائية للمحتوى</span>
                        <Maximize2 size={14} className="text-slate-400" />
                    </button>
                    <div className="px-2 pt-2">
                        <div className="mb-1.5 text-[11px] font-bold text-slate-500">عرض مخصص (px)</div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={90}
                                max={700}
                                value={columnWidthInput}
                                onChange={(event) => setColumnWidthInput(event.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                            <button
                                type="button"
                                className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-bold text-sky-700 transition hover:bg-sky-100"
                                onClick={() => {
                                    const parsed = Number(columnWidthInput);
                                    if (!Number.isFinite(parsed)) return;
                                    onSetExactWidth(targetColumnKeys, parsed);
                                }}
                            >
                                تطبيق
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-2">
                    <div className={sectionTitleClass}>أوامر عامة</div>
                    <button type="button" className={itemClass} onClick={onRefresh}>
                        <span>تحديث القائمة</span>
                        <RefreshCw size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={onExportCsv}>
                        <span>تصدير CSV</span>
                        <Copy size={14} className="text-slate-400" />
                    </button>
                    <button type="button" className={itemClass} onClick={onCopySelectedRows}>
                        <span>نسخ السجلات المحددة</span>
                        <Copy size={14} className="text-slate-400" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ItemMasterContextMenu;