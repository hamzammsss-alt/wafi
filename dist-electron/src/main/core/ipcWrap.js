"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipcWrap = ipcWrap;
const errors_1 = require("../domain/errors");
const MESSAGE_KEY_BY_CODE = {
    UNAUTHENTICATED: 'error.auth.unauthenticated',
    INVALID_SCOPE: 'error.scope.invalid',
    PERMISSION_DENIED: 'error.permission_denied',
    STALE_PERMISSIONS: 'error.permissions.stale',
    POLICY_VIOLATION: 'error.policy.violation',
    VALIDATION_ERROR: 'error.validation',
    INTERNAL_ERROR: 'error.internal',
};
function normalizeCode(value, fallback) {
    const code = String(value || '').trim().toUpperCase();
    return code || fallback;
}
function getMessageKey(code, explicitMessageKey) {
    if (explicitMessageKey)
        return explicitMessageKey;
    if (MESSAGE_KEY_BY_CODE[code])
        return MESSAGE_KEY_BY_CODE[code];
    return `error.${code.toLowerCase()}`;
}
function normalizeError(error) {
    if (error instanceof errors_1.DomainError || error?.name === 'DomainError') {
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
function ipcWrap(handler) {
    return async (event, ...args) => {
        try {
            const data = await handler(event, ...args);
            return { ok: true, data };
        }
        catch (error) {
            console.error('IPC Error:', error);
            return {
                ok: false,
                error: normalizeError(error),
            };
        }
    };
}
