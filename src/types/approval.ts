// src/types/approval.ts

export type DocumentStatus =
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'PENDING_APPROVAL_L1'
    | 'PENDING_APPROVAL_L2'
    | 'APPROVED'
    | 'POSTED'
    | 'REJECTED'
    | 'CANCELLED';

export type PermissionKey =
    | 'DOC.POST'
    | 'DOC.SUBMIT_APPROVAL'
    | 'DOC.APPROVE'
    | 'DOC.APPROVE_L1'
    | 'DOC.APPROVE_L2'
    | 'DOC.REJECT'
    | 'DOC.REOPEN_REJECTED'
    | 'ADMIN.APPROVAL_CONFIG';

export const ACTION_PERMISSION: Record<string, PermissionKey> = {
    POST: 'DOC.POST',
    SUBMIT: 'DOC.SUBMIT_APPROVAL',
    APPROVE: 'DOC.APPROVE',
    APPROVE_L1: 'DOC.APPROVE_L1',
    APPROVE_L2: 'DOC.APPROVE_L2',
    REJECT: 'DOC.REJECT',
    REOPEN: 'DOC.REOPEN_REJECTED',
    ADMIN_CONFIG: 'ADMIN.APPROVAL_CONFIG'
};

export const ApprovalPolicy = {
    /** Valid state transitions based on requested action */
    canActionOnStatus: (action: PermissionKey, status: DocumentStatus): boolean => {
        switch (action) {
            case 'DOC.POST':
                return status === 'DRAFT' || status === 'REJECTED' || status === 'PENDING_APPROVAL_L1' || status === 'PENDING_APPROVAL_L2' || status === 'PENDING_APPROVAL';
            case 'DOC.SUBMIT_APPROVAL':
                return status === 'DRAFT' || status === 'REJECTED';
            case 'DOC.APPROVE':
                return status === 'PENDING_APPROVAL' || status === 'PENDING_APPROVAL_L1' || status === 'PENDING_APPROVAL_L2';
            case 'DOC.APPROVE_L1':
                return status === 'PENDING_APPROVAL' || status === 'PENDING_APPROVAL_L1';
            case 'DOC.APPROVE_L2':
                return status === 'PENDING_APPROVAL_L2';
            case 'DOC.REJECT':
                return status === 'PENDING_APPROVAL' || status === 'PENDING_APPROVAL_L1' || status === 'PENDING_APPROVAL_L2';
            case 'DOC.REOPEN_REJECTED':
                return status === 'REJECTED';
            default:
                return false;
        }
    },

    /** Determines if the document is editable based on its status */
    isEditableStatus: (status: DocumentStatus): boolean => {
        return status === 'DRAFT' || status === 'REJECTED';
    },

    /** Centralized Logic for F9 Action (Post vs Submit for Approval) */
    getPostActionVariant: (status: DocumentStatus, userPermissions: string[]): {
        action: 'POST' | 'SUBMIT' | 'NOT_ALLOWED';
        label: string;
    } => {
        if (status !== 'DRAFT' && status !== 'REJECTED') {
            return { action: 'NOT_ALLOWED', label: 'حالة السند لا تسمح بالترحيل' };
        }

        if (userPermissions.includes(ACTION_PERMISSION.POST)) {
            return { action: 'POST', label: 'ترحيل نهائي (F9)' };
        } else if (userPermissions.includes(ACTION_PERMISSION.SUBMIT)) {
            return { action: 'SUBMIT', label: 'إرسال للاعتماد (F9)' };
        }

        return { action: 'NOT_ALLOWED', label: 'عفوًا، لا تملك صلاحية الترحيل أو الإرسال' };
    }
};
