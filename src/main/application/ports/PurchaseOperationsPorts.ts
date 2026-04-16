import {
    PurchaseCommitmentEntity,
    PurchaseOperationDocumentEntity,
    PurchaseOperationDocumentType,
    PurchaseOperationHeaderEntity,
    PurchaseOperationLineEntity,
    PurchaseOperationLineLinkEntity,
    PurchaseOperationLineType,
    PurchaseOperationPolicy,
    PurchaseOperationStatus,
} from '../../domain/purchaseOperations/types/PurchaseOperationsTypes';

export interface PurchaseVendorRecord {
    id: string;
    isActive: boolean;
}

export interface PurchaseItemRecord {
    id: string;
    itemGroupId: string | null;
    isActive: boolean;
    isStockItem: boolean;
    defaultUnitCost: number;
}

export interface PurchaseWarehouseRecord {
    id: string;
    isActive: boolean;
}

export interface PurchasePostingStateRecord {
    documentId: string;
    status: string;
    version: number;
    journalId: string | null;
    reversalJournalId: string | null;
    postedAt: string | null;
    reversedAt: string | null;
    stockPostedAt: string | null;
    stockReversedAt: string | null;
}

export interface PurchaseCreateDocumentDbInput {
    id: string;
    companyId: string;
    branchId: string;
    docType: PurchaseOperationDocumentType;
    docNo: string;
    docDate: string;
    status: PurchaseOperationStatus;
    vendorId: string | null;
    warehouseId: string | null;
    currencyCode: string;
    currencyRate: number;
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    vatAmount: number;
    totalAmount: number;
    referenceNo: string | null;
    remarks: string | null;
    sourceDocType: PurchaseOperationDocumentType | null;
    sourceDocId: string | null;
    createdBy: string;
    approvedBy: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: Array<{
        id: string;
        lineNo: number;
        itemId: string | null;
        lineType: PurchaseOperationLineType;
        warehouseId: string | null;
        qty: number;
        receivedQty: number;
        returnedQty: number;
        billedQty: number;
        reservedQty: number;
        unitPrice: number;
        discountAmount: number;
        lineSubtotal: number;
        taxableAmount: number;
        vatAmount: number;
        lineTotal: number;
        unitCost: number | null;
        expenseTypeId: string | null;
        vehicleId: string | null;
        projectId: string | null;
        costCenterId: string | null;
        partnerId: string | null;
        remarks: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
}

export interface PurchaseUpdateDocumentDbInput {
    id: string;
    companyId: string;
    branchId: string;
    docDate: string;
    vendorId: string | null;
    warehouseId: string | null;
    currencyCode: string;
    currencyRate: number;
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    vatAmount: number;
    totalAmount: number;
    referenceNo: string | null;
    remarks: string | null;
    approvedBy: string | null;
    updatedAt: string;
    lines: Array<{
        id: string;
        lineNo: number;
        itemId: string | null;
        lineType: PurchaseOperationLineType;
        warehouseId: string | null;
        qty: number;
        receivedQty: number;
        returnedQty: number;
        billedQty: number;
        reservedQty: number;
        unitPrice: number;
        discountAmount: number;
        lineSubtotal: number;
        taxableAmount: number;
        vatAmount: number;
        lineTotal: number;
        unitCost: number | null;
        expenseTypeId: string | null;
        vehicleId: string | null;
        projectId: string | null;
        costCenterId: string | null;
        partnerId: string | null;
        remarks: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
}

export interface PurchaseCreateLinkInput {
    id: string;
    companyId: string;
    branchId: string;
    sourceDocType: PurchaseOperationDocumentType;
    sourceDocId: string;
    sourceLineId: string;
    targetDocType: PurchaseOperationDocumentType;
    targetDocId: string;
    targetLineId: string;
    qty: number;
    createdAt: string;
}

export interface PurchaseCommitmentRecord extends PurchaseCommitmentEntity {}

export interface PurchaseStockLedgerEntryRecord {
    id: string;
    companyId: string;
    branchId: string;
    docType: PurchaseOperationDocumentType;
    docId: string;
    docLineId: string;
    itemId: string;
    warehouseId: string;
    qtyIn: number;
    qtyOut: number;
    unitCost: number;
    totalCost: number;
    movementSide: 'IN' | 'OUT';
    isReversal: boolean;
    reversedEntryId: string | null;
    movementDate: string;
    createdAt: string;
}

export interface PurchaseSavePostingStateInput {
    companyId: string;
    branchId: string;
    documentId: string;
    journalId: string | null;
    postedBy: string;
    postedAt: string;
    stockPostedAt: string;
    nextStatus: PurchaseOperationStatus;
}

export interface PurchaseSaveReversalStateInput {
    companyId: string;
    branchId: string;
    documentId: string;
    reversalJournalId: string | null;
    reversedBy: string;
    reversedAt: string;
    stockReversedAt: string;
    nextStatus: PurchaseOperationStatus;
}

export interface PurchaseOperationsRepositoryPort {
    ensureSchema(): void;
    nextIdentity(): string;
    nextDocumentNo(companyId: string, branchId: string, docType: PurchaseOperationDocumentType): string;
    runInTransaction<T>(work: () => T): T;

