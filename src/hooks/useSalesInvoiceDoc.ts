import { useCallback, useEffect, useMemo, useState } from 'react';
import { InvoiceHeader, InvoiceLine, salesInvoiceClient } from '../lib/salesInvoiceClient';
import { SalesInvoiceDefinition } from '../pages/sales/SalesInvoiceDefinition';
import { useMyPermissions } from './useMyPermissions';

type ItemLookupPayload = {
    id: string;
    code: string;
    name: string;
    price: number;
};

const DEFAULT_STATUS = 'DRAFT';
const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_HEADER_VALUES = (SalesInvoiceDefinition.defaultValues?.header || {}) as Partial<InvoiceHeader>;
const EMPTY_LINE_VALUES = (SalesInvoiceDefinition.emptyLine || {}) as Partial<InvoiceLine>;

const EMPTY_HEADER: InvoiceHeader = {
    id: '',
    invoice_no: '',
    status: String(DEFAULT_HEADER_VALUES.status || DEFAULT_STATUS),
    version: Number(DEFAULT_HEADER_VALUES.version || 1),
    doc_date: String(DEFAULT_HEADER_VALUES.doc_date || TODAY),
    customer_id: String(DEFAULT_HEADER_VALUES.customer_id || ''),
    customer_name: String(DEFAULT_HEADER_VALUES.customer_name || ''),
    warehouse_id: String(DEFAULT_HEADER_VALUES.warehouse_id || ''),
    currency_id: String(DEFAULT_HEADER_VALUES.currency_id || 'ILS'),
    tax_group_id: String(DEFAULT_HEADER_VALUES.tax_group_id || ''),
    exchange_rate: Number(DEFAULT_HEADER_VALUES.exchange_rate || 1),
    subtotal: Number(DEFAULT_HEADER_VALUES.subtotal || 0),
    discount_total: Number(DEFAULT_HEADER_VALUES.discount_total || 0),
    tax_total: Number(DEFAULT_HEADER_VALUES.tax_total || 0),
    grand_total: Number(DEFAULT_HEADER_VALUES.grand_total || 0),
    remarks: String(DEFAULT_HEADER_VALUES.remarks || ''),
};

const EMPTY_LINE: InvoiceLine = {
    id: String(EMPTY_LINE_VALUES.id || ''),
    line_no: Number(EMPTY_LINE_VALUES.line_no || 0),
    item_id: String(EMPTY_LINE_VALUES.item_id || ''),
    item_name: String(EMPTY_LINE_VALUES.item_name || ''),
    item_code: String(EMPTY_LINE_VALUES.item_code || ''),
    item_code_lookup: String(EMPTY_LINE_VALUES.item_code_lookup || ''),
    qty: Number(EMPTY_LINE_VALUES.qty || 1),
    price: Number(EMPTY_LINE_VALUES.price || 0),
    discount: Number(EMPTY_LINE_VALUES.discount || 0),
    tax_rate: Number(EMPTY_LINE_VALUES.tax_rate || 0),
    tax_amount: Number(EMPTY_LINE_VALUES.tax_amount || 0),
    total_price: Number(EMPTY_LINE_VALUES.total_price || 0),
    net_total: Number(EMPTY_LINE_VALUES.net_total || 0),
    line_total: Number(EMPTY_LINE_VALUES.line_total || 0),
};

function toLine(line: Partial<InvoiceLine>, fallbackId: string): InvoiceLine {
    const source = { ...EMPTY_LINE, ...line };
    const recalc = SalesInvoiceDefinition.recalcLine
        ? SalesInvoiceDefinition.recalcLine(source)
        : source;

    return {
        ...source,
        ...recalc,
        id: String(recalc.id || source.id || fallbackId),
        qty: Number(recalc.qty || 0),
        price: Number(recalc.price || 0),
        discount: Number(recalc.discount || 0),
        tax_rate: Number(recalc.tax_rate || 0),
        tax_amount: Number(recalc.tax_amount || 0),
        total_price: Number(recalc.total_price || 0),
        net_total: Number(recalc.net_total || 0),
        line_total: Number(recalc.line_total || recalc.net_total || 0),
        item_code_lookup: String(recalc.item_code_lookup || recalc.item_code || ''),
    };
}

function computeTotals(lines: InvoiceLine[]) {
    const fallback = { subtotal: 0, discount_total: 0, tax_total: 0, grand_total: 0 };
    const resolver = SalesInvoiceDefinition.computeTotals || SalesInvoiceDefinition.recalcTotals;
    if (!resolver) return fallback;
    const totals = resolver(lines as any) as Partial<InvoiceHeader>;
    return {
        subtotal: Number(totals.subtotal || 0),
        discount_total: Number(totals.discount_total || 0),
        tax_total: Number(totals.tax_total || 0),
        grand_total: Number(totals.grand_total || 0),
    };
}

function toStatusSet(values: string[] | undefined, fallback: string[]) {
    return new Set((values && values.length ? values : fallback).map((value) => String(value)));
}

