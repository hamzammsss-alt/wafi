import { Result, AppError, asResult } from '../types/errors';

export interface PendingDocKeyset {
    rows: any[];
    next_cursor?: {
        submitted_at: string;
        id: string;
        is_overdue?: boolean;
        overdue_minutes?: number
    };
}

export const approvalClient = {
    // --- V4 Endpoints using Error Wrappers & Keyset Pagination ---

    listPendingKeyset: async (params: any): Promise<Result<PendingDocKeyset>> => {
        return await asResult((window as any).electronAPI.approvalV4.listPendingKeyset(params));
    },

    approve: async (docType: string, docId: string, level: number, userId: string): Promise<Result<any>> => {
        return await asResult((window as any).electronAPI.approvalV4.approve({ docType, docId, level, userId }));
    },

    reject: async (docType: string, docId: string, level: number, userId: string, reason: string): Promise<Result<any>> => {
        return await asResult((window as any).electronAPI.approvalV4.reject({ docType, docId, level, userId, reason }));
    },

    bulkApprove: async (level: number, docIds: { docId: string, docType: string }[], userId: string): Promise<Result<any[]>> => {
        return await asResult((window as any).electronAPI.approvalV4.bulkApprove({ level, docIds, userId }));
    },

    bulkReject: async (level: number, docIds: { docId: string, docType: string }[], userId: string, reason: string): Promise<Result<any[]>> => {
        return await asResult((window as any).electronAPI.approvalV4.bulkReject({ level, docIds, userId, reason }));
    },

    // --- Rules CRUD ---
    rules: {
        list: async (docType?: string): Promise<Result<any[]>> => {
            return await asResult((window as any).electronAPI.approvalV4.rules.list(docType));
        },
        upsert: async (rule: any): Promise<Result<any>> => {
            return await asResult((window as any).electronAPI.approvalV4.rules.upsert(rule));
        },
        delete: async (id: string): Promise<Result<void>> => {
            return await asResult((window as any).electronAPI.approvalV4.rules.delete(id));
        }
    },

    slaRules: {
        list: async (): Promise<Result<any[]>> => {
            return await asResult((window as any).electronAPI.approvalV4.slaRules.list());
        },
        upsert: async (rule: any): Promise<Result<any>> => {
            return await asResult((window as any).electronAPI.approvalV4.slaRules.upsert(rule));
        },
        delete: async (id: string): Promise<Result<void>> => {
            return await asResult((window as any).electronAPI.approvalV4.slaRules.delete(id));
        }
    },

    schedulerLogs: {
        list: async (limit: number = 50): Promise<Result<any[]>> => {
            return await asResult((window as any).electronAPI.approvalV4.schedulerLogs.list(limit));
        }
    },

    runSlaSweepNow: async (): Promise<Result<any>> => {
        return await asResult((window as any).electronAPI.approvalV4.runSlaSweepNow());
    }
};
