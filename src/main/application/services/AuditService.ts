import { v4 as uuidv4 } from 'uuid';
import {
    AuditContext,
    AuditEventInput,
    AuditEventRecord,
    AuditFieldChangeInput,
    AuditListQuery,
    AuditListResult,
} from '../../domain/audit/AuditTypes';
import { SqliteAuditRepo } from '../../infrastructure/adapters/SqliteAuditRepo';

const EVENT_TYPE_RE = /^[a-z0-9._-]+$/;
const ENTITY_TYPE_RE = /^[a-z0-9._-]+$/;
const META_ALLOWLIST = new Set<string>([
    'eventName',
    'errorCode',
    'messageKey',
    'capabilityKey',
    'requiredCapability',
    'requiredCapabilities',
    'policy',
    'status',
    'action',
    'scope',
    'screenKey',
    'viewId',
    'operation',
    'module',
    'section',
    'settingKey',
    'reason',
    'docNo',
    'route',
    'targetStatus',
    'fromStatus',
    'toStatus',
    'ipcid',
]);

const REDACT_KEY_RE = /(password|secret|token|authorization|cookie|api[_-]?key|refresh[_-]?token|access[_-]?token|pin|otp|hash|salt)/i;

let globalAuditService: AuditService | null = null;

function sanitizePrimitive(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return '';
        return trimmed.length > 4000 ? `${trimmed.slice(0, 4000)}...` : trimmed;
    }
    return value;
}

function sanitizeByKey(key: string, value: unknown): unknown {
    if (REDACT_KEY_RE.test(key)) {
        return '[REDACTED]';
    }

    if (Array.isArray(value)) {
        const limited = value.slice(0, 50);
        return limited.map((item) => sanitizeByKey(key, item));
    }

    if (value && typeof value === 'object') {
        const objectValue = value as Record<string, unknown>;
        const next: Record<string, unknown> = {};
        for (const [nestedKey, nestedValue] of Object.entries(objectValue)) {
            next[nestedKey] = sanitizeByKey(nestedKey, nestedValue);
        }
        return next;
    }

    return sanitizePrimitive(value);
}

function safeJson(value: unknown): string | null {
    if (value === undefined) return null;
    try {
        return JSON.stringify(value ?? null);
    } catch {
        return JSON.stringify(String(value));
    }
}

export function configureGlobalAuditService(service: AuditService | null) {
    globalAuditService = service;
}

export function getGlobalAuditService(): AuditService | null {
    return globalAuditService;
}

export class AuditService {
    private readonly repo: SqliteAuditRepo;

    constructor(repo: SqliteAuditRepo) {
        this.repo = repo;
    }

    recordEvent(
        ctx: AuditContext,
        event: AuditEventInput,
        fieldChanges: AuditFieldChangeInput[] = [],
    ): { id: string; duplicate: boolean } {
        this.validateContext(ctx);
        this.validateEvent(event);

        const normalizedCorrelation = this.normalizeText(event.correlationId || ctx.correlationId || null);
        const normalizedDocType = this.normalizeText(event.docType || null);
        const normalizedDocId = this.normalizeText(event.docId || null);
        const normalizedEntityType = this.normalizeRequired(event.entityType, 'entityType');
        const normalizedEntityId = this.normalizeRequired(event.entityId, 'entityId');
        const normalizedEventType = this.normalizeRequired(event.eventType, 'eventType');

        if (normalizedCorrelation) {
            const duplicateId = this.repo.findDuplicate({
                companyId: ctx.companyId,
                correlationId: normalizedCorrelation,
                eventType: normalizedEventType,
                entityType: normalizedEntityType,
                entityId: normalizedEntityId,
                docType: normalizedDocType,
                docId: normalizedDocId,
            });
            if (duplicateId) {
                return { id: duplicateId, duplicate: true };
            }
        }

        const eventId = uuidv4();
        const createdAt = this.normalizeTimestamp(event.createdAt);
        const sanitizedMeta = this.sanitizeMeta(event.meta || null);
        const sanitizedFields = this.sanitizeFieldChanges(fieldChanges);

        this.repo.insertEvent(
            {
                id: eventId,
                companyId: ctx.companyId,
                branchId: this.normalizeText(ctx.branchId || null),
                userId: this.normalizeRequired(ctx.userId, 'userId'),
                sessionId: this.normalizeText(ctx.sessionId || null),
                entityType: normalizedEntityType,
                entityId: normalizedEntityId,
                docType: normalizedDocType,
                docId: normalizedDocId,
                eventType: normalizedEventType,
                correlationId: normalizedCorrelation,
                ipcid: this.normalizeText(event.ipcid || ctx.ipcid || null),
                summaryI18nKey: this.normalizeText(event.summaryI18nKey || null),
                metaJson: sanitizedMeta ? safeJson(sanitizedMeta) : null,
                createdAt,
            },
            sanitizedFields.map((field) => ({
                id: uuidv4(),
                auditEventId: eventId,
                fieldPath: field.fieldPath,
                oldValueJson: safeJson(field.oldValue),
                newValueJson: safeJson(field.newValue),
            })),
        );

        return { id: eventId, duplicate: false };
    }

