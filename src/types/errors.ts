export type ErrorCode =
    | 'PERMISSION_DENIED'
    | 'INVALID_TRANSITION'
    | 'DOCUMENT_NOT_FOUND'
    | 'CONFLICT'
    | 'VALIDATION_ERROR'
    | 'UNKNOWN_ERROR';

export interface AppError {
    code: ErrorCode;
    message: string;
    details?: any;
}

export interface Result<T> {
    ok: boolean;
    data?: T;
    error?: AppError;
}

export class AppErrorImpl extends Error {
    constructor(public code: ErrorCode, message: string, public details?: any) {
        super(message);
        this.name = 'AppError';
    }
}

export const createError = (code: ErrorCode, message: string, details?: any): AppError => ({
    code,
    message,
    details
});

export const success = <T>(data: T): Result<T> => ({
    ok: true,
    data
});

export const failure = (error: AppError): Result<any> => ({
    ok: false,
    error
});

export const asResult = async <T>(promise: Promise<T>): Promise<Result<T>> => {
    try {
        const data = await promise;
        return success(data);
    } catch (e: any) {
        if (e.code && ['PERMISSION_DENIED', 'INVALID_TRANSITION', 'DOCUMENT_NOT_FOUND', 'CONFLICT', 'VALIDATION_ERROR'].includes(e.code)) {
            return failure(e as AppError);
        }

        let code: ErrorCode = 'UNKNOWN_ERROR';
        if (e.message?.includes('Unauthorized') || e.message?.includes('Missing permission')) code = 'PERMISSION_DENIED';
        else if (e.message?.includes('CONFLICT')) code = 'CONFLICT';
        else if (e.message?.includes('not found')) code = 'DOCUMENT_NOT_FOUND';
        else if (e.message?.includes('status')) code = 'INVALID_TRANSITION';

        return failure(createError(code, e.message || 'An unknown error occurred'));
    }
};
