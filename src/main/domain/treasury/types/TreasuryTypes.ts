export type TreasuryDocumentType =
    | 'CASH_RECEIPT'
    | 'CASH_PAYMENT'
    | 'BANK_RECEIPT'
    | 'BANK_PAYMENT'
    | 'CHEQUE_RECEIPT'
    | 'CHEQUE_PAYMENT';

export type TreasuryDocumentStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export type ChequeDirection = 'RECEIVED' | 'ISSUED';

export type ChequeStatus =
    | 'IN_SAFE'
    | 'DEPOSITED'
    | 'CLEARED'
    | 'RETURNED'
    | 'CANCELLED'
    | 'ISSUED_PENDING'
    | 'ISSUED_CLEARED';

export type ChequeEventType =
    | 'RECEIVE'
    | 'ISSUE'
    | 'DEPOSIT'
    | 'CLEAR_RECEIVED'
    | 'RETURN_RECEIVED'
    | 'CLEAR_ISSUED'
    | 'CANCEL';

export interface TreasuryDocumentHeaderEntity {
    id: string;
    companyId: string;
    branchId: string;
    docType: TreasuryDocumentType;
    docNo: string;
    docDate: string;
    status: TreasuryDocumentStatus;
    partnerId: string | null;
    cashAccountId: string | null;
    bankAccountId: string | null;
    currencyCode: string;
    currencyRate: number;
    referenceNo: string | null;
    remarks: string | null;
    createdBy: string;
    approvedBy: string | null;
    version: number;
    journalId: string | null;
    reversalJournalId: string | null;
    postedAt: string | null;
    postedBy: string | null;
    reversedAt: string | null;
    reversedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TreasuryDocumentLineEntity {
    id: string;
    documentId: string;
    lineNo: number;
    accountId: string;
    amount: number;
    description: string | null;
    costCenterId: string | null;
    projectId: string | null;
    expenseTypeId: string | null;
    vehicleId: string | null;
    partnerId: string | null;
    itemId: string | null;
    warehouseId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ChequeRegisterEntity {
    id: string;
    companyId: string;
    branchId: string;
    chequeNo: string;
    chequeDate: string;
    dueDate: string | null;
    amount: number;
    currencyCode: string;
    currencyRate: number;
    bankName: string | null;
    drawerName: string | null;
    payeeName: string | null;
    partnerId: string | null;
    status: ChequeStatus;
    direction: ChequeDirection;
    treasuryDocumentId: string | null;
    depositedBankAccountId: string | null;
    clearedDate: string | null;
    returnedDate: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TreasuryDocumentEntity {
    header: TreasuryDocumentHeaderEntity;
    lines: TreasuryDocumentLineEntity[];
    cheque: ChequeRegisterEntity | null;
}

export interface CreateTreasuryDocumentInput {
    docType: TreasuryDocumentType;
    docDate: string;
    partnerId?: string | null;
    cashAccountId?: string | null;
    bankAccountId?: string | null;
    currencyCode?: string | null;
    currencyRate?: number | null;
    referenceNo?: string | null;
    remarks?: string | null;
    createdBy: string;
    approvedBy?: string | null;
    lines: Array<{
        accountId: string;
        amount: number;
        description?: string | null;
        costCenterId?: string | null;
        projectId?: string | null;
        expenseTypeId?: string | null;
        vehicleId?: string | null;
        partnerId?: string | null;
        itemId?: string | null;
        warehouseId?: string | null;
    }>;
    cheque?: {
        id?: string;
        chequeNo: string;
        chequeDate: string;
        dueDate?: string | null;
        amount?: number | null;
        currencyCode?: string | null;
        currencyRate?: number | null;
        bankName?: string | null;
        drawerName?: string | null;
        payeeName?: string | null;
        partnerId?: string | null;
        notes?: string | null;
    } | null;
}

export interface UpdateTreasuryDocumentInput {
    id: string;
    docDate: string;
    partnerId?: string | null;
    cashAccountId?: string | null;
    bankAccountId?: string | null;
    currencyCode?: string | null;
    currencyRate?: number | null;
    referenceNo?: string | null;
    remarks?: string | null;
    approvedBy?: string | null;
    lines: Array<{
        id?: string;
        accountId: string;
        amount: number;
        description?: string | null;
        costCenterId?: string | null;
        projectId?: string | null;
        expenseTypeId?: string | null;
        vehicleId?: string | null;
        partnerId?: string | null;
        itemId?: string | null;
        warehouseId?: string | null;
    }>;
    cheque?: {
        id?: string;
        chequeNo: string;
        chequeDate: string;
        dueDate?: string | null;
        amount?: number | null;
        currencyCode?: string | null;
        currencyRate?: number | null;
        bankName?: string | null;
        drawerName?: string | null;
        payeeName?: string | null;
        partnerId?: string | null;
        notes?: string | null;
    } | null;
}

export interface ReverseTreasuryDocumentCommand {
    documentId: string;
    reverseDate: string;
    reason?: string | null;
}

export interface TreasuryDocumentPostingStatus {
    documentId: string;
    docType: TreasuryDocumentType;
    docNo: string | null;
    documentStatus: TreasuryDocumentStatus;
    sourceVersion: number;
    isFinancialPosted: boolean;
    isFinancialReversed: boolean;
    journalId: string | null;
    journalNo: string | null;
    reversalJournalId: string | null;
    reversalJournalNo: string | null;
    postedAt: string | null;
    reversedAt: string | null;
    chequeId: string | null;
    chequeNo: string | null;
    chequeStatus: ChequeStatus | null;
}

export interface DepositChequeCommand {
    chequeId: string;
    bankAccountId: string;
    date: string;
    reason?: string | null;
}

export interface ClearReceivedChequeCommand {
    chequeId: string;
    date: string;
    reason?: string | null;
}

export interface ReturnReceivedChequeCommand {
    chequeId: string;
    date: string;
    reason?: string | null;
}

export interface ClearIssuedChequeCommand {
    chequeId: string;
    date: string;
    reason?: string | null;
}

export interface CancelChequeCommand {
    chequeId: string;
    date: string;
    reason?: string | null;
}