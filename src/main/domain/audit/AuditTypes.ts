export interface AuditContext {
    companyId: string;
    branchId?: string | null;
    userId: string;
    sessionId?: string | null;
    correlationId?: string | null;
    ipcid?: string | null;
}

export interface AuditFieldChangeInput {
    fieldPath: string;
    oldValue?: unknown;
    newValue?: unknown;
}

export interface AuditFieldChangeRecord {
    id: string;
    fieldPath: string;
    oldValue: unknown;
    newValue: unknown;
}

export interface AuditEventInput {
    entityType: string;
    entityId: string;
    docType?: string | null;
    docId?: string | null;
    eventType: string;
    summaryI18nKey?: string | null;
    meta?: Record<string, unknown> | null;
    correlationId?: string | null;
    ipcid?: string | null;
    createdAt?: string;
}

export interface AuditEventRecord {
    id: string;
    companyId: string;
    branchId: string | null;
    userId: string;
    sessionId: string | null;
    entityType: string;
    entityId: string;
    docType: string | null;
    docId: string | null;
    eventType: string;
    correlationId: string | null;
    ipcid: string | null;
    summaryI18nKey: string | null;
    meta: Record<string, unknown> | null;
    createdAt: string;
    fieldChanges: AuditFieldChangeRecord[];
}

export interface AuditListCursor {
    createdAt: string;
    id: string;
}

export interface AuditListQuery {
    companyId: string;
    branchId?: string | null;
    userId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    docType?: string | null;
    docId?: string | null;
    eventType?: string | null;
    limit?: number;
    cursor?: AuditListCursor | null;
}

export interface AuditListResult {
    rows: AuditEventRecord[];
    nextCursor: AuditListCursor | null;
}
