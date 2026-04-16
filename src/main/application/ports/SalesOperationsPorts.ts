import {
    SalesOperationDocumentEntity,
    SalesOperationDocumentType,
    SalesOperationHeaderEntity,
    SalesOperationLineEntity,
    SalesOperationLineLinkEntity,
    SalesOperationPolicy,
    SalesOperationStatus,
} from '../../domain/salesOperations/types/SalesOperationsTypes';

export interface SalesCustomerRecord {
    id: string;
    isActive: boolean;
}

export interface SalesItemRecord {
    id: string;
    itemGroupId: string | null;
    isActive: boolean;
    isStockItem: boolean;
    defaultUnitCost: number;
}

export interface SalesWarehouseRecord {
    id: string;
    isActive: boolean;
}

export interface SalesPostingStateRecord {
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

export interface SalesCreateDocumentDbInput {
    id: string;
    companyId: string;
    branchId: string;
    docType: SalesOperationDocumentType;
    docNo: string;
    docDate: string;
    status: SalesOperationStatus;
    customerId: string;
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
    sourceDocType: SalesOperationDocumentType | null;
    sourceDocId: string | null;
    createdBy: string;
    approvedBy: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    lines: Array<{
        id: string;
        lineNo: number;
        itemId: string;
        warehouseId: string | null;
        qty: number;
        deliveredQty: number;
        returnedQty: number;
        invoicedQty: number;
        reservedQty: number;
        unitPrice: number;
        discountAmount: number;
        lineSubtotal: number;
        taxableAmount: number;
        vatAmount: number;
        lineTotal: number;
        unitCost: number | null;
        projectId: string | null;
        costCenterId: string | null;
        partnerId: string | null;
        remarks: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
}

export interface SalesUpdateDocumentDbInput {
    id: string;
    companyId: string;
    branchId: string;
    docDate: string;
    customerId: string;
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
        itemId: string;
        warehouseId: string | null;
        qty: number;
        deliveredQty: number;
        returnedQty: number;
        invoicedQty: number;
        reservedQty: number;
        unitPrice: number;
        discountAmount: number;
        lineSubtotal: number;
        taxableAmount: number;
        vatAmount: number;
        lineTotal: number;
        unitCost: number | null;
        projectId: string | null;
        costCenterId: string | null;
        partnerId: string | null;
        remarks: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
}

export interface SalesCreateLinkInput {
    id: string;
    companyId: string;
    branchId: string;
    sourceDocType: SalesOperationDocumentType;
    sourceDocId: string;
    sourceLineId: string;
    targetDocType: SalesOperationDocumentType;
    targetDocId: string;
    targetLineId: string;
    qty: number;
    createdAt: string;
}

export interface SalesReservationRecord {
    id: string;
    companyId: string;
    branchId: string;
    salesOrderId: string;
    salesOrderLineId: string;
    itemId: string;
    warehouseId: string;
    reservedQty: number;
    createdAt: string;
}

export interface SalesStockLedgerEntryRecord {
    id: string;
    companyId: string;
    branchId: string;
    docType: SalesOperationDocumentType;
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

export interface SalesSavePostingStateInput {
    companyId: string;
    branchId: string;
    documentId: string;
    journalId: string | null;
    postedBy: string;
    postedAt: string;
    stockPostedAt: string;
    nextStatus: SalesOperationStatus;
}

export interface SalesSaveReversalStateInput {
    companyId: string;
    branchId: string;
    documentId: string;
    reversalJournalId: string | null;
    reversedBy: string;
    reversedAt: string;
    stockReversedAt: string;
    nextStatus: SalesOperationStatus;
}

export interface SalesOperationsRepositoryPort {
    ensureSchema(): void;
    nextIdentity(): string;
    nextDocumentNo(companyId: string, branchId: string, docType: SalesOperationDocumentType): string;
    runInTransaction<T>(work: () => T): T;

    createDocument(input: SalesCreateDocumentDbInput): SalesOperationDocumentEntity;
    updateDocument(input: SalesUpdateDocumentDbInput): SalesOperationDocumentEntity;

    getDocumentById(companyId: string, branchId: string, documentId: string): SalesOperationDocumentEntity | null;
    getDocumentHeaderById(companyId: string, branchId: string, documentId: string): SalesOperationHeaderEntity | null;
    getDocumentLinesByDocumentId(documentId: string): SalesOperationLineEntity[];
    getLineById(lineId: string): SalesOperationLineEntity | null;

    getCustomerById(customerId: string): SalesCustomerRecord | null;
    getItemById(itemId: string): SalesItemRecord | null;
    getWarehouseById(warehouseId: string): SalesWarehouseRecord | null;

    resolveCurrencyCode(rawCurrencyCode: string | null | undefined): string;
    getPolicy(companyId: string): SalesOperationPolicy;

    listLinksBySource(companyId: string, sourceDocId: string): SalesOperationLineLinkEntity[];
    listLinksByTarget(companyId: string, targetDocId: string): SalesOperationLineLinkEntity[];
    createLinks(links: SalesCreateLinkInput[]): void;

    listReservationsByOrder(companyId: string, orderId: string): SalesReservationRecord[];
    replaceReservationsForOrder(companyId: string, branchId: string, orderId: string, entries: SalesReservationRecord[]): void;

    updateLineProgress(
        documentId: string,
        lineId: string,
        delta: {
            deliveredQty?: number;
            returnedQty?: number;
            invoicedQty?: number;
            reservedQty?: number;
        },
    ): void;

    saveDocumentStatus(
        companyId: string,
        branchId: string,
        documentId: string,
        status: SalesOperationStatus,
        updatedBy: string,
        updatedAt: string,
    ): void;

    getPostingState(companyId: string, branchId: string, documentId: string): SalesPostingStateRecord | null;
    savePostingState(input: SalesSavePostingStateInput): void;
    saveReversalState(input: SalesSaveReversalStateInput): void;

    hasStockLedgerPosting(companyId: string, docType: SalesOperationDocumentType, docId: string, isReversal: boolean): boolean;
    listStockLedgerEntries(companyId: string, docType: SalesOperationDocumentType, docId: string, isReversal: boolean): SalesStockLedgerEntryRecord[];
    insertStockLedgerEntries(entries: SalesStockLedgerEntryRecord[]): void;
}