export function useSalesInvoiceDoc(id: string | undefined) {
    const { can } = useMyPermissions();
    const capabilities = SalesInvoiceDefinition.capabilities;
    const statusRules = SalesInvoiceDefinition.statusRules;
    const postingPolicy = SalesInvoiceDefinition.postingPolicy;

    const editableStatuses = useMemo(() => toStatusSet(statusRules?.editable, ['DRAFT', 'REJECTED']), [statusRules?.editable]);
    const postableStatuses = useMemo(() => toStatusSet(statusRules?.postable, ['DRAFT']), [statusRules?.postable]);
    const voidableStatuses = useMemo(() => toStatusSet(statusRules?.voidable, ['DRAFT', 'POSTED']), [statusRules?.voidable]);

    const [header, setHeader] = useState<InvoiceHeader>(EMPTY_HEADER);
    const [lines, setLines] = useState<InvoiceLine[]>([{ ...EMPTY_LINE, id: 'line_new_1' }]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [isVoiding, setIsVoiding] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [errorKey, setErrorKey] = useState<string | null>(null);
    const [lastActionKey, setLastActionKey] = useState<string>('');

    const canRead = can(capabilities?.read || 'sales.invoice.read');
    const canUpdate = can(capabilities?.update || 'sales.invoice.update');
    const canPost = can(capabilities?.post || 'sales.invoice.post');
    const canVoid = can(capabilities?.void || 'sales.invoice.void');
    const canSubmit = Boolean((postingPolicy?.submitOnMissingPostPermission ?? true) && canUpdate);

    const status = String(header.status || DEFAULT_STATUS);
    const isEditableByStatus = editableStatuses.has(status);
    const isPostable = postableStatuses.has(status);
    const isVoidable = voidableStatuses.has(status);
    const isReadOnly = !canUpdate || !isEditableByStatus;

    const applyLinesAndTotals = useCallback((incomingLines: Partial<InvoiceLine>[]) => {
        const normalizedLines = (incomingLines.length ? incomingLines : [EMPTY_LINE]).map((line, index) => toLine(line, `line_new_${index + 1}`));
        const totals = computeTotals(normalizedLines);
        setLines(normalizedLines);
        setHeader((prev) => ({ ...prev, ...totals }));
    }, []);

    const load = useCallback(async (targetId: string) => {
        if (!canRead) {
            setErrorKey('error.permission_denied.sales.invoice.read');
            return;
        }

        setIsLoading(true);
        setErrorKey(null);
        try {
            const response = await salesInvoiceClient.get(targetId);
            if (!response.ok || !response.data) {
                setErrorKey(String(response.error?.message || 'error.documents.load_failed'));
                return;
            }

            const nextHeader = {
                ...EMPTY_HEADER,
                ...(response.data.header || {}),
                status: String(response.data.header?.status || DEFAULT_STATUS),
            } as InvoiceHeader;

            setHeader(nextHeader);
            applyLinesAndTotals((response.data.lines || []) as Partial<InvoiceLine>[]);
            setIsDirty(false);
        } finally {
            setIsLoading(false);
        }
    }, [applyLinesAndTotals, canRead]);

    useEffect(() => {
        if (!id || id === 'new') {
            setHeader(EMPTY_HEADER);
            applyLinesAndTotals([EMPTY_LINE]);
            setIsDirty(false);
            return;
        }
        void load(id);
    }, [applyLinesAndTotals, id, load]);

    const updateHeader = useCallback((patch: Partial<InvoiceHeader>) => {
        setHeader((prev) => ({ ...prev, ...patch }));
        setIsDirty(true);
    }, []);

    const updateLine = useCallback((index: number, patch: Partial<InvoiceLine>) => {
        setLines((prev) => {
            const next = [...prev];
            if (!next[index]) return prev;
            next[index] = toLine({ ...next[index], ...patch }, next[index].id || `line_new_${index + 1}`);
            const totals = computeTotals(next);
            setHeader((oldHeader) => ({ ...oldHeader, ...totals }));
            return next;
        });
        setIsDirty(true);
    }, []);

    const addLine = useCallback(() => {
        setLines((prev) => {
            const next = [...prev, { ...EMPTY_LINE, id: `line_new_${Date.now()}` }];
            const totals = computeTotals(next);
            setHeader((oldHeader) => ({ ...oldHeader, ...totals }));
            return next;
        });
        setIsDirty(true);
    }, []);

    const removeLine = useCallback((index: number) => {
        setLines((prev) => {
            const filtered = prev.filter((_, lineIndex) => lineIndex !== index);
            const next = filtered.length ? filtered : [{ ...EMPTY_LINE, id: 'line_new_1' }];
            const totals = computeTotals(next);
            setHeader((oldHeader) => ({ ...oldHeader, ...totals }));
            return next;
        });
        setIsDirty(true);
    }, []);

    const fillItemInLine = useCallback((index: number, item: ItemLookupPayload) => {
        updateLine(index, {
            item_id: item.id,
            item_code_lookup: item.code,
            item_code: item.code,
            item_name: item.name,
            price: Number(item.price || 0),
            qty: Number(lines[index]?.qty || 1),
        });
    }, [lines, updateLine]);

    const save = useCallback(async () => {
        if (isReadOnly || isSaving) return false;
        if (!header.id) {
            setErrorKey('error.documents.missing_id');
            return false;
        }

        const normalized = SalesInvoiceDefinition.normalize
            ? SalesInvoiceDefinition.normalize(header, lines)
            : { header, lines };
        const validation = SalesInvoiceDefinition.validate
            ? SalesInvoiceDefinition.validate(normalized.header, normalized.lines)
            : { ok: true, errors: [] };

        if (!validation.ok) {
            const firstError = validation.errors[0];
            setErrorKey(String(firstError?.messageKey || firstError?.message || 'validation.generic'));
            return false;
        }

        setIsSaving(true);
        setErrorKey(null);
        try {
            const response = await salesInvoiceClient.save({
                id: header.id,
                header: normalized.header,
                lines: normalized.lines as InvoiceLine[],
                userId: 'admin',
            });

            if (!response.ok || !response.data) {
                setErrorKey(String(response.error?.message || 'error.documents.save_failed'));
                return false;
            }

            setHeader({ ...EMPTY_HEADER, ...(response.data.header || {}) } as InvoiceHeader);
            applyLinesAndTotals((response.data.lines || []) as Partial<InvoiceLine>[]);
            setIsDirty(false);
            setLastActionKey('doc.common.saved');
            return true;
        } finally {
            setIsSaving(false);
        }
    }, [applyLinesAndTotals, header, isReadOnly, isSaving, lines]);

    const postOrSubmit = useCallback(async () => {
        if (!header.id || isPosting) return;

        if (!isPostable) {
            setErrorKey('doc.common.invalid_status_for_post');
            return;
        }

        if (!canPost && !canSubmit) {
            setErrorKey('error.permission_denied.sales.invoice.post');
            return;
        }

        setIsPosting(true);
        setErrorKey(null);
        try {
            if (isDirty) {
                const saved = await save();
                if (!saved) return;
            }

            const response = await salesInvoiceClient.postOrSubmit({
                id: header.id,
                userId: 'admin',
                hasPostPermission: canPost,
            });

            if (!response.ok || !response.data) {
                setErrorKey(String(response.error?.message || 'error.documents.post_failed'));
                return;
            }

            const nextStatus = String(response.data.status || status);
            setHeader((prev) => ({ ...prev, status: nextStatus }));
            setIsDirty(false);
            setLastActionKey(
                response.data.action === (postingPolicy?.alreadyPostedAction || 'already_posted')
                    ? 'doc.common.already_posted'
                    : response.data.action === 'submitted'
                        ? 'doc.common.submitted_for_approval'
                        : 'doc.common.posted',
            );
        } finally {
            setIsPosting(false);
        }
    }, [canPost, canSubmit, header.id, isDirty, isPostable, isPosting, postingPolicy?.alreadyPostedAction, save, status]);

    const voidDocument = useCallback(async () => {
        if (!header.id || isVoiding) return;
        if (!isVoidable) {
            setErrorKey('doc.common.invalid_status_for_void');
            return;
        }
        if (!canVoid) {
            setErrorKey('error.permission_denied.sales.invoice.void');
            return;
        }

        setIsVoiding(true);
        setErrorKey(null);
        try {
            const response = await salesInvoiceClient.void({ id: header.id, userId: 'admin' });
            if (!response.ok || !response.data) {
                setErrorKey(String(response.error?.message || 'error.documents.void_failed'));
                return;
            }
            setHeader((prev) => ({ ...prev, status: String(response.data.status || 'VOID') }));
            setIsDirty(false);
            setLastActionKey('doc.common.voided');
        } finally {
            setIsVoiding(false);
        }
    }, [canVoid, header.id, isVoidable, isVoiding]);

    const reopen = useCallback(async () => {
        if (!header.id) return;
        const response = await salesInvoiceClient.reopenRejected({ id: header.id, userId: 'admin' });
        if (!response.ok) {
            setErrorKey(String(response.error?.message || 'error.documents.reopen_failed'));
            return;
        }
        setHeader((prev) => ({ ...prev, status: 'DRAFT', rejection_reason: undefined }));
        setLastActionKey('doc.common.reopened');
        setErrorKey(null);
    }, [header.id]);

    return {
        header,
        lines,
        status,
        isLoading,
        isSaving,
        isPosting,
        isVoiding,
        isDirty,
        isReadOnly,
        isPostable,
        isVoidable,
        canRead,
        canUpdate,
        canPost,
        canVoid,
        canSubmit,
        errorKey,
        lastActionKey,
        updateHeader,
        updateLine,
        addLine,
        removeLine,
        fillItemInLine,
        load,
        save,
        postOrSubmit,
        voidDocument,
        reopen,
    };
}
