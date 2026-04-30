import { DocumentStatusRules } from '../types/DocumentDefinition';

export type CanonicalDocumentStatus =
    | 'DRAFT'
    | 'SAVED'
    | 'PENDING'
    | 'PENDING_APPROVAL'
    | 'PENDING_APPROVAL_L1'
    | 'PENDING_APPROVAL_L2'
    | 'APPROVED'
    | 'CONFIRMED'
    | 'RELEASED'
    | 'IN_PROGRESS'
    | 'PARTIAL'
    | 'COMPLETED'
    | 'POSTED'
    | 'CONVERTED'
    | 'REJECTED'
    | 'VOID'
    | 'VOIDED'
    | 'CANCELLED'
    | 'CANCELED';

export type DocumentStatusOption = {
    value: string;
    label: string;
    labelI18nKey: string;
    colorClass: string;
};

const STATUS_ALIASES: Record<string, CanonicalDocumentStatus> = {
    NEW: 'DRAFT',
    OPEN: 'DRAFT',
    SAVED: 'DRAFT',
    PENDING: 'PENDING_APPROVAL_L1',
    PENDING_APPROVAL: 'PENDING_APPROVAL_L1',
    APPROVED: 'POSTED',
    CONFIRMED: 'PENDING_APPROVAL_L1',
    RELEASED: 'PENDING_APPROVAL_L1',
    DONE: 'COMPLETED',
    COMPLETE: 'COMPLETED',
    VOIDED: 'VOID',
    CANCELED: 'CANCELLED',
    محفوَظ: 'DRAFT',
    محفوظ: 'DRAFT',
    عالق: 'PENDING_APPROVAL_L1',
    مرحل: 'POSTED',
    ملغى: 'VOID',
};

export const DOCUMENT_STATUS_CONFIG: Record<CanonicalDocumentStatus, DocumentStatusOption> = {
    DRAFT: {
        value: 'DRAFT',
        label: 'مسودة',
        labelI18nKey: 'status.draft',
        colorClass: 'bg-slate-100 text-slate-700 border-slate-300',
    },
    SAVED: {
        value: 'SAVED',
        label: 'محفوظ',
        labelI18nKey: 'status.saved',
        colorClass: 'bg-slate-100 text-slate-700 border-slate-300',
    },
    PENDING: {
        value: 'PENDING',
        label: 'عالق',
        labelI18nKey: 'status.pending',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    PENDING_APPROVAL: {
        value: 'PENDING_APPROVAL',
        label: 'بانتظار الاعتماد',
        labelI18nKey: 'status.pending_approval',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    PENDING_APPROVAL_L1: {
        value: 'PENDING_APPROVAL_L1',
        label: 'بانتظار اعتماد 1',
        labelI18nKey: 'status.pending_approval_l1',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    PENDING_APPROVAL_L2: {
        value: 'PENDING_APPROVAL_L2',
        label: 'بانتظار اعتماد 2',
        labelI18nKey: 'status.pending_approval_l2',
        colorClass: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    APPROVED: {
        value: 'APPROVED',
        label: 'معتمد',
        labelI18nKey: 'status.approved',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    CONFIRMED: {
        value: 'CONFIRMED',
        label: 'مؤكد',
        labelI18nKey: 'status.confirmed',
        colorClass: 'bg-sky-100 text-sky-800 border-sky-300',
    },
    RELEASED: {
        value: 'RELEASED',
        label: 'محرر',
        labelI18nKey: 'status.released',
        colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    },
    IN_PROGRESS: {
        value: 'IN_PROGRESS',
        label: 'قيد التنفيذ',
        labelI18nKey: 'status.in_progress',
        colorClass: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    PARTIAL: {
        value: 'PARTIAL',
        label: 'جزئي',
        labelI18nKey: 'status.partial',
        colorClass: 'bg-sky-100 text-sky-800 border-sky-300',
    },
    COMPLETED: {
        value: 'COMPLETED',
        label: 'مكتمل',
        labelI18nKey: 'status.completed',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    POSTED: {
        value: 'POSTED',
        label: 'مرحل',
        labelI18nKey: 'status.posted',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    CONVERTED: {
        value: 'CONVERTED',
        label: 'محول',
        labelI18nKey: 'status.converted',
        colorClass: 'bg-violet-100 text-violet-800 border-violet-300',
    },
    REJECTED: {
        value: 'REJECTED',
        label: 'مرفوض',
        labelI18nKey: 'status.rejected',
        colorClass: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    VOID: {
        value: 'VOID',
        label: 'ملغى',
        labelI18nKey: 'status.void',
        colorClass: 'bg-stone-100 text-stone-800 border-stone-300',
    },
    VOIDED: {
        value: 'VOIDED',
        label: 'ملغى',
        labelI18nKey: 'status.void',
        colorClass: 'bg-stone-100 text-stone-800 border-stone-300',
    },
    CANCELLED: {
        value: 'CANCELLED',
        label: 'ملغى',
        labelI18nKey: 'status.cancelled',
        colorClass: 'bg-stone-100 text-stone-800 border-stone-300',
    },
    CANCELED: {
        value: 'CANCELED',
        label: 'ملغى',
        labelI18nKey: 'status.cancelled',
        colorClass: 'bg-stone-100 text-stone-800 border-stone-300',
    },
};

const DEFAULT_FILTER_STATUSES = [
    'DRAFT',
    'PENDING_APPROVAL_L1',
    'PENDING_APPROVAL_L2',
    'POSTED',
    'REJECTED',
    'VOID',
    'CANCELLED',
];

export function normalizeDocumentStatus(value: unknown): string {
    const raw = String(value || 'DRAFT').trim();
    if (!raw) return 'DRAFT';
    const upper = raw.toUpperCase();
    return STATUS_ALIASES[upper] || STATUS_ALIASES[raw] || upper;
}

export function getDocumentStatusConfig(status: unknown): DocumentStatusOption {
    const raw = String(status || 'DRAFT').trim();
    const directKey = raw.toUpperCase() as CanonicalDocumentStatus;
    if (DOCUMENT_STATUS_CONFIG[directKey]) {
        return DOCUMENT_STATUS_CONFIG[directKey];
    }

    const normalized = normalizeDocumentStatus(status);
    return (
        DOCUMENT_STATUS_CONFIG[normalized as CanonicalDocumentStatus] || {
            value: normalized,
            label: normalized,
            labelI18nKey: `status.${normalized.toLowerCase()}`,
            colorClass: 'bg-slate-100 text-slate-700 border-slate-300',
        }
    );
}

export function getDocumentStatusOptions(statusRules?: DocumentStatusRules): DocumentStatusOption[] {
    const statuses = new Set<string>(DEFAULT_FILTER_STATUSES);

    for (const status of statusRules?.editable || []) statuses.add(status);
    for (const status of statusRules?.postable || []) statuses.add(status);
    for (const status of statusRules?.voidable || []) statuses.add(status);
    for (const status of statusRules?.reopenable || []) statuses.add(status);
    for (const [fromStatus, toStatuses] of Object.entries(statusRules?.transitions || {})) {
        statuses.add(fromStatus);
        for (const toStatus of toStatuses || []) statuses.add(toStatus);
    }

    return Array.from(statuses)
        .map((status) => getDocumentStatusConfig(status))
        .filter((option, index, list) => list.findIndex((item) => item.value === option.value) === index);
}

export function canUseDocumentPrimaryAction(status: unknown): boolean {
    const normalized = normalizeDocumentStatus(status);
    return normalized === 'DRAFT' || normalized === 'REJECTED' || normalized.startsWith('PENDING_APPROVAL');
}
