import {
    ChequeDirection,
    ChequeEventType,
    ChequeRegisterEntity,
    ChequeStatus,
    TreasuryDocumentEntity,
    TreasuryDocumentHeaderEntity,
    TreasuryDocumentLineEntity,
    TreasuryDocumentType,
} from '../../domain/treasury/types/TreasuryTypes';

export interface TreasuryPartnerRecord {
    id: string;
    isActive: boolean;
}

export interface TreasuryAccountPostingState {
    accountId: string;
    exists: boolean;
    isActive: boolean;
    isPosting: boolean;
    accountCode: string | null;
    accountName: string | null;
}

export interface TreasuryPostingStateRecord {
    documentId: string;
    status: string;
    version: number;
    journalId: string | null;
    reversalJournalId: string | null;
    postedAt: string | null;
    reversedAt: string | null;
}

export interface TreasuryChequeEventRecord {
    id: string;
    companyId: string;
    chequeId: string;
    eventType: ChequeEventType;
    eventDate: string;
    journalId: string | null;
    sourceType: string;
    sourceVersion: number;
    createdAt: string;
}

export interface CreateTreasuryDocumentDbInput {
    id: string;
    companyId: string;
    branchId: string;
    docType: TreasuryDocumentType;
    docNo: string;
    docDate: string;
    status: 'DRAFT' | 'POSTED' | 'CANCELLED';
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
    createdAt: string;
    updatedAt: string;
    lines: Array<{
        id: string;
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
    }>;
}

export interface UpdateTreasuryDocumentDbInput {
    id: string;
    companyId: string;
    branchId: string;
    docDate: string;
    partnerId: string | null;
    cashAccountId: string | null;
    bankAccountId: string | null;
    currencyCode: string;
    currencyRate: number;
    referenceNo: string | null;
    remarks: string | null;
    approvedBy: string | null;
    updatedAt: string;
    lines: Array<{
        id: string;
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
    }>;
}

export interface UpsertDocumentChequeInput {
    id?: string | null;
    companyId: string;
    branchId: string;
    direction: ChequeDirection;
    documentId: string;
    partnerId: string | null;
    chequeNo: string;
    chequeDate: string;
    dueDate: string | null;
    amount: number;
    currencyCode: string;
    currencyRate: number;
    bankName: string | null;
    drawerName: string | null;
    payeeName: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateChequeStateInput {
    companyId: string;
    chequeId: string;
    status: ChequeStatus;
    depositedBankAccountId: string | null;
    clearedDate: string | null;
    returnedDate: string | null;
    notes: string | null;
    updatedAt: string;
}

export interface SaveTreasuryPostingStateInput {
    companyId: string;
    branchId: string;
    documentId: string;
    journalId: string;
    postedBy: string;
    postedAt: string;
    nextStatus: 'POSTED';
}

export interface SaveTreasuryReversalStateInput {
    companyId: string;
    branchId: string;
    documentId: string;
    reversalJournalId: string;
    reversedBy: string;
    reversedAt: string;
    nextStatus: 'CANCELLED';
}

export interface TreasuryDocumentRepositoryPort {
    ensureSchema(): void;
    nextIdentity(): string;
    nextDocumentNo(companyId: string, branchId: string, docType: TreasuryDocumentType): string;
    runInTransaction<T>(work: () => T): T;

    createDocument(input: CreateTreasuryDocumentDbInput): TreasuryDocumentEntity;
    updateDocument(input: UpdateTreasuryDocumentDbInput): TreasuryDocumentEntity;

    getDocumentById(companyId: string, branchId: string, documentId: string): TreasuryDocumentEntity | null;
    getDocumentHeaderById(companyId: string, branchId: string, documentId: string): TreasuryDocumentHeaderEntity | null;
    getDocumentLinesByDocumentId(documentId: string): TreasuryDocumentLineEntity[];

    getPartnerById(partnerId: string): TreasuryPartnerRecord | null;
    getAccountPostingState(companyId: string, accountId: string): TreasuryAccountPostingState;

    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string;

    getPostingState(companyId: string, branchId: string, documentId: string): TreasuryPostingStateRecord | null;
    savePostingState(input: SaveTreasuryPostingStateInput): void;
    saveReversalState(input: SaveTreasuryReversalStateInput): void;

    getChequeById(companyId: string, chequeId: string): ChequeRegisterEntity | null;
    getChequeByDocumentId(companyId: string, documentId: string): ChequeRegisterEntity | null;
    getChequeByNo(companyId: string, chequeNo: string, direction: ChequeDirection): ChequeRegisterEntity | null;
    upsertDocumentCheque(input: UpsertDocumentChequeInput): ChequeRegisterEntity;
    updateChequeState(input: UpdateChequeStateInput): void;

    getChequeEvent(companyId: string, chequeId: string, eventType: ChequeEventType): TreasuryChequeEventRecord | null;
    saveChequeEvent(event: TreasuryChequeEventRecord): void;
}