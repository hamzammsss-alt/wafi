import { DomainError } from '../domain/errors';

type IpcStandardErrorCode =
    | 'UNAUTHENTICATED'
    | 'INVALID_SCOPE'
    | 'PERMISSION_DENIED'
    | 'STALE_PERMISSIONS'
    | 'POLICY_VIOLATION'
    | 'VALIDATION_ERROR'
    | 'INTERNAL_ERROR';

type IpcStandardError = {
    code: IpcStandardErrorCode | string;
    messageKey: string;
    message?: string;
    details?: any;
};

type IpcStandardEnvelope<T> =
    | { ok: true; data: T }
    | {
        ok: false;
        error: IpcStandardError;
    };

const MESSAGE_KEY_BY_CODE: Record<string, string> = {
    UNAUTHENTICATED: 'error.auth.unauthenticated',
    INVALID_SCOPE: 'error.scope.invalid',
    PERMISSION_DENIED: 'error.permission_denied',
    STALE_PERMISSIONS: 'error.permissions.stale',
    POLICY_VIOLATION: 'error.policy.violation',
    VALIDATION_ERROR: 'error.validation',
    INTERNAL_ERROR: 'error.internal',
};

function normalizeCode(value: any, fallback: IpcStandardErrorCode): string {
    const code = String(value || '').trim().toUpperCase();
    return code || fallback;
}

function getMessageKey(code: string, explicitMessageKey?: string): string {
    if (explicitMessageKey) return explicitMessageKey;
    if (MESSAGE_KEY_BY_CODE[code]) return MESSAGE_KEY_BY_CODE[code];
    return `error.${code.toLowerCase()}`;
}

function normalizeError(error: any): IpcStandardError {
    if (error instanceof DomainError || error?.name === 'DomainError') {
        const code = normalizeCode(error?.code, 'VALIDATION_ERROR');
        return {
            code,
            message: String(error?.message || code),
            messageKey: getMessageKey(code, error?.messageKey),
            details: error?.details,
        };
    }

    if (error && typeof error === 'object' && error.code) {
        const code = normalizeCode(error.code, 'INTERNAL_ERROR');
        return {
            code,
            message: String(error.message || code),
            messageKey: getMessageKey(code, error.messageKey),
            details: error.details,
        };
    }

    if (String(error?.message || '') === 'PERMISSION_DENIED') {
        return {
            code: 'PERMISSION_DENIED',
            message: 'PERMISSION_DENIED',
            messageKey: MESSAGE_KEY_BY_CODE.PERMISSION_DENIED,
        };
    }

    return {
        code: 'INTERNAL_ERROR',
        message: String(error?.message || 'INTERNAL_ERROR'),
        messageKey: MESSAGE_KEY_BY_CODE.INTERNAL_ERROR,
        details: error?.details,
    };
}

export function ipcWrap(handler: (event: any, ...args: any[]) => Promise<any>) {
    return async (event: any, ...args: any[]) => {
        try {
            const data = await handler(event, ...args);
            return { ok: true, data } as IpcStandardEnvelope<any>;
        } catch (error: any) {
            console.error('IPC Error:', error);
            return {
                ok: false,
                error: normalizeError(error),
            } as IpcStandardEnvelope<any>;
        }
    };
}
