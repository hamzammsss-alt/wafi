import React from 'react';
import { DocumentStatus } from '../../types/approval';

interface BadgeProps {
    status: DocumentStatus | string;
    className?: string;
}

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const value = i18n.t(key);
        if (value && value !== key) return value;
    }
    return fallback || key;
}

const STATUS_CONFIG: Record<string, { label: string; labelI18nKey: string; colorClass: string }> = {
    DRAFT: {
        label: 'Draft',
        labelI18nKey: 'status.draft',
        colorClass: 'bg-slate-100 text-slate-700 border-slate-300',
    },
    PENDING_APPROVAL: {
        label: 'Pending Approval',
        labelI18nKey: 'status.pending_approval',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    PENDING_APPROVAL_L1: {
        label: 'عالق',
        labelI18nKey: 'status.pending_approval_l1',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    PENDING_APPROVAL_L2: {
        label: 'Pending Approval L2',
        labelI18nKey: 'status.pending_approval_l2',
        colorClass: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    POSTED: {
        label: 'Posted',
        labelI18nKey: 'status.posted',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    CONFIRMED: {
        label: 'عالق',
        labelI18nKey: 'status.pending',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    PARTIAL: {
        label: 'جزئي',
        labelI18nKey: 'status.partial',
        colorClass: 'bg-sky-100 text-sky-800 border-sky-300',
    },
    COMPLETED: {
        label: 'مكتمل',
        labelI18nKey: 'status.completed',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    RELEASED: {
        label: 'عالق',
        labelI18nKey: 'status.released',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    IN_PROGRESS: {
        label: 'قيد التنفيذ',
        labelI18nKey: 'status.in_progress',
        colorClass: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    CONVERTED: {
        label: 'محول',
        labelI18nKey: 'status.converted',
        colorClass: 'bg-violet-100 text-violet-800 border-violet-300',
    },
    REJECTED: {
        label: 'Rejected',
        labelI18nKey: 'status.rejected',
        colorClass: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    VOID: {
        label: 'Void',
        labelI18nKey: 'status.void',
        colorClass: 'bg-stone-100 text-stone-800 border-stone-300',
    },
    CANCELLED: {
        label: 'Cancelled',
        labelI18nKey: 'status.cancelled',
        colorClass: 'bg-stone-100 text-stone-800 border-stone-300',
    },
};

export const DocumentStatusBadge: React.FC<BadgeProps> = ({ status, className = '' }) => {
    const key = String(status || 'DRAFT').toUpperCase();
    const config = STATUS_CONFIG[key] || STATUS_CONFIG.DRAFT;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.colorClass} ${className}`}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
            {tr(config.labelI18nKey, config.label)}
        </span>
    );
};
