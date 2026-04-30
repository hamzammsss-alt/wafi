import React from 'react';
import {
    CheckSquare,
    ChevronDown,
    Copy,
    Download,
    Edit,
    Plus,
    Printer,
    RefreshCw,
    SlidersHorizontal,
    Trash2,
} from 'lucide-react';
import { FloatingDropdown } from '../ui/FloatingDropdown';
import type { WorkspaceBadge } from '../workspace/WorkspaceHeader';

interface MasterListToolbarProps {
    headerIcon?: React.ReactNode;
    headerTitle?: React.ReactNode;
    headerSubtitle?: React.ReactNode;
    headerBadges?: WorkspaceBadge[];
    createLabel?: string;
    selectedRowsCount: number;
    totalRowsCount: number;
    visibleRowsCount: number;
    activeFiltersCount: number;
    rowDensity: 'comfortable' | 'compact';
    onCreate?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    onExport: (format: 'excel' | 'pdf') => void;
    onPrint: () => void;
    onOpenFilters: () => void;
    onRefresh?: () => void;
    onSetRowDensity: (density: 'comfortable' | 'compact') => void;
    extraActions?: React.ReactNode;
}

const badgeToneClasses: Record<NonNullable<WorkspaceBadge['tone']>, string> = {
    neutral: 'border-slate-200 bg-white/80 text-slate-600',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
};

const MasterListToolbar: React.FC<MasterListToolbarProps> = ({
    headerIcon,
    headerTitle,
    headerSubtitle,
    headerBadges = [],
    createLabel = 'جديد',
    selectedRowsCount,
    totalRowsCount,
    visibleRowsCount,
    activeFiltersCount,
    rowDensity,
    onCreate,
    onEdit,
    onDuplicate,
    onDelete,
    onExport,
    onPrint,
    onOpenFilters,
    onRefresh,
    onSetRowDensity,
    extraActions,
}) => {
    const [openMenu, setOpenMenu] = React.useState<'export' | 'properties' | null>(null);
    const exportItemClass = 'flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800';
    const hasHeader = Boolean(headerIcon || headerTitle || headerSubtitle || headerBadges.length);

    return (
        <div className="mb-4 overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_52%,#f3f8ff_100%)] px-4 py-4">
                {hasHeader && (
                    <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            {headerIcon && (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-sky-500 text-white shadow-md shadow-cyan-900/15">
                                    {headerIcon}
                                </div>
                            )}
                            <div className="min-w-0">
                                {headerTitle && (
                                    <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
                                        {headerTitle}
                                    </h1>
                                )}
                                {headerSubtitle && (
                                    <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                                        {headerSubtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {headerBadges.length > 0 && (
                            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                                {headerBadges.map((badge, index) => (
                                    <span
                                        key={`${badge.label}-${index}`}
                                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${badgeToneClasses[badge.tone || 'neutral']} ${badge.mono ? 'font-mono' : ''}`}
                                    >
                                        {badge.label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {onCreate && (
                            <button
                                type="button"
                                onClick={onCreate}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 px-5 text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition hover:brightness-105"
                            >
                                <Plus size={16} />
                                <span>{createLabel}</span>
                            </button>
                        )}

                        {onEdit && (
                            <button
                                type="button"
                                onClick={onEdit}
                                disabled={selectedRowsCount !== 1}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Edit size={16} />
                                <span>تعديل</span>
                            </button>
                        )}

                        {onDuplicate && (
                            <button
                                type="button"
                                onClick={onDuplicate}
                                disabled={selectedRowsCount !== 1}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Copy size={16} />
                                <span>نسخ</span>
                            </button>
                        )}

                        {onDelete && (
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={selectedRowsCount === 0}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Trash2 size={16} />
                                <span>حذف</span>
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={onPrint}
                            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                        >
                            <Printer size={16} />
                            <span>طباعة</span>
                        </button>

                        <FloatingDropdown
                            isOpen={openMenu === 'export'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={170}
                            title="تصدير"
                            trigger={(
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'export' ? null : 'export'))}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                                >
                                    <Download size={16} />
                                    <span>تصدير</span>
                                    <ChevronDown size={14} />
                                </button>
                            )}
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
                            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold shadow-sm transition ${activeFiltersCount > 0 ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'}`}
                        >
                            <SlidersHorizontal size={16} />
                            <span>تصفية</span>
                            {activeFiltersCount > 0 && (
                                <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>

                        {onRefresh && (
                            <button
                                type="button"
                                onClick={onRefresh}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                            >
                                <RefreshCw size={16} />
                                <span>تحديث</span>
                            </button>
                        )}

                        {extraActions}

                        <FloatingDropdown
                            isOpen={openMenu === 'properties'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={240}
                            title="خصائص العرض"
                            trigger={(
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'properties' ? null : 'properties'))}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                                >
                                    <SlidersHorizontal size={16} />
                                    <span>خصائص</span>
                                    <ChevronDown size={14} />
                                </button>
                            )}
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
                            </div>
                        </FloatingDropdown>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50/80 px-4 py-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <div className="text-[11px] font-bold text-slate-500">إجمالي السجلات</div>
                    <div className="mt-1 text-xl font-black text-slate-800">{totalRowsCount}</div>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm shadow-sm">
                    <div className="text-[11px] font-bold text-sky-700/80">المعروض</div>
                    <div className="mt-1 text-xl font-black text-sky-700">{visibleRowsCount}</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm shadow-sm">
                    <div className="text-[11px] font-bold text-emerald-700/80">المحدد</div>
                    <div className="mt-1 text-xl font-black text-emerald-700">{selectedRowsCount}</div>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-violet-50/80 px-4 py-3 text-sm shadow-sm">
                    <div className="text-[11px] font-bold text-violet-700/80">الفلاتر النشطة</div>
                    <div className="mt-1 text-xl font-black text-violet-700">{activeFiltersCount}</div>
                </div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 bg-white px-4 py-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    <CheckSquare size={14} />
                    <span>{selectedRowsCount} محدد</span>
                </div>
            </div>
        </div>
    );
};

export default MasterListToolbar;