    createDocument(input: PurchaseCreateDocumentDbInput): PurchaseOperationDocumentEntity;
    updateDocument(input: PurchaseUpdateDocumentDbInput): PurchaseOperationDocumentEntity;

    getDocumentById(companyId: string, branchId: string, documentId: string): PurchaseOperationDocumentEntity | null;
    getDocumentHeaderById(companyId: string, branchId: string, documentId: string): PurchaseOperationHeaderEntity | null;
    getDocumentLinesByDocumentId(documentId: string): PurchaseOperationLineEntity[];
    getLineById(lineId: string): PurchaseOperationLineEntity | null;

    getVendorById(vendorId: string): PurchaseVendorRecord | null;
    getItemById(itemId: string): PurchaseItemRecord | null;
    getWarehouseById(warehouseId: string): PurchaseWarehouseRecord | null;

    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string;
    getPolicy(companyId: string): PurchaseOperationPolicy;

    listLinksBySource(companyId: string, sourceDocId: string): PurchaseOperationLineLinkEntity[];
    listLinksByTarget(companyId: string, targetDocId: string): PurchaseOperationLineLinkEntity[];
    createLinks(links: PurchaseCreateLinkInput[]): void;

    listCommitmentsByOrder(companyId: string, orderId: string): PurchaseCommitmentRecord[];
    replaceCommitmentsForOrder(companyId: string, branchId: string, orderId: string, entries: PurchaseCommitmentRecord[]): void;

    updateLineProgress(
        documentId: string,
        lineId: string,
        delta: {
            receivedQty?: number;
            returnedQty?: number;
            billedQty?: number;
            reservedQty?: number;
        },
    ): void;

    saveDocumentStatus(
        companyId: string,
        branchId: string,
        documentId: string,
        status: PurchaseOperationStatus,
        updatedBy: string,
        updatedAt: string,
    ): void;

    getPostingState(companyId: string, branchId: string, documentId: string): PurchasePostingStateRecord | null;
    savePostingState(input: PurchaseSavePostingStateInput): void;
    saveReversalState(input: PurchaseSaveReversalStateInput): void;

    hasStockLedgerPosting(companyId: string, docType: PurchaseOperationDocumentType, docId: string, isReversal: boolean): boolean;
    listStockLedgerEntries(companyId: string, docType: PurchaseOperationDocumentType, docId: string, isReversal: boolean): PurchaseStockLedgerEntryRecord[];
    insertStockLedgerEntries(entries: PurchaseStockLedgerEntryRecord[]): void;
}
