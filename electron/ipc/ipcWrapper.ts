import { IpcMainInvokeEvent } from 'electron';

export type IpcResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string; details?: any } };

export function ipcWrap<T>(handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<T> | T) {
    return async (event: IpcMainInvokeEvent, ...args: any[]): Promise<IpcResult<T>> => {
        try {
            const data = await handler(event, ...args);
            return { ok: true, data };
        } catch (error: any) {
            console.error('[IPC Error]', error);

            // Map common error codes
            let code = error.code || 'INTERNAL_ERROR';
            if (error.message.includes('permission')) code = 'PERMISSION_DENIED';
            else if (error.message.includes('validation')) code = 'VALIDATION_ERROR';
            else if (error.message.includes('not found')) code = 'DOCUMENT_NOT_FOUND';
            else if (error.message.includes('UNIQUE constraint')) code = 'CONFLICT';

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
