import { useState, useEffect, useCallback } from 'react';
import { useMyPermissions } from './useMyPermissions';
import { approvalClient, PendingDocKeyset } from '../lib/approvalClient';
import { asResult } from '../types/errors';

export interface PendingDocV3 {
    doc_id: string;
    doc_type: string;
    doc_no: string;
    doc_date: string;
    status: string;
    submitted_at: string;
    total_amount: number;
    pending_level: number;
    is_overdue: boolean;
    overdue_minutes: number;
}

export function useApprovalInboxV3(level: number, filters?: any, sort?: string) {
    const [documents, setDocuments] = useState<PendingDocV3[]>([]);
    const [nextCursor, setNextCursor] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaginating, setIsPaginating] = useState(false);
    const { permissions, isLoading: permsLoading } = useMyPermissions();

    const fetchDocs = useCallback(async (isLoadMore = false) => {
        if (isLoadMore) setIsPaginating(true);
        else setIsLoading(true);

        try {
            const cursor = isLoadMore ? nextCursor : undefined;
            const res = await approvalClient.listPendingKeyset({
                level, filters, sort, cursor, limit: 50
            });

            if (res.ok && res.data) {
                if (isLoadMore) {
                    setDocuments(prev => [...prev, ...res.data!.rows]);
                } else {
                    setDocuments(res.data.rows);
                }
                setNextCursor(res.data.next_cursor);
            } else if (res.error) {
                console.error('Error fetching V4 keyset inbox:', res.error.message);
            }
        } catch (error) {
            console.error('Unexpected UI error:', error);
        } finally {
            setIsLoading(false);
            setIsPaginating(false);
        }
    }, [level, filters, sort, nextCursor]);

    // Initial Load
    useEffect(() => {
        fetchDocs(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, filters, sort]);

    const canApprove = !permsLoading && (
        (level === 1 && permissions['DOC.APPROVE_L1']) ||
        (level === 2 && permissions['DOC.APPROVE_L2'])
    );
    const canReject = !permsLoading && permissions['DOC.REJECT'];

    const bulkApprove = async (docIds: PendingDocV3[], userId: string) => {
        if (!canApprove) throw new Error('Unauthorized');

        const payload = docIds.map(d => ({ docId: d.doc_id, docType: d.doc_type }));
        const res = await approvalClient.bulkApprove(level, payload, userId);

        if (res.ok) {
            await fetchDocs(false);
            return res.data;
        } else {
            throw new Error(res.error?.message || 'Bulk Approve Failed');
        }
    };

    const bulkReject = async (docIds: PendingDocV3[], reason: string, userId: string) => {
        if (!canReject) throw new Error('Unauthorized');

        const payload = docIds.map(d => ({ docId: d.doc_id, docType: d.doc_type }));
        const res = await approvalClient.bulkReject(level, payload, userId, reason);

        if (res.ok) {
            await fetchDocs(false);
            return res.data;
        } else {
            throw new Error(res.error?.message || 'Bulk Reject Failed');
        }
    };

    const approve = async (docType: string, docId: string, userId: string) => {
        if (!canApprove) throw new Error('Unauthorized');
        const res = await approvalClient.approve(docType, docId, level, userId);
        if (res.ok) await fetchDocs(false);
        else throw new Error(res.error?.message || 'Approval Failed');
    };

    const reject = async (docType: string, docId: string, reason: string, userId: string) => {
        if (!canReject) throw new Error('Unauthorized');
        const res = await approvalClient.reject(docType, docId, level, userId, reason);
        if (res.ok) await fetchDocs(false);
        else throw new Error(res.error?.message || 'Rejection Failed');
    };

    return {
        documents,
        isLoading,
        isPaginating,
        hasMore: !!nextCursor,
        canApprove,
        canReject,
        fetchDocs,
        approve,
        reject,
        bulkApprove,
        bulkReject
    };
}
