import { useState, useCallback, useEffect } from 'react';

import { DocumentStatus } from '../types/approval';

export type DocumentMode = 'NEW' | 'EDIT' | 'VIEW';

interface UseDocumentStateProps {
    initialStatus?: DocumentStatus;
}

export function useDocumentState({
    initialStatus = 'DRAFT'
}: UseDocumentStateProps = {}) {

    const [mode, setMode] = useState<DocumentMode>('NEW');
    const [status, setStatus] = useState<DocumentStatus>(initialStatus);
    const [isDirty, setIsDirty] = useState(false);

    const isEditable = status === 'DRAFT' || status === 'REJECTED';
    const isReadOnly = !isEditable;

    const markDirty = useCallback(() => {
        setIsDirty(true);
    }, []);

    const markClean = useCallback(() => {
        setIsDirty(false);
    }, []);

    const setNew = useCallback(() => {
        setMode('NEW');
        setStatus('DRAFT');
        setIsDirty(false);
    }, []);

    const setEdit = useCallback((docStatus: DocumentStatus) => {
        setMode(docStatus === 'DRAFT' ? 'EDIT' : 'VIEW');
        setStatus(docStatus);
        setIsDirty(false);
    }, []);

    const setDraft = useCallback(() => {
        setStatus('DRAFT');
        setMode('EDIT');
    }, []);

    const setPendingApproval = useCallback((level: 1 | 2 = 1) => {
        setStatus(level === 1 ? 'PENDING_APPROVAL_L1' : 'PENDING_APPROVAL_L2');
        setMode('VIEW');
    }, []);

    const setPosted = useCallback(() => {
        setStatus('POSTED');
        setMode('VIEW');
    }, []);

    const setRejected = useCallback(() => {
        setStatus('REJECTED');
        setMode('VIEW');
    }, []);

    return {
        mode,
        status,
        isEditable,
        isReadOnly,
        isDirty,
        markDirty,
        markClean,
        setNew,
        setDraft,
        setEdit,
        setPendingApproval,
        setPosted,
        setRejected
    };
}

export function useDocumentLoader(docType: string, docId?: string | number | null) {
    const [header, setHeader] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [auditLog, setAuditLog] = useState<any[]>([]);

    // Function that loads doc from backend and sets it to local state
    const loadDocument = useCallback(async () => {
        if (!docId || docId === 'new') {
            setHeader(null);
            setAuditLog([]);
            return;
        }

        setIsLoading(true);
        try {
            const electronAPI = (window as any).electronAPI;
            const docHeader = await electronAPI.documentsRead.getHeader(docType, docId.toString());
            if (docHeader) {
                setHeader(docHeader);
            }
            // Optionally load audit log right away
            const audit = await electronAPI.documentsRead.getAuditTrail(docId.toString());
            if (audit) {
                setAuditLog(audit);
            }
        } catch (error) {
            console.error('Failed to load document:', error);
        } finally {
            setIsLoading(false);
        }
    }, [docType, docId]);

    useEffect(() => {
        loadDocument();
    }, [loadDocument]);

    return { header, isLoading, auditLog, reload: loadDocument };
}
