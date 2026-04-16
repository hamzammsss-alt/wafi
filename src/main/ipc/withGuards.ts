import { getContext } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { getGlobalAuditService } from '../application/services/AuditService';
import { AuditContext } from '../domain/audit/AuditTypes';

export type GuardErrorCode =
    | 'UNAUTHENTICATED'
    | 'INVALID_SCOPE'
    | 'PERMISSION_DENIED'
    | 'STALE_PERMISSIONS'
    | 'POLICY_VIOLATION';

type GuardOptions = {
    eventName: string;
    requiredCapabilities?: string[];
    legacyPermissions?: string[];
    policyGuard?: (ctx: any, ...args: any[]) => boolean | Promise<boolean>;
    extractExpectedVersions?: (args: any[]) => {
        companyAclVersion?: number;
        branchAclVersion?: number;
    } | null;
    allowUnauthenticated?: boolean;
    auditHook?: (payload: GuardAuditPayload) => void;
    auditAllowSampleRate?: number;
};

const MESSAGE_KEYS: Record<GuardErrorCode, string> = {
    UNAUTHENTICATED: 'error.auth.unauthenticated',
    INVALID_SCOPE: 'error.scope.invalid',
    PERMISSION_DENIED: 'error.permission_denied',
    STALE_PERMISSIONS: 'error.permissions.stale',
    POLICY_VIOLATION: 'error.policy.violation',
};

type GuardAuditPayload = {
    eventName: string;
    userId: string;
    companyId: string;
    branchId: string;
    sessionId?: string | null;
    correlationId: string;
    ipcid: string;
    status: 'ALLOW' | 'DENY';
    code?: GuardErrorCode;
    messageKey?: string;
    timestamp: string;
};

export class IpcGuardError extends Error {
    code: GuardErrorCode;
    messageKey: string;
    details?: any;

    constructor(code: GuardErrorCode, details?: any, messageKey?: string) {
        super(code);
        this.name = 'IpcGuardError';
        this.code = code;
        this.details = details;
        this.messageKey = messageKey || MESSAGE_KEYS[code];
    }
}

function hasGrantedCapability(ctx: any, required: string[], legacyPermissions: string[]): boolean {
    if (!required.length && !legacyPermissions.length) return true;
    const permissions = Array.isArray(ctx?.permissions) ? ctx.permissions : [];
    const capabilities = Array.isArray(ctx?.capabilities) ? ctx.capabilities : [];
    const granted = new Set<string>([...permissions, ...capabilities]);
    if (granted.has('ALL') || granted.has('*.*')) return true;
    for (const key of required) {
        if (granted.has(key)) return true;
    }
    for (const key of legacyPermissions) {
        if (granted.has(key)) return true;
    }
    return false;
}

function buildAuditPayload(
    eventName: string,
    ctx: any,
    correlationId: string,
    ipcid: string,
): Omit<GuardAuditPayload, 'status'> {
    return {
        eventName,
        userId: String(ctx?.userId || ''),
        companyId: String(ctx?.companyId || ''),
        branchId: String(ctx?.branchId || ''),
        sessionId: String(ctx?.sessionId || ipcid || ''),
        correlationId,
        ipcid,
        timestamp: new Date().toISOString(),
    };
}

function toAuditContext(ctx: any, correlationId: string, ipcid: string): AuditContext {
    return {
        companyId: String(ctx?.companyId || 'COMP_01'),
        branchId: String(ctx?.branchId || '') || null,
        userId: String(ctx?.userId || 'SYSTEM'),
        sessionId: String(ctx?.sessionId || ipcid || '') || null,
        correlationId,
        ipcid,
    };
}

function emitGuardAuditEvent(params: {
    eventName: string;
    ctx: any;
    correlationId: string;
    ipcid: string;
    status: 'ALLOW' | 'DENY';
    code?: GuardErrorCode;
    messageKey?: string;
    requiredCapabilities?: string[];
}) {
    const auditService = getGlobalAuditService();
    if (!auditService) return;

    try {
        const eventType =
            params.status === 'ALLOW'
                ? 'permission.allowed'
                : params.code === 'POLICY_VIOLATION'
                    ? 'policy.violation'
                    : 'permission.denied';

        const summaryI18nKey =
            eventType === 'policy.violation'
                ? 'audit.event.policy.violation'
                : eventType === 'permission.allowed'
                    ? 'audit.event.permission.allowed'
                    : 'audit.event.permission.denied';

        auditService.recordEvent(
            toAuditContext(params.ctx, params.correlationId, params.ipcid),
            {
                entityType: 'ipc.route',
                entityId: params.eventName,
                docType: null,
                docId: null,
                eventType,
                summaryI18nKey,
                correlationId: params.correlationId,
                ipcid: params.ipcid,
                meta: {
                    eventName: params.eventName,
                    errorCode: params.code || null,
                    messageKey: params.messageKey || null,
                    requiredCapabilities: params.requiredCapabilities || [],
                    status: params.status,
                },
            },
            [],
        );
    } catch (error) {
        console.warn('[IPC_GUARD_AUDIT_EVENT_FAILED]', error);
    }
}

