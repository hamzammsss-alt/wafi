import { useState, useCallback } from 'react';
import { DocumentStatus, PermissionKey, ApprovalPolicy } from '../types/approval';

interface UseApprovalWorkflowProps {
    docId: string | number;
    docType: string;
    currentStatus: DocumentStatus;
    userId: string;
    userPermissions: string[];
    setStatus: (status: DocumentStatus) => void;
    api: any; // electronAPI or similar
}

export function useApprovalWorkflow({
    docId,
    docType,
    currentStatus,
    userId,
    userPermissions,
    setStatus,
    api
}: UseApprovalWorkflowProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePostOrSubmitApproval = useCallback(async () => {
        setIsProcessing(true);
        setError(null);
        try {
            const hasPostPermission = userPermissions.includes('DOC.POST');

            if (hasPostPermission) {
                if (!ApprovalPolicy.canActionOnStatus('DOC.POST', currentStatus)) {
                    throw new Error('Cannot post document in current status');
                }
                await api.invoke('workflow:postDocument', docType, docId, userId);
                setStatus('POSTED');
            } else {
                if (!ApprovalPolicy.canActionOnStatus('DOC.SUBMIT_APPROVAL', currentStatus)) {
                    throw new Error('Cannot submit for approval in current status');
                }
                await api.invoke('workflow:submitDocumentForApproval', docType, docId, userId);
                setStatus('PENDING_APPROVAL');
            }
        } catch (err: any) {
            console.error('Workflow error:', err);
            setError(err.message || 'An error occurred');
            throw err; // re-throw for UI to handle if needed
        } finally {
            setIsProcessing(false);
        }
    }, [docId, docType, currentStatus, userPermissions, setStatus, api]);

    const approve = useCallback(async () => {
        setIsProcessing(true);
        setError(null);
        try {
            if (!ApprovalPolicy.canActionOnStatus('DOC.APPROVE', currentStatus)) {
                throw new Error('Cannot approve document in current status');
            }
            await api.invoke('workflow:approveDocument', docType, docId, userId);
            setStatus('APPROVED');
        } catch (err: any) {
            console.error('Workflow error:', err);
            setError(err.message || 'An error occurred');
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [docId, docType, currentStatus, setStatus, api]);

    const reject = useCallback(async (reason: string) => {
        setIsProcessing(true);
        setError(null);
        try {
            if (!ApprovalPolicy.canActionOnStatus('DOC.REJECT', currentStatus)) {
                throw new Error('Cannot reject document in current status');
            }
            await api.invoke('workflow:rejectDocument', docType, docId, userId, reason);
            setStatus('REJECTED');
        } catch (err: any) {
            console.error('Workflow error:', err);
            setError(err.message || 'An error occurred');
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [docId, docType, currentStatus, setStatus, api]);

    const reopenRejected = useCallback(async () => {
        setIsProcessing(true);
        setError(null);
        try {
            if (!ApprovalPolicy.canActionOnStatus('DOC.REOPEN_REJECTED', currentStatus)) {
                throw new Error('Cannot reopen document in current status');
            }
            await api.invoke('workflow:reopenRejected', docType, docId, userId);
            setStatus('DRAFT');
        } catch (err: any) {
            console.error('Workflow error:', err);
            setError(err.message || 'An error occurred');
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [docId, docType, currentStatus, setStatus, api]);

    return {
        isProcessing,
        error,
        handlePostOrSubmitApproval,
        approve,
        reject,
        reopenRejected
    };
}
