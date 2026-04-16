import { useState, useCallback, useEffect } from 'react';
import { useMyPermissions } from './useMyPermissions';

export interface ApprovalInboxFilters {
    doc_no?: string;
    doc_type?: string;
    doc_date_from?: string;
    doc_date_to?: string;
}

export function useApprovalInboxV2(level: 1 | 2, filters: ApprovalInboxFilters) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { permissions, hasPermission } = useMyPermissions();

    const fetchInbox = useCallback(async () => {
        setIsLoading(true);
        try {
            const electronAPI = (window as any).electronAPI;
            const res = await electronAPI.approvalV2.listPending({ level, filters });
            setDocuments(res || []);
        } catch (e) {
            console.error('Failed to fetch v2 inbox:', e);
        } finally {
            setIsLoading(false);
        }
    }, [level, filters]);

    useEffect(() => {
        fetchInbox();
    }, [fetchInbox]);

    const approve = async (docType: string, docId: string | number) => {
        const requiredPerm = level === 1 ? 'DOC.APPROVE_L1' : 'DOC.APPROVE_L2';
        if (!hasPermission(requiredPerm)) {
            throw new Error(`ليس لديك صلاحية اعتماد مستوى ${level}`);
        }

        const electronAPI = (window as any).electronAPI;
        const res = await electronAPI.approvalV2.approve({ docType, docId, level, userId: 'User' }); // User should come from context
        if (res.success) {
            await fetchInbox();
            return true;
        }
        return false;
    };

    const reject = async (docType: string, docId: string | number, reason: string) => {
        if (!hasPermission('DOC.REJECT')) {
            throw new Error('ليس لديك صلاحية الرفض');
        }

        const electronAPI = (window as any).electronAPI;
        const res = await electronAPI.approvalV2.reject({ docType, docId, level, userId: 'User', reason });
        if (res.success) {
            await fetchInbox();
            return true;
        }
        return false;
    };

    return {
        documents,
        isLoading,
        fetchInbox,
        approve,
        reject
    };
}
