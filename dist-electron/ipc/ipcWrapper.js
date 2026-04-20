"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipcWrap = ipcWrap;
function ipcWrap(handler) {
    return async (event, ...args) => {
        try {
            const data = await handler(event, ...args);
            return { ok: true, data };
        }
        catch (error) {
            console.error('[IPC Error]', error);
            // Map common error codes
            let code = error.code || 'INTERNAL_ERROR';
            if (error.message.includes('permission'))
                code = 'PERMISSION_DENIED';
            else if (error.message.includes('validation'))
                code = 'VALIDATION_ERROR';
            else if (error.message.includes('not found'))
                code = 'DOCUMENT_NOT_FOUND';
            else if (error.message.includes('UNIQUE constraint'))
                code = 'CONFLICT';
            return {
                ok: false,
                error: {
                    code,
                    message: error.message || 'An unexpected error occurred',
                    details: error.details
                }
            };
        }
    };
}
