import { useState, useCallback, useEffect } from 'react';
import { DocumentStatus } from '../types/approval';

export interface PendingDocument {
    doc_type: string;
    doc_id: string | number;
    ref_no: string;
    doc_date: string;
    created_by: string;
    submitted_at: string;
    amount: string | number;
    status: DocumentStatus;
}

export function useApprovalInbox(userId: string) {
    const [documents, setDocuments] = useState<PendingDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInbox = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // @ts-ignore
            const res = await window.electronAPI.workflow.getPendingApprovals();
            setDocuments(res || []);
        } catch (err: any) {
            console.error('Failed to fetch approval inbox:', err);
            setError(err.message || 'Error fetching pending approvals');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const approve = useCallback(async (docType: string, docId: string | number) => {
        setIsLoading(true);
        setError(null);
        try {
            // @ts-ignore
            await window.electronAPI.workflow.approveDocument(docType, docId, userId);
            setDocuments(prev => prev.filter(doc => !(doc.doc_type === docType && doc.doc_id === docId)));
        } catch (err: any) {
            console.error('Workflow error:', err);
            setError(err.message || 'An error occurred during approval');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const reject = useCallback(async (docType: string, docId: string | number, reason: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // @ts-ignore
            await window.electronAPI.workflow.rejectDocument(docType, docId, userId, reason);
            setDocuments(prev => prev.filter(doc => !(doc.doc_type === docType && doc.doc_id === docId)));
        } catch (err: any) {
            console.error('Workflow error:', err);
            setError(err.message || 'An error occurred during rejection');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Initial fetch on mount
    useEffect(() => {
        fetchInbox();
    }, [fetchInbox]);

    return {
        documents,
        isLoading,
        error,
        fetchInbox,
        approve,
        reject
    };
}
