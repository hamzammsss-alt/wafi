import { useState, useCallback, useEffect } from 'react';

export interface AuditFieldChange {
    id: string;
    fieldPath: string;
    oldValue: unknown;
    newValue: unknown;
}

export interface AuditAction {
    id: string;
    eventType: string;
    actorUserId: string;
    at: string;
    summaryI18nKey: string | null;
    meta: Record<string, unknown> | null;
    fieldChanges: AuditFieldChange[];
}

type LegacyAuditAction = {
    id: number | string;
    action: string;
    actor_user_id: string;
    at: string;
    note?: string | null;
};

function toActionFromLegacy(row: LegacyAuditAction): AuditAction {
    const rawAction = String(row.action || '').trim().toUpperCase();
    const mappedEventType =
        rawAction === 'CREATED'
            ? 'document.create'
            : rawAction === 'POSTED' || rawAction === 'POST'
                ? 'document.post'
                : rawAction === 'VOID' || rawAction === 'VOIDED'
                    ? 'document.void'
                    : 'document.update';

    return {
        id: String(row.id),
        eventType: mappedEventType,
        actorUserId: String(row.actor_user_id || 'SYSTEM'),
        at: String(row.at || new Date().toISOString()),
        summaryI18nKey: null,
        meta: row.note ? { reason: row.note } : null,
        fieldChanges: [],
    };
}

function normalizeDocType(docType: string): string {
    const key = String(docType || '').trim();
    if (!key) return '';
    const map: Record<string, string> = {
        salesInvoices: 'sales_invoice',
        sales_invoice: 'sales_invoice',
        purchaseInvoices: 'purchase_invoice',
        purchase_invoice: 'purchase_invoice',
        stockTransfers: 'stock_transfer',
        stock_transfer: 'stock_transfer',
        stockDocument: 'stock_transfer',
        journalVoucher: 'journal_voucher',
        journalVouchers: 'journal_voucher',
        journal_voucher: 'journal_voucher',
    };
    if (map[key]) return map[key];
    return key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

export function useDocumentAudit(docType: string, docId: string | number | null) {
    const [auditLog, setAuditLog] = useState<AuditAction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAuditTrail = useCallback(async () => {
        if (!docId) return;

        setIsLoading(true);
        setError(null);

        try {
            const auditApi = (window as any)?.electronAPI?.audit;
            if (auditApi?.list) {
                try {
                    const normalizedDocType = normalizeDocType(docType);
                    let response = await auditApi.list({
                        docType: normalizedDocType || undefined,
                        docId: String(docId),
                        limit: 200,
                    });

                    const firstRows = Array.isArray(response?.rows) ? response.rows : [];
                    if (firstRows.length === 0) {
                        response = await auditApi.list({
                            docId: String(docId),
                            limit: 200,
                        });
                    }

                    const rows = Array.isArray(response?.rows) ? response.rows : [];
                    const mapped: AuditAction[] = rows.map((row: any) => ({
                        id: String(row.id || ''),
                        eventType: String(row.eventType || ''),
                        actorUserId: String(row.userId || 'SYSTEM'),
                        at: String(row.createdAt || ''),
                        summaryI18nKey: row.summaryI18nKey ? String(row.summaryI18nKey) : null,
                        meta: row.meta && typeof row.meta === 'object' ? row.meta : null,
                        fieldChanges: Array.isArray(row.fieldChanges)
                            ? row.fieldChanges.map((field: any) => ({
                                id: String(field.id || ''),
                                fieldPath: String(field.fieldPath || ''),
                                oldValue: field.oldValue,
                                newValue: field.newValue,
                            }))
                            : [],
                    }));

                    setAuditLog(mapped);
                    return;
                } catch (auditError) {
                    console.warn('Audit API fallback to legacy trail:', auditError);
                }
            }

            // Fallback to legacy workflow trail endpoint if audit engine is unavailable.
            const legacyRes = await (window as any)?.electronAPI?.documentsRead?.getAuditTrail?.(docId);
            const legacyRows = Array.isArray(legacyRes) ? legacyRes : [];
            setAuditLog(legacyRows.map((row: LegacyAuditAction) => toActionFromLegacy(row)));
        } catch (err: any) {
            console.error('Failed to fetch audit log:', err);
            setError(String(err?.messageKey || err?.message || 'error.audit.fetch_failed'));
        } finally {
            setIsLoading(false);
        }
    }, [docType, docId]);

    useEffect(() => {
        if (docId) {
            fetchAuditTrail();
        } else {
            setAuditLog([]);
        }
    }, [docId, fetchAuditTrail]);

    return {
        auditLog,
        isLoading,
        error,
        fetchAuditTrail,
    };
}