function auditDenied(
    eventName: string,
    ctx: any,
    error: IpcGuardError,
    correlationId: string,
    ipcid: string,
    requiredCapabilities: string[],
    auditHook?: GuardOptions['auditHook'],
) {
    const auditPayload: GuardAuditPayload = {
        ...buildAuditPayload(eventName, ctx, correlationId, ipcid),
        status: 'DENY',
        code: error.code,
        messageKey: error.messageKey,
    };
    console.warn('[IPC_GUARD_DENIED]', auditPayload);
    try {
        auditHook?.(auditPayload);
    } catch (hookError) {
        console.warn('[IPC_GUARD_AUDIT_HOOK_FAILED]', hookError);
    }
    emitGuardAuditEvent({
        eventName,
        ctx,
        correlationId,
        ipcid,
        status: 'DENY',
        code: error.code,
        messageKey: error.messageKey,
        requiredCapabilities,
    });
}

function auditAllowed(
    eventName: string,
    ctx: any,
    correlationId: string,
    ipcid: string,
    requiredCapabilities: string[],
    allowSampleRate: number,
    auditHook?: GuardOptions['auditHook'],
) {
    const auditPayload: GuardAuditPayload = {
        ...buildAuditPayload(eventName, ctx, correlationId, ipcid),
        status: 'ALLOW',
    };
    try {
        auditHook?.(auditPayload);
    } catch (hookError) {
        console.warn('[IPC_GUARD_AUDIT_HOOK_FAILED]', hookError);
    }

    if (allowSampleRate > 0 && Math.random() <= allowSampleRate) {
        emitGuardAuditEvent({
            eventName,
            ctx,
            correlationId,
            ipcid,
            status: 'ALLOW',
            requiredCapabilities,
        });
    }
}

function isFreshSnapshot(
    ctx: any,
    expected?: {
        companyAclVersion?: number;
        branchAclVersion?: number;
    } | null
): boolean {
    if (!expected) return true;
    const expectedCompanyVersion = Number(expected.companyAclVersion || 0);
    const expectedBranchVersion = Number(expected.branchAclVersion || 0);
    if (expectedCompanyVersion > 0 && expectedCompanyVersion !== Number(ctx?.companyAclVersion || 0)) {
        return false;
    }
    if (expectedBranchVersion > 0 && expectedBranchVersion !== Number(ctx?.branchAclVersion || 0)) {
        return false;
    }
    return true;
}

export function withGuards<TArgs extends any[], TResult>(
    options: GuardOptions,
    handler: (ctx: any, event: Electron.IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult
) {
    return async (event: Electron.IpcMainInvokeEvent, ...args: TArgs): Promise<TResult> => {
        const baseCtx = getContext(event as any);
        const correlationId = uuidv4();
        const ipcid = String(event?.sender?.id || '');
        const ctx = {
            ...baseCtx,
            correlationId,
            ipcid,
            sessionId: String((baseCtx as any)?.sessionId || ipcid || ''),
        };

        try {
            // 1) Auth
            if (!options.allowUnauthenticated && !ctx?.isAuthenticated) {
                throw new IpcGuardError('UNAUTHENTICATED');
            }

            // 2) Tenant scope
            if (!ctx?.companyId || !ctx?.branchId) {
                throw new IpcGuardError('INVALID_SCOPE');
            }

            // 3) Permission (includes optional snapshot freshness check)
            const expectedVersions = options.extractExpectedVersions
                ? options.extractExpectedVersions(args)
                : null;
            if (!isFreshSnapshot(ctx, expectedVersions)) {
                throw new IpcGuardError('STALE_PERMISSIONS');
            }
            const requiredCapabilities = options.requiredCapabilities || [];
            const legacyPermissions = options.legacyPermissions || [];
            if (!hasGrantedCapability(ctx, requiredCapabilities, legacyPermissions)) {
                const preferredKey = requiredCapabilities[0] || legacyPermissions[0] || '';
                const messageKey = preferredKey
                    ? `error.permission_denied.${preferredKey}`
                    : MESSAGE_KEYS.PERMISSION_DENIED;
                throw new IpcGuardError('PERMISSION_DENIED', { capabilityKey: preferredKey }, messageKey);
            }

            // 4) Policy
            if (options.policyGuard) {
                const policyAllowed = await options.policyGuard(ctx, ...args);
                if (!policyAllowed) {
                    throw new IpcGuardError('POLICY_VIOLATION');
                }
            }

            // 5) Audit on allow
            const result = await handler(ctx, event, ...args);
            const sampleRate = Math.max(0, Math.min(Number(options.auditAllowSampleRate || 0), 1));
            auditAllowed(
                options.eventName,
                ctx,
                correlationId,
                ipcid,
                requiredCapabilities,
                sampleRate,
                options.auditHook,
            );
            return result;
        } catch (error: any) {
            if (error instanceof IpcGuardError) {
                auditDenied(
                    options.eventName,
                    ctx,
                    error,
                    correlationId,
                    ipcid,
                    options.requiredCapabilities || [],
                    options.auditHook,
                );
                throw error;
            }
            throw error;
        }
    };
}