    listEvents(query: AuditListQuery): AuditListResult {
        const normalizedQuery: AuditListQuery = {
            ...query,
            companyId: this.normalizeRequired(query.companyId, 'companyId'),
            branchId: this.normalizeText(query.branchId || null),
            userId: this.normalizeText(query.userId || null),
            entityType: this.normalizeText(query.entityType || null),
            entityId: this.normalizeText(query.entityId || null),
            docType: this.normalizeText(query.docType || null),
            docId: this.normalizeText(query.docId || null),
            eventType: this.normalizeText(query.eventType || null),
            limit: Math.max(1, Math.min(Number(query.limit || 100), 500)),
            cursor: query.cursor || null,
        };

        return this.repo.listEvents(normalizedQuery);
    }

    private validateContext(ctx: AuditContext) {
        if (!ctx || typeof ctx !== 'object') {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.audit.context_invalid',
                message: 'Audit context is required',
            };
        }
        if (!String(ctx.companyId || '').trim()) {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.audit.company_required',
                message: 'companyId is required',
            };
        }
        if (!String(ctx.userId || '').trim()) {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.audit.user_required',
                message: 'userId is required',
            };
        }
    }

    private validateEvent(event: AuditEventInput) {
        const eventType = String(event?.eventType || '').trim();
        if (!eventType || !EVENT_TYPE_RE.test(eventType)) {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.audit.event_type_invalid',
                message: 'eventType is invalid',
            };
        }

        const entityType = String(event?.entityType || '').trim();
        if (!entityType || !ENTITY_TYPE_RE.test(entityType)) {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.audit.entity_type_invalid',
                message: 'entityType is invalid',
            };
        }

        if (!String(event?.entityId || '').trim()) {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.audit.entity_id_required',
                message: 'entityId is required',
            };
        }
    }

    private sanitizeMeta(meta: Record<string, unknown> | null): Record<string, unknown> | null {
        if (!meta || typeof meta !== 'object') return null;
        const sanitized: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(meta)) {
            if (!META_ALLOWLIST.has(key)) continue;
            sanitized[key] = sanitizeByKey(key, value);
        }

        return Object.keys(sanitized).length ? sanitized : null;
    }

    private sanitizeFieldChanges(fieldChanges: AuditFieldChangeInput[]): AuditFieldChangeInput[] {
        const sanitized: AuditFieldChangeInput[] = [];
        const list = Array.isArray(fieldChanges) ? fieldChanges : [];

        for (const change of list) {
            if (!change || typeof change !== 'object') continue;
            if (sanitized.length >= 1000) break;

            const fieldPath = String(change.fieldPath || '').trim();
            if (!fieldPath) continue;

            const maskedPath = REDACT_KEY_RE.test(fieldPath);
            const oldValue = maskedPath ? '[REDACTED]' : sanitizeByKey(fieldPath, change.oldValue);
            const newValue = maskedPath ? '[REDACTED]' : sanitizeByKey(fieldPath, change.newValue);

            sanitized.push({
                fieldPath,
                oldValue,
                newValue,
            });
        }

        return sanitized;
    }

    private normalizeTimestamp(value?: string): string {
        const text = String(value || '').trim();
        if (!text) return new Date().toISOString();
        const asDate = new Date(text);
        if (Number.isNaN(asDate.getTime())) return new Date().toISOString();
        return asDate.toISOString();
    }

    private normalizeText(value: unknown): string | null {
        if (value === null || value === undefined) return null;
        const text = String(value).trim();
        return text || null;
    }

    private normalizeRequired(value: unknown, fieldName: string): string {
        const text = String(value || '').trim();
        if (!text) {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.audit.required_field',
                message: `${fieldName} is required`,
                details: { field: fieldName },
            };
        }
        return text;
    }
}
